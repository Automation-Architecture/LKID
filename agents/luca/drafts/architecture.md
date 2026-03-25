# KidneyHood Architecture Document

**Author:** Luca (CTO/Orchestrator)
**Date:** 2026-03-25
**Phase:** Discovery — Post-Meeting 1
**Status:** DRAFT — pending Meeting 2 approval

---

## 1. System Overview

```
+------------------+         +-------------------+         +------------------+
|                  |  HTTPS  |                   |         |                  |
|  Client          +-------->+  API              +-------->+  Database        |
|  (Next.js 15)    |  JSON   |  (FastAPI)        |   SQL   |  (PostgreSQL)    |
|  Vercel          |<--------+  AWS ECS/Fargate  |<--------+  AWS RDS         |
|                  |         |                   |         |  KMS-encrypted   |
+------------------+         +---------+---------+         +------------------+
                                       |
                                       | (embedded)
                                       v
                             +-------------------+
                             |  Rules Engine      |
                             |  (Lee's IP)        |
                             |  Deterministic     |
                             |  Proprietary       |
                             +-------------------+
```

### Key Principles

1. **Contract-first development.** The OpenAPI 3.1 spec is the single source of truth between frontend and backend. Both teams build against it in parallel using mocks.
2. **Parallel workstreams.** Frontend (Harshit) and backend (John/Gay Mark) develop independently against the published API contract. Integration happens last.
3. **HIPAA by design.** Every layer encrypts PHI at rest and in transit. Guest data is PHI. Audit logging is mandatory. There are no shortcuts.
4. **Monolithic backend for MVP.** The rules engine is embedded in FastAPI. No microservices until Phase 3 scale demands it.
5. **Compute-on-demand.** Predictions are not stored. The rules engine recomputes trajectories on every request. This minimizes HIPAA surface and database complexity.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend framework | Next.js 15 (App Router) | Server components, file-based routing, Vercel deployment |
| UI components | shadcn/ui | Accessible, composable component primitives |
| Styling | Tailwind CSS | Utility-first, mobile-first responsive design |
| Charting | Visx | D3 primitives as React components; SVG-based eGFR trajectory chart |
| Client state | Zustand | Lightweight store for UI state (form, tier, disclaimers) |
| Server state | TanStack Query | Caching, mutations, optimistic updates for API calls |
| API mocking | MSW (Mock Service Worker) | Parallel FE development against contract mocks |
| Backend framework | FastAPI (Python) | Async, Pydantic validation, OpenAPI auto-generation |
| Database | PostgreSQL 15+ (AWS RDS) | ACID, JSONB for guest sessions, strong constraint support |
| Migrations | Alembic | Versioned, repeatable schema migrations |
| Auth | Magic link + JWT | Passwordless auth; 1hr access tokens, 7d refresh tokens |
| Testing (FE) | Vitest + React Testing Library + Playwright | Unit, component, and E2E testing |
| Testing (BE) | pytest + httpx | Unit and integration testing for FastAPI |
| Contract testing | Schemathesis or Dredd | Auto-generated tests from OpenAPI spec |
| CI/CD | GitHub Actions | Lint, test, build, deploy pipeline |

---

## 3. Service Architecture

### 3.1 Frontend — Next.js 15 on Vercel

- **App Router** with server components by default; client components only for interactive elements (form, chart, auth).
- Calls FastAPI directly over HTTPS. No BFF (backend-for-frontend) layer. No Next.js API routes proxying to the backend.
- Static assets and server-rendered pages served from Vercel's edge network.
- Route structure:

```
/                     Landing page with prediction form
/results              Chart + stat cards + disclaimers
/auth/login           Magic link email entry
/auth/verify          Magic link token verification
/account              Authenticated dashboard
/account/history      Historical lab entries
```

### 3.2 Backend — FastAPI on AWS ECS/Fargate

- Single FastAPI application serving all endpoints under `/api/v1/`.
- Pydantic models enforce request validation. CHECK constraints in PostgreSQL provide defense-in-depth.
- The proprietary rules engine runs as an embedded Python module within FastAPI. It reads raw lab values, computes trajectories, and returns results. No calculation logic is ever exposed to the client.
- Containerized (Docker) and deployed to ECS/Fargate for auto-scaling and zero-server management.

### 3.3 Database — PostgreSQL on AWS RDS

