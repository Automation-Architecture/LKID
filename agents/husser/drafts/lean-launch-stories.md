# KidneyHood Lean Launch — User Stories

**Author:** Husser (Product Manager)
**Date:** 2026-03-25
**Source:** Lean Launch Profile v2 (approved)
**Status:** Draft — Pending CTO + QA review
**Total Stories:** 24 across 5 epics, 2 sprints

---

## Epic 1: Auth & Lead Capture

### LEAN-001: Clerk Project Setup & Configuration

**Title:** Configure Clerk for magic-link-only authentication

**Story:** As a developer, I want Clerk configured with magic-link-only passwordless auth so that the app has a working auth provider from day one.

**Acceptance Criteria:**
- [ ] Clerk project created with magic link as the sole auth method (no passwords, no social logins)
- [ ] 15-minute magic link expiry configured
- [ ] Clerk Next.js SDK installed and middleware configured for protected routes
- [ ] Environment variables documented for both Vercel (frontend) and Railway (backend)
- [ ] Clerk JWT verification working on FastAPI side (JWKS endpoint configured)

**Owner:** `agent:harshit` (frontend SDK), `agent:john-donaldson` (JWT verification on FastAPI)
**Co-owner:** `agent:luca` (infrastructure coordination)
**Dependencies:** None — Sprint 1 foundation
**Sprint:** 1

---

### LEAN-002: Magic Link Request Form

**Title:** Build magic link email entry form

**Story:** As a visitor, I want to enter my email address and receive a magic link so that I can verify myself as a real person (not a bot) before using the prediction tool.

**Acceptance Criteria:**
- Given I am on the landing page
- When I enter a valid email address and submit
- Then Clerk sends a magic link to that email
- And I see a "Magic Link Sent" confirmation screen with deep-link buttons ("Open Gmail" / "Open Outlook")
- Given I enter an invalid email format
- When I submit
- Then I see an inline validation error and the form is not submitted

**Owner:** `agent:harshit`
**Co-owner:** `agent:inga` (UX specs for MagicLinkForm + MagicLinkSent screens)
**Dependencies:** LEAN-001
**Sprint:** 1

---

### LEAN-003: Magic Link Verification & Redirect

**Title:** Handle magic link click and auto-redirect to prediction form

**Story:** As a visitor who clicked the magic link in my email, I want to be automatically verified and redirected to the prediction form so that the process is seamless with zero extra steps.

**Acceptance Criteria:**
- Given I clicked a valid magic link within 15 minutes
- When the verification page loads
- Then Clerk verifies my token, creates a session, and I am auto-redirected to the prediction form with my email pre-filled
- Given I clicked an expired magic link (>15 minutes)
- When the verification page loads
- Then I see a friendly error message with a "Resend Magic Link" button
- Given I click a previously used magic link
- When the verification page loads
- Then I see an error message indicating the link has already been used

**Owner:** `agent:harshit`
**Dependencies:** LEAN-001, LEAN-002
**Sprint:** 1

---

### LEAN-004: Clerk Webhook — Lead Capture to Database

**Title:** Pipe Clerk `user.created` webhook to leads table

**Story:** As the business, I want every verified user's email automatically captured in the leads database so that we can run email campaigns without any manual data entry.

**Acceptance Criteria:**
- Given a new user completes magic link verification via Clerk
- When Clerk fires the `user.created` webhook
- Then a new row is inserted into the `leads` table with `email` and `created_at`
- And the webhook endpoint returns 200 to Clerk
- Given the webhook receives a duplicate email
- When processing
- Then it upserts (does not create a duplicate row) and returns 200
- Given the webhook receives an invalid payload
- When processing
- Then it returns 400 and logs the error

**Owner:** `agent:john-donaldson` (webhook endpoint), `agent:gay-mark` (leads table DDL)
**Dependencies:** LEAN-001, LEAN-005
**Sprint:** 1

---

### LEAN-005: Leads Table & Database Setup

**Title:** Create leads table on Railway managed Postgres

**Story:** As the business, I want a `leads` table in a managed Postgres database so that captured emails and prediction data are stored for campaign use.

