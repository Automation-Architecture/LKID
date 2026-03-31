# DISPATCH: Sprint 3 Frontend — Harshit

**Date:** 2026-03-30
**From:** Luca (CTO / Orchestrator)
**To:** Harshit (Frontend Developer)
**Sprint:** Sprint 3 — PDF, Polish & QA (Mar 30 – Apr 9, 2026)

---

## Status Summary

LKID-19 (Visx chart) was deferred from Sprint 2 — it is now the critical path for Sprint 3. PDF export (LKID-4), chart interactivity (LKID-20), and the results page (LKID-21) all block on the chart. Start there immediately. LKID-5 (medical disclaimers) is fully independent and can run in parallel once you have the chart underway. The Clerk v7 migration is also in your queue but is lower priority — do not touch it until LKID-19 is merged.

---

## Track 1: LKID-19 — Visx eGFR Trajectory Chart (CRITICAL PATH)

**Card:** LKID-19
**Priority:** P0 — everything downstream depends on this
**Branch:** `feat/LKID-19-visx-chart`
**Skill to invoke:** Use `/frontend-design` for the chart component

### What to Build

A fully responsive eGFR trajectory chart using Visx (not Recharts, not bare D3). Four trajectory lines showing predicted kidney function over 10 years for four BUN management scenarios.

### Variant Selection (Required First Step)

Inga's spec defines two variants. You must run a quick POC before committing to Variant A. If ANY of the first four checks below fail, implement Variant B.

| Check | Requirement | Fallback |
|-------|-------------|---------|
| Custom dash patterns | All 4 `strokeDasharray` patterns render correctly on `LinePath` | Variant B (2 patterns only) |
| Phase band fills | Colored `rect` fills visible, text readable at all breakpoints | Variant B (reference lines) |
| Touch tooltips | `@visx/tooltip` + `@visx/event` `localPoint` positions correctly on tap (within 20px) | Variant B (no tooltips) |
| Touch coordinate accuracy | Within 20px of data point on mid-range mobile | Variant B |
| Bundle size | All Visx packages < 50KB gzip | Variant B (< 25KB gzip) |
| Render perf | < 16ms paint on mid-range mobile (4 lines × 25 points) | Variant B |

Document your POC result in a comment on the LKID-19 Jira card before starting full implementation.

### Chart Specifications

