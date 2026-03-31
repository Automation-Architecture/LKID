# DISPATCH: Sprint 3 QA + Test Infrastructure — Yuri + Gay Mark

**Date:** 2026-03-30
**From:** Luca (CTO / Orchestrator)
**To:** Yuri (QA / Test Writer) + Gay Mark (Database Engineer)
**Sprint:** Sprint 3 — PDF, Polish & QA (Mar 30 -- Apr 9, 2026)

---

## Context

The prediction engine is fully merged (PR #13 `feat/LKID-15-post-predict`, PR #17
`feat/LKID-56-test-fixture`). All 4 trajectory paths are live in
`backend/prediction/engine.py`. Test infrastructure scaffolding is in place at
`backend/tests/` with fixture factories already defined. Sprint 3 opens with one
joint card: exhaustive boundary testing and golden-file validation of the engine
before any PDF or polish work ships on top of it.

This is a HIGH-priority card. An untested engine is a liability. Complete this
before LKID-4 (PDF) or LKID-19 (Visx chart) begin consuming engine output.

---

## Task 1: LKID-27 — Prediction Engine Boundary Tests + Golden Files

**Cards:** LKID-27
**Priority:** HIGH
**Branch:** `feat/LKID-27-boundary-tests`
**Owners:** Gay Mark (fixtures + seed data) + Yuri (test cases + CI integration)
**No blockers** — engine is merged and all inputs are defined.

---

### Gay Mark: Test Fixtures + Boundary Value Sets

Your work lands in `backend/tests/fixtures/factories.py` (extend existing file)
and a new `backend/tests/fixtures/boundary_sets.py` for the structured boundary
value tables.

**Binding validation ranges (from backend-meeting-memo.md — non-negotiable):**

| Field | Min | Max | Notes |
|-------|-----|-----|-------|
| BUN | 5 | 150 | Frontend soft cap at 100; DB/Pydantic hard cap at 150 |
| Creatinine | 0.3 | 20.0 | Max=20.0 pending Lee Q6 confirmation |
| Age | 18 | 120 | DB CHECK constraint enforced |
| Hemoglobin | 4.0 | 20.0 | Optional field; Tier 2 modifier |
| Glucose | 40 | 500 | Optional field; Tier 2 modifier |

Potassium (2.0--8.0) is validated but not a prediction engine input — exclude
from engine boundary sets.

**For each input field, produce boundary value rows covering:**

1. At minimum (`min`)
2. Just above minimum (`min + epsilon`, e.g. 0.1 above)
3. Midrange representative value
4. Just below maximum (`max - epsilon`)
5. At maximum (`max`)
6. One step below minimum (invalid — for negative testing)
7. One step above maximum (invalid — for negative testing)

**Add the following named fixture factories** (extend `factories.py`):

```python
def make_boundary_bun_min() -> dict      # BUN=5, all others midrange
def make_boundary_bun_max() -> dict      # BUN=150, all others midrange
def make_boundary_creatinine_min() -> dict  # Creatinine=0.3
def make_boundary_creatinine_max() -> dict  # Creatinine=20.0
def make_boundary_age_min() -> dict      # Age=18
def make_boundary_age_max() -> dict      # Age=120
def make_boundary_hemoglobin_min() -> dict  # Hemoglobin=4.0
def make_boundary_hemoglobin_max() -> dict  # Hemoglobin=20.0
def make_boundary_glucose_min() -> dict  # Glucose=40
def make_boundary_glucose_max() -> dict  # Glucose=500
```

Also create these **age-boundary fixtures** — the Phase 2 age attenuation kicks
in at 70 and 80 per `finalized-formulas.md` Section 3:

```python
def make_age_just_below_70() -> dict     # Age=69
def make_age_70_boundary() -> dict       # Age=70
def make_age_just_above_70() -> dict     # Age=71
def make_age_just_below_80() -> dict     # Age=79
def make_age_80_boundary() -> dict       # Age=80
def make_age_just_above_80() -> dict     # Age=81
```

