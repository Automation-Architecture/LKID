# Sprint 2 QA Report #2 — Dashboard Polish, Clerk Scaffold, Backend Fixes, Railway

**Reviewer:** Yuri (QA)
**Date:** 2026-03-26
**Branch:** `main` (post dashboard polish + backend QA fixes) and `feat/LKID-1-clerk-auth` (PR #12)
**Scope:** Dashboard polish, Clerk auth scaffold, backend QA fixes, Railway deployment status, date consistency audit

---

## Executive Summary

**PASS WITH CONDITIONS** — Significant progress since Report #1. All three HIGH-severity backend issues from the previous report are resolved: the prediction engine is wired to `/predict`, `email-validator` is in `requirements.txt`, and the backend age max is aligned to 120. The dashboard polish (status icons, hero padding, screenshot grid, tile minWidth) is clean. The Clerk scaffold is well-structured.

Two issues remain: (1) the frontend age validation still caps at 100 while the backend accepts 120, and (2) Railway deployment status is unverifiable from the current environment. Five low-severity notes are documented below.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Report #1 Fix Verification | 7 | 6 | 1 | 0 |
| Dashboard Polish | 6 | 6 | 0 | 0 |
| Clerk Auth Scaffold (PR #12) | 5 | 4 | 0 | 1 |
| Backend QA Fixes | 5 | 5 | 0 | 0 |
| Railway Deployment | 1 | 0 | 0 | 1 |
| Date Consistency Audit | 6 | 4 | 0 | 2 |
| **Totals** | **30** | **25** | **1** | **4** |

---

## 1. Report #1 Fix Verification

**FV-01: DA-04 — Sprint 2 dates in WeeklyUpdate** — PASS (was HIGH)
- `WeeklyUpdate.tsx` line 35 now reads: *"Looking ahead, Sprint 2 (March 26 - April 2) builds the core flow"*
- Matches HeroBanner, Horizon, and sprint-progress.json. Fix confirmed.

**FV-02: BE-03/BE-22 — Prediction engine wired to /predict** — PASS (was HIGH)
- `main.py` line 27: `from prediction.engine import predict as run_prediction`
- `main.py` lines 198-203: `/predict` handler calls `run_prediction(bun=body.bun, creatinine=body.creatinine, age=body.age)` and returns the result directly.
- The endpoint is no longer a 501 stub. Fix confirmed.

**FV-03: BE-04 — email-validator dependency** — PASS (was HIGH)
- `requirements.txt` line 11: `email-validator` (unpinned). Present and sufficient for Pydantic `EmailStr`.
- **Note:** Consider pinning to `>=2.0.0` for reproducible builds.

**FV-04: BE-09 — Backend age max aligned to 120** — PASS (was MEDIUM)
- `main.py` line 129: `age: int = Field(..., ge=18, le=120, ...)`. Matches DB CHECK constraint `ck_leads_age_range` (18-120).
- Backend-to-DB alignment is now correct.

**FV-05: Frontend age max still 100 — NOT FIXED** — FAIL [MEDIUM]
- `app/src/lib/validation.ts` line 19: `age: { required: true, min: 18, max: 100, ... }`
- `app/src/app/predict/page.tsx` line 60: `max: 100`
- The backend accepts ages 18-120, the DB accepts 18-120, but the frontend rejects anything over 100. A 105-year-old patient cannot submit the form. Given the 60+ target demographic, this is a real functional gap.
- **Fix:** Change `max: 100` to `max: 120` in both `validation.ts` and `predict/page.tsx`. Update the error message to "Age must be between 18 and 120".

**FV-06: DA-21 — spec-tracker.json status clarity** — PASS (was MEDIUM)
- Sections 1-6 now show status `"unblocked"` (previously were `"done"` in an earlier version), which accurately conveys "reviewed, awaiting implementation." The SpecTracker component renders "Unblocked" badges with a blue style. This is clearer than the ambiguous "done" from before.

**FV-07: DA-12 — CheckCircle2 aria-hidden** — PASS (accepted as-is)
- Still no `aria-hidden` on the icons, but this was LOW severity and non-blocking. Carrying forward as a note.

---

## 2. Dashboard Polish

**DP-01: Status icons on SprintTracker tiles** — PASS
- `SprintTracker.tsx` lines 18-23: `STATUS_ICONS` maps all four statuses to lucide-react icons: `CheckCircle2` (done), `ArrowRightCircle` (in_progress), `XCircle` (blocked), `Circle` (upcoming).
- Icons are rendered at line 58-59 with `aria-hidden="true"` — correctly hidden from screen readers since the status is communicated via badge text and color.
- Icons are positioned `absolute right-2 top-2` with the tile's status text color. Clean implementation.

**DP-02: Hero padding** — PASS
- `HeroBanner.tsx` line 31: `paddingTop: "48px", paddingBottom: "32px"` on the section element.
- Provides good visual breathing room between the header and the timeline bar. The asymmetric padding (more top than bottom) is appropriate since the sprint labels add visual weight below.

**DP-03: Screenshot grid in PrototypePreview** — PASS
- `PrototypePreview.tsx` lines 22-33: `grid grid-cols-1 gap-3 md:grid-cols-3` with three placeholder cells ("Landing Page", "Prediction Form", "Results Chart").
- Cells use `aspect-video` for 16:9 ratio, `rounded-lg` corners, and `rgba(255,255,255,0.1)` translucent background on the teal section. Labels are subtle at 50% white opacity.
- Single column on mobile, 3 columns on tablet+. Responsive and visually balanced.

**DP-04: Tile minWidth** — PASS
- `SprintTracker.tsx` line 53: `minWidth: "140px"` on each card tile.
- Prevents text truncation on narrow viewports. Combined with the responsive grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`), tiles will overflow horizontally rather than collapse to unreadable widths. Correct behavior.

**DP-05: Card tile visual consistency** — PASS
- All tiles use consistent border-radius (`10px`), padding (`p-3 md:p-4`), and status-driven color scheme from `STATUS_STYLES`. The four status states (done/green, in_progress/amber, blocked/red, upcoming/gray) are visually distinct and colorblind-safe (distinct luminance values).

**DP-06: Fallback for unknown status** — PASS
- `SprintTracker.tsx` line 46: `STATUS_STYLES[card.status] ?? STATUS_STYLES.upcoming` and line 59: `STATUS_ICONS[card.status] ?? STATUS_ICONS.upcoming`. Any unrecognized status gracefully falls back to the "upcoming" style and icon. Defensive coding.

---

## 3. Clerk Auth Scaffold (PR #12)

**CK-01: Middleware structure** — PASS
- `app/src/middleware.ts`: Uses `clerkMiddleware` and `createRouteMatcher` from `@clerk/nextjs/server`.
- Public routes: `/`, `/auth(.*)`, `/client/(.*)`, `/api/(.*)`. All prototype and dashboard routes are public. Auth protection is applied to all other routes via `auth.protect()`.
- This is the correct pattern for a lead-gen app where the landing page and prediction form should be publicly accessible.

**CK-02: ClerkProvider in layout.tsx** — PASS
- `app/src/app/layout.tsx` lines 24-39: `ClerkProvider` wraps the entire app with brand-appropriate theming: `colorPrimary: "#004D43"` (brand teal), `borderRadius: "0.5rem"`, `fontSize: "1rem"`.
- The provider is at the root layout level, which is correct — all pages and nested layouts inherit the Clerk context.

**CK-03: Matcher configuration** — PASS
- `middleware.ts` lines 17-23: The matcher skips Next.js internals (`_next`) and static assets (images, fonts, etc.) via a negative lookahead regex. API and tRPC routes always run through the middleware.
- This is the standard Clerk middleware matcher pattern for Next.js 15. Correct.

**CK-04: @clerk/nextjs dependency** — PASS
- `package.json` line 12: `"@clerk/nextjs": "^7.0.7"`. Version 7.x is the current major release for Next.js 15 compatibility.

**CK-05: Public route coverage** — NOTE [LOW]
- The `/predict` route is NOT listed as a public route. Currently the matcher's `isPublicRoute` checks `/`, `/auth(.*)`, `/client/(.*)`, `/api/(.*)`.
- The prediction form at `/predict` and results at `/results` will require authentication once Clerk is fully activated. This is likely **intentional** for lead capture (users must authenticate before predicting), but it should be explicitly confirmed.
- If the prototype "skip to predict" link in the auth page (line 59 of `auth/page.tsx`) is intended to work without auth, `/predict` needs to be added as a public route or the skip link needs to be removed.
- **Recommendation:** Confirm with the team that `/predict` and `/results` should be auth-gated. If yes, remove the "skip to predict" link from the auth page prototype once Clerk is live.

---

## 4. Backend QA Fixes

**BF-01: Prediction engine import** — PASS
- `main.py` line 27: `from prediction.engine import predict as run_prediction`.
- The import uses a clean alias (`run_prediction`) to avoid shadowing the endpoint handler name. Good practice.

**BF-02: /predict endpoint returns real data** — PASS
- Lines 198-203: The handler calls `run_prediction(bun=body.bun, creatinine=body.creatinine, age=body.age)` and returns the dict directly. FastAPI will serialize it against the `PredictResponse` model.
- The response model includes `egfr_baseline`, `time_points_months`, `trajectories` (4 paths), `dial_ages`, and `bun_suppression_estimate`. All fields match the engine's return structure.

**BF-03: email-validator in requirements.txt** — PASS
- Line 11: `email-validator` present. Pydantic's `EmailStr` will resolve at runtime.

**BF-04: Age validation aligned at 120** — PASS
- Backend PredictRequest: `ge=18, le=120`. DB CHECK: `18-120`. Aligned.

**BF-05: Lead capture not yet wired** — PASS (expected)
- The `/predict` handler runs the engine but does not yet insert into the leads table. The TODO on line 196 is removed but no DB session is used. This is acceptable for Sprint 2 Day 1 — lead capture will be wired with the Clerk webhook in LKID-6.

---

## 5. Railway Deployment Status

**RW-01: Deployment status** — NOTE [UNABLE TO VERIFY]
- I was unable to run `railway logs` or `curl` commands from this environment. The Railway CLI requires authenticated access and network connectivity.
- **What I can verify from code:**
  - `railway.toml` is correctly configured: nixpacks builder, uvicorn start command, `/health` healthcheck path, restart-on-failure policy.
  - `Procfile` is present: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`.
  - `requirements.txt` lists all needed dependencies including `email-validator`.
  - The `/health` endpoint returns `{"status": "ok", "version": "2.0.0"}` — Railway's healthcheck should pass.
  - Database engine creation is conditional (`if DATABASE_URL else None`) — the app will start even without a DB, just returning 503 on DB-dependent routes.
- **Recommendation:** Manually verify deployment by running:
  ```bash
  cd /tmp/lkid-work && railway logs --service kidneyhood-backend
  ```
  And if a public URL is available:
  ```bash
  curl https://<railway-url>/health
  curl -X POST https://<railway-url>/predict -H "Content-Type: application/json" -d '{"bun": 35, "creatinine": 2.1, "age": 58}'
  ```

---

## 6. Date Consistency Audit

**Canonical dates:** Sprint 2: Mar 26 - Apr 2 | Sprint 3: Apr 2 - Apr 9 | Ship: Apr 9, 2026

**DC-01: HeroBanner.tsx** — PASS
- SPRINTS array: Sprint 2 `2026-03-26` to `2026-04-02`, Sprint 3 `2026-04-02` to `2026-04-09`. Ship endpoint: Apr 9. Correct.

**DC-02: Horizon.tsx** — PASS
- Sprint 2: "Mar 26 - Apr 2", Sprint 3: "Apr 2 - Apr 9". Target Launch: "April 9, 2026". Correct.

**DC-03: sprint-progress.json** — PASS
- Sprint 2: "Mar 26 - Apr 2", Sprint 3: "Apr 2 - Apr 9". Correct.

**DC-04: WeeklyUpdate.tsx** — PASS
- Product update: "Sprint 2 (March 26 - April 2)". Correct (fixed from Report #1).

**DC-05: Stale dates in archived/non-shipped files** — NOTE [LOW]
- The following files still contain old dates (April 6, April 10, April 17, etc.):
  - `artifacts/archive/PRD-v2-original.md` — "Sprint 2: Apr 6 - Apr 19". This is the **archived** PRD (explicitly labeled "reference only"). Acceptable.
  - `agents/husser/drafts/email-to-lee-week1.md` — "Sprint 2 kicks off April 6". This is Husser's draft email. If this email has already been sent, it is historical. If it has not been sent, the date must be corrected before sending.
  - `agents/gay_mark/drafts/db-deployment-runbook.md` — "Sprint 2, Day 1 (April 6, 2026)". Gay Mark's runbook references the old date. Should be updated to March 26.
  - `docs/prd-sprint-timeline.excalidraw` — Contains "Apr 6 - Apr 19" in a text element. Diagram should be regenerated with correct dates.
- **Recommendation:** Update `db-deployment-runbook.md` and `prd-sprint-timeline.excalidraw` to current dates. Confirm whether `email-to-lee-week1.md` was already sent.

**DC-06: CLAUDE.md (agent-teams)** — PASS
- Sprint plan shows correct dates: Sprint 2 "Mar 26 - Apr 2", Sprint 3 "Apr 2 - Apr 9", Ship "April 9, 2026". No stale references.

---

## Failure Summary

### MEDIUM Severity (1)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| FV-05 | `validation.ts` + `predict/page.tsx` | Frontend age max is 100; backend and DB accept 120. Patients aged 101-120 cannot submit. | Change `max: 100` to `max: 120` in both files. Update error message. |

### LOW Severity / Notes (4)

| ID | Component | Issue |
|----|-----------|-------|
| CK-05 | middleware.ts | `/predict` and `/results` are not public routes — confirm auth-gate intent; remove "skip to predict" link if intended |
| DC-05 | Agent drafts + excalidraw | Three non-shipped files still reference old Sprint 2 dates (April 6) |
| FV-03 | requirements.txt | `email-validator` is unpinned — consider `>=2.0.0` for reproducibility |
| DA-12 | WeeklyUpdate.tsx | CheckCircle2 icons still lack `aria-hidden` (carried from Report #1) |

---

## Comparison to Report #1

| Report #1 Issue | Severity | Status in Report #2 |
|-----------------|----------|---------------------|
| DA-04: Wrong Sprint 2 dates in WeeklyUpdate | HIGH | FIXED |
| BE-03/BE-22: Prediction engine not wired | HIGH | FIXED |
| BE-04: Missing email-validator | HIGH | FIXED |
| DA-21: spec-tracker.json misleading "done" status | MEDIUM | FIXED (now "unblocked") |
| BE-09: Backend age max 100 vs DB 120 | MEDIUM | PARTIALLY FIXED — backend aligned to 120, frontend still at 100 |

**Net result:** 3 of 3 HIGH issues resolved. 2 of 2 MEDIUM issues resolved (1 partially — frontend side remains). The codebase is in significantly better shape than 12 hours ago.

---

## Overall Readiness Assessment

### Client Dashboard: READY
All dashboard polish items pass. Status icons, hero padding, screenshot grid, and tile minWidth are implemented correctly. Date consistency is verified across all shipped dashboard components. No blockers.

### Clerk Auth Scaffold: READY (pending env vars)
The middleware and ClerkProvider are correctly structured. The scaffold requires `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` environment variables to be set on Vercel for Clerk to activate. The route protection pattern is sound. One clarification needed on `/predict` auth gating.

### Backend: READY for Railway deployment
All three Report #1 blockers are resolved. The prediction engine is wired, email-validator is present, and the backend age range is aligned. The `/health` endpoint will satisfy Railway healthchecks. The remaining frontend age-max mismatch (FV-05) does not block backend deployment.

### Railway Deployment: UNVERIFIED
Code-level review of `railway.toml`, `Procfile`, and `requirements.txt` shows the deployment config is correct. Actual deployment status requires CLI access to verify. Recommend manual verification.

### One Action Item Before Sprint 2 Day 2
Fix the frontend age max from 100 to 120 in `validation.ts` and `predict/page.tsx`. This is the only remaining validation mismatch between frontend, backend, and database.

---

*QA review complete. 30 items checked, 25 pass, 1 fail, 4 notes. All three Report #1 HIGH-severity issues confirmed resolved. One MEDIUM-severity frontend validation mismatch remains.*
