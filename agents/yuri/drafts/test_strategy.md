# KidneyHood Test Strategy & Coverage Plan

**Author:** Yuri (QA Engineer)
**Date:** 2026-03-25
**Phase:** Discovery — Step 5 (Parallel Artifact Drafting)
**Status:** DRAFT — pending team review at Meeting 2

---

## 1. Test Philosophy & Pyramid

### Distribution

```
         /   E2E    \          ~10% of tests — 8 critical user journeys
        /-----------\
       / Integration \         ~30% of tests — API contract, DB queries, auth flows
      /---------------\
     /   Unit Tests    \       ~60% of tests — components, utils, validation logic
    /___________________\
```

### Rationale

- **60% Unit Tests:** Fast feedback (<5s full suite), cheap to maintain, catch regressions in isolation. Every React component, every FastAPI endpoint handler, every validation function, every Zustand store selector gets a unit test. The patient input form alone has 15+ fields with validation ranges that demand exhaustive boundary-value testing at the unit level.
- **30% Integration Tests:** Validate cross-boundary behavior where most real bugs live: frontend-to-API communication (TanStack Query mutations against FastAPI), API-to-database round-trips (lab entry storage and retrieval), magic link auth flow end-to-end (token generation through session creation), and guest-to-account data migration. Contract tests (Schemathesis against OpenAPI spec) anchor this layer.
- **10% E2E Tests:** Cover 8 critical user journeys (Section 5). These are slow (30-60s each), brittle against UI changes, and expensive to maintain. Keep the count low but ensure every release-blocking path is covered. Playwright provides cross-browser, mobile viewport, and accessibility scanning in a single framework.

### Guiding Principles

1. **Test behavior, not implementation.** Tests assert what the user sees and what the API returns, not how the code is structured internally.
2. **Fail fast, fail loud.** A failing test blocks the PR. No exceptions without Yuri's explicit approval.
3. **Synthetic data only.** No real patient data in any test environment. Ever. This is a HIPAA requirement.
4. **Accessibility is not optional.** Every component test includes an axe-core scan. The target demographic is 60+ CKD patients.
5. **Contract-first testing.** API contract tests run before integration tests. If the contract is broken, nothing downstream matters.
6. **Every bug fix requires a regression test before merge.** No exception. The regression test must reproduce the bug (fail before fix, pass after fix) and is added to the permanent suite.

---

## 2. Testing Frameworks & Tooling

