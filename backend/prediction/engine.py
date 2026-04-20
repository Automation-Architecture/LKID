"""
KidneyHood Prediction Engine — LKID-59 Lee Golden Vectors v2.0

Treatment trajectory model (confirmed by Lee's 3 golden vectors, 2026-04-02):
- Phase 1 (months 0-3): min(tier_cap, (BUN - target) * 0.31), exponential saturation
- After month 3: linear decline at CKD-stage treatment rate with age attenuation
- Path 4 (bun_12): uses -0.33 mL/min/yr floor instead of CKD-stage rate
- No Phase 2 gain function — treatment benefit is Phase 1 only

No-treatment path unchanged (Coresh-derived CKD-stage rates + BUN modifier).

PROPRIETARY & CONFIDENTIAL — Kidneyhood.org
Coefficients must never be exposed to front-end code, logs, or client endpoints.
"""

import math
from typing import Literal, Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]

# eGFR 12 confirmed per calc spec Section 2 correction (see Q4 above).
DIALYSIS_THRESHOLD = 12.0

# Tier configuration
# tier_cap: maximum Phase 1 gain (eGFR points)
# use_path4_floor: if True, use -0.33/yr after Phase 1 instead of CKD-stage rate
_TIER_CONFIG = {
    "bun_12":    {"target_bun": 10, "tier_cap": 12, "use_path4_floor": True},
    "bun_13_17": {"target_bun": 15, "tier_cap": 9,  "use_path4_floor": False},
    "bun_18_24": {"target_bun": 21, "tier_cap": 6,  "use_path4_floor": False},
}

# Path 4 floor rate (bun_12 tier, after Phase 1)
_PATH4_FLOOR_RATE = -0.33

# Treatment decline rates by CKD stage (after Phase 1, months 3+)
# Stage 4 confirmed by Lee's golden vectors (-2.0/yr).
# Other stages: interim estimates — need Lee confirmation.
_TREATMENT_DECLINE_RATES = [
    (45, 60, -1.2),   # Stage 3a — ESTIMATED, needs Lee confirmation
    (30, 45, -1.5),   # Stage 3b — ESTIMATED, needs Lee confirmation
    (15, 30, -2.0),   # Stage 4  — CONFIRMED by Lee (3 vectors)
    (0,  15, -2.7),   # Stage 5  — ESTIMATED, needs Lee confirmation
]

# CKD-EPI 2021 sex-specific coefficients
_CKD_EPI_COEFFICIENTS = {
    "female": {"kappa": 0.7, "alpha": -0.241, "sex_multiplier": 1.012},
    "male":   {"kappa": 0.9, "alpha": -0.302, "sex_multiplier": 1.0},
}

# No-treatment base decline rates by CKD stage (eGFR range)
# Source: Coresh 2014, CKD Prognosis Consortium, MDRD/CRIC cohort
_NO_TX_DECLINE_RATES = [
    (45, 60, -1.8),   # Stage 3a: eGFR 45-59
    (30, 45, -2.2),   # Stage 3b: eGFR 30-44
    (15, 30, -3.0),   # Stage 4:  eGFR 15-29
    (0,  15, -4.0),   # Stage 5:  eGFR <15
]


# ---------------------------------------------------------------------------
# CKD-EPI 2021 -- sex-aware
# ---------------------------------------------------------------------------


def _compute_egfr_for_sex(creatinine: float, age: int, sex: str) -> float:
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
    """CKD-EPI 2021 race-free eGFR. For sex=unknown, averages male+female.

    Note: the patient-facing /labs form hardcodes sex="unknown" (Lee's
    decision — he does not want to collect patient sex). Production traffic
    therefore always hits the sex-averaged branch. See LKID-78 investigation
    memo for the full decision record (2026-04-20).
    """
    if sex == "unknown":
        male_egfr = _compute_egfr_for_sex(creatinine, age, "male")
        female_egfr = _compute_egfr_for_sex(creatinine, age, "female")
        return round((male_egfr + female_egfr) / 2.0, 1)
    return round(_compute_egfr_for_sex(creatinine, age, sex), 1)