- Encrypted at rest with AWS KMS.
- TLS required for all connections (no plaintext, even from the API server).
- Five tables in MVP (per Gay Mark's schema, `agents/gay_mark/drafts/db_docs.md`):

| Table | Purpose |
|-------|---------|
| `users` | Patient accounts (email, name, DOB, sex) |
| `lab_entries` | Lab values per visit date, FK to users |
| `guest_sessions` | Ephemeral JSONB storage, 24hr TTL, server-side |
| `magic_link_tokens` | Passwordless auth tokens (hashed, single-use) |
| `audit_log` | HIPAA-required access and mutation log |

**Open item:** Refresh token storage strategy (in-memory vs. DB table) is TBD. If server-side revocation is needed, Gay Mark will add a `refresh_tokens` table. See Appendix: Open Items.

- UUIDs for all application table PKs (prevents enumeration). BIGSERIAL for audit_log (write performance).
- Alembic migrations from day one. Every environment (dev, staging, prod) builds from the same migration chain.

### 3.4 Rules Engine — Embedded in FastAPI

- Lee's proprietary prediction model. Deterministic, not ML/AI.
- Input: raw lab values (BUN, creatinine, potassium, age, sex, plus optional fields).
- Output: 4 trajectory arrays (none, bun24, bun17, bun12), dialysis age estimates, confidence tier, slope (if 2+ visits).
- Never exposed as a separate service in MVP. Called as a Python function within the `/predict` endpoint handler.
- Coefficients and logic are Lee's IP. They live in a private module, never serialized to the client, never logged in detail.
- Phase 3 consideration: isolate into a separate internal service if scaling or FDA audit requirements demand it.

---

## 4. Data Flow

### 4.1 Guest Prediction (First Visit)

```
User                    Frontend                API                     DB
 |                        |                      |                       |
 |  Fill form             |                      |                       |
 |----------------------->|                      |                       |
 |                        | POST /predict        |                       |
 |                        | {lab_entries: [...]}  |                       |
 |                        |--------------------->|                       |
 |                        |                      | Store in              |
 |                        |                      | guest_sessions        |
 |                        |                      | (JSONB, 24hr TTL)     |
 |                        |                      |---------------------->|
 |                        |                      |                       |
 |                        |                      | Run rules engine      |
 |                        |                      | (embedded)            |
 |                        |                      |                       |
 |                        | 200: trajectories,   |                       |
 |                        | confidence_tier,     |                       |
 |                        | dial_ages            |                       |
 |                        |<---------------------|                       |
 |  Render chart          |                      |                       |
 |<-----------------------|                      |                       |
 |                        |                      |                       |
 |  Set httpOnly cookie   |                      |                       |
 |  (session_token)       |                      |                       |
```

### 4.2 Authenticated Prediction (Returning Patient)

```
User                    Frontend                API                     DB
 |                        |                      |                       |
 |  Fill form             |                      |                       |
 |----------------------->|                      |                       |
 |                        | POST /lab-entries     |                       |
 |                        | {bun, creat, ...}    |                       |
 |                        | Authorization: JWT   |                       |
 |                        |--------------------->|                       |
 |                        |                      | INSERT lab_entries    |
 |                        |                      |---------------------->|
 |                        | 201: lab_entry_id    |                       |
 |                        |<---------------------|                       |
 |                        |                      |                       |
 |                        | POST /predict         |                       |
 |                        | {lab_entry_ids: [...]}|                       |
 |                        |--------------------->|                       |
 |                        |                      | SELECT lab_entries    |
 |                        |                      | WHERE user_id = ?     |
 |                        |                      |<----------------------|
 |                        |                      |                       |
 |                        |                      | Run rules engine      |
 |                        |                      |                       |
 |                        | 200: trajectories    |                       |
 |                        |<---------------------|                       |
 |  Render chart          |                      |                       |
 |<-----------------------|                      |                       |
```

### 4.3 Magic Link Auth Flow

```
User                    Frontend                API                     DB
 |                        |                      |                       |
 |  Enter email           |                      |                       |
 |----------------------->|                      |                       |
 |                        | POST /auth/           |                       |
 |                        |   request-link        |                       |
 |                        | {email}              |                       |
 |                        |--------------------->|                       |
 |                        |                      | Upsert user           |
 |                        |                      | Create magic_link_    |
 |                        |                      |   tokens (hashed)     |
 |                        |                      |---------------------->|
 |                        |                      | Send email with link  |
 |                        | 200: "link sent"     |                       |
 |                        |<---------------------|                       |
 |  "Check your email"    |                      |                       |
 |<-----------------------|                      |                       |
 |                        |                      |                       |
 |  Click link in email   |                      |                       |
 |----------------------->| /auth/verify?token=X |                       |
 |                        |--------------------->|                       |
 |                        |                      | Validate token_hash   |
 |                        |                      | Mark used_at          |
 |                        |                      | Migrate guest data    |
 |                        |                      |   (if session exists) |
 |                        |                      |---------------------->|
 |                        | 200: {access_token,  |                       |
 |                        |  refresh_token}      |                       |
 |                        |<---------------------|                       |
 |  Authenticated         |                      |                       |
 |<-----------------------|                      |                       |
```

### 4.4 Multi-Visit Flow (3+ Entries, Tier 3)

1. `POST /lab-entries` with `visit_date: "2026-01-15"` -- stores first entry
2. `POST /lab-entries` with `visit_date: "2026-02-15"` -- stores second entry
3. `POST /lab-entries` with `visit_date: "2026-03-15"` -- stores third entry
4. `POST /predict` with `{lab_entry_ids: [id1, id2, id3]}` -- returns:
   - `confidence_tier: 3` (3+ visits with hemoglobin + glucose)
   - `slope: -2.1` (eGFR change per year)
   - `slope_description: "declining"` (or "improving" / "stable")
   - Full trajectory arrays factoring in longitudinal data

---

## 5. Auth and Security

### 5.1 Magic Link Flow (Decision 1)

- No passwords. No bcrypt. No password storage.
- `POST /auth/request-link` accepts an email address. The server creates a cryptographically random token, stores its hash in `magic_link_tokens`, and sends a link via email.
- `POST /auth/verify` validates the token. On success: marks `used_at`, issues a JWT access token (1hr) and refresh token (7d), and migrates any guest session data to the new account.
- `POST /auth/refresh` exchanges a valid refresh token for a new access/refresh pair.
- `POST /auth/logout` invalidates the refresh token.

### 5.2 Token Management

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Magic link token | 15 min | DB (hashed) | One-time passwordless auth |
| JWT access token | 1 hour | In-memory (Zustand) | API request authentication |
| JWT refresh token | 7 days | In-memory or httpOnly cookie | Silent token renewal |
| Guest session token | 24 hours | httpOnly cookie | Ephemeral guest identification |

- Access tokens stored in-memory (Zustand store). Refresh tokens stored in-memory or httpOnly cookie (TBD). Guest session tokens stored as httpOnly cookies set by the server. No tokens in localStorage.
- JWT payload contains `user_id`, `exp`, `iat`. No PHI in the token payload.
- Refresh tokens are stored server-side (DB) and can be revoked individually or per-user.

### 5.3 Guest Sessions (Decision 4)

- Guest users receive an httpOnly cookie with a session token on first prediction.
- Lab data is stored server-side in `guest_sessions` as JSONB with a 24-hour TTL.
- Guest data is PHI. Full HIPAA protections apply (encryption, audit logging).
- A cron job purges expired sessions every 15 minutes: `DELETE FROM guest_sessions WHERE expires_at < NOW()`.
- On account creation, guest session data migrates to proper `lab_entries` rows atomically.

### 5.4 CORS Policy

- Allowed origins: `https://kidneyhood.org`, `https://www.kidneyhood.org`, staging origin, `http://localhost:3000` (dev only).
- Allowed methods: `GET, POST, DELETE, OPTIONS`.
- Allowed headers: `Content-Type, Authorization`.
- Credentials: `true` (required for httpOnly cookies).

### 5.5 Rate Limiting

Per John Donaldson's API contract (`agents/john_donaldson/drafts/api_docs.md`, Section 8):

- `POST /auth/request-link`: 3 requests per email per 15 minutes.
- `POST /predict` (guest): 10 requests per minute.
- `POST /predict` (authenticated): 30 requests per minute.
- All other endpoints (authenticated): 60 requests per minute.
- Rate limit headers: `X-RateLimit-Remaining`, `Retry-After`.
- 429 response with standard error envelope on limit exceeded.

---

## 6. HIPAA Compliance

### 6.1 PHI Classification

The following data is Protected Health Information under HIPAA:

| Data | PHI? | Justification |
|------|------|---------------|
| Email address | Yes | Patient identifier |
| Date of birth | Yes | Patient identifier |
| Name | Yes | Patient identifier |
| Lab values (BUN, creatinine, potassium, hemoglobin, glucose, eGFR, BP, UPCR) | Yes | Health information |
| CKD diagnosis | Yes | Health information |
| Visit dates | Yes | Dates of service |
| Prediction trajectories | Yes | Derived health information |
| IP address in audit log | Yes | When combined with health data |
| Guest session lab data | Yes | Health information (Decision 4) |

**Non-PHI:** Session tokens (opaque), JWT tokens (no PHI in payload), aggregate anonymized metrics.

### 6.2 Encryption

| Layer | Mechanism | Standard |
|-------|-----------|----------|
| Data at rest | AWS RDS with KMS-managed encryption | AES-256 |
| Data in transit (client-API) | TLS 1.2+ | HTTPS only, HSTS enabled |
| Data in transit (API-DB) | TLS required on all connections | No plaintext DB connections |
| Backups | Encrypted by RDS KMS | Same key as live data |
| Magic link tokens | Stored as SHA-256 hash | Raw token never persisted |

### 6.3 Audit Logging

- Every read or write to `users`, `lab_entries`, and `guest_sessions` generates an audit log entry.
- Audit log captures: `user_id`, `session_token` (for guests), `action`, `resource_type`, `resource_id`, `details` (JSONB), `ip_address`, `timestamp`.
- `audit_log.user_id` uses `ON DELETE SET NULL` (Decision 14). Audit records survive user deletion for compliance.
- Audit logs are append-only at the application level. No application-level delete access.
- Purge job deletions are logged: `action = 'guest_session_purge'`, `details = {count: N}`.

### 6.4 Access Control (RBAC)

| DB Role | Permissions | Purpose |
|---------|-------------|---------|
| `app_service` | SELECT, INSERT, UPDATE, DELETE on application tables | FastAPI application account |
| `app_admin` | DDL, migrations, GRANT | Schema changes, Alembic migrations |

- No shared credentials between environments.
- No direct DB access from the frontend. All access through the API layer.
- Admin access requires MFA and is restricted to deployment pipelines.

### 6.5 Data Retention

| Data Type | Retention | Deletion Mechanism |
|-----------|-----------|-------------------|
| Guest session data | 24 hours | Cron purge every 15 min |
| Account lab entries | Until user requests deletion | `DELETE /me` cascade |
| User account | Until user requests deletion | `DELETE /me` |
| Audit log | Indefinite (regulatory) | Never deleted by application |
| Magic link tokens | Until used or expired | Cleanup job removes expired tokens |

### 6.6 Right to Delete

- `DELETE /api/v1/me` triggers:
  - `CASCADE` delete on `lab_entries` (all patient lab data removed)
  - `CASCADE` delete on `magic_link_tokens` (all auth tokens removed)
  - `SET NULL` on `audit_log.user_id` (audit records preserved, user reference nullified)
- Response confirms deletion. No recovery possible.
- Audit log entry created for the deletion itself (with `user_id` captured before the CASCADE).

---

## 7. Deployment

### 7.1 Environments

| Environment | Purpose | Infrastructure |
|-------------|---------|---------------|
| Local dev | Individual developer machines | Docker Compose: FastAPI + PostgreSQL + MailHog |
| Staging | Pre-production validation | Mirrors production: ECS/Fargate + RDS (encrypted) |
| Production | Live patient-facing | ECS/Fargate + RDS (encrypted) + CloudWatch |

**Staging must mirror production security controls.** Encryption at rest, TLS, RBAC, audit logging -- all active in staging. HIPAA compliance cannot be validated without this.

### 7.2 CI/CD Pipeline (GitHub Actions)

```
Push/PR
  |
  v
[Lint] --> [Unit Tests] --> [Integration Tests] --> [Contract Tests]
                                                          |
                                                          v
                                                   [E2E Tests] --> [Accessibility Scan]
                                                                          |
                                                                          v
                                                                   [Coverage Report]
                                                                          |
                                                                          v
                                                              [Deploy to Staging]
                                                                          |
                                                                   (manual gate)
                                                                          |
                                                                          v
                                                              [Deploy to Production]
```

- Every PR runs the full pipeline through coverage report.
- PRs that fail any stage are blocked from merging.
- Coverage reports posted as PR comments.
- Copilot is added as a reviewer on every PR.
- Staging deploys automatically on merge to `main`.
- Production deploys require manual approval.
- Nightly: full regression + visual regression + load tests.

### 7.3 Branch Strategy

- `main` -- production-ready code, deploys to staging automatically.
- `feat/SPEC-{number}-{description}` -- feature branches from `main`.
- No long-lived development branches. Ship small, merge often.

---

## 8. API Design Principles

### 8.1 RESTful Resource Design

- Resources are nouns: `/lab-entries`, `/me`, `/auth`.
- HTTP methods convey intent: `GET` (read), `POST` (create/compute), `DELETE` (remove).
- Versioned: all endpoints under `/api/v1/`.
- No API version in headers. Path-based versioning only.

### 8.2 Contract-First (OpenAPI 3.1)

- John Donaldson publishes the spec to `/artifacts/api_contract.json`.
- The spec is the binding contract. Both frontend and backend implement against it.
- Any post-publication change requires team discussion and CTO (Luca) approval.
- Example responses are included for every endpoint -- these become Harshit's mock data.
- FastAPI auto-generates a compatible spec from Pydantic models. The handwritten spec is authoritative; the auto-generated one is validated against it.

### 8.3 Error Envelope (Decision 9)

All 4xx and 5xx responses use this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      {"field": "bun", "message": "BUN must be between 5 and 150 mg/dL"}
    ]
  }
}
```

- `code`: machine-readable string (e.g., `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`).
- `message`: human-readable, safe to display to users.
- `details`: array of field-level errors (empty for non-validation errors).
- HTTP status codes: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 422 (Pydantic failure), 429 (rate limited), 500 (server error).

### 8.4 Pagination

Per John's API contract, list endpoints use offset-based pagination:

- `GET /lab-entries?limit=50&offset=0`
- Response includes `total`, `limit`, `offset` fields.
- Default limit: 50. Results ordered by `visit_date` descending.

### 8.5 Endpoint Inventory (MVP)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/auth/request-link` | No | Send magic link email |
| `POST` | `/api/v1/auth/verify` | No | Validate token, issue JWT |
| `POST` | `/api/v1/auth/refresh` | Refresh token | Renew access token |
| `POST` | `/api/v1/auth/logout` | Yes | Invalidate session |
| `GET` | `/api/v1/me` | Yes | Current user profile |
| `DELETE` | `/api/v1/me` | Yes | Delete account (HIPAA right to delete) |
| `POST` | `/api/v1/lab-entries` | Yes | Store lab entry for a visit date |
| `GET` | `/api/v1/lab-entries` | Yes | List user's lab entries (paginated) |
| `GET` | `/api/v1/lab-entries/{id}` | Yes | Get single lab entry |
| `DELETE` | `/api/v1/lab-entries/{id}` | Yes | Delete lab entry (audit: SET NULL) |
| `POST` | `/api/v1/predict` | No (guest) / Yes (auth) | Run prediction engine |
| `GET` | `/api/v1/health` | No | Infrastructure health check |

