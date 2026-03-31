"""
KidneyHood Prediction Engine — LKID-14 v2.0 Rules Engine

Implements the v2.0 two-component Phase 1 formula from patient_app_spec_v2_updated.pdf
Section 9.5 and finalized-formulas.md. Replaces the Sprint 2 simplified 0.31-coefficient
model.

LKID-14 changes from Sprint 2:
- Phase 1: BUN suppression removal (eGFR * 0.08) + rate differential (NOT 0.31 coeff)
- Phase 2: Continuous function of achieved BUN (NOT fixed tier totals)
- Phase 1/2 transition: month 6 completion (NOT month 3)
- Optional field modifiers: hemoglobin, CO2, albumin increase post-Phase 2 decline
- Backward-compatible predict_for_endpoint() call signature (potassium accepted, unused)

NOTE — Open questions (pending Lee's response, per finalized-formulas.md Section 8):
  Q1: Test vectors in calc spec were generated with the simplified 0.31-coeff model.
      v2.0 will produce different values. This is expected and accepted.
  Q2: rate_P1 in v2.0 refers to 5-pillar model rate. We substitute CKD-stage base
      decline rate + BUN modifier. Acceptable simplification for Lean Launch.
  Q4: Dialysis threshold confirmed as eGFR 12 per calc spec Section 2 correction.
      If Lee corrects to 15, change DIALYSIS_THRESHOLD below (one line).

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

# Tier configuration: (target_bun, post_decline_rate)
# Phase 1 and Phase 2 totals are now computed dynamically (v2.0)
_TIER_CONFIG = {
    # Path 4 (BUN ≤12): post_decline updated to -0.33 per Lee's pilot data
    # (n=28, R²=0.40). Negative sign: patients sustaining BUN ≤12 continue
    # a slight eGFR gain post-Phase 2 rather than declining.
    "bun_12":    {"target_bun": 10, "post_decline": -0.33},
    "bun_13_17": {"target_bun": 15, "post_decline": 1.0},
    "bun_18_24": {"target_bun": 21, "post_decline": 1.5},
}

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
    """CKD-EPI 2021 race-free eGFR. For sex=unknown, averages male+female."""
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

    # NOTE: Marketing app uses CKD-stage base rates as substitute for rate_P1.
    # Clinical app must swap in the full 5-pillar decline model (v2.0 Section 8).
    """
    for low, high, rate in _NO_TX_DECLINE_RATES:
        if low <= egfr < high:
            return rate
    return -1.8  # eGFR >= 60: Stage 3a rate as conservative fallback


def _get_decline_rate(egfr: float, bun: float) -> float:
    """Annual decline rate with BUN modifier."""
    base_rate = _get_base_decline_rate(egfr)
    bun_modifier = max(0.0, (bun - 20.0) / 10.0) * 0.15
    return base_rate - bun_modifier


# ---------------------------------------------------------------------------
# Phase 1 -- v2.0 two-component formula (LKID-14)
# ---------------------------------------------------------------------------


def _phase1_fraction(t_months: float) -> float:
    """Exponential saturation: reaches ~92% by month 3, 100% by month 6."""
    if t_months >= 6:
        return 1.0
    if t_months <= 0:
        return 0.0
    return 1.0 - math.exp(-2.5 * t_months / 3.0)


def _compute_phase1(
    egfr_baseline: float,
    bun_baseline: float,
    age: int,
    tier_target_bun: float,
) -> tuple[float, float]:
    """v2.0 Phase 1 total gain: BUN suppression removal + rate differential.

    Returns a (phase1_total, achieved_bun) tuple so callers can pass the
    true achieved BUN to _compute_phase2_gain() rather than the tier target.

    NOTE: 0.31-coefficient model (calc spec) is intentionally not used here (Q1).
    """
    # Component 1: BUN suppression removal (~8% of current eGFR)
    phase1_suppression = egfr_baseline * 0.08

    # Component 2: Rate differential via BUN reduction factor
    reduction = 0.46
    if age > 75:
        reduction -= 0.05
    if age > 85:
        reduction -= 0.05  # stacks with >75 reduction
    if egfr_baseline < 15:
        reduction -= 0.08
    elif egfr_baseline < 30:
        reduction -= 0.03

    achieved_bun = max(bun_baseline * (1.0 - reduction), 9.0)
    # Clamp to tier target: tier label represents the BUN outcome
    achieved_bun_for_tier = max(achieved_bun, tier_target_bun)

    old_rate = _get_decline_rate(egfr_baseline, bun_baseline)
    new_rate = _get_decline_rate(egfr_baseline, achieved_bun_for_tier)

    # Rate differential over 6 months (0.5 years)
    phase1_real = (abs(old_rate) - abs(new_rate)) * 0.5

    return phase1_suppression + phase1_real, achieved_bun_for_tier


