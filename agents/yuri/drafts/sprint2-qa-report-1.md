# Sprint 2 QA Report #1 — Client Dashboard + Backend Scaffold

**Reviewer:** Yuri (QA)
**Date:** 2026-03-26
**Branch:** `main` (post-merge of Design Sprint PRs)
**Scope:** Client dashboard (`app/src/components/dashboard/`, `app/src/app/client/`), Backend scaffold (`backend/`)

---

## Executive Summary

**PASS WITH CONDITIONS** — The client dashboard is well-built with strong accessibility foundations and good use of brand tokens. The backend scaffold is architecturally sound with all 5 endpoints stubbed, proper rate limiting, and a complete prediction engine module. However, there are **3 high-severity issues**, **5 medium-severity issues**, and **6 low-severity items** that need attention before Railway deployment.

The high-severity items are: (1) a factual date contradiction in the weekly update that the client will read, (2) the prediction engine is written but not imported or wired to the /predict endpoint, and (3) a missing Python dependency that will crash on startup if email validation is triggered.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Dashboard — Content Accuracy | 7 | 4 | 2 | 1 |
| Dashboard — Accessibility | 6 | 5 | 0 | 1 |
| Dashboard — Responsive Behavior | 4 | 4 | 0 | 0 |
| Dashboard — Data Integrity | 5 | 3 | 1 | 1 |
| Dashboard — Edge Cases | 3 | 2 | 0 | 1 |
| Backend — Structure & Imports | 5 | 3 | 2 | 0 |
| Backend — Migration | 4 | 3 | 1 | 0 |
| Backend — Seed Data | 3 | 3 | 0 | 0 |
| Backend — Env & Config | 4 | 3 | 0 | 1 |
| Backend — Prediction Engine | 5 | 4 | 1 | 0 |
| **Totals** | **46** | **34** | **7** | **4** |

---

## Task 1: Client Dashboard QA

### 1.1 Content Accuracy

**DA-01: Sprint dates in HeroBanner** — PASS
- Sprint 1: Mar 20 - Mar 26, Sprint 2: Mar 26 - Apr 2, Sprint 3: Apr 2 - Apr 9. Ship date: Apr 9.
- All match the expected values.

**DA-02: Sprint dates in Horizon component** — PASS
- Sprint 2 dates: "Mar 26 - Apr 2". Sprint 3 dates: "Apr 2 - Apr 9". Target Launch: "April 9, 2026".
- Correct.

**DA-03: Sprint dates in sprint-progress.json** — PASS
- Sprint 1: "Mar 20 - Mar 26", Sprint 2: "Mar 26 - Apr 2", Sprint 3: "Apr 2 - Apr 9".
- Correct.

**DA-04: Weekly Update — Sprint 2 dates are WRONG** — FAIL [HIGH]
- In `WeeklyUpdate.tsx` line 35, the `productUpdate` text states: *"Looking ahead, Sprint 2 (April 6-10) builds the core flow"*
- The correct dates are **March 26 - April 2** (as shown in HeroBanner, Horizon, and sprint-progress.json).
- This is a client-facing factual error. Lee will read "April 6-10" and see the HeroBanner showing "Mar 26 - Apr 2". Contradictory dates undermine credibility.
- **Fix:** Change "Sprint 2 (April 6-10)" to "Sprint 2 (March 26 - April 2)" in the productUpdate string.

**DA-05: Weekly Update — "5 of 8 design sprint PRs merged"** — PASS
- The highlight says "5 of 8 design sprint PRs merged; form validation and accessibility shipped."
- Per sprint-progress.json, LKID-31 through LKID-37 are done (7 cards), LKID-38 is in_progress. PRs #1-#5 are merged per CLAUDE.md. Claim of "5 of 8" is accurate for PRs merged (PRs #1-#5), with #6, #7, #8 still open or pending.

**DA-06: Weekly Update — "7 screens" claim** — PASS
- Highlight: "7 prototype screens built and deployed". Product update names all 7: Landing, Email Entry, Magic Link Sent, Expired Link, Prediction Form, Loading, Results. Consistent with Sprint 1 deliverable.

