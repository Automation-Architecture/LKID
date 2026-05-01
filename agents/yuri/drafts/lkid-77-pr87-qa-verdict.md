# LKID-77 PR #87 QA Verdict — `compute_dial_age` Below-Threshold Guard

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Branch:** `fix/LKID-77-dial-age-below-threshold`
**PR:** [#87](https://github.com/Automation-Architecture/LKID/pull/87)
**Card:** LKID-77 — engine edge case: `compute_dial_age` returns None when `trajectory[0] < DIALYSIS_THRESHOLD`
**Scope:** One-line guard in `backend/prediction/engine.py` + 4 new pytest tests. Backend-only change, no frontend modifications.

---

## Top-Level Verdict: **PASS**

The fix is minimal, correct, and well-tested. The guard is placed at the exact right position (top of `compute_dial_age`, before the interpolation loop), returns the semantically correct value (`float(current_age)` — not `None`), and leaves all three existing return paths unchanged. The four new tests are appropriately scoped: two direct unit tests on `compute_dial_age`, one type assertion, and one end-to-end integration test via `_run_predict(egfr_entered=5.0)`. All 229 tests pass per PR description and CI. Copilot auto-review not attached (no GitHub Copilot review present in the reviews list — this is consistent with other recent PRs in the repo where Copilot sometimes does not attach). CodeRabbit CI check: PASS. Vercel deployment: PASS.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| The fix (guard + docstring) | 4 | 4 | 0 | 0 |
| New tests (unit + type + None regression + integration) | 4 | 4 | 0 | 0 |
| No regressions (pre-existing tests) | 3 | 3 | 0 | 0 |
| API contract / frontend compatibility | 2 | 2 | 0 | 0 |
| CI (CodeRabbit + Vercel) | 2 | 2 | 0 | 0 |
| **Totals** | **15** | **15** | **0** | **0** |

---

## Checklist: The Fix

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| F-01 | Guard at top of `compute_dial_age`: when `trajectory[0] < DIALYSIS_THRESHOLD` returns `float(current_age)` | PASS | `engine.py` lines 301-302: `if trajectory[0] < DIALYSIS_THRESHOLD: return float(current_age)  # already below threshold at baseline` — placed before the interpolation loop, after the docstring. |
| F-02 | Interpolation logic below the guard is unchanged | PASS | Diff shows no changes to lines 304-312 (the `for i in range(1, len(trajectory)):` loop and interpolation calculation). |
| F-03 | `return None` path (never crosses) is still reachable and unchanged | PASS | `engine.py` line 313: `return None` — unchanged. Reachable whenever `trajectory[0] >= DIALYSIS_THRESHOLD` and no crossing is detected during the loop. |
| F-04 | Docstring documents all three return cases | PASS | Updated docstring (`engine.py` lines 289-299) explicitly documents: (1) `float(current_age)` when baseline already below threshold, (2) interpolated float when crossing detected during window, (3) `None` when trajectory stays at or above threshold for full 120-month window. |

---

## Checklist: New Tests

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| T-01 | Direct unit test: trajectory starting below 12.0 → returns `float(current_age)` (not `None`) | PASS | `test_compute_dial_age_returns_current_age_when_baseline_below_threshold` (line 658): constructs `below_trajectory = [5.0] + [4.0] * (len(TIME_POINTS_MONTHS) - 1)`, calls `compute_dial_age(below_trajectory, current_age=45)`, asserts result == `float(45)`. |
| T-02 | Type test: return is `float` not `int` | PASS | `test_compute_dial_age_returns_current_age_exact_type` (line 674): trajectory at 8.0, `current_age=72`, asserts `isinstance(result, float)` and `result == 72.0`. Covers the `float()` cast in the guard. |
| T-03 | Regression test: `None` path is still correct for above-threshold trajectory | PASS | `test_compute_dial_age_none_unchanged_for_above_threshold` (line 683): `above_trajectory = [50.0] * len(TIME_POINTS_MONTHS)`, asserts `result is None`. Confirms the guard does not inadvertently intercept above-threshold inputs. |
| T-04 | Integration test: `_run_predict(egfr_entered=5.0)` → `dial_ages["no_treatment"] == float(age)` not `None` | PASS | `test_dial_age_not_none_for_baseline_below_threshold_via_predict` (line 692): `_run_predict(bun=22, creatinine=5.0, age=55, egfr_entered=5.0)`, asserts `no_tx_dial is not None` and `no_tx_dial == float(55)`. Full engine pipeline exercised. |

---

## Checklist: No Regressions

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| R-01 | All 229 tests pass | PASS | PR description states `cd backend && python -m pytest tests/ -x -q → 229 passed`. CI: CodeRabbit PASS, Vercel PASS. |
| R-02 | `test_dial_age_computed_for_stage5_patient` still passes (`egfr_entered=15.0` → interpolation path) | PASS | Test at line 639 uses `egfr_entered=15.0` (> DIALYSIS_THRESHOLD=12.0), so the new guard does not fire. Interpolation loop correctly detects the crossing. Test asserts `dial > 65` and `dial < 70`. No changes to this test in the diff (only docstring trimmed). |
| R-03 | `test_dial_age_is_none_when_no_treatment_stays_above_threshold` still passes | PASS | Test at line 631 uses `egfr_entered=48.0` (well above threshold); the new guard does not fire; `return None` path exercised as before. |

---

## Checklist: API Contract & Frontend Compatibility

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| AC-01 | `DialAges` model types all four keys as `Optional[float]` — `float(current_age)` return is valid | PASS | `backend/main.py` lines 485-489: `DialAges(BaseModel)` with `no_treatment: Optional[float] = None`, `bun_18_24: Optional[float] = None`, `bun_13_17: Optional[float] = None`, `bun_12: Optional[float] = None`. The new `float(current_age)` return satisfies `Optional[float]`. |
| AC-02 | Frontend already handles non-None `dial_age` values — no frontend changes needed | PASS | `ResultsView.tsx` line 76-78: `formatDialysisFooter` returns `"Dialysis: Not projected"` for `null` and `Dialysis: ~age ${Math.round(dialysisAge)} yr` for a numeric value. `EgfrChart.tsx` line 1279: `traj.dialysisAge !== null ? \`~age ${Math.round(traj.dialysisAge)} yr\`` — both paths handle a numeric `float(current_age)` correctly. No frontend files changed in this PR. |

---

## CI Results

| Check | Status | Notes |
|-------|--------|-------|
| CodeRabbit | PASS | No findings |
| Vercel | PASS | Deployment completed |
| Copilot | Not attached | Consistent with recent PR pattern; no blocking reviews |

---

## Scope Containment

This PR is strictly backend-only. Two files changed:
- `backend/prediction/engine.py` — +10 lines (guard + docstring expansion), 0 lines of existing logic altered
- `backend/tests/test_prediction_engine.py` — +57 lines (4 new test methods), 1 docstring line trimmed from an existing test

No frontend files, no config files, no API schema files, no Alembic migrations. The fix does not change the type signature of `compute_dial_age` (still `Optional[float]`) and does not alter the shape of the `DialAges` response model.

---

## Overall Readiness Assessment

| Area | Status |
|------|--------|
| Engine fix correctness | READY |
| Test coverage (new edge case) | READY |
| No regressions | READY |
| API contract compatibility | READY |
| Frontend compatibility | READY |

**Recommendation:** Merge. No conditions, no nits.