# ---------------------------------------------------------------------------
# Decline rates
# ---------------------------------------------------------------------------


def _get_base_decline_rate(egfr: float) -> float:
    """Annual decline rate based on CKD stage.

    Used in place of the 5-pillar model rate_P1 from v2.0 Section 8.
    Acceptable simplification for Lean Launch (Q2).

    NOTE: Marketing app uses CKD-stage base rates as substitute for rate_P1.
    Clinical app must swap in the full 5-pillar decline model (v2.0 Section 8).
    """
    for low, high, rate in _NO_TX_DECLINE_RATES:
        if low <= egfr < high:
            return rate
    return -1.8  # eGFR >= 60: Stage 3a rate as conservative fallback


def _get_decline_rate(egfr: float, bun: float) -> float:
    """Annual decline rate with BUN modifier (no-treatment path only)."""
    base_rate = _get_base_decline_rate(egfr)
    bun_modifier = max(0.0, (bun - 20.0) / 10.0) * 0.15
    return base_rate - bun_modifier


def _get_treatment_decline_rate(egfr: float, age: int, tier: str) -> float:
    """Annual decline rate for treatment paths (after Phase 1, months 3+).

    Path 4 (bun_12): uses -0.33/yr floor regardless of CKD stage.
    All others: CKD-stage treatment rate with age attenuation.
    Stage 4 rate (-2.0) confirmed by Lee's golden vectors.
    """
    cfg = _TIER_CONFIG[tier]
    if cfg["use_path4_floor"]:
        rate = _PATH4_FLOOR_RATE
    else:
        matched = None
        for low, high, r in _TREATMENT_DECLINE_RATES:
            if low <= egfr < high:
                matched = r
                break
        # Fallback to mildest rate if eGFR outside all brackets (e.g. >= 60)
        rate = matched if matched is not None else max(
            r for _, _, r in _TREATMENT_DECLINE_RATES
        )

    if age > 70:
        rate *= 0.80

    return rate


# ---------------------------------------------------------------------------
# Phase 1 -- 0.31-coefficient model (Lee golden vectors, LKID-59)
# ---------------------------------------------------------------------------


def _phase1_fraction(t_months: float) -> float:
    """Exponential saturation over months 0-3. Reaches ~91.8% at month 3."""
    if t_months <= 0:
        return 0.0
    if t_months >= 3:
        return 1.0 - math.exp(-2.5)  # 0.9179
    return 1.0 - math.exp(-2.5 * t_months / 3.0)


def _compute_phase1(
    bun_baseline: float,
    tier: str,
) -> float:
    """Phase 1 total gain: min(tier_cap, (BUN - target) * 0.31).

    Confirmed by Lee's golden vectors (2026-04-02).
    """
    cfg = _TIER_CONFIG[tier]
    delta = max(0.0, bun_baseline - cfg["target_bun"])
    return min(cfg["tier_cap"], delta * 0.31)


# ---------------------------------------------------------------------------
# Optional field modifiers -- Confidence Tier 2 (LKID-14)
# ---------------------------------------------------------------------------


def _compute_optional_modifier(
    hemoglobin: Optional[float],
    co2: Optional[float],
    albumin: Optional[float],
) -> float:
    """Additional annual decline due to concerning optional fields.

    Applied equally to all four trajectories.
    """
    modifier = 0.0

    if hemoglobin is not None and hemoglobin < 11.0:
        modifier += 0.2

    if co2 is not None and co2 < 22.0:
        deficit = 22.0 - co2
        modifier += (deficit / 2.0) * 0.3

    if albumin is not None and albumin < 3.5:
        deficit = 3.5 - albumin
        modifier += (deficit / 0.5) * 0.3

    return modifier


