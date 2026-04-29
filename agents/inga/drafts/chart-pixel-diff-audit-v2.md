# Chart Pixel-Diff Audit v2 — Deployed vs `project/Results.html`

**Owner:** Inga
**Date:** 2026-04-29
**Context:** Brad reported the deployed `/results/[token]` chart still does not match `project/Results.html` after LKID-80 shipped. This audit lists every visible delta and a prioritized fix list for Harshit. **No implementation here — this is a spec.**

**Reference:** `/Users/brad/Documents/aaa/Client Projects/KidneyHood/repo/LKID/project/Results.html:396-455` (hand-tuned SVG, `viewBox="0 0 720 280"`).
**Implementation:** `/Users/brad/Documents/aaa/Client Projects/KidneyHood/repo/LKID/app/src/components/chart/EgfrChart.tsx` — `designMode` branch.

---

## 1. Side-by-side observations

Each row: **Design** → **Deployed** → **Gap (P-level)**.

### 1.1 Container / SVG geometry

| Element | Design | Deployed | Gap |
|---|---|---|---|
| viewBox / aspect ratio | `0 0 720 280` (2.57:1), `preserveAspectRatio="none"` (stretches) | `width=ParentSize`, `height=300` (desktop) → ~3.3:1 at typical container width (~990px) | **P0** — wider/shorter design feel is lost. Deployed is closer to square. |
| Container background | `.card` white, rounded, soft shadow (Results.html) | Bare SVG — Results page wraps it. Match. | OK |
| Section title above chart | `<h3 class="section-title">Your Future Kidney Function</h3>` lives **inside** `.chart-box` | Owned by ResultsView (outside chart component) | OK — verify wording matches in ResultsView |

### 1.2 Y-axis labels

| Property | Design (`Results.html:409-415`) | Deployed (`EgfrChart.tsx:441-454`) | Gap |
|---|---|---|---|
| Tick values | `30, 20, 10, 5, 0` (5 ticks, **non-uniform** — 5 is squeezed near bottom) | `designYTicks(yMax)` returns `[yMax, 2/3·yMax, 1/3·yMax, 1/6·yMax, 0]` — uniform-ish, `yMax` snaps to 30/45/60/75/90. For yMax=30: `[30, 20, 10, 5, 0]` — values match | OK on values when yMax=30 |
| Y position of labels | Hand-placed: `y=40, 100, 160, 220, 260` (gap from 10→5 is 60px; from 5→0 is 40px — **5 sits closer to dialysis line at y=215, not on a uniform grid**) | Uses `yScale(tick)` — strictly proportional. So "5" lands at ~233 in a 280-tall chart, not at 220. | **P1** — label position differs by ~15px; visually "5" sits below the dashed line on design, deployed shows it just above |
| Font family | `Nunito Sans` | `Nunito Sans, system-ui, sans-serif` | OK |
| Font size | `10` (px in viewBox units) | `10` | OK |
| Color | `#8A8D96` | `#8A8D96` | OK |
| X position | `x=20` (for 30/20/10), `x=24` (for 5/0) — slight indent for single-digit values | `x={-margin.left + 4}` → constant; with `margin.left=36` that's `x=-32` (in inner-coord), which translates to `x=4` in viewBox | **P1** — labels too far left (clipped/cramped against left edge); design has them at x=20-24 |

### 1.3 X-axis labels

| Property | Design (`Results.html:443-453`) | Deployed (`EgfrChart.tsx:708-730`) | Gap |
|---|---|---|---|
| Tick count | 10 ticks: `1 yr, 2 yr, 3 yr ... 10 yr` | 10 ticks: `1 yr, 2 yr, ..., 10 yr` | OK |
| Format | `"1 yr"` (space) | `` `${yr} yr` `` → `"1 yr"` (space) | OK |
| Y position | `y=275` (5px below baseline at 215, **inside** the dialysis band visually — labels overlap pink fill region) | `y={innerHeight + 14}` — below plot area | **P1** — design has labels overlapping the dialysis band; deployed has them below it. Different vertical rhythm. |
| X positions | Hand-tuned: `72, 137, 202, 267, 332, 397, 462, 527, 592, 650` — last one ("10 yr") is at 650, **not 700** (text-anchor=start, so it ends ~675) | `xScale(m)` with `text-anchor=middle`, evenly spaced to inner width | **P1** — last label is centered under the endpoint circle on deployed; design has it tucked left of the circle |
| Font | `Nunito Sans 10`, `#8A8D96` | match | OK |

