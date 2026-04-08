# QA Verdict — PR #28 `feat/LKID-59-engine-golden-vectors`

**Date:** 2026-04-07
**Reviewer:** Yuri (QA/Test Writer)
**Card:** LKID-59 (Engine Phase 1 formula rewrite)
**Files changed:** `backend/prediction/engine.py`, `backend/tests/fixtures/golden_vectors.py`, `backend/tests/test_prediction_engine.py`

---

## Verdict: PASS

---

## Test Run

```
cd backend && venv/bin/python -m pytest tests/test_prediction_engine.py -v --tb=short
```

Result: **124 passed, 0 failed, 0 xfailed** in 0.05s.

All 86 old xfail parametrized golden vector tests (from the obsolete calc-spec vectors) have been removed. All 3 Lee golden vectors are now strict (not xfail) and pass within tolerance. The test count dropped from ~202 effective (116 passed + 86 xfail) to 124 strict passes, which is correct: the 86 obsolete xfail tests were replaced by 8 focused Lee vector tests (3 month-12 checks, 3 baseline passthroughs, 1 age attenuation, 1 no-treatment regression).

---

## What Was Reviewed

### 1. Lee Golden Vectors (3 vectors, month-12 tolerance check)

All 3 vectors verified both via the test suite and via independent manual computation.

| Vector | Tier | Lee Expects | Engine Produces | Delta | Tolerance | Status |
|--------|------|-------------|-----------------|-------|-----------|--------|
| V1 | bun_13_17 | 26.79 | 26.8 | +0.01 | +/-0.2 | PASS |
| V2 | bun_12 | 22.04 | 22.0 | -0.04 | +/-0.2 | PASS |
| V3 | bun_18_24 | 17.09 | 17.1 | +0.01 | +/-0.2 | PASS |

Manual hand-calculation for each vector confirms the engine's arithmetic:

**V1:** `phase1_total = min(9, (16-15)*0.31) = 0.31`. `f(3) = 1 - exp(-2.5) = 0.9179`. `eGFR(3) = 28 + 0.31*0.9179 = 28.2846`. `rate = -2.0` (Stage 4, age 58 < 70). `eGFR(12) = 28.2846 + (-2.0)*(9/12) = 26.7846`. Rounds to 26.8. Lee expects 26.79. Delta = +0.01. PASS.

**V2:** `phase1_total = min(12, (11-10)*0.31) = 0.31`. `eGFR(3) = 22.2846`. `rate = -0.33` (Path 4 floor). `eGFR(12) = 22.2846 + (-0.33)*(9/12) = 22.0371`. Rounds to 22.0. Lee expects 22.04. Delta = -0.04. PASS.

**V3:** `phase1_total = min(6, (22-21)*0.31) = 0.31`. `eGFR(3) = 18.2846`. `rate = -2.0 * 0.80 = -1.60` (Stage 4, age 74 > 70). `eGFR(12) = 18.2846 + (-1.60)*(9/12) = 17.0846`. Rounds to 17.1. Lee expects 17.09. Delta = +0.01. PASS.

### 2. No-Treatment Path Unchanged

Verified that `compute_no_treatment()` is not modified by this PR. The function body, its decline rate sources (`_get_base_decline_rate`, `_get_decline_rate`), and the `_NO_TX_DECLINE_RATES` table are all untouched. Test `test_no_treatment_unchanged_for_vector_1` confirms monotonic decline for V1 inputs. Manual spot-check confirms no-treatment for all 3 vectors produces expected linear decline with BUN modifier.

### 3. Phase 2 Fully Removed

Searched engine source for `_phase2`, `phase2_gain`, `_compute_phase2` -- zero results. The Phase 2 functions (`_phase2_fraction()` and `_compute_phase2_gain()`) are completely absent from the codebase. No orphaned imports, no dead code. The test file has zero references to Phase 2 functions.

Two docstrings still reference "post-Phase 2" language (lines 182 and 215 of engine.py), but these are in `_compute_optional_modifier()` and `compute_no_treatment()` respectively, where they explain that the optional modifier was originally spec'd as a "post-Phase 2" concept but is intentionally applied to all paths. This is contextually accurate documentation of the design decision, not orphaned Phase 2 code. See non-blocking item N-1 below.

### 4. `_TIER_CONFIG` Structure

Verified the new structure:

```python
_TIER_CONFIG = {
    "bun_12":    {"target_bun": 10, "tier_cap": 12, "use_path4_floor": True},
    "bun_13_17": {"target_bun": 15, "tier_cap": 9,  "use_path4_floor": False},
    "bun_18_24": {"target_bun": 21, "tier_cap": 6,  "use_path4_floor": False},
}
```