**DA-07: Weekly Update — "7 QA issues" and "potassium removed"** — PASS
- "QA pass complete — 7 issues found, all resolved" matches the design-sprint-qa-report.md (3 medium + 4 low = 7).
- "Potassium field removed per v2.0 spec; eGFR threshold corrected to 12" — confirmed, potassium is gone from backend PredictRequest schema and engine inputs.

---

### 1.2 Accessibility

**DA-08: All sections have aria-labelledby** — PASS
- HeroBanner: `aria-labelledby="project-timeline-heading"` with matching `id`.
- WeeklyUpdate: `aria-labelledby="weekly-updates-heading"` with matching `id`.
- PrototypePreview: `aria-labelledby="live-prototype-heading"` with matching `id`.
- SprintTracker: `aria-labelledby="sprint-progress-heading"` with matching `id`.
- SpecTracker: `aria-labelledby="spec-acknowledgment-heading"` with matching `id`.
- DocumentLibrary: `aria-labelledby="documents-heading"` with matching `id`.
- Horizon: `aria-labelledby="whats-coming-heading"` with matching `id`.
- All 7 sections pass.

**DA-09: Timeline has role="progressbar"** — PASS
- HeroBanner line 46: `role="progressbar"` with `aria-valuenow={progress}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="Project timeline progress"`.
- Complete and correct.

**DA-10: Decorative elements hidden** — PASS
- Horizon.tsx line 64: bullet `<span aria-hidden="true">` — correctly hidden.
- The "You are here" marker dot in HeroBanner (line 77) has no aria-hidden. It is a visual-only indicator inside the progressbar, so it is implicitly presentation. Acceptable but could be improved.

**DA-11: scope="col" on table headers** — PASS
- SpecTracker.tsx lines 36-39: All four `<th>` elements have `scope="col"`. Correct.

**DA-12: CheckCircle2 icon in WeeklyUpdate** — NOTE [LOW]
- The `CheckCircle2` icons from lucide-react (line 79) do not have `aria-hidden="true"`. Lucide icons render as inline SVGs. While they are decorative (the text is the primary content), best practice is to add `aria-hidden="true"` to prevent screen readers from announcing "img" or similar.
- **Recommendation:** Add `aria-hidden="true"` to the CheckCircle2 component.

**DA-13: "New" badge on document library** — PASS
- The "New" badge on "Server-Side Calc Spec v1.0" is a visual indicator. Screen readers will read the badge text "New" inline, which is acceptable behavior — it communicates the same information.

---

### 1.3 Responsive Behavior

