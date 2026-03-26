## Technical Update — John Donaldson

This is the first engineering progress report for KidneyHood. I want to walk you through the technical decisions we have made, how your calculation spec maps into our implementation, and the tradeoffs we chose along the way. Everything below is grounded in the Lean Launch MVP PRD (approved March 25) and your Server-Side Calculation Specification v1.0.

### Frontend: Next.js 15 + shadcn/ui + Tailwind CSS

The patient-facing app is built on Next.js 15, deployed to Vercel. Three reasons drove this choice:

1. **Server-side rendering for SEO.** Next.js renders HTML on the server before sending it to the browser. That means search engines see fully formed content on the landing page and educational screens — not a blank page that waits for JavaScript to load. For a tool that needs to be findable by patients searching "kidney function calculator" or "eGFR trajectory," this is non-negotiable.

2. **Accessible component library.** We are using shadcn/ui, which provides pre-built form inputs, buttons, and dialogs that ship with correct ARIA labels, keyboard navigation, and focus management out of the box. Our target audience is 60+ CKD patients. Accessibility is not a nice-to-have — it is a hard requirement. axe-core (automated accessibility testing) must report zero critical or serious violations before we ship.

3. **Instant preview deployments.** Every push to a branch generates a unique preview URL on Vercel. When we open a pull request for, say, the prediction form, you can click a link and see it running live — no need to set up anything locally. This keeps the feedback loop tight during development.

The interactive chart is built with Visx (a React wrapper around D3) rendering four SVG trajectory lines with tooltips, crosshairs, and hover states — exactly as specified. Tailwind CSS handles all styling with utility classes, which keeps the design system consistent and the CSS footprint small.

### Backend: FastAPI on Railway + PostgreSQL

The API server is FastAPI, a Python web framework. We chose it for one overriding reason: **your calc spec is written in Python pseudocode.** The CKD-EPI formula, the phase 1 exponential saturation, the phase 2 logarithmic accumulation, the per-tier decline rates — all of it translates almost line-for-line into the production prediction module. There is no language barrier between your spec and our implementation.

FastAPI also gives us automatic OpenAPI documentation (a live, interactive page where you can see every endpoint, its inputs, and its outputs) and native async support (the server can handle many concurrent requests without blocking).

The database is PostgreSQL, managed by Railway alongside the API. Railway provides zero-config deploys — we push code, it builds and runs. The managed Postgres instance includes automatic backups and SSL. At $5/month for the hobby tier, it is the right fit for an MVP that needs to prove value before we invest in heavier infrastructure.

### How Your Calc Spec Maps to Implementation

I want to be precise here so you can cross-reference against your document.

**Section 1 — Time Points Array.** The 15-value array `[0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]` becomes a hardcoded constant in the prediction module. It is returned verbatim in the `/predict` response as `time_points_months` so the frontend chart can map each value to patient age on the X-axis. No ambiguity here — your confirmed array is the array we ship.

**Section 2 — Dialysis Threshold.** You corrected our earlier assumption: the threshold is eGFR 12, not eGFR 15. This is now locked in across the codebase — the horizontal dashed line on the chart, the `dial_ages` interpolation logic, and all test assertions use 12. Your `compute_dial_age` pseudocode with linear interpolation between surrounding time points is implemented as-is.

**Section 3 — Trajectory Engine (all four paths).** This is the core of the `/predict` endpoint. Your spec defines four distinct trajectory calculations, and we implement all four:

- **No-treatment path (Section 3.2):** Linear decline using the BUN-adjusted annual rate. Base rate selected by CKD stage at baseline, plus the BUN modifier (0.15 mL/min/yr per 10 mg/dL above 20). Your worked example — eGFR 33, BUN 35, annual decline of -2.43 — is one of our unit test assertions.
- **Three treatment paths (Sections 3.3–3.5):** Each path runs through three phases. Phase 1 (months 0–3) uses your exponential saturation function `1 - exp(-2.5 * t/3)` with per-tier caps and the 0.31 eGFR/mg-dL coefficient. Phase 2 (months 3–24) uses logarithmic accumulation `log(1 + (t-3)) / log(22)` with per-tier structural gains (+4, +6, +8). Post-phase-2 (months 24–120) applies the per-tier annual decline rates (-1.5, -1.0, -0.5). Your complete pseudocode in Section 3.6 is essentially our production function signature.

**Section 3.7 — BUN Suppression Estimate.** This is a new field in the API response: `bun_suppression_estimate`. Calculated as `(baseline_bun - 10) * 0.31`, capped at the tier maximum of 12. It tells the patient how many eGFR points their kidneys are currently losing due to elevated BUN. Straightforward addition — no new endpoint, just a new field on the existing `/predict` response.

**Section 4 — Test Vectors.** You provided three fully worked test vectors with exact expected outputs at every time point. These become golden-file boundary tests for LKID-27. Our QA engineer (Yuri) will assert that the engine produces values within your specified +/-0.2 eGFR tolerance for all three vectors: the spec example patient (BUN 35, eGFR 33, age 58), the stage 5 high-BUN patient (BUN 53, eGFR 10, age 65), and the mild CKD patient (BUN 22, eGFR 48, age 52). If any value drifts outside tolerance, the build fails.