# ---------------------------------------------------------------------------
# No-treatment trajectory
# ---------------------------------------------------------------------------


def compute_no_treatment(
    egfr_baseline: float,
    bun_baseline: float,
    optional_modifier: float = 0.0,
) -> list[float]:
    """Compute no-treatment trajectory (linear BUN-adjusted decline).

    The optional_modifier (hemoglobin/CO2/albumin penalty) is intentionally
    applied here.  Although the spec calls it a "post-Phase 2" modifier, it
    represents systemic physiological stress that accelerates CKD decline
    regardless of treatment.  Applying it to the no-treatment path keeps all
    four trajectories on a consistent risk-adjusted baseline, and the tests
    for optional modifiers (TestOptionalModifiers) assert this behaviour
    explicitly.
    """
    annual_decline = _get_decline_rate(egfr_baseline, bun_baseline) - optional_modifier
    results = []
    for t in TIME_POINTS_MONTHS:
        egfr = max(0.0, egfr_baseline + annual_decline * (t / 12.0))
        results.append(round(egfr, 1))
    return results


# ---------------------------------------------------------------------------
# Treatment trajectory (Lee golden vectors model, LKID-59)
# ---------------------------------------------------------------------------


def compute_treatment_trajectory(
    egfr_baseline: float,
    bun_baseline: float,
    age: int,
    tier: str,
    optional_modifier: float = 0.0,
) -> list[float]:
    """Compute a treatment trajectory using Lee's confirmed model.

    Structure:
      t=0:     egfr_baseline
      t=0..3:  Phase 1 — exponential approach to phase1_total (saturates ~91.8%)
      t>3:     Linear decline from eGFR(3) at treatment rate adjusted by optional modifier
    """
    phase1_total = _compute_phase1(bun_baseline, tier)
    treatment_rate = _get_treatment_decline_rate(egfr_baseline, age, tier)
    decline_rate = treatment_rate - optional_modifier  # modifier worsens decline

    egfr_at_month3 = egfr_baseline + phase1_total * _phase1_fraction(3)

    results = []
    for t in TIME_POINTS_MONTHS:
        if t == 0:
            egfr = egfr_baseline
        elif t <= 3:
            egfr = egfr_baseline + phase1_total * _phase1_fraction(t)
        else:
            years_after_3 = (t - 3) / 12.0
            egfr = egfr_at_month3 + decline_rate * years_after_3

        results.append(round(max(0.0, egfr), 1))

    return results


# ---------------------------------------------------------------------------
# Dialysis age interpolation
# ---------------------------------------------------------------------------


def compute_dial_age(
    trajectory: list[float],
    current_age: int,
) -> Optional[float]:
    """Find patient age at which trajectory crosses below DIALYSIS_THRESHOLD.

    Returns None if trajectory stays above threshold for the full 120-month window.
    Threshold: eGFR 12 (Q4 -- one-line change if Lee corrects to 15).
    """
    for i in range(1, len(trajectory)):
        if trajectory[i] < DIALYSIS_THRESHOLD and trajectory[i - 1] >= DIALYSIS_THRESHOLD:
            frac = (trajectory[i - 1] - DIALYSIS_THRESHOLD) / (
                trajectory[i - 1] - trajectory[i]
            )
            months = TIME_POINTS_MONTHS[i - 1] + frac * (
                TIME_POINTS_MONTHS[i] - TIME_POINTS_MONTHS[i - 1]
            )
            return round(current_age + months / 12.0, 1)
    return None


# ---------------------------------------------------------------------------
# BUN suppression estimate (stat card display)
# ---------------------------------------------------------------------------


def compute_bun_suppression_estimate(bun_baseline: float) -> float:
    """eGFR points suppressed by elevated BUN (stat card display only).

    Calc spec formula: (BUN - 10) * 0.31, capped at 12.0.
    Distinct from Amendment 3 BUN Structural Floor Display (different baseline/ratio).
    """
    suppression = max(0.0, (bun_baseline - 10.0) * 0.31)
    return round(min(suppression, 12.0), 1)