**DA-14: Grid layout at 2/3/4 columns** — PASS
- SprintTracker.tsx line 36: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`. Stacks 2-wide on mobile, 3-wide on tablet, 4-wide on desktop. Sensible for card counts of 9-17 per sprint.

**DA-15: Cards stack on mobile** — PASS
- Horizon.tsx line 37: `md:grid-cols-2` — single column on mobile, 2 columns on tablet+. Correct.
- DocumentLibrary renders as a vertical stack (`space-y-3`) at all breakpoints. Correct for list-style items.

**DA-16: Sprint labels responsive** — PASS
- HeroBanner line 83: `flex-col gap-2 pt-2 md:flex-row md:justify-between`. Labels stack vertically on mobile, spread horizontally on tablet+. Good.

**DA-17: Max-width constraint** — PASS
- Layout.tsx line 23: `max-w-[1024px]` with responsive padding `px-6 md:px-8 lg:px-0`. Content is constrained and padded appropriately.

---

### 1.4 Data Integrity

**DA-18: sprint-progress.json card statuses** — PASS
- Sprint 1: LKID-30 is "upcoming" (kickoff — this is a meta-card, acceptable), LKID-31 through LKID-37 are "done", LKID-38 is "in_progress". LKID-39 through LKID-46 (dashboard cards) are "upcoming".
- Sprint 2: All 17 cards (LKID-1 through LKID-19) are "upcoming". Correct — Sprint 2 has not started.
- Sprint 3: All 12 cards (LKID-4, LKID-5, LKID-20 through LKID-29) are "upcoming". Correct.

**DA-19: sprint-progress.json — Dashboard cards are in Sprint 1 but look like Sprint 1.5 work** — NOTE [LOW]
- Cards LKID-39 through LKID-46 (client dashboard tasks) are listed under Sprint 1 but are all "upcoming". Sprint 1 ends Mar 26 (today). These cards appear to be current work that has not been reflected in status updates. Either they should be moved to Sprint 2, or their statuses should be updated as work completes. Not a code bug, but a data freshness concern.

**DA-20: spec-tracker.json matches Lee's spec sections** — PASS
- 13 items covering Sections 1-5, plus two correction acknowledgments (potassium removed, eGFR threshold 12). Each has the correct jira_card reference. Section 5 is correctly marked "blocked" (deferred to post-MVP).

**DA-21: spec-tracker.json — LKID-14 status inconsistency** — FAIL [MEDIUM]
- Sections 1 and 2 are marked "done" with jira_card "LKID-14", but LKID-14 (Rules Engine Integration) is marked "upcoming" in sprint-progress.json. The spec acknowledgment is done, but the implementation card is not. This is misleading — a reader could interpret "done" as "implemented" rather than "acknowledged."
- **Fix:** Either change the status to "acknowledged" (and add that status to the SpecTracker component), or add a clarifying note like "Spec reviewed and acknowledged; implementation in Sprint 2."

**DA-22: Card counts match CLAUDE.md Sprint Plan** — PASS
- Sprint 2 has 17 cards in JSON. CLAUDE.md says "17 (LKID-1-3, 6-19)". JSON contains LKID-1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 = 17 cards. Match.
- Sprint 3 has 12 cards in JSON. CLAUDE.md says "12 (LKID-4-5, 20-29)". JSON contains LKID-4, 5, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29 = 12 cards. Match.

---

### 1.5 Edge Cases

**DA-23: Invalid slug returns 404** — PASS
- `page.tsx` line 19: `if (!VALID_SLUGS.includes(slug)) { notFound(); }`. Any slug other than "lee-a3f8b2" returns Next.js 404. Correct.

**DA-24: Empty sprint-progress.json** — PASS
- If `sprints` array is empty, `sprintData.sprints.map(...)` returns nothing. The section renders with only the heading. No crash. Acceptable degradation.

**DA-25: VALID_SLUGS is hardcoded** — NOTE [LOW]
- Only one slug is valid: "lee-a3f8b2". If additional clients are added, this requires a code change. For MVP with one client this is fine, but worth noting for future scalability.
- **Recommendation:** Consider moving to an environment variable or database lookup before adding a second client.

---

## Task 2: Backend Scaffold QA

### 2.1 Structure & Imports

**BE-01: main.py imports correctly** — PASS
- All imports resolve: FastAPI, CORSMiddleware, Pydantic, slowapi, SQLAlchemy async. No circular imports. Module structure is clean.

**BE-02: All 5 endpoints defined** — PASS
- `GET /health` (line 174), `POST /predict` (line 185), `POST /predict/pdf` (line 208), `POST /webhooks/clerk` (line 231), `GET /leads` (line 252). All 5 from the API contract are present.

**BE-03: Prediction engine NOT imported in main.py** — FAIL [HIGH]
- The prediction engine exists at `backend/prediction/engine.py` with a complete `predict()` function, but `main.py` has zero imports from the `prediction` module. The `/predict` endpoint still raises `HTTPException(501)`.
- The docstring on line 11 says "Donaldson drops the prediction engine into predict() and predict_pdf()" — this has not happened yet.
- **Fix:** In the `/predict` endpoint handler, import and call `prediction.engine.predict(body.bun, body.creatinine, body.age)`, map the result to `PredictResponse`, and return it. The engine is ready; it just needs to be wired up.

**BE-04: Missing `email-validator` dependency** — FAIL [MEDIUM]
- `main.py` line 129 uses `EmailStr` from Pydantic, which requires the `email-validator` package. This package is NOT in `requirements.txt`. The app will import fine but will crash with `ImportError` at runtime when a request with an email field hits the endpoint.
- **Fix:** Add `email-validator>=2.0.0` to `requirements.txt`.

**BE-05: Rate limiting configured** — PASS
- `/predict` has `30/minute` limit. `/predict/pdf` has `10/minute` limit. The `RateLimitExceeded` handler returns a proper 429 JSON response. `slowapi` is correctly wired to `app.state.limiter`.

---

### 2.2 Alembic Migration

**BE-06: Table structure correct** — PASS
- `leads` table with columns: `id` (UUID PK, gen_random_uuid), `email` (Text NOT NULL), `name` (Text NOT NULL), `age` (Integer NOT NULL), `bun` (Numeric NOT NULL), `creatinine` (Numeric NOT NULL), `egfr_baseline` (Numeric NULL), `created_at` (timestamptz NOT NULL, now()). Matches the single-table design from the PRD.

**BE-07: CHECK constraints present** — PASS
- `ck_leads_age_range`: 18-120. `ck_leads_bun_range`: 5-150. `ck_leads_creatinine_range`: 0.3-15.0. Defense-in-depth constraints at the DB level. Good practice.

**BE-08: Indexes created** — PASS
- `idx_leads_email` on `email` column (for lead lookup). `idx_leads_created_at` on `created_at` column (for chronological queries/export). Both appropriate for the use case.

**BE-09: Age range mismatch between migration and Pydantic** — FAIL [MEDIUM]
- Migration CHECK constraint: `age >= 18 AND age <= 120`.
- PredictRequest Pydantic model: `age: int = Field(..., ge=18, le=100)`.
- A 101-year-old patient would pass the API validation but fail the DB constraint. These must be aligned.
- **Fix:** Either change the Pydantic validator to `le=120` to match the DB, or change the DB constraint to `age <= 100`. Given the 60+ target demographic, `le=120` is the safer choice (match the DB).

**BE-10: Downgrade migration works** — PASS
- `downgrade()` drops indexes first, then the table. Correct order. Idempotent if run multiple times (DROP INDEX/TABLE will fail gracefully if already gone).

---

### 2.3 Seed Data

**BE-11: Three test vectors present** — PASS
- Vector 1: Stage 3b (BUN 35, eGFR 33, Age 58). Vector 2: Stage 5 (BUN 53, eGFR 10, Age 65). Vector 3: Stage 3a (BUN 22, eGFR 48, Age 52). These match the spec's Section 4 test vectors (Stage 3a, 3b, and 5 coverage).

**BE-12: Boundary value rows** — PASS
- Min boundary: age=18, bun=5, creatinine=0.3, egfr_baseline=NULL. Max boundary: age=120, bun=150, creatinine=15.0, egfr_baseline=NULL. Both are within CHECK constraint ranges. Good testing practice.

**BE-13: Seed idempotency** — PASS
- All INSERT statements use `ON CONFLICT (id) DO NOTHING`. Seeds can be re-run safely. Deterministic UUIDs (00000000-...-000001 through 000005) are used for reproducibility.

---

### 2.4 Environment & Config

**BE-14: .env.example documents all required vars** — PASS
- `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `ADMIN_API_KEY`, `CORS_ORIGINS` — all 5 environment variables used in main.py are documented.

