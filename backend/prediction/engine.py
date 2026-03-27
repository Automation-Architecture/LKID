"""
KidneyHood Prediction Engine — LKID-14

Implements the Server-Side Calculation Specification v1.0 (March 2026).
Computes 4 trajectory paths (no_treatment, bun_18_24, bun_13_17, bun_12),
dial_ages, and bun_suppression_estimate.

PROPRIETARY & CONFIDENTIAL — Kidneyhood.org
Coefficients must never be exposed to front-end code, logs, or client endpoints.
"""

import math
from typing import Optional

# --- Constants ---

TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]

DIALYSIS_THRESHOLD = 12.0  # eGFR threshold for dialysis (NOT 15)

# CKD-EPI 2021 (sex-free population average)
CKD_EPI_KAPPA = 0.9
CKD_EPI_ALPHA = -0.302

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


def compute_egfr_ckd_epi_2021(creatinine: float, age: int) -> float:
    """CKD-EPI 2021 race-free, sex-free (population average kappa/alpha)."""
    cr_over_kappa = creatinine / CKD_EPI_KAPPA
    term1 = min(cr_over_kappa, 1.0) ** CKD_EPI_ALPHA
    term2 = max(cr_over_kappa, 1.0) ** (-1.200)
    egfr = 142 * term1 * term2 * (0.9938 ** age)
    return round(egfr, 1)


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
    phase1_total = min(cfg["phase1_cap"], (bun_baseline - cfg["target_bun"]) * PHASE1_COEFF)
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


def compute_dial_age(
    trajectory: list[float],
    current_age: float,
) -> Optional[float]:
    """Find age at which trajectory crosses below eGFR 12 (linear interpolation)."""
    for i in range(1, len(trajectory)):
        if trajectory[i] < DIALYSIS_THRESHOLD and trajectory[i - 1] >= DIALYSIS_THRESHOLD:
            frac = (trajectory[i - 1] - DIALYSIS_THRESHOLD) / (trajectory[i - 1] - trajectory[i])
            months = TIME_POINTS_MONTHS[i - 1] + frac * (TIME_POINTS_MONTHS[i] - TIME_POINTS_MONTHS[i - 1])
            return round(current_age + months / 12, 1)
    return None


def compute_bun_suppression_estimate(bun_baseline: float) -> float:
    """Current eGFR points suppressed by elevated BUN vs optimal."""
    suppression = max(0, (bun_baseline - OPTIMAL_BUN) * PHASE1_COEFF)
    return round(suppression, 1)


def predict(
    bun: float,
    creatinine: float,
    age: int,
    egfr_entered: Optional[float] = None,
) -> dict:
    """
    Main prediction function. Returns the full /predict response body.

    Args:
        bun: Blood Urea Nitrogen in mg/dL
        creatinine: Serum creatinine in mg/dL
        age: Patient age in years
        egfr_entered: Optional patient-entered eGFR (bypasses CKD-EPI calculation)
    """
    if egfr_entered is not None:
        egfr_baseline = round(float(egfr_entered), 1)
    else:
        egfr_baseline = compute_egfr_ckd_epi_2021(creatinine, age)

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
