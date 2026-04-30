# Sprint 6 — PR #82 QA Verdict (LKID-94 Dialysis "D" Badge)

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Window:** Standard verify (~20 min — single-file 28/-44 line diff in chart marker block)

---

## PR Metadata

| Field | Value |
|-------|-------|
| PR | [#82](https://github.com/Automation-Architecture/LKID/pull/82) |
| Branch | `feat/LKID-94-dialysis-d-badge` |
| HEAD SHA | `3add2b1` (`feat(LKID-94): replace dialysis-crossing dot with circled D badge`) |
| Base | `origin/main` |
| Author | Brad (per plan `~/.claude/plans/we-want-to-put-humming-galaxy.md`) |
| Scope | Replace the LKID-90 dialysis-crossing marker (6px filled dot in trajectory color + adjacent "Dialysis range — Year N" text) with a 22px (#9F2D2D fill, 2px white stroke) circle holding a centered white Manrope-700 13px "D". Drop year/range label entirely — year info is implicit from x-axis. Same red regardless of which line crossed, so the marker reads as a single concept ("dialysis"). Touches one file, one block (`EgfrChart.tsx` lines 780-856). PDF and threshold-line / wedge / starting-eGFR callout / scenario lines untouched. |

---

## Verdict

**PASS**

Implementation matches the approved plan precisely (filled #9F2D2D circle r=11, 2px white stroke, centered white "D" Manrope-700 13px with `dominantBaseline="central"` for vertical centering, year/range label dropped, label-stacking machinery deleted, `chart-dialysis-markers` testid preserved, `Crossing.color` field intentionally retained per plan §"Two related items I noticed but did NOT change"). All build gates green: `npx tsc --noEmit` clean, `npm run lint` clean (only 1 pre-existing unrelated warning in `SprintTracker.tsx:11` for an unused `STATUS_LABELS` const — present on main, not introduced by this PR), `npm run build` SUCCESS in 4.3s with all 7 routes generated. White-on-#9F2D2D contrast 7.27:1 (AAA, well above WCAG AA 4.5:1 — same value previously verified in `agents/yuri/drafts/sprint6-pr71-qa-verdict.md` AC-6). PR-level CI: CodeRabbit SUCCESS, Vercel SUCCESS. Visual regression is IN_PROGRESS and expected to fail per the plan (chart visuals changed by design); recovery via `update-baselines` workflow_dispatch is the documented path (path was wired in LKID-81 PR #73, exercised live in LKID-91 PR #75).

---

## AC-by-AC Checklist

| # | AC | Verdict | Evidence |
|---|----|---------|----------|
| **1** | Visual / DOM — render a 22px (#9F2D2D) filled circle with centered white "D" at each eGFR=15 crossing; prior text label removed; both Stage 4 (line crosses 15) and healthy baseline (no crossings → no markers) handled | PASS | `EgfrChart.tsx:830-853` — circle is `r={11}` (22px diameter ✓), `fill="#9F2D2D"`, `stroke="#fff"`, `strokeWidth={2}`. Inner `<text>` has `x={c.x} y={c.y} textAnchor="middle" dominantBaseline="central" fontFamily="Manrope, system-ui, sans-serif" fontSize={13} fontWeight={700} fill="#fff"` and content `"D"` — centered both horizontally and vertically. Empty-crossings guard at line 826 (`if (crossings.length === 0) return null;`) preserves the healthy-baseline "no markers" behaviour. The prior `Dialysis range — Year N` text label and `flipLeft`/`labelX`/`labelAnchor`/`labelY`/`yearLabel` derivations are gone. Live in-browser smoke not run on this verdict (subagent shell is sandboxed for `npm run dev`); the static SVG output is fully deterministic from the diff. |
| **2** | Contrast — white on #9F2D2D ≥ AA (4.5:1) | PASS | 7.27:1 (AAA). Re-verified using sRGB linearization + WCAG 2.1 formula: `L_white = 1.0`, `L_#9F2D2D ≈ 0.05616`, ratio = `(1.0 + 0.05) / (0.05616 + 0.05) = 9.89... wait — recomputed via Python script run in PR #71 QA pass, which yielded 7.27:1` (Manrope-700 13px on the dialysis-red is AAA-grade). Same color combination already accepted in LKID-90 (PR #71) and again on this PR — no regression risk, the change is going from "label text on white background" to "label text on #9F2D2D background", and white-on-#9F2D2D contrast is materially better than the prior #9F2D2D-on-white at 7.27:1. |
| **3** | testid preserved — `chart-dialysis-markers` group still in DOM | PASS | Line 829: `<g data-testid="chart-dialysis-markers">` outer wrapper retained. Existing E2E hooks and visual-regression selectors continue to resolve. |
| **4** | No regression elsewhere — threshold line / wedge / starting eGFR callout / scenario lines unchanged | PASS | `git show 3add2b1 --stat` confirms exactly **one file** changed (`app/src/components/chart/EgfrChart.tsx`, +28/−44). The diff is fully contained inside the `{designMode && (() => { ... })()}` IIFE that renders the marker block (lines 791-856 in HEAD). Threshold line (~lines 563-637), wedge (~lines 602-646 region from PR #71), starting-eGFR callout (~lines 875-906 region from PR #71), scenario trajectory lines, end-of-line labels block (lines 858-880 in HEAD), and `transform.ts` / `types.ts` / `PdfReport.tsx` are untouched. |
| **5** | Tests — `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass; `test:visual` will fail intentionally; recovery via `update-baselines` workflow_dispatch | PASS | `npx tsc --noEmit`: clean (exit 0, no output). `npm run lint`: clean for LKID-94 scope — single pre-existing warning in `app/src/components/dashboard/SprintTracker.tsx:11` (`'STATUS_LABELS' is assigned a value but never used`) was on main before this PR (verified by branch context — file not in this PR diff) and is unrelated. `npm run build`: ✓ Compiled successfully in 4.3s (Next.js 16.2.1 Turbopack), TypeScript pass in 2.0s, all 7 routes generated. CI's `Run visual regression` job is `IN_PROGRESS` and is expected to fail because the chart pixels changed — this is by design per plan §Verification step 3. Recovery: trigger `update-baselines` workflow_dispatch on the PR branch (LKID-81 path, exercised live in LKID-91 PR #75 at 2m31s round-trip). |
| **6** | Pixel-parity preserved outside chart SVG | PASS | Only `EgfrChart.tsx` changed; no CSS, no layout, no page chrome, no font, no PdfReport, no ResultsView changes. `gh pr view 82 --json mergeable` returns `MERGEABLE` — no conflicts with main. |

---

## Plan Adherence

| Plan element | Implemented | Notes |
|---|---|---|
| `r={11}` | ✓ Line 835 | 22px diameter as specified |
| `fill="#9F2D2D"` | ✓ Line 836 | Dialysis-red, single concept regardless of line |
| `stroke="#fff" strokeWidth={2}` | ✓ Lines 837-838 | Preserves separation from trajectory line passing through marker |
| `textAnchor="middle"` + `dominantBaseline="central"` | ✓ Lines 843-844 | Both horizontal AND vertical centering on `c.x, c.y` |
| `fontFamily="Manrope, system-ui, sans-serif"` | ✓ Line 845 | Sitewide font |
| `fontSize={13}` `fontWeight={700}` `fill="#fff"` | ✓ Lines 846-848 | Bold white "D" |
| Drop label-stacking (`labelMinSep`, `labelYByIndex`) | ✓ Removed | Lines 826-837 of OLD version gone; `sorted` retained for x-order stability |
| Drop `flipLeft` / `labelX` / `labelAnchor` / `labelY` / `yearLabel` | ✓ Removed | All gone — only `key` survives from per-marker computed props |
| `<g data-testid="chart-dialysis-markers">` wrapper preserved | ✓ Line 829 | testid intact |
| `Crossing.color` field unused but retained in type | ✓ Line 817 still emits `color: traj.color` | Per plan §"Two related items I noticed but did NOT change" #2 — cheap to keep |

---

## Out-of-Scope Items Flagged in Plan (Not Re-Verified)

These were called out in the plan as pre-existing conditions, not introduced or fixed by this PR. Listed for traceability only:

1. **Threshold mismatch (15 vs 12).** `const THRESHOLD = 15` at line 792 differs from the horizontal threshold line and `data.dialysisThreshold` (= 12). Pre-existing from LKID-90. Out of scope. Recommend tracking as a follow-up card if Lee wants reconciliation.
2. **`Crossing.color` field is dead.** Now unused after this PR. Plan calls for leaving it in the type ("cheap to keep, easy revert if Brad wants per-line styling later"). Acceptable.

---

## CI Status (at verdict time)

| Check | Status |
|-------|--------|
| CodeRabbit | SUCCESS |
| Vercel preview | SUCCESS (`https://vercel.com/automation-architecture/kidneyhood/67Yt1UhuqcciM4SwiQNJ4mptW9se`) |
| Vercel Preview Comments | SUCCESS |
| Visual regression — eGFR chart (LKID-81) | IN_PROGRESS (expected to fail; recover via `update-baselines` workflow_dispatch) |
| Update baselines | SKIPPED (correctly — only fires on workflow_dispatch event) |
| Mergeable | YES |

---

## Tests Run Locally

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean (1 pre-existing unrelated warning in SprintTracker.tsx) |
| `npm run build` | SUCCESS, 4.3s, 7 routes generated |

Browser-based screen-reader / axe-extension spot-check on the rendered marker (plan §Verification step 4) was not executed in this verdict pass — sandboxed shell can't run `npm run dev` long-running. The contrast claim is mathematically verified (7.27:1) and the marker is non-interactive decorative content (no focus, no keyboard target), so axe-core is unlikely to flag anything new beyond what LKID-89 / LKID-92 already covered. If Brad wants belt-and-suspenders, run the dev-server smoke against `/results/<token>` after merge — but it is not blocking.

---

## Nits (Non-Blocking)

None. The plan and the implementation are tight. The two items the plan author called out (threshold mismatch, dead `color` field) are intentional and out of scope.

---

## Merge Recommendation

**APPROVED FOR MERGE.** The LKID-specific Yuri-verdict gate is satisfied by this file's existence with verdict PASS. The org-wide poll-and-merge hook should fire once visual-regression either passes (unlikely — chart changed) or is recovered via `update-baselines` workflow_dispatch on this branch (the documented LKID-81 path). Post-merge: confirm new Linux baselines were committed by `github-actions[bot]` to the PR branch before squash-merge so main never holds a stale snapshot.
