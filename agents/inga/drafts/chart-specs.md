# KidneyHood Chart Interaction Specifications

**Author:** Inga (Senior UX/UI Designer)
**Version:** 1.0 -- Discovery Phase Draft
**Date:** 2026-03-25
**For:** Harshit (Frontend Developer)

Two chart specification variants for the eGFR trajectory chart using Visx (SVG). Variant A is the ideal full-featured implementation. Variant B is the simplified fallback if the Visx POC reveals constraints. **Selection between variants is blocked on Harshit's POC results.**

---

## Table of Contents

1. [Shared Specifications (Both Variants)](#1-shared-specifications)
2. [Variant A: Full Visx Interactive](#2-variant-a-full-visx-interactive)
3. [Variant B: Simplified Static Fallback](#3-variant-b-simplified-static-fallback)
4. [Responsive Behavior](#4-responsive-behavior)
5. [Data Model](#5-data-model)
6. [Accessibility (Both Variants)](#6-accessibility)
7. [Decision Criteria for Variant Selection](#7-decision-criteria)

---

## 1. Shared Specifications

These apply to BOTH Variant A and Variant B.

### Chart Container

- Visx renders to `<svg>` within a responsive container `<div>`.
- Use `@visx/responsive` `ParentSize` wrapper for automatic resizing.
- Background: white (#FFFFFF).
- Border: 1px `--border` (#E0E0E0), border-radius: 8px.
- Padding around SVG: 0 (margins handled internally).

### Axes

**X-Axis (Time):**
- Scale: `scaleLinear` from `@visx/scale`.
- Domain: `[0, 120]` (months).
- True linear time scale -- 1 month = 1 unit, no compression or log transform.
- Compressed first year: data points are more frequent in months 0-12 but plotted at true positions. The visual "compression" is natural -- more data points cluster in the same span.
- Tick positions: `[0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120]`.
- Tick labels: `["0", "1yr", "2yr", "3yr", "4yr", "5yr", "6yr", "7yr", "8yr", "9yr", "10yr"]`.
- Mobile: show every other label to prevent overlap: `["0", "2yr", "4yr", "6yr", "8yr", "10yr"]`.
- Axis title: "Months" (centered below ticks), 12px/500 `--muted-foreground`.
- Axis line: 1px `--border`.
- Tick marks: 4px length, 1px `--border`.
- Visx components: `AxisBottom` from `@visx/axis`.

**Y-Axis (eGFR):**
- Scale: `scaleLinear` from `@visx/scale`.
- Domain: `[0, max(90, maxEgfr + 10)]` -- dynamic upper bound.
- Tick positions: `[0, 15, 30, 45, 60, 75, 90]` (always include 15 for dialysis ref).
- Axis title: "eGFR (mL/min/1.73m2)" -- rotated -90deg, 12px/500 `--muted-foreground`.
- Grid lines: horizontal, 1px `--border` 30% opacity, at each tick.
- Visx components: `AxisLeft` from `@visx/axis`, `GridRows` from `@visx/grid`.

### Chart Title

```
eGFR Trajectory                     15px/700 --foreground
Predicted kidney function over       12px/400 --muted-foreground
10 years
```

- Position: top-left inside chart container, above SVG, padding 12px 16px.
- Not inside SVG (HTML element for better text rendering).

### Trajectory Lines

Four trajectories, always rendered:

| ID | Label | Color | Pattern | strokeWidth |
|----|-------|-------|---------|-------------|
| `bun_lte_12` | BUN <= 12 | #1D9E75 (`--primary`) | solid | 2.5px |
| `bun_13_17` | BUN 13-17 | #378ADD (`--secondary`) | dashed `strokeDasharray="8,4"` | 2.5px |
| `bun_18_24` | BUN 18-24 | #85B7EB (`--secondary-light`) | short-dash `strokeDasharray="4,4"` | 2.0px |
| `no_treatment` | No Treatment | #AAAAAA (`--neutral`) | dotted `strokeDasharray="2,4"` | 2.0px |

- Visx component: `LinePath` from `@visx/shape`.
- Curve: `curveMonotoneX` from `@visx/curve` (smooth, monotone -- prevents overshoot).
- `strokeLinecap="round"` for all.
- `strokeLinejoin="round"` for all.
- Fill: none.

### Dialysis Threshold Line

- Horizontal line at eGFR = 15.
- Color: #D32F2F (`--destructive`).
- Pattern: dashed `strokeDasharray="6,3"`.
- strokeWidth: 2px.
- Label: "Dialysis threshold" -- 11px/600 #D32F2F.
- Label position: right-aligned, 4px above line, inside right margin.
- z-order: above phase bands, below trajectory lines.
- Visx: `Line` from `@visx/shape`.

### End-of-Line Labels

Each trajectory has a label at its rightmost data point showing the final eGFR value.

```
                                    BUN<=12: 48  <-- 12px/600 #1D9E75
                                    13-17: 35    <-- 12px/600 #378ADD
                                    18-24: 22    <-- 12px/600 #85B7EB
                                    None: 18     <-- 12px/600 #AAAAAA
```

- Position: right of last data point, 8px horizontal offset.
- Collision avoidance: minimum 15px vertical separation between labels.
- If labels overlap: push apart vertically, maintaining relative order (highest eGFR on top).
- Labels render as SVG `<text>` elements.
- Font: 12px/600, color matches trajectory.

### Phase Bands

Horizontal background regions indicating CKD severity zones.

| Phase | eGFR Range | Fill | Opacity | Label |
|-------|-----------|------|---------|-------|
| Normal/Mild | 60 - yMax | #E8F5F0 | 0.3 | "Normal/Mild" |
| Moderate | 30 - 60 | #FFF8E1 | 0.3 | "Moderate" |
| Severe | 15 - 30 | #FDECEA | 0.2 | "Severe" |
| Dialysis Zone | 0 - 15 | #F5F5F5 | 0.3 | "Dialysis Zone" |

- Visx: `Bar` from `@visx/shape` or `rect` SVG element.
- Full width of chart plot area.
- z-order: behind grid lines, behind trajectory lines.
- Labels: 11px/400 #888888, positioned top-right corner of each band, 8px from right, 4px from top.

### Chart Footnote

Required per Decision #5. Rendered as HTML below the SVG, not inside SVG.

> _Data points are plotted at actual time intervals. Early measurements are more frequent._

- 12px/400 italic #888888.
- Margin-top: 8px from SVG bottom.

---

## 2. Variant A: Full Visx Interactive

The ideal implementation with full interactivity. Requires Visx POC confirmation of: custom dash patterns, hover/tap detection on individual lines, smooth animations.

### Interactive Tooltips

**Desktop (hover):**
- On mouse hover over any trajectory line within 8px proximity: show tooltip.
- Tooltip follows cursor X position, snaps to nearest data point Y.
- Uses `@visx/tooltip` with `TooltipWithBounds` (auto-positions to stay in viewport).
- Content:

```
+-----------------------------+
| [color dot] BUN <= 12       |  14px/600
| eGFR: 48 mL/min             |  14px/400
| at 60 months (5 years)      |  12px/400 muted
+-----------------------------+
```

- Background: white. Border: 1px #E0E0E0. Border-radius: 8px. Shadow: shadow-md. Padding: 8px 12px.
- Pointer caret: 6px CSS triangle, points toward data point.
- Transition: opacity 150ms ease.
- Only ONE tooltip visible at a time.
- On mouse leave: tooltip fades out (150ms).

**Mobile (tap):**
- On tap within 20px of a data point: show tooltip.
- Tooltip positions above the data point (or below if near top edge).
- Persists until user taps elsewhere on chart or outside chart.
- Same content and styling as desktop.
- Tap on empty chart area: dismiss tooltip.
- Uses `@visx/event` for touch coordinate extraction.

**Crosshair (desktop only):**
- Vertical dashed line (#E0E0E0, 1px, dasharray 4,2) follows cursor X position.
- Horizontal dashed line from Y axis to cursor position.
- Circles (4px radius, white fill, 2px stroke in trajectory color) at intersection points on each line.
- Visx: `Crosshair` pattern using `Line` + `Circle` elements.

### Stat Card Interaction

- Tapping/clicking a stat card highlights its corresponding trajectory line.
- Highlighted line: opacity 1.0, strokeWidth +1px, drop shadow glow (filter: drop-shadow).
- Other lines: opacity 0.3.
- Phase bands and dialysis threshold: unaffected.
- Tapping the same card again: deselects, all lines return to default.
- Multiple selection: not supported (single selection only).
- Keyboard: Enter/Space on focused card to select. Escape to deselect.

### Visx Component Stack (Variant A)

```
<ParentSize>
  <svg>
    <!-- z-order bottom to top -->
    <Group>  <!-- phase bands -->
      <Bar /> x4
      <Text /> x4 (phase labels)
    </Group>
    <GridRows />  <!-- horizontal grid lines -->
    <Line />  <!-- dialysis threshold -->
    <Text />  <!-- dialysis label -->
    <Group>  <!-- trajectory lines -->
      <LinePath /> x4
    </Group>
    <Group>  <!-- end-of-line labels -->
      <Text /> x4
    </Group>
    <Group>  <!-- interactive elements -->
      <Line />  <!-- vertical crosshair -->
      <Line />  <!-- horizontal crosshair -->
      <Circle /> x4  <!-- intersection dots -->
    </Group>
    <AxisBottom />
    <AxisLeft />
    <Bar />  <!-- invisible overlay for mouse/touch events -->
  </svg>
</ParentSize>
<TooltipWithBounds />  <!-- rendered outside SVG via portal -->
<ChartFootnote />  <!-- HTML below SVG -->
```

### Visx Dependencies (Variant A)

```
@visx/shape        -- LinePath, Bar, Line, Circle
@visx/scale        -- scaleLinear
@visx/axis         -- AxisBottom, AxisLeft
@visx/grid         -- GridRows
@visx/group        -- Group
@visx/tooltip      -- Tooltip, TooltipWithBounds, useTooltip
@visx/event        -- localPoint (mouse/touch coords)
@visx/responsive   -- ParentSize
@visx/curve        -- curveMonotoneX
@visx/text         -- Text
```

---

## 3. Variant B: Simplified Static Fallback

Reduced feature set for faster implementation or if POC reveals constraints.

### What is REMOVED vs. Variant A

| Feature | Variant A | Variant B |
|---------|-----------|-----------|
| Interactive tooltips | Yes (hover/tap) | **No** |
| Crosshair | Yes (desktop) | **No** |
| Stat card -> line highlight | Yes | **No** |
| Custom dash patterns | 4 types (solid, dashed, short-dash, dotted) | **2 types (solid, dashed only)** |
| Phase band fills | Colored transparent fills | **Horizontal ruled lines** |
| Line hover detection | Yes | **No** |
| Animations/transitions | Yes | **No** |

### What is KEPT

- True linear time axis with same scale and labels.
- All 4 trajectory lines (but simplified to 2 patterns).
- End-of-line labels with collision avoidance.
- Dialysis threshold line and label.
- Phase indicators (as lines, not fills).
- Chart title, subtitle, footnote.
- Y-axis, X-axis, grid lines.
- Responsive sizing.
- Accessible data table alternative.

### Simplified Line Styles

| Trajectory | Color | Pattern (Variant B) | strokeWidth |
|-----------|-------|-------------------|-------------|
| BUN <= 12 | #1D9E75 | solid | 3px (thicker for distinction) |
| BUN 13-17 | #378ADD | dashed `strokeDasharray="8,4"` | 2.5px |
| BUN 18-24 | #85B7EB | solid | 2px |
| No Treatment | #AAAAAA | dashed `strokeDasharray="8,4"` | 2px |

**Differentiation strategy (Variant B):** Color + thickness replaces pattern variety. BUN<=12 is thick solid green, No Treatment is thin dashed gray. The two are clearly distinguishable by color, thickness, and dash pattern. Middle trajectories (13-17 and 18-24) are distinguished by color and thickness.

### Phase Indicators (Variant B)

Instead of colored background fills, use horizontal reference lines:

```
  90|____________________________________
    |           Normal / Mild
  60|------------------------------------  <-- 1px dashed #E0E0E0
    |           Moderate
  30|------------------------------------  <-- 1px dashed #E0E0E0
    |           Severe
  15|====================================  <-- 2px dashed #D32F2F (dialysis)
    |           Dialysis Zone
   0|____________________________________
```

- Phase labels: positioned left, 11px/400 #888888.
- No background fills. Cleaner, higher contrast, faster to render.

### Stat Cards Carry All Detail

In Variant B, stat cards are the primary source of numeric information (no tooltips exist). Stat cards get additional content:

```
+------------------------------------------+
| [color dot] BUN <= 12        16px/600    |
|                                          |
| eGFR at 5 years:            14px/400    |
| 48 mL/min                    18px/700    |
|                                          |
| eGFR at 10 years:           14px/400    |
| 32 mL/min                    18px/700    |
|                                          |
| Monthly decline:             14px/400    |
| -0.28 mL/min/month           14px/400    |
|                                          |
| Dialysis: Not projected      14px/500    |
+------------------------------------------+
```

Additional field "Monthly decline" provides the data that tooltips would have shown at intermediate time points.

### Visx Component Stack (Variant B)

```
<ParentSize>
  <svg>
    <Group>  <!-- phase reference lines -->
      <Line /> x3  (at eGFR 60, 30, 15)
      <Text /> x4  (phase labels)
    </Group>
    <GridRows />
    <Group>  <!-- trajectory lines -->
      <LinePath /> x4
    </Group>
    <Group>  <!-- end-of-line labels -->
      <Text /> x4
    </Group>
    <AxisBottom />
    <AxisLeft />
  </svg>
</ParentSize>
<ChartFootnote />
```

### Visx Dependencies (Variant B, reduced)

```
@visx/shape        -- LinePath, Line
@visx/scale        -- scaleLinear
@visx/axis         -- AxisBottom, AxisLeft
@visx/grid         -- GridRows
@visx/group        -- Group
@visx/responsive   -- ParentSize
@visx/curve        -- curveMonotoneX
@visx/text         -- Text
```

No tooltip, event, or crosshair packages needed.

---

## 4. Responsive Behavior

### Chart Dimensions

| Breakpoint | SVG Width | SVG Height | Margins (T/R/B/L) |
|------------|-----------|-----------|-------------------|
| Mobile (<768px) | 100% - 32px | 200px | 16 / 48 / 40 / 40 |
| Tablet (768-1024px) | 100% - 48px | 280px | 16 / 64 / 40 / 48 |
| Desktop (>1024px) | min(960, 100%-64) px | 340px | 20 / 80 / 48 / 56 |

Right margin is large to accommodate end-of-line labels.

### Mobile-Specific Behavior

- **X-axis labels:** Show every other label to prevent overlap.
- **Y-axis label:** Hidden on mobile (axis has no rotated title). Axis tick labels remain.
- **End-of-line labels:** Shift to below chart if they would be clipped by viewport edge. Alternatively, render as a legend below chart:

```
Legend (mobile, below chart if labels clip):
--- [green solid] BUN<=12: 48
--- [blue dashed] 13-17: 35
--- [light blue] 18-24: 22
... [gray dotted] None: 18
```

- **Phase band labels:** Hidden on mobile in Variant A (bands visible by color). Shown in Variant B (reference lines need labels).
- **Tooltip (Variant A):** Tap-activated, positioned above data point, dismisses on tap elsewhere.
- **No horizontal scroll.** Chart scales to fit viewport width. If content is too compressed below 320px, show a message: "Rotate your phone for a better view."

### Tablet-Specific Behavior

- Full feature set, same as desktop.
- Chart height slightly reduced (280px vs 340px).
- End-of-line labels always visible (sufficient right margin).

### Orientation Change

- `ParentSize` handles re-render automatically.
- On orientation change from portrait to landscape on mobile: chart gets more horizontal space, no special handling needed.

---

## 5. Data Model

The chart component receives data from the API prediction response, transformed to this shape:

```typescript
interface ChartData {
  trajectories: TrajectoryData[];
  phases: PhaseDefinition[];
  dialysisThreshold: number;      // 15
  confidenceTier: 1 | 2;
  baselineEgfr: number;           // Starting eGFR value
}

interface TrajectoryData {
  id: "bun_lte_12" | "bun_13_17" | "bun_18_24" | "no_treatment";
  label: string;
  color: string;
  pattern: "solid" | "dashed" | "short-dash" | "dotted";
  strokeWidth: number;
  points: DataPoint[];
  finalEgfr: number;
  dialysisAge: number | null;     // Months to dialysis, null if never
}

interface DataPoint {
  monthsFromBaseline: number;     // 0, 1, 2, 3, 6, 12, 24, ... 120
  egfr: number;
}

interface PhaseDefinition {
  label: string;
  yStart: number;                 // eGFR top of band
  yEnd: number;                   // eGFR bottom of band
  fillColor: string;
  opacity: number;
}
```

**Data Point Distribution:**
- Months 0-12: monthly (13 points per trajectory).
- Months 12-120: every 6 months or 12 months (API determines).
- Total expected: 20-25 data points per trajectory.
- Points are connected by `curveMonotoneX` for smooth interpolation.

---

## 6. Accessibility

### Both Variants

**Screen Reader Data Table:**
- A visually hidden `<table>` (CSS `sr-only`) is rendered immediately after the SVG.
- Contains all trajectory data in tabular format.
- `<caption>`: "Predicted eGFR values over 10 years for 4 treatment scenarios."
- Columns: Time, BUN<=12, BUN 13-17, BUN 18-24, No Treatment.
- Rows: each time point with eGFR values.

**SVG Accessibility:**
- `<svg role="img" aria-label="eGFR trajectory chart showing 4 predicted kidney function scenarios over 10 years">`.
- `<title>` element inside SVG for some screen readers.
- `<desc>` element: "Chart shows predicted eGFR values for four BUN management scenarios. Best outcome (BUN <= 12) maintains eGFR at {value}. Worst outcome (no treatment) declines to {value}."
- All decorative elements: `aria-hidden="true"`.

**Color + Pattern:**
- Every trajectory is distinguishable by line pattern (solid, dashed, short-dash, dotted) in addition to color (WCAG 1.4.1).
- End-of-line labels provide text identification.
- Stat cards below chart provide full numeric detail.

**Keyboard (Variant A):**
- Stat cards are focusable (`tabindex="0"`), navigable by Tab.
- Enter/Space selects a card (highlights line).
- Escape deselects.
- Chart SVG itself is NOT keyboard navigable (data table provides the accessible alternative).

**Keyboard (Variant B):**
- Stat cards are focusable for screen reader navigation but not interactive.
- Tab order: chart (announced by aria-label) -> stat cards -> disclaimer.

**Reduced Motion:**
- `prefers-reduced-motion: reduce`: disable tooltip transitions, crosshair animations, stat card highlight animations.
- Lines render statically (no draw-in animation).

---

## 7. Decision Criteria

Variant selection depends on Harshit's Visx POC results. Criteria:

| Requirement | Must Work for Variant A | Fallback (Variant B) |
|------------|------------------------|---------------------|
| Custom `strokeDasharray` on `LinePath` | All 4 patterns render correctly | 2 patterns only |
| Phase band `rect` with partial opacity | Colored fills visible, text readable | Replace with reference lines |
| `@visx/tooltip` with touch events | Tooltip positions correctly on tap | No tooltips |
| `localPoint` touch coordinate accuracy | Within 20px of data point | Not needed |
| End-of-line label collision avoidance | Programmatic 15px separation | Same requirement |
| `ParentSize` responsive re-render | Correct on orientation change | Same requirement |
| Bundle size acceptable | All Visx packages < 50KB gzip | Reduced package set < 25KB gzip |
| Render performance (4 lines x 25 points) | < 16ms paint on mid-range mobile | Same requirement |

**If ANY of the first 4 requirements fails in POC: fall back to Variant B.**

**Timeline:** POC results expected from Harshit during parallel drafting. Variant selection at Step 6 (Peer Review).