| Layer | Framework | Version Target | Rationale |
|-------|-----------|---------------|-----------|
| Frontend unit/component | Vitest + React Testing Library | Vitest 3.x, RTL 16.x | Native ESM, fast HMR, aligns with Next.js 15 App Router. RTL enforces accessible queries. |
| Frontend E2E | Playwright | 1.50+ | Cross-browser (Chromium, Firefox, WebKit), mobile viewport emulation, built-in accessibility via `@axe-core/playwright`. |
| Backend unit | pytest | 8.x | Standard for FastAPI/Python. Async support via `pytest-asyncio`. |
| Backend integration | pytest + httpx (AsyncClient) | httpx 0.28+ | FastAPI's recommended async testing approach. Full request lifecycle without running the server. |
| API contract | Schemathesis | 3.x | Auto-generates tests from OpenAPI 3.1 spec. Validates request/response schemas, status codes, and edge cases. Preferred over Dredd for OpenAPI 3.1 support. |
| Accessibility | axe-core via `@axe-core/playwright` | 4.x | Automated WCAG 2.1 AA scanning. Catches ~60% of violations. Remaining 40% requires manual screen reader testing. |
| Visual regression | Playwright screenshot comparison | Built-in | Visx outputs SVG. Baselines use true linear time x-axis (Decision #5). Pixel-stable across deployments. Baselines updated only with explicit approval. |
| Performance/load | k6 | 0.55+ | Validate prediction API response time under concurrent load. Target: POST /predict <2s p95 at 100 concurrent users. k6 chosen over Locust for scriptability and CI integration. |
| Code coverage | Istanbul (c8) for frontend, coverage.py for backend | Latest stable | Coverage reports generated per PR, posted as PR comments. |
| Mock API (dev) | MSW (Mock Service Worker) | 2.x | Harshit uses MSW for parallel frontend development. Contract tests validate that MSW mocks stay aligned with the real API. |

### Tooling Integration Notes

- **Schemathesis** runs against the OpenAPI spec published by John Donaldson at `/artifacts/api_contract.json`. It auto-generates test cases for every endpoint, including boundary values, missing fields, and malformed requests.
- **Playwright accessibility** scans run after each E2E test step. Results are accumulated and reported per test case.
- **Visual regression** baselines are stored in the repository under `/tests/visual-baselines/`. Any baseline change requires a PR with Yuri's approval.
- **k6 load tests** run nightly only (not on every PR) to avoid CI bottlenecks.

---

## 3. Coverage Thresholds

| Layer | Minimum Coverage | Blocking Level | Enforcement |
|-------|-----------------|----------------|-------------|
| Backend unit tests (FastAPI) | 90% line coverage | PR blocking | `coverage.py` with `--fail-under=90` in CI |
| Frontend unit tests (React) | 85% line coverage | PR blocking | `c8` via Vitest with threshold config |
| API contract tests | 100% of documented endpoints and error codes | PR blocking | Schemathesis validates every path+method+status combination in the OpenAPI spec |
| E2E critical paths | 100% of 8 active journeys passing (9th deferred) | Release blocking | Playwright test suite must pass all 8 active journey tests |
| Accessibility (axe-core) | 0 critical/serious violations | Release blocking | `@axe-core/playwright` with `{ impact: ['critical', 'serious'] }` filter |
| HIPAA checklist | 100% of items verified | Release blocking | Manual checklist sign-off by Yuri + Gay Mark |

### Coverage Exclusions (Documented)

- Generated code (OpenAPI client stubs, Tailwind config) is excluded from coverage metrics.
- Third-party library internals (Visx rendering engine, shadcn/ui primitives) are not unit-tested; only our wrapper components are.
- The proprietary prediction engine is black-box tested via test vectors (Decision #13). Internal calculation logic is not in our coverage scope.

---

## 4. QA Gates (Per Sprint)

Every sprint has 5 gates. Each gate is blocking: work cannot advance to the next phase without Yuri's explicit approval.

### Gate 0: Spec Review

**When:** Before sprint starts
**What I Validate:**
- Every story assigned to the sprint has testable acceptance criteria (Given/When/Then format)
- Spec gaps identified in the spec review are resolved or explicitly deferred
- Dependencies between stories are captured as Jira issue links
- Validation ranges and error messages are documented for all input fields
**Blocking?** Yes. Stories without testable AC are sent back to Husser.

### Gate 1: Contract Lock

**When:** After John publishes the API contract for the sprint's endpoints
**What I Validate:**
- Contract tests (Schemathesis) pass against mock server for all sprint endpoints
- Error envelope `{error: {code, message, details[]}}` is consistent across all endpoints (Decision #9)
- Request/response schemas match the OpenAPI spec exactly
- MSW mock handlers (Harshit's) are aligned with the published contract
**Blocking?** Yes. Frontend and backend cannot begin integration until contract tests pass.

### Gate 2: Component Review

**When:** After frontend components are built (before integration)
**What I Validate:**
- Unit tests pass for all new/modified components
- Vitest coverage meets 85% threshold for the sprint's component scope
- axe-core accessibility scan returns 0 critical/serious violations on all components
- `data-testid` attributes are present on all interactive elements (required for E2E tests)
- Visual regression baselines are established for chart components (Visx/SVG)
**Blocking?** Yes. Components with failing tests or accessibility violations are not approved for integration.

### Gate 3: Integration

**When:** After frontend-backend integration is complete
**What I Validate:**
- Integration tests pass (frontend TanStack Query mutations against live FastAPI)
- E2E critical path tests pass for all journeys affected by the sprint's changes
- Contract tests pass against the live staging API (not just mocks)
- Backend coverage meets 90% threshold for sprint scope
**Blocking?** Yes. Integration failures block the sprint from advancing to pre-release.

### Gate 4: Pre-Release

**When:** Before any deployment to production or staging
**What I Validate:**
- Full regression suite passes (all unit, integration, contract, and E2E tests)
- HIPAA checklist is 100% verified for the sprint's scope
- Manual exploratory testing completed (documented in test report)
- Visual regression baselines have no unexpected changes
- Performance benchmarks met (if applicable to sprint scope)
- Disclaimers are verbatim and visible on all viewports (mobile sticky footer, desktop inline)
**Blocking?** Yes. No deployment without Gate 4 approval.

---

## 5. Critical E2E User Journeys (9 Journeys: 8 Active + 1 Deferred)

### TC-E2E-01: First-Time Guest Prediction

**Jira:** SPEC-2, SPEC-3, SPEC-8, SPEC-10, SPEC-14, SPEC-16, SPEC-17

**Given** a new user visits the KidneyHood homepage with no existing session
**And** the prediction form is displayed with required fields: BUN, Creatinine, Potassium, Age, Sex

**When** the user enters valid required values:
- BUN: 35 mg/dL
- Creatinine: 1.8 mg/dL
- Potassium: 4.5 mEq/L
- Age: 65
- Sex: Male
**And** clicks the Submit button

**Then** the system displays:
- An eGFR trajectory chart (Visx SVG) with exactly 4 trajectory lines: "No Treatment" (#AAAAAA dashed), "BUN 18-24" (#85B7EB short-dash), "BUN 13-17" (#378ADD solid), "BUN <=12" (#1D9E75 solid heavy)
- Each line has 15 data points at intervals: 0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120 months
- A horizontal dashed red dialysis threshold line at eGFR 12
- 4 stat cards below the chart (No Treatment, BUN 18-24, BUN 13-17, BUN <=12) each showing eGFR value and delta
- A Tier 1 (Low Confidence) badge in the top-right corner of the chart
- An unlock prompt: "Add hemoglobin AND glucose to improve prediction accuracy"
- 3 verbatim legal disclaimers visible (inline on desktop)
- The submit button re-enables after results render

**And** a guest session httpOnly cookie is set with a server-side session token

### TC-E2E-02: Tier Upgrade Flow (Tier 1 to Tier 2)

**Jira:** SPEC-4, SPEC-17 (Decision #12)

**Given** a guest user has completed a Tier 1 prediction (TC-E2E-01)
**And** the chart displays a Tier 1 badge and an unlock prompt

**When** the user scrolls to the optional fields section
**And** enters Hemoglobin: 13.5 g/dL
**And** enters Glucose: 100 mg/dL
**And** clicks Submit

**Then** the chart re-renders with updated trajectories
**And** the confidence badge changes to Tier 2 (Medium Confidence)
**And** the unlock prompt is no longer displayed
**And** stat card values update to reflect the Tier 2 prediction

### TC-E2E-03: Account Creation via Magic Link

**Jira:** SPEC-19, SPEC-21 (Decision #1, Decision #4)

**Given** a guest user has completed a prediction and the chart is displayed
**And** a "Save your results" prompt appears below the chart (never before chart renders)

**When** the user clicks "Save your results"
**And** enters their email address: test-user@example.com
**And** clicks "Send Magic Link"

**Then** a confirmation screen displays: "Check your email for a magic link"
**And** a magic link email is sent to test-user@example.com

**When** the user clicks the magic link (simulated: navigate to `/auth/verify?token={valid_token}`)

**Then** the user is redirected to their account page
**And** a valid session (JWT) is created
**And** the guest prediction data has migrated to the new account
**And** the user's lab entries are visible in their account history
**And** the guest session cookie is cleared

### TC-E2E-04: Multi-Visit Entry (2 Visits then 3+ Visits)

**Jira:** SPEC-24, SPEC-26, SPEC-69

**Given** an authenticated user with one existing lab entry (visit_date: 2026-01-15)

**When** the user submits a second lab entry with visit_date: 2026-03-15
**And** required fields: BUN=30, Creatinine=1.6, Potassium=4.2, Age=65, Sex=Male
**And** optional fields: Hemoglobin=12.0, Glucose=110
**And** clicks Submit

**Then** the prediction chart renders with updated trajectories
**And** a directional tag is displayed ("Improving", "Stable", or "Declining")
**And** no slope/numeric trend value is shown (only 2 visits)
**And** the confidence badge shows Tier 2

**When** the user submits a third lab entry with visit_date: 2026-06-15
**And** required fields: BUN=25, Creatinine=1.4, Potassium=4.0, Age=65, Sex=Male
**And** optional fields: Hemoglobin=13.0, Glucose=95
**And** clicks Submit

**Then** the prediction chart renders with Tier 3 (High Confidence) badge
**And** a slope tag is displayed with a numeric trend value (e.g., "+2.1 mL/min/yr")
**And** 3 visit data points are reflected in the chart

### TC-E2E-05: PDF Download — DEFERRED to Phase 2b (Decision #2)

**Status:** Deferred. PDF export is out of MVP scope. Placeholder retained for Phase 2b planning. See Appendix B.

---

### TC-E2E-06: Error Handling (Out-of-Range Values)

**Jira:** SPEC-3, SPEC-10 (Decision #9)

**Given** a user is on the prediction form

**When** the user enters invalid values:
- BUN: -5 (below minimum 5)
- Creatinine: 20.0 (above maximum 15.0)
- Potassium: 1.0 (below minimum 2.0)
- Age: 10 (below minimum 18)
- Sex: Male

**Then** inline field-level error messages appear:
- BUN field: "BUN must be between 5 and 150 mg/dL"
- Creatinine field: "Creatinine must be between 0.3 and 15.0 mg/dL"
- Potassium field: "Potassium must be between 2.0 and 8.0 mEq/L"
- Age field: "Age must be between 18 and 120"
**And** the Submit button is disabled

**When** the user corrects all values to valid ranges:
- BUN: 35
- Creatinine: 1.8
- Potassium: 4.5
- Age: 65

**Then** all inline error messages disappear
**And** the Submit button becomes enabled

**When** the user clicks Submit

**Then** the prediction renders successfully

**Additional server-side validation test:**

**When** a crafted API request bypasses client-side validation and sends BUN: 500

**Then** the API returns HTTP 400 with error envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields failed validation",
    "details": [
      {"field": "bun", "message": "BUN must be between 5 and 150 mg/dL"}
    ]
  }
}
```

### TC-E2E-07: Mobile Responsive (375px Viewport)

**Jira:** SPEC-14, SPEC-16 (Decision #11)

**Given** a user accesses KidneyHood on a mobile device (375px viewport width, iPhone SE emulation)

**When** the user completes a prediction with valid required fields

**Then** the stat cards are stacked in a single column (not 4-column grid)
**And** the legal disclaimers appear as a sticky footer at the bottom of the viewport
**And** the sticky footer is collapsed by default with an expand-on-tap affordance
**And** tapping the footer expands to show all 3 verbatim disclaimers
**And** all interactive elements (buttons, radio buttons, form inputs) have a minimum touch target of 44x44px
**And** form inputs have a minimum font size of 16px (prevents iOS auto-zoom on focus)
**And** the chart is visible and usable (horizontal scroll or responsive scaling)
**And** the confidence tier badge is visible and readable

### TC-E2E-08: Guest Data Purge (24hr TTL)

**Jira:** SPEC-18, SPEC-62, SPEC-64 (Decision #4)

**Given** a guest user has completed a prediction
**And** a guest session exists in the `guest_sessions` table with `expires_at = NOW() + 24 hours`

**When** the session expires (simulated by advancing the clock past `expires_at`)
**And** the purge cron job executes (`DELETE FROM guest_sessions WHERE expires_at < NOW()`)

**Then** the guest session row is deleted from `guest_sessions`
**And** an audit log entry is created with action = `'guest_session_purge'`
**And** the guest session token cookie no longer resolves to valid data
**And** attempting to access the prediction with the expired session token returns HTTP 401

### TC-E2E-09: User Deletion + Audit Persistence

**Jira:** SPEC-73, SPEC-30 (Decision #14)

**Given** an authenticated user "delete-test@example.com" exists
**And** the user has 2 lab entries and 5 audit log records (login, 2 lab entry creates, 1 prediction, 1 profile view)

**When** the user calls `DELETE /api/v1/me` with a valid session token

**Then** the user row is deleted from the `users` table
**And** all lab entries for that user are cascade-deleted from `lab_entries`
**And** all magic link tokens for that user are cascade-deleted from `magic_link_tokens`
**And** all 5 pre-existing audit log records are retained in `audit_log`
**And** the `user_id` column in those audit log records is `NULL` (ON DELETE SET NULL)
**And** the audit log records are still queryable by `resource_type` and `resource_id`
**And** a new audit log entry is created for the deletion action itself (with `user_id = NULL` since the user no longer exists)
**And** the session is invalidated (subsequent API calls return 401)

---

## 6. API Contract Test Plan

All contract tests validate against John Donaldson's OpenAPI 3.1 spec at `/artifacts/api_contract.json`. Error responses must match the approved envelope (Decision #9) across all endpoints.

### 6.1 POST /api/v1/auth/request-link

| ID | Test Case | Input | Expected Status | Expected Response |
|----|-----------|-------|----------------|-------------------|
| CT-AUTH-01 | Valid email sends magic link | `{"email": "valid@example.com"}` | 200 | `{"message": "Magic link sent"}` |
| CT-AUTH-02 | Invalid email format | `{"email": "not-an-email"}` | 400 | Error envelope with `details[].field = "email"` |
| CT-AUTH-03 | Missing email field | `{}` | 400 | Error envelope with `code = "VALIDATION_ERROR"` |
| CT-AUTH-04 | Non-existent email (new user) | `{"email": "new@example.com"}` | 200 | Same response as CT-AUTH-01 (no user enumeration) |
| CT-AUTH-05 | Rate limiting (6th request in 10min) | Same email, 6th request | 429 | Error envelope with `code = "RATE_LIMITED"`, `Retry-After` header |
| CT-AUTH-06 | Empty string email | `{"email": ""}` | 400 | Error envelope with `details[].field = "email"` |

### 6.2 POST /api/v1/auth/verify

| ID | Test Case | Input | Expected Status | Expected Response |
|----|-----------|-------|----------------|-------------------|
| CT-VERIFY-01 | Valid token | `{"token": "{valid_token}"}` | 200 | `{"access_token": "...", "refresh_token": "...", "user": {...}}` |
| CT-VERIFY-02 | Expired token (>15min) | `{"token": "{expired_token}"}` | 401 | Error envelope with `code = "TOKEN_EXPIRED"` |
| CT-VERIFY-03 | Already-used token | `{"token": "{used_token}"}` | 401 or 410 | Error envelope with `code = "TOKEN_USED"` |
| CT-VERIFY-04 | Invalid/malformed token | `{"token": "garbage123"}` | 401 | Error envelope with `code = "INVALID_TOKEN"` |
| CT-VERIFY-05 | Missing token field | `{}` | 400 | Error envelope with `code = "VALIDATION_ERROR"` |
| CT-VERIFY-06 | Valid token with guest session | `{"token": "{valid_token}", "session_token": "{guest_session}"}` | 200 | User created, guest data migrated, access token returned |

### 6.3 POST /api/v1/lab-entries

| ID | Test Case | Input | Expected Status | Expected Response |
|----|-----------|-------|----------------|-------------------|
| CT-LAB-01 | Valid required fields only | `{"bun": 35, "creatinine": 1.8, "potassium": 4.5, "age": 65, "sex": "male", "visit_date": "2026-03-15"}` | 201 | Lab entry object with generated `id` |
| CT-LAB-02 | Valid with all optional fields | Required + `{"hemoglobin": 13.5, "glucose": 100, "egfr_override": 45, "systolic_bp": 140, "sglt2_inhibitor": true, "upcr": 500, "upcr_unit": "mg_per_g", "ckd_diagnosis": "diabetic_nephropathy"}` | 201 | Lab entry object with all fields |
| CT-LAB-03 | Missing required field (no BUN) | Omit `bun` from payload | 400 | Error envelope with `details[].field = "bun"` |
| CT-LAB-04 | BUN at minimum boundary | `{"bun": 5, ...}` | 201 | Success |
| CT-LAB-05 | BUN at maximum boundary | `{"bun": 150, ...}` | 201 | Success |
| CT-LAB-06 | BUN below minimum | `{"bun": 4.9, ...}` | 400 | Error envelope: "BUN must be between 5 and 150 mg/dL" |
| CT-LAB-07 | BUN above maximum | `{"bun": 150.1, ...}` | 400 | Error envelope with field-level detail |
| CT-LAB-08 | Creatinine at minimum (0.3) | `{"creatinine": 0.3, ...}` | 201 | Success |
| CT-LAB-09 | Creatinine at maximum (15.0) | `{"creatinine": 15.0, ...}` | 201 | Success |
| CT-LAB-10 | Creatinine below minimum (0.29) | `{"creatinine": 0.29, ...}` | 400 | Error envelope |
| CT-LAB-11 | Creatinine above maximum (15.01) | `{"creatinine": 15.01, ...}` | 400 | Error envelope |
| CT-LAB-12 | Potassium at minimum (2.0) | `{"potassium": 2.0, ...}` | 201 | Success |
| CT-LAB-13 | Potassium at maximum (8.0) | `{"potassium": 8.0, ...}` | 201 | Success |
| CT-LAB-14 | Age at minimum (18) | `{"age": 18, ...}` | 201 | Success |
| CT-LAB-15 | Age at maximum (120) | `{"age": 120, ...}` | 201 | Success |
| CT-LAB-16 | Age below minimum (17) | `{"age": 17, ...}` | 400 | Error envelope |
| CT-LAB-17 | Sex = "male" | `{"sex": "male", ...}` | 201 | Success |
| CT-LAB-18 | Sex = "female" | `{"sex": "female", ...}` | 201 | Success |
| CT-LAB-19 | Sex = "unknown" | `{"sex": "unknown", ...}` | 201 | Success |
| CT-LAB-20 | Sex = invalid value | `{"sex": "other", ...}` | 400 | Error envelope with `details[].field = "sex"` |
| CT-LAB-21 | Sex field omitted | Omit `sex` | 400 | Error envelope (sex is required, Decision #3) |
| CT-LAB-22 | Hemoglobin at minimum (4.0) | `{"hemoglobin": 4.0, ...}` | 201 | Success |
| CT-LAB-23 | Hemoglobin at maximum (20.0) | `{"hemoglobin": 20.0, ...}` | 201 | Success |
| CT-LAB-24 | Glucose at minimum (40) | `{"glucose": 40, ...}` | 201 | Success |
| CT-LAB-25 | Glucose at maximum (500) | `{"glucose": 500, ...}` | 201 | Success |
| CT-LAB-26 | Unauthenticated request | No auth header | 401 | Error envelope with `code = "UNAUTHENTICATED"` |
| CT-LAB-27 | Expired session token | Expired JWT in Authorization header | 401 | Error envelope with `code = "TOKEN_EXPIRED"` |
| CT-LAB-28 | Duplicate visit_date for same user | Second entry with same `visit_date` | 409 or 400 | Error envelope (one lab entry per visit date) |
| CT-LAB-29 | UPCR without unit | `{"upcr": 500}` (no `upcr_unit`) | 400 | Error envelope with `details[].field = "upcr_unit"` |
| CT-LAB-30 | Valid UPCR units | `{"upcr_unit": "mg_per_g"}` and `{"upcr_unit": "mg_per_mg"}` | 201 | Success for both |

### 6.4 POST /api/v1/predict

| ID | Test Case | Input | Expected Status | Expected Response |
|----|-----------|-------|----------------|-------------------|
| CT-PRED-01 | Authenticated single entry | `{"lab_entry_ids": ["{uuid}"]}` | 200 | Prediction with `confidence_tier: 1`, 4 trajectory arrays, `dial_ages`, `unlock_prompt` |
| CT-PRED-02 | Guest inline single entry (Tier 1) | `{"lab_entries": [{ required fields only }]}` with guest session cookie | 200 | Prediction with `confidence_tier: 1`, `unlock_prompt` present |
| CT-PRED-03 | Guest inline with hemoglobin + glucose (Tier 2) | `{"lab_entries": [{ required + hemoglobin + glucose }]}` | 200 | `confidence_tier: 2`, `unlock_prompt: null` |
| CT-PRED-04 | Authenticated 3+ entries (Tier 3) | `{"lab_entry_ids": ["{uuid1}", "{uuid2}", "{uuid3}"]}` | 200 | `confidence_tier: 3`, `slope` is numeric, `slope_description` is non-null |
| CT-PRED-05 | Authenticated 2 entries | `{"lab_entry_ids": ["{uuid1}", "{uuid2}"]}` | 200 | Directional tag present, `slope: null` (not enough visits) |
| CT-PRED-06 | Invalid lab_entry_id | `{"lab_entry_ids": ["{nonexistent_uuid}"]}` | 404 | Error envelope with `code = "NOT_FOUND"` |
| CT-PRED-07 | Lab entry belonging to another user | `{"lab_entry_ids": ["{other_user_uuid}"]}` | 403 or 404 | Error envelope (no data leakage) |
| CT-PRED-08 | Empty lab_entry_ids array | `{"lab_entry_ids": []}` | 400 | Error envelope |
| CT-PRED-09 | Response has no `prediction_id` | Any valid request | 200 | Response body does NOT contain `prediction_id` (Decision #10) |
| CT-PRED-10 | Trajectory arrays have 15 elements each | Any valid request | 200 | `trajectories.none.length == 15`, same for bun24, bun17, bun12 |
| CT-PRED-11 | `dial_ages` keys match trajectory keys | Any valid request | 200 | `dial_ages` has keys: `none`, `bun24`, `bun17`, `bun12` |
| CT-PRED-12 | `created_at` is ISO 8601 | Any valid request | 200 | `created_at` matches ISO 8601 format |
| CT-PRED-13 | Sex = "unknown" lowers confidence | Guest inline with `sex: "unknown"`, all required fields | 200 | `confidence_tier: 1` with lower confidence indicator (Decision #3) |

### 6.5 GET /api/v1/lab-entries

| ID | Test Case | Input | Expected Status | Expected Response |
|----|-----------|-------|----------------|-------------------|
| CT-GET-01 | Authenticated user with entries | Valid JWT | 200 | Array of lab entry objects ordered by `visit_date` |
| CT-GET-02 | Authenticated user with no entries | Valid JWT, new user | 200 | Empty array `[]` |
| CT-GET-03 | Unauthenticated request | No JWT | 401 | Error envelope |
| CT-GET-04 | Response does not include other users' entries | Valid JWT | 200 | Only entries belonging to the authenticated user |

### 6.6 DELETE /api/v1/me

| ID | Test Case | Input | Expected Status | Expected Response |
|----|-----------|-------|----------------|-------------------|
| CT-DEL-01 | Valid deletion | Valid JWT | 200 or 204 | Account deleted, session invalidated |
| CT-DEL-02 | Lab entries cascade deleted | Valid JWT, user has lab entries | 200/204 | No lab entries remain for that user_id |
| CT-DEL-03 | Audit records persist with NULL user_id | Valid JWT, user has audit records | 200/204 | Audit records exist, `user_id IS NULL` (Decision #14) |
| CT-DEL-04 | Magic link tokens cascade deleted | Valid JWT | 200/204 | No magic_link_tokens remain for that user_id |
| CT-DEL-05 | Unauthenticated deletion attempt | No JWT | 401 | Error envelope |
| CT-DEL-06 | Double deletion | Valid JWT, call DELETE twice | 401 on second call | First succeeds, second returns unauthenticated (session invalidated) |

### 6.7 Error Envelope Validation (All Endpoints)

Every 4xx and 5xx response from any endpoint must conform to:

```json
{
  "error": {
    "code": "string (machine-readable, e.g., VALIDATION_ERROR)",
    "message": "string (human-readable)",
    "details": []
  }
}
```

| ID | Test Case | Validation |
|----|-----------|------------|
| CT-ERR-01 | `code` is always a string | Type check on all error responses |
| CT-ERR-02 | `message` is always a string | Type check on all error responses |
| CT-ERR-03 | `details` is always an array | Type check (may be empty for non-validation errors) |
| CT-ERR-04 | Validation errors have per-field `details[]` | Each detail object has `field` (string) and `message` (string) |
| CT-ERR-05 | 500 errors do not leak stack traces | Internal server error responses contain generic message only |
| CT-ERR-06 | Content-Type is application/json on all error responses | Header check |

---

## 7. Security Test Plan (Magic Link)

### 7.1 Token Lifecycle

| ID | Test Case | Method | Expected Result |
|----|-----------|--------|----------------|
| SEC-ML-01 | Token expires after configured TTL (15 min default) | Request magic link, wait >15 min, attempt verify | 401 with `TOKEN_EXPIRED` |
| SEC-ML-02 | Token is single-use | Request magic link, verify once (success), verify again with same token | First: 200. Second: 401 or 410 with `TOKEN_USED` |
| SEC-ML-03 | Token has sufficient entropy | Inspect `token_hash` in DB | Token is >= 128 bits (32+ hex chars or equivalent), cryptographically random |
| SEC-ML-04 | Token hash stored, not plaintext | Inspect `magic_link_tokens.token_hash` | Column contains hash, not the raw token. Raw token only sent in email URL. |
| SEC-ML-05 | Brute-force protection | Send 10 invalid tokens in rapid succession | Rate-limited (429) or account locked after N attempts |
| SEC-ML-06 | Timing attack resistance | Compare response time for valid vs. invalid tokens | Response times are constant (within 10ms variance) — use constant-time comparison |
| SEC-ML-07 | HTTPS-only magic link URLs | Inspect magic link email content | URL scheme is `https://`, never `http://` |
| SEC-ML-08 | Token cannot be reused after expiration | Expired + previously-unused token | 401 with `TOKEN_EXPIRED` (expiration takes precedence) |

### 7.2 Session Management (JWT)

| ID | Test Case | Method | Expected Result |
|----|-----------|--------|----------------|
| SEC-JWT-01 | Access token has short TTL | Decode JWT, check `exp` claim | TTL is <= 15 minutes |
| SEC-JWT-02 | Refresh token has longer TTL | Inspect refresh token lifecycle | TTL is configurable, default 7 days |
| SEC-JWT-03 | Refresh endpoint issues new access token | `POST /auth/refresh` with valid refresh token | 200 with new access token |
| SEC-JWT-04 | Expired refresh token rejected | `POST /auth/refresh` with expired refresh token | 401 |
| SEC-JWT-05 | Logout invalidates session | `POST /auth/logout`, then attempt API call | Subsequent calls return 401 |
| SEC-JWT-06 | JWT signature validation | Tamper with JWT payload, send to API | 401 |

### 7.3 Guest Session Security

| ID | Test Case | Method | Expected Result |
|----|-----------|--------|----------------|
| SEC-GS-01 | Guest session token in httpOnly cookie | Inspect `Set-Cookie` header | `HttpOnly; Secure; SameSite=Strict` (or Lax) |
| SEC-GS-02 | Guest data not accessible via JavaScript | Attempt `document.cookie` access to session token | Token is not readable from JS |
| SEC-GS-03 | Guest session expires after 24hr | Wait >24hr (simulated), attempt API call with guest token | 401 |
| SEC-GS-04 | Purge job deletes expired guest data | Run purge after expiration | Row deleted from `guest_sessions`, audit log entry created |
| SEC-GS-05 | Guest-to-account migration is atomic | Create account during active guest session | Guest data fully migrated OR not at all (no partial state) |

### 7.4 HIPAA Security Controls

| ID | Test Case | Method | Expected Result |
|----|-----------|--------|----------------|
| SEC-HIPAA-01 | Encryption at rest (RDS) | AWS console / CLI verification | KMS-managed encryption enabled on RDS instance |
| SEC-HIPAA-02 | Encryption in transit (TLS) | Inspect DB connection string, test with `openssl s_client` | TLS 1.2+ required for all DB connections |
| SEC-HIPAA-03 | API uses TLS only | Attempt HTTP connection to API | Redirect to HTTPS or connection refused |
| SEC-HIPAA-04 | Audit logging on all PHI access | Create lab entry, read lab entry, delete lab entry | Each action generates an audit_log entry |
| SEC-HIPAA-05 | RBAC — app service account | Inspect DB role permissions | App account can read/write `lab_entries`, `users`; cannot DDL or access other schemas |
| SEC-HIPAA-06 | RBAC — admin account | Inspect DB role permissions | Admin account has DDL, migration permissions; separate credentials from app account |
| SEC-HIPAA-07 | No PHI in logs | Inspect application logs during prediction flow | Log entries do not contain BUN, creatinine, eGFR, email, DOB, or other PHI |
| SEC-HIPAA-08 | Data retention — guest purge | Monitor purge job over 48hr period | All sessions older than 24hr are deleted |
| SEC-HIPAA-09 | Audit log immutability | Attempt DELETE on audit_log via app service account | Permission denied (app account lacks DELETE on audit_log) |
| SEC-HIPAA-10 | Backup encryption | Inspect RDS backup configuration | Automated backups are encrypted with KMS |

---

## 8. Accessibility Test Plan

### 8.1 WCAG 2.1 AA Checklist Mapped to Components

| WCAG Criterion | Component(s) | Test Method | Acceptance Criteria |
|---------------|-------------|-------------|---------------------|
| 1.1.1 Non-text Content | `<PredictionChart>`, stat cards | axe-core + manual | All SVG chart elements have ARIA labels. All images have alt text. |
| 1.3.1 Info and Relationships | `<PredictionForm>`, all form fields | axe-core | All `<input>` elements have associated `<label>`. Form sections use `<fieldset>` + `<legend>`. |
| 1.4.1 Use of Color | Trajectory lines, confidence badges | Manual inspection | Information is not conveyed by color alone. Line styles (solid, dashed, short-dash) differentiate trajectories in addition to color. |
| 1.4.3 Contrast (Minimum) | All text, chart labels, stat cards | axe-core | 4.5:1 contrast ratio for normal text, 3:1 for large text. **Flag: #AAAAAA on white = 2.9:1 — FAILS.** Escalate to Inga. |
| 1.4.11 Non-text Contrast | Chart lines, form borders, buttons | axe-core + manual | 3:1 contrast ratio for UI components and graphical objects. |
| 2.1.1 Keyboard | All interactive elements | Playwright keyboard navigation | Tab order follows logical flow: form fields -> submit -> chart -> stat cards -> save prompt. All actions achievable via keyboard. |
| 2.4.3 Focus Order | Full page flow | Manual + Playwright | Focus order matches visual layout. No focus traps. |
| 2.4.7 Focus Visible | All interactive elements | Manual inspection | Visible focus indicator on all focusable elements. |
| 2.5.5 Target Size | Buttons, radio buttons, form inputs | Playwright measurement | All touch targets >= 44x44px (critical for 60+ demographic). |
| 3.3.1 Error Identification | Form validation errors | Vitest + RTL | Errors are described in text (not just color). `aria-invalid` and `aria-describedby` link errors to fields. |
| 3.3.2 Labels or Instructions | All form fields | axe-core | Every field has a visible label and placeholder/help text where applicable. |
| 4.1.2 Name, Role, Value | All interactive components | axe-core | Custom components (shadcn/ui) expose correct ARIA roles and states. |

### 8.2 Chart Accessibility (Visx SVG)

| ID | Test Case | Method | Expected Result |
|----|-----------|--------|----------------|
| A11Y-CHART-01 | Chart has accessible name | axe-core | SVG has `role="img"` and `aria-label="eGFR trajectory chart"` (or equivalent) |
| A11Y-CHART-02 | Data table alternative exists | Manual + Playwright | A visually hidden `<table>` provides all trajectory data points for screen readers |
| A11Y-CHART-03 | Line colors + styles are distinguishable | Manual | Each line uses both a unique color AND a unique dash pattern (Decision #6 Visx SVG) |
| A11Y-CHART-04 | Contrast: "No Treatment" line (#AAAAAA) | Contrast checker | **KNOWN ISSUE:** #AAAAAA on white = 2.9:1. Below WCAG AA 3:1 for non-text. Escalated to Inga for color change. |
| A11Y-CHART-05 | Dialysis threshold line is labeled | Manual + Playwright | Red dashed line has a text label "Dialysis Threshold (eGFR 12)" visible or via ARIA |
| A11Y-CHART-06 | Stat cards are screen-reader-friendly | VoiceOver test | Each card reads: scenario name, eGFR value, delta, and sub-text in logical order |

### 8.3 Touch Target Validation

| Component | Minimum Size | Test Method |
|-----------|-------------|-------------|
| Submit button | 44x44px | Playwright: `element.boundingBox()` |
| Sex radio buttons | 44x44px | Playwright: `element.boundingBox()` |
| All form inputs | 44px height | Playwright: `element.boundingBox()` |
| "Save your results" button | 44x44px | Playwright: `element.boundingBox()` |
| Sticky footer expand tap target | 44x44px | Playwright (mobile viewport): `element.boundingBox()` |
| Magic link email input | 44px height | Playwright: `element.boundingBox()` |

### 8.4 Keyboard Navigation Flow

Expected tab order (verified via Playwright `keyboard.press('Tab')`):

1. Skip-to-content link (visible on focus)
2. Header navigation links
3. BUN input
4. Creatinine input
5. Potassium input
6. Age input
7. Sex radio group (Male / Female / Prefer not to say)
8. Optional fields toggle/expand
9. (If expanded) Hemoglobin, Glucose, eGFR override inputs
10. Visit date picker
11. Submit button
12. (After submission) Chart region (aria-label)
13. Stat cards (each card is a focusable region)
14. Unlock prompt / Save prompt
15. Disclaimer section

### 8.5 Screen Reader Testing Plan

| Screen Reader | OS | Browser | Tester |
|--------------|-----|---------|--------|
| VoiceOver | macOS | Safari | Yuri (manual) |
| VoiceOver | iOS | Safari | Yuri (manual, mobile viewport) |
| NVDA | Windows | Chrome | Deferred — no Windows test environment in Sprint 1 |

**Priority areas for manual screen reader testing:**
1. Chart data interpretation (does the hidden data table read correctly?)
2. Form error announcements (are errors announced via `aria-live` when they appear?)
3. Confidence tier badge meaning (is the tier explained, not just shown as a visual badge?)
4. Disclaimer content (are all 3 disclaimers readable?)

---

## 9. Test Data Strategy

### 9.1 Core Principle: Synthetic Data Only

**No real patient data in any test environment.** This is a HIPAA requirement that applies to dev, staging, CI, and production test accounts. All test data is fabricated and clearly marked as synthetic.

### 9.2 Fixture Categories

| Category | Purpose | Example Values |
|----------|---------|---------------|
| **Normal range** | Happy-path testing | BUN=35, Creatinine=1.8, Potassium=4.5, Age=65, Sex=male |
| **Boundary minimum** | Lower-bound validation | BUN=5, Creatinine=0.3, Potassium=2.0, Age=18 |
| **Boundary maximum** | Upper-bound validation | BUN=150, Creatinine=15.0, Potassium=8.0, Age=120 |
| **Below minimum** | Rejection testing | BUN=4.9, Creatinine=0.29, Potassium=1.9, Age=17 |
| **Above maximum** | Rejection testing | BUN=150.1, Creatinine=15.01, Potassium=8.1, Age=121 |
| **Missing optional** | Tier 1 baseline | Required fields only (no hemoglobin, no glucose) |
| **Hemoglobin only** | Tier 1 (not Tier 2) | Required + hemoglobin=13.5, no glucose |
| **Glucose only** | Tier 1 (not Tier 2) | Required + glucose=100, no hemoglobin |
| **Both optional (Tier 2)** | Tier 2 validation | Required + hemoglobin=13.5 + glucose=100 |
| **3+ visits (Tier 3)** | Tier 3 with slope | 3 lab entries with different visit_dates and values showing decline |
| **Sex = unknown** | Lower confidence test | Required fields with sex="unknown" |
| **All fields populated** | Maximum data scenario | Every field in the schema has a valid value |

### 9.3 Seed Data Schema (Aligned with Gay Mark's Tables)

```sql
-- Test users
INSERT INTO users (id, email, name, sex, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'test-tier1@example.com', 'Test Tier1', 'male', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'test-tier2@example.com', 'Test Tier2', 'female', NOW()),
  ('00000000-0000-0000-0000-000000000003', 'test-tier3@example.com', 'Test Tier3', 'male', NOW()),
  ('00000000-0000-0000-0000-000000000004', 'test-unknown-sex@example.com', 'Test Unknown', 'unknown', NOW()),
  ('00000000-0000-0000-0000-000000000005', 'test-delete@example.com', 'Test Delete', 'female', NOW());

-- Tier 1: required fields only
INSERT INTO lab_entries (user_id, visit_date, bun, creatinine, potassium, age_at_visit) VALUES
  ('00000000-0000-0000-0000-000000000001', '2026-01-15', 35, 1.8, 4.5, 65);

-- Tier 2: required + hemoglobin + glucose
INSERT INTO lab_entries (user_id, visit_date, bun, creatinine, potassium, age_at_visit, hemoglobin, glucose) VALUES
  ('00000000-0000-0000-0000-000000000002', '2026-01-15', 30, 1.6, 4.2, 58, 13.5, 100);

-- Tier 3: 3+ visits with different dates
INSERT INTO lab_entries (user_id, visit_date, bun, creatinine, potassium, age_at_visit, hemoglobin, glucose) VALUES
  ('00000000-0000-0000-0000-000000000003', '2025-06-15', 40, 2.0, 4.8, 64, 12.0, 120),
  ('00000000-0000-0000-0000-000000000003', '2025-12-15', 35, 1.8, 4.5, 65, 12.5, 110),
  ('00000000-0000-0000-0000-000000000003', '2026-03-15', 30, 1.6, 4.2, 65, 13.0, 100);

-- Guest session for purge testing
INSERT INTO guest_sessions (session_token, lab_data, expires_at) VALUES
  ('test-session-active', '{"bun": 35, "creatinine": 1.8, "potassium": 4.5, "age": 65, "sex": "male"}', NOW() + INTERVAL '24 hours'),
  ('test-session-expired', '{"bun": 35, "creatinine": 1.8, "potassium": 4.5, "age": 65, "sex": "male"}', NOW() - INTERVAL '1 hour');

-- Audit log entries for deletion testing
INSERT INTO audit_log (user_id, action, resource_type, resource_id, timestamp) VALUES
  ('00000000-0000-0000-0000-000000000005', 'LOGIN', 'user', '00000000-0000-0000-0000-000000000005', NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0000-000000000005', 'CREATE', 'lab_entry', gen_random_uuid(), NOW() - INTERVAL '1 hour'),
  ('00000000-0000-0000-0000-000000000005', 'PREDICT', 'prediction', NULL, NOW() - INTERVAL '30 minutes');
```

### 9.4 Test Vectors from Lee

**Status:** PENDING. Husser is coordinating delivery of 10-20 validated input/output pairs before Sprint 1 (Decision #13).

**What we need:**
- Input: Complete lab value sets (BUN, creatinine, potassium, age, sex, and optionally hemoglobin, glucose, eGFR override)
- Output: Expected `egfr_calculated`, `confidence_tier`, `trajectories` (all 4 arrays), `dial_ages`, `slope` (for multi-visit)

**What we can test without vectors:**
- Structural correctness (response shape matches schema)
- Confidence tier logic (tier assignment based on input completeness)
- Validation and error handling
- Auth and session flows

**What we CANNOT test without vectors:**
- Clinical accuracy of eGFR predictions
- Correctness of trajectory curves
- Accuracy of dial_ages calculations

**This is a patient safety blocker.** Sprint 1 prediction accuracy testing is blocked until vectors are delivered.

---

## 10. CI/CD Integration

### 10.1 GitHub Actions Pipeline

```yaml
# Triggered on: every PR, every push to main
stages:
  1. lint:
     - ESLint (frontend)
     - Ruff (backend Python)
     - Prettier (formatting)
     # Blocking: PR cannot proceed if lint fails

  2. unit-tests:
     - Vitest (frontend, parallel workers)
     - pytest (backend, parallel workers)
     - Coverage reports generated
     # Blocking: PR blocked if any test fails or coverage < threshold

  3. contract-tests:
     - Schemathesis against OpenAPI spec
     - Validates all endpoints, status codes, and schemas
     # Blocking: PR blocked if any contract violation

  4. integration-tests:
     - pytest + httpx (backend integration)
     - Frontend integration tests (TanStack Query against test API)
     # Blocking: PR blocked if any integration test fails

  5. e2e-tests:
     - Playwright (Chromium, Firefox, WebKit)
     - Mobile viewport tests (375px)
     - Accessibility scan (axe-core)
     # Blocking: PR blocked if any E2E test fails

  6. coverage-report:
     - Post coverage summary as PR comment
     - Backend: 90% minimum
     - Frontend: 85% minimum
     # Blocking: PR blocked if below thresholds
```

### 10.2 PR Blocking Conditions

A PR is **blocked from merging** if any of the following are true:

- Any lint error
- Any unit test failure
- Any contract test failure
- Any integration test failure
- Any E2E critical path failure
- Backend coverage < 90% line coverage
- Frontend coverage < 85% line coverage
- Any critical/serious axe-core accessibility violation
- Error responses do not match approved envelope format (Decision #9)

### 10.3 Nightly Regression Schedule

**Runs at:** 02:00 UTC daily on main branch

**Includes (in addition to PR pipeline):**
- Full visual regression suite (Playwright screenshot comparison against baselines)
- Performance/load tests (k6 against staging API)
- Extended E2E suite (all 8 active critical journeys + edge cases)
- HIPAA audit log verification (spot-check that all PHI access in last 24hr has audit entries)
- Guest session purge verification (confirm no sessions older than 24hr exist)

**Alerts:** Nightly failures trigger Slack notification to #kidneyhood-qa channel.

### 10.4 Coverage Report Posting

Every PR receives an automated coverage comment:

```
## Coverage Report
| Layer    | Current | Threshold | Status |
|----------|---------|-----------|--------|
| Backend  | 92.3%   | 90%       | PASS   |
| Frontend | 87.1%   | 85%       | PASS   |

### Changed Files Coverage
- api/routes/lab_entries.py: 95% (3 uncovered lines)
- api/routes/predict.py: 91% (5 uncovered lines)
- components/PredictionForm.tsx: 89% (4 uncovered lines)
```

---

## 11. Tier Transition Test Matrix

Per Decision #12, tier transitions follow explicit rules. Each test case below is independently executable and must pass before any release.

### Tier Requirements Summary

| Tier | Required Inputs | Visit Count | Outputs |
|------|----------------|-------------|---------|
| Tier 1 (Low) | BUN, Creatinine, Potassium, Age, Sex | 1+ | Trajectory chart, stat cards, unlock prompt |
| Tier 2 (Medium) | Tier 1 + BOTH Hemoglobin AND Glucose | 1+ | Updated trajectories, no unlock prompt |
| Tier 3 (High) | Tier 2 + 3 or more visit dates | 3+ | Updated trajectories, slope tag with numeric value |

### Test Cases

**TC-TIER-01: Tier 1 baseline**

**Given** a user submits: BUN=20, Creatinine=1.2, Potassium=4.5, Age=65, Sex=male
**When** the prediction is computed
**Then** `confidence_tier` = 1
**And** a Tier 1 badge is displayed
**And** an unlock prompt reads: "Add hemoglobin AND glucose to improve prediction accuracy"

---

**TC-TIER-02: Adding hemoglobin alone does NOT upgrade to Tier 2**

**Given** a user submits: BUN=20, Creatinine=1.2, Potassium=4.5, Age=65, Sex=male, Hemoglobin=13.5 (NO glucose)
**When** the prediction is computed
**Then** `confidence_tier` = 1 (remains Tier 1)
**And** the unlock prompt is still displayed

---

**TC-TIER-03: Adding glucose alone does NOT upgrade to Tier 2**

**Given** a user submits: BUN=20, Creatinine=1.2, Potassium=4.5, Age=65, Sex=male, Glucose=100 (NO hemoglobin)
**When** the prediction is computed
**Then** `confidence_tier` = 1 (remains Tier 1)
**And** the unlock prompt is still displayed

---

**TC-TIER-04: Adding BOTH hemoglobin AND glucose upgrades to Tier 2**

**Given** a user submits: BUN=20, Creatinine=1.2, Potassium=4.5, Age=65, Sex=male, Hemoglobin=13.5, Glucose=100
**When** the prediction is computed
**Then** `confidence_tier` = 2
**And** a Tier 2 badge is displayed
**And** the unlock prompt is NOT displayed

---

**TC-TIER-05: Tier 3 requires 3+ visit dates**

**Given** an authenticated user has 3 lab entries:
- Visit 1 (2025-06-15): BUN=40, Creatinine=2.0, Potassium=4.8, Age=64, Sex=male, Hemoglobin=12.0, Glucose=120
- Visit 2 (2025-12-15): BUN=35, Creatinine=1.8, Potassium=4.5, Age=65, Sex=male, Hemoglobin=12.5, Glucose=110
- Visit 3 (2026-03-15): BUN=30, Creatinine=1.6, Potassium=4.2, Age=65, Sex=male, Hemoglobin=13.0, Glucose=100
**When** the prediction is computed with all 3 lab_entry_ids
**Then** `confidence_tier` = 3
**And** a Tier 3 badge is displayed
**And** `slope` is a numeric value (non-null)
**And** `slope_description` is a non-null string (e.g., "Improving: +2.1 mL/min/year")

---

**TC-TIER-06: Tier 2 with only 2 visit dates remains Tier 2**

**Given** an authenticated user has 2 lab entries with Hemoglobin and Glucose on both:
- Visit 1 (2025-12-15): BUN=35, Creatinine=1.8, Potassium=4.5, Age=65, Sex=male, Hemoglobin=12.5, Glucose=110
- Visit 2 (2026-03-15): BUN=30, Creatinine=1.6, Potassium=4.2, Age=65, Sex=male, Hemoglobin=13.0, Glucose=100
**When** the prediction is computed with both lab_entry_ids
**Then** `confidence_tier` = 2 (NOT Tier 3)
**And** a directional tag is displayed ("Improving", "Stable", or "Declining")
**And** `slope` = null (not enough visits for numeric trend)

---

**TC-TIER-07: Sex = "unknown" triggers lower confidence**

**Given** a user submits: BUN=20, Creatinine=1.2, Potassium=4.5, Age=65, Sex=unknown
**When** the prediction is computed
**Then** `confidence_tier` = 1
**And** a lower confidence indicator is displayed (per Decision #3)
**And** the eGFR calculation accounts for unknown sex (reduced precision in CKD-EPI formula)

---

**TC-TIER-08: Sex field is required -- omission is rejected**

**Given** a user submits: BUN=20, Creatinine=1.2, Potassium=4.5, Age=65 (Sex OMITTED)
**When** the form is submitted (client-side)
**Then** client-side validation prevents submission
**And** an error message is displayed on the Sex field: "Sex is required"

**When** a crafted API request omits the sex field (bypassing client validation)
**Then** the API returns HTTP 400 with error envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields failed validation",
    "details": [
      {"field": "sex", "message": "Sex is required"}
    ]
  }
}
```

---

## 12. HIPAA Validation Checklist

Every item must be verified and signed off by Yuri + Gay Mark before any release. This checklist is **release blocking** -- 100% of items must pass.

| ID | Control | Verification Method | Acceptance Criteria | Sign-Off |
|----|---------|-------------------|---------------------|----------|
| HIPAA-01 | Encryption at rest (database) | AWS console: RDS encryption status, KMS key inspection | AES-256 encryption enabled on RDS instance via AWS KMS | Gay Mark + Yuri |
| HIPAA-02 | Encryption at rest (backups) | AWS console: RDS backup configuration | Automated backups are encrypted with same KMS key as primary instance | Gay Mark + Yuri |
| HIPAA-03 | Encryption in transit (API) | `openssl s_client` against API endpoint, attempt HTTP connection | TLS 1.2+ enforced. HTTP connections refused or redirected to HTTPS. | Yuri |
| HIPAA-04 | Encryption in transit (database) | Inspect DB connection string, `openssl s_client` against RDS endpoint | `sslmode=require` (or `verify-full`) on all DB connections. TLS 1.2+ only. | Gay Mark |
| HIPAA-05 | Audit logging — PHI access | Create, read, update, delete lab entries; inspect `audit_log` table | Every PHI access operation generates an `audit_log` entry with `user_id`, `action`, `resource_type`, `resource_id`, `timestamp` | Yuri |
| HIPAA-06 | Audit logging — ON DELETE SET NULL | Delete user with audit records; query `audit_log` | Audit records persist with `user_id = NULL`. Records remain queryable by `resource_type` and `resource_id`. (Decision #14) | Yuri |
| HIPAA-07 | Audit log immutability | Attempt `DELETE FROM audit_log` via app service account | Permission denied. App account lacks DELETE privilege on `audit_log` table. | Gay Mark |
| HIPAA-08 | RBAC — app service account | Inspect PostgreSQL role grants | App account: SELECT, INSERT, UPDATE on `users`, `lab_entries`, `guest_sessions`. INSERT only on `audit_log`. No DDL, no TRUNCATE, no DELETE on `audit_log`. | Gay Mark |
| HIPAA-09 | RBAC — admin separation | Inspect PostgreSQL role grants | Admin account has DDL and migration permissions. Separate credentials from app account. Never used by the application at runtime. | Gay Mark |
| HIPAA-10 | No PHI in application logs | Run full prediction flow; inspect stdout, stderr, log files | Log entries do not contain BUN, creatinine, eGFR, email, lab values, or any other PHI. Only structured log metadata (request IDs, status codes, latencies). | Yuri |
| HIPAA-11 | Guest data purge (24hr TTL) | Monitor `guest_sessions` table over 48hr test period | All sessions with `expires_at` older than 24hr are deleted by purge job. No expired guest data remains. (Decision #4) | Yuri |
| HIPAA-12 | Guest data HIPAA parity | Inspect guest session storage and access patterns | Guest data receives identical encryption, audit logging, and access controls as authenticated user data. (Decision #4) | Yuri + Gay Mark |
| HIPAA-13 | Data deletion (right to delete) | Call `DELETE /api/v1/me`; verify all user data removed | User row, lab entries, and magic link tokens are cascade-deleted. Audit records persist with NULL user_id. Session invalidated. | Yuri |
| HIPAA-14 | BAA with hosting provider | Administrative review | Business Associate Agreement executed with AWS (or hosting provider) before PHI enters the system. | Luca (CTO) |

---

## Appendix A: Open Dependencies & Blockers

| Item | Owner | Status | Impact on QA |
|------|-------|--------|-------------|
| Validated test vectors (10-20 pairs from Lee) | Husser (coordinating) | PENDING | Blocks prediction accuracy testing. Sprint 1 can proceed for structural/validation tests only. |
| Finalized OpenAPI spec | John Donaldson | PENDING (parallel drafting) | Blocks Schemathesis contract test generation. Yuri can draft test cases but not run them. |
| DB schema with HIPAA annotations | Gay Mark | PENDING (parallel drafting) | Blocks seed data scripts and HIPAA checklist verification. |
| Responsive breakpoint definitions | Inga | PENDING | Blocks responsive E2E tests. Using Harshit's proposed defaults (>1024/768-1024/<768) until confirmed. |
| Magic link token TTL value | John / Luca | OPEN QUESTION | Tests parameterized with 15min default. Actual value TBD. |
| Session TTL value | John / Luca | OPEN QUESTION | Tests parameterized. Actual value TBD. |
| HIPAA-compliant staging environment | Luca | PENDING | Blocks SEC-HIPAA-01 through SEC-HIPAA-10. Local dev can only verify application-level controls. |
| #AAAAAA contrast failure resolution | Inga | ESCALATED | A11Y-CHART-04: "No Treatment" line fails WCAG AA contrast. Needs color change. |

## Appendix B: Phase 2b Placeholder -- PDF Testing

PDF export is deferred to Phase 2b (Decision #2). When it re-enters scope, the following tests will be needed:

- PDF generation from chart + stat cards + disclaimers
- PDF layout fidelity (chart renders correctly in print format)
- PDF accessibility (tagged PDF, reading order, alt text)
- PDF download flow (button, loading state, file save)
- PDF content matches on-screen prediction exactly

Placeholder retained per Yuri's notes. No implementation work in MVP.

---

*Drafted by Yuri (QA Engineer) -- 2026-03-25*
*Pending team review at Meeting 2*