**Acceptance Criteria:**
- [ ] Railway managed Postgres provisioned and connected to FastAPI
- [ ] `leads` table created with columns: `id` (UUID PK), `name` (VARCHAR, nullable), `email` (VARCHAR, NOT NULL), `bun` (NUMERIC, nullable), `creatinine` (NUMERIC, nullable), `potassium` (NUMERIC, nullable), `age` (INTEGER, nullable), `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- [ ] Unique constraint on `email` to support upsert behavior
- [ ] Alembic migration script for the `leads` table
- [ ] Connection string stored as Railway environment variable (not in code)

**Owner:** `agent:gay-mark`
**Co-owner:** `agent:luca` (Railway provisioning)
**Dependencies:** None — Sprint 1 foundation
**Sprint:** 1

---

### LEAN-006: Lead Data Enrichment on Prediction

**Title:** Write name and lab values to leads table when prediction is submitted

**Story:** As the business, I want each prediction submission to update the user's lead record with their name and lab values so that the leads table contains actionable data for outreach.

**Acceptance Criteria:**
- Given a verified user submits a prediction
- When the `/predict` endpoint processes the request
- Then the `leads` row matching the user's email is updated with `name`, `bun`, `creatinine`, `potassium`, and `age`
- Given the user submits multiple predictions
- When each prediction is processed
- Then the leads row is updated with the most recent values (last write wins)

**Owner:** `agent:john-donaldson`
**Dependencies:** LEAN-004, LEAN-005, LEAN-010
**Sprint:** 1

---

## Epic 2: Prediction Engine & API

### LEAN-007: FastAPI Project Setup on Railway

**Title:** Bootstrap FastAPI project with Railway deployment

**Story:** As a developer, I want a FastAPI project deployed on Railway with managed Postgres so that the backend is operational for all API development.

**Acceptance Criteria:**
- [ ] FastAPI project scaffolded with Python 3.11+, `pyproject.toml`, and dependency management
- [ ] Railway service created and auto-deploys from `main` branch
- [ ] Deploy time under 90 seconds (Railway target)
- [ ] CORS configured for `localhost:3000` and one production domain
- [ ] Environment variables configured on Railway (DB connection, Clerk secrets)

**Owner:** `agent:john-donaldson`
**Co-owner:** `agent:luca` (Railway setup, architecture decisions)
**Dependencies:** None — Sprint 1 foundation
**Sprint:** 1

---

### LEAN-008: Health Endpoint

**Title:** Implement `GET /health` endpoint

**Story:** As an operator, I want a health check endpoint so that Railway and monitoring tools can verify the API is running.

**Acceptance Criteria:**
- Given the API is running
- When I send `GET /health`
- Then I receive `200 OK` with `{"status": "healthy"}`
- Given the database is unreachable
- When I send `GET /health`
- Then I receive `503 Service Unavailable` with `{"status": "unhealthy", "detail": "database"}`

**Owner:** `agent:john-donaldson`
**Dependencies:** LEAN-007
**Sprint:** 1

---

### LEAN-009: Prediction Engine Integration

**Title:** Integrate Lee's proprietary rules engine into FastAPI

**Story:** As the system, I want the deterministic prediction engine embedded in the FastAPI backend so that it can compute 4 eGFR trajectories from a patient's lab values.

**Acceptance Criteria:**
- [ ] Rules engine integrated as a Python module inside FastAPI (not a microservice)
- [ ] Engine accepts 4 inputs: BUN, creatinine, potassium, age
- [ ] Engine returns 4 trajectory arrays (one per management scenario), each with eGFR values over time
- [ ] Engine coefficients are never exposed to the client, never logged, never in error responses
- [ ] Engine is stateless — same inputs always produce same outputs (deterministic)
- [ ] Input validation rejects out-of-range values before engine execution

**Owner:** `agent:john-donaldson`
**Co-owner:** `agent:luca` (rules engine source coordination with Lee)
**Dependencies:** LEAN-007
**Sprint:** 1

---

### LEAN-010: Predict Endpoint

**Title:** Implement `POST /predict` endpoint

**Story:** As a verified user, I want to submit my lab values and receive 4 eGFR trajectory predictions so that I can visualize my kidney health outlook.

**Acceptance Criteria:**
- Given I am authenticated via Clerk JWT
- When I POST to `/predict` with `{"name": "...", "bun": ..., "creatinine": ..., "potassium": ..., "age": ...}`
- Then I receive 200 with 4 trajectory arrays, each containing eGFR values over time
- And my lead record is updated with name and lab values (LEAN-006)
- Given I submit values outside valid ranges
- When the request is processed
- Then I receive 422 with a standardized error envelope: `{"error": {"code": "VALIDATION_ERROR", "message": "...", "details": [...]}}`
- Given I submit without a valid Clerk JWT
- When the request is processed
- Then I receive 401 Unauthorized
- Request body is a flat JSON object — no `oneOf`, no arrays

**Owner:** `agent:john-donaldson`
**Dependencies:** LEAN-001, LEAN-009
**Sprint:** 1

---

## Epic 3: Interactive Chart & Form

### LEAN-011: Prediction Form — 4 Lab Value Fields

**Title:** Build the prediction form with 4 required lab value inputs

**Story:** As a verified user, I want to enter my BUN, creatinine, potassium, and age values in a clear form so that I can submit them for prediction.

**Acceptance Criteria:**
- [ ] Form has 4 NumberInput fields: BUN, creatinine, potassium, age
- [ ] Each field has a label, placeholder with expected range, and units where applicable
- [ ] Client-side validation matches API validation ranges exactly
- [ ] Inline error messages appear on blur for out-of-range values
- [ ] Tab order follows logical field sequence
- [ ] All inputs have minimum font size 16px (prevents iOS zoom)
- [ ] Touch targets are minimum 44px

**Owner:** `agent:harshit`
**Co-owner:** `agent:inga` (component specs, design tokens)
**Dependencies:** LEAN-003 (user must be verified to see the form)
**Sprint:** 1

---

### LEAN-012: Prediction Form — Name Input & Email Pre-fill

**Title:** Add name field and pre-fill email from Clerk session

**Story:** As a verified user, I want my email pre-filled from my Clerk session and a name field to enter my name so that the form captures my identity for the lead record without extra effort.

**Acceptance Criteria:**
- Given I am on the prediction form after magic link verification
- When the form loads
- Then the email field is pre-filled from my Clerk session and read-only
- And a name text input is present (required)
- Given I try to submit without entering my name
- When I click submit
- Then I see a validation error on the name field

**Owner:** `agent:harshit`
**Dependencies:** LEAN-003, LEAN-011
**Sprint:** 1

---

### LEAN-013: Form Submission & API Integration

**Title:** Connect prediction form to POST /predict

**Story:** As a verified user, I want to submit the prediction form and see my results so that I can understand my kidney health trajectory.

**Acceptance Criteria:**
- Given I have filled in all required fields with valid values
- When I click "Get My Prediction"
- Then the form sends a POST request to `/predict` with Clerk JWT in the Authorization header
- And a loading skeleton is displayed while waiting for the response
- And on success, I am routed to the results page with chart data
- Given the API returns a validation error (422)
- When the response is received
- Then error details are mapped to the corresponding form fields
- Given the API returns a server error (500)
- When the response is received
- Then a user-friendly error message is displayed with a "Try Again" option

**Owner:** `agent:harshit`
**Dependencies:** LEAN-010, LEAN-011, LEAN-012
**Sprint:** 1

---

### LEAN-014: Interactive eGFR Trajectory Chart

**Title:** Build the Visx chart displaying 4 trajectory lines

**Story:** As a verified user who submitted my lab values, I want to see an interactive chart showing 4 possible eGFR trajectories so that I can understand how my kidney function may change under different scenarios.

**Acceptance Criteria:**
- [ ] Chart renders 4 trajectory lines with distinct colors and dash patterns
- [ ] Dialysis threshold line displayed at eGFR 15
- [ ] CKD phase bands shown as background fills
- [ ] End-of-line labels for each trajectory with 15px collision avoidance
- [ ] Chart axes are clearly labeled (time in months on X, eGFR on Y)
- [ ] Chart is responsive via `@visx/responsive` ParentSize (mobile, tablet, desktop)
- [ ] Accessible data table alternative provided for screen readers

**Owner:** `agent:harshit`
**Co-owner:** `agent:inga` (chart specs, color palette, line patterns)
**Dependencies:** LEAN-013 (needs prediction data to render)
**Sprint:** 1

---

### LEAN-015: Chart Interactivity — Tooltips, Crosshairs, Hover

**Title:** Add interactive features to the eGFR chart (Variant A)

**Story:** As a verified user viewing my trajectory chart, I want to hover over data points to see exact values in tooltips and a crosshair so that I can explore the data in detail.

**Acceptance Criteria:**
- Given I am viewing the trajectory chart on desktop
- When I hover over a data point on any trajectory line
- Then a tooltip displays the exact eGFR value, time point, and trajectory label
- And a vertical crosshair follows my cursor across the X axis
- Given I am viewing the chart on a touch device
- When I tap a data point
- Then the tooltip appears for that point
- Given I move my cursor away from the chart area
- When the cursor exits
- Then the tooltip and crosshair disappear

**Owner:** `agent:harshit`
**Co-owner:** `agent:inga` (interaction specs)
**Dependencies:** LEAN-014
**Sprint:** 2

---

### LEAN-016: Results Page Layout

**Title:** Build the results page with chart, disclaimer, and PDF button

**Story:** As a verified user, I want to see my prediction chart on a well-organized results page with a disclaimer and download option so that I can understand and save my results.

**Acceptance Criteria:**
- [ ] Results page displays: ChartContainer (with the Visx chart), DisclaimerBlock, and PDFDownloadButton
- [ ] DisclaimerBlock is visible without scrolling on desktop; sticky collapsed footer on mobile (expandable on tap)
- [ ] Layout is responsive across mobile (<768px), tablet (768-1024px), and desktop (>1024px)
- [ ] Content max-width is 960px, centered
- [ ] Header and Footer are present on the results page

**Owner:** `agent:harshit`
**Co-owner:** `agent:inga` (wireframes, layout specs)
**Dependencies:** LEAN-014
**Sprint:** 2

---

## Epic 4: PDF Export

### LEAN-017: PDF Generation Endpoint

**Title:** Implement `POST /predict/pdf` with Playwright server-side rendering

**Story:** As a verified user, I want to download a PDF of my prediction chart so that I can share it with my doctor or keep it for my records.

**Acceptance Criteria:**
- Given I am authenticated via Clerk JWT
- When I POST to `/predict/pdf` with my lab values
- Then the engine re-runs the prediction (stateless)
- And Playwright renders the React/Visx chart to headless Chromium
- And I receive a PDF file with all 4 trajectory lines rendered correctly
- And the PDF includes the disclaimer text
- Given I submit without a valid Clerk JWT
- When the request is processed
- Then I receive 401 Unauthorized
- Given I submit invalid lab values
- When the request is processed
- Then I receive 422 with a standardized error envelope

**Owner:** `agent:john-donaldson`
**Co-owner:** `agent:harshit` (chart rendering template for Playwright)
**Dependencies:** LEAN-009, LEAN-014 (needs working engine and chart component)
**Sprint:** 2

---

### LEAN-018: PDF Download Button

**Title:** Add PDF download button to results page

**Story:** As a verified user viewing my prediction results, I want to click a "Download PDF" button so that I can save a copy of my chart.

**Acceptance Criteria:**
- Given I am on the results page with a rendered chart
- When I click "Download PDF"
- Then a request is sent to `POST /predict/pdf` with my current lab values and Clerk JWT
- And a loading indicator appears on the button
- And the PDF downloads automatically to my device
- Given the PDF generation fails
- When the error response is received
- Then I see a user-friendly error message with a "Try Again" option
- The button is accessible (keyboard-focusable, labeled for screen readers)

**Owner:** `agent:harshit`
**Dependencies:** LEAN-016, LEAN-017
**Sprint:** 2

---

## Epic 5: Polish & QA

### LEAN-019: Disclaimer Block Implementation

**Title:** Add medical and legal disclaimers to the prediction results

**Story:** As a user viewing prediction results, I want to see clear medical disclaimers so that I understand this tool does not replace professional medical advice.

**Acceptance Criteria:**
- [ ] DisclaimerBlock displays on the results page below the chart
- [ ] Disclaimer text includes: "This tool is for informational purposes only. It does not constitute medical advice. Consult your healthcare provider for medical decisions."
- [ ] On desktop: disclaimer is inline and fully visible
- [ ] On mobile: disclaimer is a sticky collapsed single-line footer, expandable on tap
- [ ] Disclaimer text is accessible (sufficient contrast, readable at default font size)

**Owner:** `agent:harshit`
**Co-owner:** `agent:inga` (disclaimer copy and layout specs)
**Dependencies:** LEAN-016
**Sprint:** 2

---

### LEAN-020: Rate Limiting with slowapi

**Title:** Add rate limiting to auth and predict endpoints

**Story:** As the system, I want rate limiting on key endpoints so that the API is protected from abuse and excessive requests.

**Acceptance Criteria:**
- Given a client sends requests to `POST /auth/request-link`
- When the rate limit is exceeded
- Then subsequent requests receive 429 Too Many Requests with a `Retry-After` header
- Given a client sends requests to `POST /predict` or `POST /predict/pdf`
- When the rate limit is exceeded
- Then subsequent requests receive 429 Too Many Requests with a `Retry-After` header
- [ ] `slowapi` middleware installed and configured on FastAPI
- [ ] Rate limits applied to `/auth/request-link`, `/predict`, and `/predict/pdf`
- [ ] No custom rate-limit headers — `slowapi` defaults only

**Owner:** `agent:john-donaldson`
**Dependencies:** LEAN-007, LEAN-010
**Sprint:** 2

---

### LEAN-021: Accessibility Audit — axe-core

**Title:** Achieve zero critical/serious axe-core violations on all pages

**Story:** As a CKD patient aged 60+, I want the application to be fully accessible so that I can use it regardless of visual or motor impairments.

**Acceptance Criteria:**
- [ ] axe-core scans run on all pages: landing, magic link form, magic link sent, prediction form, results page
- [ ] Zero critical violations
- [ ] Zero serious violations
- [ ] All touch targets are minimum 44px (WCAG 2.5.5)
- [ ] All form inputs have associated labels
- [ ] Chart has an accessible data table alternative
- [ ] Color contrast meets WCAG 2.1 AA on all text
- [ ] Violations documented and remediated before pre-release gate

**Owner:** `agent:yuri`
**Co-owner:** `agent:harshit` (remediation), `agent:inga` (design compliance)
**Dependencies:** LEAN-016, LEAN-018 (all pages must be built)
**Sprint:** 2

---

### LEAN-022: Prediction Engine Unit Tests — Golden-File Boundary Pairs

**Title:** Write exhaustive prediction engine boundary tests with golden-file pairs

**Story:** As the team, I want exhaustive unit tests for the prediction engine so that we can guarantee clinical accuracy and catch regressions on every commit.

**Acceptance Criteria:**
- [ ] Golden-file test pairs: known inputs mapped to expected outputs (provided by Lee or derived from validated engine behavior)
- [ ] Boundary tests for all 4 inputs at minimum, maximum, and edge-case values:
  - BUN: lowest valid, highest valid, just below range, just above range
  - Creatinine: lowest valid, highest valid, boundary values
  - Potassium: lowest valid, highest valid, boundary values
  - Age: lowest valid (18?), highest valid, boundary values
- [ ] All 4 trajectory outputs validated for each test case
- [ ] Edge cases: values at exact boundaries, floating-point precision cases
- [ ] Tests are deterministic — same inputs always produce same expected outputs
- [ ] Test suite runs in CI and blocks merges on failure

**Owner:** `agent:yuri`
**Co-owner:** `agent:john-donaldson` (engine access, test vector coordination)
**Dependencies:** LEAN-009 (engine must be integrated)
**Sprint:** 2

---

### LEAN-023: E2E Tests — Happy Path & Error Path

**Title:** Write two E2E tests covering the full user journey

**Story:** As the team, I want end-to-end tests for the critical user journeys so that we can verify the entire system works together before release.

**Acceptance Criteria:**

**Happy path E2E:**
- Given I am a new user on the landing page
- When I enter my email, click the magic link, fill in name + 4 lab values, and submit
- Then I see the interactive chart with 4 trajectories
- And I can download the PDF
- And my lead is captured in the database

**Error path E2E:**
- Given I am a verified user on the prediction form
- When I enter out-of-range lab values and submit
- Then I see field-level validation errors
- And no prediction is made
- And my lead record is not corrupted (email still present from Clerk webhook)
- And I can correct the values and successfully resubmit

**Additional requirements:**
- [ ] Tests run in Playwright
- [ ] Tests use synthetic data only (no real patient data)
- [ ] Tests run in CI and block merges on failure

**Owner:** `agent:yuri`
**Co-owner:** `agent:harshit` (test environment support)
**Dependencies:** LEAN-017, LEAN-018 (full flow must be built including PDF)
**Sprint:** 2

---

### LEAN-024: Pre-Release QA Gate

**Title:** Execute the single pre-release QA gate with 5 checkpoints

**Story:** As the team, I want a single pre-release QA gate verifying all quality criteria so that we ship with confidence.

**Acceptance Criteria:**

All 5 checkpoints must pass:
1. **All prediction engine unit tests pass** — zero failures in the golden-file boundary test suite (LEAN-022)
2. **Both E2E journeys pass** — happy path and error path (LEAN-023)
3. **axe-core clean** — zero critical/serious violations on all pages (LEAN-021)
4. **Clerk auth flow works end-to-end** — magic link send, verify, JWT on API, webhook to leads table
5. **PDF renders correctly** — all 4 trajectory lines visible, disclaimer present, file downloads successfully

**Gate outcome:**
- [ ] All 5 checkpoints documented with pass/fail evidence
- [ ] Any failure blocks release until resolved and re-verified
- [ ] QA sign-off recorded in artifacts

**Owner:** `agent:yuri`
**Co-owner:** All agents (remediation of failures in their areas)
**Dependencies:** LEAN-021, LEAN-022, LEAN-023 (all test stories must be complete)
**Sprint:** 2

---

## Dependency Map

```
Sprint 1 Foundation (no dependencies — start immediately):
  LEAN-001  Clerk Setup
  LEAN-005  Leads Table + Railway DB
  LEAN-007  FastAPI Setup on Railway

