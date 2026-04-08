"""
Golden file test vectors for KidneyHood prediction engine.

Source: Lee's updated golden vectors v2.0, received 2026-04-02.
Replaces the 3 calc-spec vectors (BUN 35/eGFR 33, BUN 53/eGFR 10, BUN 22/eGFR 48)
which used the old two-component model.

Lee's model (confirmed):
  Phase 1: min(tier_cap, (BUN - target) * 0.31), exponential saturation to month 3
  After month 3: linear decline at CKD-stage treatment rate with age attenuation
  Path 4 (bun_12): -0.33/yr floor after Phase 1
  No Phase 2 gain function

TOLERANCE: ±0.2 eGFR per calc spec Section 4.
"""

# ---------------------------------------------------------------------------
# Time points (must match engine.TIME_POINTS_MONTHS exactly)
# ---------------------------------------------------------------------------

TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]

# ---------------------------------------------------------------------------
# Vector 1 — Path bun_13_17, Standard Adult
# BUN=16, eGFR=28, Age=58, Stage 4, Creatinine=3.2
#
# phase1_total = min(9, (16-15)*0.31) = 0.31
# f(3) = 1 - exp(-2.5) = 0.9179
# eGFR(3) = 28 + 0.31*0.9179 = 28.2846
# treatment_rate = -2.0 (Stage 4, age < 70)
# eGFR(12) = 28.2846 + (-2.0)*(12-3)/12 = 26.78
# Lee expects: 26.79
# ---------------------------------------------------------------------------

LEE_VECTOR_1_INPUT = {
    "bun": 16,
    "creatinine": 3.2,
    "age": 58,
    "egfr_override": 28.0,
    "tier": "bun_13_17",
}

LEE_VECTOR_1_EXPECTED_MONTH_12 = 26.79

# ---------------------------------------------------------------------------
# Vector 2 — Path bun_12 (Best Achiever)
# BUN=11, eGFR=22, Age=64, Stage 4, Creatinine=4.1
#
# phase1_total = min(12, (11-10)*0.31) = 0.31
# f(3) = 0.9179
# eGFR(3) = 22 + 0.31*0.9179 = 22.2846
# treatment_rate = -0.33 (Path 4 floor, age < 70)
# eGFR(12) = 22.2846 + (-0.33)*(9/12) = 22.04
# Lee expects: 22.04
# ---------------------------------------------------------------------------

LEE_VECTOR_2_INPUT = {
    "bun": 11,
    "creatinine": 4.1,
    "age": 64,
    "egfr_override": 22.0,
    "tier": "bun_12",
}

LEE_VECTOR_2_EXPECTED_MONTH_12 = 22.04

# ---------------------------------------------------------------------------
# Vector 3 — Path bun_18_24, Older Patient with Age Attenuation
# BUN=22, eGFR=18, Age=74, Stage 4, Creatinine=5.8
#
# phase1_total = min(6, (22-21)*0.31) = 0.31
# f(3) = 0.9179
# eGFR(3) = 18 + 0.31*0.9179 = 18.2846
# treatment_rate = -2.0 * 0.80 = -1.60 (Stage 4, age > 70)
# eGFR(12) = 18.2846 + (-1.60)*(9/12) = 17.08
# Lee expects: 17.09
# ---------------------------------------------------------------------------

LEE_VECTOR_3_INPUT = {
    "bun": 22,
    "creatinine": 5.8,
    "age": 74,
    "egfr_override": 18.0,
    "tier": "bun_18_24",
}

LEE_VECTOR_3_EXPECTED_MONTH_12 = 17.09

# ---------------------------------------------------------------------------
# Tolerance
# ---------------------------------------------------------------------------

# Per calc spec Section 4: all values must match within ±0.2 eGFR.
GOLDEN_TOLERANCE = 0.2