---

## 9. Frontend Principles

### 9.1 Server vs. Client Components

- **Server components** by default: layouts, static content, metadata, SEO.
- **Client components** only where interactivity requires it: `PredictionForm`, `PredictionChart`, auth flows, disclaimer expand/collapse.
- No `"use client"` on layout components unless absolutely necessary.

### 9.2 No BFF (Decision 7)

- The Next.js app does NOT proxy API calls through its own API routes.
- The frontend calls FastAPI directly over HTTPS.
- This simplifies the architecture, reduces latency, and eliminates a failure point.
- CORS is configured on FastAPI to allow the frontend origin.

### 9.3 Mock-Driven Development

- MSW (Mock Service Worker) intercepts API calls in development and testing.
- Mock handlers return responses matching the published API contract.
- Mock data accuracy will improve once Lee's test vectors arrive (Decision 13).
- Integration with the real API happens last -- swap MSW handlers for real endpoints.

### 9.4 Mobile-First Responsive Design

- Tailwind breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
- Stat cards: 4-col desktop > 2x2 tablet > single stack mobile.
- Chart: full-width with horizontal scroll on mobile if needed.
- Disclaimers: inline on desktop, sticky footer with expand-on-tap on mobile (Decision 11).
- Minimum touch target: 44px. Minimum input font size: 16px (prevents iOS zoom).

