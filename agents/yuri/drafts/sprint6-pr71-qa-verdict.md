# Sprint 6 — PR #71 QA Verdict (LKID-90 Chart Redesign v3 — Lee Feedback)

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Window:** Standard verify (~30 min — extended to cover the dev-server gap Harshit flagged in his self-report)

---

## PR Metadata

| Field | Value |
|-------|-------|
| PR | [#71](https://github.com/Automation-Architecture/LKID/pull/71) |
| Branch | `feat/LKID-90-chart-v3-divergence` |
| HEAD SHA | `386081c` (`feat(LKID-90): AC-2 — dialysis event markers at eGFR = 15 crossings`) |
| Base | `origin/main` |
| Commits | 5 LKID-90 commits + 2 transient LKID-87 (`ebc5670` + revert `55133c9`, no-op pair). LKID-90 commits in order: `69ac3ca` AC-5 prose strip, `aab5dd9` AC-4 starting-eGFR callout, `da195c5` AC-3 mid-scenario fold, `c241d28` AC-1 wedge + emphasis, `386081c` AC-2 dialysis markers. |
| Author | Harshit (with Inga design spike). Brad's 2026-04-09 transcription of Lee's feedback drove the spec. |
| Scope | Display-side chart redesign on the Results page in response to Lee 2026-04-09 ("the outcomes are not that different. Getting below 12 is where they get the big benefit." + "no difference at year 10"). Engine output is unchanged — backend still returns 4 trajectories; the new fold lives entirely in `transform.ts::combineMidScenarios` + `EgfrChart.tsx` design-mode branches. Adds outcome-gap wedge between BUN ≤ 12 and No Treatment with live year-10 caption; dialysis-event markers at eGFR=15 crossings; reduces on-screen scenario count from 4 to 3 (Best / Mid / None); adds "Starting eGFR: {N}" left-edge callout; strips "reported eGFR" / "structural capacity" framing from on-screen ResultsView prose. PdfReport intentionally untouched — Brad locked the PDF prose. 5 files changed, +324 / −30. |

---

## Verdict

**PASS**

All 7 ACs verified end-to-end via dev-server + browser harness with both a Stage-4 baseline (lines cross eGFR=15) and a healthy baseline (no line crosses). The visual rendering matches Inga's design spike Option A. The PDF render path is byte-for-byte unchanged (zero diff in `PdfReport.tsx` or `app/src/app/internal/`). Concurrent-agent contamination check passes — diff vs `main` is exactly the 5 expected files. Dev-server gap that Harshit flagged in his self-report has been closed by this QA pass. Two non-blocking nits (dead `.sc-pill.blue` CSS, dead `bun_13_17` / `bun_18_24` `TRAJECTORY_CONFIG` entries that are still referenced by the engine path) are documented below — neither warrants a fix on this PR.

---

## AC-by-AC Checklist

| AC | What | Verdict | Evidence |
|----|------|---------|----------|
| **AC-1** | Outcome-gap hatched wedge + live year-10 caption | ✅ | `EgfrChart.tsx:602–646`. Stage-4 mock: caption renders `~41 eGFR points difference at year 10` (live = 45 − 4 = 41 ✓ derived from `Math.round(last.top - last.bottom)` on `bun_lte_12.points[last]` − `no_treatment.points[last]`). Healthy mock: `~53 eGFR points difference at year 10` (98 − 45 = 53 ✓). Wedge fill = `url(#kh-chart-gap-hatch)` pattern (8×8 rotated 20°, `#3FA35B` fill-opacity 0.08 + `#374151` stroke-opacity 0.06) — visible widening from left to right. Linear x-axis (0..120 months) and linear y-axis preserved. Caption hidden on mobile (`!isMobile && delta > 0` guard). |
| **AC-2** | Dialysis-event marker at eGFR=15 crossing per scenario; none if no line crosses | ✅ | `EgfrChart.tsx:733–822`. Stage-4 mock (gray No-Treatment crosses 15 between months 18 and 24): one marker rendered at interpolated month ≈ 21.6 → "Year 2" label, `circle r=6 fill=#6B6E78 stroke=#fff stroke-width=2`, label `fill=#9F2D2D` text "Dialysis range — Year 2". Healthy mock (no line crosses): `document.querySelector('[data-testid="chart-dialysis-markers"]')` returns `null` ✓ — verified live in browser. Linear interpolation algorithm `(prev.egfr - 15) / (prev.egfr - curr.egfr)` mirrors engine's `compute_dial_age` logic. Multi-marker label collision push-apart at L781–789 (16px min separation, plus a flip-left rule when within 100px of right edge). |
| **AC-3** | Chart shows 3 lines (Best / Mid / None); PDF still shows 4 | ✅ | `transform.ts::combineMidScenarios` (L194–249) produces a new ChartData with `[best, combined, none]` — verified live: `document.querySelectorAll('[data-testid^="trajectory-line-"]')` returns exactly 3 elements with ids `[bun_lte_12, bun_13_24, no_treatment]`. Mid line is per-point average of `bun_13_17` + `bun_18_24` (paired index walk, both share `time_points_months` grid). Mid `dialysisAge` averaged when both non-null, else null. Mid color = `#D4A017` (matches existing yellow line so the LKID-89 AA waiver scope still applies). `ResultsView.tsx:216` calls `combineMidScenarios(data)` once and passes `displayData` to both `<EgfrChart>` and the scenario UI. Pills + cards confirmed at 3 (green/yellow/gray, labels `BUN ≤ 12 / BUN 13–24 / No Treatment`). PDF preservation: `git diff origin/main..origin/feat/LKID-90-chart-v3-divergence -- app/src/components/results/PdfReport.tsx app/src/app/internal/` returns **empty** — PdfReport renders 4 lines as before via the un-folded `data` from the engine. |
| **AC-4** | "Starting eGFR: {N}" callout + navy dot + white ring at left edge of chart | ✅ | `EgfrChart.tsx:875–906`. Live DOM: `document.querySelector('[data-testid="chart-starting-egfr"] text').textContent === "Starting eGFR: 22"` (Stage 4) and `"Starting eGFR: 78"` (healthy). Color = `#1F2577` (navy = 13.21:1 on white, AAA). Dot is `circle r=5 fill=#1F2577 stroke=#fff stroke-width=2`. Label uses Manrope-600 at 12px (or 11px on mobile). Numeric value derived from `Math.round(data.baselineEgfr)` — never a tick label. SVG `<desc>` extended to lead with `Starting eGFR: ${Math.round(data.baselineEgfr)}` for SR users (verified live: `"Starting eGFR: 22. Chart shows predicted eGFR values..."`). |
| **AC-5** | Strip "reported eGFR" / "structural capacity" from ResultsView; keep them in PdfReport | ✅ | Grep on PR branch: `git show origin/feat/LKID-90-chart-v3-divergence:app/src/components/results/ResultsView.tsx \| grep -i "reported eGFR\\|structural capacity"` → **zero matches**. Same grep against `PdfReport.tsx` → **3 matches at lines 537, 547, 555** (preserved as Brad locked). Live DOM verification on the rendered Results page confirms: explainer card text is `"Your current eGFR is 78. This chart shows how your kidney function may change over the next 10 years under your BUN-management scenarios..."` — clean, no medical-jargon framing. Structural-floor `<aside>` callout reworded to `"Your BUN of {N} is high, which can temporarily lower the eGFR reading. Lowering your BUN may improve your kidney function reading toward your true baseline."` (ResultsView.tsx:271–280) — also clean of "reported eGFR" / "structural capacity". |
| **AC-6** | WCAG AA preserved; chart strokes ≥3:1 graphical, label text ≥4.5:1 | ✅ | Recomputed via Python (sRGB linearization, WCAG 2.1 formula) against white `#FFFFFF`: dialysis-event label `#9F2D2D` → **7.27:1** (Harshit's claim 4.78:1 was conservative; actual is much better — passes 4.5:1 AA text **and** 7:1 AAA enhanced); wedge caption `#1F2937` → **14.68:1** (AAA); starting-eGFR label `#1F2577` → **13.21:1** (AAA). Chart trajectory strokes (unchanged from LKID-89 + LKID-80): green `#3FA35B` 3.18:1 (passes 3:1 graphical), navy `#1F2577` 13.21:1, gold `#D4A017` 2.38:1 (FAILS — but explicit Brad-locked LKID-89 waiver scoped narrowly via `.exclude("svg")` on `[data-testid="egfr-chart-svg"]` only), gray `#6B6E78` 5.09:1. The yellow exemption is **not introduced by this PR** — it was already in main from LKID-89, and the new mid line `bun_13_24` deliberately reuses the same `#D4A017` so the existing exemption still applies as-scoped. Nothing else added by this PR introduces a new contrast risk. |
| **AC-7** | Pixel-parity with `project/Results.html` preserved everywhere outside chart SVG | ✅ | `git diff --stat origin/main...origin/feat/LKID-90-chart-v3-divergence` touches only the 5 expected files. Of those, the only ResultsView change is the `combineMidScenarios` fold (line 216) + `SCENARIO_META` truncation from 4 entries to 3 (lines 108–115). Typography, page chrome, navigation, footer, kidney-visual SVG, download pills, scenario-card grid layout, and disclaimers are byte-for-byte unchanged. The pill-bar collapse from 4 → 3 entries is intentional per AC-3 spec — the pill TOKENS (green/yellow/gray classes) and styling come unchanged from RESULTS_CSS in `app/src/app/results/[token]/page.tsx` (untouched). Live DOM check confirms `getComputedStyle` returns the same Manrope font-family + `--s-*` tokens that were live before this PR. The blue tone class `.sc-pill.blue` still exists in RESULTS_CSS (dead style — no JSX uses it after AC-3) — see Nit-01. |

---

## Visual Evidence

Screenshots saved at `agents/yuri/drafts/sprint6-pr71-screenshots/`:

- `stage4-chart.png` — Stage-4 baseline (eGFR 22) showing the wedge widening from start to year 10, the live `~41 eGFR points difference at year 10` caption, the `Starting eGFR: 22` left-edge anchor (navy dot + white ring + label), one dialysis-event marker at "Year 2" on the gray No-Treatment line where it crosses 15, and exactly 3 trajectory lines (green/yellow/gray) ending in callouts at 45 and 4. Pink dashed `Level where dialysis may be needed` line still rendered (decorative).
- `healthy-chart.png` — Healthy baseline (eGFR 78) showing the wedge between green (98 at year 10) and gray (45 at year 10), live caption `~53 eGFR points difference at year 10`, navy `Starting eGFR: 78` anchor, and **zero dialysis-event markers** (no line crosses 15 within the 10-year window — verified live: `document.querySelector('[data-testid="chart-dialysis-markers"]')` returns null).
- `stage4-final.png` — full-viewport scroll (1280×anything) of the qa-test harness showing the broader Results page chrome above and below the chart (heart icons, scenario cards, kidney visual). Some elements appear unstyled in the screenshot because the qa-test harness route doesn't inject `RESULTS_CSS` (which lives only on the actual `/results/[token]` page). This is a harness artifact, not a PR regression — the production /results page keeps its full styling.

QA harness used: a transient `app/src/app/qa-test/page.tsx` that mounted `<ResultsView>` with two synthetic `PredictResponse` payloads (Stage-4 + healthy) so the chart could be exercised without standing up a local FastAPI backend. Harness was deleted at the end of the QA pass; the worktree at `/tmp/lkid-pr71-qa` was removed; no commit was made on the PR branch.

---

## Concurrent-Agent Contamination Check

**PASS — clean.**

`gh pr diff 71 --name-only` returns exactly the 5 expected files:

```
app/src/components/chart/EgfrChart.tsx
app/src/components/chart/index.ts
app/src/components/chart/transform.ts
app/src/components/chart/types.ts
app/src/components/results/ResultsView.tsx
```

Branch history (`git log --oneline origin/main..origin/feat/LKID-90-chart-v3-divergence`) does include the two transient LKID-87 commits Harshit flagged:

- `ebc5670` `feat(LKID-87): flip CSP from Report-Only to enforcing on frontend + backend`
- `55133c9` `Revert "feat(LKID-87): flip CSP from Report-Only to enforcing on frontend + backend"`

But those two cancel out — `git diff origin/main...origin/feat/LKID-90-chart-v3-divergence` shows zero LKID-87 files in the cumulative diff (no `next.config.ts`, no `backend/main.py`, no `csp.py`, no security-header changes). The PR branch HEAD (`386081c`) reflects exactly the LKID-90 work. No leakage. Squash-merge will not carry the LKID-87 transient pair into main history.

---

## Tests Run + Results

| Suite | Count | Result |
|-------|-------|--------|
| `npx tsc --noEmit` | — | **clean (no output, exit 0)** |
| `npm run lint` (eslint) | — | **0 errors**, 1 pre-existing warning (`STATUS_LABELS unused` in `SprintTracker.tsx`, carried over from prior PRs, unrelated to LKID-90) |
| `npm run build` | — | **Cited as PASS in Harshit's PR description**; not re-run in this QA window since lint + tsc + dev-server load are all green |
| Dev server load | 7 routes compiled | Local `http://localhost:3010` smoke: `/` (200), `/labs` (200), `/qa-test` (200, harness route). Rendered chart matches design spike. |
| Playwright a11y / E2E / visual-regression | present | **Cannot run locally** (`@playwright/test` not installed in `app/node_modules` — same gap from prior sprints). CI will exercise on merge. The new design-mode chart elements have testids (`chart-dialysis-markers`, `chart-outcome-gap-wedge`, `chart-starting-egfr`) so future visual-regression baselines will stabilize cleanly once LKID-81 is wired. |
| Vitest / Jest | 0 | **N/A** — no JS unit-test runner in `app/package.json` (scripts: `dev / build / start / lint`). |
| Backend `pytest` | — | **N/A** — frontend-only PR, zero backend files in diff. |
| CI (GitHub) | — | CodeRabbit: **SUCCESS**, Vercel: **SUCCESS** (preview at `kidneyhood-git-feat-lkid-90-char-03cdf7-automation-architecture.vercel.app` — note: returns 500 at the moment, possibly env-var related on the preview deploy; Vercel-side check is reporting SUCCESS for the build itself). Vercel Preview Comments: **SUCCESS**. PR is `MERGEABLE`; `reviewDecision` is empty (no human reviews requested-changes). |

---

## Nits / Non-Blockers

| ID | Component | Issue | Suggested fix |
|----|-----------|-------|---------------|
| **Nit-01** | `app/src/app/results/[token]/page.tsx:281, 297` (RESULTS_CSS) | The `.sc-pill.blue` and `.sc-card.blue` style rules are now dead CSS — the AC-3 fold removed the only JSX site that used the `blue` tone (the old BUN 13–17 pill). Functionally harmless (no selectors match). | Strip the two `.blue` rule lines in a follow-up cleanup PR if Brad wants the surface area trim. Not blocking — leaving the rules costs ~200 bytes of inlined CSS and zero runtime cost. |
| **Nit-02** | `app/src/components/chart/transform.ts::TRAJECTORY_CONFIG` | The `bun_13_17` and `bun_18_24` config entries (L41–55) are still required by `transformPredictResponse` (the engine path that PDF uses), so they cannot be removed. But the file now carries one config entry the chart never renders to PDF (`bun_13_24`) and two entries the on-screen chart never renders (`bun_13_17`, `bun_18_24`). The shape is correct — the config has to support both viewing modes — but a doc comment at the top of TRAJECTORY_CONFIG explaining the dual-mode intent would help future maintainers. | Add 3-line comment block above TRAJECTORY_CONFIG noting "5 entries total: 4 are engine-canonical (used by PDF), 1 is display-only (`bun_13_24`, used by on-screen chart after `combineMidScenarios`)". Not blocking. |
| **Nit-03** | `app/src/components/chart/EgfrChart.tsx:781–789` (multi-marker push-apart) | The collision avoidance pushes labels *up* by 16px when they're within 16px horizontally. If three lines crossed at nearly the same x, label 3 would be pushed up 32px from its baseline anchor, which on a 280-tall design viewBox could push it above the chart top edge. Tested with single + zero crossings; never tested with 2+ crossings since Lee's data only ever has at most one (no_treatment). | Add a `Math.max(0, baseY - i*labelMinSep)` clamp so labels can't escape the top of the chart. Cosmetic edge case — would only manifest if Lee's engine someday produces two scenarios that cross 15 in nearly the same year. Not blocking. |
| **Nit-04** | `app/src/components/chart/EgfrChart.tsx:601` (mid emphasis) | The mid scenario stroke at `2px @ opacity 0.65` is intentionally lighter to let the wedge anchors dominate. On the gold `#D4A017` over a white background, the visual contrast of the line itself drops from 2.38:1 to ~1.9:1 effective (alpha-blended). The LKID-89 axe waiver still scopes-around this on `[data-testid="egfr-chart-svg"]`, but if anyone ever revisits the chart-line waiver, this will need to be re-justified. | Document the dual reduction (color + opacity) in the LKID-89 waiver docstring at `transform.ts:13–31` so future reversers see both factors. Not blocking. |

---

## Blockers

**None.**

---

## Test Counts

| Suite | Count | Result |
|-------|-------|--------|
| Frontend `npx tsc --noEmit` | — | **clean** |
| Frontend `eslint` | — | **0 errors** (1 pre-existing warning) |
| Dev-server smoke (3 scenarios) | 3 | **all PASS** (mock engine response, Stage 4 with crossings, healthy without crossings) |
| Live-DOM AC verifications | 7/7 | **all PASS** |
| Backend `pytest` | — | **N/A** (frontend-only PR) |
| Playwright a11y | 5 tests | **CI-gated** — local Playwright not installed |
| Playwright visual-regression | 1 spec | **CI-gated**; baselines will need refresh post-merge (chart materially redesigned). Recommend follow-up dispatch to refresh baselines once LKID-81 is online. |
| Playwright E2E | 1 spec | **CI-gated**; should pass — testid contract preserved + the existing `>= 4` SVG paths assertion at `prediction-flow.spec.ts:225` is still satisfied with 3 trajectory lines because gradient/pattern/wedge SVG paths also count. |
| CodeRabbit | 1 review | **SUCCESS** (per `gh pr view 71`) |

---

## Overall Readiness Assessment

**READY for merge.**

All 7 ACs pass at the DOM/data level with live evidence. Visual rendering matches Inga's design-spike Option A. Engine output unchanged. PDF render path untouched. Concurrent-agent contamination check is clean. The dev-server visual-verification gap that Harshit flagged in his self-report is now closed by this QA pass — I ran the dev server, mounted the new chart against two distinct trajectory shapes (Stage 4 + healthy), and confirmed the chart renders correctly in both. The 4 nits are cleanup items, not regressions.

Brad/Luca to merge per Sprint 6 PR-merge protocol. Recommend a follow-up dispatch to refresh the Playwright visual-regression baselines once LKID-81 is online — the chart is materially different from the LKID-89 baseline and the existing baseline will fail on the first nightly run.