# ---------------------------------------------------------------------------
# Structural floor (Amendment 3 — display-only, NOT part of trajectory engine)
# ---------------------------------------------------------------------------

_BUN_RATIO_TABLE: list[tuple[float, float, float]] = [
    # (bun_low_exclusive, bun_high_inclusive, ratio)
    (15.0, 20.0, 0.67),
    (20.0, 30.0, 0.47),
    (30.0, 50.0, 0.32),
    (50.0, float("inf"), 0.25),
]


def _get_bun_ratio(bun: float) -> float:
    """Return BUN ratio from the Amendment 3 lookup table."""
    if bun < 15.0:
        return 0.00
    for _, high, ratio in _BUN_RATIO_TABLE:
        if bun <= high:
            return ratio
    return 0.25  # fallback (should never be reached given inf sentinel)


def compute_structural_floor(
    egfr: float,
    bun: float,
) -> Optional[dict]:
    """Compute Amendment 3 BUN structural floor (display-only).

    Only meaningful when BUN > 17 (below that, suppression is negligible).
    Returns None when BUN <= 17.

    Formula: structural_floor_egfr = reported_egfr + (current_bun - 15) * bun_ratio

    When BUN and eGFR brackets suggest different ratios, uses the more
    conservative (lower) ratio.

    Returns a dict with:
        structural_floor_egfr: float
        suppression_points: float  (the additive delta)
    """
    if bun <= 17.0:
        return None

    bun_ratio = _get_bun_ratio(bun)

    # Map eGFR to its CKD-stage implied BUN ratio so we can pick the more
    # conservative of the two.  Higher eGFR stages have lower ratios; this
    # prevents over-estimating structural capacity in milder disease.
    if egfr >= 60:
        egfr_implied_ratio = 0.00
    elif egfr >= 30:
        egfr_implied_ratio = 0.47
    elif egfr >= 15:
        egfr_implied_ratio = 0.32
    else:
        egfr_implied_ratio = 0.25

    conservative_ratio = min(bun_ratio, egfr_implied_ratio)

    suppression_points = round((bun - 15.0) * conservative_ratio, 1)
    if round(suppression_points) == 0:
        return None
    structural_floor_egfr = round(egfr + suppression_points, 1)

    return {
        "structural_floor_egfr": structural_floor_egfr,
        "suppression_points": suppression_points,
    }


# ---------------------------------------------------------------------------
# Confidence tier
# ---------------------------------------------------------------------------


def compute_confidence_tier(
    hemoglobin: Optional[float],
    co2: Optional[float],
    albumin: Optional[float],
) -> int:
    """Tier 1: required fields only. Tier 2: at least one optional field present."""
    if any(v is not None for v in [hemoglobin, co2, albumin]):
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
# predict() -- kept for backward compatibility with existing callers
# ---------------------------------------------------------------------------


def predict(
    bun: float,
    creatinine: float,
    age: int,
    sex: Literal["male", "female", "unknown"] = "unknown",
    egfr_entered: Optional[float] = None,
    hemoglobin: Optional[float] = None,
    co2: Optional[float] = None,
    albumin: Optional[float] = None,
) -> dict:
    """Main prediction function. Returns the full /predict response body."""
    if egfr_entered is not None:
        egfr_baseline = round(float(egfr_entered), 1)
    else:
        egfr_baseline = compute_egfr_ckd_epi_2021(creatinine, age, sex)

    optional_modifier = _compute_optional_modifier(hemoglobin, co2, albumin)

    no_tx = compute_no_treatment(egfr_baseline, bun, optional_modifier)
    bun_18_24 = compute_treatment_trajectory(egfr_baseline, bun, age, "bun_18_24", optional_modifier)
    bun_13_17 = compute_treatment_trajectory(egfr_baseline, bun, age, "bun_13_17", optional_modifier)
    bun_12_traj = compute_treatment_trajectory(egfr_baseline, bun, age, "bun_12", optional_modifier)

    trajectories = {
        "no_treatment": no_tx,
        "bun_18_24": bun_18_24,
        "bun_13_17": bun_13_17,
        "bun_12": bun_12_traj,
    }

    return {
        "egfr_baseline": egfr_baseline,
        "time_points_months": list(TIME_POINTS_MONTHS),
        "trajectories": trajectories,
        "dial_ages": {
            "no_treatment": compute_dial_age(no_tx, age),
            "bun_18_24": compute_dial_age(bun_18_24, age),
            "bun_13_17": compute_dial_age(bun_13_17, age),
            "bun_12": compute_dial_age(bun_12_traj, age),
        },
        "bun_suppression_estimate": compute_bun_suppression_estimate(bun),
    }


