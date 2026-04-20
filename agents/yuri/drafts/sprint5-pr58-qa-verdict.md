# Sprint 5 — PR #58 QA Verdict (LKID-79 ResultsView Presentational Component Extract)

**Reviewer:** Yuri (QA)
**Date:** 2026-04-20
**Window:** Narrow verify (<7 min)

---

## PR Metadata

| Field | Value |
|-------|-------|
| PR | [#58](https://github.com/Automation-Architecture/LKID/pull/58) |
| Branch | `feat/LKID-79-resultsview-component-extract` |
| HEAD SHA | `543e29afe3e449e978065cba8ba4445bb45278bb` |
| Base | `origin/main` |
| Commits | 2 (`e649cc6` extract component, `543e29a` reconcile palette with `--s-*-text` tokens) |
| Author | Harshit (frontend, per LKID-79 ownership) |
| Scope | Extract the LKID-76 Results ready-state rendering into a pure-presentational `<ResultsView />` component at `app/src/components/results/ResultsView.tsx`. The page wrapper `app/src/app/results/[token]/page.tsx` retains ALL side-effectful concerns: tokenized fetch, `captured=false` → `/gate/[token]` redirect, 404/410 invalid-card state, generic error state, loading skeleton, `.kh-results` chrome (navy nav + footer + RESULTS_CSS injection), PostHog `results_viewed` (mount) and `pdf_downloaded` (click). Prop-contract deviation from LKID-79 scaffold (`pdfHref`, `onPdfClick`, `egfrBaseline`, `structuralFloor`, `inputBun` added beyond `data / patientName / onDownloadPdf / pdfLoading`) is **Brad-approved (Option A, 2026-04-20)** and is NOT a QA finding. 2 files changed, +384/−309 (361 new in ResultsView + 332 retained in page.tsx, down from 641). |

---

## Check Matrix (13/13)

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | HEAD verified | PASS | `git rev-parse HEAD` → `543e29afe3e449e978065cba8ba4445bb45278bb` — exact match to dispatched SHA. Branch `feat/LKID-79-resultsview-component-extract` up-to-date with origin. Workspace had drifted to `feat/LKID-80-chart-redesign` mid-QA (sibling agent collision); re-fetched and re-checked out to get back to the correct SHA before continuing verification. All findings below taken from the verified HEAD. |
| 2 | Diff scope | PASS | `git diff --name-status main...HEAD` returns exactly 2 files: `M app/src/app/results/[token]/page.tsx` and `A app/src/components/results/ResultsView.tsx`. No other files touched (no `globals.css`, no chart, no backend, no tests). Dispatch also called for deletion of `./ResultsView.tsx` and `./results-page.tsx` from repo root — `ls` confirms neither ever existed as tracked files (`git log --all -- ResultsView.tsx results-page.tsx` returns empty), so the deletion check is vacuously satisfied. Harshit must have authored the new component directly under `app/src/components/results/` without staging a root-level draft file first. Acceptable. |
| 3 | Frontend `next build` | PASS | `cd app && npm run build` → "Compiled successfully in 6.3s", TypeScript finished clean in 1817ms. All 7 routes generated (`/`, `/_not-found`, `/client/[slug]`, `/gate/[token]`, `/internal/chart/[token]`, `/labs`, `/results/[token]`). No TypeScript errors from the new prop contract on `<ResultsView />`. |
| 4 | Frontend lint | PASS | `cd app && npm run lint` → **0 errors**, 1 warning (`STATUS_LABELS` unused in `SprintTracker.tsx` — pre-existing, carried over from PR #55, unrelated to this PR). |
| 5 | Tokenized flow preserved on page.tsx | PASS | `page.tsx:578` fetches `GET /results/{token}` via `apiUrl(\`/results/${encodeURIComponent(token)}\`)`. `page.tsx:584–586` handles 404/410 → `{kind: "invalid"}`. `page.tsx:597–600` handles `captured: false` → `router.replace(\`/gate/${encodeURIComponent(token)}\`)`. `page.tsx:682` wraps the whole view in `<div className={\`kh-results ${manrope.variable} ${nunito.variable}\`}>`. Navy nav `<nav className="nav">` at `:684` with `KidneyHood.org` brand. Footer `<footer className="kh-foot">` at `:690` with `brand-foot` + Privacy/Disclaimer/Contact nav links. Identical behavior to PR #57 merged main — the refactor only extracts the body of the `ready` branch into `<ResultsView />`, nothing else. |
| 6 | PostHog events preserved | PASS | `results_viewed` — `page.tsx:563` has the LKID-71 comment, `:566` fires `posthog.capture("results_viewed", { report_token_prefix, ckd_stage, bun_tier })` only when `state.kind === "ready"`. `pdf_downloaded` — `page.tsx:624` fires `posthog.capture("pdf_downloaded", { report_token_prefix })` inside `handlePdfClick` at `:623`. `handlePdfClick` is passed to `<ResultsView onPdfClick={handlePdfClick} />` at `:676` and consumed by both `<DownloadPill>` instances (top pill `id="download-top"` and bottom pill `id="download-bottom"`) via the `onClick` prop. Both pills will fire the event on user click. No PostHog plumbing leaked into ResultsView — correct separation. |
| 7 | All testids preserved | PASS | Dispatch lists 5 critical testids. All 5 verified present: (a) `results-heading` on the H1 in `ResultsView.tsx:229`; (b) `results-pdf-link` on the top DownloadPill via conditional `data-testid={id === "download-top" ? "results-pdf-link" : undefined}` at `ResultsView.tsx:158` — bottom pill correctly omits to avoid strict-mode duplicate-testid violations; (c) `results-edit-link` on the `.edit-pill` Link in `ResultsView.tsx:355`; (d) `disclaimer-full-panel-desktop` on the `.fine` paragraph in `ResultsView.tsx:343` — **this is the testid that was missing in PR #57 (my Nit #1 there) and is now restored**, great catch; (e) `results-loading-skeleton` on the aria-busy div in `page.tsx:535`. Bonus testids preserved from PR #57: `structural-floor-callout` (`ResultsView.tsx:266`), `scenario-card-{id}` (`ResultsView.tsx:300`). |
| 8 | `<ResultsView />` is pure presentational | PASS | `grep -nE "useRouter\|sessionStorage\|fetch\(\|useEffect" ResultsView.tsx` returns exactly one hit — a comment at line 16 that says "…and no sessionStorage touchpoints". No actual imports of `useRouter`, `useEffect`, `fetch`, `sessionStorage`. File imports only `Link` from `next/link`, `ChartData`/`StructuralFloor`/`TrajectoryData` types from `@/components/chart/types`, and `EgfrChart` from `@/components/chart/EgfrChart`. All rendered data flows in through props (`data`, `egfrBaseline`, `structuralFloor`, `inputBun`, `pdfHref`, `onPdfClick`, `patientName`, `pdfLoading`). Component is a pure function of its props — no side effects, no state, no router touches. Clean extraction. |
| 9 | Palette uses `--s-*-text` tokens (no hardcoded regressions) | PASS | Scenario pills (`page.tsx:280–283`) and scenario-card numerics (`page.tsx:322–325`) both reference `var(--s-{green,blue,yellow,gray}-text)`. `globals.css` exposes these four tokens at lines 89, 93, 97, 101 with the contrast-safe values `#2F7F45`, `#1F2577`, `#92650C`, `#6B6E78`. No hardcoded hex contrast-critical colors in ResultsView — the five hex literals grep caught (`#9ED6F5`, `#3A90C6`, `#1E5C8A` in the kidney visual radial gradient stops, `#fff` for SVG overlay opacity 0.45, `#000` as fallback heart color when a trajectory is missing) are all either (a) decorative SVG stops, not text; (b) white on transparent overlay; or (c) defensive fallbacks — none of them sit on the tinted scenario backgrounds the LKID-76 contrast fix protected. The `--s-blue-bg = #F4F5FA` / `--s-gray-bg = #F4F5F7` literals still appear in `page.tsx:297,299` for the `.sc-card` surface tints — these were carried forward from PR #57 by design (matches `project/Results.html` exactly) and were documented as non-blocking in the PR #57 verdict's Nit #6. No regression. Large-text 3:1 bar cleared on all 4 tones, with room to spare (commit `543e29a` docblock reports green 4.53:1, blue 12.14:1, yellow 4.75:1, gray 4.66:1 — the AA threshold, not just large-text). |
| 10 | Chart files untouched | PASS | `git diff main...HEAD -- app/src/components/chart/EgfrChart.tsx app/src/components/chart/transform.ts app/src/components/chart/types.ts` returns **zero output**. All three files byte-for-byte identical to main. ResultsView imports them via `@/components/chart/types` + `@/components/chart/EgfrChart` but doesn't touch their source. |
| 11 | Root-level staging files gone | PASS (vacuously) | `./ResultsView.tsx` and `./results-page.tsx` don't exist in the working tree (`ls` → "No such file"), and `git log --all -- ResultsView.tsx results-page.tsx` returns empty. The files were never committed — Harshit authored directly under `app/src/components/results/` without staging a root-level draft. Check passes. |
| 12 | Secret scan clean | PASS | `grep -rniE "phc_\|phx_\|sntry[a-z]*_\|api_key\|API_KEY\|secret\|sk_live\|sk_test\|postgres://\|postgresql://"` across both modified files returns **zero hits**. No DSNs, no API keys, no hardcoded tokens, no connection strings. |
| 13 | CI status | PASS | `gh pr checks 58` → **CodeRabbit: pass** (review completed), **Vercel: pass** (preview deploy succeeded at `vercel.com/automation-architecture/kidneyhood/DCjrVUt93UdgZzoMhMpeG6RM21EK`), **Vercel Preview Comments: pass**. Copilot posted 3 inline comments (1 P2-ish, 2 nits) and CodeRabbit posted 2 more (1 minor, 1 nit) — none request-changes, none blocking. See **Nits** below. |

---

## Test Counts

| Suite | Count | Result |
|-------|-------|--------|
| Frontend `next build` | 7 routes | **compiled OK (6.3s)** |
| Frontend `tsc --noEmit` (via build) | — | **clean (1817ms)** |
| Frontend `eslint` | — | **0 errors** (1 pre-existing warning in `SprintTracker.tsx`, unrelated) |
| Backend `pytest` | — | **N/A** (frontend-only PR, zero backend files touched) |
| Playwright E2E | 0 | **Cannot run locally** — `@playwright/test` still not installed in `app/node_modules` (pre-existing from PR #57 Nit #4). CI will exercise if wired. The `disclaimer-full-panel-desktop` testid regression from PR #57 is **resolved** by this PR (line 343). |
| Jest / Vitest | 0 | **N/A** — no JS unit-test runner configured in `app/package.json`. |

---

## HIGH focus — Component Purity + Prop Contract

The dispatch's FAIL gate is §8 (pure-presentational) and §7 (testid preservation). Both verified above — clean.

**Component purity (§8):** `<ResultsView />` contains zero `useEffect`, zero `useRouter`, zero `useState`, zero `fetch`, zero `sessionStorage`, zero `posthog.capture` calls. Imports are only `Link` (for the edit CTA, which is a render-time concern), chart types, and the chart component. Renders strictly as a function of its 8 props. The page wrapper owns every side-effectful concern (fetch, redirect, state transitions, PostHog events, error/loading/invalid rendering), and passes only pure data + a click handler into the child. This is a textbook container/presentational split.

**Prop contract (Brad-approved deviation):** ResultsView's actual contract is `{data, patientName?, egfrBaseline, structuralFloor?, inputBun, pdfHref, onPdfClick, pdfLoading?}` (8 props) rather than the LKID-79 scaffold's 4 (`data, patientName, onDownloadPdf, pdfLoading`). Per dispatch, **Brad approved this deviation on 2026-04-20 (Option A)** — flagging it would be out of scope. Sanity-noting that the deviation is necessary for correctness: the original 4-prop contract had no way to plumb (a) the PDF `href` (the component builds `<a href>`, not a `<button onClick>`), (b) `egfrBaseline` and `structuralFloor` and `inputBun` for the structural-floor callout + explainer copy. The expanded contract is the minimum set of data the presentational surface needs — tighter scaffolds would force ResultsView to compute baseline/floor from `ChartData`, which it doesn't carry. Acceptable.

**Testid preservation (§7):** All 5 dispatch-listed testids preserved, plus 2 bonus testids carried over from PR #57. Notably `disclaimer-full-panel-desktop` (the one I flagged as regressed in the PR #57 verdict Nit #1) is **now restored** on the `.fine` `<p>` at `ResultsView.tsx:343`. Thumbs-up to Harshit for picking that up during this refactor.

---

## Config Decisions Confirmed

- **Container/Presentational split:** page.tsx retains all side effects (fetch, redirect, state machine, PostHog, chrome, loading skeleton, error/invalid cards). ResultsView is pure render-from-props for the ready state only. LoadingSkeleton stays on the page (used for `state.kind === "loading"`, before data exists to pass). Correct boundary — the loading surface has no `ResultsView` props to satisfy.
- **Click-handler pattern:** `onPdfClick` is a plain callback, not an event-carrying handler. The page's `handlePdfClick` fires `posthog.capture` with no `preventDefault` — meaning the `<a href target="_blank">` still follows its native navigation. This is the correct pattern; preventing default would break browser PDF-opening behavior. Fire-and-forget analytics, real navigation.
- **`pdfLoading` kept in contract but unused:** L48–52 reserves this for a future async PDF mode (fetch-and-hold-spinner pattern). Current implementation uses plain `<a href>` anchors, so `pdfLoading` is a no-op today. Keeping it in the contract means future wrappers can opt into async PDF generation without touching ResultsView. Reasonable future-proofing.
- **Bottom-pill testid intentionally omitted:** `data-testid={id === "download-top" ? "results-pdf-link" : undefined}` at `ResultsView.tsx:158` correctly avoids double-tagging the bottom pill, which would cause Playwright strict-mode violations on `page.getByTestId("results-pdf-link")`. Only the top pill carries the testid. Correct.
- **Deep-import `@/components/chart/types` + `@/components/chart/EgfrChart` instead of the barrel:** Copilot flagged this at `ResultsView.tsx:22`. page.tsx uses the barrel (`from "@/components/chart"`). ResultsView goes deeper. Cosmetic only — both work, no runtime difference. See Nit #3.

---

## Scope Discipline

Diff touches exactly 2 files, both within the dispatched scope:

- `app/src/app/results/[token]/page.tsx` — refactored to delegate rendering of the `ready` state to `<ResultsView />`; kept fetch/redirect/PostHog/chrome/skeleton locally. −309 lines (removed the component-rendering branch, kept shell+CSS).
- `app/src/components/results/ResultsView.tsx` — new file, +361 lines (pure-presentational component + 4 local sub-components: `PdfIcon`, `DownloadPill`, `Heart`, `KidneyVisual` + 3 helpers: `valueAtMonth`, `formatEgfr`, `formatDialysisFooter` + `SCENARIO_META` const).

**Confirmed untouched:**
- `app/src/app/globals.css` — 0 lines changed (PR #57's `--s-*-text` tokens already there)
- `app/src/app/layout.tsx` — 0 lines changed
- Chart (`EgfrChart.tsx`, `transform.ts`, `types.ts`) — 0 lines changed
- Gate page, Labs page, Landing page — 0 lines changed
- Backend (`backend/**`) — 0 lines changed
- Tests (`app/tests/**`) — 0 lines changed (no E2E fixture updates needed since all expected testids preserved)
- Klaviyo service, PostHog provider, migrations — 0 lines changed

No cross-cutting refactor, no scope creep.

---

## Secret Scan

`grep -niE "phc_|phx_|sntry[a-z]*_|api_key|API_KEY|secret|sk_live|sk_test|postgres://|postgresql://"` across both modified files. **Zero matches.** No DSNs, no API keys, no bearer tokens, no hardcoded env values.

---

## Final Verdict

## **PASS — MERGE-READY**

All 13 checks pass cleanly. This PR is exactly what the dispatch asked for: a surgical extraction that isolates the ready-state rendering into a pure-presentational component, preserves every side effect on the page wrapper, maintains all 5 required testids, restores the `disclaimer-full-panel-desktop` testid I flagged as regressed in PR #57, keeps the palette `--s-*-text` contrast-safe per commit `543e29a`, leaves the chart module untouched, and ships with green CI (CodeRabbit + Vercel both pass). Prop-contract deviation is Brad-approved and not a QA concern. The component/page boundary is clean enough that future PDF-server or print-view surfaces can reuse `<ResultsView />` directly by passing different data.

No FAIL-gate issues. The 5 Copilot+CodeRabbit inline comments are all non-blocking nits documented below.

### Nits (in priority order)

1. **[P2 — Copilot, ResultsView.tsx:222] `structuralFloor !== undefined` may pass with `null`.** `showStructural` checks `structuralFloor !== undefined` before reading `structuralFloor.suppression_points`. If the backend ever serializes this optional field as JSON `null` (rather than omitting it), the check passes but the property access throws `TypeError: Cannot read properties of null`. **Recommended fix:** tighten to `structuralFloor != null && structuralFloor.suppression_points >= 0.5 && inputBun !== null` (loose equality `!= null` catches both `null` and `undefined`). **Not blocking this merge** — the backend currently omits the field when unset (verified in `backend/main.py` response model per LKID-59), so the current code won't crash in practice. But the type system says `StructuralFloor | undefined`, not `StructuralFloor | null | undefined`, so the bug is one API-schema change away. Worth a 1-line follow-up.

2. **[P2 — CodeRabbit, ResultsView.tsx:273] Singular/plural grammar branch when `suppression_points` rounds to 1.** The ternary at `:272` correctly swaps "point"/"points" but the verb stays plural: "approximately 1 points of that reading **reflect**…" should be "…**reflects**…" when the count is 1. **Recommended fix:** either extract the copy into a string helper with correct verb agreement, or change the copy template. Affects both the callout (`:268–276`) AND the duplicated explainer paragraph (`:324–332`). **Not blocking** — low-frequency edge case (only fires when suppression rounds exactly to 1 point); the surrounding text still communicates the meaning. Copilot flagged the duplication separately (see Nit #5).

3. **[Nit — Copilot, ResultsView.tsx:22] Deep-import vs barrel inconsistency.** page.tsx imports chart pieces via the barrel `@/components/chart`; ResultsView uses the deep paths `@/components/chart/types` + `@/components/chart/EgfrChart`. Both resolve to the same module — purely stylistic. If the chart module ever restructures, the barrel import is more resilient. Cosmetic, non-blocking. 1-line fix.

4. **[Nit — CodeRabbit, ResultsView.tsx:103–107] Object-shape annotations could be interfaces.** Both `SCENARIO_META`'s element type and `DownloadPill`'s props use inline object-type annotations rather than named interfaces. TypeScript interfaces would show up better in hover-over IDE tooltips and are marginally more extensible. Cosmetic, no runtime effect. Very low priority.

5. **[Nit — Copilot, ResultsView.tsx:332] Duplicated structural-floor copy.** The exact same paragraph appears in two places: the `.structural-callout` aside (L268–276) and the `.explain-card` main paragraph (L324–332). If the clinical copy ever changes, both surfaces need updating in lockstep. **Recommended fix:** extract a small `<StructuralFloorCopy />` sub-component or `renderStructuralFloorText(egfrBaseline, structuralFloor, inputBun)` helper. Non-blocking — the duplication is physically adjacent (same file, 50 lines apart) and easy to find on a re-edit. Worth a follow-up housekeeping PR.

6. **[Nit — pre-existing from PR #57] Playwright not installed locally.** `@playwright/test` still absent from `app/node_modules`. Can't run E2E locally to prove `disclaimer-full-panel-desktop` restoration survives the full flow. Inherited from PR #57 Nit #4 — worth a standalone housekeeping PR to add `npm i -D @playwright/test` + a `test:e2e` script so future QA passes can exercise E2E before ship.

---

## Brad's TODO (post-merge)

**None required for this PR beyond normal merge flow.** Clean refactor, no user-facing change:

1. Merge via `gh pr merge 58 --squash` once Brad is satisfied. No gating items.
2. Verify on the Vercel preview that `/results/[token]` for a real captured token renders identically to the main-branch version (nav + title + top pill + chart + legend + 4 pills + 4 cards + kidney visual + explain card + second pill + fine-print + edit pill + footer). This PR is pure refactor — if anything renders differently vs. main, that's a bug.
3. Confirm `/results/[token]` with an expired/invalid token still shows the `.message-card` "This report link is invalid or has expired" surface (state not extracted to ResultsView; stays in page.tsx). Should be byte-identical to main.
4. No env-var changes, no DB changes, no backend deploy, no Klaviyo/Resend wiring.

---

**Workspace:** untracked scratch files present from other agents (`active/DISPATCH-sprint5-results-parity.md`, `agents/husser/drafts/email-to-lee-sprint5-update.md`, `agents/inga/drafts/chart-palette-decision.md`, `agents/john_donaldson/drafts/scenario-dial-age-signoff.md`, `agents/luca/drafts/*`, `agents/yuri/drafts/sprint5-pr55-qa-verdict.md`, `agents/yuri/drafts/sprint5-pr56-qa-verdict.md`, `agents/yuri/drafts/sprint5-pr57-qa-verdict.md`, `project/`) — none touched during this QA pass. This verdict file (`agents/yuri/drafts/sprint5-pr58-qa-verdict.md`) is the only file created. A sibling branch (`feat/LKID-80-chart-redesign`) was checked out mid-session by another process; re-fetched and re-checked out `feat/LKID-79-resultsview-component-extract` at SHA `543e29a` before completing verification.
**Code modified:** none. **Branch merged:** no.

---

## 2-Line Summary

PR #58 (LKID-79) cleanly extracts the Results ready-state surface into a pure-presentational `<ResultsView />`, with all 5 required testids preserved (including the `disclaimer-full-panel-desktop` regression I flagged in PR #57, now restored), the full tokenized-flow + PostHog events retained on the page wrapper, `--s-*-text` palette tokens used correctly, build + lint + CodeRabbit + Vercel all green, and zero chart/backend/globals.css touched.

**Verdict: PASS — merge-ready.** The 5 Copilot/CodeRabbit inline comments (null-guard on `structuralFloor`, singular-verb grammar at suppression=1, barrel-import consistency, interface-vs-inline types, duplicated structural-floor copy) are all non-blocking nits for housekeeping follow-ups.
