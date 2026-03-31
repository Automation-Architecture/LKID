# Sprint 3 QA Verdicts — PR #26 and PR #27

**Date:** 2026-03-30
**Reviewer:** Yuri (QA/Test Writer)
**Scope:** Pre-merge review of two backend/frontend PRs implementing Lee's confirmations and Amendment 3

---

## PR #26 — `feat/LKID-14-lee-confirmations`

**Card:** LKID-14 (Lee confirmations)
**Files changed:** `backend/prediction/engine.py`, `backend/tests/test_prediction_engine.py`
**Commits:** 2 (initial + review fixes)

### Verdict: PASS

### What was reviewed

**Change 1: Path 4 post-Phase 2 rate from 0.5 to -0.33**

`_TIER_CONFIG["bun_12"]["post_decline"]` changed from `0.5` to `-0.33` per Lee's pilot data (n=28, R²=0.40).

Formula audit: the trajectory engine applies `peak_egfr - post_decline_rate * years_after_24`. With `post_decline_rate = -0.33`, this becomes `peak_egfr + 0.33 * years` — a net eGFR gain of 0.33 mL/min/yr post-Phase 2. The comment in code ("continue a slight eGFR gain post-Phase 2") is arithmetically correct.

Verified by running the engine with BUN ≤12 tier: eGFR at t=36 is consistently ~0.33 pts above the t=24 peak (confirmed within tolerance).

Note on `optional_modifier` interaction: `post_decline_rate = cfg["post_decline"] + optional_modifier`. Optional modifiers are always ≥ 0 (positive = additional decline burden). For a patient on the bun_12 path with all three poor markers, max modifier ≈ 1.85, so `post_decline_rate` = `−0.33 + 1.85 = 1.52` (net decline). This is clinically sensible — a very ill patient still declines even on optimal protocol. No issue.

**Change 2: `rate_P1` code comment in `_get_base_decline_rate()`**

Added clarification that the marketing app uses CKD-stage base rates as a substitute for the full 5-pillar `rate_P1` model (v2.0 Section 8), and that the clinical app must swap in the real model. Comment is accurate and properly scoped.

**Test update: `test_bun_12_post_decline`**

Assertion updated from `== 0.5` to `== -0.33`. Docstring correctly explains the negative sign semantics. Test passes.

### Test run