And these **eGFR boundary fixtures** that span CKD stage transitions and the
dialysis threshold:

```python
def make_stage_3a_lower_boundary() -> dict   # creatinine producing eGFR ~45
def make_stage_3b_upper_boundary() -> dict   # creatinine producing eGFR ~44
def make_stage_4_upper_boundary() -> dict    # creatinine producing eGFR ~29
def make_dialysis_threshold_boundary() -> dict  # creatinine producing eGFR ~12
```

Expose all new factories as pytest fixtures in `backend/tests/conftest.py`
following the existing fixture-per-factory pattern already there.

**Golden file test data — create `backend/tests/fixtures/golden_vectors.py`:**

Encode the 3 test vectors from `finalized-formulas.md` Section 7 as typed
Python constants. These are the source of truth for golden file comparisons.

```python
# Vector 1 — Spec Example (BUN 35, eGFR 33, Age 58)
GOLDEN_VECTOR_1_INPUT = {
    "bun": 35, "creatinine": 2.1, "age": 58, "egfr_override": 33.0
}
GOLDEN_VECTOR_1_EXPECTED = {
    # keyed by (time_month, path)
    # no_tx, bun_18_24, bun_13_17, bun_12 per the table in Section 7
    (0, "no_tx"): 33.0,    (0, "bun_18_24"): 33.0,
    (0, "bun_13_17"): 33.0, (0, "bun_12"): 33.0,
    (1, "no_tx"): 32.8,    (1, "bun_18_24"): 34.0,
    (1, "bun_13_17"): 34.6, (1, "bun_12"): 35.4,
    (3, "no_tx"): 32.3,    (3, "bun_18_24"): 35.7,
    (3, "bun_13_17"): 36.9, (3, "bun_12"): 38.7,
    (6, "no_tx"): 31.7,    (6, "bun_18_24"): 36.0,
    (6, "bun_13_17"): 37.4, (6, "bun_12"): 39.6,
    (12, "no_tx"): 30.6,   (12, "bun_18_24"): 37.0,
    (12, "bun_13_17"): 39.4, (12, "bun_12"): 42.6,
    (18, "no_tx"): 29.5,   (18, "bun_18_24"): 37.6,
    (18, "bun_13_17"): 40.7, (18, "bun_12"): 44.5,
    (24, "no_tx"): 28.4,   (24, "bun_18_24"): 37.9,
    (24, "bun_13_17"): 41.4, (24, "bun_12"): 45.7,
    (36, "no_tx"): 26.3,   (36, "bun_18_24"): 36.4,
    (36, "bun_13_17"): 40.4, (36, "bun_12"): 45.2,
    (120, "no_tx"): 11.2,  (120, "bun_18_24"): 25.9,
    (120, "bun_13_17"): 33.4, (120, "bun_12"): 41.7,
}

# Vector 2 — Stage 5 High-BUN (BUN 53, eGFR 10, Age 65)
GOLDEN_VECTOR_2_INPUT = {
    "bun": 53, "age": 65, "egfr_override": 10.0
}
GOLDEN_VECTOR_2_EXPECTED = {
    (0, "no_tx"): 10.0, (0, "bun_18_24"): 10.0,
    (3, "no_tx"): 8.5,  (3, "bun_18_24"): 14.0,
    (3, "bun_13_17"): 16.4, (3, "bun_12"): 19.4,
    (12, "no_tx"): 5.5, (12, "bun_18_24"): 16.1,
    (12, "bun_13_17"): 20.2, (12, "bun_12"): 24.9,
    (24, "no_tx"): 2.0, (24, "bun_18_24"): 17.5,
    (24, "bun_13_17"): 22.4, (24, "bun_12"): 27.4,
    (36, "bun_18_24"): 16.0, (36, "bun_13_17"): 21.4, (36, "bun_12"): 26.9,
    (120, "bun_18_24"): 7.5, (120, "bun_13_17"): 15.4, (120, "bun_12"): 22.4,
}

# Vector 3 — Mild CKD (BUN 22, eGFR 48, Age 52)
GOLDEN_VECTOR_3_INPUT = {
    "bun": 22, "age": 52, "egfr_override": 48.0
}
GOLDEN_VECTOR_3_EXPECTED = {
    (0, "no_tx"): 48.0,   (0, "bun_18_24"): 48.0,
    (3, "no_tx"): 47.6,   (3, "bun_18_24"): 48.3,
    (3, "bun_13_17"): 49.3, (3, "bun_12"): 51.1,
    (24, "no_tx"): 44.8,  (24, "bun_18_24"): 49.0,
    (24, "bun_13_17"): 52.2, (24, "bun_12"): 57.4,
    (120, "no_tx"): 29.2, (120, "bun_18_24"): 34.0,
    (120, "bun_13_17"): 42.2, (120, "bun_12"): 52.9,
}

GOLDEN_TOLERANCE = 0.2  # ±0.2 eGFR per calc spec Section 4
```

