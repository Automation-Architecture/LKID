# Engine Refactor Analysis — Treatment Trajectory Formula Correction

**Author:** Luca (CTO)
**Date:** 2026-04-02
**Status:** Ready for review
**Purpose:** Pre-dispatch analysis for John Donaldson to refactor `backend/prediction/engine.py`
**Blocking input:** Lee's 3 golden test vectors received 2026-04-02 (`agents/luca/drafts/lee-golden-vectors-v2.md`)

---

## 1. Executive Summary

Lee's three golden test vectors (received 2026-04-02) reveal that the treatment trajectory formula in `engine.py` systematically overestimates eGFR by +4.4 to +7.5 points at month 12. The root cause is twofold: (1) the engine uses a two-component Phase 1 formula (BUN suppression removal + rate differential) that produces 2.2 eGFR points of gain where Lee's model produces only 0.31, and (2) the engine applies a Phase 2 continuous gain function (adding 3-8 eGFR points over months 6-24) that does not exist in Lee's model at all. Lee's correct model is simpler: Phase 1 is a capped 0.31-coefficient formula that saturates by month 3, after which the trajectory declines linearly at a CKD-stage treatment rate with age attenuation. There is no Phase 2. The refactor replaces the treatment trajectory computation while leaving the no-treatment path, structural floor, stat cards, and CKD-EPI formula untouched.

---

## 2. Lee's Formula (Correct Model)

### 2.1 Phase 1 — Treatment Gain (Months 0-3)

**Formula:**
```
phase1_total = min(tier_cap, (BUN_baseline - target_BUN) * 0.31)
```

**Tier caps and targets:**

| Tier | Target BUN | Tier Cap |
|------|-----------|----------|
| bun_18_24 | 21 mg/dL | 6 eGFR pts |
| bun_13_17 | 15 mg/dL | 9 eGFR pts |
| bun_12 | 10 mg/dL | 12 eGFR pts |

**Saturation curve (unchanged from current engine):**
```
f(t) = 1 - exp(-2.5 * t / 3)    for t in [0, 3]
f(t) = f(3)                      for t >= 3   (no further Phase 1 gain)
```

At month 3: `f(3) = 1 - exp(-2.5) = 0.9179`

Phase 1 gain at any time t:
```
phase1_gain(t) = phase1_total * f(min(t, 3))
```

Note: Phase 1 asymptotically approaches `phase1_total` but only reaches 91.8% at month 3. The remaining 8.2% is never gained -- decline begins at month 3, not at the point of full saturation.

### 2.2 After Phase 1 — Linear Decline (Months 3+)

After month 3, the trajectory declines linearly:
```
eGFR(t) = eGFR(3) + treatment_rate * (t - 3) / 12     for t > 3
```

where `eGFR(3) = baseline + phase1_total * f(3)`

**Treatment decline rate:**
- Default: CKD-stage base rate (same table as no-treatment path, but see Section 2.4 for a critical caveat)
- Path 4 exception (bun_12): use `-0.33 mL/min/yr` floor regardless of CKD stage
- Age attenuation: if age > 70, multiply rate by 0.80

**There is no Phase 2.** Treatment benefit is Phase 1 only; after month 3, patients decline at a steady rate.

### 2.3 General Formula

```
For t in [0, 3]:
    eGFR(t) = baseline + phase1_total * (1 - exp(-2.5 * t / 3))

For t > 3:
    eGFR(t) = eGFR(3) + treatment_rate * (t - 3) / 12

where:
    phase1_total = min(tier_cap, (BUN - target_BUN) * 0.31)
    eGFR(3) = baseline + phase1_total * 0.9179
    treatment_rate = CKD_stage_rate * age_factor     [or -0.33 for Path 4]
    age_factor = 0.80 if age > 70, else 1.0
```

### 2.4 Treatment Decline Rate Caveat (OPEN QUESTION)

Lee's vectors all use CKD Stage 4 patients (eGFR 15-29). In all three vectors, the after-Phase-1 decline rate is **-2.0 mL/min/yr** for Stage 4, but the engine's `_NO_TX_DECLINE_RATES` table has **-3.0 mL/min/yr** for Stage 4 (sourced from Coresh 2014 / CKD Prognosis Consortium).