```
cd /Users/brad/IDE/agent-teams
python -m pytest backend/tests/test_prediction_engine.py -v --tb=short
```
Result: **116 passed, 78 xfailed, 8 xpassed** (run against `feat/LKID-structural-floor` which includes PR #27 tests; all passing).

### No blocking issues

---

## PR #27 — `feat/LKID-structural-floor`

**Card:** LKID-25 / Amendment 3 (BUN Structural Floor)
**Files changed:** `backend/prediction/engine.py`, `backend/main.py`, `backend/tests/test_prediction_engine.py`, `app/src/app/predict/page.tsx`, `app/src/app/results/page.tsx`, `app/src/components/chart/types.ts`, `app/src/components/chart/transform.ts`, `app/src/components/chart/index.ts`
**Commits:** 2 (initial + review fixes)
**New tests:** 16 (TestStructuralFloor class)

### Verdict: PASS WITH CONDITIONS

**Condition (must resolve before or at merge):** PR #27 must be rebased onto `main` _after_ PR #26 merges. One test will fail on the merged codebase without a rebase (see Blocking issue #1 below). This is a merge-order dependency, not a code correctness problem.

---

### Blocking issues

#### B-1: `test_bun_12_post_decline` will fail after PR #26 merges

**Location:** `backend/tests/test_prediction_engine.py`, line 1078–1079 (PR #27 branch)

```python
def test_bun_12_post_decline(self):
    """bun_12 post-Phase 2 decline = 0.5 mL/min/yr (near-normal protection)."""
    assert _TIER_CONFIG["bun_12"]["post_decline"] == 0.5
```

PR #26 changes this constant to `-0.33`. This test inherits the old value from the pre-PR-#26 codebase. When both PRs are on `main`, this assertion fails.

**Required action:** After PR #26 merges, rebase `feat/LKID-structural-floor` onto main and update this test to `== -0.33` with the correct docstring (matching PR #26's wording: "eGFR gain of 0.33/yr"). The `test_treatment_trajectory_post_phase2_decline_rate` test does NOT need updating — it reads `cfg["post_decline"]` dynamically and will pass with the new value.

---

### Non-blocking issues

#### N-1: `MOCK_PREDICT_RESPONSE` includes `bun_ratio` in `structural_floor`

**Location:** `app/src/components/chart/transform.ts`

```typescript
structural_floor: {
  structural_floor_egfr: 42.7,
  suppression_points: 4.7,
  bun_ratio: 0.47,  // extra field
},
```

The `StructuralFloor` TypeScript interface only declares `structural_floor_egfr` and `suppression_points`. TypeScript's structural typing allows extra fields on object literals assigned to compatible types, so there is no compile-time error and no runtime impact — `bun_ratio` is simply ignored by all display code. The backend Pydantic model correctly omits `bun_ratio`. However, the mock is inconsistent with the interface contract it represents.

**Recommended fix:** Remove `bun_ratio` from `MOCK_PREDICT_RESPONSE.structural_floor` in `transform.ts`. Low priority — acceptable to address in a follow-up PR or cleanup pass.

---

### What passed

**Backend correctness (Amendment 3 formula)**

Formula: `structural_floor_egfr = reported_egfr + (current_bun - 15) * conservative_ratio`

Verified spec example from `finalized-formulas.md` Section 6:
- BUN=35, eGFR=33 → BUN bracket 30–50, ratio=0.32; eGFR bracket 30–44, implied ratio=0.47; conservative=min(0.32,0.47)=0.32
- suppression_points = (35−15)×0.32 = **6.4** ✓
- structural_floor_egfr = 33 + 6.4 = **39.4** ✓ (engine returns exactly this)

**Boundary conditions**
- BUN=17.0 → `None` ✓ (spec: only display when BUN > 17)
- BUN=17.1 → non-None payload ✓
- eGFR ≥ 60 → `None` regardless of BUN (egfr_implied_ratio=0.00, conservative=0.00, suppression=0.0 → rounds to 0 → None) ✓
- eGFR 30–44 with BUN in 30–50 bracket → conservative=min(0.32,0.47)=0.32, correct ✓

**`bun_ratio` not exposed in API**
- Backend `StructuralFloor` Pydantic model: only `structural_floor_egfr` and `suppression_points` ✓
- Engine return dict: only `structural_floor_egfr` and `suppression_points` ✓
- Test `test_return_dict_does_not_contain_bun_ratio` passes ✓

**`None` returned when suppression rounds to 0**
- Engine uses `round(suppression_points)` (Python `int(round(x))`); when this equals 0, returns None
- Python 3 banker's rounding: `round(0.5) = 0`, so minimum non-None suppression returned by engine is ~0.6
- Frontend guard `suppression_points >= 0.5` is redundant but not harmful (engine never returns values between 0 and ~0.6) ✓

**Conditional rendering in frontend**
```tsx
{rawResponse.structural_floor &&
  rawResponse.structural_floor.suppression_points >= 0.5 &&
  inputBun !== null && (
  <StructuralFloorCallout ... />
)}
```
All three guards required and correct. Callout only appears when API provides the field (BUN > 17), suppression is meaningful, and the form input BUN is available.

**Frontend display text matches spec**
Spec format (finalized-formulas.md Section 6):
> "Your reported eGFR is [X]. At your current BUN of [Y], approximately [Z] points of that reading reflect BUN workload suppression, not permanent damage. Your estimated structural capacity is eGFR [X+Z]."

Implementation matches verbatim (including singular/plural for "point"/"points"). ✓

**`sessionStorage` BUN handoff**
`predict/page.tsx` writes `{ bun: Number(values.bun) }` to `prediction_inputs` on submit. `results/page.tsx` reads it in the same `useEffect` as the prediction result, with a try/catch for non-critical failure (callout simply doesn't render if BUN unavailable). Pattern is correct and safe. ✓

**API response shape**
`StructuralFloor` Pydantic model added to `main.py`; `PredictResponse.structural_floor` is `Optional[StructuralFloor]`, only populated by `predict_for_endpoint()` when engine returns a non-None value. Backward-compatible — existing clients that don't read `structural_floor` are unaffected. ✓

**TypeScript types**
`StructuralFloor` interface exported from `chart/types.ts` and re-exported via `chart/index.ts`. `PredictResponse.structural_floor` is `StructuralFloor | undefined` (optional). Type is used correctly in `results/page.tsx`. ✓

**Test suite: 16 new tests, all pass**
Full `TestStructuralFloor` class covers: None boundary, bracket ratio correctness, conservative ratio logic, suppression-zero returns None, bun_ratio exclusion, return shape, arithmetic identity, and a high-BUN/Stage-4 integration case. All 16 pass. Total suite: 116 passed, 78 xfailed, 8 xpassed.

---

## Merge Order Requirement

PR #26 must merge before PR #27. After PR #26 merges:

1. Rebase `feat/LKID-structural-floor` onto `main`
2. In `backend/tests/test_prediction_engine.py`, update `test_bun_12_post_decline`:
   - Change assertion: `== 0.5` → `== -0.33`
   - Update docstring to reflect eGFR gain semantics (match PR #26 wording)
3. Run tests to confirm all pass on rebased branch
4. Merge PR #27

No other file conflicts are expected on rebase — the structural floor code touches different functions and classes from the LKID-14 changes.

---

## Summary Table

| PR | Verdict | Blocking | Non-blocking |
|----|---------|----------|--------------|
| #26 feat/LKID-14-lee-confirmations | **PASS** | None | None |
| #27 feat/LKID-structural-floor | **PASS WITH CONDITIONS** | B-1: rebase + test update after PR #26 merges | N-1: remove `bun_ratio` from mock |

*Yuri — 2026-03-30 — Sprint 3*
