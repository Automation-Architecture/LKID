"""
Boundary Value Analysis (BVA) tables for KidneyHood prediction engine inputs.

Source: backend-meeting-memo.md — binding validation range table (non-negotiable).

Each table covers: min, min+epsilon, midrange, max-epsilon, max,
below-min (invalid), above-max (invalid).

BUN:        [5, 150]  — frontend soft cap at 100; DB/Pydantic hard cap at 150
Creatinine: [0.3, 20.0] — max=20.0 (pending Lee Q6 confirmation)
Age:        [18, 120] — DB CHECK constraint
Hemoglobin: [4.0, 20.0] — optional Tier 2 modifier
Glucose:    [40, 500]  — optional Tier 2 modifier

Potassium [2.0–8.0] is validated but NOT a prediction engine input.
It is excluded from these engine boundary sets.

CKD stage eGFR thresholds for stage-transition boundary fixtures:
  Stage 3a: eGFR 45-59
  Stage 3b: eGFR 30-44
  Stage 4:  eGFR 15-29
  Stage 5:  eGFR <15
  Dialysis: eGFR < 12 (DIALYSIS_THRESHOLD = 12.0)
"""

from typing import Any

# ---------------------------------------------------------------------------
# BVA tables — structured boundary value rows
# ---------------------------------------------------------------------------

# Format: (label, value, valid)
# valid=True means within binding range; valid=False means out-of-range (negative test)

BUN_BOUNDARY_TABLE = [
    ("bun_min",               5,     True),
    ("bun_above_min",         5.1,   True),
    ("bun_midrange",          50,    True),
    ("bun_below_max",        149.9,  True),
    ("bun_max",              150,    True),
    ("bun_below_min_invalid",  4.9,  False),
    ("bun_above_max_invalid", 150.1, False),
]

CREATININE_BOUNDARY_TABLE = [
    ("creatinine_min",               0.3,   True),
    ("creatinine_above_min",         0.4,   True),
    ("creatinine_midrange",          5.0,   True),
    ("creatinine_below_max",        19.9,   True),
    ("creatinine_max",              20.0,   True),
    ("creatinine_below_min_invalid", 0.2,   False),
    ("creatinine_above_max_invalid",20.1,   False),
]

AGE_BOUNDARY_TABLE = [
    ("age_min",               18,   True),
    ("age_above_min",         19,   True),
    ("age_midrange",          60,   True),
    ("age_below_max",        119,   True),
    ("age_max",              120,   True),
    ("age_below_min_invalid", 17,   False),
    ("age_above_max_invalid",121,   False),
]

HEMOGLOBIN_BOUNDARY_TABLE = [
    ("hemoglobin_min",               4.0,  True),
    ("hemoglobin_above_min",         4.1,  True),
    ("hemoglobin_midrange",         12.0,  True),
    ("hemoglobin_below_max",        19.9,  True),
    ("hemoglobin_max",              20.0,  True),
    ("hemoglobin_below_min_invalid", 3.9,  False),
    ("hemoglobin_above_max_invalid",20.1,  False),
]

GLUCOSE_BOUNDARY_TABLE = [
    ("glucose_min",               40,   True),
    ("glucose_above_min",         41,   True),
    ("glucose_midrange",         200,   True),
    ("glucose_below_max",        499,   True),
    ("glucose_max",              500,   True),
    ("glucose_below_min_invalid", 39,   False),
    ("glucose_above_max_invalid",501,   False),
]

# ---------------------------------------------------------------------------
# Age attenuation thresholds
# Phase 2 age attenuation kicks in at 70 (0.80) and 80 (0.65 stacked)
# Per finalized-formulas.md Section 3 (v2.0 spec — not yet implemented in engine)
# ---------------------------------------------------------------------------

AGE_ATTENUATION_BOUNDARIES = [
    ("age_just_below_70",  69),
    ("age_70_boundary",    70),
    ("age_just_above_70",  71),
    ("age_just_below_80",  79),
    ("age_80_boundary",    80),
    ("age_just_above_80",  81),
]

# ---------------------------------------------------------------------------
# eGFR thresholds for CKD stage transitions
# These creatinine values are calibrated to produce eGFR at boundaries
# using CKD-EPI 2021 for unknown sex, age 60.
# Computed empirically from engine.compute_egfr_ckd_epi_2021().
#
# Stage 3a/3b boundary: eGFR ~45  -> creatinine ~1.82 (male/unknown/age 60)
# Stage 3b/4 boundary:  eGFR ~30  -> creatinine ~2.60
# Stage 4/5 boundary:   eGFR ~15  -> creatinine ~4.70
# Dialysis threshold:   eGFR ~12  -> creatinine ~5.70
#
# Note: These are approximate. Tests that need an exact eGFR must use
# egfr_entered/egfr_override rather than deriving eGFR from creatinine.
# ---------------------------------------------------------------------------

EGFR_STAGE_BOUNDARIES = {
    # Calibrated against compute_egfr_ckd_epi_2021(cr, age=60, sex='unknown')
    "stage_3a_3b": {"egfr_actual": 45.6, "creatinine": 1.52, "age": 60, "sex": "unknown"},
    "stage_3b_4":  {"egfr_actual": 30.1, "creatinine": 2.15, "age": 60, "sex": "unknown"},
    "stage_4_5":   {"egfr_actual": 14.7, "creatinine": 3.90, "age": 60, "sex": "unknown"},
    "dialysis":    {"egfr_actual": 12.1, "creatinine": 4.60, "age": 60, "sex": "unknown"},
}

# ---------------------------------------------------------------------------
# BUN tier decision boundaries
# The engine assigns treatment path based on BUN tier matching.
# Key threshold: BUN=21 sits at the boundary between bun_18_24 (target=21)
# and bun_13_17 (target=15). At BUN=21, bun_18_24 phase1 = (21-21)*0.31 = 0.
# ---------------------------------------------------------------------------

BUN_TIER_BOUNDARIES = [
    # (label, bun_value, expected_tier_notes)
    ("bun_just_below_18_24_threshold",  17.0, "below bun_18_24 target, minimal phase1 gain"),
    ("bun_at_18_24_lower_edge",         18.0, "at lower edge of 18-24 BUN tier range"),
    ("bun_at_18_24_upper_edge",         24.0, "at upper edge of 18-24 BUN tier range"),
    ("bun_tier_transition",             21.0, "at bun_18_24 target: phase1 for bun_18_24 = 0"),
    ("bun_at_13_17_lower_edge",         13.0, "at lower edge of 13-17 BUN tier range"),
    ("bun_at_13_17_upper_edge",         17.0, "at upper edge of 13-17 BUN tier range"),
    ("bun_at_12_threshold",             12.0, "at bun_12 tier upper boundary"),
    ("bun_below_12",                    10.0, "bun <= optimal (10) — suppression estimate = 0"),
]

# ---------------------------------------------------------------------------
# Hemoglobin concerning threshold
# Per finalized-formulas.md Reference: Hemoglobin < 11 g/dL adds
# +0.2 mL/min/yr excess decline to all paths (Tier 2 modifier).
# Note: This modifier is NOT yet implemented in engine.py (gap flagged in tests).
# ---------------------------------------------------------------------------

HEMOGLOBIN_CONCERNING_THRESHOLDS = [
    ("hemoglobin_just_above_concerning",  11.1, "above threshold — no modifier"),
    ("hemoglobin_at_concerning",          11.0, "at threshold — borderline"),
    ("hemoglobin_just_below_concerning",  10.9, "below threshold — +0.2/yr modifier should apply"),
    ("hemoglobin_severely_low",            7.0, "severely low — clear modifier territory"),
]
