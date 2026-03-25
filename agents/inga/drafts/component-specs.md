# KidneyHood Component Specifications

**Author:** Inga (Senior UX/UI Designer)
**Version:** 1.0 -- Discovery Phase Draft
**Date:** 2026-03-25
**For:** Harshit (Frontend Developer)

Every UI component for the KidneyHood app. Each includes props interface, all visual states, variants, spacing, responsive behavior, and accessibility requirements. Implement using shadcn/ui primitives + Tailwind CSS + Visx where noted.

---

## Table of Contents

1. [Form Components](#1-form-components)
2. [Chart Components](#2-chart-components)
3. [Auth Components](#3-auth-components)
4. [Layout Components](#4-layout-components)

---

## 1. Form Components

### 1.1 NumberInput

Numeric form field with label, unit indicator, helper text, and inline error state. Used for all lab value entries.

**Props:**

```typescript
interface NumberInputProps {
  id: string;                    // Unique ID for label association
  name: string;                  // API field name
  label: string;                 // Visible label
  unit: string;                  // e.g., "mg/dL"
  helperText?: string;           // e.g., "Normal range: 7-20 mg/dL"
  placeholder?: string;
  min: number;
  max: number;
  step?: number;                 // Default: 1 (int), 0.1 (float)
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string;                // Inline error message
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
| Disabled | 1px `--border` | `--card` (#F8F9FA) | `--muted-foreground` (#888) | Helper dimmed |
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
- Field gap: 16px (tablet/desktop), 12px (mobile).
- Font: input text 16px (prevents iOS zoom on focus).

**Accessibility:**
- `<label htmlFor={id}>` wraps label text.
- `aria-describedby` points to helper/error text element.
- `aria-invalid="true"` when in error state.
- `aria-required="true"` for required fields.
- `inputmode="decimal"` for float fields, `inputmode="numeric"` for integer fields.
- Error announcement: `role="alert"` on error text container (announces on state change).

**Instances:**

| Field | Label | Unit | Min | Max | Step | Helper Text |
|-------|-------|------|-----|-----|------|-------------|
| age | Age | years | 18 | 120 | 1 | -- |
| bun | BUN | mg/dL | 5 | 150 | 1 | Normal range: 7-20 mg/dL |
| creatinine | Creatinine | mg/dL | 0.3 | 15.0 | 0.1 | Normal range: 0.6-1.2 mg/dL |
| potassium | Potassium | mEq/L | 2.0 | 8.0 | 0.1 | Normal range: 3.5-5.0 mEq/L |
| hemoglobin | Hemoglobin | g/dL | 3.0 | 20.0 | 0.1 | Normal range: 12-17 g/dL |
| glucose | Glucose | mg/dL | 30 | 600 | 1 | Normal range: 70-100 mg/dL |
| systolic_bp | Systolic Blood Pressure | mmHg | 70 | 250 | 1 | Normal: below 120 mmHg |
| proteinuria | Proteinuria | (select) | 0 | 10000 | 1 | -- |

---

### 1.2 RadioGroup

Radio button group. Used for sex selection.

**Props:**

```typescript
interface RadioGroupProps {
  id: string;
  name: string;
  label: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  orientation?: "vertical" | "horizontal"; // Default: vertical
}
```

**States:**

| State | Radio Circle | Label | Border |
|-------|-------------|-------|--------|
| Unselected | 20px circle, 2px `--border` | 16px `--foreground` | -- |
| Selected | 20px circle, 2px `--primary`, 10px filled `--primary` | 16px `--foreground` | -- |
| Focused | 20px circle + 2px blue focus ring | 16px `--foreground` | -- |
| Error | 20px circle, 2px `--destructive` | 16px `--foreground` | Error text below group |
| Disabled | 20px circle, 2px `--border`, fill `--card` | 16px `--muted-foreground` | -- |

**Layout:**
- Each radio option: 44px min height (touch target).
- Gap between options: 8px.
- Radio circle: 20px, margin-right: 12px from label.
- Vertical layout on all breakpoints for sex field.

**Instance (Sex):**
- Options: `[{value: "male", label: "Male"}, {value: "female", label: "Female"}, {value: "prefer_not_to_say", label: "Prefer not to say"}]`
- Required: true. Placed after Age, before BUN.

**Accessibility:**
- Uses shadcn/ui `RadioGroup` (Radix primitives, handles ARIA automatically).
- `role="radiogroup"` with `aria-label`.
- Arrow key navigation between options.
- `aria-required="true"`.

---

### 1.3 Toggle

Binary toggle switch. Used for SGLT2 inhibitor.

**Props:**

```typescript
interface ToggleProps {
  id: string;
  name: string;
  label: string;
  helperText?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}
```

**States:**

| State | Track | Thumb | Label |
|-------|-------|-------|-------|
| Off | 40x24px, `--border` bg | 20px circle, white, left | 16px `--foreground` |
| On | 40x24px, `--primary` bg | 20px circle, white, right | 16px `--foreground` |
| Focused | + 2px blue focus ring | | |
| Disabled | 40x24px, `--card` bg | 20px circle, `--border` | 16px `--muted-foreground` |

**Layout:**
- Label left, toggle right, on same line.
- Row height: 44px (touch target).
- Helper text below, 14px `--muted-foreground`.

**Accessibility:**
- `role="switch"`, `aria-checked`, `aria-label`.
- Space/Enter to toggle. Uses shadcn/ui `Switch`.

---

### 1.4 Select

Dropdown select. Used for CKD diagnosis and proteinuria unit.

**Props:**

```typescript
interface SelectFieldProps {
  id: string;
  name: string;
  label: string;
  placeholder: string;          // e.g., "Select type..."
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}
```

**States:**

| State | Border | Background | Chevron |
|-------|--------|-----------|---------|
| Default (placeholder) | 1px `--border` | `--background` | `--muted-foreground` |
| Open | 2px `--secondary` | `--background` | rotated 180deg |
| Selected | 1px `--border` | `--background` | `--muted-foreground` |
| Error | 2px `--destructive` | #FDECEA | `--destructive` |
| Disabled | 1px `--border` | `--card` | `--muted-foreground` |

**Layout:**
- Height: 48px. Border-radius: 6px. Padding: 12px.
- Dropdown menu: max-height 240px, scroll if needed, 8px border-radius.
- Each option: 44px height (touch target), 12px padding.

**Accessibility:**
- Uses shadcn/ui `Select` (Radix, handles ARIA).
- Keyboard: arrow keys to navigate, Enter to select, Escape to close.

**Instances:**

CKD Diagnosis options: `["Type 1 - Diabetic", "Type 2 - Diabetic", "Hypertensive", "Glomerular", "Polycystic", "Other", "Unknown"]`

Proteinuria Unit options: `["mg/g (UACR)", "mg/dL", "g/24h"]`

---

### 1.5 SubmitButton

Primary form submission button.

**Props:**

```typescript
interface SubmitButtonProps {
  label: string;                 // "See My Prediction"
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}
```

**States:**

| State | Background | Text | Cursor | Extra |
|-------|-----------|------|--------|-------|
| Default | `--primary` (#1D9E75) | white, 16px/600 | pointer | -- |
| Hover | darken 10% (#178A65) | white | pointer | -- |
| Active/pressed | darken 15% | white | pointer | scale(0.98) |
| Loading | `--primary` 60% opacity | hidden | wait | spinner (white, 20px) centered |
| Disabled | `--neutral` (#AAA) | white 60% opacity | not-allowed | -- |

**Layout:**
- Height: 56px (form submit, larger than standard 48px).
- Full width on mobile. Max-width: 400px on desktop (centered).
- Border-radius: 8px (`rounded-lg`). Font: 16px/600.
- Margin-top: 24px from last form field.

**Accessibility:**
- `type="submit"`. `aria-disabled` when disabled (not HTML `disabled` -- preserves focus).
- `aria-busy="true"` during loading. Screen reader announces "Calculating your prediction" during load.

---

### 1.6 FormSection

Collapsible section for optional/silent field groups. Progressive disclosure.

**Props:**

```typescript
interface FormSectionProps {
  id: string;
  title: string;                 // e.g., "Sharpen your prediction"
  description?: string;          // Subtitle text
  defaultOpen?: boolean;         // Default: false
  children: React.ReactNode;
}
```

**States:**

| State | Header | Content | Chevron |
|-------|--------|---------|---------|
| Collapsed | 44px height, `--foreground` title | Hidden (height: 0, overflow hidden) | Right-pointing |
| Expanded | 44px height, `--foreground` title | Visible, animated slide-down (200ms ease) | Down-pointing |
| Hover | Background: `--card` subtle | -- | -- |

**Layout:**
- Top border: 1px `--border`.
- Header padding: 12px horizontal, 0 vertical (height set by min-height 44px).
- Content padding: 0 top (flows from header), 0 horizontal (fields have own padding).
- Title: 16px/600. Chevron: 16px, right-aligned.

**Accessibility:**
- Uses shadcn/ui `Collapsible` or `Accordion`.
- `aria-expanded` on trigger. Content has `role="region"` with `aria-labelledby`.
- Enter/Space to toggle.

**Instances:**

| Section | Title | Description |
|---------|-------|-------------|
| tier2 | Sharpen your prediction | Add hemoglobin and glucose for an enhanced prediction |
| silent | Additional health info | Optional -- helps improve accuracy |

---

## 2. Chart Components

### 2.1 PredictionChart

Main Visx chart container. Renders SVG with axes, lines, bands, and threshold.

**Props:**

```typescript
interface PredictionChartProps {
  data: TrajectoryData[];        // Array of 4 trajectory datasets
  phases: PhaseBand[];           // Phase band definitions
  dialysisThreshold: number;     // eGFR value (15)
  width: number;                 // Container width (responsive)
  height: number;                // Container height (responsive)
  variant: "A" | "B";           // Full interactive or simplified
  confidenceTier: 1 | 2;
  onDataPointHover?: (point: DataPoint) => void;  // Variant A only
  onDataPointTap?: (point: DataPoint) => void;     // Variant A only
}

interface TrajectoryData {
  id: string;                    // "bun_lte_12", "bun_13_17", "bun_18_24", "no_treatment"
  label: string;                 // Display label
  color: string;                 // Line color
  pattern: "solid" | "dashed" | "short-dash" | "dotted";
  points: DataPoint[];
  finalEgfr: number;            // End-of-line label value
  dialysisAge?: number | null;  // Months to dialysis, or null
}

interface DataPoint {
  monthsFromBaseline: number;
  egfr: number;
}
```

**Dimensions (responsive):**

| Breakpoint | Width | Height | Margins |
|------------|-------|--------|---------|
| Mobile (<768px) | 100% - 32px | 200px | top: 16, right: 48, bottom: 40, left: 40 |
| Tablet (768-1024px) | 100% - 48px | 280px | top: 16, right: 64, bottom: 40, left: 48 |
| Desktop (>1024px) | min(960px, 100%-64px) | 340px | top: 20, right: 80, bottom: 48, left: 56 |

Right margin accommodates end-of-line labels.

**X-Axis (true linear time scale):**
- Scale: linear, domain [0, 120] months.
- Tick marks at: 0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120.
- Labels: "0", "1yr", "2yr", "3yr", "4yr", "5yr", "6yr", "7yr", "8yr", "9yr", "10yr".
- Mobile: show every other label (0, 2yr, 4yr, 6yr, 8yr, 10yr).
- Font: 12px/400 `--muted-foreground`.
- Axis line: 1px `--border`.

**Y-Axis:**
- Scale: linear, domain [0, max(90, maxEgfr + 10)].
- Tick marks: 0, 15, 30, 45, 60, 75, 90.
- 15 always shown (dialysis threshold).
- Font: 12px/400 `--muted-foreground`.
- Label: "eGFR (mL/min/1.73m2)" rotated -90deg.

**Chart Title:**
- "eGFR Trajectory" -- 15px/700 `--foreground`.
- Subtitle: "Predicted kidney function over 10 years" -- 12px/400 `--muted-foreground`.
- Position: top-left of chart area.

**Accessibility:**
- `<svg role="img" aria-label="eGFR trajectory chart showing 4 predicted scenarios over 10 years">`.
- Hidden data table alternative (see section 2.8).
- All text in SVG uses `aria-hidden="true"` (redundant with data table).

---

### 2.2 TrajectoryLine

Individual trajectory line rendered via Visx `LinePath`.

**Props:**

```typescript
interface TrajectoryLineProps {
  data: DataPoint[];
  color: string;
  pattern: "solid" | "dashed" | "short-dash" | "dotted";
  strokeWidth: number;
  highlighted?: boolean;         // When stat card is selected
  dimmed?: boolean;              // When another line is highlighted
  label: string;                 // For accessibility
}
```

**Line Styles:**

| Trajectory | Color | Pattern | strokeWidth | Dash Array |
|-----------|-------|---------|-------------|------------|
| BUN <= 12 | `--primary` (#1D9E75) | solid | 2.5 | -- |
| BUN 13-17 | `--secondary` (#378ADD) | dashed | 2.5 | 8,4 |
| BUN 18-24 | `--secondary-light` (#85B7EB) | short-dash | 2 | 4,4 |
| No Treatment | `--neutral` (#AAA) | dotted | 2 | 2,4 |

**Interaction States (Variant A only):**

| State | Opacity | strokeWidth | Extra |
|-------|---------|-------------|-------|
| Default | 1.0 | per above | -- |
| Highlighted (card selected) | 1.0 | +1px | drop shadow glow |
| Dimmed (other card selected) | 0.3 | per above | -- |
| Hovered | 1.0 | +0.5px | cursor: pointer |

**Variant B:** All lines at default state, no interaction. Static rendering.

---

### 2.3 PhaseBand

Vertical background band indicating CKD phase regions.

**Props:**

```typescript
interface PhaseBandProps {
  label: string;                 // "Phase 1", "Phase 2", "Phase 3"
  yStart: number;                // eGFR top
  yEnd: number;                  // eGFR bottom
  color: string;                 // Fill color
  opacity: number;
}
```

**Phase Definitions:**

| Phase | eGFR Range | Fill Color | Opacity | Label Position |
|-------|-----------|-----------|---------|---------------|
| Phase 1 (Normal/Mild) | 60-90+ | `--primary-light` (#E8F5F0) | 0.3 | Top-right of band |
| Phase 2 (Moderate) | 30-60 | #FFF8E1 (warm yellow) | 0.3 | Top-right of band |
| Phase 3 (Severe) | 15-30 | #FDECEA (warm pink) | 0.2 | Top-right of band |
| Phase 4 (Dialysis) | 0-15 | #F5F5F5 (light gray) | 0.3 | Top-right of band |

**Layout:**
- Full width of chart area. z-index: behind lines, above grid.
- Label: 11px/400 `--muted-foreground`, 8px from right edge, 4px from top of band.
- Variant B: simplified as horizontal ruled lines instead of fills.

---

### 2.4 DialysisThreshold

Horizontal reference line at eGFR = 15.

**Props:**

```typescript
interface DialysisThresholdProps {
  value: number;                 // 15
  label: string;                 // "Dialysis threshold"
}
```

**Visual:**
- Dashed line: 2px `--destructive` (#D32F2F), dash-array: 6,3.
- Label: "Dialysis threshold" -- 11px/600 `--destructive`, positioned right-aligned, 4px above line.
- z-index: above phase bands, below trajectory lines.

---

### 2.5 ChartTooltip (Variant A only)

Tooltip on hover (desktop) or tap (mobile).

**Props:**

```typescript
interface ChartTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  trajectoryLabel: string;       // "BUN <= 12"
  egfr: number;                  // eGFR at point
  month: number;                 // Time point
  color: string;                 // Trajectory color
}
```

**Layout:**
- White card with 1px `--border`, 8px border-radius, shadow-md.
- Padding: 8px 12px.
- Width: auto (content-driven), max-width: 180px.
- Pointer/caret: 6px triangle pointing to data point.
- Content:
  ```
  [color dot] BUN <= 12          14px/600
  eGFR: 48 mL/min                14px/400
  at 60 months (5 years)         12px/400 muted
  ```

**Behavior:**
- Desktop: follows cursor, 8px offset. Appears on line hover.
- Mobile: fixed position above data point. Appears on tap, dismisses on tap elsewhere.
- z-index: above all chart elements.
- Transition: opacity 150ms ease.

**Omitted in Variant B.** Data is accessible through stat cards only.

---

### 2.6 ChartFootnote

Required footnote below chart.

**Props:**

```typescript
interface ChartFootnoteProps {
  text: string;                  // "Data points are plotted at actual time intervals..."
}
```

**Layout:**
- Text: 12px/400 `--muted-foreground`.
- Margin-top: 8px from chart bottom.
- Max-width: matches chart width.
- Italic styling.

**Default text:** "Data points are plotted at actual time intervals. Early measurements are more frequent."

---

### 2.7 StatCard

Individual result card displaying one trajectory scenario.

**Props:**

```typescript
interface StatCardProps {
  id: string;                    // Trajectory ID
  label: string;                 // "BUN <= 12"
  color: string;                 // Left border color
  egfrAt5yr: number;             // eGFR value at 5 years
  egfrAt10yr: number;            // eGFR value at 10 years
  dialysisProjection: string;    // "Not projected" | "~8 years" | etc.
  selected?: boolean;            // Highlighted state (Variant A)
  onClick?: () => void;          // Variant A: highlights chart line
}
```

**States:**

| State | Border-left | Background | Shadow | Outline |
|-------|------------|-----------|--------|---------|
| Default | 4px `{color}` | `--card` (#F8F9FA) | shadow-sm | none |
| Hover | 4px `{color}` | white | shadow-md | none |
| Selected | 4px `{color}` | white | shadow-lg | 2px `{color}` |
| Focus | 4px `{color}` | `--card` | shadow-sm | 2px `--secondary` focus ring |

**Layout:**

```
+------------------------------------------+
|  [color dot] BUN <= 12        16px/600   |  header row
|                                          |
|  eGFR at 5 years:                        |  14px/400 muted
|  48 mL/min                    18px/600   |  value
|                                          |
|  eGFR at 10 years:                       |  14px/400 muted
|  32 mL/min                    18px/600   |  value
|                                          |
|  Dialysis: Not projected      14px/400   |  footer
+------------------------------------------+
```

- Padding: 16px. Border-radius: 8px.
- Min-height: 120px. Min-width: 200px (desktop).
- Left border: 4px solid, colored per trajectory.
- Cursor: pointer (Variant A), default (Variant B).

**Accessibility:**
- Variant A: `role="button"`, `aria-pressed={selected}`, `tabindex="0"`.
- Variant B: `role="region"`, `aria-label="Prediction for {label}"`.
- Keyboard: Enter/Space to select (Variant A). Tab to navigate between cards.

---

### 2.8 StatCardGrid

Responsive container for stat cards.

**Props:**

```typescript
interface StatCardGridProps {
  children: React.ReactNode;     // 4 StatCard children
}
```

**Responsive Layout:**

| Breakpoint | Columns | Gap | Behavior |
|------------|---------|-----|----------|
| Mobile (<768px) | 1 | 12px | Stack vertically, full width |
| Tablet (768-1024px) | 2 | 16px | 2x2 grid |
| Desktop (>1024px) | 4 | 16px | Single row, equal width |

**CSS:** `grid`, `grid-template-columns` responsive with Tailwind: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.

---

### 2.9 ConfidenceBadge

Displays prediction confidence tier.

**Props:**

```typescript
interface ConfidenceBadgeProps {
  tier: 1 | 2;
}
```

**Variants:**

| Tier | Label | Background | Text Color | Icon |
|------|-------|-----------|-----------|------|
| 1 | Basic Prediction | `--card` (#F8F9FA) | `--muted-foreground` | circle-half |
| 2 | Enhanced Prediction | `--primary-light` (#E8F5F0) | `--primary` (#1D9E75) | circle-check |

**Layout:**
- Inline badge: height 28px, padding 4px 12px, border-radius 14px (pill).
- Icon: 14px, 4px margin-right. Text: 13px/500.
- Positioned: top-right of results section header, aligned with "Your Prediction" heading.

**Accessibility:**
- `role="status"`, `aria-label="Prediction confidence: {tier label}"`.

---

### 2.10 UnlockPrompt

CTA card shown when prediction is Tier 1, prompting user to add Tier 2 fields.

**Props:**

```typescript
interface UnlockPromptProps {
  visible: boolean;              // Show only when tier === 1
  onAction: () => void;          // Navigate to form with Tier 2 expanded
}
```

**Layout:**

```
+------------------------------------------+
|  [sparkle icon]                          |
|                                          |
|  Add both your hemoglobin and glucose    |  16px/400
|  results to sharpen your prediction.     |
|                                          |
|  [Add Lab Values]             button     |  44px secondary
+------------------------------------------+
```

- Background: `--primary-light` (#E8F5F0) with 1px `--primary` 20% border.
- Padding: 16px. Border-radius: 8px.
- Position: between chart footnote and stat cards.
- Hidden when `tier === 2`.

---

### 2.11 ChartDataTable (Screen Reader Alternative)

Hidden data table providing chart data for screen readers.

**Props:**

```typescript
interface ChartDataTableProps {
  data: TrajectoryData[];
  className?: string;            // "sr-only" (visually hidden)
}
```

**Renders:**

```html
<table class="sr-only" aria-label="eGFR trajectory data">
  <caption>Predicted eGFR values over 10 years for 4 scenarios</caption>
  <thead>
    <tr>
      <th>Time</th>
      <th>BUN ≤ 12</th>
      <th>BUN 13-17</th>
      <th>BUN 18-24</th>
      <th>No Treatment</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Baseline</td><td>65</td>...</tr>
    <tr><td>1 year</td><td>60</td>...</tr>
    ...
  </tbody>
</table>
```

- Visually hidden with `sr-only` but accessible to screen readers.
- Placed immediately after the SVG chart element.

---

## 3. Auth Components

### 3.1 MagicLinkPrompt

Email-only entry for requesting a magic link. No password field.

**Props:**

```typescript
interface MagicLinkPromptProps {
  mode: "save" | "signin";       // Determines heading text
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  error?: string;                // "Email not found" etc.
}
```

**Layout (save mode):**

```
Save your results                     20px/600

Your results will be available        16px/400
for 24 hours. Create a free
account to save them permanently.

Email
+------------------------------------+
| your@email.com                      |  48px
+------------------------------------+
[error text if present]

+------------------------------------+
| Send me a sign-in link             |  48px primary
+------------------------------------+
```

**Layout (signin mode):**

```
Welcome back                          20px/600

Enter your email to sign in.          16px/400

Email
+------------------------------------+
| your@email.com                      |  48px
+------------------------------------+

+------------------------------------+
| Send me a sign-in link             |  48px primary
+------------------------------------+

No account? Enter your lab            14px muted
values first, then save.
[Get Started]                         text link
```

**Accessibility:**
- Email input: `type="email"`, `autocomplete="email"`.
- Form: `role="form"`, `aria-label="Sign in with email"`.
- On submit: focus moves to confirmation screen.

---

### 3.2 MagicLinkSent

Confirmation after magic link is sent.

**Props:**

```typescript
interface MagicLinkSentProps {
  email: string;                 // Partially masked: "j***@email.com"
  onResend: () => void;
  resendCooldown: number;        // Seconds remaining (starts at 60)
}
```

**Layout:**

```
[Email icon]                          48px

Check your email!                     20px/600

We sent a sign-in link to            16px/400
j***@email.com                        16px/600

The link expires in 15 minutes.       14px muted

+------------------------------------+
| Resend link                        |  48px secondary
+------------------------------------+
(available in 58 seconds)             12px muted

Didn't receive it?                    14px muted
Check your spam folder.
```

**Behavior:**
- Resend button disabled for 60 seconds after send, countdown shown.
- On resend: reset countdown, show brief "Link sent" toast.

---

### 3.3 SavePrompt

Post-prediction overlay prompting account creation. Wraps MagicLinkPrompt in save mode.

**Props:**

```typescript
interface SavePromptProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (email: string) => void;
}
```

**Behavior:**
- Appears 2 seconds after results render (slide-up animation, 300ms ease-out).
- Semi-transparent backdrop: `rgba(0,0,0,0.3)`.
- Card: white, border-radius 12px, shadow-xl, max-width 480px (desktop), full-width minus 32px (mobile).
- Dismiss: X button top-right (44px touch target) or tap backdrop.
- Once dismissed: does not reappear during same session. Small "Save your results" text link appears in results header instead.

**Accessibility:**
- `role="dialog"`, `aria-modal="true"`, `aria-label="Save your results"`.
- Focus trapped within dialog when open.
- Escape key dismisses.
- On open: focus moves to email input.
- On dismiss: focus returns to trigger element.

---

### 3.4 AuthBanner

Contextual banner for auth state changes. Appears at top of page.

**Props:**

```typescript
interface AuthBannerProps {
  variant: "welcome" | "check-email" | "expired" | "error";
  message?: string;
}
```

**Variants:**

| Variant | Background | Icon | Text | Auto-dismiss |
|---------|-----------|------|------|-------------|
| welcome | `--primary-light` (#E8F5F0) | check-circle | "Welcome! Your results are saved." | 5 seconds |
| check-email | `--secondary` 10% | mail | "Check your email for a sign-in link." | No |
| expired | #FFF8E1 | clock | "Your sign-in link has expired." | No |
| error | #FDECEA | alert-triangle | Custom message | No |

**Layout:**
- Full width, 48px height, 12px padding horizontal.
- Text: 14px/500. Icon: 16px, 8px margin-right.
- Dismiss X: 44px touch target, right-aligned.
- Position: fixed, top of viewport, below header. z-index: 50.
- Entrance: slide-down 200ms ease.

**Accessibility:**
- `role="alert"` for error/expired. `role="status"` for welcome/check-email.
- `aria-live="polite"`.

---

### 3.5 SignInForm

Full-page sign-in form. Wraps MagicLinkPrompt in signin mode.

Same as MagicLinkPrompt with `mode="signin"` plus surrounding page layout (centered, max-width 400px, vertical centering on desktop).

---

## 4. Layout Components

### 4.1 PageLayout

Top-level layout wrapper for all pages.

**Props:**

```typescript
interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";  // 480px | 640px | 960px. Default: "lg"
}
```

**Layout:**

```
+--------------------------------------------------------------+
| HEADER (fixed top)                                           |
| [Logo]                              [Sign In / My Results]   |
+--------------------------------------------------------------+
|                                                              |
|  +---------- max-width container ----------+                 |
|  |                                         |                 |
|  |  {children}                             |                 |
|  |                                         |                 |
|  +------------------------------------------+                 |
|                                                              |
+--------------------------------------------------------------+
| FOOTER / DISCLAIMER                                          |
+--------------------------------------------------------------+
```

**Header:**

| Breakpoint | Height | Logo | Nav |
|------------|--------|------|-----|
| Mobile | 48px | 28px logo mark | Icon button (44px) |
| Tablet | 56px | Full logo | Text link |
| Desktop | 64px | Full logo | Text link |

- Background: white. Border-bottom: 1px `--border`.
- Position: sticky top. z-index: 40.
- Horizontal padding: same as content area.

**Content Area:**

| Breakpoint | Padding | Max-width |
|------------|---------|-----------|
| Mobile | 16px horizontal | 100% |
| Tablet | 24px horizontal | 100% |
| Desktop | 32px horizontal | 960px (centered) |

**Footer:** See DisclaimerBar.

---

### 4.2 DisclaimerBar

Medical disclaimer display. Different behavior per breakpoint.

**Props:**

```typescript
interface DisclaimerBarProps {
  text: string;                  // Full disclaimer text
  shortText: string;             // One-line mobile version
  expanded?: boolean;            // Mobile: expanded state
  onToggle?: () => void;         // Mobile: expand/collapse
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
|                                  |
+----------------------------------+
```

- Position: fixed bottom. z-index: 30.
- Background: white. Border-top: 1px `--border`. Shadow-lg (upward).
- Collapsed: 44px. Expanded: auto-height, max-height 40vh.
- Transition: max-height 300ms ease.
- Tap anywhere on bar to toggle (entire bar is touch target).

**Tablet/Desktop (inline):**

```
+----------------------------------------------+
| This tool provides educational predictions   |
| only and is not a substitute for professional|
| medical advice. Always consult your          |
| healthcare provider before making treatment  |
| decisions.                                   |
+----------------------------------------------+
```

- Position: static, below content.
- Background: `--card`. Padding: 16px. Border-radius: 8px.
- Text: 14px/400 `--muted-foreground`.
- Margin-top: 32px.

**Accessibility:**
- `role="contentinfo"`.
- Mobile toggle: `aria-expanded`, `aria-controls`.
- Mobile: `aria-label="Medical disclaimer, tap to expand"`.

---

### 4.3 LoadingSkeleton

Placeholder content during API calls.

**Props:**

```typescript
interface LoadingSkeletonProps {
  variant: "chart" | "card" | "text" | "form";
}
```

**Variants:**

| Variant | Dimensions | Shape |
|---------|-----------|-------|
| chart | 100% width, 200px (mobile) / 340px (desktop) | Rounded rectangle, pulsing |
| card | 100% width, 120px height | Rounded rectangle, pulsing |
| text | 60-80% width, 16px height | Rounded pill, pulsing |
| form | 100% width, 48px height | Rounded rectangle, pulsing |

**Animation:**
- Background: linear gradient sweep left-to-right.
- Colors: `--card` (#F8F9FA) to `--border` (#E0E0E0) and back.
- Duration: 1.5s, infinite loop.
- Uses Tailwind `animate-pulse` or custom shimmer.

**Accessibility:**
- `aria-busy="true"` on parent container.
- `aria-label="Loading"` on skeleton element.
- `role="progressbar"` (indeterminate).