### 9.5 Accessibility (WCAG 2.1 AA)

- Target audience is 60+ CKD patients. Accessibility is not optional.
- Semantic HTML with proper heading hierarchy.
- ARIA labels on all Visx SVG chart elements.
- Hidden data table alternative for screen readers (trajectory values in tabular form).
- Color contrast: 4.5:1 minimum for normal text, 3:1 for large text.
- Chart line colors must pass contrast against white background. The `#AAAAAA` "no treatment" line is a known risk -- Inga must validate or darken.
- Keyboard navigation for all interactive elements.
- Skip-to-content link.
- Focus indicators visible on all interactive elements.
- Testing: axe-core via Playwright, manual VoiceOver testing.

---

## 10. Scalability

### 10.1 MVP Scale (Phase 2)

- **Target:** 100 patients (soft launch), scaling to ~600 concurrent users.
- **Compute:** Single FastAPI container on ECS/Fargate is sufficient. The rules engine is CPU-bound but fast (sub-second for a single prediction).
- **Database:** Single RDS instance with connection pooling. Expected write volume is very low (a few lab entries per patient per month).
- **No caching layer needed** for MVP. Predictions are recomputed on demand; at this scale, that is fine.

### 10.2 Phase 3 Considerations

When scaling beyond the initial cohort (9,000 email subscribers, then US public):

