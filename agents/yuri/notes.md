# Yuri — Test Writer / QA Engineer
## Discovery Phase: Post-Meeting 1 Revision

**Date:** 2026-03-25
**Project:** KidneyHood Patient Outcome Prediction App
**Phase:** Discovery — Post-Meeting 1

---

## Meeting 1 Decisions

All 14 decisions below are **binding** per Luca (CTO).

| # | Decision | Impact on QA |
|---|----------|-------------|
| 1 | Auth: Magic link only | Security test plan rewritten for magic link. Password/bcrypt tests removed. |
| 2 | MVP Scope: PDF deferred to Phase 2b | PDF verification removed from MVP test plan. Placeholder kept for Phase 2b. |
| 3 | Sex field: Required (male, female, unknown) | Test all three values. Test "unknown" triggers lower confidence tier. |
| 4 | Guest data: Server-side, 24hr TTL, full HIPAA | Test purge job, guest-to-account migration, HIPAA compliance on guest data. |
| 5 | X-axis: True linear time scale | Chart visual regression baselines updated for linear time. |
| 6 | Charting library: Visx | SVG-based chart rendering. Visual regression tests target SVG elements. |
| 7 | Frontend stack: shadcn/ui + Tailwind + Zustand + TanStack Query | Affects component test setup and mocking strategy. |
| 8 | Predict endpoint: Separate concerns (POST /lab-entries + POST /predict) | Contract tests needed for both endpoints independently. |
| 9 | Error response: Approved envelope {error: {code, message, details[]}} | Contract tests validate this exact envelope structure. |
| 10 | No prediction result storage | No GET /predictions tests. Predict is stateless computation. |
| 11 | Disclaimer: Sticky footer mobile, inline desktop | Test visibility on all viewports per placement rule. |
| 12 | Tier transitions: Both hemoglobin AND glucose required for Tier 2 | Explicit tier transition test cases written (see Section 6). |
| 13 | Test vectors: Husser coordinating with Lee. 10-20 pairs before Sprint 1 | Critical input for prediction accuracy testing. Must follow up. |
| 14 | Audit log: ON DELETE SET NULL | Test that audit records persist after user deletion. |

---

## 1. Role and Deliverables

I am the QA gatekeeper for this project. Per CLAUDE.md: "QA (Yuri) approval is REQUIRED for completion." No story, sprint, or release ships without my sign-off.

### Primary Deliverables

1. **Test Strategy Document** — Testing philosophy, pyramid structure, tooling choices, CI integration plan. Published to `/artifacts/test_strategy.md` during parallel drafting.
2. **Test Plan per Epic** — Detailed test cases mapped to every Jira story and acceptance criterion across all 4 epics (Patient Input Form, Prediction Output & Visualization, User Accounts & Multi-Lab Entry, Operational & Legal Compliance).
3. **Coverage Requirements** — Minimum thresholds for unit, integration, and E2E coverage; blocking conditions when thresholds are not met.
4. **QA Gates** — Defined checkpoints per sprint where my approval is required before work advances.
5. **API Contract Tests** — Automated tests validating both `POST /lab-entries` and `POST /predict` contracts (request schema, response schema, error responses, edge cases).
6. **E2E Test Suite** — End-to-end flows covering the full patient journey: input form -> prediction -> chart rendering -> account creation -> multi-visit entry.
7. **Accessibility Test Plan** — WCAG 2.1 AA compliance validation plan for the 60+ patient demographic.
8. **Security/HIPAA Validation Checklist** — Verification that encryption, audit logging, data retention, and magic link auth flows meet HIPAA requirements.
9. ~~**PDF Output Verification**~~ — **DEFERRED to Phase 2b** per Decision #2. Placeholder retained.

---

## 2. Role Boundaries

**I test and validate. I do not implement features or design UX.**

- I will write test specifications, test cases, and automated test code.
- I will review and validate artifacts produced by other agents (API contracts, DB schemas, frontend components, UX specs).
- I will NOT write application code, design UI components, or define API endpoints.
- I will NOT modify files in any other agent's `/agents/{name}/` folder.
- I will flag defects and spec gaps, but the owning agent is responsible for the fix.
- I will provide clear, reproducible acceptance criteria for every QA gate.

---

## 3. Dependencies I Have on Other Agents