# ---------------------------------------------------------------------------
# predict_for_endpoint() -- POST /predict response shape (LKID-15 / LKID-14)
# ---------------------------------------------------------------------------


def predict_for_endpoint(
    bun: float,
    creatinine: float,
    age: int,
    sex: Literal["male", "female", "unknown"],
    potassium: Optional[float] = None,
    hemoglobin: Optional[float] = None,
    co2: Optional[float] = None,
    albumin: Optional[float] = None,
    glucose: Optional[float] = None,
) -> dict:
    """Wrapper for POST /predict endpoint.

    Potassium and glucose are accepted for backward-compatibility and storage
    but do not affect the v2.0 engine output.

    Args:
        bun: Blood Urea Nitrogen in mg/dL
        creatinine: Serum Creatinine in mg/dL
        age: Patient age in years
        sex: Biological sex
        potassium: mEq/L (validated/stored, unused by engine)
        hemoglobin: g/dL (Confidence Tier 2 modifier)
        co2: Serum CO2 in mEq/L (Confidence Tier 2 modifier)
        albumin: g/dL (Confidence Tier 2 modifier)
        glucose: mg/dL (legacy accepted but unused)
    """
    egfr_baseline = compute_egfr_ckd_epi_2021(creatinine, age, sex)
    optional_modifier = _compute_optional_modifier(hemoglobin, co2, albumin)
    confidence_tier = compute_confidence_tier(hemoglobin, co2, albumin)

    no_tx = compute_no_treatment(egfr_baseline, bun, optional_modifier)
    bun_18_24 = compute_treatment_trajectory(egfr_baseline, bun, age, "bun_18_24", optional_modifier)
    bun_13_17 = compute_treatment_trajectory(egfr_baseline, bun, age, "bun_13_17", optional_modifier)
    bun_12_traj = compute_treatment_trajectory(egfr_baseline, bun, age, "bun_12", optional_modifier)

    trajectories = {
        "no_treatment": no_tx,
        "bun_18_24": bun_18_24,
        "bun_13_17": bun_13_17,
        "bun_12": bun_12_traj,
    }

    dial_ages = {
        "no_treatment": compute_dial_age(no_tx, age),
        "bun_18_24": compute_dial_age(bun_18_24, age),
        "bun_13_17": compute_dial_age(bun_13_17, age),
        "bun_12": compute_dial_age(bun_12_traj, age),
    }

    stat_cards = compute_stat_cards(egfr_baseline, bun, trajectories)
    structural_floor = compute_structural_floor(egfr_baseline, bun)

    response: dict = {
        "egfr_baseline": egfr_baseline,
        "confidence_tier": confidence_tier,
        "trajectories": trajectories,
        "time_points_months": list(TIME_POINTS_MONTHS),
        "dial_ages": dial_ages,
        "dialysis_threshold": DIALYSIS_THRESHOLD,
        "stat_cards": stat_cards,
        "bun_suppression_estimate": compute_bun_suppression_estimate(bun),
    }
    if structural_floor is not None:
        response["structural_floor"] = structural_floor
    return response