| Concern | Solution | Trigger |
|---------|----------|---------|
| DB read load | Read replicas for GET endpoints | >1,000 concurrent users |
| Prediction latency | Redis caching of trajectory results (keyed on lab entry hash) | Prediction p95 > 2s |
| Rules engine isolation | Extract to separate internal service (gRPC or HTTP) | FDA audit requirements or multi-consumer need |
| PDF generation | Dedicated PDF service (Puppeteer/wkhtmltopdf) | Phase 2b scope |
| Email delivery | Dedicated email service or SES with queue | >10,000 magic link requests/day |
| Internationalization | i18n framework in frontend, DB schema for locale | International launch |
| Geo-restriction | IP geolocation at CDN/WAF layer | Non-US launch |
| Monitoring | APM (Datadog/New Relic), structured logging, alerting | Production launch |

### 10.3 What We Are NOT Building for MVP

- No WebSocket / real-time features.
- No background job queue (beyond the guest session purge cron).
- No file uploads or media storage.
- No third-party integrations (Klaviyo, FHIR, MyChart -- all Phase 3).
- No AI/LLM features (Phase 3 CS automation only).
- No native mobile apps (web only, responsive).

---

## 11. Sprint Plan

Aligned with Husser's PRD (`agents/husser/drafts/PRD.md`, Section 14). This section maps the sprint plan to architecture components and parallel work assignments.

### Sprint 0 — Discovery + Visx POC (1 week, current)

**Gate:** All artifacts approved at Meeting 2. Visx POC passes or charting library decision reopens.

