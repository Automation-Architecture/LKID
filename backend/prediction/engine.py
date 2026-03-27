"""
KidneyHood Prediction Engine — LKID-14 / LKID-15

Implements the Server-Side Calculation Specification v1.0 (March 2026).
Computes 4 trajectory paths (no_treatment, bun_18_24, bun_13_17, bun_12),
dial_ages, and bun_suppression_estimate.

LKID-15 additions:
- Sex-aware CKD-EPI 2021 formula (kappa/alpha per sex, female multiplier)
- Confidence tier logic (Decision #12)
- predict_for_endpoint() wrapper for POST /predict response shape

PROPRIETARY & CONFIDENTIAL — Kidneyhood.org
Coefficients must never be exposed to front-end code, logs, or client endpoints.
"""

import math
from typing import Literal, Optional

# --- Constants ---

TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]

DIALYSIS_THRESHOLD = 12.0  # eGFR threshold for dialysis (NOT 15)

# CKD-EPI 2021 sex-specific coefficients
_CKD_EPI_COEFFICIENTS = {
    "female": {"kappa": 0.7, "alpha": -0.241, "sex_multiplier": 1.012},
    "male":   {"kappa": 0.9, "alpha": -0.302, "sex_multiplier": 1.0},
}

# Phase 1
PHASE1_COEFF = 0.31  # eGFR points per mg/dL BUN reduction

# Tier configuration: (target_bun, phase1_cap, phase2_total, post_decline_rate)
TIER_CONFIG = {
    "bun_12":    {"target_bun": 10, "phase1_cap": 12, "phase2_total": 8.0, "post_decline": 0.5},
    "bun_13_17": {"target_bun": 15, "phase1_cap": 9,  "phase2_total": 6.0, "post_decline": 1.0},
    "bun_18_24": {"target_bun": 21, "phase1_cap": 6,  "phase2_total": 4.0, "post_decline": 1.5},
}

# No-treatment base decline rates by CKD stage
NO_TX_DECLINE_RATES = [
    (45, 60, -1.8),   # Stage 3a: eGFR 45-59
    (30, 45, -2.2),   # Stage 3b: eGFR 30-44
    (15, 30, -3.0),   # Stage 4:  eGFR 15-29
    (0,  15, -4.0),   # Stage 5:  eGFR <15
]

# BUN suppression
OPTIMAL_BUN = 10  # midpoint of <=12 tier


# ---------------------------------------------------------------------------
# CKD-EPI 2021 — sex-aware
# ---------------------------------------------------------------------------


def _compute_egfr_for_sex(
    creatinine: float, age: int, sex: str,
) -> float:
    """CKD-EPI 2021 race-free eGFR for a single sex value ('male' or 'female').

    Formula:
        eGFR = 142 * min(Scr/kappa, 1)^alpha * max(Scr/kappa, 1)^(-1.200)
               * 0.9938^age * sex_multiplier
    """
    coeff = _CKD_EPI_COEFFICIENTS[sex]
    kappa = coeff["kappa"]
    alpha = coeff["alpha"]
    sex_mult = coeff["sex_multiplier"]

    cr_over_kappa = creatinine / kappa
    term1 = min(cr_over_kappa, 1.0) ** alpha
    term2 = max(cr_over_kappa, 1.0) ** (-1.200)
    return 142.0 * term1 * term2 * (0.9938 ** age) * sex_mult


def compute_egfr_ckd_epi_2021(
    creatinine: float,
    age: int,
    sex: Literal["male", "female", "unknown"] = "unknown",
) -> float:
    """CKD-EPI 2021 race-free eGFR with sex-specific coefficients.

    For sex='unknown', returns the average of male and female results.
    """
    if sex == "unknown":
        male_egfr = _compute_egfr_for_sex(creatinine, age, "male")
        female_egfr = _compute_egfr_for_sex(creatinine, age, "female")
        return round((male_egfr + female_egfr) / 2.0, 1)
    return round(_compute_egfr_for_sex(creatinine, age, sex), 1)


# ---------------------------------------------------------------------------
# Decline rates & trajectory helpers
# ---------------------------------------------------------------------------


def _get_base_decline_rate(egfr_baseline: float) -> float:
    """Get base annual decline rate based on CKD stage."""
    for low, high, rate in NO_TX_DECLINE_RATES:
        if low <= egfr_baseline < high:
            return rate
    # eGFR >= 60 — use Stage 3a rate as conservative fallback
    return -1.8


def _compute_annual_decline(egfr_baseline: float, bun_baseline: float) -> float:
    """No-treatment annual decline rate with BUN modifier.

    bun_modifier adds to the magnitude of decline (makes it more negative).
    Spec: annual_decline = base_rate + bun_modifier where base_rate is negative
    and bun_modifier is treated as additive to the decline magnitude.
    """
    base_rate = _get_base_decline_rate(egfr_baseline)
    bun_modifier = max(0, (bun_baseline - 20) / 10) * 0.15
    # bun_modifier increases the decline magnitude: -(|base| + modifier)
    return base_rate - bun_modifier