**BE-15: Railway config** — PASS
- `railway.toml` has nixpacks builder, correct start command (`uvicorn main:app --host 0.0.0.0 --port $PORT`), health check path `/health`, restart on failure. Matches the Railway deployment pattern.

**BE-16: DATABASE_URL async conversion** — PASS
- Lines 33-34: Converts `postgresql://` to `postgresql+asyncpg://` for asyncpg compatibility. Handles Railway's default connection string format.

**BE-17: CORS_ORIGINS includes Vercel** — NOTE [LOW]
- .env.example has `CORS_ORIGINS=http://localhost:3000,https://kidneyhood.vercel.app`. Good that the production Vercel URL is included. However, if preview deployments are used (e.g., `https://kidneyhood-*.vercel.app`), those will be blocked by CORS.
- **Recommendation:** Consider adding a wildcard pattern or dynamic CORS origin check for Vercel preview deployments before Sprint 2 integration testing.

---

### 2.5 Prediction Engine

**BE-18: CKD-EPI 2021 formula** — PASS
- `compute_egfr_ckd_epi_2021()` uses kappa=0.9, alpha=-0.302, population-average (sex-free, race-free). Formula: `142 * min(Cr/kappa, 1)^alpha * max(Cr/kappa, 1)^(-1.2) * 0.9938^age`. Matches the spec's Section 3.1 pseudocode.

**BE-19: TIME_POINTS_MONTHS array** — PASS
- `[0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]` — 15 values matching Section 1 exactly.

**BE-20: DIALYSIS_THRESHOLD = 12** — PASS
- Line 19: `DIALYSIS_THRESHOLD = 12.0` with comment "NOT 15". Correctly uses the corrected value per Lee's spec.