- `target_bun` values unchanged from pre-refactor.
- `tier_cap` values match Lee's confirmed model (12, 9, 6).
- `use_path4_floor` correctly flags only `bun_12` for the -0.33/yr floor.
- Old `post_decline` field removed (no longer needed -- decline rates are now in `_TREATMENT_DECLINE_RATES` and `_PATH4_FLOOR_RATE`).

Tests `test_bun_12_tier_cap`, `test_bun_13_17_tier_cap`, `test_bun_18_24_tier_cap` all pass. Tier cap behavior verified manually: BUN=50 on `bun_18_24` hits cap at 6.0, BUN=80 on `bun_12` hits cap at 12.0.

### 5. Age Attenuation

Age attenuation (x0.80 for age > 70) is correctly applied inside `_get_treatment_decline_rate()` to the treatment decline rate only, not to Phase 1 gain.

Boundary behavior verified:
- age=69: rate = -2.0 (no attenuation)
- age=70: rate = -2.0 (no attenuation -- threshold is `>70`, not `>=70`)
- age=71: rate = -1.6 (attenuated by 0.80)

This matches Lee's V3 (age=74, rate = -1.60). Test `test_treatment_decline_rate_age_attenuation` confirms.

### 6. Path 4 Floor (-0.33/yr)

`_PATH4_FLOOR_RATE = -0.33` is applied to `bun_12` tier via `_get_treatment_decline_rate()` when `cfg["use_path4_floor"]` is True. Verified that V2 (bun_12) uses -0.33/yr regardless of CKD stage. Test `test_treatment_decline_rate_path4_floor` confirms. Age attenuation is also applied to the floor rate for age > 70 (e.g., -0.33 * 0.80 = -0.264 for an elderly bun_12 patient).

### 7. Optional Modifier

Optional modifier still correctly worsens the treatment decline rate. Verified: V1 inputs with modifier=0.5 produces month-12 eGFR of 26.4 vs 26.8 without modifier (0.4 pts worse, as expected for 0.5/yr * 9/12 months of post-Phase-1 decline).

The modifier is applied as `decline_rate = treatment_rate - optional_modifier` in `compute_treatment_trajectory()` (line 251), which makes the rate more negative (worse). This is arithmetically correct. The modifier is also applied to the no-treatment path via `compute_no_treatment()` (line 222).

### 8. Structural Floor, BUN Suppression, Stat Cards, CKD-EPI

All untouched by this PR:
- `compute_structural_floor()`: 16 tests in `TestStructuralFloor` all pass.
- `compute_bun_suppression_estimate()`: uses `(BUN - 10) * 0.31`, correctly separate from Phase 1's `(BUN - target) * 0.31`.
- `compute_stat_cards()`: consumes trajectory arrays, formula-agnostic.
- `compute_egfr_ckd_epi_2021()`: 6 tests in `TestCKDEPIFormula` all pass.

### 9. Tier Ordering Preserved

Verified for BUN=35, eGFR=33, Age=58: `bun_12 >= bun_13_17 >= bun_18_24 >= no_treatment` at all 15 time points. Ordering holds because:
- Phase 1 gain increases with tier (more aggressive BUN target = larger `BUN - target` delta).
- Path 4 floor (-0.33/yr) is much slower decline than CKD-stage rates (-1.5 to -2.7/yr).

Test `test_higher_tier_yields_better_or_equal_trajectory` confirms this property.

### 10. Treatment Decline Rate Table

```python
_TREATMENT_DECLINE_RATES = [
    (45, 60, -1.2),   # Stage 3a -- ESTIMATED
    (30, 45, -1.5),   # Stage 3b -- ESTIMATED
    (15, 30, -2.0),   # Stage 4  -- CONFIRMED by Lee
    (0,  15, -2.7),   # Stage 5  -- ESTIMATED
]
```

Only Stage 4 (-2.0) is confirmed by Lee's vectors. Stages 3a, 3b, and 5 are interim estimates. This is correctly flagged with comments. All 3 Lee vectors are Stage 4 patients, so the confirmed rate is the only one exercised by golden vector tests. The estimated rates for other stages are a known gap (see follow-up items).

### 11. Golden Vectors Fixture (`golden_vectors.py`)

- All 3 old vectors removed.
- 3 new Lee vectors correctly defined with input dicts and month-12 expected values.
- Each vector includes a step-by-step comment showing the derivation.
- `GOLDEN_TOLERANCE = 0.2` maintained.
- `TIME_POINTS_MONTHS` duplicated from engine (also verified in test via `test_time_points_array_matches_spec`).

### 12. Test Coverage Assessment