### 1.4 Dashed dialysis line

| Property | Design (`Results.html:418`) | Deployed (`EgfrChart.tsx:525-534`) | Gap |
|---|---|---|---|
| Stroke color | `#E0A0A0` | `#E0A0A0` | OK |
| Stroke width | `1` | `1` | OK |
| Dasharray | `"3 3"` | `"3 3"` | OK |
| Y position | `y=215` (so 215/280 = **76.8%** down from top) | `yScale(data.dialysisThreshold)` — threshold is **eGFR 12**, on a 0-30 domain that's at `(1 - 12/30) = 60%` down from top | **P0** — dashed line sits ~17pp higher than design. The visual emphasis of "dialysis is way down here" is lost. (See §3 — engine-driven.) |
| X extent | `x1=55, x2=720` (from y-axis margin to right edge of viewBox) | `x1=0, x2=innerWidth` | OK (margins differ but visually equivalent) |

### 1.5 "Level where dialysis may be needed" label

| Property | Design (`Results.html:419`) | Deployed (`EgfrChart.tsx:535-544`) | Gap |
|---|---|---|---|
| Font family | `Nunito Sans` | `Nunito Sans, system-ui, sans-serif` | OK |
| Font size | `10` | `10` | OK |
| Color | `#C54B4B` | `#C54B4B` | OK |
| Font weight | `500` | `500` | OK |
| X position | `x=70` (15px right of left axis) | `x=14` (in inner coords, so absolute ≈ `margin.left + 14` = 50) | **P2** — close, off by ~20px |
| Y position | `y=208` (7px **above** the dashed line) | `thresholdY - 6` | OK |

### 1.6 Healthy-range green fill (gradient)

| Property | Design (`Results.html:422`) | Deployed (`EgfrChart.tsx:460-482`) | Gap |
|---|---|---|---|
| Shape | Closes from green-line endpoints down to **bottom of viewBox** (`L 700 275 L 55 275 Z`) — fills the entire region under the green line | Closes from green-line endpoints down to `yScale(0)` (baseline) | OK in concept |
| Gradient stops | `#6CC24A` `0.22` → `0` | `#6CC24A` `0.22` → `0` | OK |
| Gradient direction | top→bottom (x1=0,y1=0,x2=0,y2=1) | match | OK |
| Visual height of fill | Fill spans from green-line down to y=275 (~20px below dashed line) — fill **bleeds into** the dialysis pink zone | Fill spans to baseline (y=0 eGFR), which on deployed is below the dashed line by a different amount | **P2** — depends on §1.4 fix; once the dashed line moves, fill shape drifts too |

### 1.7 Dialysis-zone pink fill

| Property | Design (`Results.html:417`) | Deployed (`EgfrChart.tsx:518-524`) | Gap |
|---|---|---|---|
| Present | Yes — `rect x=55 y=215 w=665 h=25` | Yes — `rect x=0 y=thresholdY w=innerWidth h=25` | OK |
| Gradient | `#E08B8B` 0.12 → 0 | match | OK |
| Height | `25` (in 280-unit viewBox) | hard-coded `25` (in pixels of inner height, ~300px) | **P2** — same number but different scale; on deployed the band is proportionally taller |

### 1.8 Trajectory lines

| Property | Design (`Results.html:426-432`) | Deployed (`EgfrChart.tsx:585-613`) | Gap |
|---|---|---|---|
| Stroke widths | All `2.5` | From `traj.strokeWidth` (data-driven). Verify in `transform.ts` — **likely 2 or 2.5** | **Verify** — if not 2.5, that's **P1** |
| Colors | green `#3FA35B`, navy `#1F2577`, gold `#D4A017`, gray `#6B6E78` | from `traj.color` — palette decision in `chart-palette-decision.md` says "WCAG on chart lines" → these may be the **AA-override** palette, not the design palette | **P0** if palette differs. Per Sprint 5 PR #59 verdict, "AA override intentional per Brad" — so colors may already deviate. Confirm with Harshit which palette is shipped. |
| Linecap | `round` | `round` | OK |
| Curve smoothing | Hand-tuned cubic beziers (`C` + `S` commands) | `curveMonotoneX` — engine data driven | **P0** but **out of scope** — see §3 |
| Dasharray | All solid; gray has explicit `stroke-dasharray="0"` | From `traj.strokeDasharray` — verify all are solid for design mode | Verify |

### 1.9 Endpoint circles

