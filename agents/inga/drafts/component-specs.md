# KidneyHood Component Specifications

**Author:** Inga (Senior UX/UI Designer)
**Version:** 2.0 -- Lean Launch MVP
**Date:** 2026-03-25
**For:** Harshit (Frontend Developer)
**Ticket:** LKID-33

Every UI component for the KidneyHood lean launch (21 components across 5 groups). Each spec includes a TypeScript props interface, responsive behavior, and accessibility requirements. Implement using shadcn/ui primitives + Tailwind CSS + Visx where noted.

**Source of truth:** `lean-launch-mvp-prd.md` (approved) + `design-sprint-meeting-1.md` (component inventory)

---

## Table of Contents

1. [Shared Types](#shared-types)
2. [Auth Components (3)](#1-auth-components)
3. [Form Components (4)](#2-form-components)
4. [Chart Components (10)](#3-chart-components)
5. [Results Components (3)](#4-results-components)
6. [Layout Components (1)](#5-layout-components)
7. [Deferred to Phase 2](#deferred-to-phase-2)

---

## Shared Types

These types are derived from the `POST /predict` API response and are referenced throughout the component specs.

```typescript
/** POST /predict request body (flat object, no oneOf, no arrays) */
interface PredictionInput {
  name: string;
  email: string;             // Pre-filled from Clerk session (read-only)
  age: number;               // 18-120, integer
  bun: number;               // 5-150, integer, mg/dL
  creatinine: number;        // 0.3-15.0, step 0.1, mg/dL
  potassium: number;         // 2.0-8.0, step 0.1, mEq/L
}

/** POST /predict response */
interface PredictionResponse {
  trajectories: TrajectoryData[];   // Always 4 trajectories
  phases: PhaseDefinition[];        // CKD phase band definitions
  dialysis_threshold: number;       // eGFR value (15)
  summary: string;                  // Human-readable summary sentence
}

/** Single trajectory dataset */
interface TrajectoryData {
  id: string;                       // "bun_lte_12" | "bun_13_17" | "bun_18_24" | "no_treatment"
  label: string;                    // Display label, e.g. "BUN ≤ 12"
  color: string;                    // Hex color
  pattern: "solid" | "dashed" | "short-dash" | "dotted";
  stroke_width: number;             // 2.0 or 2.5
  dash_array?: string;              // SVG dash-array, e.g. "8,4"
  points: DataPoint[];
  final_egfr: number;               // End-of-line eGFR value
  dialysis_age?: number | null;     // Months to dialysis, or null
}

/** Single data point on a trajectory */
interface DataPoint {
  months_from_baseline: number;
  egfr: number;
}

/** CKD phase band definition */
interface PhaseDefinition {
  label: string;                    // "Normal/Mild", "Moderate", "Severe", "Dialysis"
  egfr_min: number;
  egfr_max: number;
  color: string;                    // Fill color hex
  opacity: number;
}

/** Field-level validation error */
interface FieldError {
  field: string;                    // Field name matching PredictionInput key
  message: string;                  // Human-readable error
}
```

---

## 1. Auth Components

### 1.1 MagicLinkForm

Email-only entry form for requesting a magic link. Single field, single CTA. This is the bot gate and email capture step.

**Props:**

```typescript
interface MagicLinkFormProps {
  onSubmit: (email: string) => void;
  isLoading: boolean;
  error?: string;                   // Inline error, e.g. "Invalid email format"
}
```

**States:**

| State | Button | Email Field | Error |
|-------|--------|-------------|-------|
| Default | Primary, enabled | Empty, placeholder "your@email.com" | Hidden |
| Validating | Primary, spinner inside, `aria-busy="true"` | Filled, disabled | Hidden |
| Error | Primary, enabled | 2px `--destructive` border, #FDECEA bg | Visible below field, 14px `--destructive` |

**Layout:**
- Max-width: 400px, centered on all breakpoints.
- Email input: 48px height, `rounded-md`, 12px padding.
- Submit button ("Send me a sign-in link"): 48px height, full-width, primary style.
- Heading: "Get Started" -- 20px/600.
- Subtext: "Enter your email to receive a secure sign-in link." -- 16px/400.
- Field gap: 16px. Button margin-top: 24px.

**Responsive:**
- Mobile: 16px horizontal padding.
- Tablet/Desktop: centered card within max-width 400px.

**Accessibility:**
- `<form role="form" aria-label="Sign in with email">`.
- Email input: `type="email"`, `autocomplete="email"`, `inputmode="email"`.
- `aria-invalid="true"` on email field when error is present.
- `aria-describedby` pointing to error text element.
- On submit: focus moves to MagicLinkSent screen.

---

### 1.2 MagicLinkSent

Confirmation screen after magic link is sent. Includes deep-link buttons to email apps (critical for 60+ users) and a resend countdown.

**Props:**

```typescript
interface MagicLinkSentProps {
  email: string;                    // Partially masked, e.g. "j***@email.com"
  onResend: () => void;
  isResending: boolean;
}
```

**States:**

| State | Resend Button | Deep-Link Buttons |
|-------|---------------|-------------------|
| Cooldown (0-60s) | Disabled, countdown text "(available in Xs)" | Enabled, secondary style |
| Ready | Enabled, secondary style | Enabled, secondary style |
| Resending | Spinner, `aria-busy="true"` | Enabled |

**Layout:**

```
[Email icon]                          48px

Check your email!                     20px/600

We sent a sign-in link to            16px/400
j***@email.com                        16px/600 (masked)

The link expires in 15 min.           14px/400 muted

+------------------------------------+
| [Gmail icon] Open Gmail            |  48px, secondary btn
+------------------------------------+
+------------------------------------+
| [Outlook icon] Open Outlook        |  48px, secondary btn
+------------------------------------+

[Resend link]                         48px, disabled 60s
(available in 58 seconds)             14px/400 muted

Didn't receive it?                    14px/400 muted
Check your spam folder.
```

- Max-width: 400px, centered on all breakpoints.
- Deep-link URLs: `https://mail.google.com/mail/`, `https://outlook.live.com/mail/`.
- Deep-link buttons: 48px height, secondary style, full-width, 8px gap between.
- Resend countdown: 60s timer, visible below button.

**Responsive:**
- Same layout on all breakpoints (max-width 400px centered).

**Accessibility:**
- Resend button: `aria-disabled="true"` during cooldown (not HTML `disabled`, preserves focus).
- Countdown text in `aria-label`: "Resend link, available in X seconds".
- Deep-link buttons: `target="_blank"`, `rel="noopener noreferrer"`.
- On resend: `role="alert"` toast announces "Link sent".

---

### 1.3 VerifyHandler

Invisible handler for magic link token verification. No visible UI -- redirects on success, shows error on failure.

**Props:**

```typescript
interface VerifyHandlerProps {
  token: string;                    // From URL query param ?token=...
}
```

**Behavior:**
- On mount: call Clerk token verification.
- Success: auto-redirect to `/predict`. Zero extra clicks.
- Failure (expired/invalid): redirect to `/auth` with expired-link view ("This link has expired" + "Send a new link" button).

**Layout:**
- No visible UI during verification (redirect-only).
- On error: renders expired-link screen (see Meeting 1, Screen D).

**Responsive:** N/A (no visible UI during happy path).

**Accessibility:**
- `aria-busy="true"` on container during verification.
- `role="alert"` on error message.
- Error screen: "Send a new link" button receives focus automatically.

---

## 2. Form Components

### 2.1 PredictionForm

Container form for the prediction input. Manages layout, validation, error summary, and submission for name + 4 lab value fields. Email is pre-filled and read-only from Clerk session.

**Props:**

```typescript
interface PredictionFormProps {
  email: string;                    // Pre-filled from Clerk session
  onSubmit: (data: PredictionInput) => void;
  isLoading: boolean;
  serverErrors?: FieldError[];      // Server-side validation errors
}
```

**States:**

| State | Submit Button | Fields | Error Summary |
|-------|---------------|--------|---------------|
| Default | Primary, enabled ("See My Prediction") | Editable | Hidden |
| Validating | Spinner, `aria-busy="true"` | Disabled | Hidden |
| Client Error | Primary, enabled | Error fields highlighted | Visible, `role="alert"` |
| Server Error | Primary, enabled | Error fields highlighted | Visible, `role="alert"` |

**Layout:**

```
MOBILE (single column)                   DESKTOP (max 640px centered)
+----------------------------------+     +----------------------------------+
|  Enter Your Lab Values           | 20s |  Enter Your Lab Values           |
|                                  |     |                                  |
|  [Error Summary Banner]         |     |  [Error Summary Banner]          |
|                                  |     |                                  |
|  Email (read-only)              |     |  +--------------+--------------+ |
|  Name *                          |     |  | Email (RO)   | Name *       | | 2-col
|  Age *                           |     |  +--------------+--------------+ |
|  BUN *                           |     |                                  |
|  Creatinine *                    |     |  +--------------+--------------+ |
|  Potassium *                     |     |  | Age *        | BUN *        | | 2-col
|                                  |     |  +--------------+--------------+ |
|  [See My Prediction]             | 56h |                                  |
+----------------------------------+     |  +--------------+--------------+ |
                                         |  | Creatinine * | Potassium *  | | 2-col
                                         |  +--------------+--------------+ |
                                         |                                  |
                                         |  [See My Prediction]             | 56h
                                         +----------------------------------+
```

- Max-width: 640px, centered.
- Heading: "Enter Your Lab Values" -- 20px/600.
- Submit button: 56px height, full-width, primary color, margin-top 24px.
- Field gap: 12px (mobile), 16px (desktop).

**Responsive:**
- Mobile (<768px): single column, all fields stacked.
- Desktop (>=768px): 2-column grid (max 640px). Pairs: Email+Name, Age+BUN, Creatinine+Potassium.

**Validation (client-side, on submit):**
- All fields except email are required.
- Age: integer, 18-120.
- BUN: integer, 5-150.
- Creatinine: float, 0.3-15.0.
- Potassium: float, 2.0-8.0.
- On error: scroll to first error field, error summary banner at top.

**Accessibility:**
- `<form>` element wrapping all fields.
- Error summary: `role="alert"`, `aria-live="assertive"`, focus-on-mount.
- Scroll-to-first-error on validation failure.
- All fields use `<label htmlFor>` associations.

---

### 2.2 NumberInput

Numeric form field with label, unit indicator, helper text, and inline error state. Used for age, BUN, creatinine, and potassium.

**Props:**

```typescript
interface NumberInputProps {
  id: string;                       // Unique ID for label association
  name: string;                     // API field name
  label: string;                    // Visible label text
  unit: string;                     // e.g. "mg/dL", "years"
  helperText?: string;              // e.g. "Normal range: 7-20 mg/dL"
  placeholder?: string;
  min: number;
  max: number;
  step?: number;                    // Default: 1 (int), 0.1 (float)
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string;                   // Inline error message
  disabled?: boolean;
  required?: boolean;
}
```

**States:**

| State | Border | Background | Label Color | Helper/Error |
|-------|--------|-----------|-------------|-------------|
| Default (empty) | 1px `--border` (#E0E0E0) | `--background` (#FFF) | `--foreground` (#1A1A1A) | Helper visible, 14px `--muted-foreground` |
| Focused | 2px `--secondary` (#378ADD) | `--background` | `--foreground` | Helper visible |
| Filled (valid) | 1px `--border` | `--background` | `--foreground` | Helper visible |
| Error | 2px `--destructive` (#D32F2F) | #FDECEA | `--foreground` | Error replaces helper, 14px `--destructive` |
| Disabled | 1px `--border` | `--card` (#F8F9FA) | `--muted-foreground` (#666) | Helper dimmed |
| Hover | 1px `--neutral` (#AAA) | `--background` | `--foreground` | Helper visible |

**Layout:**

```
[Label text] [* if required]
+-----------------------------------+ [unit]
|  [placeholder / value]             |   48px height
+-----------------------------------+
[helper text OR error text]
```

- Desktop: unit inline right of input, 8px gap.
- Mobile: unit below input, inline with helper text: "[unit] -- [helper text]".
- Input height: 48px (`h-12`), border-radius: 6px (`rounded-md`), padding: 12px (`px-3`).
- Label margin-bottom: 6px. Helper/error margin-top: 4px.
- Font: input text 16px (prevents iOS zoom on focus).
- 44px minimum touch target on all interactive elements.

**Instances:**

| Field | Label | Unit | Min | Max | Step | Helper Text | inputmode |
|-------|-------|------|-----|-----|------|-------------|-----------|
| age | Age | years | 18 | 120 | 1 | -- | `numeric` |
| bun | BUN | mg/dL | 5 | 150 | 1 | Normal range: 7-20 mg/dL | `numeric` |
| creatinine | Creatinine | mg/dL | 0.3 | 15.0 | 0.1 | Normal range: 0.6-1.2 mg/dL | `decimal` |
| potassium | Potassium | mEq/L | 2.0 | 8.0 | 0.1 | Normal range: 3.5-5.0 mEq/L | `decimal` |

**Accessibility:**
- `<label htmlFor={id}>` wraps label text.
- `aria-describedby` points to helper/error text element.
- `aria-invalid="true"` when in error state.
- `aria-required="true"` for required fields.
- `inputmode="decimal"` for float fields, `inputmode="numeric"` for integer fields.
- Error text: `role="alert"` on error container (announces on state change).

---

### 2.3 NameInput

Text input for patient name. Same visual pattern as NumberInput but for text.

**Props:**

```typescript
interface NameInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}
```

**States:** Same state table as NumberInput (Default, Focused, Filled, Error, Disabled, Hover).

**Layout:**
- Same 48px height, 6px rounded-md, 12px padding as NumberInput.
- Label: "Name", no unit, no helper text.
- Full-width on all breakpoints (within form grid cell).

**Accessibility:**
- `autocomplete="name"`.
- `<label htmlFor={id}>`.
- `aria-invalid="true"` on error.
- `aria-required="true"`.

---

### 2.4 EmailInput

Read-only email field, pre-filled from Clerk session. Not editable by the user.

**Props:**

```typescript
interface EmailInputProps {
  email: string;                    // Pre-filled from Clerk session
}
```

**States:**

| State | Border | Background | Text | Icon |
|-------|--------|-----------|------|------|
| Read-only (always) | 1px `--border` | `--card` (#F8F9FA) | `--muted-foreground` (#666) | Lock icon, 16px, right-aligned |

**Layout:**
- Same 48px height, 6px rounded-md as other inputs.
- Lock icon inside input, right-aligned, 16px.
- Helper text below: "Pre-filled from sign-in" -- 14px `--muted-foreground`.
- Email text may be partially masked: "j***@email.com" or shown in full (match Clerk session).

**Responsive:**
- Mobile: full-width, single column.
- Desktop: left cell of first 2-col row in PredictionForm.

**Accessibility:**
- `<input readonly>` with `aria-readonly="true"`.
- `<label htmlFor>`: "Email".
- `aria-describedby` pointing to helper text.
- Not included in tab order for form submission (read-only, no action needed).

---

## 3. Chart Components

### 3.1 PredictionChart

Main Visx chart container. Renders the SVG with axes, trajectory lines, phase bands, dialysis threshold, tooltips, crosshair, and end-of-line labels. This is the core product visualization.

**Props:**

```typescript
interface PredictionChartProps {
  data: PredictionResponse;         // Full API response
  width: number;                    // From ParentSize wrapper
  height: number;                   // From ParentSize wrapper
  onDataPointHover?: (point: DataPoint | null) => void;
  onDataPointTap?: (point: DataPoint | null) => void;
}
```

**Dimensions (responsive via ParentSize):**

| Breakpoint | Width | Height | Margins (top, right, bottom, left) |
|------------|-------|--------|-----|
| Mobile (<768px) | 100% - 32px | 200px | 16, 48, 40, 40 |
| Tablet (768-1024px) | 100% - 48px | 280px | 16, 64, 40, 48 |
| Desktop (>1024px) | min(960px, 100%-64px) | 340px | 20, 80, 48, 56 |

Right margin accommodates end-of-line labels.

**X-Axis (linear time scale):**
- Domain: [0, 120] months.
- Ticks: 0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120.
- Labels: "0", "1yr", "2yr", ... "10yr".
- Mobile: show every other label (0, 2yr, 4yr, 6yr, 8yr, 10yr).
- Font: 12px/400 `--muted-foreground`. Axis line: 1px `--border`.

**Y-Axis:**
- Domain: [0, max(90, maxEgfr + 10)].
- Ticks: 0, 15, 30, 45, 60, 75, 90.
- 15 always shown (dialysis threshold alignment).
- Label: "eGFR (mL/min/1.73m²)" rotated -90deg.
- Font: 12px/400 `--muted-foreground`.

**Accessibility:**
- `<svg role="img" aria-label="eGFR trajectory chart showing 4 predicted scenarios over 10 years">`.
- `<title>` and `<desc>` elements inside SVG.
- AccessibleDataTable provides the screen reader alternative (see 3.9).

---

### 3.2 TrajectoryLines

Renders all 4 trajectory lines via Visx `LinePath`. Decorative -- the accessible data table is the screen reader alternative.

**Props:**

```typescript
interface TrajectoryLinesProps {
  trajectories: TrajectoryData[];
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  highlightId?: string;             // Active trajectory on hover/tap
}
```

**Line Styles:**

| Trajectory | Color | Pattern | strokeWidth | Dash Array |
|-----------|-------|---------|-------------|------------|
| BUN ≤ 12 | #1D9E75 (`--primary`) | solid | 2.5 | -- |
| BUN 13-17 | #378ADD (`--secondary`) | dashed | 2.5 | 8,4 |
| BUN 18-24 | #85B7EB (`--secondary-light`) | short-dash | 2.0 | 4,4 |
| No Treatment | #AAAAAA (`--neutral`) | dotted | 2.0 | 2,4 |

**Interaction States:**

| State | Opacity | strokeWidth | Extra |
|-------|---------|-------------|-------|
| Default | 1.0 | per above | -- |
| Highlighted (hover/tap) | 1.0 | +1px | drop shadow glow |
| Dimmed (other line highlighted) | 0.3 | per above | -- |
| Hovered | 1.0 | +0.5px | cursor: pointer |

**Responsive:** Scales adapt automatically via ParentSize wrapper.

**Accessibility:** `aria-hidden="true"` (data table is the accessible alternative).

---

### 3.3 PhaseBands

Horizontal background bands indicating CKD phase regions. Decorative.

**Props:**

```typescript
interface PhaseBandsProps {
  phases: PhaseDefinition[];
  yScale: ScaleLinear<number, number>;
  width: number;
}
```

**Phase Definitions:**

| Phase | eGFR Range | Fill Color | Opacity | Label |
|-------|-----------|-----------|---------|-------|
| Phase 1 (Normal/Mild) | 60-90+ | #E8F5F0 (`--primary-light`) | 0.3 | Top-right, 11px/400 #888 |
| Phase 2 (Moderate) | 30-60 | #FFF8E1 | 0.3 | Top-right, 11px/400 #888 |
| Phase 3 (Severe) | 15-30 | #FDECEA | 0.2 | Top-right, 11px/400 #888 |
| Phase 4 (Dialysis) | 0-15 | #F5F5F5 | 0.3 | Top-right, 11px/400 #888 |

**Layout:**
- Full width of chart area. z-index: behind lines, above grid.
- Label: 11px/400 #888888, 8px from right edge, 4px from top of band.

**Responsive:** Full chart width, scales with ParentSize.

**Accessibility:** `aria-hidden="true"`.

---

### 3.4 DialysisThreshold

Horizontal reference line at eGFR = 15. Visual warning indicator.

**Props:**

```typescript
interface DialysisThresholdProps {
  yScale: ScaleLinear<number, number>;
  width: number;
  threshold: number;                // eGFR value, default 15
}
```

**Visual:**
- Dashed line: 2px `--destructive` (#D32F2F), dash-array: 6,3.
- Label: "Dialysis threshold" -- 11px/600 `--destructive`, right-aligned, 4px above line.
- z-index: above phase bands, below trajectory lines.

**Responsive:** Full chart width, scales with ParentSize.

**Accessibility:** `aria-hidden="true"`. Label text rendered in SVG `<text>`.

---

### 3.5 Tooltips

Tooltip on hover (desktop) or tap (mobile). Shows trajectory details at the active data point.

**Props:**

```typescript
interface TooltipsProps {
  data: TrajectoryData[];
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  activePoint?: {
    trajectory: TrajectoryData;
    point: DataPoint;
  } | null;
}
```

**Layout:**
- White card: 1px `--border`, 8px border-radius, `shadow-md`.
- Padding: 8px 12px. Max-width: 180px.
- Pointer/caret: 6px triangle pointing to data point.
- Content:
  ```
  [color dot] BUN ≤ 12              14px/600
  eGFR: 48 mL/min                   14px/400
  at 60 months (5 years)            12px/400 muted
  ```

**Behavior:**
- Desktop: follows cursor, 8px offset. Appears on line hover.
- Mobile: fixed position above tap point. Appears on tap, dismisses on tap elsewhere.
- z-index: above all chart elements.
- Transition: opacity 150ms ease.

**Responsive:**
- Desktop: follow cursor.
- Mobile: positioned above tap point.

**Accessibility:** Tooltip content readable by screen readers via `role="tooltip"`.

---

### 3.6 Crosshair

Vertical + horizontal crosshair lines that follow the cursor on desktop. Helps users read precise values from the chart.

**Props:**

```typescript
interface CrosshairProps {
  x: number;
  y: number;
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
}
```

**Visual:**
- Vertical line: 1px `--border` (#E0E0E0), full chart height.
- Horizontal line: 1px `--border`, full chart width.
- Intersection dot: 4px circle at cursor position.

**Responsive:**
- Desktop only. Hidden on mobile (touch interactions use tap-based tooltips instead).

**Accessibility:** `aria-hidden="true"`.

---

### 3.7 ChartAxes

X and Y axes with tick marks and labels. Rendered via Visx `AxisBottom` and `AxisLeft`.

**Props:**

```typescript
interface ChartAxesProps {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  width: number;
  height: number;
}
```

**X-Axis:**
- Ticks at 12-month intervals (0 through 120).
- Labels: "0", "1yr", "2yr", ... "10yr".
- Mobile: every other label shown (0, 2yr, 4yr, 6yr, 8yr, 10yr).
- Desktop: all labels shown.
- Font: 12px/400 #888888.

**Y-Axis:**
- Ticks: 0, 15, 30, 45, 60, 75, 90.
- Font: 12px/400 #888888.
- Axis title: "eGFR (mL/min/1.73m²)" -- 12px/500 #666666, rotated -90deg.

**Responsive:**
- Mobile: every-other x-label to prevent overlap.
- Desktop: all labels shown.

**Accessibility:** Axis text rendered in SVG `<text>` elements (readable by SVG-aware screen readers, but data table is the primary accessible alternative).

---

### 3.8 EndOfLineLabels

Text labels at the end of each trajectory line, showing the scenario name. Positioned at the right edge of the chart.

**Props:**

```typescript
interface EndOfLineLabelsProps {
  trajectories: TrajectoryData[];
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
}
```

**Visual:**
- Font: 12px/600, color matches trajectory line color.
- Position: right edge of chart area, aligned vertically with the trajectory's final data point.
- Collision avoidance: minimum 15px vertical separation between labels. If labels overlap, shift down with leader lines.

**Responsive:**
- Desktop: labels positioned in right margin of chart.
- Mobile: labels shift below chart if clipped by viewport.

**Accessibility:** `aria-hidden="true"` (data table is the accessible alternative).

---

### 3.9 AccessibleDataTable

Screen-reader-only data table providing full chart data in tabular format. Visually hidden but fully accessible.

**Props:**

```typescript
interface AccessibleDataTableProps {
  trajectories: TrajectoryData[];
}
```

**Renders:**

```html
<table class="sr-only" aria-label="eGFR trajectory data">
  <caption>Predicted eGFR values over 10 years for 4 scenarios</caption>
  <thead>
    <tr>
      <th scope="col">Time</th>
      <th scope="col">BUN ≤ 12</th>
      <th scope="col">BUN 13-17</th>
      <th scope="col">BUN 18-24</th>
      <th scope="col">No Treatment</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Baseline</td><td>65</td><td>65</td><td>65</td><td>65</td></tr>
    <tr><td>1 year</td><td>60</td><td>58</td><td>55</td><td>50</td></tr>
    <!-- ... all time points -->
  </tbody>
</table>
```

- Visually hidden with `sr-only` (Tailwind) but accessible to screen readers.
- Placed immediately after the SVG chart element in the DOM.
- Includes all time points and all 4 trajectories.

**Responsive:** N/A (visually hidden on all breakpoints).

**Accessibility:**
- `<table>` with `<caption>`, `<th scope="col">`.
- Full tabular data -- no truncation.
- This is the primary accessible alternative to the visual chart.

---

### 3.10 LoadingSkeleton

Placeholder content during the `/predict` API call. Shows skeleton chart and button while results load.

**Props:**

```typescript
interface LoadingSkeletonProps {
  variant: "chart" | "button";
}
```

**Variants:**

| Variant | Dimensions | Shape |
|---------|-----------|-------|
| chart | 100% width, 200px (mobile) / 280px (tablet) / 340px (desktop) | Rounded rectangle, pulsing |
| button | 100% width (mobile) / auto (desktop), 56px height | Rounded rectangle, pulsing |

**Animation:**
- Background: linear gradient sweep left-to-right.
- Colors: `--card` (#F8F9FA) to `--border` (#E0E0E0) and back.
- Duration: 1.5s, infinite loop. Uses Tailwind `animate-pulse`.

**Layout:**
- Chart skeleton: replaces chart area during loading.
- Button skeleton: replaces PDF download button during loading.
- Heading visible: "Your Prediction" -- 20px/600.
- Subtext: "Calculating your prediction..." -- 16px/400 `--muted-foreground`.

**Responsive:**
- Chart skeleton: 200px (mobile), 280px (tablet), 340px (desktop).
- Button skeleton: full-width mobile, auto-width desktop.

**Accessibility:**
- `aria-busy="true"` on parent results container.
- `aria-label="Loading prediction results"` on skeleton.

---

## 4. Results Components

### 4.1 ChartContainer

Wrapper around the chart, summary sentence, PDF button, and footnote. Provides consistent spacing and max-width.

**Props:**

```typescript
interface ChartContainerProps {
  children: React.ReactNode;        // PredictionChart + PDFDownloadButton + footnote
}
```

**Layout:**

```
+----------------------------------------------+
|  Your Prediction                        20s  |
|                                              |
|  Here is how your kidney function may        |
|  change over the next 10 years under         |
|  four scenarios.                        16r  |
|                                              |
|  +------------------------------------------+|
|  |  [PredictionChart]                       ||
|  +------------------------------------------+|
|  Footnote (12px italic muted)                |
|                                              |
|  +------------------------------------------+|
|  | [PDF icon] Download Your Results (PDF)   ||
|  +------------------------------------------+|
+----------------------------------------------+
```

- Max-width: 960px, centered.
- Padding: 16px (mobile), 24px (tablet), 32px (desktop).
- Heading: "Your Prediction" -- 20px/600.
- Summary sentence: 16px/400, from `PredictionResponse.summary`.
- Footnote: "Data points are plotted at actual time intervals. Early measurements are more frequent." -- 12px/400 #888888, italic. 8px below chart.

**Responsive:**
- Mobile: 16px padding, full-width.
- Tablet: 24px padding, full-width.
- Desktop: 32px padding, max-width 960px centered.

**Accessibility:**
- `<section aria-label="Your kidney health prediction">`.

---

### 4.2 PDFDownloadButton

Primary CTA to download prediction results as PDF. Triggers `POST /predict/pdf` (server-side Playwright render).

**Props:**

```typescript
interface PDFDownloadButtonProps {
  predictionInput: PredictionInput;  // Re-sent to /predict/pdf (stateless)
  isLoading: boolean;
  error?: string;                    // "Download failed. Try again."
}
```

**States:**

| State | Background | Text | Icon | Extra |
|-------|-----------|------|------|-------|
| Default | `--primary` (#1D9E75) | "Download Your Results (PDF)" white 16px/600 | PDF icon, white, 20px | -- |
| Hover | darken 10% (#178A65) | white | PDF icon | -- |
| Loading | `--primary` 60% opacity | hidden | Spinner (white, 20px) centered | `aria-busy="true"` |
| Error | `--primary` | white | PDF icon | Inline error below: "Download failed. Try again." 14px `--destructive` |
| Disabled | `--neutral` (#AAA) | white 60% opacity | PDF icon dimmed | `aria-disabled` |

**Layout:**
- Height: 56px. Border-radius: 8px (`rounded-lg`).
- Full-width on mobile. Auto-width on desktop (inline).
- Margin-top: 16px from chart footnote.
- PDF icon: 20px, 8px margin-right from label text.

**Responsive:**
- Mobile: full-width, 56px height.
- Desktop: auto-width (content-driven), 56px height.

**Accessibility:**
- 44px minimum touch target (56px exceeds this).
- `aria-busy="true"` during download.
- Error message: `role="alert"`, inline below button.
- Button label includes "PDF" for context: "Download Your Results (PDF)".

---

### 4.3 DisclaimerBlock

Medical disclaimer. Sticky collapsed bar on mobile, inline full text on desktop. Required on all post-auth screens.

**Props:**

```typescript
interface DisclaimerBlockProps {
  isExpanded: boolean;              // Mobile expanded state
  onToggle: () => void;             // Mobile expand/collapse
}
```

**Mobile (sticky footer):**

```
Collapsed:
+----------------------------------+
| [i] Medical disclaimer    [^]   |  44px min-height
+----------------------------------+

Expanded (tap to toggle):
+----------------------------------+
| [i] Medical Disclaimer   [v]   |
|                                  |
| This tool provides educational   |
| predictions only and is not a    |
| substitute for professional      |
| medical advice. Always consult   |
| your healthcare provider...      |
+----------------------------------+
```

- Position: fixed bottom. z-index: 30.
- Background: white. Border-top: 1px `--border`. Box-shadow: `shadow-up`.
- Collapsed: 44px. Expanded: auto-height, max-height 40vh.
- Transition: max-height 300ms ease.
- Tap anywhere on bar to toggle.

**Desktop (inline):**

```
+----------------------------------------------+
| This tool provides educational predictions   |
| only and is not a substitute for             |
| professional medical advice. Always consult  |
| your healthcare provider before making       |
| treatment decisions.                         |
|                                              |
| [About] [Privacy] [Terms]                   |
+----------------------------------------------+
```

- Position: static, below content.
- Background: `--card` (#F8F9FA). Padding: 16px. Border-radius: 8px.
- Text: 14px/400 `--muted-foreground`.
- Margin-top: 32px.
- Footer links (About, Privacy, Terms): text links, 14px `--muted-foreground`.

**Responsive:**
- Mobile: sticky collapsed bar with expand/collapse.
- Desktop: inline full text with footer links.

**Accessibility:**
- `role="region"`, `aria-label="Medical disclaimer"`.
- Mobile: `aria-expanded` on toggle trigger, `aria-controls` pointing to content.
- Mobile collapsed: `aria-label="Medical disclaimer, tap to expand"`.

---

## 5. Layout Components

### 5.1 AppShell

Top-level layout wrapper providing Header + Footer (absorbed into DisclaimerBlock) + content area. Used on all pages.

**Props:**

```typescript
interface AppShellProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";    // 400px | 640px | 960px. Default: "lg"
}
```

**Layout:**

```
+--------------------------------------------------------------+
| HEADER (sticky top)                                          |
| [Logo]                                                       |
+--------------------------------------------------------------+
|                                                              |
|  +---------- max-width container ----------+                 |
|  |                                         |                 |
|  |  {children}                             |                 |
|  |                                         |                 |
|  +------------------------------------------+                 |
|                                                              |
+--------------------------------------------------------------+
| DISCLAIMER / FOOTER (see DisclaimerBlock)                    |
+--------------------------------------------------------------+
```

**Header:**

| Breakpoint | Height | Logo | Nav |
|------------|--------|------|-----|
| Mobile | 48px | 28px logo mark | None (lean launch: no accounts) |
| Tablet | 56px | Full logo | None |
| Desktop | 64px | Full logo | None |

- Background: white. Border-bottom: 1px `--border`.
- Position: sticky top. z-index: 40.
- No "Sign In" link, no navigation links (lean launch has no accounts).
- Logo: `<a href="/">` wrapping logo image.

**Content Area:**

| Breakpoint | Horizontal Padding | Max-width |
|------------|-------------------|-----------|
| Mobile | 16px | 100% |
| Tablet | 24px | 100% |
| Desktop | 32px | 960px (centered) |

**Footer:** Absorbed into DisclaimerBlock. No separate Footer component for lean launch.

**Responsive:**
- Header height adjusts per breakpoint.
- Content area max-width capped at 960px, centered.
- Horizontal padding increases with breakpoint.

**Accessibility:**
- `<header>` element with logo as `<a href="/" aria-label="KidneyHood home">`.
- `<main>` element wrapping content area.
- Skip-to-content link: visually hidden, first focusable element, targets `<main>`.

---

## Deferred to Phase 2

The following components from the original v1.0 spec are **not included** in the lean launch. They are preserved in the Phase 2 backlog for future development.

| Component | Reason for Deferral |
|-----------|---------------------|
| `RadioGroup` (SexRadioGroup) | Sex field removed -- required fields only (age, BUN, creatinine, potassium) |
| `Toggle` (SGLT2 inhibitor) | Optional/silent fields removed |
| `Select` (CKD diagnosis, proteinuria) | Optional/silent fields removed |
| `FormSection` (collapsible) | No progressive disclosure needed -- all 4 fields are required and visible |
| `SubmitButton` (standalone) | Absorbed into PredictionForm as an internal element |
| `StatCard` | Stat cards deferred -- summary sentence above chart replaces them |
| `StatCardGrid` | Deferred with StatCard |
| `ConfidenceBadge` | Single confidence level -- no tiers in lean launch |
| `UnlockPrompt` | No tiers, no upsell to enhanced prediction |
| `ChartFootnote` (standalone) | Absorbed into ChartContainer as inline text |
| `SavePrompt` (dialog) | No accounts, no saving -- lead gen model |
| `AuthBanner` | Simplified auth flow uses inline states, not banner notifications |
| `SignInForm` | No accounts -- MagicLinkForm handles email entry |
| `PageLayout` (v1) | Replaced by AppShell (Header + Footer combined) |
| `Header` (standalone) | Absorbed into AppShell |
| `Footer` (standalone) | Absorbed into DisclaimerBlock |
| `AccountDashboard` | No accounts |
| `HistoryPage` | No multi-visit tracking |
| `FormErrorSummary` (standalone) | Absorbed into PredictionForm as an internal element |

---

*End of component specifications. 21 components across 5 groups: Auth (3), Form (4), Chart (10), Results (3), Layout (1).*