Sprint 1 Build Chain:
  LEAN-001 → LEAN-002 → LEAN-003 → LEAN-011 → LEAN-012 → LEAN-013
  LEAN-001 → LEAN-004
  LEAN-005 → LEAN-004 → LEAN-006
  LEAN-007 → LEAN-008
  LEAN-007 → LEAN-009 → LEAN-010 → LEAN-013 → LEAN-014

Sprint 2 Build Chain:
  LEAN-014 → LEAN-015 (chart interactivity)
  LEAN-014 → LEAN-016 → LEAN-018 (results page → PDF button)
  LEAN-014 → LEAN-016 → LEAN-019 (results page → disclaimers)
  LEAN-009 + LEAN-014 → LEAN-017 → LEAN-018 (PDF endpoint → PDF button)
  LEAN-007 + LEAN-010 → LEAN-020 (rate limiting)

Sprint 2 QA Chain:
  LEAN-009 → LEAN-022 (engine unit tests)
  LEAN-016 + LEAN-018 → LEAN-021 (accessibility audit)
  LEAN-017 + LEAN-018 → LEAN-023 (E2E tests)
  LEAN-021 + LEAN-022 + LEAN-023 → LEAN-024 (pre-release gate)
```

## Critical Path

```
LEAN-001 → LEAN-003 → LEAN-011 → LEAN-013 → LEAN-014 → LEAN-017 → LEAN-023 → LEAN-024
     ↑                                ↑