# ---------------------------------------------------------------------------
# Phase 2 -- v2.0 continuous function (LKID-14)
# ---------------------------------------------------------------------------


def _phase2_fraction(t_months: float) -> float:
    """Logarithmic accumulation over months 6-24."""
    if t_months <= 6:
        return 0.0
    if t_months >= 24:
        return 1.0
    return math.log(1.0 + (t_months - 6.0)) / math.log(1.0 + 18.0)


def _compute_phase2_gain(achieved_bun: float, age: int) -> float:
    """v2.0 continuous Phase 2 gain function based on achieved BUN with age attenuation."""
    if achieved_bun <= 12:
        phase2 = 8.0
    elif achieved_bun <= 17:
        phase2 = 8.0 - (achieved_bun - 12.0) / 5.0 * 3.0
    elif achieved_bun <= 24:
        phase2 = 5.0 - (achieved_bun - 17.0) / 7.0 * 2.0
    elif achieved_bun <= 35:
        phase2 = 3.0 - (achieved_bun - 24.0) / 11.0 * 2.0
    else:
        phase2 = 0.0

    # Age-based attenuation of tubular repair capacity
    if age > 80:
        phase2 *= 0.80 * 0.65  # both factors stack per v2.0
    elif age > 70:
        phase2 *= 0.80

    return max(0.0, phase2)


# ---------------------------------------------------------------------------
# Optional field modifiers -- Confidence Tier 2 (LKID-14)
# ---------------------------------------------------------------------------


def _compute_optional_modifier(
    hemoglobin: Optional[float],
    co2: Optional[float],
    albumin: Optional[float],
) -> float:
    """Additional post-Phase 2 annual decline due to concerning optional fields.

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
# Treatment trajectory (v2.0 Phase 1 / Phase 2 / Post-Phase 2)
# ---------------------------------------------------------------------------


def compute_treatment_trajectory(
    egfr_baseline: float,
    bun_baseline: float,
    age: int,
    tier: str,
    optional_modifier: float = 0.0,
) -> list[float]:
    """Compute a treatment trajectory for a given BUN tier using v2.0 formulas.

    Structure:
      t=0:     egfr_baseline
      t=0..6:  Phase 1 -- exponential approach to phase1_total gain
      t=6..24: Phase 2 -- Phase 1 locked in, logarithmic Phase 2 accumulation
      t>24:    Post-Phase 2 -- linear decline from peak at tier-specific rate
    """
    cfg = _TIER_CONFIG[tier]
    tier_target_bun = cfg["target_bun"]
    post_decline_rate = cfg["post_decline"] + optional_modifier

    phase1_total, achieved_bun = _compute_phase1(egfr_baseline, bun_baseline, age, tier_target_bun)
    phase1_total = max(0.0, phase1_total)
    # Phase 2 gain is a continuous function of the *actual* achieved BUN, not
    # the tier label.  Using tier_target_bun here was the bug reported in PR #25.
    phase2_total = _compute_phase2_gain(achieved_bun, age)

    egfr_at_phase1_complete = egfr_baseline + phase1_total  # month 6
    peak_egfr = egfr_at_phase1_complete + phase2_total      # month 24

    results = []
    for t in TIME_POINTS_MONTHS:
        if t == 0:
            egfr = egfr_baseline
        elif t <= 6:
            egfr = egfr_baseline + phase1_total * _phase1_fraction(t)
        elif t <= 24:
            egfr = egfr_at_phase1_complete + phase2_total * _phase2_fraction(t)
        else:
            years_after_24 = (t - 24) / 12.0
            egfr = max(0.0, peak_egfr - post_decline_rate * years_after_24)

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

    return {
        "egfr_baseline": egfr_baseline,
        "confidence_tier": confidence_tier,
        "trajectories": trajectories,
        "time_points_months": list(TIME_POINTS_MONTHS),
        "dial_ages": dial_ages,
        "dialysis_threshold": DIALYSIS_THRESHOLD,
        "stat_cards": stat_cards,
        "bun_suppression_estimate": compute_bun_suppression_estimate(bun),
    }