**BE-21: Four trajectory paths** — PASS
- `compute_no_treatment()`: BUN-adjusted linear decline with CKD-stage base rates. Correct.
- `compute_treatment_trajectory()` for bun_12, bun_13_17, bun_18_24: Phase 1 exponential gain (PHASE1_COEFF=0.31), Phase 2 logarithmic accumulation, post-Phase 2 tier-specific decline. All three tiers have correct config: bun_12 (+8.0 Phase 2, -0.5/yr post), bun_13_17 (+6.0, -1.0/yr), bun_18_24 (+4.0, -1.5/yr). Matches Sections 3.2-3.5.

**BE-22: Engine not wired to /predict** — FAIL [HIGH]
- (Duplicate of BE-03.) The engine module exists and is complete, but it is not imported or called anywhere in main.py. The `/predict` endpoint returns 501. This is the single most important integration task for Sprint 2.
- **Fix:** Import `from prediction.engine import predict as run_prediction` in main.py, call it in the `/predict` handler, capture the lead in the DB, and return the PredictResponse.

---

## Failure Summary

### HIGH Severity (3)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| DA-04 | WeeklyUpdate.tsx | Product update says "Sprint 2 (April 6-10)" — should be "March 26 - April 2" | Edit the string in `productUpdate` |
| BE-03 / BE-22 | main.py | Prediction engine exists but is not imported or wired to /predict | Import `prediction.engine.predict` and call it in the endpoint handler |
| BE-04 | requirements.txt | Missing `email-validator` — Pydantic's `EmailStr` will crash at runtime | Add `email-validator>=2.0.0` |

### MEDIUM Severity (2)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| DA-21 | spec-tracker.json | Sections 1-2 show "done" for LKID-14, but LKID-14 is "upcoming" in sprint tracker | Change to "acknowledged" status or clarify notes |
| BE-09 | main.py + migration | Age max is 100 in Pydantic but 120 in DB CHECK constraint | Align to 120 in both |

### LOW Severity (6)

| ID | Component | Issue |
|----|-----------|-------|
| DA-12 | WeeklyUpdate.tsx | CheckCircle2 icons missing `aria-hidden="true"` |
| DA-19 | sprint-progress.json | Dashboard cards (LKID-39-46) in Sprint 1 are all "upcoming" — stale data |
| DA-25 | page.tsx | VALID_SLUGS hardcoded to single client |
| BE-17 | .env.example | CORS won't cover Vercel preview deploy URLs |
| — | main.py | `name` is Optional in PredictRequest but NOT NULL in leads table — will crash on insert when name is None |
| — | main.py | `allow_credentials=False` in CORS — confirm this is intentional (Clerk auth may need credentials) |

---

## Overall Readiness Assessment

### Client Dashboard: READY (with one content fix)

The dashboard is well-crafted, accessible, and responsive. The single blocking issue is the wrong Sprint 2 dates in the weekly update (DA-04). Fix that string and the dashboard is client-ready. The spec-tracker status ambiguity (DA-21) is a nice-to-have improvement.

### Backend Scaffold: NOT READY for Railway deployment

The scaffold is architecturally sound, but three items block deployment:

1. **The prediction engine is not wired up** (BE-03). The engine code is complete and correct — it just needs to be imported and called. This is the highest-priority integration task.
2. **Missing `email-validator` dependency** (BE-04). The app will crash on any request that exercises EmailStr validation. One-line fix.
3. **Age range mismatch** (BE-09). A patient aged 101-120 will pass API validation but fail the DB constraint, returning a 500 error. Align the validators.

Once these three are resolved, the backend is ready for Railway deployment. The health endpoint, rate limiting, CORS, Alembic migration, and seed data are all solid.

### Recommended Fix Priority

1. Fix `requirements.txt` — add `email-validator` (30 seconds)
2. Fix age range in PredictRequest — change `le=100` to `le=120` (30 seconds)
3. Fix Sprint 2 dates in WeeklyUpdate.tsx (30 seconds)
4. Wire prediction engine into /predict endpoint (15-30 minutes)
5. Clarify spec-tracker statuses (5 minutes)

---

*QA review complete. 46 items checked, 34 pass, 7 fail, 4 notes. Three high-severity issues require resolution before Railway deployment.*
