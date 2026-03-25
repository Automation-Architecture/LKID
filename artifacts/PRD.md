# KidneyHood Product Requirements Document

**Version:** 1.0.0
**Date:** 2026-03-25
**Author:** Husser (Product Manager)
**Status:** Approved — Binding Contract for Development Phase

---

## Section 1: Executive Summary

KidneyHood is a web application that helps chronic kidney disease (CKD) patients understand how their kidney function may change over the next ten years. A patient enters routine lab values — BUN, creatinine, potassium, age, and sex — and immediately sees a trajectory chart showing four possible outcomes based on different BUN management strategies. No account is required to get a prediction; guests can try the tool instantly, then optionally save their results by creating an account via a passwordless magic link.

The application solves a specific problem: CKD patients today have no accessible, self-service way to visualize how their kidney health might evolve under different treatment scenarios. KidneyHood provides this using a proprietary, deterministic rules engine (not AI/ML) embedded in the server, ensuring consistent and explainable predictions.

The MVP is built on Next.js 15 (frontend, deployed on Vercel), FastAPI/Python (backend, deployed on AWS ECS/Fargate), and PostgreSQL (AWS RDS with KMS encryption). The architecture follows a contract-first approach: the OpenAPI 3.1 specification is the single source of truth, enabling parallel frontend and backend development.

HIPAA compliance is non-negotiable. All data — including guest session data — is classified as Protected Health Information. Encryption at rest and in transit, role-based database access control, comprehensive audit logging, and a 24-hour guest data purge cron job are built into the design from day one.

PDF export is deferred to Phase 2b. The MVP scope covers: patient input form with tiered confidence levels, eGFR trajectory chart (Visx/SVG), magic link authentication, multi-visit tracking with slope analysis, and full HIPAA-compliant data handling.

The project spans Sprints 0 through 4 (Discovery through Polish), with 89 Jira tickets across four epics and supporting infrastructure tasks.

---

## Section 2: Milestones & Epics

### Epic Summary

| Epic | Description | Sprint | Jira Stories | Status |
|------|-------------|--------|-------------|--------|
| Epic 1: Patient Input Form | Required/optional lab value form, frontend validation, API integration | Sprint 1 | SPEC-2, SPEC-3, SPEC-4, SPEC-5, SPEC-6, SPEC-7, SPEC-10 | Planned |
| Epic 2: Prediction Output & Visualization | eGFR trajectory chart (Visx), stat cards, confidence tiers, disclaimers | Sprint 1-2 | SPEC-8, SPEC-9, SPEC-11, SPEC-12, SPEC-13, SPEC-14, SPEC-15, SPEC-16, SPEC-17 | Planned |
| Epic 3: User Accounts & Multi-Lab Entry | Magic link auth, guest sessions, multi-visit entry, slope display | Sprint 2-3 | SPEC-18, SPEC-19, SPEC-20, SPEC-21, SPEC-22, SPEC-23, SPEC-24, SPEC-26, SPEC-28 | Planned |
| Epic 4: Operational & Legal Compliance | HIPAA storage, encryption, audit logging, disclaimers, data retention | Sprint 1-4 | SPEC-25, SPEC-27, SPEC-29, SPEC-30 | Planned |
| Infrastructure & Blockers | Test vectors, prediction engine, schema publishing, auth story rewrites | Sprint 0 | SPEC-80, SPEC-81, SPEC-82, SPEC-83, SPEC-84, SPEC-85, SPEC-86, SPEC-87, SPEC-88, SPEC-89 | Planned |

### Sprint Timeline

| Sprint | Dates | Focus | Key Milestones |
|--------|-------|-------|----------------|
| Sprint 0 | Pre-Sprint 1 | Discovery outputs, Visx POC, contract publishing | API contract locked, DB schema locked, Visx feasibility confirmed |
| Sprint 1 | Mar 23 – Apr 5 | Core form + chart + API endpoints | Guest prediction end-to-end, chart rendering with 4 trajectories |
| Sprint 2 | Apr 6 – Apr 19 | Stat cards, confidence tiers, optional fields, auth | Tier upgrade flow, magic link auth, disclaimers |
| Sprint 3 | Apr 20 – May 3 | Accounts, multi-visit, guest migration | Multi-visit slope analysis, guest-to-account migration |
| Sprint 4 | May 4 – May 17 | Polish, accessibility, QA, HIPAA sign-off | Full regression, HIPAA checklist, release candidate |

