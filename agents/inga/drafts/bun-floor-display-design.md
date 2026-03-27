# BUN Structural Floor Display -- UX Design Spec

**Author:** Inga (UX/UI Designer)
**Date:** 2026-03-26
**Source:** Amendment 3 from `agents/john_donaldson/drafts/TASK-iterate-rules-engine-v3.md`
**Sprint:** 2/3 (implementation by Harshit)

---

## Overview

When BUN > 17, a callout card appears on the prediction form input screen. It reframes the patient's eGFR by showing how many points are suppressed by BUN workload rather than permanent damage. The tone is encouraging -- this is good news the patient may not have heard before.

**Display text:**
> Your reported eGFR is [X]. At your current BUN of [Y], approximately [Z] points of that reading reflect BUN workload suppression, not permanent damage. Your estimated structural capacity is eGFR [X+Z].

---

## 1. Placement

The callout appears **below the eGFR-related fields, after both BUN and creatinine have been entered**. Specifically:

- Position it between the lab-value input group (BUN, creatinine, eGFR) and the form submit button
- It should feel like a natural inline insight, not a modal or tooltip
- On the predict form layout, this sits in the same column as the input fields, full width within the form container

**Trigger condition:** Display when `BUN > 17` AND both BUN and creatinine fields have valid values. If the user changes BUN to 17 or below, the callout disappears.

---

## 2. Visual Design

### Card Structure

```
+----------------------------------------------------------+
|  [Leaf icon]                                              |
|                                                           |
|  Approximately Z points of your eGFR reflect              |
|  BUN workload, not permanent damage.                      |
|                                                           |
|  Your reported eGFR is X. At your current BUN of Y,      |
|  approximately Z points of that reading reflect BUN       |
|  workload suppression, not permanent damage. Your         |
|  estimated structural capacity is eGFR X+Z.              |
+----------------------------------------------------------+
```

### Colors (Brand Palette)

| Element | Color | Token |
|---------|-------|-------|
| Card background | `#004D43` at 8% opacity (`rgba(0, 77, 67, 0.08)`) | `bg-primary/8` |
| Left border accent | `#004D43` (brand teal), 3px solid | `border-l-primary` |
| Icon | `#004D43` (brand teal) | `text-primary` |
| Headline text (Z value) | `#004D43` (brand teal), bold | `text-primary font-bold` |
| Body text | `#636363` (body gray) | `text-body` |
| Prominent numbers ([X], [Y], [Z], [X+Z]) | `#010101` (black), `font-semibold` | `text-foreground font-semibold` |

### Icon

Use a **leaf** icon (Lucide `Leaf` or `Sprout`) to convey growth/recovery. Avoid medical icons (stethoscope, heart) which could feel clinical. Avoid warning icons (triangle, exclamation) which feel alarming.

### Border

- Left border: 3px solid `#004D43` (teal)
- Remaining borders: none (open card feel)
- Border radius: `0.75rem` (12px), consistent with existing form cards
- No drop shadow -- it should feel embedded in the form, not floating

---

## 3. Animation / Reveal

The callout should **animate in** when BUN exceeds 17, not appear instantly. This draws the user's attention without startling them.

### Recommended animation

```css
/* Enter */
opacity: 0 -> 1 over 300ms ease-out
max-height: 0 -> auto over 300ms ease-out
transform: translateY(-8px) -> translateY(0) over 300ms ease-out

/* Exit (when BUN drops to 17 or below) */
opacity: 1 -> 0 over 200ms ease-in
max-height: auto -> 0 over 200ms ease-in
```

### Implementation notes

- Use CSS transitions or Tailwind `animate-` utilities, not JS-driven animation
- Debounce the trigger: wait 500ms after the user stops typing in the BUN field before evaluating. This prevents the card from flickering as they type "18" (which passes through "1" first)
- The card should calculate and display in real time as form values change -- no submit required

---

## 4. Typography

### Headline (summary line)

> Approximately **Z** points of your eGFR reflect BUN workload, not permanent damage.

- Font size: `1.125rem` (18px) on desktop, `1rem` (16px) on mobile
- Font weight: `400` (regular), with the Z value in `700` (bold)
- Color: `#010101` (black) for the sentence, `#004D43` (teal) + bold for the Z number
- Line height: `1.5`

### Body text (full explanation)

> Your reported eGFR is **X**. At your current BUN of **Y**, approximately **Z** points of that reading reflect BUN workload suppression, not permanent damage. Your estimated structural capacity is eGFR **X+Z**.

