# KidneyHood Lean Launch MVP PRD

**Version:** 2.0
**Date:** 2026-03-25
**Source:** CEO Test + Full Team Review
**Status:** Approved

> **Updated 2026-03-26:** Corrections from Lee's Server-Side Calculation Specification v1.0 applied — potassium removed from required inputs, dialysis threshold corrected to eGFR 12.

---

## Business Model

KidneyHood is a **lead generation tool**, not a patient portal. The eGFR prediction is the value hook: patients enter lab values, view their trajectory chart, and download a PDF. In doing so, they provide their name and email, opting into a warm email campaign. No data persists for the user. Return visitors start fresh.

This reframe drives every scope decision below.

---

## CEO Test Results

### Q1. Core Value Loop
**KEEP** -- The guest prediction loop is the entire product. Enter lab values, see chart, download PDF, done.

### Q2. Four Trajectory Lines
**KEEP** -- All four trajectories with distinct colors, dash patterns, and labels. Client requirement.

### Q3. Confidence Tiers
**SIMPLIFY** -- Required fields only (BUN, creatinine, age). No optional fields, no sex field, no tiers. Single confidence level.

### Q4. User Accounts
**SIMPLIFY** -- No accounts, no dashboards, no saved history. Magic link serves solely as bot protection and email capture.

### Q5. Auth Implementation
**SIMPLIFY** -- Clerk (passwordless magic link only). 15-minute expiry. Clerk webhook on `user.created` pipes leads to `leads` table. No custom token hashing, JWT rotation, or refresh tokens.

### Q6. Multi-Visit Tracking
**DEFER** -- No visit dates, no slope analysis, no historical entries.

### Q7. Chart Interactivity
**KEEP** -- Full interactive Variant A: tooltips, crosshairs, hover states.

### Q8. Stat Cards
**DEFER** -- No StatCardGrid, no UnlockPrompt. The chart speaks for itself.

### Q9. HIPAA Compliance
**DEFER** -- No PHI stored long-term. No AES-256/KMS, no RBAC database roles, no audit log, no purge cron, no HIPAA checklist gate, no breach notification procedure.

### Q10. Audit Logging
**DEFER** -- No audit log table or API. Deferred with HIPAA.

### Q11. Infrastructure
**SIMPLIFY** -- Railway for FastAPI + managed Postgres. Vercel for Next.js frontend. No AWS ECS/Fargate, no ALB, no CloudWatch.

### Q12. Staging Environment
**SIMPLIFY** -- Vercel preview deployments + Railway test database. No dedicated staging infrastructure.

### Q13. Test Strategy
**SIMPLIFY** -- Exhaustive prediction engine unit tests with golden-file boundary pairs. Two E2E tests (happy path + error path). axe-core with zero critical/serious violations. Single pre-release QA gate. No coverage thresholds, no Schemathesis, no visual regression.

### Q14. Visual Regression
**DEFER** -- Deferred with simplified test strategy.

### Q15. Remaining Features
- **PDF Export:** KEEP -- client requirement. Server-side via Playwright (headless Chromium).
- **Klaviyo integration:** DEFER
- **Geo-restriction:** DEFER
- **Rate limiting:** SIMPLIFY -- `slowapi` on `/auth/request-link` + `/predict` (Railway provides none natively)
- **CORS multi-domain:** SIMPLIFY -- localhost + one production domain
- **Pagination:** DEFER -- no stored entries
- **Account data retention:** DEFER -- no accounts

---

## Lean Launch Scope Matrix

| Keep | Defer | Simplify |
|------|-------|----------|
| Guest prediction form (3 required fields + name + email) | User accounts & dashboard | Auth: Clerk, magic link only, 15-min bot gate |
| All 4 trajectory lines (client req) | Multi-visit / slope analysis | Form: required fields only, no tiers, no sex field |
| Interactive chart -- Variant A (client req) | Stat cards / unlock prompts | Infra: Railway (backend) + Vercel (frontend) |
| PDF export via Playwright (client req) | HIPAA compliance apparatus | Staging: Vercel previews + Railway test DB |
| Prediction API endpoint (`POST /predict`) | Audit logging | Testing: exhaustive engine units + 2 E2E + axe-core |
| Basic disclaimers | Geo-restriction | CORS: localhost + 1 production domain |
| Email capture --> leads table --> CSV export | Klaviyo integration | Rate limiting: `slowapi` on key endpoints |
| Health endpoint | Pagination | |
| | Account data retention | |
| | Breach notification | |