### From John Donaldson (API Designer)
- **Finalized API contract** (`/artifacts/api_contract.json`) — I need the complete request/response schemas for **both** `POST /lab-entries` and `POST /predict`, plus the approved error envelope `{error: {code, message, details[]}}` (Decision #9).
- **Validation rules table** — Min/max ranges for every numeric input (BUN, creatinine, potassium, age, hemoglobin, glucose, eGFR, systolic BP, UPCR). Without this, I cannot write boundary-value tests.
- **Multi-visit endpoint definitions** — The spec review flagged that `POST /api/v1/visits` and `GET /api/v1/visits` are undefined (Issue #4, HIGH severity). I need these contracts to test multi-lab entry flows.

### From Inga (UX/UI Designer)
- **Component specs with responsive breakpoints** — The spec review flagged missing responsive layouts (Issue #5, MEDIUM). I need breakpoint definitions to write responsive/accessibility tests.
- **Disclaimer placement spec** — RESOLVED: Sticky footer on mobile, inline on desktop (Decision #11). I need the exact breakpoint where behavior switches.
- **Chart rendering spec** — RESOLVED: True linear time x-axis (Decision #5), Visx SVG-based rendering (Decision #6).

### From Harshit (Frontend Developer)
- **Deployed frontend components** — I need running components to execute E2E tests and accessibility audits.
- **Component architecture** — I need to know the component tree to plan unit test boundaries vs. integration test boundaries.
- **Charting library** — RESOLVED: Visx (Decision #6). SVG-based rendering means I test SVG elements directly.

### From Husser (Product Manager)
- **Test vectors from Lee** — CRITICAL. 10-20 validated input/output pairs for the prediction engine before Sprint 1 (Decision #13). Without these, I can only test structural correctness, not clinical accuracy.
- **Acceptance criteria** on every Jira story — Some stories currently lack explicit AC. I need testable, binary pass/fail criteria.

### From Gay Mark (Database Engineer)
- **Database schema** (`/artifacts/db_schema.sql`) — I need table definitions, constraints, and relationships to write data validation tests and verify HIPAA-compliant storage (encryption at rest, RBAC, retention policies).
- **Guest session table design** — `guest_sessions` table structure for testing 24-hour purge logic (Decision #4).
- **Audit log schema** — Must confirm ON DELETE SET NULL behavior (Decision #14) so I can test audit record persistence after user deletion.
- **Migration strategy** — How guest data migrates to account data on registration.

### From Luca (CTO/Orchestrator)
- **Architecture document** — Infrastructure decisions (AWS vs. GCP, deployment topology) affect how I design integration tests and where I validate HIPAA controls.
- **CI/CD pipeline decisions** — I need to know the CI system to integrate automated test runs.

---

## 4. Dependencies Other Agents Have on Me

**All agents need my approval before completion.** This is a binding rule from CLAUDE.md.

Specifically:

| Agent | What They Need From Me |
|-------|------------------------|
| **Husser** | QA sign-off on PRD completeness — all acceptance criteria must be testable |
| **John Donaldson** | Validation that API contract is testable, error schemas are complete, and contract tests pass |
| **Gay Mark** | Verification that DB schema supports HIPAA requirements (encryption, audit trail, retention, ON DELETE SET NULL for audit log) |
| **Inga** | Accessibility audit results, responsive behavior validation, disclaimer visibility confirmation (sticky footer mobile, inline desktop) |
| **Harshit** | E2E test results, component test coverage report, visual regression results (SVG/Visx-based) |
| **Luca** | QA gate approvals at each sprint boundary; final QA sign-off before release |

### My QA Gate Authority

No story moves to "Done" without:
1. All automated tests passing (unit, integration, contract, E2E)
2. Manual test cases executed and documented
3. Coverage thresholds met
4. My explicit approval on the Jira card

---

## 5. Risks and Concerns

### HIGH RISK: eGFR Calculation Accuracy
- The prediction engine is proprietary and server-side only. I will NOT have access to calculation internals (NDA-restricted).
- **Testing approach:** Black-box testing with known input/output pairs provided by the client (Lee). Husser is coordinating delivery of 10-20 validated test vectors before Sprint 1 (Decision #13).
- **Risk mitigation:** Follow up with Husser on delivery timeline. If vectors are late, Sprint 1 cannot include prediction accuracy validation.
- **Concern:** Without test vectors, I can only test that the API returns structurally valid responses, not that the clinical predictions are correct. This is a patient safety issue.

### HIGH RISK: HIPAA Compliance Validation
- HIPAA is non-negotiable (storing lab data = PHI). The spec review confirms HIPAA BAA with hosting provider is required.
- I need to validate: AES-256 encryption at rest and in transit, audit logging for all PHI access, data retention/deletion policies, RBAC enforcement, guest session purge (24hr TTL per Decision #4), and magic link auth security.
- Guest data gets full HIPAA treatment (Decision #4) — no shortcuts for unauthenticated users.
- **Concern:** HIPAA compliance testing requires infrastructure to be provisioned. This cannot be fully validated in local/mock environments. I need a staging environment that mirrors production security controls.

### HIGH RISK: Magic Link Auth Security — RESOLVED (Decision #1)
- **Confirmed: Magic link only. No password-based auth.**
- Security test plan covers: token expiration, single-use enforcement, email delivery reliability, session management, token entropy, replay attack prevention, and timing attack resistance.
- ~~Password strength, bcrypt hashing, JWT lifecycle tests~~ — REMOVED.

### ~~MEDIUM RISK: PDF Output Verification~~ — DEFERRED (Decision #2)
- PDF export deferred to Phase 2b. Removed from MVP test plan.
- Placeholder retained in test strategy for Phase 2b planning.

### MEDIUM RISK: Accessibility for 60+ Patients
- The target demographic is elderly CKD patients. The proposal explicitly calls for "accessibility-first" design.
- WCAG 2.1 AA is the minimum standard. Key concerns: color contrast on chart lines (especially the light gray #AAAAAA for "no treatment"), touch target sizes on mobile (44px minimum), screen reader compatibility for SVG chart data (Visx), and keyboard navigation.
- The 4-column stat card grid will be problematic on mobile for users with low vision.

### MEDIUM RISK: Audit Log Integrity (Decision #14)
- ON DELETE SET NULL means audit records survive user deletion but lose the foreign key reference.
- I must test: (a) audit records exist after user deletion, (b) the user_id column is NULL, (c) the audit trail is still queryable and complete, (d) no orphan cleanup job accidentally purges these records.

### LOW RISK: Confidence Tier Transitions — RESOLVED (Decision #12)
- **Confirmed:** Tier 2 requires BOTH hemoglobin AND glucose. Adding only one does NOT upgrade.
- Explicit test cases written in Section 6 below.

---

## 6. Confirmed Tier Transition Test Cases

Per Decision #12, tier transitions follow these rules:

| Tier | Requirements |
|------|-------------|
| Tier 1 (Low confidence) | Required fields only: BUN, creatinine, potassium, age, sex |
| Tier 2 (Medium confidence) | Tier 1 + BOTH hemoglobin AND glucose |
| Tier 3 (High confidence) | Tier 2 + 3 or more visit dates with lab entries |

### Test Cases

**TC-TIER-01: Tier 1 baseline**
- Input: BUN=20, creatinine=1.2, potassium=4.5, age=65, sex=male
- Expected: Tier 1 badge, lower confidence messaging

**TC-TIER-02: Adding hemoglobin alone does NOT upgrade to Tier 2**
- Input: Tier 1 fields + hemoglobin=13.5 (no glucose)
- Expected: Remains Tier 1

**TC-TIER-03: Adding glucose alone does NOT upgrade to Tier 2**
- Input: Tier 1 fields + glucose=100 (no hemoglobin)
- Expected: Remains Tier 1

**TC-TIER-04: Adding BOTH hemoglobin AND glucose upgrades to Tier 2**
- Input: Tier 1 fields + hemoglobin=13.5 + glucose=100
- Expected: Tier 2 badge, medium confidence messaging, no unlock prompt

**TC-TIER-05: Tier 3 requires 3+ visit dates**
- Input: Tier 2 fields + 3 separate visit dates with lab entries
- Expected: Tier 3 badge, high confidence messaging, slope/trend tag with numeric value

**TC-TIER-06: Tier 2 with only 2 visit dates remains Tier 2**
- Input: Tier 2 fields + 2 visit dates
- Expected: Remains Tier 2, directional tag (improving/stable/declining) but no slope

**TC-TIER-07: Sex = "unknown" triggers lower confidence**
- Input: BUN=20, creatinine=1.2, potassium=4.5, age=65, sex=unknown
- Expected: Tier 1 with lower confidence indicator (per Decision #3)

**TC-TIER-08: Sex field is required — omission is rejected**
- Input: BUN=20, creatinine=1.2, potassium=4.5, age=65, sex=omitted
- Expected: Validation error, form does not submit

---

## 7. Contract Test Plan (Updated)

Per Decision #8, the predict endpoint is split into two separate concerns:

### 7a. POST /lab-entries
- **Purpose:** Store a patient's lab values (with visit date for multi-entry)
- **Contract tests:**
  - Valid payload with all required fields returns 201
  - Valid payload with optional fields (hemoglobin, glucose, etc.) returns 201
  - Missing required field returns 400 with error envelope `{error: {code, message, details[]}}`
  - Out-of-range values return 400 with field-level details array
  - Guest session token accepted (server-side guest data, Decision #4)
  - Authenticated user token accepted
  - Invalid/expired session returns 401

### 7b. POST /predict
- **Purpose:** Stateless computation — takes lab entry reference(s), returns prediction result
- **Contract tests:**
  - Valid single-entry prediction returns 200 with trajectory arrays and confidence tier
  - Valid multi-entry prediction (3+ visits) returns 200 with Tier 3, slope data
  - Prediction result is NOT stored (Decision #10) — no GET /predictions endpoint exists
  - Invalid lab entry reference returns 404
  - Error responses match approved envelope `{error: {code, message, details[]}}`

### 7c. Error Envelope Contract (Decision #9)
- Every 4xx/5xx response MUST match:
  ```json
  {
    "error": {
      "code": "string",
      "message": "string",
      "details": []
    }
  }
  ```
- Test: `code` is a machine-readable string (e.g., "VALIDATION_ERROR")
- Test: `message` is a human-readable string
- Test: `details` is an array (may be empty for non-validation errors)
- Test: For validation errors, `details[]` contains per-field error objects

---

## 8. Security Test Plan (Magic Link Auth — Decision #1)

Password-based auth tests are **removed**. The following replaces the previous security test plan:

### Magic Link Tests
- **Token expiration:** Token expires after configured TTL (e.g., 15 minutes). Verify expired token returns 401.
- **Single-use enforcement:** Token can only be used once. Second use returns 401 or 410.
- **Token entropy:** Token is cryptographically random, minimum 128 bits.
- **Email delivery:** Magic link email is sent within acceptable timeframe. Test with valid and invalid email addresses.
- **Rate limiting:** Excessive magic link requests from same email/IP are throttled.
- **Session management:** Successful magic link click creates a valid session. Session has configurable TTL. Session can be invalidated (logout).
- **Replay attack prevention:** Intercepted tokens cannot be replayed after use or expiration.
- **Timing attack resistance:** Token validation takes constant time regardless of validity.
- **HTTPS enforcement:** Magic link URLs use HTTPS only.

### Guest Session Security (Decision #4)
- Guest session data is server-side (not client-side).
- Guest data has 24hr TTL — test that purge job runs and deletes expired sessions.
- Guest data receives full HIPAA protections (encryption, audit logging).
- Guest-to-account migration preserves data integrity and transfers ownership atomically.

### Audit Log Tests (Decision #14)
- All PHI access generates an audit log entry.
- User deletion sets user_id to NULL in audit records (ON DELETE SET NULL).
- Audit records are queryable after user deletion.
- Audit log cannot be tampered with or deleted by application-level users.

---

## 9. Test Approach

### 9a. Testing Frameworks

| Layer | Framework | Rationale |
|-------|-----------|-----------|
| Frontend unit/component | Vitest + React Testing Library | Fast, native ESM support, aligns with Next.js 15 |
| Frontend E2E | Playwright | Cross-browser, mobile viewport emulation, accessibility via axe integration |
| Backend unit | pytest | Standard for FastAPI/Python |
| Backend integration | pytest + httpx (TestClient) | FastAPI's recommended async testing approach |
| API contract | Schemathesis or Dredd | Auto-generates tests from OpenAPI spec; validates request/response schemas |
| Accessibility | axe-core (via Playwright) + manual screen reader testing | Automated catches ~60% of WCAG issues; manual testing required for the rest |
| Visual regression | Playwright screenshot comparison (SVG/Visx) | Chart rendering must be pixel-stable across deployments. Visx outputs SVG — baselines use true linear time x-axis (Decision #5). |
| Load/performance | k6 or Locust | Validate prediction API response time under concurrent load (target: <2s for 100 concurrent users) |

### 9b. CI Integration Plan

- All tests run on every PR via GitHub Actions.
- Pipeline stages: lint -> unit tests -> integration tests -> contract tests -> E2E tests -> accessibility scan -> coverage report.
- PRs that fail any stage are blocked from merging.
- Coverage reports posted as PR comments for visibility.
- Nightly full regression run (including visual regression and load tests).

### 9c. Test Data Strategy

**Synthetic test data only.** No real patient data in any test environment.

| Data Type | Strategy |
|-----------|----------|
| Lab values | Fixtures covering: normal ranges, boundary values, out-of-range values, missing optional fields, all confidence tiers |
| User accounts | Factory-generated test users with deterministic IDs |
| Guest sessions | Generated with known session tokens for purge testing (24hr TTL per Decision #4) |
| Multi-visit data | Pre-built visit histories: 1 visit, 2 visits, 3+ visits with known slope expectations |
| eGFR trajectories | Mock API responses with known trajectory arrays for chart rendering validation |
| Tier transition data | Explicit fixtures for all 8 tier transition test cases (Section 6) |

**Critical:** Husser is coordinating with Lee to deliver 10-20 validated input/output pairs before Sprint 1 (Decision #13). This is my most important external dependency.

### 9d. Regression Approach

- Every bug fix requires a regression test before the fix is merged.
- Full regression suite runs nightly and before every release.
- Visual regression snapshots are updated only with explicit approval (to prevent silent chart rendering changes). Baselines assume linear time x-axis and SVG output from Visx.
- Contract tests run against the live staging API after every backend deployment.

### 9e. Critical E2E User Journeys (Updated)

These are the journeys that must pass before any release:

1. **First-time guest prediction** — Enter required fields (BUN, creatinine, potassium, age, sex) -> submit -> view chart with 4 trajectory lines (SVG/Visx), 4 stat cards, dialysis threshold, disclaimers visible (sticky footer on mobile, inline on desktop) -> confidence Tier 1 badge displayed.
2. **Tier upgrade flow** — Enter required fields -> view Tier 1 result -> add hemoglobin AND glucose -> resubmit -> view Tier 2 result with updated badge and no unlock prompt.
3. **Account creation via magic link** — Complete a prediction as guest -> see account creation prompt after chart renders (never before) -> enter email -> receive magic link -> click link -> verify session created -> verify guest data persists into account.
4. **Multi-visit entry** — Authenticated user -> enter second lab entry with visit_date -> see directional tag ("improving/stable/declining") -> enter third entry -> see slope tag with numeric trend and Tier 3 badge.
5. ~~**PDF download**~~ — **DEFERRED to Phase 2b** (Decision #2).
6. **Error handling** — Enter out-of-range values (negative creatinine, BUN of 500) -> see inline field-level error messages -> submit button disabled -> correct values -> submit succeeds. Verify error response matches approved envelope (Decision #9).
7. **Mobile responsive** — Complete full prediction flow on 375px viewport -> verify stat cards stack vertically, chart is usable, disclaimer is sticky footer (Decision #11), touch targets >= 44px.
8. **Guest data purge** — Create guest session -> wait for 24hr TTL expiration (simulated) -> verify data is purged -> verify audit log entry remains with NULL user_id (Decision #14).
9. **User deletion with audit persistence** — Create user -> perform actions that generate audit entries -> delete user -> verify audit records persist with NULL user_id (Decision #14).

---

## 10. Key QA Decisions Requiring Team Alignment

### 10a. Test Pyramid Strategy

I propose the following test distribution:

```
         /  E2E  \          ~10% of tests — critical user journeys only
        /----------\
       / Integration \      ~30% of tests — API contract, DB queries, auth flows
      /----------------\
     /    Unit Tests     \  ~60% of tests — components, utils, validation logic
    /____________________\
```

- **Unit tests** are fast, cheap, and catch regressions early. Every React component, every FastAPI endpoint handler, every validation function.
- **Integration tests** validate cross-boundary behavior: frontend-to-API, API-to-database, magic link auth flow end-to-end.
- **E2E tests** cover the 9 critical user journeys (see Section 9e). These are slow and brittle — keep the count low but the coverage high.

### 10b. Coverage Thresholds (Proposed)

| Layer | Minimum Coverage | Blocking? |
|-------|-----------------|-----------|
| Backend unit tests (FastAPI) | 90% line coverage | Yes — PR blocked |
| Frontend unit tests (React) | 85% line coverage | Yes — PR blocked |
| API contract tests | 100% of documented endpoints and error codes | Yes — PR blocked |
| E2E critical paths | 100% of defined critical journeys passing | Yes — release blocked |
| Accessibility (axe-core) | 0 critical/serious violations | Yes — release blocked |
| HIPAA checklist | 100% of items verified | Yes — release blocked |

### 10c. QA Gates Per Sprint

| Gate | When | What I Validate | Blocking? |
|------|------|-----------------|-----------|
| **Gate 0: Spec Review** | Before sprint starts | All stories have testable AC; spec gaps resolved | Yes |
| **Gate 1: Contract Lock** | After API contract published | Contract tests pass against mock server (both /lab-entries and /predict) | Yes |
| **Gate 2: Component Review** | After FE components built | Unit tests pass, accessibility scan clean | Yes |
| **Gate 3: Integration** | After FE/BE integration | Integration tests pass, E2E critical paths pass | Yes |
| **Gate 4: Pre-Release** | Before any deployment | Full regression suite, HIPAA checklist, manual exploratory testing | Yes |

### 10d. Blocking Conditions

A build is **blocked** (cannot advance to the next stage) if:
- Any unit test fails
- Any contract test fails (API response does not match documented schema for either endpoint)
- Any E2E critical path test fails
- Coverage drops below threshold
- Any critical/serious accessibility violation exists
- Any HIPAA checklist item is unverified
- Disclaimers are missing or modified from the required verbatim text
- Error responses do not match the approved envelope format (Decision #9)

---

## 11. Open Questions (Post-Meeting 1)

### Resolved at Meeting 1
- ~~Auth mechanism~~ — RESOLVED: Magic link only (Decision #1)
- ~~PDF scope~~ — RESOLVED: Deferred to Phase 2b (Decision #2)
- ~~Sex field required/optional~~ — RESOLVED: Required, three values (Decision #3)
- ~~Guest mode data retention~~ — RESOLVED: Server-side, 24hr TTL, full HIPAA (Decision #4)
- ~~Confidence tier transitions~~ — RESOLVED: Both hemoglobin AND glucose for Tier 2 (Decision #12)
- ~~Charting library~~ — RESOLVED: Visx (Decision #6)
- ~~Disclaimer placement~~ — RESOLVED: Sticky footer mobile, inline desktop (Decision #11)

### Still Open
1. **Staging environment:** When will a HIPAA-compliant staging environment be available? I cannot validate encryption, audit logging, or RBAC in local dev.
2. **UPCR unit field:** The spec review flagged that `upcr_unit` is missing from the API contract (Issue #11). John needs to add this before I can test proteinuria data integrity.
3. **Magic link token TTL:** What is the configured expiration time for magic link tokens? I need this to write expiration tests.
4. **Session TTL:** What is the session duration after magic link auth? Needed for session management tests.

---

## 12. Post-Meeting Action Items

| # | Action | Owner | Status | Dependency |
|---|--------|-------|--------|------------|
| 1 | Write tier transition test cases based on confirmed rules | Yuri | DONE (Section 6) | — |
| 2 | Prepare contract test scaffolding once John publishes OpenAPI spec | Yuri | WAITING | John's OpenAPI spec |
| 3 | Follow up with Husser on test vector delivery timeline (10-20 pairs from Lee) | Yuri | TODO | Husser + Lee |
| 4 | Rewrite security test plan for magic link auth | Yuri | DONE (Section 8) | — |
| 5 | Remove PDF verification from MVP test plan | Yuri | DONE | — |
| 6 | Update E2E journeys for magic link auth and remove PDF journey | Yuri | DONE (Section 9e) | — |
| 7 | Update contract test plan for two endpoints (lab-entries + predict) | Yuri | DONE (Section 7) | — |
| 8 | Add audit log persistence tests (ON DELETE SET NULL) | Yuri | DONE (Section 8, 9e) | Gay Mark's schema |
| 9 | Add guest data purge E2E test | Yuri | DONE (Section 9e) | Gay Mark's schema |

---

## 13. Summary: What I Need Before Parallel Drafting Begins

| Need | From | Blocking? | Status |
|------|------|-----------|--------|
| Finalized API contract with both endpoints + error envelope | John Donaldson | YES | WAITING |
| DB schema with HIPAA annotations + audit log ON DELETE SET NULL | Gay Mark | YES | WAITING |
| Validated input/output test vectors from Lee (10-20 pairs) | Husser (coordination) | YES | Husser coordinating — follow up |
| Responsive breakpoint definitions | Inga | NO — can draft tests with assumptions | WAITING |
| CI/CD pipeline + staging environment timeline | Luca | NO — can draft locally first | WAITING |
| Magic link token TTL and session TTL values | Luca / John | NO — can parameterize tests | OPEN QUESTION |
