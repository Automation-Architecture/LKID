# Sprint 2 End-to-End QA Test Plan

**Reviewer:** Yuri (QA)
**Date:** 2026-03-27
**Branch:** `main` (post-merge of PRs #12--#21)
**Scope:** Comprehensive E2E test plan for Sprint 2 close
**Workflow:** SOP 2c (Sprint-Level QA Pass) + SOP 2f (Contract Testing) + SOP 2d (Accessibility)

---

## Executive Summary

Sprint 2 closed with 11 PRs merged in a single chaotic session. The merge post-mortem identified 6 failure modes, including worktree collisions, cross-boundary range divergence, a stale branch rebase (PR #15), and a full PR rebuild (#19 to #21). An engineering meeting produced a binding validation range table that all layers must conform to.

This test plan defines the verification strategy to confirm main is stable post-merge. It covers post-merge integration checks, 5 critical user journeys, regression tests targeting merge-specific risks, and a risk assessment for Sprint 3 readiness. This is the plan -- execution happens next.

---

## 1. Post-Merge Integration Verification

These tests directly target the 6 failure modes documented in `agents/luca/drafts/sprint2-merge-postmortem.md`.

### PMV-01: Worktree Collision Artifacts

**Risk:** Three agents (Harshit, John Donaldson, Gay Mark) worked in the same directory simultaneously before worktree isolation was adopted. Partial merges or stale conflict markers may remain.

**Test:**
1. Run `git log --oneline --all --graph` on the LKID repo and confirm main has a clean linear or merge-commit history with no orphaned branches.
2. Run `grep -rn "<<<<<<< " backend/ app/` across the codebase to detect any leftover conflict markers.
3. Run `grep -rn "=======" backend/ app/ --include="*.py" --include="*.ts" --include="*.tsx"` to catch mid-conflict markers (exclude legitimate uses in markdown/comments).
4. Verify no `.orig`, `.BACKUP`, `.BASE`, `.LOCAL`, `.REMOTE` files exist in the repo.

**Pass criteria:** Zero conflict markers. Zero merge artifact files. Clean commit graph.

**Approach:** Manual CLI inspection. No skill invocation needed.
**Environment:** Local clone of LKID repo, main branch.

---

### PMV-02: Range Alignment -- Binding Validation Table

**Risk:** Creatinine validation ranges diverged across 4 layers (frontend, Pydantic, DB CHECK, fixtures). The engineering meeting produced a binding table. All layers must now match.

**Binding table (from `agents/luca/drafts/backend-meeting-memo.md`):**

| Field | Frontend (validation.ts) | Pydantic (main.py) | DB CHECK |
|-------|--------------------------|---------------------|----------|
| **BUN** | 5--100 (soft cap + warning) | 5--150 | 5--150 |
| **Creatinine** | 0.3--20.0 | 0.3--20.0 | 0.3--20.0 |
| **Potassium** | 2.0--8.0 | 2.0--8.0 | -- |
| **Age** | 18--120 | 18--120 | 18--120 |
| **Hemoglobin** | 4.0--20.0 | 4.0--20.0 | -- |
| **Glucose** | 40--500 | 40--500 | -- |

**Test:**
1. Open `app/src/lib/validation.ts` and extract min/max for every field. Compare against the table above.
2. Open `backend/main.py` and extract `Field(ge=..., le=...)` for every field in `PredictRequest`. Compare against the table.
3. Run `alembic history` and read the latest migration to confirm `creatinine BETWEEN 0.3 AND 20.0` in the DB CHECK.
4. Open `backend/tests/fixtures/factories.py` and verify `make_predict_request_at_min()` and `make_predict_request_at_max()` use values matching the binding table.
5. Verify BUN has a two-tier system: frontend soft cap at 100 (warning), Pydantic/DB hard cap at 150.

**Pass criteria:** All 6 fields match the binding table across all 4 layers. Zero divergence.

**Approach:** Manual file inspection + `/python-testing-patterns` for fixture validation.
**Environment:** Local codebase.

---

### PMV-03: PR #15 Rebase Integrity (Leads Write)

**Risk:** PR #15 was branched from stale main. It was rebased mid-session (commit `80dadf3`). The rebase needed to preserve the lead-write logic while picking up the current `PredictRequest` model with all 7 fields.

**Test:**
1. Verify `backend/main.py` contains the `_extract_email_from_jwt()` function.
2. Confirm `_extract_email_from_jwt()` has the 3-segment JWT guard: `parts = token.split("."); if len(parts) != 3: return None` (or equivalent).
3. Confirm `predict()` endpoint calls `predict_for_endpoint()` (not the old `run_prediction()` with 3 args).
4. Confirm `PredictRequest` has all 7 fields: `bun`, `creatinine`, `potassium`, `age`, `sex`, `hemoglobin`, `glucose`.
5. Confirm the fire-and-forget `asyncio.create_task(_write_lead(...))` is present after the prediction call.
6. Confirm the lead SQL INSERT includes at minimum: `email`, `name`, `age`, `bun`, `creatinine`, `egfr_baseline`.

**Pass criteria:** All 6 checks pass. No regression to the old 3-field model. JWT guard present.

**Approach:** Manual code inspection + `/python-testing-patterns` for backend unit tests.
**Environment:** Local codebase.

---

### PMV-04: PR #21 Rebuild Integrity (Auth Flow)

**Risk:** PR #19 had 10+ conflict markers and was abandoned. PR #21 was rebuilt from scratch. The auth flow (magic link, email pre-fill, redirect to /predict) must work end-to-end.

**Test:**
1. Verify Clerk middleware is configured in `app/src/middleware.ts` with correct public/protected route configuration.
2. Verify the sign-in page at `/auth` renders a Clerk `<SignIn>` component with `signInFallbackRedirectUrl="/predict"` (v7 prop name, not the deprecated `afterSignInUrl`).
3. Verify the prediction form at `/predict` reads the authenticated user's email from Clerk and pre-fills the email field as read-only.
4. Verify the magic link flow: `/auth` -> enter email -> Clerk sends magic link -> click link -> redirect to `/predict` with email pre-filled.
5. Verify that unauthenticated users can still access `/predict` as guests (auth is optional for prediction).

**Pass criteria:** Magic link -> redirect -> email pre-fill chain works. No references to abandoned PR #19 code. Clerk v7 prop names used throughout.

**Approach:** `/webapp-testing` + `/agent-browser` for browser-based smoke test.
**Environment:** Local dev (frontend + backend running).

---

### PMV-05: Response Shape Alignment (Frontend Mock vs Backend Actual)

**Risk:** The frontend parses `body.error.details[].message` (Decision #9 envelope), but the old code parsed `body.detail[].msg` (raw Pydantic). If the error envelope fix from PR #14 did not land, field-specific API errors fall through to generic messages.

**Test:**
1. In `app/src/app/predict/page.tsx`, verify error handling parses `body.error?.details` (not `body.detail`).
2. Verify each detail object uses `.message` (not `.msg`).
3. In `backend/main.py`, verify the error response handler wraps Pydantic `RequestValidationError` into the `{error: {code, message, details[]}}` envelope.
4. Submit an intentionally invalid request (e.g., creatinine=0.0) to `/predict` and verify the response shape matches:
   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "...",
       "details": [
         { "field": "creatinine", "message": "..." }
       ]
     }
   }
   ```
5. Verify the frontend correctly renders the field-specific error from the backend response.

**Pass criteria:** Error envelope matches Decision #9. Frontend parses it correctly. No fallthrough to generic error.

**Approach:** `/python-testing-patterns` for backend validation + `/webapp-testing` + `/agent-browser` for frontend.
**Environment:** Local dev (both services running).

---

## 2. Critical User Journeys (E2E)

These are the release-critical paths that must work on main. Each journey maps to test strategy Section 5 journeys.

### CUJ-01: First-Time Guest Prediction

**Scope:** An unauthenticated user submits a prediction and sees results.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/` | Landing page loads. Nav contains link to "Check Your Kidneys" or equivalent CTA. |
| 2 | Click CTA to navigate to `/predict` | Prediction form loads with 5 required fields (BUN, creatinine, potassium, age, sex) and 2 optional (hemoglobin, glucose in collapsible Tier 2 section). |
| 3 | Fill required fields: BUN=25, creatinine=1.2, potassium=4.5, age=65, sex=male | All fields accept input. No validation errors. |
| 4 | Submit form | `POST /predict` fires. Response returns 200 with prediction result including `egfr_current`, `risk_level`, `confidence_tier`. |
| 5 | Verify sessionStorage | `sessionStorage.getItem("prediction_result")` contains the JSON response. |
| 6 | Verify redirect | Browser navigates to `/results`. |
| 7 | Verify results page | Results page renders with at minimum the eGFR value and risk level. Chart may be placeholder -- that is acceptable for Sprint 2. |

**Pass criteria:** Steps 1-7 complete without errors. HTTP 200 from `/predict`. sessionStorage populated. Redirect occurs. Results page renders data.

**Approach:** `/e2e-testing-patterns` + `/agent-browser` for automated Playwright test.
**Environment:** Local dev. Backend must be running at `localhost:8000`, frontend at `localhost:3000`.

---

### CUJ-02: Magic Link Auth Flow

**Scope:** User authenticates via Clerk magic link, then submits a prediction with email captured.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth` | Clerk sign-in component renders. Email input visible. |
| 2 | Enter email: `test@kidneyhood.com` | Email accepted. "Send magic link" or equivalent button enabled. |
| 3 | Click send | Clerk sends magic link email. UI shows "check your email" message. |
| 4 | Click magic link (from email or Clerk test mode) | Browser redirects to `/predict`. |
| 5 | Verify email field on `/predict` | Email field is pre-filled with `test@kidneyhood.com` and is read-only. |
| 6 | Fill prediction fields and submit | Prediction succeeds (HTTP 200). |
| 7 | Verify lead write | `leads` table contains a row with `email='test@kidneyhood.com'`, `bun`, `creatinine`, `age`, `egfr_baseline`. |

**Pass criteria:** Full chain from auth to lead capture completes. Email is pre-filled and read-only. Lead row exists in DB.

**Approach:** `/webapp-testing` + `/agent-browser`. Clerk test mode may be needed for magic link simulation.
**Environment:** Local dev with Clerk test keys configured. PostgreSQL running locally.

**Note:** If Clerk test mode is not configured, steps 3-4 must be tested manually. Document the gap and flag for Sprint 3 CI integration.

---

### CUJ-03: Webhook Lead Capture

**Scope:** Clerk `user.created` webhook triggers a lead upsert in the DB.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send simulated `user.created` webhook payload to `POST /webhooks/clerk` | Endpoint returns 200. |
| 2 | Verify Svix signature validation | Request without valid `svix-id`, `svix-timestamp`, `svix-signature` headers returns 401 or 400. |
| 3 | Verify lead upsert | `leads` table contains a row with the email from the webhook payload. |
| 4 | Send duplicate webhook (same email) | No error. `ON CONFLICT` handles deduplication. Row count does not increase. Lead data is updated (not duplicated). |
| 5 | Send webhook with missing email | Endpoint returns 200 (graceful handling) or 422 with clear error. Does not crash. |

**Pass criteria:** Valid webhook creates lead. Invalid signature rejected. Duplicate handled. Missing data handled gracefully.

**Approach:** `/python-testing-patterns` for pytest integration tests against the webhook endpoint using `httpx.AsyncClient`.
**Environment:** Local backend. PostgreSQL running. Svix webhook secret configured in `.env`.

---

### CUJ-04: Validation Boundary Testing

**Scope:** Verify all input fields enforce the binding validation table at every boundary.

**Creatinine boundaries:**

| Input | Frontend | Pydantic | DB CHECK | Expected |
|-------|----------|----------|----------|----------|
| 0.3 (min) | PASS | PASS | PASS | Accepted |
| 20.0 (max) | PASS | PASS | PASS | Accepted |
| 0.2 (below min) | REJECT | REJECT | REJECT | Error: "Creatinine must be between 0.3 and 20.0" |
| 20.1 (above max) | REJECT | REJECT | REJECT | Error message displayed |
| 0.29 (just below) | REJECT | REJECT | REJECT | Boundary precision check |
| 20.01 (just above) | REJECT | REJECT | REJECT | Boundary precision check |

**BUN boundaries (two-tier system):**

| Input | Frontend | Pydantic | DB CHECK | Expected |
|-------|----------|----------|----------|----------|
| 5 (min) | PASS | PASS | PASS | Accepted |
| 100 (frontend soft cap) | PASS | PASS | PASS | Accepted |
| 101 | WARNING (soft cap) | PASS | PASS | Frontend shows warning but allows submission |
| 150 (API max) | WARNING | PASS | PASS | Accepted with warning |
| 151 (above API max) | WARNING | REJECT | REJECT | API returns validation error |
| 4 (below min) | REJECT | REJECT | REJECT | Error displayed |

**Potassium boundaries:**

| Input | Frontend | Pydantic | Expected |
|-------|----------|----------|----------|
| 2.0 (min) | PASS | PASS | Accepted |
| 8.0 (max) | PASS | PASS | Accepted |
| 1.9 | REJECT | REJECT | Error displayed |
| 8.1 | REJECT | REJECT | Error displayed |

**Age boundaries:**

| Input | Frontend | Pydantic | DB CHECK | Expected |
|-------|----------|----------|----------|----------|
| 18 (min) | PASS | PASS | PASS | Accepted |
| 120 (max) | PASS | PASS | PASS | Accepted |
| 17 | REJECT | REJECT | REJECT | Error displayed |
| 121 | REJECT | REJECT | REJECT | Error displayed |

**Hemoglobin boundaries:**

| Input | Frontend | Pydantic | Expected |
|-------|----------|----------|----------|
| 4.0 (min) | PASS | PASS | Accepted |
| 20.0 (max) | PASS | PASS | Accepted |
| 3.9 | REJECT | REJECT | Error displayed |
| 20.1 | REJECT | REJECT | Error displayed |

**Glucose boundaries:**

| Input | Frontend | Pydantic | Expected |
|-------|----------|----------|----------|
| 40 (min) | PASS | PASS | Accepted |
| 500 (max) | PASS | PASS | Accepted |
| 39 | REJECT | REJECT | Error displayed |
| 501 | REJECT | REJECT | Error displayed |

**Error envelope check:** For every rejected submission, verify the error response uses the Decision #9 envelope:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "...", "message": "..." }] } }
```

**Pass criteria:** Every cell in the tables above matches expected behavior. Zero range divergence between layers.

**Approach:** `/python-testing-patterns` for backend boundary tests (parametrized pytest). `/javascript-testing-patterns` for frontend validation tests (Vitest). `/agent-browser` for integrated browser boundary tests.
**Environment:** Local dev (all services running) for integrated tests. Unit tests run standalone.

---

### CUJ-05: Cross-Boundary Data Integrity

**Scope:** Verify that a prediction submitted through the form results in both a prediction response AND a lead row in the database, and that failure in one does not break the other.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit prediction with valid data + authenticated email | Prediction returns 200 with result. |
| 2 | Query `leads` table for the email | Row exists with correct `bun`, `creatinine`, `age`, `egfr_baseline`. |
| 3 | Verify `egfr_baseline` matches the `egfr_current` from the prediction response | Values match (the lead captures the computed eGFR). |
| 4 | Simulate DB down (stop PostgreSQL) | Prediction still returns 200. Lead write fails silently. |
| 5 | Restart PostgreSQL and submit again | Both prediction and lead write succeed. |
| 6 | Submit creatinine=0.3 (exact minimum) | Passes Pydantic. Passes DB CHECK. Lead written. |
| 7 | Submit creatinine=20.0 (exact maximum) | Passes Pydantic. Passes DB CHECK. Lead written. |

**Pass criteria:** Prediction never blocked by DB failure. Lead written when DB is available. Boundary values pass all layers.

**Approach:** `/python-testing-patterns` for backend integration tests. `/systematic-debugging` if fire-and-forget silently drops leads.
**Environment:** Local dev. PostgreSQL controllable (can stop/start).

---

## 3. Regression Checks (Post-Merge Specific)

These tests specifically target code-level regressions that the chaotic merge session could have introduced.

### REG-01: predict_for_endpoint() Is the Active Prediction Function

**Check:** `backend/main.py` `/predict` handler calls `predict_for_endpoint()` with all 7 arguments (bun, creatinine, potassium, age, sex, hemoglobin, glucose).

**Fail if:** The handler calls `run_prediction()` with 3 arguments (the old stale-branch signature from PR #15's original base).

**How to verify:** `grep -n "predict_for_endpoint\|run_prediction" backend/main.py` -- only `predict_for_endpoint` should appear in the endpoint handler.

---

### REG-02: PredictRequest Has All 7 Fields

**Check:** The `PredictRequest` Pydantic model in `backend/main.py` includes:
- `bun: float` (required)
- `creatinine: float` (required)
- `potassium: float` (required)
- `age: int` (required)
- `sex: str` (required)
- `hemoglobin: Optional[float]`
- `glucose: Optional[float]`

**Fail if:** Any of `potassium`, `sex`, `hemoglobin`, or `glucose` are missing (stale branch regression).

---

### REG-03: Error Envelope Format

**Check:** Validation errors return `{"error": {"code": "VALIDATION_ERROR", "message": "...", "details": [{"field": "...", "message": "..."}]}}`.

**Fail if:** Raw Pydantic errors leak as `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`.

**How to verify:** `curl -X POST localhost:8000/predict -H "Content-Type: application/json" -d '{"bun": -1}'` and inspect the response shape.

---

### REG-04: Clerk v7 Prop Names

**Check:** All Clerk components use v7 prop names:
- `signInFallbackRedirectUrl` (not `afterSignInUrl`)
- `signUpFallbackRedirectUrl` (not `afterSignUpUrl`)

**Fail if:** Deprecated v6 prop names are present anywhere in `app/src/`.

**How to verify:** `grep -rn "afterSignInUrl\|afterSignUpUrl" app/src/` -- must return zero results.

---

### REG-05: Tier 2 Field Logic

**Check:** When only ONE of hemoglobin/glucose is provided, the form drops both from the payload (per Decision #12: both must be present for Tier 2 upgrade).

**Fail if:** A single Tier 2 field is sent to the API, causing an unexpected confidence_tier assignment.

**How to verify:** Submit form with hemoglobin=12.0 and glucose empty. Inspect the POST body in Network tab -- hemoglobin should NOT be in the payload.

---

### REG-06: Fixture Factory Deduplication

**Check:** `backend/tests/fixtures/factories.py` uses `make_*` naming convention (from PR #16, the canonical fixture library).

**Fail if:** Duplicate `create_*` factories from PR #17 overwrite the canonical library. Both naming conventions should not coexist.

**How to verify:** `grep -n "def make_\|def create_" backend/tests/fixtures/factories.py` -- only `make_*` should appear.

---

### REG-07: Lead Write SQL Column Names

**Check:** The `_write_lead()` function's INSERT statement uses column names that match Gay Mark's `leads` table schema: `email`, `name`, `age`, `bun`, `creatinine`, `egfr_baseline`.

**Fail if:** Column names from a stale version of the schema are used (e.g., `egfr` instead of `egfr_baseline`).

---

## 4. Test Execution Approach

### Execution Matrix

| Test ID | Type | Skill(s) | Environment | Automated? |
|---------|------|----------|-------------|------------|
| **PMV-01** | Code inspection | None (CLI) | Local repo | Manual |
| **PMV-02** | Code inspection | `/python-testing-patterns` | Local repo | Semi-auto (write parametrized test) |
| **PMV-03** | Code inspection | `/python-testing-patterns` | Local repo | Manual + unit test |
| **PMV-04** | Smoke test | `/webapp-testing` + `/agent-browser` | Local dev | Manual |
| **PMV-05** | Integration test | `/python-testing-patterns` + `/agent-browser` | Local dev | Semi-auto |
| **CUJ-01** | E2E | `/e2e-testing-patterns` + `/agent-browser` | Local dev | Automated (Playwright) |
| **CUJ-02** | E2E | `/webapp-testing` + `/agent-browser` | Local dev + Clerk | Manual (Clerk dependency) |
| **CUJ-03** | Integration | `/python-testing-patterns` | Local backend + DB | Automated (pytest) |
| **CUJ-04** | Boundary | `/python-testing-patterns` + `/javascript-testing-patterns` | Local dev | Automated (parametrized) |
| **CUJ-05** | Integration | `/python-testing-patterns` + `/systematic-debugging` | Local dev + DB | Semi-auto |
| **REG-01 to REG-07** | Code inspection | None | Local repo | Manual (one-time grep) |

### Execution Priority Order

Run in this order. Stop and escalate if any HIGH-severity failure is found.

1. **REG-01 through REG-07** (10 minutes) -- Quick grep/inspection. Catches merge regressions immediately.
2. **PMV-01** (5 minutes) -- Conflict marker scan. Non-negotiable.
3. **PMV-02** (15 minutes) -- Range alignment audit. The single most important check given the merge history.
4. **PMV-03** (10 minutes) -- Leads write rebase verification.
5. **PMV-05** (15 minutes) -- Error envelope shape.
6. **CUJ-04** (30 minutes) -- Boundary tests. Write parametrized tests, run them.
7. **CUJ-01** (20 minutes) -- Guest prediction E2E.
8. **CUJ-03** (20 minutes) -- Webhook integration.
9. **PMV-04** (20 minutes) -- Auth flow smoke test.
10. **CUJ-02** (30 minutes) -- Magic link full flow.
11. **CUJ-05** (20 minutes) -- Cross-boundary data integrity.

**Total estimated time:** ~3.5 hours for the full plan.

### Pass/Fail Decision Framework

| Severity | Action |
|----------|--------|
| Any PMV check fails | STOP. Escalate to Luca. Main is unstable. |
| Any CUJ fails on happy path | HIGH finding. Block Sprint 3 start until resolved. |
| CUJ boundary test fails at exact min/max | HIGH finding. Range misalignment persists. |
| CUJ boundary test fails at edge (e.g., 0.29 vs 0.3) | MEDIUM finding. Document, fix in Sprint 3 week 1. |
| REG check fails | HIGH finding. Merge regression confirmed. Hotfix required. |

---

## 5. Risk Assessment

### Risk #1: Range Alignment Was Fixed Under Pressure (HIGHEST RISK)

**What happened:** The binding validation table was produced in a live engineering meeting during a chaotic merge session. Fixes were applied to 3 PRs and a DB migration simultaneously. The probability that one layer was missed or a fix was overwritten by a subsequent merge is non-trivial.

**Why it matters:** A range mismatch between Pydantic and DB CHECK causes silent lead loss -- the prediction succeeds but the lead INSERT fails in the fire-and-forget task. The user never knows. Marketing never gets the email.

**Test first Monday morning:** PMV-02 (range alignment audit). Extract actual values from all 4 layers (validation.ts, main.py PredictRequest, latest Alembic migration, factories.py) and diff them against the binding table. This is a 15-minute check that catches the highest-impact bug.

### Risk #2: PR #21 Rebuild May Have Incomplete Auth Logic

**What happened:** PR #19 was destroyed and rebuilt as PR #21 from scratch. "From scratch" means the auth flow code was rewritten, not ported. There is no guarantee the rebuilt version has feature parity with what was originally planned.

**Why it matters:** The magic link -> email pre-fill -> lead capture chain is the core monetization path. If any step is broken, leads are not captured.

**Test first Monday morning:** PMV-04 (auth flow smoke test). Start the app, walk the magic link flow manually, and verify the email lands in the predict form and the lead lands in the DB. Takes 20 minutes with Clerk test mode.

### Risk #3: Error Envelope Parsing May Still Be Wrong

**What happened:** PR #14 finding PR14-04 identified that the frontend parsed `body.detail[].msg` instead of `body.error.details[].message`. A fix was requested but it landed during the merge rush (commit `71a6455`). The fix may be incomplete or may have been overwritten by subsequent merges.

**Why it matters:** If the frontend cannot parse backend validation errors, every invalid submission shows a generic "Something went wrong" instead of field-specific guidance. For a 60+ demographic entering medical lab values, clear error messages are not a nice-to-have -- they are essential for correct data entry.

**Test first Monday morning:** PMV-05 (response shape alignment). Submit an intentionally invalid request and verify the frontend renders the field-specific error. Takes 10 minutes.

### Monday Morning Priority Order

1. PMV-02 -- Range alignment (15 min)
2. PMV-05 -- Error envelope (10 min)
3. PMV-04 -- Auth flow (20 min)
4. REG-01 through REG-07 -- Quick regression scan (10 min)

If all four pass, main is stable enough to start Sprint 3 work. If any fail, hotfix before starting new feature branches.

---

## Appendix A: Reference Documents

| Document | Path | Relevance |
|----------|------|-----------|
| Merge post-mortem | `agents/luca/drafts/sprint2-merge-postmortem.md` | 6 failure modes driving PMV tests |
| Binding validation table | `agents/luca/drafts/backend-meeting-memo.md` | Authoritative ranges for CUJ-04 |
| Batch QA report (PRs #14-17) | `agents/yuri/drafts/qa-batch-prs-14-17.md` | Pre-merge findings that should now be resolved |
| QA Testing SOP | `docs/qa-testing-sop.md` | Workflow and gate criteria |
| Test strategy | `agents/yuri/drafts/test_strategy.md` | Test pyramid and framework reference |

## Appendix B: Binding Validation Range Quick-Reference

Copied from `backend-meeting-memo.md` for test execution convenience. **This is a copy -- the memo is the source of truth.**

| Field | Frontend | Pydantic | DB CHECK |
|-------|----------|----------|----------|
| BUN | 5--100 (soft) / 150 (hard) | 5--150 | 5--150 |
| Creatinine | 0.3--20.0 | 0.3--20.0 | 0.3--20.0 |
| Potassium | 2.0--8.0 | 2.0--8.0 | -- |
| Age | 18--120 | 18--120 | 18--120 |
| Hemoglobin | 4.0--20.0 | 4.0--20.0 | -- |
| Glucose | 40--500 | 40--500 | -- |

**Note:** Creatinine max=20.0 flagged for Lee confirmation (Q6 on LKID-14) before Sprint 3 prod release.

---

*Test plan authored by Yuri (QA Engineer) -- Sprint 2 Close, 2026-03-27*