**Section 5 — Optional Modifiers (Confidence Tier 2).** The hemoglobin, CO2, and albumin modifiers that adjust post-phase-2 decline rates are architecturally supported — the prediction function accepts optional parameters for these fields, and the modifier logic is stubbed. But for the Lean Launch MVP, we are shipping with required fields only (BUN, creatinine, age) at a single confidence level. Tier 2 is deferred to post-MVP. The important thing: when we turn it on, the plumbing is already there. No rewrite needed.

**One correction your spec flagged that we have adopted:** Potassium is not an input to the prediction engine. It was in our earlier assumptions (from v1.0 of the product spec), but your v2.0 spec explicitly removed it. The MVP form collects BUN, creatinine, and age for prediction, plus name and email for lead capture.

### Auth: Clerk Magic-Link

Authentication is handled entirely by Clerk, a managed auth provider. The user enters their email, receives a magic link (no password to remember — critical for 60+ users who may not have a password manager), clicks it, and lands back in the app verified.

Under the hood: Clerk issues a JWT (a signed token) that the frontend sends with every API request. FastAPI verifies the JWT signature against Clerk's public keys. This is a dependency-injected check on the `/predict` and `/predict/pdf` endpoints only — the health check and auth endpoints remain open.

The lead capture happens in two places. First, when a user calls `/predict`, the handler upserts their name, email, and submitted lab values into the `leads` table. Second, a Clerk webhook fires on `user.created` and upserts email-only leads — catching users who verify their email but never submit the form. The upsert uses `COALESCE` so that a webhook-created lead (email only) gets its lab values filled in when the user later submits the form, without losing the original record.

The `leads` table is the only persistent data in the system. This is stateless lead gen, not a patient portal. There are no user accounts, no saved history, no dashboards. The prediction response is computed on demand and never stored.

### PDF Generation: Playwright

When the user clicks "Download PDF," the frontend calls `POST /predict/pdf`. The API re-runs the prediction engine (stateless — same inputs always produce the same outputs), then hands the results to Playwright (headless Chromium running on Railway). Playwright navigates to an internal-only Next.js page that renders the chart as a React/Visx SVG component, waits for the SVG to appear, and calls `page.pdf()`.

Why Playwright instead of a PDF library like ReportLab or WeasyPrint? Because the chart is a React component with interactive SVG elements. Rendering it through a headless browser preserves exact visual fidelity — the PDF looks identical to what the patient sees on screen. A PDF library would require us to re-implement the chart in a completely different rendering pipeline and maintain two versions of the same visualization.

The internal chart page is protected by a shared secret query parameter — it is not publicly accessible. Playwright runs as a persistent browser context (reuse browser, new page per request) to keep render times in the 1–3 second range.

### Technical Tradeoffs

**Railway vs. AWS.** We chose simplicity over control. Railway gives us managed Postgres, automatic SSL, environment variable injection, and 90-second deploys — all for $5/month. AWS (ECS/Fargate + RDS + ALB + CloudWatch) would give us auto-scaling, fine-grained networking, and production-grade monitoring, but the setup cost is measured in days, not hours. The MVP does not need auto-scaling. If KidneyHood proves its value and traffic grows, we migrate to AWS with the same Python codebase and the same Postgres schema. Nothing we are building is Railway-specific.

**Single leads table vs. full schema.** Our original architecture had five database tables (users, lab_entries, magic_link_tokens, guest_sessions, audit_log). The Lean Launch MVP has one: `leads`. It stores email, name, the four lab values submitted, a source flag (predict vs. webhook), and a timestamp. That is it. We are not storing medical records. We are not building a patient portal. The prediction output lives only in the API response and the rendered PDF — it never touches the database. This eliminates HIPAA-scoped data storage entirely.

**Stateless PDF re-rendering vs. cached results.** When a user requests a PDF, we re-run the prediction engine from scratch rather than retrieving a stored result. This is a deliberate choice: the prediction is deterministic (same inputs, same outputs, every time), so caching adds complexity and storage cost with zero benefit. It also means we never have stale PDFs if we update the engine coefficients in a future release — every PDF reflects the current algorithm.

**Rate limiting with slowapi.** We use in-memory rate limiting (3 requests per 15 minutes on `/auth/request-link`, 10 per minute on `/predict`, 5 per minute on `/predict/pdf`). In-memory is sufficient for a single Railway instance. If we scale to multiple instances, we swap in a Redis backend — slowapi supports it with a one-line configuration change.

### What Is Unblocked

Your calc spec answered every open question we had flagged as "Pending — Needs Lee's Input" in our backend research document. Specifically: the time points array is confirmed, the dialysis threshold is confirmed at eGFR 12, the formula coefficients are provided with Python pseudocode, the four trajectory paths are fully specified, and the three test vectors give Yuri everything he needs for golden-file boundary tests. The prediction engine implementation can proceed immediately.
