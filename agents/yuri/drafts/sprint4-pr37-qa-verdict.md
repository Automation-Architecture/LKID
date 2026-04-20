# QA Verdict — PR #37 (LKID-63) — Frontend tokenized flow + Clerk migration

**PR:** [#37](https://github.com/Automation-Architecture/LKID/pull/37)
**Branch:** `feat/LKID-63-frontend-tokenized-flow` (8 commits, HEAD `46d0471`)
**Title:** LKID-63: Frontend — new patient funnel pages + Clerk migration
**Base:** `main`  |  **State:** OPEN  |  **Mergeable:** MERGEABLE
**Author:** Harshit (committed by web3sea)
**Size:** +1977 / −49  across 12 files
**Reviewer:** Yuri (QA)
**Review date:** 2026-04-19
**Jira:** [LKID-63](https://automationarchitecture.atlassian.net/browse/LKID-63)
**Techspec:** `agents/luca/drafts/techspec-new-flow.md` §5 (endpoints), §6 (Clerk), §7 (pages), §12 TICKET-C, §13 OQ-4

---

## Executive Summary

**Verdict: PASS-WITH-NITS. Merge-ready** (pending Luca's decision on the MED-severity structural-floor gap — see IS-01).

Harshit delivered TICKET-C cleanly. All four new routes render, Clerk migration is tight (ClerkProvider scoped to `/client/[slug]`; patient funnel is 100% Clerk-free; Lee's dashboard still loads), the internal chart route hard-404s without a valid PDF_SECRET, landing-page CTAs all repointed to `/labs`, no sessionStorage writes in new funnel, no `@ts-nocheck` in new code, clean typecheck, clean build, clean secret scan. MSW handlers cover the four techspec §5 endpoints.

The only substantive finding is the already-self-flagged structural-floor regression (backend `GET /results/{token}` does not return `inputs`, so `/results/[token]` and `/internal/chart/[token]` silently omit the BUN callout for BUN>17 patients in prod). This is a MED — intended behavior is preserved only in dev/MSW. Harshit correctly did not touch backend per dispatch. Luca decides: (a) tiny backend follow-up adding `inputs` (or `input_bun`) to `ResultsResponse`, or (b) post-ship Jira card.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Route structure | 4 | 4 | 0 | 0 |
| Clerk migration | 6 | 6 | 0 | 0 |
| Landing CTAs | 4 | 4 | 0 | 0 |
| Form validation / a11y | 5 | 5 | 0 | 0 |
| Error handling (404/410/429/500) | 4 | 4 | 0 | 0 |
| sessionStorage audit | 4 files | 4 | 0 | 0 |
| MSW handlers | 4 | 4 | 0 | 0 |
| Build / lint / typecheck | 3 | 3 | 0 | 0 |
| Self-smoke | 10 routes | 10 | 0 | 0 |
| Secret scan | 1 | 1 | 0 | 0 |
| Structural-floor callout | 1 | 0 | 1 (MED) | 0 |
| PDF from preview | 1 | — | — | 1 (expected) |
| **Totals** | **47** | **45** | **1** | **1** |

---

## AC Matrix (LKID-63)

| # | Acceptance Criterion | Verdict | Evidence |
|---|-----------------------|---------|----------|
| AC-01 | `/labs` renders without ClerkProvider in scope; no `@ts-nocheck` | PASS | `app/src/app/labs/page.tsx:1-24` is "use client" with no Clerk imports; grep for `ts-nocheck` in new files returns 0 |
| AC-02 | `/gate/[token]` shows blurred preview | PASS | `app/src/app/gate/[token]/page.tsx:507-535` renders `.preview-wrap` with `filter: blur(8px)` + overlay modal |
| AC-03 | `/gate/[token]` redirects to `/results/[token]` if `captured: true` | PASS | `gate/[token]/page.tsx:385-388` — `router.replace` on captured=true |
| AC-04 | `/gate/[token]` shows "invalid/expired" UI on 404/410 | PASS | `gate/[token]/page.tsx:372-375` sets kind "invalid"; rendered at 490-495 with CTA to `/labs` |
| AC-05 | `/results/[token]` renders chart + stat cards from API | PASS | `results/[token]/page.tsx:245-247` mounts `<EgfrChart data={state.chart} />` via `transformPredictResponse` |
| AC-06 | `/results/[token]` PDF button navigates to `/reports/[token]/pdf` | PASS | `results/[token]/page.tsx:221, 259-273` — `<a href="${API_BASE}/reports/${token}/pdf" target="_blank">` |
| AC-07 | "Edit info" returns to `/labs` with no pre-fill | PASS | `results/[token]/page.tsx:275-283` — bare `<Link href="/labs">`, no query string |
| AC-08 | `/client/lee-a3f8b2` still loads with auth | PASS | Smoke test: HTTP 200 on `/client/lee-a3f8b2`; ClerkProvider preserved in `client/[slug]/layout.tsx:20-30` |
| AC-09 | `/internal/chart/[token]?secret=X` renders with correct secret, 403/404 for wrong | PASS | `internal/chart/[token]/page.tsx:58-61` — `notFound()` (→ 404) on missing/wrong secret. Note: dispatch said "403/404" permissive; `notFound()` returns 404 which is arguably better (prevents secret-existence leak) |
| AC-10 | Landing CTAs point to `/labs` | PASS | `page.tsx` grep: 4 occurrences of `href="/labs"`, 0 of `/auth`, 0 of `/predict` |
| AC-11 | No sessionStorage reads or writes in new pages | PASS | Grep of new funnel files: zero hits (only docstring comments) |
| AC-12 | Playwright smoke: full funnel completes | DEFERRED | Requires live Railway — per dispatch this is validated in LKID-65 (Yuri owns) after merge |
| AC-13 | Reviewed by Inga (visual) and Yuri (functional) | IN-PROGRESS | This is Yuri's functional review. Inga review tracked separately. |

**13/13 AC in review scope:** 11 PASS, 1 DEFERRED (needs post-merge prod), 1 IN-PROGRESS (this review).

---

## Techspec Compliance

### §5 Endpoint contracts (frontend call sites)

| Endpoint | Techspec expectation | Frontend call site | Verdict |
|----------|---------------------|--------------------|---------|
| POST /predict | Returns `{ report_token, ...result }` | `labs/page.tsx:430, 462-468` — reads `data.report_token`, routes to `/gate/${token}` | PASS |
| GET /results/[token] | Returns `{ report_token, captured, created_at, result, lead? }` | `gate/[token]/page.tsx:366-393`, `results/[token]/page.tsx:119-151`, `internal/chart/[token]/page.tsx:30-46` | PASS |
| POST /leads | `{ report_token, name, email }` → `{ token }` | `gate/[token]/page.tsx:435-443` — body shape matches; redirect to `/results/${token}` | PASS |
| GET /reports/[token]/pdf | Returns PDF bytes | `results/[token]/page.tsx:221, 259-265` — anchor tag target `_blank` | PASS |

### §6 Clerk migration

| Step | Techspec expectation | Result | Verdict |
|------|----------------------|--------|---------|
| Step 1 | `ClerkProvider` moved to `client/[slug]/layout.tsx` | `app/src/app/client/[slug]/layout.tsx:20-48` | PASS |
| Step 2 | `ClerkProvider` removed from root `layout.tsx` | `app/src/app/layout.tsx` has NO ClerkProvider; only `<SkipNav />`, `<Analytics />`, Inter font, metadata | PASS |
| Step 3 | No `middleware.ts` changes | `middleware.ts` still doesn't exist | PASS |
| Step 4 | `/client/lee-a3f8b2` still renders | Smoke test HTTP 200 | PASS |
| Step 5 | New `/labs` has no `@ts-nocheck` | Grep confirms 0 in new funnel | PASS |
| Step 6 | `/predict`, `/results` (old) preserved | Both still mount; added route-level `ClerkProvider` wrappers at `/predict/layout.tsx`, `/auth/layout.tsx` (necessary — legacy pages still use Clerk hooks, and Next 16 statically prerenders client pages so they'd fail at build otherwise). Deletion deferred to LKID-66 | PASS |

### §12 TICKET-C full scope — all 6 deliverables landed

| Deliverable | File(s) | LOC | Verdict |
|-------------|---------|-----|---------|
| Clerk migration | `layout.tsx`, `client/[slug]/layout.tsx`, `auth/layout.tsx`, `predict/layout.tsx` | +35 / −17, +28, +30 | PASS |
| `/labs` | `labs/page.tsx` | +655 | PASS |
| `/gate/[token]` | `gate/[token]/page.tsx` | +639 | PASS |
| `/results/[token]` | `results/[token]/page.tsx` | +291 | PASS |
| `/internal/chart/[token]` | `internal/chart/[token]/page.tsx` (server) + `ClientChart.tsx` (client) | +75 + +114 | PASS |
| Landing CTAs repointed | `page.tsx` | +4 / −4 | PASS |

### §13 OQ-4 (no admin bypass)

PASS — Grep across all four new funnel files for `admin`, `bypass`, `role`, `ADMIN` returns zero matches. No hidden auth paths; everyone goes through `/gate/[token]`. The `/internal/chart/[token]` secret-gate is a Playwright-only route, not a user-facing bypass.

---

## Focus-Area Findings

### 1. Route structure — PASS

All four new routes exist and return expected status codes:

- `app/src/app/labs/page.tsx` — exists, "use client", no Clerk imports. Smoke: `GET /labs` → 200.
- `app/src/app/gate/[token]/page.tsx` — exists, uses `params: Promise<{ token: string }>` + `use(params)` (Next.js 16 async params pattern). Smoke: `GET /gate/fake-token` → 200.
- `app/src/app/results/[token]/page.tsx` — exists, async params pattern. Smoke: `GET /results/fake-token` → 200. **Coexists with legacy `app/src/app/results/page.tsx`**: `ls app/src/app/results/` shows both `page.tsx` (legacy, sessionStorage-based) and `[token]/page.tsx` (new, API-driven). Next resolves `/results/<token>` to `[token]/page.tsx` and `/results` (no segment) to `page.tsx`. Build output confirms: `/results` and `/results/[token]` listed as separate routes.
- `app/src/app/internal/chart/[token]/page.tsx` — exists, **server component** (no `"use client"` directive; uses `async` + `await params` + `notFound()`). `?secret=` validation at lines 58-61 — calls `notFound()` if `PDF_SECRET` env var is missing OR the query param mismatches. Companion `ClientChart.tsx` is the client wrapper.

**Note on the "secret=correct" smoke result:** When I hit `/internal/chart/fake-token?secret=smoketest` with PDF_SECRET=smoketest exported, I got 404. That's because there's no FastAPI backend running locally, so `fetchResult()` returns `null` and the server component falls through to the second `notFound()` at line 64-66. This is correct fail-safe behavior — the route will work end-to-end once backend is live and a real token is issued.

### 2. Clerk migration — PASS (all 4 sub-checks)

- **Root layout gutted (correct):** `app/src/app/layout.tsx` no longer contains `ClerkProvider`. Still has `<SkipNav />`, `<Analytics />`, Inter font, metadata. Clean.
- **`/client/[slug]/layout.tsx` hosts ClerkProvider:** Full `<ClerkProvider>` with appearance config + `signInFallbackRedirectUrl="/client"`.
- **Transitional layouts for legacy routes:** Harshit added `app/src/app/predict/layout.tsx` and `app/src/app/auth/layout.tsx` as minimal ClerkProvider wrappers. These are 28–30 LOC each, pure wrapper, no other logic. Without them, Next 16's static prerendering of client components would fail to build the legacy `/predict` and `/auth` pages (they still import `useUser`, `useAuth`, `useSignIn`). **LKID-66 is expected to delete all three (layout + page) together.**
- **Clerk-free audit on new funnel:** Grep `ClerkProvider|useUser|useAuth|currentUser|@clerk` across `labs/`, `gate/[token]/`, `results/[token]/`, `internal/chart/[token]/`: **zero matches.** Patient funnel is 100% Clerk-free.
- **Lee's dashboard smoke:** `GET /client/lee-a3f8b2` → HTTP 200. Dev log shows Clerk "keyless mode" notice (benign — no prod keys in local dev) but the route renders 200. This is the hard gate in the dispatch and it **PASSES**.

### 3. Landing page CTAs — PASS

- Grep `href="/labs"` in `app/src/app/page.tsx`: **4 occurrences** at lines 738, 768, 935, 1030.
  - Line 738 — mobile menu CTA
  - Line 768 — hero primary CTA
  - Line 935 — navy-band CTA ("light" variant)
  - Line 1030 — final-card CTA
- Grep `href="/auth"` and `href="/predict"` in `page.tsx`: **zero matches.**

### 4. Form validation + a11y on /labs — PASS

- **Reuses shared validation:** `labs/page.tsx:18-22` imports `PREDICT_FORM_RULES`, `TIER2_FORM_RULES`, `validateField` from `@/lib/validation`. Confirmed in source: `src/lib/validation.ts` lines 21, 30, 35.
- **16px min font on inputs:** `labs/page.tsx:171` (`font-size: 16px` on inputs); globals.css line 159 sets `input, select, textarea { font-size: max(16px, 1em); }` as base layer. iOS auto-zoom prevention satisfied.
- **44px min touch target:** `labs/page.tsx:176-177` (`min-height: 44px` on inputs; 48px explicit height); line 224, 239, 278 for buttons/CTAs. globals.css:152 enforces `min-height: 44px` on all interactive elements as base layer.
- **htmlFor wiring:** `labs/page.tsx:623` (`<label htmlFor={def.id}>`); gate/[token]/page.tsx lines 560, 585 (`htmlFor="gate-name"`, `htmlFor="gate-email"`).
- **aria-describedby + role="alert":** `labs/page.tsx:637, 648` (aria-describedby on input; role="alert" on hint div when error). Also `506` for `apiError` banner with `role="alert" aria-live="assertive"`. gate/[token]/page.tsx lines 569, 578, 595, 604 mirror the pattern. Grep of labs/page.tsx for a11y attributes returns 5 matches (`htmlFor`, `aria-describedby`, `role="alert"`, `aria-invalid`).

### 5. Error handling — PASS

- **404/410** on `/gate/[token]` and `/results/[token]`: both pages explicitly handle `res.status === 404 || res.status === 410` and route to the "invalid" UI state. gate: lines 372-375; results/[token]: lines 125-128. Both show `role="alert"` card with CTA to `/labs`.
- **429** rate limit: labs/page.tsx:451-455 and gate/[token]/page.tsx:457-460 show user-visible message "Too many attempts. Please wait a minute and try again."
- **500** generic: labs/page.tsx:456-460 and gate/[token]/page.tsx:461-464. labs has an `apiError` banner (line 505-509) rendered above the form with `role="alert"` and `aria-live="assertive"`. Not a full retry button in labs itself, but the form remains mounted with all fields preserved — user can re-submit by clicking "See my results" again. results/[token]/page.tsx also has an explicit error state card at lines 195-219 with a link back to `/labs`. Acceptable.

### 6. sessionStorage / localStorage audit — PASS

Grep of new funnel files: **zero sessionStorage/localStorage reads or writes.**

- `labs/page.tsx` — only a docstring comment ("No sessionStorage / localStorage writes.").
- `gate/[token]/page.tsx` — only a docstring comment ("Token lives only in the URL path — no sessionStorage.").
- `results/[token]/page.tsx` — zero matches.
- `internal/chart/[token]/page.tsx` + `ClientChart.tsx` — zero matches.

Legacy `/predict/page.tsx` (lines 323, 325) and `/results/page.tsx` (lines 91, 92, 222, 239) still use sessionStorage — but those are out of scope for this PR (deleted in LKID-66).

### 7. MSW handlers — PASS

`app/src/mocks/handlers.ts` — all 4 new techspec §5 endpoints present:

| Handler | Line | Shape vs techspec §5 |
|---------|------|----------------------|
| `POST */predict` | 54-58 | Returns `{ report_token, ...MOCK_RESULT }` — matches `PredictResponse` interface (§5.1) |
| `GET */results/:token` | 61-74 | Returns `{ report_token, captured, created_at, result, inputs, lead }` — matches `ResultsResponse` (§5.2); **note: MSW includes `inputs` but real backend does not** (see IS-01) |
| `POST */leads` | 77-95 | Returns `{ ok, captured, token }` on success; 422 with proper error envelope on missing fields — matches §5.3 |
| `GET */reports/:token/pdf` | 98-107 | Returns `%PDF` magic bytes with `Content-Type: application/pdf` + `Content-Disposition` header — correct for browser download trigger |

Also kept: legacy `POST */api/predict` handler (line 48-51) for back-compat with old `/predict` page until LKID-66.

The shared state `mockCaptured: boolean` (line 44) flips `false→true` on POST /leads and back to `false` on POST /predict. This correctly simulates the techspec flow: labs → gate (captured=false) → results (captured=true).

### 8. Build / lint / typecheck — PASS

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npx tsc --noEmit` | PASS (clean, exit 0) |
| Build | `NEXT_PUBLIC_API_URL=http://localhost:8000 npx next build` | PASS — compiled in 3.1s. **11 routes listed** in output (10 user-facing + `/_not-found`). New routes all present: `/labs` (static), `/gate/[token]`, `/results/[token]`, `/internal/chart/[token]` all dynamic (ƒ). Legacy `/predict`, `/results`, `/auth` also present. `/client/[slug]` dynamic. |
| Lint | `npx eslint src/app src/lib src/mocks` | **4 errors + 1 warning, all in legacy files** (`/predict/page.tsx`, `/auth/page.tsx`, `/results/page.tsx`) — `@ts-nocheck` usage + `react-hooks/set-state-in-effect`. **Zero lint errors in PR #37's new code.** These are pre-existing, acknowledged in the PR body, and scheduled for removal in LKID-66. |
| `@ts-nocheck`/`@ts-ignore` scan | Grep in new funnel dirs | 0 matches |

Build output confirms route list matches §10 rollout expectation — 10 user-facing routes (landing + 4 new funnel + 4 legacy + 1 dashboard) as documented in the PR body.

### 9. Harshit's self-flagged items

#### IS-01 [MED] Structural-floor callout regression in prod

**Root cause:** Backend `GET /results/{token}` currently returns `{ report_token, captured, created_at, result, lead }` per techspec §5.2 — **no `inputs` field.** Both `/results/[token]/page.tsx:142-147` and `/internal/chart/[token]/page.tsx:71-72` probe `data.inputs?.bun` which resolves to `null`/`undefined` in prod, so the `inputBun !== null` guard at `results/[token]/page.tsx:251` and the `bun !== null` guard at `ClientChart.tsx:66` evaluate false → callout silently omitted.

**Impact:** For patients with BUN > 17 (the BUN-structural-floor cohort from LKID-5 + Lee Q3), the "suppression vs. structural capacity" explanation will NOT render on prod. It WILL render correctly in MSW-backed dev and in the E2E test suite because `handlers.ts:69` includes `MOCK_INPUTS` in the mocked response. This makes it a prod-only silent regression that tests won't catch.

**Why MED not HIGH:** The chart itself, scenario pills, and PDF still render; only the supplemental callout is missing. The Stage-4 golden vector would still produce the correct headline trajectory. However, LKID-5's approved scope and Lee's Q3 confirmation explicitly require the structural-floor framing for BUN>17 — omitting it is a regression from prod main behavior.

**Remediation options (Luca's call):**
1. **Preferred — one-line backend change:** Extend `ResultsResponse` in `backend/main.py` to include `inputs: dict` (or just `input_bun: Optional[float]`). The row already has `predictions.inputs` JSONB from PR #34. File size: ~5 LOC. Either Luca opens a follow-on card for John or adds to LKID-65/66.
2. **Defer:** Accept the gap, file a Jira card for post-ship fix. Users missing the callout see a still-correct chart; the callout is additive context.

**Not a merge blocker** — per dispatch, Harshit was forbidden from touching backend. The gap is clearly flagged in the PR body under "Known gaps / follow-ups." Luca decides.

#### IS-02 [KNOWN] PDF-from-Vercel-preview expected to 500

Per techspec §10, the prod Railway Playwright worker navigates to prod Vercel's `/internal/chart/[token]?secret=...`. That route only exists on main after PR #37 merges. So clicking "Download Your Results (PDF)" from the preview URL will 500 until PR #37 lands on main. This is techspec-anticipated, not a defect. Harshit's PR body calls it out. **Not a merge blocker.**

### 10. Self-smoke with MSW

Dev server on port 3459, `PDF_SECRET=smoketest` env var set. Results:

| Path | Expected | Actual | Result |
|------|----------|--------|--------|
| `/` | 200 | 200 | PASS |
| `/labs` | 200 | 200 | PASS |
| `/gate/fake-token` | 200 | 200 | PASS |
| `/results/fake-token` | 200 | 200 | PASS |
| `/internal/chart/fake-token` | 404 (no secret) | 404 | PASS |
| `/internal/chart/fake-token?secret=bogus` | 404 (bad secret) | 404 | PASS |
| `/internal/chart/fake-token?secret=smoketest` | 200 with backend / 404 without | 404 (no FastAPI local; fetchResult null → notFound) | PASS (fail-safe) |
| `/client/lee-a3f8b2` | 200 | 200 | **PASS — Clerk dashboard loads** |
| `/predict` | 200 | 200 | PASS |
| `/auth` | 200 | 200 | PASS |

Dev log (`/tmp/next-pr37.log`) — zero unhandled errors, zero warnings beyond benign Clerk "keyless mode" notice. Dev server killed cleanly after test.

### 11. Secret scan — PASS

`git diff origin/main...HEAD -- app/ | grep -E "(re_[A-Za-z0-9]{15,}|pk_live_|sk_live_|CLERK_SECRET_|KLAVIYO_.*=)"` → **zero matches.**

---

## Issue List

### MEDIUM (1)

| ID | Component | Severity | File:line | Issue | Suggested fix |
|----|-----------|----------|-----------|-------|---------------|
| IS-01 | Results page structural-floor callout | MED | `app/src/app/results/[token]/page.tsx:142-147, 251` + `app/src/app/internal/chart/[token]/page.tsx:71-72` | Probes `data.inputs?.bun` which is always null in prod (backend doesn't return `inputs`). Callout silently omitted for BUN>17 cohort. Regression from current prod `/results` behavior. Dev + MSW + E2E all pass because MSW includes `MOCK_INPUTS`. | Backend: add `inputs: dict` to `ResultsResponse` — ~5 LOC in `backend/main.py`. Alternatively, accept gap and file post-ship card. **Luca decides — outside PR scope per dispatch.** |

### LOW / NITS (2)

| ID | Component | Severity | File:line | Issue |
|----|-----------|----------|-----------|-------|
| IS-03 | CodeRabbit focus-trap finding on gate modal | NIT | `gate/[token]/page.tsx:537-545` | `role="dialog" aria-modal="true"` but no initial focus or focus-trap. CodeRabbit flagged (nitpick). Manual Tab still reaches inputs within 2 keystrokes. Consider follow-up for GA. Not a WCAG blocker. |
| IS-04 | Stale comment in root layout | NIT | `app/src/app/layout.tsx:18-25` | JSDoc says `/auth` and `/predict` "will fail at runtime until LKID-66 deletes them." False — transitional route layouts now provide ClerkProvider, and smoke tests confirm both return 200. Harmless; comment should be rewritten or removed in LKID-66. |

### KNOWN (1)

| ID | Component | File:line | Note |
|----|-----------|-----------|------|
| IS-02 | PDF from Vercel preview | n/a | Preview's PDF button will 500 against prod Railway because `/internal/chart/[token]` doesn't exist on prod until this PR merges. Techspec §10 anticipated. Will work post-merge. |

**Bug count:** 0 HIGH / 1 MEDIUM / 2 LOW+KNOWN.

---

## Copilot + CodeRabbit status

- **Copilot:** Reviewed 2026-04-20 01:48 UTC against commit `46d0471`. State: `COMMENTED`, 7 inline comments — overlap heavily with CodeRabbit findings. Primary findings captured in IS-01 and IS-03 above.
- **CodeRabbit:** Reviewed 2026-04-20 01:50 UTC. State: `COMMENTED`, 7 actionable + 1 nitpick. Key findings:
  - Structural-floor gap (both `/results/[token]` and `/internal/chart/[token]` + MSW shape mismatch) — captured as IS-01.
  - `ClerkProvider signInFallbackRedirectUrl="/client"` points at a non-existent concrete route → post-Clerk-signin 404 risk. **Minor concern:** valid if user signs in without a `[slug]`. Currently the dashboard is accessed via direct URL (`/client/lee-a3f8b2`) with no sign-in gate in front, so the fallback URL isn't exercised in practice. Acceptable for MVP. Flag for LKID-66.
  - Focus-trap on gate modal — captured as IS-03.
  - Stale `layout.tsx` comment — captured as IS-04.
  - `tier2HasErrors` blocking submit when optional section is collapsed — valid UX concern. User entered an invalid optional value, collapsed the optional panel, then submits. Blocked with no visible error. **LOW, not blocking** — collapsing an invalid optional input is a deliberate user choice; current behavior errs on side of correctness. File as follow-up.
  - `#pdf-ready` set before chart fully paints — **potential Playwright race**. ClientChart.tsx:68-94 places `id="pdf-ready"` on the outer container unconditionally. Visx `ParentSize` needs a layout pass. However the current prod PDF pipeline (PR #35 backend) uses `networkidle` waiting and already tolerates the existing /predict chart's same pattern, so likely benign. Worth validating post-merge once backend can invoke the real endpoint. **LOW.**

None of the auto-reviewer findings rise to HIGH. All captured above.

---

## Test Results Summary

- **Typecheck:** PASS — `npx tsc --noEmit` clean
- **Build:** PASS — `npx next build` compiled in 3.1s, 10 user-facing routes + `/_not-found`, no errors
- **Lint:** PASS for PR scope — 0 errors in PR #37 new code; 4 pre-existing legacy errors in `/predict`, `/auth`, `/results/page.tsx` (untouched by this PR, scheduled for LKID-66)
- **Secret scan:** CLEAN — 0 matches for re_/pk_live_/sk_live_/CLERK_/KLAVIYO_ patterns
- **Smoke:** 10/10 routes returned expected HTTP codes, including Clerk-migrated `/client/lee-a3f8b2` → 200
- **Grep audits:** Clerk-free on new funnel (0 matches), sessionStorage on new funnel (0 matches), `@ts-nocheck` on new funnel (0 matches)
- **E2E:** Deferred per dispatch — LKID-65 updates E2E + a11y suites; this PR makes them fail intentionally (flagged in PR body)

---

## Readiness Assessment

**READY for merge** — with one conditional on Luca.

Conditions:

1. **Decide on IS-01 (structural-floor gap):** Luca chooses (a) tiny backend follow-up card for John, or (b) post-ship Jira. Either way, **not a merge blocker** — the PR does exactly what the dispatch scoped. Flagging is the correct action.
2. Harshit's rollout sequence note (§10) — PR A (DB) and PR B (backend) must be **deployed to prod Railway** before PR #37's preview can be fully smoke-tested end-to-end. Confirm PRs #33, #34, #35 have auto-deployed to prod before merging #37.
3. Post-merge: Yuri (LKID-65) updates E2E + a11y tests to target the new funnel paths. Expected this PR's E2E breaks — that's intentional.

## Recommendation

**APPROVE — merge-ready pending Luca's IS-01 decision.**

The work is clean, well-documented, and correctly scoped. Harshit flagged the backend gap himself in the PR body, declined to touch backend per dispatch, and delivered everything TICKET-C asked for. The Clerk migration — the highest-risk part of the PR — is executed with the right boundaries: dashboard preserved, patient funnel stripped, transitional layouts for legacy pages so the build succeeds until LKID-66. Focused review found one MED (prod-only, self-flagged, non-blocking) and two nits.

No HIGH findings. No blockers in this PR's scope.

---

## PR #38 verification — IS-01 resolution

**PR:** [#38](https://github.com/Automation-Architecture/LKID/pull/38) — `fix(backend): include inputs in GET /results/[token] response`
**Branch:** `fix/results-inputs-field`
**HEAD SHA verified:** `1fe9f19d0974c8298d844068af24336b57a17c7b`
**Author:** John Donaldson
**Scope:** Resolves IS-01 (MED) flagged above. 2-LOC fix + 1 new round-trip test.
**Review date:** 2026-04-19

### Fix confirmation

- `backend/main.py:398` — `ResultsResponse` model gains `inputs: dict[str, Any]` with LKID-63 IS-01 comment. Confirmed.
- `backend/main.py:619` — handler populates `"inputs": row["inputs"] or {}` (safe empty-dict fallback for legacy rows). Confirmed.
- Diff is exactly the claimed 2 additions + 10 lines of explanatory comments. No other hunks in `backend/`.

### Tests

- `pytest backend/tests/test_new_flow_endpoints.py -v` — **24/24 PASSED** (was 23). New test `TestResultsEndpoint::test_results_response_includes_inputs` PASSED.
- Scoped regression — `test_new_flow_endpoints.py` + `test_email_renderer.py` + `test_prediction_engine.py`: **158/158 PASSED** (24 + 10 + 124). Matches expected total.

### Safety / PII audit

- `grep "inputs\[.name.\]|inputs\[.email.\]" backend/` — zero matches. `inputs` never indexed by name/email keys anywhere.
- `PredictRequest` pydantic model (main.py:276–316) declares only lab values + age + sex. Extra fields (including legacy `name`/`email` from the old `/predict` page) are silently dropped by pydantic v2 before `body.model_dump()` at line 486, so the `inputs` JSONB column cannot contain PII by construction. Contact info is captured separately on `leads` via POST /leads per §5 of the techspec. Safe to expose via GET /results.

### Secret scan

- `git diff origin/main...HEAD -- backend/ | grep -E "(re_[A-Za-z0-9]{15,}|pk_live_|sk_live_|KLAVIYO_)"` — zero matches. Clean.

### Copilot status

- `gh pr view 38 --json reviews` returns `[]` — no Copilot (or other) review yet. Non-blocking for a 2-LOC fix + test, but flagging per SOP. Luca may choose to wait.

### Verdict

**PASS — MERGE-READY.** IS-01 resolved exactly as scoped. No new issues, no test regressions, no PII leakage, no secrets. This unblocks the BUN structural-floor callout on the `/results/[token]` and `/internal/chart/[token]` pages for BUN>17 patients.

---

## PR #41 Verification (2026-04-19) — a11y contrast follow-up

**Branch:** `fix/LKID-63-a11y-contrast-regressions`
**Commit:** `78ba6134aac561852347274d92d2e64b79a52176`
**Title:** `fix(a11y): address WCAG AA contrast regressions on /labs and /gate`

### Diff scope audit

- `git diff origin/main...HEAD --stat` — 2 files, 8 insertions / 8 deletions:
  - `app/src/app/gate/[token]/page.tsx` (4 lines)
  - `app/src/app/labs/page.tsx` (4 lines)
- Diff audit: every hunk is a single-value CSS color swap. Specifically:
  - `/gate`: `preview-sub` and `preview-stat .label` → `var(--body)` → `var(--ink-2)` (bumping to the higher-contrast ink token on the white preview panel)
  - `/gate`: `.field .hint` and terms footer → `var(--muted)` → `var(--body)`
  - `/labs`: unit suffix, `.hint`, `.kh-foot` and footer nav links → `var(--muted)` → `var(--body)`
- Zero layout, spacing, markup, or JS changes. Zero scope creep.

### Secret scan

- `git diff origin/main...HEAD | grep -E "(re_[A-Za-z0-9]{15,}|pk_live_|sk_live_)"` — zero matches.

### A11y suite result

`cd app && npx playwright test --config=playwright.a11y.config.ts --reporter=line`

- **3 passed / 1 failed** (this branch pre-dates PR #40, so the test count is 4, not 5 — the task description assumed PR #40 was already merged).
  - PASS: `home page`
  - PASS: `prediction form` (exercises the same `.hint` token that `/labs` uses — confirms contrast fix holds)
  - PASS: `auth page`
  - FAIL: `results page` — `getByTestId('input-bun').fill('16')` strict-mode violation (2 input-bun elements on /predict). This is a pre-existing Yuri test-mock / selector debt on the `/predict` form, **unrelated** to PR #41's color-value changes. Will be addressed in my PR #40 test-fix pass.
- No contrast violations triggered on any of the 3 routes whose colors changed or whose colors share the touched tokens.

### Verdict

**PASS — MERGE-READY.** Diff is 100% within scope (color values only), no secrets, a11y regressions from today's run are cleared on `/` and `/predict`. The one failure is pre-existing Yuri test-mock debt on `/predict`'s `input-bun` selector; it does not impugn Harshit's fix. Safe to merge.

GitHub review URL: see `gh pr review 41` comment filed at the same time as this verdict.

---

## PR #48 verification — LKID-67 Harshit-half (chart stat-card text re-tokening)

**Date:** 2026-04-19
**Reviewer:** Yuri
**PR:** https://github.com/Automation-Architecture/LKID/pull/48
**Branch:** `feat/LKID-67-chart-text-retoken`
**Commit SHA verified:** `a3307783dae5e12245ec16815497062783fc879c`

### Diff scope

`git diff origin/main...HEAD --stat`:

```
 app/src/components/chart/EgfrChart.tsx | 10 +++++++---
 app/tests/a11y/accessibility.spec.ts   | 20 +++++++++++++-------
 2 files changed, 20 insertions(+), 10 deletions(-)
```

Exactly the 2 files the dispatch specified. No unrelated files touched.

### 5 hex values — HTML text fixes verified, SVG occurrences untouched

Case-insensitive scan of `app/src/components/chart/EgfrChart.tsx`:

| Hex | Prior usage (HTML text) | In this PR | Any remaining occurrence | Context |
|-----|-------------------------|------------|--------------------------|---------|
| `#1d9e75` / `#1D9E75` | via `traj.color` in stat-card `<p style={{color:…}}>` (line 716) | Replaced by `text-foreground` class | Line 556 (`stroke`), line 565 (`fill`) | SVG Tier-1 badge — Inga's scope |
| `#378add` / `#378ADD` | via `traj.color` in stat-card `<p style={{color:…}}>` (line 716) | Replaced by `text-foreground` class | None in file (comes from `traj.color` prop at runtime; used inside `<Text fill={traj.color}>` at line 477 — SVG) | SVG end-of-line label — Inga's scope |
| `#85b7eb` / `#85B7EB` | via `traj.color` in stat-card `<p style={{color:…}}>` (line 716) | Replaced by `text-foreground` class | Same as above — prop-driven, only consumed inside SVG | SVG end-of-line label — Inga's scope |
| `#aaaaaa` / `#AAAAAA` | N/A (not found statically; referenced by prior `.exclude` comment) | N/A | No literal match in file | — |
| `#888888` | HTML footnote `<p style={{color:"#888888"}}>` (line 786) | Replaced by `text-muted-foreground` class | Line 345 (`fill="#888888"`) | SVG phase-label `<Text>` — Inga's scope |

All HTML text occurrences are now token-based (`text-foreground` / `text-muted-foreground`). Only remaining literal hex values live inside SVG (`<Text fill=...>`, stroke/fill on Tier badge) — explicitly Inga's half.

### Exclusion narrowing — PASS

`accessibility.spec.ts`:

- Broad `.exclude('[data-testid="egfr-chart-wrapper"]')` — **removed**
- Only `.exclude("svg")` remains — scopes audit to HTML chrome of the chart wrapper (stat cards, footnote, header) while keeping SVG internals out-of-scope for Inga's half.

### Test results

| Suite | Command | Result |
|-------|---------|--------|
| a11y | `npx playwright test --config=playwright.a11y.config.ts` | **5/5 PASS** (8.5s) |
| E2E | `npx playwright test --config=playwright.e2e.config.ts` | **6/6 PASS** (7.8s) |
| Typecheck | `npx tsc --noEmit` | Clean (0 errors) |
| Lint | `npx eslint src/components/chart/EgfrChart.tsx` | Clean (0 warnings) |

A11y suite now audits the chart's HTML wrapper (post-narrowing) and still passes — confirms the re-tokened colors meet AA contrast.

### Forbidden-change check — PASS

Lines Harshit was explicitly told not to touch:

| Line | Content | Touched in PR? |
|------|---------|----------------|
| 345 | `fill="#888888"` (SVG phase label) | No |
| 477 | `fill={traj.color}` (SVG end-of-line label) | No |
| 556 | `stroke={… "#1D9E75" : "#F59E0B"}` (SVG Tier badge) | No |
| 565 | `fill={… "#1D9E75" : "#92400E"}` (SVG Tier badge) | No |

All SVG-internal chart colors intact for Inga's follow-up PR.

### Secret scan — PASS

`git diff origin/main...HEAD | grep -E "(re_[A-Za-z0-9]{15,}|pk_live_|sk_live_)"` returned zero matches.

### Verdict

**PASS — MERGE-READY.** Harshit executed the narrow Harshit-half of LKID-67 exactly to spec: (1) 2 HTML text sites re-tokened, (2) a11y exclusion narrowed from whole-wrapper to SVG-only, (3) SVG internals untouched for Inga, (4) a11y 5/5 and E2E 6/6 green, (5) typecheck + lint clean, (6) no secrets. The Inga-half (chart SVG colors — lines, phase labels, Tier badges, end-of-line labels) remains the outstanding AC on LKID-67 and must ship in a separate PR before the card can close.

GitHub review URL: see `gh pr review 48` comment filed at the same time as this verdict.

---

# PR #49 verification — LKID-67 Inga half (chart SVG colors)

**PR:** [#49](https://github.com/Automation-Architecture/LKID/pull/49) — "fix(chart): LKID-67 Inga half — AA-compliant trajectory + label colors"
**Branch:** `feat/LKID-67-chart-svg-colors`
**Commit SHA:** `62f8ecba5e7c80ceda4fa2e620fee680fc45ab78`
**Reviewer:** Yuri (QA)
**Review date:** 2026-04-19

## Diff scope — PASS

Exactly the 3 expected files, no scope creep:

```
agents/inga/drafts/lkid-67-chart-color-decision.md | 123 +++++++++++++++++++
app/src/components/chart/EgfrChart.tsx             |  17 ++-
app/src/components/chart/transform.ts              |  16 ++-
3 files changed, 147 insertions(+), 9 deletions(-)
```

## Hex replacements — PASS

All 5 new AA-compliant hex values present in code:

| Hex | Location | Role |
|---|---|---|
| `#047857` (emerald-700) | `transform.ts:26`, `EgfrChart.tsx:563,572` | BUN ≤ 12 trajectory + Tier-1 badge stroke/text |
| `#0369A1` (sky-700) | `transform.ts:32` | BUN 13–17 trajectory |
| `#B45309` (amber-700) | `transform.ts:39` | BUN 18–24 trajectory |
| `#374151` (slate-700) | `transform.ts:46` | No-treatment trajectory |
| `#475569` (slate-600) | `EgfrChart.tsx:347` | Phase-band labels |

All 5 old values (`#AAAAAA`, `#85B7EB`, `#378ADD`, `#1D9E75`, `#888888`) are **absent from code paths**; the only remaining occurrences are in historical/documentation comments (`EgfrChart.tsx:337, 550, 794`) which is expected and intentional.

## Contrast verification — PASS

Independently recomputed on the confirming side (against `#FFFFFF` background) — all five ratios exceed WCAG AA 4.5:1:

```
#047857 → 5.48:1
#0369A1 → 5.93:1
#B45309 → 5.02:1
#374151 → 10.31:1
#475569 → 7.58:1
```

Matches Inga's design-note table exactly.

## A11y suite (current — with `.exclude("svg")`) — PASS

```
5 passed (5.3s)
```

5/5: home, labs, gate, results, auth. No regression from PR #48 state.

## A11y suite (temporary — WITHOUT `.exclude("svg")`) — PASS

Temporarily removed `.exclude("svg")` from `app/tests/a11y/accessibility.spec.ts` line 133, re-ran the full a11y suite, then reverted the edit. Result:

```
5 passed (4.6s)
```

**5/5 PASS with the SVG chart internals in scope.** Zero critical/serious axe violations from the re-tokened `<svg>` tree. This is the definitive test of Inga's fix: with the charcoal/emerald/sky/amber/slate palette in place and the phase labels at slate-600, axe finds no color-contrast violations in the chart SVG. Working tree reverted clean — confirmed by `git diff app/tests/a11y/accessibility.spec.ts` returning empty.

## E2E suite — PASS

```
6 passed (3.9s)
```

6/6: happy path, 2× error paths, 3× token routing guards. No regression.

## tsc + lint — PASS

- `npx tsc --noEmit` — zero errors
- `npx eslint src/components/chart/` — zero errors/warnings

## Design note — PASS

`agents/inga/drafts/lkid-67-chart-color-decision.md` (123 lines) explains:
- Four-hue semantic palette rationale (emerald/sky/amber/slate) vs the previous monochromatic blue/green gradient
- Explicit "charcoal, not red" decision for No Treatment to avoid clash with the `#D32F2F` dialysis-threshold line
- Before/after contrast table covering all five direct changes + two inherit-by-reference sites (end-of-line labels, stat-card dots)
- Tier-1 badge re-tokening (emerald-700 on `#E8F5F0` pill → 4.90:1)
- Options considered (A monochromatic dark blues / B semantic story / C darkened greens) with rationale for choosing B

Note: the "Lee items" prompt does not apply here — LKID-67 is a pure design/a11y fix with no clinical inputs. The design note appropriately flags none.

## Secret scan — PASS

No matches for api keys / secrets / passwords / bearer tokens in the 3 changed files.

## Workspace discipline — PASS

- Temporary edit to `accessibility.spec.ts` reverted cleanly (verified via `git diff`).
- Pre-existing unrelated working-tree modifications (`sprint4-pr37-qa-verdict.md` = this file; untracked `luca/drafts/lkid-68-postmortem-synthesis.md` + `docs/client-comms/`) are out of scope and do not originate from this verification run.

## Follow-up recommendation — `.exclude("svg")` is now SAFELY REMOVABLE

**Yes — the exclusion can be removed in a tiny follow-up.** Evidence:

1. Re-ran the a11y suite without `.exclude("svg")` on the PR #49 branch: **5/5 PASS, zero critical/serious violations in the chart SVG tree**.
2. All five failing hex values identified in LKID-67 are fixed at their source (4 trajectory colors in `transform.ts`, phase label in `EgfrChart.tsx:347`).
3. Tier-1 badge is `aria-hidden="true"` so axe ignores it regardless, but its contrast has also been lifted from 3.39:1 to 5.48:1.
4. Visx-internal SVG structures (axis ticks, grid lines, etc.) do not trip critical/serious rules in this suite — the earlier `.exclude("svg")` was a conservative overshoot per Harshit's LKID-67 first-half comment, now provably unneeded.

**Recommendation:** open a ~3-line follow-up PR that removes the `.exclude("svg")` line (currently at `accessibility.spec.ts:133`) along with the explanatory comments immediately above it. This closes the last LKID-65 loophole and makes the a11y suite audit the full results page including chart internals. Suggested Jira: comment on LKID-65 or a new tiny card (`chore(a11y): remove svg exclusion now that LKID-67 landed`).

## Verdict

**PASS — MERGE-READY.**

Inga delivered the second half of LKID-67 tightly scoped: 5 hex replacements across 2 source files, 1 design note, zero regressions. The WCAG AA 4.5:1 threshold is met by all five colors (lowest is amber at 5.02:1). Full a11y suite passes both with the conservative `.exclude("svg")` still in place AND without it — the latter is the true proof that LKID-67 has closed the color-contrast gap inside the chart SVG. LKID-65 a11y exclusion is now redundant and can be removed in a trivial follow-up PR.

GitHub review URL: filed via `gh pr review 49` alongside this verdict.


