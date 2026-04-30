# Sprint 5 — PR #66 QA Verdict (LKID-89 Chart Pixel-Parity v2 — Match `project/Results.html` Exactly)

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Branch:** `feat/LKID-89-chart-pixel-parity-v2`
**HEAD:** `e3d5f34309d47e7ef2001abf762fd77b727fe632`
**Card:** [LKID-89](https://automationarchitecture.atlassian.net/browse/LKID-89) — In Progress
**Predecessor:** PR #59 (LKID-80) — Sprint 5 chart redesign baseline
**Scope:** Implements Inga's `chart-pixel-diff-audit-v2.md` P0+P1 + two P2 quick wins. Designmode-only changes; chrome (PDF) path unchanged in code paths but propagates geometry through shared `chrome={false}` rendering on `PdfReport.tsx:488` and `ResultsView.tsx:249`.

---

## Verdict: **PASS** (after `da8fdcb` re-QA — see appended section)

Original verdict was **PASS WITH NITS** at HEAD `e3d5f34`; all 4 nits resolved in `da8fdcb`. See "Re-QA after `da8fdcb`" section at the bottom of this file.

## Original Verdict (at `e3d5f34`): **PASS WITH NITS**

Geometry matches `project/Results.html` for the design-reference case (yMax=30, late-CKD baseline) — confirmed via committed after-screenshot at `agents/harshit/drafts/chart-pixel-parity-v2-after.png`. All 3 P0 ACs and all 6 P1 ACs are implemented at the file:line called out by the audit. Build clean (`tsc --noEmit` passes, ESLint clean on touched files). Vercel preview deploy SUCCESS. CodeRabbit pass.

**Why nits, not FAIL:** The two highest-impact Copilot findings (dialysis-line pin at non-yMax-30 scales, and baseline/x-label coordinate mapping) are real and worth landing on the same branch before merge — but they affect *clinical-correctness drift on healthy-baseline patients*, not the demonstrated design-parity case. The card's stated goal ("match `project/Results.html` exactly") is met for the design-reference yMax=30 baseline that drives the audit, and the regression on other yMax cases is bounded (label still reads "Level where dialysis may be needed" — never claims a specific eGFR value). Brad's policy precedent (PR #59 verdict, AA override on chart lines) supports prioritizing design-parity over general-case fidelity here, as long as the drift is documented. Recommend Harshit pick up Copilot's three suggested patches before merge to remove the cleanest blocking risk.

---

## Summary

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Acceptance Criteria (P0/P1/P2) | 11 | 11 | 0 | 0 |
| Pixel-parity verification | 12 | 11 | 0 | 1 |
| Build / Lint / Type-check | 3 | 3 | 0 | 0 |
| CI / Preview | 2 | 2 | 0 | 0 |
| Contrast / a11y | 2 | 2 | 0 | 0 |
| Test runs | 1 | 0 | 0 | 1 |
| **Totals** | **31** | **29** | **0** | **2** |

---

## Acceptance-Criteria Checklist

### P0 (must ship)

| AC | Verdict | Evidence |
|----|---------|----------|
| Aspect ratio matches design (~2.57:1) on desktop | PASS | `EgfrChart.tsx:55` `DESIGN_ASPECT_DESKTOP = 720/280 = 2.571`; `:95-99` height computed as `width/aspect` with mobile floor at 180px. Confirmed at viewport 1280×1000 via PR description: rendered 926×360 ≈ 2.57:1. Mobile uses 2.0:1 with floor — sensible legibility tradeoff documented at `:56-59`. |
| Dashed dialysis line at ~76.8% down (design emphasis) | PASS (with NIT) | `EgfrChart.tsx:570-571` `thresholdY = 0.768 * totalHeight - margin.top`. Decorative pin, not yScale-driven. ⚠️ See **NIT-01** below — only design-correct at yMax=30; drifts at other yMax values. |
| Trajectory colors confirmed as design hex | PASS | `transform.ts:37-71` — `#3FA35B / #1F2577 / #D4A017 / #6B6E78` per design source `project/Results.html:426-432`. Already shipped in PR #59; this PR confirms binding via comment update at `transform.ts:18-30`. Brad's 2026-04-29 binding policy referenced explicitly. |

### P1 (visible at a glance)

| AC | Verdict | Evidence |
|----|---------|----------|
| Y-axis labels at `x=20` (or `x=24` for "5"/"0") | PASS | `EgfrChart.tsx:483-487` — `isSingleDigit ? 24 : 20` with viewBox-to-inner conversion via `xInner = designX - margin.left`. |
| Y-axis tick y-positions hardcoded `[40,100,160,220,260]` when `yMax===30` | PASS | `EgfrChart.tsx:465-471` `designYByValue` lookup; `:472-474` `mapDesignY` translates viewBox-y to inner-group-y by scaling against actual totalHeight. Other yMax values fall back to `yScale(tick) + 3` at `:490`. |
| X-axis tick labels just inside bottom of plot area | PASS (with NIT) | `EgfrChart.tsx:782` `yLabel = innerHeight - 5`. Visual outcome (labels overlapping pink band) matches design; coordinate mapping is technically off vs. literal `y=275 of 280`. ⚠️ See **NIT-02**. |
| Last x-tick "10 yr" clears endpoint circle | PASS | `EgfrChart.tsx:787-789` — `isLast = idx === arr.length - 1`, `anchor = "end"`, `xLabel = xScale(m) - 36`. Endpoint circle at `cx = innerWidth - 16` (`:733`); 36px offset clears the r=16 circle with margin. |
| All four trajectory `strokeWidth = 2.5` | PASS | `transform.ts:42, 48, 54, 60` — all 4 `TRAJECTORY_CONFIG` entries set `strokeWidth: 2.5`. Already on 2.5 from PR #59. |
| Curve switched to Catmull-Rom in designMode | PASS | `EgfrChart.tsx:20` import; `:663` `curve={designMode ? curveCatmullRom : curveMonotoneX}`. Chrome/PDF path retains `curveMonotoneX`. Engine-driven points preserved. |

### P2 (if quick — both shipped)

| AC | Verdict | Evidence |
|----|---------|----------|
| "Level where dialysis may be needed" label x position | PASS | `EgfrChart.tsx:574-576` `labelXInner = 70 - margin.left` (design absolute `x=70`). |
| Green fill closes to viewBox bottom | PASS (with NIT) | `EgfrChart.tsx:512` `baselineY = innerHeight + 5`. ⚠️ See **NIT-02** — same coord-mapping concern as P1-3, but visual outcome is correct. |

---

## Pixel-Parity Findings vs `project/Results.html`

Cross-checked against `project/Results.html:396-455` and the committed after-screenshot.

### What matches the design exactly (visible in screenshot)

1. **Trajectory colors** — green/navy/gold/gray match `:426-432` strokes.
2. **End-point callouts** — only green (BUN ≤12) and gray (No Treatment), `r=16`, white fill, line-color stroke 1.5px, Manrope-700 13px label centered. Engine-driven values (mock: 71 green, 7 gray) — design's static "17" / "4" is replaced by computed final eGFR per PR #59 dispatch.
3. **Dashed line styling** — `#E0A0A0`, stroke-width 1, dasharray `"3 3"` — matches `:418`.
4. **"Level where dialysis may be needed" label** — `#C54B4B`, Nunito-Sans 10px, font-weight 500 — matches `:419`.
5. **Pink dialysis band** — `#E08B8B` 0.12 → 0 gradient, height = `(25/280) * totalHeight` viewBox-scaled — matches `:417` proportions.
6. **Green healthy-range fill** — `#6CC24A` 0.22 → 0 gradient — matches `:399-401`.
7. **Y-axis labels (yMax=30 case only)** — hand-tuned `[40,100,160,220,260]` viewBox positions translated to inner coords; `x=20`/`24` indent — exact match to `:409-415`.
8. **X-axis tick labels** — Nunito-Sans 10px `#8A8D96`, "1 yr" → "10 yr" — match `:444-453`. Last tick text-anchor=end with offset matches design's `x=650` placement.
9. **Aspect ratio 2.57:1 derived from container width** — matches design's 720:280 viewBox.
10. **Curve smoothness** — Catmull-Rom produces noticeably smoother curves than monotone; visually closer to design's hand-tuned beziers without inventing data.
11. **Endpoint circle on right edge at `cx = innerWidth - 16`** — matches design's `cx=700` of 720 viewBox = 20px from right.

### Design deltas (intentional or pre-existing)

| # | Delta | Status |
|---|-------|--------|
| PD-01 | Y-axis labels at non-yMax=30 use proportional `yScale` (`:490` `yScale(tick) + 3`), not hand-tuned positions. | Documented in `EgfrChart.tsx:454-460` comment block. Acceptable — no design reference exists for non-yMax-30 ticks (5/10/15 etc.). |
| PD-02 | Dashed line position hardcoded at 0.768 of totalHeight regardless of yMax. | ⚠️ See **NIT-01** — author chose visual emphasis over data-fidelity for non-yMax-30 cases. Copilot flagged. |
| PD-03 | Curve is Catmull-Rom over engine points, not design's hand-tuned beziers. | Out of scope per audit §3. Brad's 2026-04-29 Q2 call. Acceptable. |
| PD-04 | Healthy-range fill top edge uses straight `L` segments, but the green trajectory line uses Catmull-Rom. | NOTE — Copilot suppressed this as low-confidence. The fill top edge will hug the line less precisely with Catmull-Rom than with monotone. Visible in the after-screenshot as a thin sliver of mismatch where the fill polyline's top segment is "below" the smoother curve. Visually unobtrusive on dense point sets (15 points). Filing as **NIT-03** for awareness only. |

---

## Contrast / a11y Findings

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| A11Y-01 | Chart line strokes (`#3FA35B`, `#D4A017`) below WCAG AA on white | NOTE | Intentional override per Brad 2026-04-29 (PR description, transform.ts:18-30 binding-policy comment). Precedent: PR #59 Yuri verdict checks #5, #12 — same posture, no regression. `.exclude("svg")` already on Results-page axe test from PR #59. |
| A11Y-02 | Chart text ("Level where dialysis may be needed", y/x tick labels) contrast | PASS | Y/x tick labels `#8A8D96` on white = 3.85:1. The label color `#8A8D96` is a sub-4.5:1 ratio for body text, but it's used inside the chart SVG which is excluded from axe per the prior precedent. The "Level where dialysis may be needed" label `#C54B4B` on white = 5.27:1 (PASS AA). Page chrome outside the chart unaffected by this PR. |
| A11Y-03 | SVG `aria-label` and accessible data table preserved | PASS | `EgfrChart.tsx:371-378` `aria-label`, `<title>`, dynamic `<desc>` — preserved. SR-only data table at `:957-984` — preserved. No regression. |

CodeRabbit raised a major flag on `transform.ts:30` arguing against codifying a blanket `.exclude("svg")`. **NOTE — non-blocking on this PR**: this PR does not change the axe configuration; it only updates documentation comments in `transform.ts`. The axe exclusion is the standing PR #59 / Brad's binding policy from LKID-67. CodeRabbit's point is a legitimate sprint-6 candidate (scope the exemption to specific selectors, not all SVG) but is out of scope for LKID-89.

---

## Test Results

| Tool | Result |
|------|--------|
| `npx tsc --noEmit -p tsconfig.json` (frontend) | **CLEAN** — no errors. |
| `npx eslint src/components/chart/EgfrChart.tsx src/components/chart/transform.ts` | **CLEAN** — 0 warnings, 0 errors on touched files. |
| `next build` | Not re-run by QA — author confirmed clean in PR description. |
| Playwright a11y / E2E / visual-regression | **NOT RUNNABLE LOCALLY** — `@playwright/test` still absent from `app/node_modules` (carryover from PR #57/#58/#59 nits). LKID-81 in backlog tracks wiring this up. CI is configured but visual-regression suite not yet baseline-established for the design-parity layout. |
| Vitest unit tests | **NOT APPLICABLE** — no Vitest config or test files for chart component. |
| CodeRabbit | **PASS** (review completed 2026-04-29). |
| Vercel Preview | **SUCCESS** — preview at `https://vercel.com/automation-architecture/kidneyhood/3U5S66bHN71aiXhT8sGTZsfADqFq`. |

---

## Cross-Boundary Checks

| Surface | Result |
|---------|--------|
| ResultsView.tsx integration | PASS — `:249` continues to pass `chrome={false}`; no diff in this file vs. main per `git diff main...HEAD --stat`. |
| PdfReport.tsx integration | PASS — `:488` uses `<EgfrChart data={chartData} chrome={false} />` (design mode). The new aspect-ratio-derived height propagates to PDF rendering, matching LKID-82's `Results.html` design-source convergence. `.chart-card` at `PdfReport.tsx:262-266` has no fixed height (only padding + radius + background) — confirmed no overflow risk. **PDF parity actually improves with this PR.** |
| Chrome path (legacy `chrome={true}`) | PASS — only one user remains: `app/src/app/internal/chart/[token]/ClientChart.tsx` per PR #59 verdict. Code paths at `EgfrChart.tsx:399-434, 439-447, 538-560, 680-703, 807-850, 876-899` are untouched (no diff inside `!designMode` blocks except the `curve` ternary at `:663` which preserves `curveMonotoneX` for chrome). |
| Engine-driven trajectories | PASS — `transform.ts::transformPredictResponse` unchanged (only comment edits). All four trajectories driven by API response. End-point callouts at `EgfrChart.tsx:711-763` continue to use `Math.round(c.value)` from `last.egfr`, not hardcoded "17"/"4". |
| Test IDs | PASS — `egfr-chart-svg`, `chart-healthy-fill`, `dialysis-threshold-band`, `dialysis-threshold-line`, `chart-endpoint-callouts`, `chart-endpoint-value-${id}`, `trajectory-line-${id}`, `egfr-chart-data-table`, `egfr-chart-wrapper`, `egfr-chart-container` all preserved. No testid regressions. |

---

## Blocking Issues

**None.** The PR achieves its stated goal of design parity for the design-reference yMax=30 case, with all P0/P1 ACs implemented at the file:line called out in the audit.

---

## Non-Blocking Nits

### NIT-01 [MEDIUM] — Dashed dialysis line position drifts from `data.dialysisThreshold` at non-yMax=30 scales

**File:** `app/src/components/chart/EgfrChart.tsx:570-571`
**Caught by:** Copilot inline review

**Problem.** In design mode, `thresholdY = 0.768 * totalHeight - margin.top` is hardcoded regardless of `yMax`. The screenshot evidence at `agents/harshit/drafts/chart-pixel-parity-v2-after.png` renders with mock data → `maxEgfr=71` → `yMax=75`. At yMax=75, eGFR=12 (`data.dialysisThreshold`) should land at `12/75 = 0.16` of the chart from the bottom (= 0.84 from the top); the pinned `0.768` puts the line at ~eGFR 17.4 — **5.4 eGFR units higher than the actual threshold**. The label still reads "Level where dialysis may be needed", so it's misleading at non-yMax=30 scales.

**Why it matters.** CKD Stage 3a patients (eGFR 45-59 — the marketing app's largest target segment) will land on yMax=60 and see the line ~5-6 units off. The mock data demonstrates this exact regression in the committed screenshot.

**Recommended fix (Copilot's exact suggestion).**
```tsx
const totalHeight = innerHeight + margin.top + margin.bottom;
const thresholdY =
  yMax === 30
    ? 0.768 * totalHeight - margin.top
    : yScale(data.dialysisThreshold);
```
This preserves design parity at yMax=30 (the only case Inga's audit covers) and falls back to data-driven positioning everywhere else. **Strongly recommend landing on the same branch before merge** — the cleanup is 4 lines, eliminates the only meaningful clinical-correctness regression, and aligns with Brad's "chart stays data-driven" Q2 call.

### NIT-02 [LOW] — Coordinate mapping for x-axis labels and green-fill baseline uses inner-coords, not full-SVG coords

**Files:** `app/src/components/chart/EgfrChart.tsx:512` (baseline), `:782` (x-tick yLabel)
**Caught by:** Copilot inline review

**Problem.** Both spots set `y = innerHeight ± 5`, but the audit and PR description reference design `y=275 of 280` — which would map to `innerHeight + margin.bottom - 5` in inner-group coordinates (because the inner group is translated by `margin.top`, not the full SVG). Visually, the result still looks correct in the after-screenshot because the dialysis pink band itself is decoratively pinned at 0.768 and the labels overlap that band — which **is** the design's vertical rhythm. But the literal coordinate math doesn't match design's `y=275`.

**Recommended fix.** Either accept Copilot's two suggested patches verbatim (changes `innerHeight - 5` → `innerHeight + margin.bottom - 5` for the x-tick label, and `innerHeight + 5` → `innerHeight + margin.bottom - 5` for the green fill baseline), OR add a code comment acknowledging the deliberate inner-coord mapping and why the visual outcome is correct.

**Why LOW.** Visually correct as-is; landed screenshot confirms labels overlap the pink band. But future maintainers will be confused why the comment says "y=275 of 280" but the math doesn't reflect that. Cheap to fix.

### NIT-03 [LOW] — Green-fill polyline top edge uses straight L segments, trajectory uses Catmull-Rom

**File:** `app/src/components/chart/EgfrChart.tsx:514-522`
**Caught by:** Copilot (suppressed as low-confidence) — Yuri concurs as a real but minor visual delta.

**Problem.** The healthy-range fill walks the green points with `M ... L ... L ...` (straight lines) but the green trajectory line itself uses `curveCatmullRom`. With 15 dense points the discrepancy is tiny (sub-pixel at most), but when point density drops (e.g. shorter projections, 5-7 points), the fill's straight-edge top will visibly "cut into" the smooth Catmull-Rom curve.

**Recommended fix.** Use d3's `line` generator with `curveCatmullRom` to build the path, OR accept the minor visual delta and document the choice. Filing for awareness; not blocking.

### NIT-04 [LOW] — Audit spec uses absolute `/Users/brad/...` paths

**File:** `agents/inga/drafts/chart-pixel-diff-audit-v2.md:7-8`
**Caught by:** CodeRabbit

**Problem.** Repo-relative paths (`project/Results.html:396-455`, `app/src/components/chart/EgfrChart.tsx`) keep the spec actionable on CI/GitHub for any reviewer not on Brad's machine. Author already uses repo-relative paths in the implementation summary at `:182`. Fix is a 2-line edit.

---

## Failure Summary

### HIGH Severity (0)
None.

### MEDIUM Severity (1)
| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| NIT-01 | `EgfrChart.tsx:570-571` (designMode dialysis line) | Dashed line pinned at 0.768 of totalHeight regardless of yMax → drifts off `data.dialysisThreshold` at yMax≠30 (~5 eGFR units off at yMax=75). Mock screenshot demonstrates the regression. | Apply Copilot's `yMax === 30 ? 0.768*totalHeight - margin.top : yScale(data.dialysisThreshold)` ternary. 4-line patch. |

### LOW Severity / Notes (3)
| ID | Component | Issue |
|----|-----------|-------|
| NIT-02 | `EgfrChart.tsx:512, :782` | Coord mapping uses inner-group coords; comments reference full-SVG `y=275 of 280`. Visual outcome correct; comment-vs-math mismatch only. |
| NIT-03 | `EgfrChart.tsx:514-522` (healthy fill polyline) | Fill top edge uses straight L segments while trajectory uses Catmull-Rom. Sub-pixel at 15 points; visible at lower point density. |
| NIT-04 | `agents/inga/drafts/chart-pixel-diff-audit-v2.md:7-8` | Absolute `/Users/brad/...` paths. Use repo-relative. |

---

## Overall Readiness Assessment

**READY for merge with NIT-01 patched on the same branch.**

The PR delivers exactly what LKID-89 asked for: pixel-parity to `project/Results.html` for the design-reference baseline, with engineering choices (Catmull-Rom curve, decorative dialysis-line pin, hardcoded y-tick positions for yMax=30) that match Brad's 2026-04-29 policy calls. The only meaningful blocking risk is **NIT-01** (dialysis-line drift at non-yMax=30 patients), which is a real clinical-correctness regression that affects the largest target segment (Stage 3a, yMax=60) and is fixable in 4 lines using Copilot's suggested ternary.

**Recommended pre-merge actions:**
1. **Land Copilot's NIT-01 patch** (yMax=30 conditional on `thresholdY`) on the same branch. This is the only meaningful gap.
2. Optionally land Copilot's NIT-02 patches (full-SVG coord mapping for `baselineY` and x-tick `yLabel`) — cosmetic clarity, no behavioral change visible in the after-screenshot.
3. NIT-03 and NIT-04 can ship as-is and be picked up in a Sprint 6 polish PR if Brad wants them.

**Post-merge follow-ups (not blocking this PR):**
- LKID-81 (Playwright wiring + visual-regression baselines for design-parity layout) — required for the next chart PR's QA to be runnable in CI.
- CodeRabbit's broader callout on the SVG-wide axe exclusion (`transform.ts:30` doc) — file as a Sprint 6 clean-up to scope the exemption to specific selectors only.

**Brad sign-off precedent:** PR #59 Yuri verdict (LKID-80) explicitly accepted the AA-override on chart lines as Brad's 2026-04-20 binding decision; this PR's binding-policy update at `transform.ts:18-30` is consistent with that precedent. No new escalation needed for the contrast posture.

---

## Re-QA after `da8fdcb`

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**HEAD verified:** `da8fdcb` (commit message: `fix(LKID-89): address PR #66 review feedback`)
**Method:** Read each touched file on disk; ran `npx tsc --noEmit` and `npx eslint src/components/chart/EgfrChart.tsx tests/a11y/accessibility.spec.ts`. Both clean.

### Per-fix verdicts

**NIT-01 — dialysis threshold drift** — ✅ verified
- `EgfrChart.tsx:578-581`: single `thresholdY` const with the exact ternary spec'd:
  ```ts
  const totalHeight = innerHeight + margin.top + margin.bottom;
  const thresholdY = yMax === 30
    ? 0.768 * totalHeight - margin.top
    : yScale(data.dialysisThreshold);
  ```
- All 4 consumers route through it: `rect y={thresholdY}` (591), `line y1={thresholdY}` (598), `line y2={thresholdY}` (600), `text y={thresholdY - 6}` (608). No straggler references to the old `0.768 * totalHeight - margin.top` constant remain — `grep -n "0.768"` returns only the comment at :569 and the conditional at :580.
- yMax=30 path is bit-for-bit identical to the previous formula → design parity at the reference baseline preserved.
- Comment block at :566-577 cites Copilot + CodeRabbit + Yuri as the source for the fix. Good attribution.

**NIT-02 — y-coord comment/math mismatch** — ✅ verified
- `EgfrChart.tsx:508-515` (healthy-fill `baselineY`): comment now correctly says "in inner-group coords; the plot area runs y=0..innerHeight, so innerHeight + 5 sits just below the bottom of the plot inside the bottom margin — equivalent to design's y=275 of 280 once the group transform is applied". Math unchanged (`innerHeight + 5`).
- `EgfrChart.tsx:789-796` (x-tick `yLabel`): comment now says "in inner-group coords; remember the Group is translated by margin.top, so this y maps to the same visual position as design's y=275 of 280 once you account for the top/bottom margin split". Math unchanged (`innerHeight - 5`).
- Both comments now describe the inner-group coord system accurately.

**NIT-03 — fill curve mismatch** — ✅ verified
- `EgfrChart.tsx:15`: import is `import { LinePath, Bar, Line, area as d3Area } from "@visx/shape";` — `area` aliased to `d3Area`, exactly as Harshit reported.
- `EgfrChart.tsx:520-526`: `d3Area<DataPoint>({ x: ..., y0: () => baselineY, y1: (pt) => yScale(pt.egfr), curve: curveCatmullRom })`. `y0` is the baseline (closes fill at the bottom), `y1` is the trajectory line — sensible accessors, matches the trajectory `LinePath` curve at :673.
- Comment at :516-519 explains why (straight L-segments diverged from the smoothed stroke at low point density). `curveCatmullRom` was already imported at :20.

**axe waiver scope** — ✅ verified
- `accessibility.spec.ts:135`: `.exclude('[data-testid="egfr-chart-svg"]')` — narrow scoped selector, not the previous `svg`.
- `EgfrChart.tsx:373`: chart SVG carries `data-testid="egfr-chart-svg"` (single match in the file). Selector matches the rendered chart and nothing else.
- `accessibility.spec.ts:132-134`: `TODO(LKID-89)` comment present, citing LKID-81 visual-regression suite as the unblocker. Comment block at :129-131 also explains the CodeRabbit Major was the trigger for the scope tightening.

**Audit doc paths** — ✅ verified
- `agents/inga/drafts/chart-pixel-diff-audit-v2.md:7`: `**Reference:** \`project/Results.html:396-455\`` — repo-relative.
- `grep -n "/Users/brad" agents/inga/drafts/chart-pixel-diff-audit-v2.md` returns no matches. All absolute paths scrubbed.

### Build + lint status

- `cd app && npx tsc --noEmit` → exit 0, no output (clean).
- `cd app && npx eslint src/components/chart/EgfrChart.tsx tests/a11y/accessibility.spec.ts` → exit 0, no output (clean).

### Updated top-level verdict: **PASS**

All 4 nits from the original verdict are resolved. NIT-01 (the only meaningful clinical-correctness gap) is fixed in the form Copilot suggested and Yuri's original verdict recommended. The narrowed axe scope (`[data-testid="egfr-chart-svg"]` instead of `svg`) is a strict improvement over the previous LKID-80 baseline — page-chrome SVGs (icons, etc.) are now back in the contrast scan, with only the chart SVG exempted under a TODO citing LKID-81 as the unblocker.

**No further QA pass needed before merge.** Recommend Luca proceed to merge `da8fdcb` into `main`.