| Track | Owner | Deliverables |
|-------|-------|-------------|
| Architecture | Luca | This document |
| API Contract | John Donaldson | OpenAPI 3.1 spec (`artifacts/api_contract.json`) |
| DB Schema | Gay Mark | DDL + documentation (`agents/gay_mark/drafts/db_docs.md`) |
| Frontend Architecture | Harshit | Component specs, Visx POC, MSW mock handlers |
| UX/UI | Inga | Component specs, wireframes (two chart variants) |
| Test Strategy | Yuri | Test strategy doc, test case inventory |
| Product | Husser | PRD, coordinate test vectors from Lee |

**Visx POC scope (Harshit):** True linear time axis, custom dash patterns (7px/4px solid, 3px/2px dashed), CKD phase bands, end-of-line label collision avoidance (15px min separation), dialysis threshold line at eGFR 12. If POC fails, escalate to Luca immediately.

### Sprint 1 — Core Form + Chart + API (2 weeks)

**Prerequisites:** Visx POC passed, API contract locked, test vectors from Lee received (Decision #13, patient safety blocker).

| Stream | Owner | Stories |
|--------|-------|---------|
| Frontend | Harshit | SPEC-2 (required inputs), SPEC-3 (FE validation), SPEC-8 (Visx chart base), SPEC-9 (X-axis), SPEC-11 (trajectory lines), SPEC-13 (Y-axis + threshold), SPEC-10 (FE-API integration) |
| Backend | John | SPEC-6 (prediction endpoint), SPEC-7 (backend validation) |
| Database | Gay Mark | SPEC-25 (HIPAA storage setup), SPEC-29 (encryption at rest + transit) |

**Parallel work:** Harshit builds against MSW mocks. John builds the real API. Gay Mark sets up RDS with encryption. Integration at end of sprint.

### Sprint 2 — Cards + Disclaimers + Guest Mode (2 weeks)

| Stream | Owner | Stories |
|--------|-------|---------|
| Frontend | Harshit | SPEC-16 (stat cards), SPEC-14 (disclaimers), SPEC-15 (phase bands), SPEC-17 (tier badge), SPEC-4 (optional fields), SPEC-5 (silent fields), SPEC-12 (chart title) |
| Backend | John, Gay Mark | SPEC-18 (guest mode + sessions), SPEC-30 (audit logging) |

**Integration:** Guest prediction flow end-to-end. httpOnly cookie flow tested across frontend and backend.

### Sprint 3 — Auth + Account Creation (2 weeks)

| Stream | Owner | Stories |
|--------|-------|---------|
| Frontend | Harshit | SPEC-19 (magic link login UI), SPEC-21 (save prompt), SPEC-23 (account data save), SPEC-27 (legal disclaimers final) |
| Backend | John, Gay Mark | SPEC-20 (auth endpoints, rewritten for magic link), SPEC-22 (persist patient data) |

**Integration:** Full magic link flow including guest-to-account data migration.

### Sprint 4 — Multi-Visit + Slope + Polish + QA (2 weeks)

| Stream | Owner | Stories |
|--------|-------|---------|
| Frontend | Harshit, Inga | SPEC-24 (multi-visit), SPEC-26 (slope display), responsive polish, accessibility audit |
| Backend | John | SPEC-28 (visit_date + eGFR override), DELETE /me endpoint |
| QA | Yuri, Gay Mark | Full regression suite, HIPAA compliance validation |

**Milestones:**
- End of Sprint 0: All Discovery artifacts approved (Meeting 2)
- End of Sprint 1: Core form-to-chart flow working with real API
- End of Sprint 2: Complete guest prediction experience
- End of Sprint 3: Authentication working, account persistence
- End of Sprint 4: Multi-visit + slope, full QA pass — **ready for soft launch (100 patients)**

---

## 12. Risks & Mitigations

### HIGH

| # | Risk | Impact | Owner | Mitigation | Status |
|---|------|--------|-------|------------|--------|
| R1 | Test vectors from Lee not delivered before Sprint 1 | Cannot verify prediction accuracy. Patient safety blocker. Sprint 1 blocked. | Husser | Contact Lee within 48 hours. Escalate to Luca if no response in 1 week. | OPEN |
| R2 | HIPAA compliance gaps | Legally non-viable product. Lab values + email + DOB = PHI. | Gay Mark, Husser | Co-author compliance section. Engage legal counsel for BAA review. AWS BAA must be signed before production. | IN PROGRESS |
| R3 | Prediction engine code not delivered from Lee | Backend cannot implement `/predict` endpoint. Sprint 1 blocker. | Husser, Luca | Husser coordinates delivery timeline. If delayed, John builds against test vector I/O pairs with placeholder logic. | OPEN |
| R4 | Legal rejects collapsed disclaimer on mobile | Mobile UX requires redesign. Sprint 2 blocker. | Husser | Confirm with legal counsel within 2 weeks. Inga has fallback inline layout. | OPEN |

### MEDIUM

| # | Risk | Impact | Owner | Mitigation | Status |
|---|------|--------|-------|------------|--------|
| R5 | Visx POC fails | Must revisit charting library. Delays Sprint 1 by 1+ week. | Harshit | Sprint 0 POC is a gate. Inga preparing simplified Variant B as fallback. Escalate to Luca immediately on failure. | OPEN — Sprint 0 |
| R6 | SPEC-20, SPEC-59, SPEC-60 need rewrite | These Jira stories describe password-based auth (superseded by Decision #1). If not rewritten, implementation will diverge. | Husser | Rewrite all three before Sprint 1. | NOT STARTED |
| R7 | Accessibility gaps for 60+ audience | #AAAAAA "no treatment" line may fail WCAG contrast. Touch targets and font sizes need validation. | Inga | WCAG 2.1 AA audit plan. 44px touch targets, 16px min body font, contrast verification on all chart elements. | IN PROGRESS |
| R8 | API-DB schema misalignment on `egfr_calculated` | John's API returns `egfr_calculated` but Gay Mark's schema has no column for it. If we want to cache, schema change needed. | John, Gay Mark | Currently computed on-the-fly in API layer. Acceptable for MVP. Revisit if performance requires caching. | ACKNOWLEDGED |

### LOW

| # | Risk | Impact | Owner | Mitigation | Status |
|---|------|--------|-------|------------|--------|
| R9 | Geo-restriction not in MVP | US IP restriction in proposal but deferred. Non-US users could access during soft launch. | Husser | Acceptable for 100-patient soft launch. Implement WAF rule in Phase 3. | ACCEPTED |
| R10 | Refresh token storage strategy undecided | Server-side revocation may require a `refresh_tokens` DB table not yet in Gay Mark's schema. | John, Gay Mark, Luca | Decide during Sprint 0 cross-review. If DB-backed, Gay Mark adds table in Sprint 1 migration. | OPEN |

---

## 13. Decision Log

All decisions were made at Meeting 1 (2026-03-25) and are binding.

### Decision 1: Magic Link Auth Only

- **Decision:** No passwords. Magic link email is the only authentication mechanism.
- **Rationale:** Eliminates password storage, reduces HIPAA attack surface, simplifies auth UX for elderly patients who frequently forget passwords. One less secret to protect.
- **Impact:** No `password_hash` column. No bcrypt dependency. Auth endpoints: `request-link`, `verify`, `refresh`, `logout`. Jira stories SPEC-20, SPEC-59, SPEC-60 require rewrite.

### Decision 2: MVP Scope with PDF Deferred

- **Decision:** MVP scope approved as proposed. PDF export deferred to Phase 2b.
- **Rationale:** PDF generation is complex (server-side rendering, HIPAA-compliant temp storage, styling parity). Shipping the core prediction + chart experience faster provides more patient value sooner.
- **Impact:** No `GET /predictions/{id}/pdf` endpoint. No Puppeteer/wkhtmltopdf infrastructure. Reduces Sprint 1-4 scope by ~3 days.

### Decision 3: Sex Field Required

- **Decision:** Sex is required. Radio group: Male / Female / Prefer not to say. "Prefer not to say" maps to `"unknown"` and triggers lower confidence tier.
- **Rationale:** The CKD-EPI 2021 formula requires sex for eGFR calculation. Without it, the prediction is unreliable. "Prefer not to say" is the respectful opt-out that still allows computation with reduced confidence.
- **Impact:** `CHECK (sex IN ('male', 'female', 'unknown'))` in DB. Required in API contract. Radio group in form UI after Age field.

### Decision 4: Guest Data Server-Side with 24hr TTL

- **Decision:** Guest prediction data stored server-side in `guest_sessions` table with JSONB, 24-hour TTL, full HIPAA protections. Session token in httpOnly cookie.
- **Rationale:** Supersedes the spec's "purged on close" language. Server-side storage enables guest-to-account data migration. 24hr TTL balances usability (patients can return within a day) with PHI minimization.
- **Impact:** `guest_sessions` table required. Purge cron job every 15 minutes. httpOnly cookie for session identification. All guest data is PHI.

### Decision 5: True Linear Time Scale on X-Axis

- **Decision:** X-axis uses true linear time in months. The compressed first year (5 data points in 12 months vs. 10 data points in 108 months) is intentional.
- **Rationale:** Clinical accuracy requires proportional time representation. Non-linear scales would misrepresent the rate of eGFR change. A footer note explains the non-uniform data point intervals.
- **Impact:** Visx linear scale implementation. Harshit validates in Sprint 0 POC. Inga designs footer note placement.

### Decision 6: Visx Charting Library

- **Decision:** Visx is the charting library. Harshit builds a POC in Sprint 0 as a gate for Sprint 1.
- **Rationale:** D3 primitives as React components. Full control over SVG rendering (custom dash patterns, phase bands, label collision avoidance). No opinionated chart framework limiting customization.
- **Impact:** Sprint 0 POC must validate: true linear time axis, custom dash patterns (7px/4px, 3px/2px), phase bands, end-of-line label collision avoidance (15px separation), dialysis threshold line. If POC fails, escalate to Luca.

### Decision 7: Frontend Stack (No BFF)

- **Decision:** shadcn/ui + Tailwind CSS + Zustand + TanStack Query. Frontend calls FastAPI directly. No BFF pattern.
- **Rationale:** BFF adds complexity with no benefit for MVP. shadcn/ui provides accessible primitives without vendor lock-in. Zustand is minimal for UI state. TanStack Query handles server state, caching, and mutations.
- **Impact:** CORS configuration required on FastAPI. No Next.js API routes. Harshit proceeds with this stack immediately.

### Decision 8: Separate Store and Predict Endpoints

- **Decision:** `POST /lab-entries` stores data. `POST /predict` reads from stored entries (authenticated) or accepts inline data (guest).
- **Rationale:** Clean separation of concerns. Storage and computation are independent operations. Authenticated users build up a history of entries that predictions draw from. Guests send data inline for stateless computation.
- **Impact:** Two-endpoint flow for authenticated users. Single-endpoint flow for guests. John finalizes both endpoint contracts.

### Decision 9: Error Response Envelope

- **Decision:** `{error: {code, message, details[{field, message}]}}` is the standard error format across all endpoints.
- **Rationale:** Machine-readable codes for programmatic handling. Human-readable messages for display. Field-level details for inline form validation. Consistent structure simplifies frontend error handling.
- **Impact:** All agents build against this schema. Harshit implements field-level error display. Yuri writes contract tests validating the envelope.

### Decision 10: No Prediction Storage in MVP

- **Decision:** Predictions are not stored. Recompute on demand.
- **Rationale:** Eliminates a `predictions` table, reduces HIPAA surface (fewer PHI records), and avoids cache invalidation complexity. At MVP scale, recomputation is fast and cheap.
- **Impact:** No `GET /predictions/{id}` endpoint. Every chart render requires a fresh `POST /predict`. Phase 3 may add storage for FDA audit trail.

### Decision 11: Disclaimer Sticky Footer on Mobile

- **Decision:** Desktop: disclaimers inline below chart/cards. Mobile: sticky footer, collapsed by default, expandable on tap.
- **Rationale:** Three verbatim disclaimer texts take significant vertical space. On mobile, a sticky footer keeps them accessible without burying the chart. Legal confirmation required that collapsed display satisfies requirements.
- **Impact:** Inga designs collapsed/expanded states. Harshit implements responsive disclaimer components. Husser confirms with legal counsel.

### Decision 12: Tier 2 Requires Both Hemoglobin AND Glucose

- **Decision:** Tier 2 confidence requires BOTH hemoglobin AND glucose. Adding only one does not upgrade from Tier 1.
- **Rationale:** The prediction model's confidence improves meaningfully only when both CBC values are present. Partial data does not justify a higher confidence badge.
- **Impact:** Frontend unlock prompt: "Add hemoglobin AND glucose to improve prediction accuracy." Tier transition logic: Tier 1 (required only) -> Tier 2 (+ both hgb + glu) -> Tier 3 (+ 3 visits with slope).

### Decision 13: Test Vectors from Lee Before Sprint 1

- **Decision:** 10-20 validated input/output pairs from Lee are required before Sprint 1 begins. This is a patient safety blocker.
- **Rationale:** The prediction engine is proprietary. Without known-good test vectors, we cannot verify clinical accuracy. Shipping incorrect predictions to CKD patients is a patient safety risk.
- **Impact:** Husser coordinates with Lee. Sprint 1 is blocked until vectors are delivered. Yuri uses vectors for accuracy testing. Harshit uses vectors for mock data.

### Decision 14: Audit Log ON DELETE SET NULL

- **Decision:** `audit_log.user_id` uses `ON DELETE SET NULL`. Audit records are preserved when a user deletes their account.
- **Rationale:** HIPAA requires an audit trail. If audit records were CASCADE-deleted with the user, we would lose the compliance record of what data existed and when it was accessed. SET NULL preserves the trail while removing the user identifier.
- **Impact:** Gay Mark implements FK with `ON DELETE SET NULL`. Audit records show `user_id = NULL` for deleted users. The deletion event itself is logged before the CASCADE executes.

---

## Appendix: Open Items for Meeting 2

| Item | Owner | Blocker? |
|------|-------|----------|
| Test vectors from Lee (10-20 pairs) | Husser -> Lee | YES (Sprint 1 blocker) |
| Legal confirmation on collapsed disclaimer | Husser -> Legal | YES (Sprint 2 blocker) |
| HIPAA BAA with AWS | Luca | YES (production blocker) |
| Staging environment provisioning | Luca | YES (HIPAA validation blocker) |
| Guest-to-account data migration UX | Inga | No (can defer to Sprint 3) |
| eGFR client-side pre-calculation decision | Luca/John | No (server-side is safe default) |
| Magic link token TTL configuration | John | No (default 15 min, configurable) |
| Session TTL after magic link auth | John | No (default 15 min access, 7d refresh) |
| UPCR unit field in API contract | John | No (spec review Issue #11) |
| Prediction engine code delivery from Lee | Husser -> Lee | YES (backend implementation blocker) |