LEAN-007 → LEAN-009 → LEAN-010 ──────┘
```

The critical path runs through: Clerk setup → verified user → prediction form → API integration → chart rendering → PDF generation → E2E tests → QA gate.

---

## Sprint Summary

| Sprint | Stories | IDs | Focus |
|--------|---------|-----|-------|
| Sprint 1 | 14 | LEAN-001 through LEAN-014 | Auth, DB, API, form, chart — end-to-end prediction working |
| Sprint 2 | 10 | LEAN-015 through LEAN-024 | Chart polish, PDF, disclaimers, rate limiting, accessibility, testing, QA gate |

## Agent Workload

| Agent | Owned | Co-owned | Stories |
|-------|-------|----------|---------|
| `agent:harshit` | 10 | 4 | 001, 002, 003, 011, 012, 013, 014, 015, 016, 018 (owned); 017, 019, 021, 023 (co-owned) |
| `agent:john-donaldson` | 7 | 2 | 004, 007, 008, 009, 010, 017, 020 (owned); 001, 022 (co-owned) |
| `agent:gay-mark` | 1 | 0 | 005 (owned) |
| `agent:inga` | 0 | 5 | 002, 011, 014, 016, 019, 021 (co-owned) |
| `agent:yuri` | 3 | 1 | 021, 022, 023, 024 (owned/co-owned) |
| `agent:luca` | 0 | 3 | 001, 005, 007 (co-owned) |
| `agent:husser` | 0 | 0 | Story author; available for scope clarification |