**Note on vector caveats (from finalized-formulas.md Section 7):**
These test vectors were generated using the calc spec's simplified model (0.31
coefficient, fixed tier targets, no age adjustment). If the engine implements
v2.0 formulas, outputs may diverge beyond ±0.2 on some time points. If this
happens during test authoring, flag it in a test comment referencing the open
question Q1 in finalized-formulas.md Section 8. Do NOT silently widen tolerance
— raise it with Luca first.

---

### Yuri: Test Cases + Golden File Comparisons + CI Integration

Your work lands in `backend/tests/test_prediction_engine.py` (new file).

**Time points array** (from `engine.py` and finalized-formulas.md):
```python
TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]
```

**Test file structure — organize into the following test classes/sections:**

#### Section 1: Golden File Comparisons (3 vectors, all 4 paths)

```python
# test_prediction_engine.py
import pytest
from backend.prediction.engine import run_prediction   # or equivalent entry point
from backend.tests.fixtures.golden_vectors import (
    GOLDEN_VECTOR_1_INPUT, GOLDEN_VECTOR_1_EXPECTED,
    GOLDEN_VECTOR_2_INPUT, GOLDEN_VECTOR_2_EXPECTED,
    GOLDEN_VECTOR_3_INPUT, GOLDEN_VECTOR_3_EXPECTED,
    GOLDEN_TOLERANCE,
)

class TestGoldenFileVectors:
    """
    Three calc-spec test vectors. Each must match within ±0.2 eGFR.
    If outputs diverge, document the formula discrepancy — do NOT silently pass.
    Reference: finalized-formulas.md Section 7, open question Q1.
    """
    @pytest.mark.parametrize("time_month,path,expected", [...])
    def test_vector_1_spec_example(self, time_month, path, expected): ...

    @pytest.mark.parametrize("time_month,path,expected", [...])
    def test_vector_2_stage5_high_bun(self, time_month, path, expected): ...

    @pytest.mark.parametrize("time_month,path,expected", [...])
    def test_vector_3_mild_ckd(self, time_month, path, expected): ...
```

The parametrize loop over `(time_month, path, expected)` triples should use
the `GOLDEN_VECTOR_*_EXPECTED` dicts from Gay Mark's golden_vectors.py.

#### Section 2: Boundary Value Tests — All 4 Inputs

For each input (BUN, creatinine, age, hemoglobin/glucose as optional modifiers),
write tests at min, max, and critical boundary values. Each test asserts:
- Engine does not raise an exception
- All 4 trajectory arrays are returned with exactly 15 values
- All trajectory values are >= 0.0 (eGFR cannot go negative)
- No-treatment trajectory is monotonically non-increasing (or reaches 0 and stays)
- Treatment trajectories do not exceed a clinically absurd ceiling (suggest 100.0)