def _phase1_fraction(t_months: float) -> float:
    """Exponential saturation: fraction of Phase 1 gain at time t."""
    if t_months >= 3:
        return 1.0
    if t_months <= 0:
        return 0.0
    return 1 - math.exp(-2.5 * t_months / 3)


def _phase2_fraction(t_months: float) -> float:
    """Logarithmic accumulation: fraction of Phase 2 gain at time t."""
    if t_months <= 3:
        return 0.0
    if t_months >= 24:
        return 1.0
    return math.log(1 + (t_months - 3)) / math.log(1 + 21)


# ---------------------------------------------------------------------------
# Trajectory computation
# ---------------------------------------------------------------------------


def compute_no_treatment(egfr_baseline: float, bun_baseline: float) -> list[float]:
    """Compute no-treatment trajectory (linear BUN-adjusted decline)."""
    annual_decline = _compute_annual_decline(egfr_baseline, bun_baseline)
    results = []
    for t in TIME_POINTS_MONTHS:
        egfr = max(0, egfr_baseline + annual_decline * (t / 12))
        results.append(round(egfr, 1))
    return results


def compute_treatment_trajectory(
    egfr_baseline: float,
    bun_baseline: float,
    tier: str,
) -> list[float]:
    """Compute a treatment trajectory for a given BUN tier."""
    cfg = TIER_CONFIG[tier]
    phase1_total = min(
        cfg["phase1_cap"],
        (bun_baseline - cfg["target_bun"]) * PHASE1_COEFF,
    )
    phase1_total = max(0, phase1_total)  # no negative gains
    phase2_total = cfg["phase2_total"]
    post_decline = cfg["post_decline"]

    phase1_plateau = egfr_baseline + phase1_total
    peak = phase1_plateau + phase2_total

    results = []
    for t in TIME_POINTS_MONTHS:
        if t == 0:
            egfr = egfr_baseline
        elif t <= 3:
            egfr = egfr_baseline + phase1_total * _phase1_fraction(t)
        elif t <= 24:
            egfr = phase1_plateau + phase2_total * _phase2_fraction(t)
        else:
            years_after_24 = (t - 24) / 12
            egfr = max(0, peak - post_decline * years_after_24)
        results.append(round(egfr, 1))
    return results


# ---------------------------------------------------------------------------
# Dialysis age & BUN suppression
# ---------------------------------------------------------------------------


def compute_dial_age(
    trajectory: list[float],
    current_age: float,
) -> Optional[float]:
    """Find age at which trajectory crosses below eGFR 12 (linear interpolation)."""
    for i in range(1, len(trajectory)):
        if trajectory[i] < DIALYSIS_THRESHOLD and trajectory[i - 1] >= DIALYSIS_THRESHOLD:
            frac = (
                (trajectory[i - 1] - DIALYSIS_THRESHOLD)
                / (trajectory[i - 1] - trajectory[i])
            )
            months = (
                TIME_POINTS_MONTHS[i - 1]
                + frac * (TIME_POINTS_MONTHS[i] - TIME_POINTS_MONTHS[i - 1])
            )
            return round(current_age + months / 12, 1)
    return None


def compute_bun_suppression_estimate(bun_baseline: float) -> float:
    """Current eGFR points suppressed by elevated BUN vs optimal."""
    suppression = max(0, (bun_baseline - OPTIMAL_BUN) * PHASE1_COEFF)
    return round(suppression, 1)


# ---------------------------------------------------------------------------
# Confidence tier (Decision #12)
# ---------------------------------------------------------------------------


def compute_confidence_tier(
    hemoglobin: Optional[float],
    glucose: Optional[float],
) -> int:
    """Determine confidence tier per Decision #12.

    Tier 1: required fields only.
    Tier 2: required + BOTH hemoglobin AND glucose present.
    Tier 3: requires 3+ visits (not possible in single-entry mode).
    """
    if hemoglobin is not None and glucose is not None:
        return 2
    return 1


# ---------------------------------------------------------------------------
# Stat cards
# ---------------------------------------------------------------------------


def compute_stat_cards(
    egfr_baseline: float,
    bun_baseline: float,
    trajectories: dict[str, list[float]],
) -> dict[str, float]:
    """Compute summary statistics for the stat cards display."""
    no_tx = trajectories["no_treatment"]
    bun_12 = trajectories["bun_12"]

    # 10-year values (last point in trajectory)
    egfr_10yr_no_tx = no_tx[-1]
    egfr_10yr_best = bun_12[-1]

    return {
        "egfr_baseline": egfr_baseline,
        "egfr_10yr_no_treatment": egfr_10yr_no_tx,
        "egfr_10yr_best_case": egfr_10yr_best,
        "potential_gain_10yr": round(egfr_10yr_best - egfr_10yr_no_tx, 1),
        "bun_suppression_estimate": compute_bun_suppression_estimate(bun_baseline),
    }