![Sprint Timeline](../docs/prd-sprint-timeline.excalidraw)

---

## Section 3: Role Responsibility Matrix

| Role | Stories | Subtasks | Key Deliverables |
|------|---------|----------|------------------|
| Frontend Developer | ~18 | ~26 | Next.js 15 app, Visx chart, form components, auth UI, responsive layouts |
| API Designer | ~7 | ~11 | OpenAPI 3.1 spec, FastAPI endpoints, error envelope, CORS, rate limiting |
| Database Engineer | ~5 | ~9 | PostgreSQL schema, migrations (Alembic), RBAC, encryption config, purge cron |
| Product Manager | 2 | 0 | PRD, test vector coordination, legal confirmation, story rewrites |
| UX/UI Designer | 2 (coordination) | 0 | User flows, wireframes, component specs, design tokens, chart variants, accessibility plan |
| QA / Test Writer | 0 | 1 | Test strategy, E2E suite (Playwright), contract tests (Schemathesis), accessibility audits, QA gates |
| Orchestrator (CTO) | 0 (coordination) | 0 | Architecture document, sprint planning, cross-agent alignment, infrastructure decisions |

![Role Workload](../docs/prd-agent-workload.excalidraw)

---

## Section 4: Technical Considerations

### Tech Stack Rationale

The stack — Next.js 15 (App Router), FastAPI, PostgreSQL — was selected for developer productivity, HIPAA compatibility, and parallel development. Next.js provides server components for SEO and static content alongside client components for interactive elements (form, chart, auth). FastAPI offers native async support, automatic OpenAPI generation from Pydantic models, and strong validation. PostgreSQL provides ACID transactions, JSONB for flexible guest session storage, CHECK constraints for defense-in-depth validation, and mature encryption support via AWS RDS/KMS. The UI layer uses shadcn/ui (Radix primitives) with Tailwind CSS, Zustand for client state, and TanStack Query for server state. Visx (D3 + React) was chosen for the eGFR chart because it renders to SVG, giving full control over accessibility attributes, line patterns, and responsive sizing. See Appendix C and Appendix F for details.

### HIPAA Compliance