**Priority boundary cases to cover explicitly:**

```
BUN at min (5) and max (150) — engine must not error
BUN=21 (boundary between bun_18_24 target and bun_13_17 target)
Creatinine=0.3 (min) and creatinine=20.0 (max)
Age=18 (min) and age=120 (max)
Age=70 (Phase 2 attenuation threshold, 0.80 factor)
Age=80 (Phase 2 stacked attenuation threshold, 0.65 factor)
eGFR calculated to ~12.0 (dialysis threshold)
eGFR calculated to ~45.0 (Stage 3a/3b boundary)
eGFR calculated to ~30.0 (Stage 3b/4 boundary)
eGFR calculated to ~15.0 (Stage 4/5 boundary)
Hemoglobin=4.0 (min — should add +0.2 mL/min/yr excess decline)
Hemoglobin=11.0 (concerning range threshold)
Glucose=40 (min)
Glucose=500 (max)
```

#### Section 3: Edge Case Scenarios

```python
class TestEdgeCases:
    def test_no_treatment_trajectory_hits_zero_not_negative(self): ...
    def test_dialysis_threshold_crossed_at_correct_egfr(self):
        """DIALYSIS_THRESHOLD = 12.0. Confirm the engine uses 12, not 15."""
    def test_all_four_trajectories_returned(self): ...
    def test_trajectory_arrays_are_exactly_15_points(self): ...
    def test_bun_suppression_estimate_calc_spec_method(self):
        """BUN=35, eGFR=33 => suppression = (35-10)*0.31 = 7.8 pts"""
    def test_bun_suppression_below_threshold_is_zero(self):
        """BUN <= 10 per calc spec method => suppression = 0"""
    def test_egfr_override_used_when_provided(self): ...
    def test_egfr_calculated_from_creatinine_when_no_override(self): ...
    def test_optional_modifiers_absent_does_not_error(self):
        """Tier 1 request (no hemoglobin/glucose) must produce valid output."""
    def test_optional_modifiers_present_increases_post_phase2_decline(self):
        """Hemoglobin < 11 adds +0.2/yr. Verify by comparing trajectories."""
    def test_treatment_path_higher_than_no_treatment_at_all_time_points(self):
        """All 3 treatment paths must be >= no_treatment at every time point."""
    def test_higher_tier_yields_better_or_equal_trajectory(self):
        """bun_12 >= bun_13_17 >= bun_18_24 >= no_tx at every time point."""
```

#### Section 4: Determinism

```python
class TestDeterminism:
    def test_same_inputs_produce_identical_outputs(self):
        """Run engine twice with identical inputs — results must be bit-for-bit equal."""
    def test_no_random_state_in_engine(self):
        """Engine must not import random or numpy.random (import inspection)."""
    def test_no_network_calls_in_engine(self):
        """Engine must not import requests, httpx, or socket (import inspection)."""
```

#### Section 5: No-Treatment Regression

```python
class TestNoTreatmentDeclineRates:
    """Verify the 4 CKD-stage base decline rates against known values."""
    def test_stage_3a_decline_rate_is_1_8_per_year(self): ...
    def test_stage_3b_decline_rate_is_2_2_per_year(self): ...
    def test_stage_4_decline_rate_is_3_0_per_year(self): ...
    def test_stage_5_decline_rate_is_4_0_per_year(self): ...
    def test_bun_modifier_adds_to_decline_when_bun_above_20(self): ...
    def test_bun_modifier_is_zero_when_bun_at_or_below_20(self): ...
```

**Determinism requirement:** All tests must use only the fixture constants from
`golden_vectors.py` and Gay Mark's boundary factories — no `random`, no
`datetime.now()`, no network calls. Tests that rely on stochastic data will be
rejected at QA gate.

**CI requirement:** Tests must run via `pytest backend/tests/test_prediction_engine.py`
with no additional setup beyond the existing `requirements.txt`. Add a
`pytest.ini` marker `prediction_engine` so the suite can be targeted in CI:

```ini
[pytest]
markers =
    prediction_engine: prediction engine unit tests (boundary, golden file, edge cases)
```

In `pyproject.toml` or CI config, ensure this test file is included in the
pre-merge check. Tests must **block merges on failure** — do not leave them in a
skip or xfail state without explicit Luca approval.

**Coverage requirement:** After running the full suite, generate a coverage
report for the `prediction/` module:

```bash
pytest backend/tests/test_prediction_engine.py \
    --cov=backend/prediction \
    --cov-report=term-missing \
    --cov-fail-under=85
```

The coverage gate is **85% for `backend/prediction/engine.py`**. Include the
coverage summary in your QA output file.

---

## Acceptance Criteria (LKID-27)

All of the following must be true before the PR is ready for merge:

1. Unit tests cover all 4 prediction inputs (BUN, creatinine, age, optional
   modifiers) at min, max, boundary, and edge values.
2. All 4 trajectory arrays (no_tx, bun_18_24, bun_13_17, bun_12) are validated
   per test case — length, non-negativity, ordering invariants.
3. All 3 golden-file test vectors match engine output within ±0.2 eGFR per time
   point. If a vector fails beyond tolerance, Yuri documents the discrepancy and
   escalates to Luca before PR is opened.
4. Tests are fully deterministic — no randomness, no network calls, no
   filesystem side effects.
5. Tests run with `pytest backend/tests/test_prediction_engine.py` and pass
   cleanly on a cold checkout.
6. CI integration is in place — test failures block merges.
7. Coverage report for `backend/prediction/engine.py` meets the 85% gate.
8. Yuri produces a QA output file at `agents/yuri/drafts/qa-lkid-27-boundary-tests.md`
   summarizing: vector results, coverage %, any discrepancies flagged, and
   a PASS/FAIL verdict.

---

## Coordination Notes

- **John (LKID-14 rules engine):** John may be iterating on `engine.py` in
  parallel if Lee unblocks LKID-14. Before opening your PR, confirm with John
  that no interface changes are in-flight. If `run_prediction()` signature
  changes, rebase and update test calls accordingly.
- **Pipeline after LKID-27:** Once this card is merged, Yuri moves directly to:
  - LKID-49 — Visx QA pairing (blocks on LKID-19 chart)
  - LKID-26 — axe-core accessibility audit
  - LKID-28 — E2E tests (Playwright)
  - LKID-29 — final QA gate (Sprint 3 blocker)
- **Gay Mark after LKID-27:** Additional test infrastructure work TBD. Check
  with Luca after the PR merges.
- **QA SOP:** Both agents must follow `docs/qa-testing-sop.md`. QA approval is
  required for merge. Yuri self-reviews, then Luca does final review.
- **Dialysis threshold is 12.0, not 15.0** — confirmed in `engine.py`
  (`DIALYSIS_THRESHOLD = 12.0`) and finalized-formulas.md Reference section.
  Tests must assert 12.0.

---

## Key Reference Files

| File | What to Read |
|------|--------------|
| `backend/prediction/engine.py` | Entry points, constants (`TIME_POINTS_MONTHS`, `DIALYSIS_THRESHOLD`, `TIER_CONFIG`, `NO_TX_DECLINE_RATES`) |
| `backend/tests/fixtures/factories.py` | Existing factory functions — extend, do not duplicate |
| `backend/tests/conftest.py` | Existing pytest fixture wiring — add new fixtures here |
| `backend/tests/test_health.py` | Example of existing test style (httpx + anyio) |
| `agents/john_donaldson/drafts/finalized-formulas.md` | Section 7 (test vectors), Section 4 (decline rates), tolerance |
| `agents/luca/drafts/backend-meeting-memo.md` | Binding validation range table |
| `docs/qa-testing-sop.md` | Binding QA process |

---

*Dispatched by Luca — 2026-03-30*