- Font size: `0.9375rem` (15px) on desktop, `0.875rem` (14px) on mobile
- Font weight: `400` (regular)
- Color: `#636363` (body gray)
- Inline numbers (X, Y, Z, X+Z): `font-semibold`, `#010101` (black)
- The final "eGFR X+Z" value should be slightly larger and bold: `1rem` (16px), `font-bold`, `#004D43` (teal) -- this is the "good news" number

### Spacing

- Card padding: `1.25rem` (20px)
- Gap between icon and headline: `0.75rem` (12px)
- Gap between headline and body: `0.5rem` (8px)
- Margin above the card (from last input field): `1.5rem` (24px)
- Margin below the card (to submit button): `1.5rem` (24px)

---

## 5. Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Mobile (`< 640px`) | Full width within form container. Card padding reduces to `1rem`. Font sizes drop one step (see Section 4). |
| Tablet (`640px -- 1024px`) | Full width within form container. Desktop font sizes. |
| Desktop (`> 1024px`) | Constrained to form container width (max ~480px). If the form layout has a sidebar/chart preview, the callout stays within the input column only. |

The card should never exceed the width of the form input fields above it. It aligns left with the input labels and right with the input field edges.

---

## 6. Accessibility

### ARIA

```html
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  aria-label="BUN structural floor estimate"
>
  <!-- card content -->
</div>
```

- `aria-live="polite"` ensures screen readers announce the content when it appears, without interrupting the user mid-input
- `aria-atomic="true"` reads the entire region as one announcement, not partial updates
- `role="status"` is semantically correct for a live status update

### Heading structure

The headline ("Approximately Z points...") should NOT be an `<h2>` or `<h3>` -- it is a dynamic inline callout, not a section heading. Use a `<p>` with appropriate styling. This keeps the document outline clean within the form.

### Color contrast

- `#004D43` teal on `rgba(0, 77, 67, 0.08)` background: contrast ratio ~10:1 (passes AAA)
- `#636363` body gray on the same background: contrast ratio ~4.8:1 (passes AA for normal text, passes AA for large text)
- `#010101` black on the same background: contrast ratio ~18:1 (passes AAA)

### Focus management

The callout is not focusable. It does not trap or redirect focus. Users continue tabbing through form fields normally. The `aria-live` region handles screen reader notification passively.

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .bun-floor-callout {
    animation: none;
    transition: none;
    opacity: 1;
  }
}
```

Users who prefer reduced motion see the card appear/disappear instantly without animation.

---

## 7. Edge Cases

| Condition | Behavior |
|-----------|----------|
| BUN <= 17 | Nothing displayed. No card, no placeholder, no empty space. |
| BUN < 15 | Nothing displayed (per spec, ratio is 0.00). |
| BUN = 18 (just above threshold) | Card appears. Z value will be small (~2 points). Still show the card -- even a small structural floor is meaningful. |
| BUN field empty or invalid | Nothing displayed. Card requires valid BUN AND valid creatinine/eGFR. |
| eGFR = 0 or extremely low | Still display. The structural floor message is arguably most encouraging for patients with very low eGFR. |
| User clears BUN field after card appeared | Card animates out. |
| BUN > 50 | Card displays normally. Use the > 50 ratio (0.25). No upper cap on display. |
| Z rounds to 0 | Do not display the card. If the calculated Z rounds to 0, the message is meaningless. |

### Number formatting

- Z (suppression points): round to nearest integer. Display as whole number (e.g., "7 points", not "7.3 points"). Patients do not need decimal precision here.
- X (reported eGFR): display as entered by the user (may be integer or one decimal)
- X+Z (structural capacity): round to nearest integer
- Y (BUN): display as entered by the user

---

## 8. Content Tone

This callout is deliberately encouraging. CKD patients are accustomed to bad news. The structural floor reframes their eGFR as "not as bad as the number suggests."

**Do:**
- Use warm, clear language
- Emphasize "not permanent damage"
- Make the structural capacity number feel like a reveal

**Do not:**
- Use medical jargon beyond what is already in the sentence
- Add disclaimers or caveats inside the card (those belong in the site-wide disclaimer)
- Use red, orange, or warning colors
- Frame it as a diagnosis or treatment recommendation

---

## 9. Implementation Reference

For Harshit: this is a client-side-only display. The calculation uses the BUN_ratio lookup table from Amendment 3:

| BUN Range | Ratio |
|-----------|-------|
| < 15 | 0.00 (do not display) |
| 15-20 | 0.67 |
| 20-30 | 0.47 |
| 30-50 | 0.32 |
| > 50 | 0.25 |

Formula: `Z = (Current BUN - 15) * BUN_ratio`

Use the more conservative (lower) ratio when BUN and eGFR brackets differ, per Amendment 3.