**Container:**
- `@visx/responsive` `ParentSize` wrapper for automatic resizing
- Background: white (#FFFFFF), border: 1px #E0E0E0, border-radius: 8px
- Chart title: "eGFR Trajectory" (15px/700) + "Predicted kidney function over 10 years" (12px/400 muted) — HTML above SVG, not inside it

**Trajectory Lines:**

| ID | Label | Color | Pattern | strokeWidth |
|----|-------|-------|---------|-------------|
| `bun_lte_12` | BUN <= 12 | #1D9E75 | solid | 2.5px |
| `bun_13_17` | BUN 13–17 | #378ADD | dashed `strokeDasharray="8,4"` | 2.5px |
| `bun_18_24` | BUN 18–24 | #85B7EB | short-dash `strokeDasharray="4,4"` | 2.0px |
| `no_treatment` | No Treatment | #AAAAAA | dotted `strokeDasharray="2,4"` | 2.0px |

Use `LinePath` from `@visx/shape`, curve `curveMonotoneX` from `@visx/curve`, `strokeLinecap="round"`, `strokeLinejoin="round"`.

**Axes:**
- X-axis: `scaleLinear` domain `[0, 120]`, tick positions `[0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120]`, labels `["0", "1yr", "2yr", … "10yr"]`. Mobile: every other label. Axis title: "Months". Use `AxisBottom` from `@visx/axis`.
- Y-axis: `scaleLinear` domain `[0, max(90, maxEgfr + 10)]`, ticks `[0, 15, 30, 45, 60, 75, 90]`. Axis title: "eGFR (mL/min/1.73m2)" rotated -90°, hidden on mobile. Use `AxisLeft` from `@visx/axis`, `GridRows` from `@visx/grid`.

**Dialysis Threshold Line:**
- Horizontal line at eGFR = **15** (not 12 — use 15 per chart-specs.md)
- Color: #D32F2F, `strokeDasharray="6,3"`, strokeWidth 2px
- Label: "Dialysis threshold" — 11px/600 #D32F2F, right-aligned 4px above line
- z-order: above phase bands, below trajectory lines
- Use `Line` from `@visx/shape`

**Phase Bands (Variant A):**

| Phase | eGFR Range | Fill | Opacity |
|-------|-----------|------|---------|
| Normal/Mild | 60 – yMax | #E8F5F0 | 0.3 |
| Moderate | 30 – 60 | #FFF8E1 | 0.3 |
| Severe | 15 – 30 | #FDECEA | 0.2 |
| Dialysis Zone | 0 – 15 | #F5F5F5 | 0.3 |

Labels: 11px/400 #888888, top-right corner of each band.

**End-of-Line Labels:**
- Final eGFR value at rightmost data point, 8px horizontal offset
- Minimum 15px vertical separation — push apart if labels collide, maintain relative order
- SVG `<text>` elements, 12px/600, color matches trajectory

**Footnote:**
- HTML below SVG (not inside): "_Data points are plotted at actual time intervals. Early measurements are more frequent._"
- 12px/400 italic #888888, margin-top 8px

**Responsive Dimensions:**

| Breakpoint | SVG Height | Margins (T/R/B/L) |
|------------|-----------|-------------------|
| Mobile (<768px) | 200px | 16 / 48 / 40 / 40 |
| Tablet (768–1024px) | 280px | 16 / 64 / 40 / 48 |
| Desktop (>1024px) | 340px | 20 / 80 / 48 / 56 |

Right margin is intentionally large to accommodate end-of-line labels. Mobile: hide Y-axis title, show legend below chart if labels clip viewport edge.

### API Data Shape

The chart receives data from `POST /predict`. Map the response to the `ChartData` interface defined in Inga's chart-specs.md. The raw API response shape:

```json
{
  "egfr_calculated": 38,
  "confidence_tier": 2,
  "unlock_prompt": "Add 2 more visit dates to unlock trend analysis.",
  "trajectories": {
    "none":  [38, 36, 34, 32, 30, 27, 24, 19, 16, 13, 11, 10, 9, 8, 7],
    "bun24": [38, 37, 37, 36, 36, 35, 35, 34, 33, 33, 32, 32, 31, 31, 30],
    "bun17": [38, 38, 39, 40, 41, 42, 44, 46, 48, 49, 50, 51, 51, 52, 52],
    "bun12": [38, 39, 41, 43, 46, 49, 53, 58, 62, 65, 67, 68, 69, 70, 71]
  },
  "time_points_months": [0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108,120],
  "dial_ages": { "none": 68, "bun24": null, "bun17": null, "bun12": null },
  "slope": -3.2,
  "slope_description": "declining",
  "visit_count": 3,
  "created_at": "2026-03-25T12:00:00Z"
}
```

Key mapping notes:
- `trajectories.none` → `no_treatment` trajectory
- `trajectories.bun24` → `bun_18_24` trajectory
- `trajectories.bun17` → `bun_13_17` trajectory
- `trajectories.bun12` → `bun_lte_12` trajectory
- `time_points_months` is the shared X-axis — zip with each trajectory array to produce `DataPoint[]`
- `dial_ages` maps to `dialysisAge` on each `TrajectoryData` object
- `confidence_tier` passes through to a badge rendered in the chart's top-right corner

Use the mock above during development. The `/predict` backend endpoint is live — swap in real data calls for final integration.

### Visx Dependencies

**Variant A (full interactive):**
```
@visx/shape        — LinePath, Bar, Line, Circle
@visx/scale        — scaleLinear
@visx/axis         — AxisBottom, AxisLeft
@visx/grid         — GridRows
@visx/group        — Group
@visx/tooltip      — Tooltip, TooltipWithBounds, useTooltip
@visx/event        — localPoint
@visx/responsive   — ParentSize
@visx/curve        — curveMonotoneX
@visx/text         — Text
```

**Variant B (static fallback):**
Same list minus `@visx/tooltip`, `@visx/event` — saves ~25KB gzip.

### Accessibility (Required for Both Variants)

- `<svg role="img" aria-label="eGFR trajectory chart showing 4 predicted kidney function scenarios over 10 years">`
- `<title>` and `<desc>` inside SVG (dynamic values from prediction response)
- Visually hidden `<table class="sr-only">` immediately after SVG — caption, columns for each trajectory, one row per time point
- Every trajectory distinguishable by both color AND line pattern (WCAG 1.4.1)
- `prefers-reduced-motion`: disable all transitions and animations

### References

- Full chart design spec: `agents/inga/drafts/chart-specs.md` — read this in full, it is the authoritative source
- API response shape: `agents/john_donaldson/drafts/api_contract_summary.md` Section 4
- Full OpenAPI spec: `agents/john_donaldson/drafts/api_contract.json`
- Your frontend architecture notes: `agents/harshit/drafts/frontend_architecture.md`
- Yuri's test strategy (visual regression requirements): `agents/yuri/drafts/test_strategy.md`

### Acceptance Criteria

1. All 4 trajectory lines render with correct colors and dash/dot patterns
2. X-axis uses true linear time scale; tick labels follow spec (every other on mobile)
3. Y-axis shows correct dynamic range; dialysis threshold line visible at eGFR 15
4. Phase bands render behind trajectory lines (Variant A) or reference lines (Variant B)
5. End-of-line labels present with at least 15px vertical separation (no collisions)
6. Chart is responsive across all 3 breakpoints with correct heights and margins
7. Accessible: sr-only data table, SVG role/aria-label, `<title>`, `<desc>` present
8. Chart accepts and correctly renders live API prediction data
9. `data-testid` on chart container, each trajectory line, each stat card, and the data table
10. POC variant decision documented on LKID-19 Jira card before implementation begins

---

## Track 2: LKID-5 — Medical Disclaimers

**Card:** LKID-5
**Priority:** HIGH — can run in parallel with Track 1
**Branch:** `feat/LKID-5-disclaimers`
**Co-owner:** Inga (design sign-off required before marking done)

### Verbatim Disclaimer Text

> This tool is for informational purposes only and does not constitute medical advice. Consult your healthcare provider before making any decisions about your kidney health.

This is verbatim — do not paraphrase, truncate, or reorder.

### Responsive Behavior

**Desktop (>768px):**
- Rendered inline, immediately below the chart and stat cards
- Full text visible at all times — no expand/collapse
- Styling: 14px/400 `--muted-foreground`, max-width aligned to chart container, padding 12px 0

**Mobile (≤768px):**
- Sticky collapsed footer, single-line summary visible at all times
- Summary line: "This tool is for informational purposes only." (first sentence)
- Tap-to-expand shows full verbatim text in an elevated panel above the footer
- Tap anywhere outside the panel (or a dismiss button) collapses it
- Footer must not overlap interactive content — use `padding-bottom` on the page to clear it

### Accessibility

- WCAG AA contrast required: text against background must meet 4.5:1 ratio
- Collapsed footer still readable: contrast applies to the summary line
- Expand/collapse toggle: `aria-expanded` state, `aria-controls` pointing to the full-text panel
- Full text panel: `role="region"` with `aria-label="Medical disclaimer"`
- Keyboard accessible: Space/Enter on collapsed footer expands; Escape closes

### References

- Inga will provide component design specs — check with her before building the mobile footer
- Design tokens: `agents/inga/drafts/design-tokens.md` for color values and spacing
- Component specs: `agents/inga/drafts/component-specs.md`

### Acceptance Criteria

1. Verbatim disclaimer text rendered exactly as specified (no changes)
2. Desktop: inline below chart, always visible, WCAG AA contrast
3. Mobile: sticky collapsed single-line footer, tap-to-expand full text
4. `aria-expanded`, `aria-controls`, `role="region"` wired correctly
5. Keyboard accessible (Space/Enter expand, Escape close)
6. Inga sign-off on visual implementation before marking done
7. `data-testid` on disclaimer container, expand toggle, and full-text panel

---

## Coordination Notes

- **LKID-19 is the critical path.** PDF export (LKID-4), chart interactivity (LKID-20), and the results page (LKID-21) all depend on the chart being merged. Do not let anything else delay it.
- **LKID-5 is fully independent** — work it in parallel once LKID-19 is in progress. It should not block on chart completion.
- **Yuri (LKID-49)** will begin QA on the chart as soon as LKID-19 is in review. Include `data-testid` attributes from day one, not as a cleanup step. Coordinate with Yuri on component boundaries before you finalize the component API.
- **Inga** is co-owner on LKID-5. Get design specs from her before building the mobile disclaimer footer. She also provides visual sign-off on the chart — ping her before requesting PR review.
- **Clerk v7 migration** is in your queue for Sprint 3 but is explicitly lower priority than LKID-19 and LKID-5. Do not start it until both tracks above are merged.
- **PR naming convention:** `feat/LKID-19-visx-chart` and `feat/LKID-5-disclaimers`. One PR per card.
- **Backend `/predict` is live.** Use the mock data shape above during development and integrate real API calls before final PR review.

---

*Dispatched by Luca — 2026-03-30*