This creates an ambiguity: does Lee use a separate treatment decline rate table, or does Lee's "-2.0 for Stage 4" replace the engine's -3.0 for both treatment AND no-treatment? Since the no-treatment path uses -3.0 and should remain unchanged per the vectors' own gap analysis, the most likely interpretation is that **Lee's treatment paths use a different (slower) decline rate table than the no-treatment path.**

We only have Stage 4 vectors. We do NOT know Lee's treatment decline rates for Stages 3a, 3b, or 5. The refactor must:
1. Use -2.0 for Stage 4 treatment paths (to match Lee's vectors)
2. Flag that we need Lee to confirm treatment decline rates for other CKD stages
3. Keep the no-treatment path using the existing Coresh-derived rates (-1.8, -2.2, -3.0, -4.0)

Suggested interim treatment rate table (extrapolation -- needs Lee confirmation):

| CKD Stage | eGFR Range | No-Treatment Rate | Treatment Rate (interim) |
|-----------|-----------|-------------------|--------------------------|
| Stage 3a | 45-59 | -1.8 | -1.2 (estimated) |
| Stage 3b | 30-44 | -2.2 | -1.5 (estimated) |
| Stage 4 | 15-29 | -3.0 | **-2.0 (confirmed by Lee)** |
| Stage 5 | <15 | -4.0 | -2.7 (estimated) |

**Action needed:** Ask Lee for treatment decline rates for Stages 3a, 3b, and 5 before implementing those tiers. For now, use -2.0 for Stage 4 and leave the others as-is with a TODO comment. All three vectors are Stage 4, so the golden vector tests will pass with just the Stage 4 fix.

---

## 3. Current Engine (What John Built)

### 3.1 Phase 1 (Two-Component Formula, Lines 137-174)

John implemented the v2.0 spec interpretation from `finalized-formulas.md`:
- **Component 1:** BUN suppression removal = `eGFR_baseline * 0.08`
- **Component 2:** Rate differential = `(|old_rate| - |new_rate|) * 0.5` (over 6 months)

Where `old_rate` = BUN-adjusted decline at baseline BUN, `new_rate` = BUN-adjusted decline at achieved BUN.

This produces ~2.2 eGFR points of Phase 1 gain for V1 (vs Lee's 0.31 points).

**Why it was built this way:** The v2.0 spec (patient_app_spec_v2_updated.pdf Section 9.5) describes a two-component model with BUN suppression removal and rate differential. John faithfully implemented this spec. The spec's formula is clinically sophisticated but does not match Lee's simpler 0.31-coefficient model. Lee's golden vectors are authoritative -- the spec was apparently describing a future clinical-grade model, not the Lean Launch formula.

### 3.2 Phase 1 Saturation (Lines 128-134)

Current engine saturates Phase 1 over months 0-6 (reaching 100% at month 6). Lee's model completes Phase 1 saturation approach at month 3 (~91.8%), then begins decline.

### 3.3 Phase 2 (Continuous BUN Gain, Lines 182-210)

The engine adds a second gain phase from months 6-24:
- Logarithmic accumulation curve (`_phase2_fraction`)
- Phase 2 total = continuous function of achieved BUN, scaled by age attenuation
- Produces 3.0-8.0 additional eGFR points

**This entire subsystem does not exist in Lee's model.** Lee's vectors show no Phase 2 gain. The trajectory declines from month 3 onward.

### 3.4 Post-Phase 2 Decline (Lines 312-314)

After month 24, the engine applies tier-specific `post_decline` rates:
- bun_12: -0.33/yr (Path 4 -- matches Lee)
- bun_13_17: +1.0/yr decline
- bun_18_24: +1.5/yr decline

Lee's model starts decline at month 3 (not month 24) and uses CKD-stage rates (not tier-specific rates).

---

## 4. Gap Analysis

### 4.1 Month 12 Comparison Table

| Vector | Tier | Inputs | Engine Output | Lee Expects | Delta | % Over |
|--------|------|--------|---------------|-------------|-------|--------|
| V1 | bun_13_17 | BUN=16, eGFR=28, Age=58 | 34.3 | 26.79 | **+7.5** | +28% |
| V2 | bun_12 | BUN=11, eGFR=22, Age=64 | 29.0 | 22.04 | **+7.0** | +32% |
| V3 | bun_18_24 | BUN=22, eGFR=18, Age=74 | 21.5 | 17.09 | **+4.4** | +26% |

All three vectors exceed the +/-0.2 eGFR tolerance. The engine overestimates treatment benefit in every case.

### 4.2 Root Cause Decomposition per Vector

**V1 (bun_13_17, BUN=16, eGFR=28, Age=58):**
| Component | Engine | Lee | Delta |
|-----------|--------|-----|-------|
| Phase 1 total | 2.24 pts (suppression + rate diff) | 0.31 pts (0.31 coeff) | +1.93 |
| Phase 2 gain at month 12 | +3.1 pts (partial Phase 2) | 0 pts (no Phase 2) | +3.1 |
| Decline rate at month 3-12 | Not applied (still gaining) | -2.0/yr * 9/12 = -1.5 pts | +1.5 |
| Phase 1 saturation timing | Reaches ~92% at month 3, 100% at 6 | Stops at month 3 (~91.8%) | ~+0.9 |
| **Net delta at month 12** | | | **+7.5** |

**V2 (bun_12, BUN=11, eGFR=22, Age=64):**
| Component | Engine | Lee | Delta |
|-----------|--------|-----|-------|
| Phase 1 total | 1.76 pts | 0.31 pts | +1.45 |
| Phase 2 gain at month 12 | +4.0 pts (partial Phase 2) | 0 pts | +4.0 |
| Decline rate at month 3-12 | Not applied | -0.33/yr * 9/12 = -0.25 pts | +0.25 |
| Phase 1 timing | Continues to month 6 | Stops at month 3 | ~+1.3 |
| **Net delta at month 12** | | | **+7.0** |

**V3 (bun_18_24, BUN=22, eGFR=18, Age=74):**
| Component | Engine | Lee | Delta |
|-----------|--------|-----|-------|
| Phase 1 total | 1.45 pts | 0.31 pts | +1.14 |
| Phase 2 gain at month 12 | +1.5 pts (partial Phase 2) | 0 pts | +1.5 |
| Decline rate at month 3-12 | Not applied | -1.60/yr * 9/12 = -1.2 pts | +1.2 |
| Phase 1 timing | Continues to month 6 | Stops at month 3 | ~+0.6 |
| **Net delta at month 12** | | | **+4.4** |

### 4.3 Root Cause Summary

The overestimation stems from four compounding errors, all in the treatment trajectory:

1. **Phase 1 formula wrong:** Two-component model (eGFR*0.08 + rate_diff) produces 1.4-2.2 pts instead of 0.31 pts from the 0.31 coefficient
2. **Phase 2 does not exist:** Engine adds 3-8 pts of Phase 2 gain that Lee's model does not have
3. **Phase 1 saturation window wrong:** Engine saturates over months 0-6; Lee's model reaches ~91.8% at month 3 then decline begins
4. **After-Phase-1 decline rate wrong:** Engine uses tier-specific post_decline starting at month 24; Lee uses CKD-stage treatment rate starting at month 3

---

## 5. Required Code Changes

### 5.1 Functions to REMOVE

| Function | Lines | Reason |
|----------|-------|--------|
| `_phase2_fraction()` | 182-188 | Phase 2 does not exist in Lee's model |
| `_compute_phase2_gain()` | 191-210 | Phase 2 does not exist in Lee's model |

### 5.2 Functions to REPLACE

| Function | Lines | Change |
|----------|-------|--------|
| `_phase1_fraction()` | 128-134 | Change from 6-month saturation to 3-month saturation. `f(t) = 1 - exp(-2.5 * t / 3)` for `t in [0, 3]`, returns `f(3)` for `t >= 3`. Saturation curve shape is identical; only the cutoff changes from 6 to 3. |
| `_compute_phase1()` | 137-174 | Replace entire body. New formula: `phase1_total = min(tier_cap, (bun_baseline - tier_target_bun) * 0.31)`. Remove Component 1 (BUN suppression removal), Component 2 (rate differential), reduction factor, age attenuation within Phase 1, and achieved BUN computation. Return `phase1_total` only (no achieved_bun needed). |
| `compute_treatment_trajectory()` | 276-318 | Rewrite trajectory computation. New structure: t=0 baseline; t in (0, 3] Phase 1 saturation curve; t > 3 linear decline from eGFR(3). Remove Phase 2 references, remove `_phase2_fraction` and `_compute_phase2_gain` calls. |

### 5.3 Functions to ADD

| Function | Purpose |
|----------|---------|
| `_get_treatment_decline_rate()` | New function. Returns the after-Phase-1 decline rate for treatment paths. For CKD Stage 4: -2.0/yr (per Lee). Path 4 (bun_12): -0.33/yr floor. Age > 70: multiply by 0.80. Separate from `_get_base_decline_rate()` which serves the no-treatment path. |

### 5.4 `_TIER_CONFIG` Changes

Current:
```python
_TIER_CONFIG = {
    "bun_12":    {"target_bun": 10, "post_decline": -0.33},
    "bun_13_17": {"target_bun": 15, "post_decline": 1.0},
    "bun_18_24": {"target_bun": 21, "post_decline": 1.5},
}
```

New:
```python
_TIER_CONFIG = {
    "bun_12":    {"target_bun": 10, "tier_cap": 12, "post_decline": -0.33, "use_path4_floor": True},
    "bun_13_17": {"target_bun": 15, "tier_cap": 9,  "post_decline": None,  "use_path4_floor": False},
    "bun_18_24": {"target_bun": 21, "tier_cap": 6,  "post_decline": None,  "use_path4_floor": False},
}
```

New fields:
- `tier_cap`: Maximum Phase 1 gain for this tier (currently hardcoded nowhere; needed for `min(cap, delta * 0.31)`)
- `use_path4_floor`: Whether to use -0.33/yr floor instead of CKD-stage treatment rate
- `post_decline`: Retained for bun_12 (-0.33); set to None for other tiers (they use CKD-stage treatment rate)

A new `_TREATMENT_DECLINE_RATES` table (or a `_get_treatment_decline_rate()` function) is needed:
```python
_TREATMENT_DECLINE_RATES = [
    (45, 60, -1.2),   # Stage 3a — ESTIMATED, needs Lee confirmation
    (30, 45, -1.5),   # Stage 3b — ESTIMATED, needs Lee confirmation
    (15, 30, -2.0),   # Stage 4  — CONFIRMED by Lee (3 vectors)
    (0,  15, -2.7),   # Stage 5  — ESTIMATED, needs Lee confirmation
]
```

### 5.5 Functions UNCHANGED

| Function | Lines | Why |
|----------|-------|-----|
| `compute_no_treatment()` | 248-268 | No-treatment path uses different decline rates; Lee's vectors do not affect it |
| `compute_egfr_ckd_epi_2021()` | 83-93 | CKD-EPI formula is independent of treatment model |
| `_compute_egfr_for_sex()` | 72-80 | Same |
| `_get_base_decline_rate()` | 101-113 | Used only by no-treatment path; Coresh rates stay |
| `_get_decline_rate()` | 116-120 | Used only by no-treatment path (BUN modifier) |
| `_compute_optional_modifier()` | 218-240 | Independent of Phase 1/2 model |
| `compute_dial_age()` | 326-344 | Consumes trajectory arrays; formula-agnostic |
| `compute_bun_suppression_estimate()` | 352-359 | Stat card display; uses 0.31 coefficient separately |
| `compute_structural_floor()` | 385-430 | Amendment 3 display-only; unrelated to trajectory |
| `compute_confidence_tier()` | 438-447 | Tier classification; unrelated |
| `compute_stat_cards()` | 454-472 | Consumes trajectory arrays; formula-agnostic |
| `predict()` | 480-521 | Orchestrator; calls change internally but signature/structure stays |
| `predict_for_endpoint()` | 529-594 | Same |

### 5.6 Line-by-Line Change Summary

```
Lines 1-26:      Module docstring           UPDATE (remove Phase 2 references, note Lee's model)
Lines 27-28:     Imports                    KEEP (math, typing)
Lines 34-64:     Constants                  UPDATE _TIER_CONFIG (add tier_cap, update post_decline)
                                            ADD _TREATMENT_DECLINE_RATES table
Lines 72-93:     CKD-EPI                    KEEP
Lines 101-120:   Decline rates              KEEP (no-treatment path only)
                                            ADD _get_treatment_decline_rate()
Lines 128-134:   _phase1_fraction()         UPDATE (3-month cutoff, not 6)
Lines 137-174:   _compute_phase1()          REPLACE (0.31 coeff model, remove two-component)
Lines 182-210:   _phase2_fraction() +       REMOVE ENTIRELY
                 _compute_phase2_gain()
Lines 218-240:   Optional modifiers         KEEP
Lines 248-268:   compute_no_treatment()     KEEP
Lines 276-318:   compute_treatment_traj()   REWRITE (Phase 1 to month 3, then linear decline)
Lines 326-594:   Everything else            KEEP (dial_age, structural_floor, stat_cards,
                                            predict, predict_for_endpoint)
```

---

## 6. Test Impact

### 6.1 Current Test Inventory

The test file `backend/tests/test_prediction_engine.py` contains:
- **120 test functions** (def test_*)
- **4 parametrized test methods** that expand to **86 individual test cases** (from the 3 old golden vectors)
- **Total effective tests: ~180+** (120 non-parametrized + 86 parametrized - 4 parametrized defs counted in 120)

### 6.2 Xfail Tests (86 parametrized, to be REPLACED)

All 4 parametrized golden vector test methods are currently marked `xfail`:
- `test_vector_1_no_treatment` (14 cases) -- xfail, BUN modifier discrepancy
- `test_vector_1_treatment_paths` (42 cases) -- xfail, Phase 1/2 formula mismatch
- `test_vector_2_stage5_high_bun` (18 cases) -- xfail, same formula mismatch
- `test_vector_3_mild_ckd` (12 cases) -- xfail, same formula mismatch

**After refactor:** These 86 xfail tests should be **deleted entirely**. The old golden vectors (BUN 35/eGFR 33, BUN 53/eGFR 10, BUN 22/eGFR 48) from `finalized-formulas.md Section 7` are obsolete. Replace with Lee's 3 new vectors, which are single-point checks at month 12 (not full trajectories).

### 6.3 `golden_vectors.py` — Complete Replacement

The fixture file `backend/tests/fixtures/golden_vectors.py` needs to be completely rewritten:
- Remove all 3 old vectors (GOLDEN_VECTOR_1/2/3) and their discrepancy notes
- Add 3 new Lee vectors with single-point month-12 expected values
- Keep GOLDEN_TOLERANCE = 0.2
- Keep TIME_POINTS_MONTHS

### 6.4 Tests That Will Break (Need Updating)

| Test Class | Tests Affected | Action |
|------------|---------------|--------|
| `TestGoldenFileVectors` | All methods | Replace with 3 new Lee vector tests (strict, not xfail) |
| `TestBoundaryValuesBUN.test_bun_at_21_tier_boundary` | 1 test | Currently asserts `bun_18_24 at t=3 >= baseline` due to Phase 1 suppression removal. With 0.31 coeff model, Phase 1 gain for BUN=21 (target=21) is `min(6, (21-21)*0.31) = 0`. Trajectory at t=3 will be at or very slightly above baseline. Update assertion. |
| `TestTierConfig` | 3 tests (post_decline assertions) | Update to reflect new _TIER_CONFIG structure (tier_cap, use_path4_floor) |
| `TestTierConfig.test_treatment_trajectory_at_t24_above_baseline` | 1 test | Currently asserts trajectory at t=24 > baseline. With no Phase 2 and decline from month 3, treatment trajectory at t=24 may be BELOW baseline for small Phase 1 gains. Remove or rewrite. |
| `TestTierConfig.test_treatment_trajectory_post_phase2_decline_rate` | 1 test | Tests decline rate between t=24 and t=36. With Lee's model, decline starts at month 3, not month 24. Rewrite to test month 3-12 decline. |
| `TestNoTreatmentDeclineRates.test_phase1_fraction_at_month_6_is_1` | 1 test | Phase 1 no longer saturates at month 6. Update to test month 3 behavior. |
| `TestNoTreatmentDeclineRates.test_phase2_fraction_*` | 2 tests | Phase 2 functions removed. Delete these tests. |
| `TestEdgeCases.test_higher_tier_yields_better_or_equal_trajectory` | 1 test | Ordering property should still hold but verify with new formula. |

### 6.5 Tests That Should PASS Unchanged

All of these test classes are unaffected by the treatment formula change:
- `TestBoundaryValuesCreatinine` (7 tests)
- `TestBoundaryValuesAge` (7 tests, but `test_age_70_threshold_no_error` comment needs update)
- `TestBoundaryValuesOptionalModifiers` (5 tests)
- `TestBoundaryValuesEGFRStages` (5 tests)
- `TestDeterminism` (4 tests)
- `TestCKDEPIFormula` (6 tests)
- `TestStructuralFloor` (12 tests)
- Most of `TestEdgeCases` (structural tests like array length, keys, dial_age, etc.)
- Most of `TestNoTreatmentDeclineRates` (base rate assertions, BUN modifier, linear decline)

Estimated: **~90-95 tests pass unchanged**, **~10-15 tests need updating**, **~86 xfail tests replaced with ~3-6 strict tests**.

---

## 7. Risk Assessment

### 7.1 What Could Go Wrong

| Risk | Severity | Mitigation |
|------|----------|------------|
| Treatment decline rates for non-Stage-4 patients are unknown | HIGH | Only Stage 4 vectors exist. Use -2.0 for Stage 4 (confirmed), estimate or use existing rates for other stages. Add TODO + ask Lee immediately. |
| No-treatment path accidentally modified | HIGH | `compute_no_treatment()` must not change. Run existing no-treatment tests as regression gate. |
| Optional modifier interaction changes | MEDIUM | `_compute_optional_modifier()` currently adds to `post_decline_rate`. With new model, it should add to the treatment decline rate. Verify behavior preserved. |
| Tier ordering (bun_12 >= bun_13_17 >= bun_18_24) breaks | MEDIUM | With simpler Phase 1, ordering depends on `phase1_total` differences being small relative to decline rates. For BUN values close to targets, all tiers produce similar Phase 1 gain (~0.31 pts), and ordering comes from decline rates. Path 4's -0.33/yr vs CKD-stage -2.0/yr maintains the ordering. Verify with tests. |
| BUN suppression estimate (stat card) formula confused with Phase 1 | LOW | BUN suppression uses `(BUN - 10) * 0.31` (stat card display). Phase 1 uses `(BUN - target) * 0.31` (trajectory). Both use 0.31 but with different baselines. Keep them clearly separate. |
| Phase 1 gain = 0 when BUN = target_BUN | LOW | `(BUN - target) * 0.31 = 0`. This is correct -- patient already at target BUN, no additional gain. Treatment trajectory will decline from baseline. This is clinically reasonable but different from current behavior (which always gives ~0.08*eGFR suppression removal). |

### 7.2 What to Verify After Refactor

1. **All 3 Lee vectors pass within +/-0.2 tolerance** (strict, not xfail)
2. **No-treatment trajectory unchanged** for all 3 vectors (regression gate)
3. **Tier ordering preserved:** bun_12 >= bun_13_17 >= bun_18_24 >= no_treatment at every time point
4. **Boundary: BUN = target_BUN** produces Phase 1 gain = 0 (trajectory declines from baseline)
5. **Boundary: BUN far above target** hits tier cap (e.g., BUN=50, target=21, gain = min(6, 29*0.31) = min(6, 8.99) = 6)
6. **Path 4 rate = -0.33/yr** still applied correctly for bun_12 tier
7. **Age > 70 attenuation** applied to after-Phase-1 decline (not to Phase 1 itself)
8. **Optional modifiers** still increase decline rate for treatment paths
9. **Structural floor** (Amendment 3) completely unchanged -- display-only, no trajectory coupling
10. **BUN suppression estimate** (stat card) completely unchanged -- still uses `(BUN-10)*0.31`

### 7.3 Explicitly Unchanged Components

- **No-treatment path** does NOT use Phase 1/2 and is unaffected
- **BUN suppression estimate** (stat card) uses 0.31 coefficient with baseline 10, NOT the Phase 1 formula
- **Structural floor** (Amendment 3) is display-only, reads current eGFR + BUN, does not interact with trajectory computation
- **CKD-EPI 2021** formula is upstream of all trajectories and unaffected
- **Dial age computation** consumes trajectory arrays and is formula-agnostic
- **Confidence tier** is based on optional field presence, not trajectory values

---

## 8. Recommended Approach

### 8.1 Branch and PR

- **Single PR, one branch**
- **Suggested branch name:** `feat/LKID-60-engine-golden-vectors` (create LKID-60 in Jira first)
- **Card title:** "Engine refactor: Lee golden vectors v2.0 treatment formula"
- **Sprint:** Sprint 3 (in-progress)

### 8.2 Implementation Sequence

1. **Engine changes first** (`backend/prediction/engine.py`):
   - Update `_TIER_CONFIG` with `tier_cap` field
   - Add `_TREATMENT_DECLINE_RATES` table and `_get_treatment_decline_rate()` function
   - Rewrite `_phase1_fraction()` (3-month cutoff)
   - Replace `_compute_phase1()` with 0.31-coefficient model
   - Remove `_phase2_fraction()` and `_compute_phase2_gain()` entirely
   - Rewrite `compute_treatment_trajectory()` (Phase 1 to month 3, then linear decline)
   - Update module docstring

2. **Update golden vectors** (`backend/tests/fixtures/golden_vectors.py`):
   - Remove all 3 old vectors and discrepancy notes
   - Add 3 new Lee vectors with month-12 expected values
   - Add full trajectory expected values for month 0, 1, 3, 6, 12 (derivable from Lee's formula)

3. **Fix tests** (`backend/tests/test_prediction_engine.py`):
   - Replace `TestGoldenFileVectors` class entirely (strict tests, not xfail)
   - Update `TestTierConfig` assertions for new config structure
   - Remove Phase 2 fraction tests
   - Update Phase 1 fraction tests (month 3 behavior)
   - Update boundary tests that asserted Phase 1 suppression removal behavior
   - Run full suite, fix any remaining failures

4. **Verify no-treatment regression:**
   - Run `compute_no_treatment()` for all 3 new vectors, compare to pre-refactor output
   - These should be bit-for-bit identical

### 8.3 QA Gate

- **Yuri reviews** per QA SOP (`docs/qa-testing-sop.md`)
- Verify all 3 Lee vectors pass within +/-0.2 tolerance
- Verify no-treatment path unchanged
- Verify tier ordering preserved
- Coverage target: 85% for `backend/prediction/engine.py` (same as current)

### 8.4 Immediate Follow-Up (After Merge)

- **Ask Lee for treatment decline rates** for CKD Stages 3a, 3b, and 5 (we only have Stage 4 = -2.0 confirmed)
- **Ask Lee for additional vectors** covering:
  - A Stage 3 patient (eGFR 30-59) to validate non-Stage-4 treatment rates
  - A BUN value far from target (to verify tier cap behavior)
  - A patient with age > 80 (to verify stacked attenuation, if applicable)
- **Consider whether age > 80 still uses stacked attenuation** (0.80 * 0.65) from the old Phase 2 model, or just 0.80. Lee's vectors only test age > 70 single attenuation. For now, implement single 0.80 factor for age > 70 (matching vectors). Flag age > 80 as needing confirmation.

---

## Appendix A: Manual Verification of Lee's Vectors

### V1: bun_13_17, BUN=16, eGFR=28, Age=58

```
phase1_total = min(9, (16 - 15) * 0.31) = min(9, 0.31) = 0.31
f(3) = 1 - exp(-2.5) = 0.9179
eGFR(3) = 28 + 0.31 * 0.9179 = 28.2846
treatment_rate = -2.0 (Stage 4, age < 70)
eGFR(12) = 28.2846 + (-2.0) * (12 - 3) / 12 = 28.2846 - 1.5 = 26.7846
Lee expects: 26.79  |  Computed: 26.78  |  Delta: -0.01  |  PASS
```

### V2: bun_12, BUN=11, eGFR=22, Age=64

```
phase1_total = min(12, (11 - 10) * 0.31) = min(12, 0.31) = 0.31
f(3) = 0.9179
eGFR(3) = 22 + 0.31 * 0.9179 = 22.2846
treatment_rate = -0.33 (Path 4 floor, age < 70)
eGFR(12) = 22.2846 + (-0.33) * (12 - 3) / 12 = 22.2846 - 0.2475 = 22.0371
Lee expects: 22.04  |  Computed: 22.04  |  Delta: 0.00  |  PASS
```

### V3: bun_18_24, BUN=22, eGFR=18, Age=74

```
phase1_total = min(6, (22 - 21) * 0.31) = min(6, 0.31) = 0.31
f(3) = 0.9179
eGFR(3) = 18 + 0.31 * 0.9179 = 18.2846
treatment_rate = -2.0 * 0.80 = -1.60 (Stage 4, age > 70)
eGFR(12) = 18.2846 + (-1.60) * (12 - 3) / 12 = 18.2846 - 1.20 = 17.0846
Lee expects: 17.09  |  Computed: 17.08  |  Delta: -0.01  |  PASS
```

All three vectors match within the +/-0.2 tolerance (actual deltas are +/-0.01).