| Property | Design (`Results.html:435-440`) | Deployed (`EgfrChart.tsx:650-702`) | Gap |
|---|---|---|---|
| Which trajectories get them | **Only green and gray** (BUN ≤12 and No Treatment) | Only green and gray — match | OK |
| Radius | `r=16` | `r=16` | OK |
| Fill | `#fff` | `#fff` | OK |
| Stroke width | `1.5` | `1.5` | OK |
| Stroke color | matches line color | matches line color | OK |
| Cx position | `cx=700` (20px from right edge of viewBox=720) | `cx={innerWidth - 16}` | OK |
| Label font | `Manrope 13 / 700` | `Manrope, system-ui 13 / 700` | OK |
| Label color | matches line color | matches line color | OK |
| Label text | `17` (green), `4` (gray) — **hardcoded** in design | `Math.round(c.value)` — engine output | OK (engine drives correctly) |

### 1.10 Other (margins, padding, legend, etc.)

| Element | Design | Deployed | Gap |
|---|---|---|---|
| Chart padding inside `.card` | `.chart-box` has standard card padding | `chrome=false` → bare SVG | OK |
| Legend ("Healthy range / Stable range / Higher risk / No treatment") | Lives in a sibling `.scenarios` column to the right of chart, 2-col `.chart-grid` | Owned by ResultsView | **Verify ResultsView matches** — outside this chart component |
| "Scenario Overview" section + pills + cards | Below chart | Owned by ResultsView | **Verify** |
| Chart aspect ratio at desktop | 720×280 = 2.57:1 | 990×300 ≈ 3.3:1 | **P0** — see §1.1 |

---

## 2. Prioritized fix list

### P0 — blocks parity claim

**P0-1. Aspect ratio / chart height too tall.**
`EgfrChart.tsx:51` — `DESIGN_HEIGHT_DESKTOP = 300`. The design's natural ratio is 720:280 = 2.57:1. At a typical Results-page chart container width of ~960-1000px, the height should be **~370-390px** to match the wide-short feel — OR set the SVG to use `viewBox="0 0 720 280" preserveAspectRatio="none"` directly and let it stretch (matches design literally).
**Recommended fix:** drop `width`/`height` props, set `viewBox="0 0 720 280" preserveAspectRatio="none"` on the `<svg>` and treat all interior coordinates in 720×280 space. This eliminates the responsive scaling math entirely and gives pixel-for-pixel parity with `Results.html`.

**P0-2. Dashed dialysis line position is engine-driven, not design-fixed.**
`EgfrChart.tsx:514` — `const thresholdY = yScale(data.dialysisThreshold);`. Design pins the line at `y=215` of a 280-tall viewBox (76.8% down). With `data.dialysisThreshold=12` on a 0-30 yScale, deployed lands at 60% down. Either:
- (a) Pin the line to `y = innerHeight * 0.768` (decorative), OR
- (b) Change `yMax` snapping logic at `EgfrChart.tsx:195-201` so `dialysisThreshold/yMax = 12/yMax` lands at 0.768. With threshold=12, that requires yMax ≈ 51.7 — not a "nice" number. Option (a) is cleaner.

**P0-3. Trajectory colors — confirm AA-override palette is what Brad wants.**
Per `chart-palette-decision.md` and PR #59 verdict, deployed uses an AA-override palette on chart lines. The design palette is `#3FA35B / #1F2577 / #D4A017 / #6B6E78`. If Brad wants design parity here, override the palette in design mode. If AA was intentional, this row closes as WAI — get explicit confirmation from Brad.

### P1 — visible at a glance

**P1-1. Y-axis label x position too far left.**
`EgfrChart.tsx:449` — `<text x={-margin.left + 4}>`. With `margin.left=36`, that's `x=4` in absolute viewBox terms; design uses `x=20` (and `x=24` for "5"/"0"). Change to `x={-margin.left + 20}` for two-digit ticks, `x={-margin.left + 24}` for one-digit (5/0).

**P1-2. Y-axis tick spacing is uniform; design is non-uniform near bottom.**
`EgfrChart.tsx:102-110` — `designYTicks` returns `[yMax, 2/3·yMax, 1/3·yMax, 1/6·yMax, 0]` rendered at `yScale(tick)`. Design has the "5" tick label at `y=220` (right above dialysis line), not at the proportional `yScale(5)=233`. **Easiest fix:** when in design mode and `yMax=30`, hardcode the y-coordinates to match design (`40, 100, 160, 220, 260`) instead of computing via `yScale`.

