# Sprint 2 Debacle QA Report — Post-Merge Verification

**Reviewer:** Yuri (QA)
**Date:** 2026-03-27
**Branch:** `main` (post-merge of PRs #12–#21)
**Scope:** Full cross-boundary verification of Sprint 2 merged code, focusing on corrective actions from the merge post-mortem and all code touched during the debacle.

---

## Executive Summary

**Verdict: FAIL**

This QA pass reveals **4 HIGH-severity bugs** that would cause runtime failures or data corruption in production, plus **3 MEDIUM-severity issues** that degrade test reliability or introduce future risk. The most critical findings are: (1) the Alembic migration chain is branched and will not run, (2) the Pydantic creatinine max is still 15.0 despite the binding table requiring 20.0, (3) the webhook endpoint will crash with a `TypeError` due to a function signature mismatch, and (4) the backend test suite cannot import its own fixtures due to a `create_*` vs `make_*` naming mismatch. None of these were caught during the merge session because tests were not run against the final merged state.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Cross-Boundary Range Verification (CA-3) | 6 fields | 4 | 2 | 0 |
| Alembic Migration Chain | 3 migrations | 1 | 2 | 0 |
| Webhook Integration (LKID-9) | 1 endpoint | 0 | 1 | 0 |
| Test Suite Health | 3 files | 0 | 1 | 2 |
| PR #21 Rebuild Integrity | 4 checks | 4 | 0 | 0 |
| PredictRequest Model (CA-5) | 1 model | 1 | 0 | 0 |
| Frontend Code Quality | 5 checks | 4 | 0 | 1 |
| Backend Code Quality | 4 checks | 3 | 0 | 1 |
| **Totals** | **27** | **17** | **6** | **4** |

---

## 1. Cross-Boundary Range Verification (CA-3)

Reference: Binding validation range table in `agents/luca/drafts/backend-meeting-memo.md`.

### RV-01 — Creatinine: Pydantic model diverges from binding table — FAIL [HIGH]

The binding table specifies creatinine range **0.3–20.0** across all layers. The actual state:

| Layer | Min | Max | Status |
|-------|-----|-----|--------|
| Frontend (`app/src/lib/validation.ts` line 23) | 0.3 | 20.0 | CORRECT |
| Pydantic (`backend/main.py` line 306) | 0.3 | **15.0** | **WRONG** |
| DB CHECK (migration 001 + 003) | 0.3 | 20.0 | CORRECT (if 003 applied) |
| Test fixtures (`backend/tests/fixtures/factories.py` line 250) | 0.3 | **15.0** | **WRONG** |
| Frontend fixtures (`app/src/test/fixtures/factories.ts` line 233) | 0.3 | 20.0 | CORRECT |

**Impact:** The backend Pydantic model (`PredictRequest.creatinine`, `backend/main.py` line 306: `le=15.0`) will reject creatinine values between 15.01 and 20.0 with a 422 error, even though the frontend allows them and the DB accepts them. The test fixture `create_lead()` generates creatinine up to 15.0 only, missing the new range.

**Fix:**
1. `backend/main.py` line 306: Change `le=15.0` to `le=20.0`.
2. `backend/tests/fixtures/factories.py` line 250: Change `random.uniform(0.3, 15.0)` to `random.uniform(0.3, 20.0)`.

### RV-02 — BUN: Frontend soft cap vs Pydantic/DB — PASS

| Layer | Min | Max | Status |
|-------|-----|-----|--------|
| Frontend (validation.ts line 22) | 5 | 100 (soft cap) | CORRECT per memo |
| Pydantic (main.py line 303) | 5 | 150 | CORRECT |
| DB CHECK (migration 001 line 32) | 5 | 150 | CORRECT |

Frontend soft cap at 100 with Pydantic/DB at 150 is documented and intentional per the binding table. **PASS.**

### RV-03 — Potassium: All layers aligned — PASS

| Layer | Min | Max |
|-------|-----|-----|
| Frontend (validation.ts line 24) | 2.0 | 8.0 |
| Pydantic (main.py lines 308-309) | 2.0 | 8.0 |
| DB CHECK | N/A (not stored in leads) |

**PASS.**

### RV-04 — Age: All layers aligned — PASS

| Layer | Min | Max |
|-------|-----|-----|
| Frontend (validation.ts line 25) | 18 | 120 |
| Pydantic (main.py line 311) | 18 | 120 |
| DB CHECK (migration 001 line 31) | 18 | 120 |

**PASS.**

### RV-05 — Hemoglobin: All layers aligned — PASS

| Layer | Min | Max |
|-------|-----|-----|
| Frontend (validation.ts line 31) | 4.0 | 20.0 |
| Pydantic (main.py lines 315-316) | 4.0 | 20.0 |

**PASS.**

### RV-06 — Glucose: All layers aligned — PASS

| Layer | Min | Max |
|-------|-----|-----|
| Frontend (validation.ts line 32) | 40 | 500 |
| Pydantic (main.py lines 318-319) | 40 | 500 |

**PASS.**

---

## 2. Alembic Migration Chain

### MG-01 — Branched migration chain: 002 and 003 both descend from 001 — FAIL [HIGH]

`backend/alembic/versions/002_webhook_lead_columns.py` line 23: `down_revision = "001"`
`backend/alembic/versions/003_widen_creatinine_max.py` line 13: `down_revision = "001"`

Both migrations declare `down_revision = "001"`, creating a branched Alembic history with two heads. Running `alembic upgrade head` will fail with:

```
ERROR: Multiple head revisions are present; please specify a specific target or use --head-only
```

**Impact:** The database cannot be migrated in any fresh environment. CI pipeline, new developer onboarding, and staging redeployments are all blocked.

**Fix:** Change `003_widen_creatinine_max.py` line 13 from `down_revision = "001"` to `down_revision = "002"`. This makes the chain linear: 001 -> 002 -> 003.

### MG-02 — Migration 002 resets creatinine CHECK to 15.0 — FAIL [HIGH]

Migration 002 (`002_webhook_lead_columns.py` line 55-59) recreates `ck_leads_creatinine_range` with:
```python
"creatinine IS NULL OR (creatinine >= 0.3 AND creatinine <= 15.0)"
```

Migration 003 (`003_widen_creatinine_max.py`) sets it to 20.0. But since both branch from 001, if the branching issue is resolved by making 003 depend on 002, the final constraint will correctly be 20.0. If however someone manually runs the migrations out of order (or if the branching is resolved in the wrong direction), the constraint will be 15.0.

**Impact:** Even after fixing MG-01, migration 002 leaves an intermediate state where creatinine max is 15.0. This is only a problem if migration 003 is lost or not applied.

**Fix:** After fixing MG-01 (making 003 depend on 002), verify that `alembic upgrade head` applies 001 -> 002 -> 003 and the final CHECK constraint is `creatinine <= 20.0`.

### MG-03 — Migration 001 initial state — PASS

Migration 001 creates the leads table with correct initial constraints (age 18-120, BUN 5-150, creatinine 0.3-15.0). The creatinine max of 15.0 was the pre-meeting value and is correctly updated by migration 003. **PASS.**

---

## 3. Webhook Integration (LKID-9)

### WH-01 — insert_lead_from_webhook() call signature mismatch — FAIL [HIGH]

`backend/main.py` lines 535-539:
```python
await insert_lead_from_webhook(
    session_factory=async_session,
    email=email,
    name=name or "Unknown",
    clerk_user_id=clerk_user_id,
)
```

`backend/db/leads.py` lines 26-30:
```python
async def insert_lead_from_webhook(
    email: str,
    name: Optional[str] = None,
    clerk_user_id: Optional[str] = None,
) -> bool:
```

The caller passes `session_factory` as a keyword argument, but the function does not accept this parameter. At runtime, this will raise `TypeError: insert_lead_from_webhook() got an unexpected keyword argument 'session_factory'`.

The function internally calls `get_session_factory()` from `db.connection` to get its own session factory, so the parameter is unnecessary.

**Impact:** Every Clerk `user.created` webhook will fail with a 500 error. No leads will be captured from sign-ups.

**Fix:** In `backend/main.py` line 535, remove the `session_factory=async_session` argument:
```python
await insert_lead_from_webhook(
    email=email,
    name=name or "Unknown",
    clerk_user_id=clerk_user_id,
)
```

---

## 4. Test Suite Health

### TS-01 — Backend conftest.py and validate_fixtures.py import nonexistent functions — FAIL [HIGH]

`backend/tests/conftest.py` imports:
```python
from tests.fixtures.factories import (
    make_lab_entry, make_lab_entry_at_max, make_lab_entry_at_min,
    make_lead, make_predict_request, make_predict_request_at_max,
    make_predict_request_at_min, make_tier1_entry, make_tier2_entry,
)
```

`backend/tests/validate_fixtures.py` imports the same `make_*` functions plus `make_lab_entry_invalid`.

But `backend/tests/fixtures/factories.py` defines only `create_*` functions:
- `create_predict_request()`
- `create_predict_request_for_stage()`
- `create_predict_request_boundary()`
- `create_lab_entry()`
- `create_lab_entry_series()`
- `create_lead()`

None of the `make_*` names exist. The conftest also references `make_lab_entry_at_max`, `make_lab_entry_at_min`, `make_tier1_entry`, `make_tier2_entry`, and `make_lab_entry_invalid` -- functions that do not exist under any name in the factories module.

**Impact:** Running `pytest` will fail immediately with `ImportError`. The entire backend test suite is non-functional. Running `python backend/tests/validate_fixtures.py` will also fail.

**Fix:** Either:
1. Rename functions in `factories.py` from `create_*` to `make_*` and add the missing boundary/tier/invalid factory functions, OR
2. Update `conftest.py` and `validate_fixtures.py` to import the actual `create_*` functions and remove references to nonexistent factories.

Option 1 is preferred because `conftest.py` references a richer factory API (boundary helpers, tier helpers, invalid helpers) that the current `factories.py` lacks. These need to be implemented.

### TS-02 — generate_test_data.py uses correct import names — NOTE

`backend/tests/load/generate_test_data.py` correctly imports `create_*` functions from `tests.fixtures.factories`. This is the only test file with working imports. This suggests the `create_*` naming is the actual convention in `factories.py`, and the `conftest.py`/`validate_fixtures.py` files were written against a planned API that was never implemented.

### TS-03 — Frontend test fixtures are well-structured — NOTE

`app/src/test/fixtures/factories.ts` provides `makePredictRequest()`, `makePredictRequestAtMin()`, `makePredictRequestAtMax()`, `makePredictRequestInvalid()`, `makeTier1Request()`, `makeTier2Request()`. These use `make*` naming and include all the boundary/tier helpers. This appears to be the intended API that the backend `conftest.py` was modeled after, but the backend `factories.py` was never updated to match.

---

## 5. PR #21 Rebuild Integrity (LKID-7, 17, 18)

### PR21-01 — No conflict markers in production code — PASS

Searched all files in `backend/` and `app/src/` for `<<<<<<<`, `>>>>>>>`, `=======` patterns. Zero matches in production code. Conflict markers exist only in agent draft files (expected).

### PR21-02 — Magic link auth flow (LKID-17) — PASS

`app/src/app/auth/page.tsx` implements a complete magic link flow:
- `EmailEntryView`: Clerk `signIn.create()` + `prepareFirstFactor()` with `email_link` strategy
- `MagicLinkSentView`: Masked email display, 60-second resend cooldown, Gmail/Outlook deep links
- `ExpiredLinkView`: Handles `?error=expired` query param
- Proper error handling, loading states, accessibility attributes

### PR21-03 — Email pre-fill from Clerk session (LKID-17) — PASS

`app/src/app/predict/page.tsx` lines 157-162:
```tsx
useEffect(() => {
    if (isSignedIn && clerkEmail) {
      setValues((prev) => ({ ...prev, email: clerkEmail }));
    }
}, [isSignedIn, clerkEmail]);
```
Email field is `readOnly` when signed in (line 404), with visual feedback ("Pre-filled from your account."). **Correct implementation.**

### PR21-04 — API integration with JWT auth (LKID-18) — PASS

`app/src/app/predict/page.tsx` lines 265-279:
- Gets JWT token via `getToken()` from Clerk
- Sets `Authorization: Bearer {token}` header
- 30-second timeout via `AbortController`
- Parses error envelope per Decision #9: `body.error.details[].message`
- Stores result in `sessionStorage` and navigates to `/results`

**Correct implementation matching the API contract.**

---

## 6. PredictRequest Model Integrity (CA-5)

### PR-01 — PredictRequest has all expected fields with correct types — PASS

`backend/main.py` lines 295-329 define `PredictRequest` with:
- `bun: float` (ge=5, le=150)
- `creatinine: float` (ge=0.3, le=15.0) — **wrong max, see RV-01**
- `potassium: float` (ge=2.0, le=8.0)
- `age: int` (ge=18, le=120)
- `sex: Literal["male", "female", "unknown"]`
- `hemoglobin: Optional[float]` (ge=4.0, le=20.0)
- `glucose: Optional[float]` (ge=40, le=500)
- `name: Optional[str]` (max_length=200)
- `email: Optional[EmailStr]`

The model has all required and optional fields. The stale-branch regression that nearly lost fields (CA-5 from post-mortem) did not survive into the final merge. **PASS** (except for the creatinine max, filed separately as RV-01).

---

## 7. Frontend Code Quality

### FE-01 — Accessibility: data-testid attributes present — PASS

All interactive elements in `predict/page.tsx` and `auth/page.tsx` have `data-testid` attributes: `predict-heading`, `prediction-form`, `error-summary`, `api-error`, `field-email`, `input-email`, `field-{id}`, `input-{id}`, `error-{id}`, `tier2-section`, `tier2-toggle`, `tier2-fields`, `submit-button`, `send-magic-link`, `clerk-error`, `error-email`.

### FE-02 — Accessibility: aria attributes — PASS

- Error fields: `aria-invalid="true"`, `aria-describedby` pointing to error messages
- Sex radio group: `role="radiogroup"`, `aria-labelledby`, `aria-required`
- Error summary: `role="alert"`, `aria-live="assertive"`
- Screen reader announcement: `aria-live="polite"`, `sr-only` class
- Tier 2 toggle: `aria-expanded`, `aria-controls`
- Minimum touch targets: `min-h-[44px]` on interactive elements

### FE-03 — Error handling: timeout and network errors — PASS

`predict/page.tsx` handles AbortError (timeout), JSON parse failures, and generic network errors with user-friendly messages.

### FE-04 — MSW handler response shape matches API contract — PASS

`app/src/mocks/handlers.ts` returns a response with `egfr_baseline`, `confidence_tier`, `trajectories`, `time_points_months`, `dial_ages`, `dialysis_threshold`, `stat_cards` -- matching the `PredictResponse` model exactly.

### FE-05 — Results page does not use sessionStorage data — NOTE [LOW]

`app/src/app/results/page.tsx` stores `prediction_result` in `sessionStorage` (line 131) but never reads or displays the actual data. The results page shows a static chart placeholder and a mock PDF download button. This is expected for Sprint 2 (Visx chart deferred to Sprint 3, LKID-19), but should be tracked.

---

## 8. Backend Code Quality

### BE-01 — Prediction engine implementation — PASS

`backend/prediction/engine.py` implements:
- CKD-EPI 2021 race-free eGFR with sex-specific coefficients
- 4 treatment trajectories with phase 1 (exponential) and phase 2 (logarithmic) gains
- Dialysis age calculation via linear interpolation at eGFR = 12
- BUN suppression estimate
- Confidence tier logic (Decision #12)
- `predict_for_endpoint()` wrapper returning the correct response shape

Clean implementation with no leftover debug code.

### BE-02 — Error envelope (Decision #9) — PASS

`backend/main.py` implements three error handlers:
- `RateLimitExceeded` -> 429 with `RATE_LIMIT_EXCEEDED`
- `RequestValidationError` -> 422 with `VALIDATION_ERROR` and field-level details
- Generic `Exception` -> 500 with `INTERNAL_ERROR`

All follow the `{error: {code, message, details[]}}` envelope. Security: generic handler never leaks internal details.

### BE-03 — JWT email extraction has 3-segment guard — PASS

`backend/main.py` line 98-100:
```python
parts = token.split(".")
if len(parts) != 3:
    return None
```
Action item #3 from the backend meeting memo (3-segment JWT guard) is implemented.

### BE-04 — TODOs in production code — NOTE [LOW]

`backend/main.py` lines 451-452:
```
TODO (Donaldson): Wire up prediction engine.
TODO (Harshit): Wire up Playwright PDF rendering.
```
These are in the `predict_pdf` endpoint which correctly raises `501 Not Implemented`. The TODOs are appropriate for Sprint 3 work. Low severity -- just track for cleanup.

---

## Failure Summary

### HIGH Severity (4)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| RV-01 | `backend/main.py` line 306 | Pydantic creatinine max is 15.0, binding table requires 20.0 | Change `le=15.0` to `le=20.0` |
| MG-01 | `backend/alembic/versions/003_widen_creatinine_max.py` line 13 | Branched migration chain (002 and 003 both descend from 001) | Change `down_revision = "001"` to `down_revision = "002"` |
| WH-01 | `backend/main.py` lines 535-539 | Webhook calls `insert_lead_from_webhook(session_factory=...)` but function does not accept that parameter | Remove `session_factory=async_session` argument |
| TS-01 | `backend/tests/conftest.py`, `backend/tests/validate_fixtures.py` | Import `make_*` functions that do not exist in `factories.py` (which defines `create_*`) | Add missing factory functions to `factories.py` or rename existing ones |

### MEDIUM Severity (2)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| MG-02 | `backend/alembic/versions/002_webhook_lead_columns.py` lines 55-59 | Migration 002 sets creatinine CHECK to 15.0 (intermediate state) | After fixing MG-01, verify final state has 20.0 via `alembic upgrade head` |
| RV-01b | `backend/tests/fixtures/factories.py` line 250 | `create_lead()` generates creatinine up to 15.0, should be 20.0 | Change `random.uniform(0.3, 15.0)` to `random.uniform(0.3, 20.0)` |

### LOW Severity / Notes (4)

| ID | Component | Issue |
|----|-----------|-------|
| TS-02 | `backend/tests/load/generate_test_data.py` | Only test file with correct `create_*` imports — confirms naming divergence |
| TS-03 | `app/src/test/fixtures/factories.ts` | Frontend fixtures use `make*` naming and have full boundary/tier API — the model the backend was supposed to follow |
| FE-05 | `app/src/app/results/page.tsx` | Results page does not display actual prediction data (expected, Sprint 3 scope) |
| BE-04 | `backend/main.py` lines 451-452 | TODO comments in predict_pdf endpoint (expected, Sprint 3 scope) |

---

## Overall Readiness Assessment

| Area | Status | Conditions |
|------|--------|------------|
| Cross-Boundary Ranges (CA-3) | **NOT READY** | Pydantic creatinine max must be fixed (RV-01) |
| Alembic Migrations | **NOT READY** | Branched chain must be linearized (MG-01), then verified (MG-02) |
| Clerk Webhook (LKID-9) | **NOT READY** | Function signature mismatch must be fixed (WH-01) |
| Backend Test Suite | **NOT READY** | Import errors must be resolved (TS-01) |
| Auth Flow (LKID-17) | READY | Clean implementation |
| Email Pre-fill (LKID-17) | READY | Clean implementation |
| API Integration (LKID-18) | READY | Clean implementation |
| Prediction Engine (LKID-15) | READY | Engine works correctly |
| Error Handling (Decision #9) | READY | Correct envelope format |
| Frontend Accessibility | READY | Strong a11y implementation |

**Bottom line:** Four HIGH-severity bugs must be fixed before Sprint 3 can proceed. The Pydantic range mismatch (RV-01) means the creatinine fix from the engineering meeting was only partially applied. The Alembic branching (MG-01) means no fresh database can be migrated. The webhook signature mismatch (WH-01) means lead capture from Clerk sign-ups is broken. The test fixture naming divergence (TS-01) means the backend test suite cannot run at all. These are all one-line or few-line fixes, but they are blocking.