---

## Architecture

### What Ships

```
User Flow:
  Landing page --> Enter email --> Magic link via Clerk (bot gate)
  --> Click link in email (deep-link buttons to Gmail/Outlook for 60+ users)
  --> Verified (15-min session, email pre-filled from Clerk)
  --> Enter name + 3 lab values --> POST /predict --> Interactive chart
  --> Download PDF --> Lead captured in DB for campaign

Frontend:  Next.js 15 on Vercel (Clerk Next.js SDK for auth)
Backend:   FastAPI on Railway (managed Postgres included)
Auth:      Clerk -- magic link only, webhook pipes user.created --> leads table
PDF:       Playwright (headless Chromium, server-side) -- renders exact React/Visx SVG
```

### Endpoints (Reduced from 12 to 5)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/request-link` | None | Send magic link (Clerk handles) |
| POST | `/auth/verify` | None | Validate token (Clerk handles) |
| POST | `/predict` | Clerk JWT | Run prediction engine, capture lead, return 4 trajectories |
| POST | `/predict/pdf` | Clerk JWT | Re-run prediction engine, render chart via Playwright, return PDF |
| GET | `/health` | None | Infrastructure health check |

**API design notes** (from John Donaldson's review):
- `/predict` request body is a flat object -- no `oneOf`, no arrays (guest-only, single input)
- Lead capture happens inside the `/predict` handler -- no separate call
- `/predict/pdf` re-runs the engine (stateless) rather than accepting results as input
- `GuestSession` cookie scheme removed entirely -- no persistence needed
- Custom rate-limit headers dropped; `slowapi` middleware only

### Database (Reduced from 5 Tables to 1 + Clerk)

| Table | Purpose |
|-------|---------|
| `leads` | name, email, lab values submitted, timestamp -- feeds email campaign via CSV export |
| Clerk managed | Auth state managed entirely by Clerk (no local auth tables) |

No `users`, `lab_entries`, `magic_link_tokens`, `guest_sessions`, or `audit_log` tables.

### Components (~21, Reduced from ~40)

**Form:** PredictionForm, NumberInput (x3), NameInput, EmailInput, FormErrorSummary
**Chart:** PredictionChart, TrajectoryLines, PhaseBands, DialysisThreshold, Tooltips, Crosshair, ChartAxes, EndOfLineLabels, AccessibleDataTable, LoadingSkeleton
**Results:** ChartContainer, PDFDownloadButton, DisclaimerBlock
**Layout:** Header, Footer
**Auth:** MagicLinkForm, MagicLinkSent (with deep-link email buttons), VerifyHandler

---

## Ticket Impact

| Metric | Original (PRD v2) | After CEO Test | Reduction |
|--------|-------------------|----------------|-----------|
| Jira tickets | 89 | ~20-25 | ~75% |
| Sprints | 5 (Sprint 0-4) | 2 | 60% |
| API endpoints | 12 | 5 | ~58% |
| DB tables | 5 | 1 + Clerk | ~80% |
| Frontend components | ~40 | ~21 | ~48% |
| Epics | 4 + infra | 2 (Form+Chart, PDF+Polish) | 50% |

---

## Test Strategy (Revised per Yuri)

### Non-Negotiables
1. **Prediction engine unit tests** -- Exhaustive boundary values for all 4 inputs, all 4 trajectory outputs, edge cases, and golden-file test pairs. This is the client's IP.
2. **Two E2E tests** -- Happy path (form --> predict --> chart --> PDF download) and error path (bad input --> graceful error --> lead not lost).
3. **axe-core** -- Zero critical/serious violations on all pages. Target demographic is 60+ CKD patients.

### Single Pre-Release QA Gate
Five checkpoints in one gate (replaces 5 gates per sprint):
1. All prediction engine unit tests pass
2. Both E2E journeys pass
3. axe-core clean
4. Clerk auth flow works end-to-end
5. PDF renders correctly with all 4 trajectories

### Quality Risks to Monitor
- Clerk misconfiguration (JWT verification on FastAPI must be scoped to Sprint 1)
- No monitoring/alerting for silent production failures (add in Phase 2)
- Single confidence level may be less informative on edge-case inputs

---

## Email Campaign Integration (per Husser)

**Launch:** Leads stored in `leads` table. Manual CSV export weekly. No automation.

**Rationale:** The email provider, volume, and funnel conversion rate are all unknown. Premature automation wastes engineering days to save 10 minutes per week.

**Phase 2:** Add webhook or direct API integration once the provider is chosen and the funnel is validated.

---

## UX Flow (per Inga)

### Simplified User Journey
```
Landing --> Enter email --> Magic link sent (deep-link buttons: "Open Gmail" / "Open Outlook")
--> Click link --> Auto-redirect, verified --> Form (name + 3 lab values, email pre-filled)
--> Submit --> Interactive chart (4 trajectories) + PDF download button + disclaimer
```

### UX Draft Impact
| Draft | Revision Needed |
|-------|-----------------|
| `user-flows.md` | Major -- 5 of 8 flows are dead |
| `wireframes.md` | Moderate -- remove 3 screens, simplify form + results |
| `component-specs.md` | Moderate -- remove ~8 components, add 2 (deep-link buttons, PDF button) |
| `design-tokens.md` | None |
| `chart-specs.md` | Minor -- remove stat card interaction |
| `accessibility-plan.md` | Minor -- remove deferred-feature refs; core standards unchanged |

### Key UX Decision
Magic link adds friction for 60+ users. Mitigation: deep-link buttons to email apps on the confirmation screen, plus auto-redirect on magic link click with zero extra steps.

---

## Deferred Scope (Phase 2 Backlog)

These items are not deleted. They move to a Phase 2 epic for future development.

| Feature | Reason for Deferral |
|---------|---------------------|
| User accounts & dashboard | Not needed for lead gen model |
| Multi-visit tracking & slope | Retention feature, not launch feature |
| Confidence tiers (Tier 2, 3) | Optional fields not needed for MVP prediction |
| Stat cards & unlock prompts | Chart is sufficient without tiers |
| HIPAA compliance suite | No long-term PHI storage in lead gen model |
| Audit logging | Deferred with HIPAA |
| AWS ECS/Fargate + RDS/KMS | Overkill for MVP; simpler hosting sufficient |
| Dedicated staging environment | Preview deployments sufficient |
| Full test pyramid (90%/85% coverage) | Critical-path testing sufficient for launch |
| Visual regression testing | Chart will change in early iterations |
| Klaviyo integration | Wire up campaign tool later |
| Geo-restriction | Not blocking for launch |
| Pagination | No stored entries to paginate |
| Monitoring / alerting | Add once product proves value |

---

## Resolved Decisions (Team Review)

| # | Decision | Owner | Resolution |
|---|----------|-------|------------|
| 1 | Backend hosting | Luca (CTO) | **Railway** -- warm instances, 90s deploys, managed Postgres |
| 2 | Auth provider | Luca (CTO) | **Clerk** -- magic link only, Next.js SDK, webhook for leads |
| 3 | PDF generation | John Donaldson + Brad | **Playwright** -- headless Chromium, exact SVG fidelity |
| 4 | Chart feasibility | Harshit (FE) | **Confirmed** -- Visx Variant A, 2-3 days, no blockers |
| 5 | Test strategy | Yuri (QA) | **Accepted** -- 3 additions (boundary tests, error E2E, axe-core) |
| 6 | Email campaign | Husser (PM) | **Leads table + CSV export** -- no automation at launch |
| 7 | UX flow | Inga (UX) | **Simplified** -- magic link --> form --> chart --> PDF |
| 8 | Rate limiting | Luca (CTO) | **slowapi** on `/auth/request-link` + `/predict` |