**P1-3. X-axis labels too far below the plot.**
`EgfrChart.tsx:722` — `y={innerHeight + 14}`. Design has them at `y=275` of a 280-tall viewBox = **inside** the bottom 5px (overlapping the pink dialysis fill). Change to `y={innerHeight - 5}` so they sit just inside the plot area.

**P1-4. Last x-tick ("10 yr") is centered under endpoint circle.**
`EgfrChart.tsx:723` — `textAnchor="middle"` for all ticks. Design uses default `text-anchor=start` and pulls the last label leftward to `x=650` (50px before the right edge). Either: switch to `textAnchor="start"` and offset each x by -8px, OR keep middle anchor but shift the "10 yr" label left by ~25px.

**P1-5. Stroke widths.**
Verify `traj.strokeWidth` for all 4 trajectories in `transform.ts` is `2.5`. If any are `2`, bump them.

### P2 — nice-to-have

**P2-1. "Level where dialysis may be needed" label x position.**
`EgfrChart.tsx:536` — `x=14` (inner coords). Design is at absolute `x=70`, which in inner coords ≈ `70 - margin.left ≈ 34`. Bump from 14 → 34.

**P2-2. Pink dialysis band height.**
`EgfrChart.tsx:515` — `bandHeight = 25`. In design, 25 is in viewBox units (so 25/280 = 8.9% of chart height). On deployed at innerHeight ≈ 270px, 25px is 9.3%. Negligible — leave as is unless P0-1 (viewBox switch) makes it natural to switch to viewBox units.

**P2-3. Green fill closes to baseline vs viewBox bottom.**
`EgfrChart.tsx:472` — `d += ` L ${xScale(last.monthsFromBaseline)} ${baselineY} `;` where `baselineY = yScale(0)`. Design closes to `y=275` (5px above bottom), so the fill bleeds into the pink zone. Change `baselineY` to `innerHeight + 5` to match.

---

## 3. Out-of-scope: curve shape

The deployed lines use `curveMonotoneX` over engine-computed data points. The design's lines are **hand-tuned cubic beziers** (`C 150 58, 240 62, 340 72 S 540 95, 700 100`) — they describe a specific aesthetic shape that does not correspond to any patient's predicted decline.

**Pixel-for-pixel curve parity is impossible without divorcing the chart from real predictions.** Three options for Brad:

1. **Live with engine-driven shape** (status quo). The four lines follow real predicted eGFR trajectories. Visual impression will differ from design — design lines all start tightly bunched at the top-left and fan out smoothly; engine lines may have visible inflection points where rates change (e.g., post-decline rate kicks in).

2. **Overlay the design's static beziers** as decoration, ignoring data. The chart becomes a marketing illustration, not a personalized prediction. **Strongly disrecommend** — this is a clinical tool and the lines are the value prop.

3. **Tune the curve smoothing** — switch from `curveMonotoneX` to a smoother curve (e.g., `curveCatmullRom` with high alpha, or `curveBasis`). Lines will look closer to design's smooth beziers without inventing data. Trade-off: smoothed lines may overshoot or undershoot actual data points by 1-2 eGFR. **Recommended middle path** if Brad wants visual softness.

Brad to call: keep #1 (current), or go with #3 (smoother curve).

---

## Implementation summary for Harshit

**File:** `app/src/components/chart/EgfrChart.tsx`

| # | Lines | Change |
|---|---|---|
| P0-1 | 51, 355-357 | Switch SVG to fixed `viewBox="0 0 720 280" preserveAspectRatio="none"`; recompute all interior margins in 720×280 space |
| P0-2 | 514 | Pin `thresholdY = innerHeight * 0.768` in design mode |
| P0-3 | (transform.ts) | Confirm trajectory colors with Brad; if design palette wins, override in design mode |
| P1-1 | 449 | `x={-margin.left + 20}` (or 24 for "5"/"0") |
| P1-2 | 448-452 | Hardcode y positions `[40, 100, 160, 220, 260]` when `yMax===30` and `designMode` |
| P1-3 | 722 | `y={innerHeight - 5}` |
| P1-4 | 719-726 | Special-case last tick: `textAnchor="end"`, shift left ~25px |
| P1-5 | (transform.ts) | All four `strokeWidth: 2.5` |
| P2-1 | 536 | `x=34` |
| P2-3 | 472 | `baselineY = innerHeight + 5` |

---

**Word count: ~1480.**