**Adequately covered:**
- All 3 Lee golden vectors (month 12, strict tolerance)
- Baseline passthrough for all 3 vectors
- Age attenuation on V3
- No-treatment regression on V1
- _TIER_CONFIG constants (target_bun, tier_cap, use_path4_floor)
- _TREATMENT_DECLINE_RATES (Stage 4 confirmed, Path 4 floor)
- Age attenuation boundary (_get_treatment_decline_rate at age 58 vs 74)
- Phase 1 fraction at months 0, 3, 6 (saturation behavior)
- Tier ordering property
- Treatment > no_treatment property
- Optional modifier interaction
- All boundary value tests (BUN, creatinine, age, eGFR stages)
- Structural floor (16 tests)
- CKD-EPI (6 tests)
- Determinism (5 tests)

**Test gaps (non-blocking):**

1. **No test for BUN = target_BUN on non-bun_18_24 tiers.** `test_bun_at_21_tier_boundary` covers BUN=21 (bun_18_24 target), but there is no analogous test for BUN=15 (bun_13_17 target) or BUN=10 (bun_12 target) confirming Phase 1 = 0 at those exact boundaries.

2. **No test for Phase 1 at tier cap.** The manual verification confirmed BUN=50/bun_18_24 hits cap=6 and BUN=80/bun_12 hits cap=12, but no test asserts this boundary behavior.

3. **No test for treatment decline at non-Stage-4 CKD stages.** All 3 vectors are Stage 4. There is no test confirming that a Stage 3a patient (eGFR 45-59) gets the -1.2/yr treatment rate, or that a Stage 5 patient gets -2.7/yr. These rates are estimates pending Lee confirmation, so the gap is partially intentional, but a basic sanity check would be prudent.

4. **No test for age > 70 attenuation applied to Path 4 floor rate.** V2 uses bun_12 at age 64 (no attenuation). There is no vector testing bun_12 tier with age > 70, where the floor rate would become -0.33 * 0.80 = -0.264/yr.

5. **No test for `compute_no_treatment()` with `optional_modifier > 0`.** The optional modifier is applied to no_treatment (line 222), and the docstring explains why, but there is no explicit test asserting that the no-treatment trajectory changes when a modifier is provided.

---

## Blocking Issues

None.

---

## Non-Blocking Issues

### N-1: Stale "post-Phase 2" docstring in `_compute_optional_modifier()`

**Location:** `backend/prediction/engine.py`, line 182

```python
"""Additional post-Phase 2 annual decline due to concerning optional fields."""
```

Phase 2 no longer exists. The docstring should say "Additional annual decline" (removing the "post-Phase 2" prefix). The reference on line 215 in `compute_no_treatment()` is acceptable because it explains the historical context ("the spec calls it a post-Phase 2 modifier"), but line 182 states it as current fact.

**Recommended fix:** Change line 182 to `"""Additional annual decline due to concerning optional fields."""` Low priority -- acceptable to address in a cleanup pass.

### N-2: Treatment decline rates for Stages 3a, 3b, 5 are unconfirmed estimates

The `_TREATMENT_DECLINE_RATES` table has only Stage 4 confirmed by Lee. The comments correctly flag this, but it means the engine produces unvalidated treatment trajectories for patients outside the eGFR 15-29 range. This is a known limitation documented in `engine-refactor-analysis.md` Section 2.4. No code change needed, but Lee confirmation should be sought before ship.

### N-3: Test gap -- no coverage for Phase 1 tier cap boundary

No test verifies that Phase 1 gain is capped when `(BUN - target) * 0.31` exceeds the tier cap. Adding 1-2 tests for this edge case (e.g., BUN=50 on bun_18_24 tier, asserting Phase 1 = 6.0 not 8.99) would strengthen coverage. Low priority since the `min()` call is trivial.

---

## Follow-Up Items

1. **Ask Lee for treatment decline rates** for CKD Stages 3a, 3b, and 5 (only Stage 4 = -2.0 is confirmed).
2. **Ask Lee for additional golden vectors** covering a non-Stage-4 patient and a high-BUN-above-cap scenario.
3. **Clean up "post-Phase 2" docstring** in `_compute_optional_modifier()` (N-1).
4. **Consider adding tier cap boundary tests** (N-3) in a follow-up QA pass.

---

## Summary

The engine refactor correctly implements Lee's confirmed 0.31-coefficient model. Phase 1 gain saturates at month 3, Phase 2 is fully removed, and treatment trajectories decline linearly after month 3 at CKD-stage rates with age attenuation. All 3 Lee golden vectors pass within the strict +/-0.2 tolerance. The no-treatment path, structural floor, BUN suppression estimate, stat cards, and CKD-EPI formula are all verified untouched. 124 tests pass, 0 failures. No blocking issues found.

*Yuri -- 2026-04-07 -- Sprint 3*