All data in the system is PHI, including guest session data (confirmed at Meeting 1, Decision #4). Encryption at rest uses AES-256 via AWS KMS with annual key rotation. Encryption in transit requires TLS 1.2+ on all connections — client-to-API, API-to-database, and backups. Two database roles enforce least privilege: `app_service` (DML only, INSERT-only on audit_log) and `app_admin` (DDL for migrations). The audit log table uses `ON DELETE SET NULL` on `user_id` so records survive patient account deletion (Decision #14). Guest sessions carry a 24-hour TTL enforced by a purge cron job running every 15 minutes via pg_cron. Account deletion cascades to lab entries and magic link tokens but preserves audit records. See Appendix B for full schema details.

### Two-Endpoint API Pattern

The API separates data storage from prediction computation (Decision #8). `POST /lab-entries` persists lab values for authenticated users. `POST /predict` runs the rules engine — accepting either stored entry IDs (authenticated) or inline data (guests). This separation keeps predictions stateless (Decision #10: no prediction result storage), reduces HIPAA surface area, and simplifies the data model. The proprietary rules engine is embedded in FastAPI as a Python module — not a separate microservice — and its coefficients are never exposed to the client or logged. See Appendix A for the full endpoint inventory.

### Magic Link Authentication

KidneyHood uses passwordless magic link authentication exclusively (Decision #1). No passwords are stored, eliminating credential stuffing, bcrypt overhead, and password reset flows. Tokens are single-use, expire in 15 minutes, and are stored as SHA-256 hashes. JWT access tokens (1-hour TTL) are held in memory (Zustand store); refresh tokens (7-day TTL) use rotation. Guest sessions use httpOnly cookies set by the server. On account creation, guest data migrates atomically to proper `lab_entries` rows. See Appendix A and Appendix F for auth flow details.

### Infrastructure Dependencies

Three infrastructure tickets (SPEC-74, SPEC-75, SPEC-78) have no agent owner and must be resolved before Sprint 1: ALB HTTPS configuration, FastAPI TLS setup, and centralized logging (CloudWatch). Additionally, Sprint 0 blockers include obtaining Lee's test vectors and prediction engine code (SPEC-80, SPEC-81), publishing the OpenAPI spec (SPEC-82), and publishing the DDL schema (SPEC-83). The refresh token storage strategy (in-memory vs. DB table) remains undecided (SPEC-85).

### Cross-Agent Dependencies and Blockers

The critical path runs through the API contract: the Frontend Developer and QA cannot begin integration or contract testing until the API Designer publishes the OpenAPI 3.1 spec. The Database Engineer's schema must align 1:1 with API field names — any mismatch requires a coordinated migration. The UX/UI Designer's Visx chart specification has two variants (full interactive vs. simplified fallback); variant selection is blocked on the Frontend Developer's Visx POC results. QA gates are blocking at every sprint boundary — no story moves to Done without QA sign-off.

### Risks

1. **HIPAA non-compliance** (HIGH) — Legal exposure if encryption, audit logging, or data retention is misconfigured. Mitigation: HIPAA checklist is a release-blocking QA gate.
2. **Prediction accuracy without test vectors** (HIGH) — Without Lee's validated input/output pairs, QA can only verify structural correctness, not clinical accuracy. Mitigation: SPEC-80 is a Sprint 0 blocker.
3. **Visx chart complexity** (MEDIUM) — Custom dash patterns, phase band fills, and tooltip interactions may require significant custom SVG work. Mitigation: two chart spec variants; simplified fallback if POC reveals constraints.
4. **Unowned infrastructure tickets** (MEDIUM) — SPEC-74, SPEC-75, SPEC-78 have no assigned agent. Mitigation: CTO must assign or resolve before Sprint 1.
5. **Refresh token storage undecided** (LOW) — SPEC-85 needs a decision from API Designer, Database Engineer, and CTO. In-memory is fine for MVP; DB table needed if server-side revocation is required.

---

## Section 5: Open Questions

| Domain | Question |
|--------|----------|
| API Design | Should the frontend calculate eGFR client-side to pre-fill the optional field, or leave it entirely to the server? |
| API Design | Are audit log endpoints exposed via API, or purely backend? |
| API Design | How does guest multi-visit work with server-side sessions — can a guest submit multiple visit dates before creating an account? |
| Database | Refresh token storage strategy: in-memory vs. dedicated `refresh_tokens` table? (SPEC-85) |
| Database | Should `egfr_calculated` be cached as a column in `lab_entries`, or always computed on the fly? |
| Database | `sex` field lives on `users` table but API accepts it per lab entry — how is the mapping handled for guest inline data? |
| Frontend | Klaviyo integration: is it in MVP scope? If so, does the frontend trigger Klaviyo events? |
| Frontend | Geo-restriction (US-only with IP geolocation): where does the redirect happen — Next.js middleware or backend? |
| UX/UI | Chart variant selection (full interactive vs. simplified fallback) — blocked on Visx POC results |
| UX/UI | Silent fields — progressive disclosure on same screen or multi-step form? (Recommended: progressive disclosure) |
| Product | Legal confirmation on collapsed sticky disclaimer display on mobile (SPEC-87) |
| Product | Breach notification procedure definition (SPEC-88) |
| Product | Account data retention policy — finalize with legal counsel (SPEC-89) |
| Infrastructure | SPEC-74, SPEC-75, SPEC-78 — who owns ALB HTTPS, FastAPI TLS, and CloudWatch configuration? |
| QA | Staging environment timeline — when will a HIPAA-compliant staging environment be available? |
| QA | Magic link token TTL and session TTL values — needed for expiration test parameterization |

---

## Appendix A: API Design

### Scope

The API layer provides a RESTful interface between the Next.js 15 frontend and the FastAPI/Python backend. It handles magic link authentication, lab entry CRUD, stateless eGFR trajectory prediction, guest session management, and HIPAA-compliant audit logging. The frontend calls the API directly over HTTPS — no BFF layer (Decision #7). All endpoints are versioned under `/api/v1/`.

### Key Decisions

- **Magic link only** (Decision #1): Four auth endpoints replace traditional registration/login. No password fields, no bcrypt. Tokens are single-use, 15-minute TTL, stored as SHA-256 hashes.
- **Separate storage from prediction** (Decision #8): `POST /lab-entries` stores data; `POST /predict` computes trajectories. Clean separation of persistent resources from stateless computation.
- **No prediction storage** (Decision #10): Predictions are computed on demand and never persisted. No `GET /predictions` endpoint.
- **Standardized error envelope** (Decision #9): All 4xx/5xx responses return `{error: {code, message, details[]}}` with field-level details for validation errors.
- **No BFF** (Decision #7): CORS configured on FastAPI with credentials support for httpOnly guest session cookies.
- **PDF deferred** (Decision #2): No PDF endpoint in MVP.

### Requirements Summary

**Endpoint Inventory (12 MVP endpoints):**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/request-link` | None | Send magic link email |
| POST | `/auth/verify` | None | Validate token, issue JWT, migrate guest data |
| POST | `/auth/refresh` | Refresh token | Rotate access/refresh token pair |
| POST | `/auth/logout` | Bearer | Invalidate session |
| GET | `/me` | Bearer | Current user profile |
| DELETE | `/me` | Bearer | Delete account + all data (HIPAA right to delete) |
| POST | `/lab-entries` | Bearer | Store lab entry for a visit date |
| GET | `/lab-entries` | Bearer | List entries (paginated, offset-based, default 50) |
| GET | `/lab-entries/{id}` | Bearer | Get single lab entry |
| DELETE | `/lab-entries/{id}` | Bearer | Delete lab entry (audit logged) |
| POST | `/predict` | None/Bearer/Cookie | Run prediction engine |
| GET | `/health` | None | Infrastructure health check |

**Prediction response** returns: `egfr_calculated`, `confidence_tier` (1/2/3), `unlock_prompt`, four trajectory arrays (15 values each at months 0-120), `dial_ages` (age at dialysis threshold or null), `slope`/`slope_description` (populated at 2+ visits), and `visit_count`.

**Confidence tiers:** Tier 1 = required fields only; Tier 2 = Tier 1 + BOTH hemoglobin AND glucose (Decision #12); Tier 3 = Tier 2 + 3 or more visit dates.

**Rate limiting:** Magic link requests: 3/email/15min. Guest predictions: 10/min. Authenticated predictions: 30/min. All other: 60/min. Headers: `X-RateLimit-Remaining`, `Retry-After`.

**CORS:** Origins include `kidneyhood.org`, `www.kidneyhood.org`, `staging.kidneyhood.org`, `localhost:3000`. Credentials enabled for httpOnly cookies. Methods: GET, POST, DELETE, OPTIONS.

### Jira Stories

SPEC-6, SPEC-7, SPEC-10, SPEC-18, SPEC-20, SPEC-22, SPEC-24, SPEC-28, SPEC-30, SPEC-82; Subtasks: SPEC-37, SPEC-38, SPEC-40, SPEC-57, SPEC-59, SPEC-60, SPEC-63, SPEC-65, SPEC-67, SPEC-76, SPEC-79

---

## Appendix B: Database Engineering

### Scope

The database layer provides HIPAA-compliant persistent storage for all patient data, authentication tokens, guest sessions, and audit records. PostgreSQL 15+ on AWS RDS with KMS encryption. The MVP uses five tables.

### Key Decisions

- **No password storage** (Decision #1): `users` table has no `password_hash` column. Authentication is via `magic_link_tokens`.
- **Guest data is PHI** (Decision #4): `guest_sessions` table stores JSONB lab data with 24-hour TTL. Full encryption and audit logging apply.
- **No prediction storage** (Decision #10): No `predictions` table. Compute on demand.
- **Audit trail survives deletion** (Decision #14): `audit_log.user_id` uses `ON DELETE SET NULL`. Records persist indefinitely (HIPAA minimum: 6 years).
- **Defense-in-depth validation** (Decision #9): CHECK constraints on all lab value columns mirror API validation ranges exactly.
- **UUID primary keys** on all application tables (prevents enumeration). BIGSERIAL for audit_log (write performance).
- **3NF normalization** — no denormalization is needed for MVP query patterns.

### Requirements Summary

**Tables:**

| Table | Purpose | Key Properties |
|-------|---------|---------------|
| `users` | Patient accounts | UUID PK, email UNIQUE, sex NOT NULL CHECK, no password_hash |
| `lab_entries` | Per-visit lab values | FK to users (CASCADE), CHECK constraints on all ranges, visit_date for multi-visit |
| `magic_link_tokens` | Passwordless auth | FK to users (CASCADE), token_hash (SHA-256), single-use (used_at), 15-min TTL |
| `guest_sessions` | Ephemeral guest data | JSONB lab_data, session_token UNIQUE, 24-hour TTL (expires_at DEFAULT) |
| `audit_log` | HIPAA access log | BIGSERIAL PK, FK to users (SET NULL), action/resource_type/resource_id, JSONB details, INET ip_address |

**RBAC:** `app_service` (DML on data tables, INSERT-only on audit_log), `app_admin` (ALL for migrations).

**Indexes:** FK columns, composite (user_id, visit_date) for multi-visit queries, token_hash for auth verification, expires_at for purge cron, composite audit indexes for compliance queries.

**Purge cron:** `DELETE FROM guest_sessions WHERE expires_at < NOW()` every 15 minutes via pg_cron. Each run logged to audit_log.

**Migrations:** Alembic with SQLAlchemy. All environments use the same migration chain. `app_admin` role runs migrations; `app_service` never does.

### Jira Stories

SPEC-18, SPEC-22, SPEC-25, SPEC-29, SPEC-30, SPEC-83, SPEC-85, SPEC-89; Subtasks: SPEC-62, SPEC-64, SPEC-68, SPEC-69, SPEC-70, SPEC-72, SPEC-73

---

## Appendix C: Frontend Architecture

### Scope

The frontend is a Next.js 15 App Router application using server components for static content and client components for interactive elements (prediction form, Visx chart, auth flows). It calls FastAPI directly — no BFF layer. UI built with shadcn/ui (Radix primitives) and Tailwind CSS.

### Key Decisions

- **No BFF** (Decision #7): Client components call FastAPI directly over HTTPS. No Next.js API routes as proxy.
- **Visx for charting** (Decision #6): D3 primitives as React components, rendering to SVG for full accessibility control.
- **Zustand + TanStack Query** (Decision #7): Zustand for UI state (form values, disclaimers, auth); TanStack Query for API cache and mutations.
- **MSW for parallel development**: Mock Service Worker intercepts API calls during development, returning responses matching the published OpenAPI contract.
- **Compute-on-demand** (Decision #10): Every chart render requires a fresh `POST /predict`. No cached predictions.
- **Mobile-first responsive**: Three breakpoints (mobile <768px, tablet 768-1024px, desktop >1024px). Content max-width 960px. Minimum touch target 44px. Minimum input font size 16px.

### Requirements Summary

**Route structure:**

| Route | Rendering | Purpose |
|-------|-----------|---------|
| `/` | Server (wraps client form) | Landing page with prediction form |
| `/results` | Client | Chart + stat cards + disclaimers + save prompt |
| `/auth/login` | Client | Magic link email entry |
| `/auth/verify` | Client | Token verification from URL |
| `/account` | Client (auth-gated) | Authenticated dashboard |
| `/account/history` | Client (auth-gated) | Historical lab entries |

**Component architecture:** ~40 components organized into form/ (PredictionForm, NumberInput, SexRadioGroup, etc.), chart/ (PredictionChart, TrajectoryLines, PhaseBands, etc.), results/ (StatCardGrid, UnlockPrompt, SavePrompt, etc.), layout/ (Header, DisclaimerBlock/Footer), and auth/ (MagicLinkForm, MagicLinkSent, AuthBanner).

**Data flow:** Guest prediction sends inline lab data to `POST /predict`; server sets httpOnly session cookie. Authenticated flow calls `POST /lab-entries` first, then `POST /predict` with stored entry IDs. Errors parsed from the standardized envelope and mapped to form fields.

**State management:** Three Zustand stores (form-store, ui-store, auth-store). TanStack Query manages API cache with mutations for predict, lab-entries, and auth endpoints.

### Jira Stories

SPEC-2, SPEC-3, SPEC-4, SPEC-5, SPEC-8, SPEC-9, SPEC-10, SPEC-11, SPEC-12, SPEC-13, SPEC-14, SPEC-15, SPEC-16, SPEC-17, SPEC-19, SPEC-21, SPEC-23, SPEC-24, SPEC-26, SPEC-27; Subtasks: SPEC-31 through SPEC-36, SPEC-39, SPEC-41 through SPEC-56, SPEC-58, SPEC-61, SPEC-66, SPEC-71

---

## Appendix D: UX/UI Design

### Scope

UX/UI design covers all user-facing screens, flows, interactions, and visual specifications for the KidneyHood web application. Deliverables include user flow diagrams, wireframes at three breakpoints, component specifications, design tokens mapped to Tailwind CSS, chart interaction specifications (two variants), and a WCAG 2.1 AA accessibility plan targeting CKD patients aged 60+.

### Key Decisions

- **Progressive disclosure**: Required fields shown first; optional (Tier 2) and silent fields in collapsible sections. Single-screen form, not multi-step.
- **Two chart variants** (Decision #6): Variant A (full Visx interactive — tooltips, crosshairs, stat card highlighting) and Variant B (simplified static fallback). Selection blocked on Frontend Developer's POC.
- **True linear time axis** (Decision #5) with chart footnote explaining compressed first-year data density.
- **Sticky disclaimer footer on mobile** (Decision #11): Collapsed single-line, expandable on tap. Inline on desktop.
- **Save prompt post-prediction** (Decision #4): "Your results will be available for 24 hours. Create a free account to save them permanently." Appears 2 seconds after chart renders. Dismissible.
- **44px minimum touch targets** (WCAG 2.5.5, AAA level): Critical for 60+ audience with reduced fine motor control.
- **Inter font family**: Excellent number rendering for lab values and chart labels.

### Requirements Summary

**User flows:** 8 documented flows — Guest Prediction, Account Creation (magic link), Returning User Sign-In, Multi-Visit Re-Entry, Tier Upgrade, Error Recovery, Magic Link Expiry/Retry, Guest Data Expiry. Session lifecycle state diagram covers Anonymous → Guest → Authenticated → Signed Out transitions.

**Design tokens:** Full palette mapped to Tailwind CSS variables (primary #1D9E75, secondary #378ADD, destructive #D32F2F, etc.). Typography scale from 12px caption to 28px display. 8px-based spacing grid. Border radii from 4px to 9999px (pill). Shadow scale from sm to xl.

**Wireframes:** All screens at mobile (<768px), tablet (768-1024px), and desktop (>1024px). Key screens: Landing, Prediction Form, Loading State, Results, Save Prompt, Sign-In, Magic Link Sent, Expired Link, Guest Data Expired, Error States.

**Chart specifications:** Visx SVG with 4 trajectory lines (distinct colors + dash patterns), dialysis threshold at eGFR 15, CKD phase bands, end-of-line labels with 15px collision avoidance, responsive sizing via `@visx/responsive` ParentSize.

**Accessibility:** WCAG 2.1 AA checklist with 30+ criteria mapped to components. Screen-reader-accessible data table alternative for chart. Keyboard navigation maps for all flows. Color contrast verified for all combinations. Reduced motion support.

### Jira Stories

SPEC-14, SPEC-27 (coordination with Frontend Developer)

---

## Appendix E: Test Strategy

### Scope

QA covers the full test pyramid — unit tests (60%), integration tests (30%), and E2E tests (10%) — plus contract testing, accessibility auditing, security validation, visual regression, and HIPAA compliance verification. QA approval is required for every story, sprint, and release.

### Key Decisions

- **Test pyramid with strict thresholds**: Backend unit 90% line coverage, frontend unit 85% line coverage, 100% contract endpoint coverage, 100% E2E critical path pass rate, 0 critical/serious axe-core violations. All PR-blocking.
- **Schemathesis for contract testing**: Auto-generates tests from the OpenAPI 3.1 spec, validating every endpoint/method/status combination.
- **Playwright for E2E**: Cross-browser, mobile viewport emulation, built-in accessibility scanning via `@axe-core/playwright`.
- **5 QA gates per sprint**: Spec Review → Contract Lock → Component Review → Integration → Pre-Release. All blocking.
- **Synthetic data only**: No real patient data in any environment. Deterministic seed data with fixed UUIDs covering all tiers, boundary values, and edge cases.
- **Visual regression baselines** for Visx SVG chart — stored in repo, changes require explicit QA approval.

### Requirements Summary

**9 E2E critical journeys** (8 active, 1 deferred):
1. First-time guest prediction (Tier 1)
2. Tier upgrade flow (Tier 1 → Tier 2)
3. Account creation via magic link with guest data migration
4. Multi-visit entry (2 visits → 3+ visits with slope)
5. ~~PDF download~~ — DEFERRED (Decision #2)
6. Error handling (out-of-range values, server errors)
7. Mobile responsive (375px viewport)
8. Guest data purge (24hr TTL)
9. User deletion + audit persistence (ON DELETE SET NULL)

**Contract tests:** 30+ test cases across auth, lab-entries, predict, and delete endpoints. Boundary-value testing on all numeric fields. Error envelope validation on every 4xx/5xx response.

**Security tests:** Magic link token lifecycle (expiry, single-use, entropy, timing attack resistance), JWT session management, guest session security (httpOnly, 24hr TTL, atomic migration), HIPAA controls (encryption at rest/transit, RBAC, audit immutability, PHI not in logs).

**Tier transition tests:** 8 explicit test cases covering Tier 1 baseline, hemoglobin-only (stays Tier 1), glucose-only (stays Tier 1), both (upgrades to Tier 2), 3+ visits (Tier 3), 2 visits (stays Tier 2), sex=unknown (lower confidence), and sex omitted (validation error).

### Jira Stories

SPEC-77

---

## Appendix F: System Architecture

### Scope

System architecture covers the overall service topology, deployment strategy, data flow patterns, security model, and cross-cutting concerns for the KidneyHood application.

### Key Decisions

- **Monolithic backend for MVP**: The rules engine is embedded in FastAPI as a Python module. No microservices until Phase 3 scale demands them.
- **Contract-first development**: The OpenAPI 3.1 spec is the binding interface. Both frontend and backend build against it in parallel using mocks (MSW) and contract tests (Schemathesis).
- **Compute-on-demand** (Decision #10): Predictions are never stored. The rules engine recomputes on every request, minimizing HIPAA surface area.
- **Three-tier deployment**: Next.js on Vercel (edge), FastAPI on AWS ECS/Fargate (auto-scaling), PostgreSQL on AWS RDS (encrypted).
- **GitHub Actions CI/CD**: Lint → Unit → Integration → Contract → E2E → Accessibility → Coverage → Deploy to Staging (auto on merge to main) → Deploy to Production (manual gate).

### Requirements Summary

**Service architecture:**

```
Client (Next.js 15, Vercel)
  ↕ HTTPS/JSON
API (FastAPI, AWS ECS/Fargate)
  ↕ TLS/SQL
Database (PostgreSQL, AWS RDS, KMS-encrypted)
  ↑ (embedded)
Rules Engine (Lee's IP, deterministic, proprietary)
```

**Data flows:** Four primary flows documented — Guest Prediction, Authenticated Prediction, Magic Link Auth, and Multi-Visit (3+ entries, Tier 3). Each flow shows the interactions among the Client, Frontend, API, and Database layers.

**Security model:** PHI classification covers email, DOB, name, lab values, CKD diagnosis, visit dates, prediction trajectories, IP addresses in audit log, and guest session data. Non-PHI: session tokens, JWT tokens (no PHI in payload). Encryption: AES-256 at rest (KMS), TLS 1.2+ in transit, SHA-256 for magic link tokens.

**Deployment environments:** Local dev (Docker Compose: FastAPI + PostgreSQL + MailHog), Staging (mirrors production security: ECS/Fargate + RDS encrypted), Production (ECS/Fargate + RDS + CloudWatch). Staging must mirror production security controls to support HIPAA validation.

**Branch strategy:** `main` deploys to staging automatically. Feature branches: `feat/SPEC-{number}-{description}`. No long-lived development branches.

### Jira Stories

SPEC-84, SPEC-85 (coordination); infrastructure: SPEC-74, SPEC-75, SPEC-78