# ---------------------------------------------------------------------------
# Legacy predict() — kept for backward compatibility with existing callers
# ---------------------------------------------------------------------------


def predict(
    bun: float,
    creatinine: float,
    age: int,
    sex: Literal["male", "female", "unknown"] = "unknown",
    egfr_entered: Optional[float] = None,
) -> dict:
    """
    Main prediction function. Returns the full /predict response body.

    Args:
        bun: Blood Urea Nitrogen in mg/dL
        creatinine: Serum creatinine in mg/dL
        age: Patient age in years
        sex: Biological sex for CKD-EPI formula
        egfr_entered: Optional patient-entered eGFR (bypasses CKD-EPI calculation)
    """
    if egfr_entered is not None:
        egfr_baseline = round(float(egfr_entered), 1)
    else:
        egfr_baseline = compute_egfr_ckd_epi_2021(creatinine, age, sex)

    no_tx = compute_no_treatment(egfr_baseline, bun)
    bun_18_24 = compute_treatment_trajectory(egfr_baseline, bun, "bun_18_24")
    bun_13_17 = compute_treatment_trajectory(egfr_baseline, bun, "bun_13_17")
    bun_12 = compute_treatment_trajectory(egfr_baseline, bun, "bun_12")

    return {
        "egfr_baseline": egfr_baseline,
        "time_points_months": list(TIME_POINTS_MONTHS),
        "trajectories": {
            "no_treatment": no_tx,
            "bun_18_24": bun_18_24,
            "bun_13_17": bun_13_17,
            "bun_12": bun_12,
        },
        "dial_ages": {
            "no_treatment": compute_dial_age(no_tx, age),
            "bun_18_24": compute_dial_age(bun_18_24, age),
            "bun_13_17": compute_dial_age(bun_13_17, age),
            "bun_12": compute_dial_age(bun_12, age),
        },
        "bun_suppression_estimate": compute_bun_suppression_estimate(bun),
    }


# ---------------------------------------------------------------------------
# LKID-15: predict_for_endpoint() — POST /predict response shape
# ---------------------------------------------------------------------------


def predict_for_endpoint(
    bun: float,
    creatinine: float,
    potassium: float,
    age: int,
    sex: Literal["male", "female", "unknown"],
    hemoglobin: Optional[float] = None,
    glucose: Optional[float] = None,
) -> dict:
    """Wrapper for POST /predict endpoint (LKID-15).

    Adds confidence tier, stat cards, and the response shape expected
    by the frontend. Potassium is accepted for validation/storage but
    does not affect the prediction engine (per spec).

    Args:
        bun: Blood Urea Nitrogen in mg/dL
        creatinine: Serum Creatinine in mg/dL
        potassium: Potassium in mEq/L (validated but unused by engine)
        age: Patient age in years
        sex: Biological sex
        hemoglobin: Optional hemoglobin in g/dL
        glucose: Optional fasting glucose in mg/dL
    """
    egfr_baseline = compute_egfr_ckd_epi_2021(creatinine, age, sex)
    confidence_tier = compute_confidence_tier(hemoglobin, glucose)

    # Run the core engine
    no_tx = compute_no_treatment(egfr_baseline, bun)
    bun_18_24 = compute_treatment_trajectory(egfr_baseline, bun, "bun_18_24")
    bun_13_17 = compute_treatment_trajectory(egfr_baseline, bun, "bun_13_17")
    bun_12 = compute_treatment_trajectory(egfr_baseline, bun, "bun_12")

    trajectories = {
        "no_treatment": no_tx,
        "bun_18_24": bun_18_24,
        "bun_13_17": bun_13_17,
        "bun_12": bun_12,
    }

    dial_ages = {
        "no_treatment": compute_dial_age(no_tx, age),
        "bun_18_24": compute_dial_age(bun_18_24, age),
        "bun_13_17": compute_dial_age(bun_13_17, age),
        "bun_12": compute_dial_age(bun_12, age),
    }

    stat_cards = compute_stat_cards(egfr_baseline, bun, trajectories)

    return {
        "egfr_baseline": egfr_baseline,
        "confidence_tier": confidence_tier,
        "trajectories": trajectories,
        "time_points_months": list(TIME_POINTS_MONTHS),
        "dial_ages": dial_ages,
        "dialysis_threshold": DIALYSIS_THRESHOLD,
        "stat_cards": stat_cards,
    }
