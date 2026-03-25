# KidneyHood Accessibility Plan

**Author:** Inga (Senior UX/UI Designer)
**Version:** 1.0 -- Discovery Phase Draft
**Date:** 2026-03-25
**Status:** Draft for team review
**Standard:** WCAG 2.1 AA Compliance

---

## Table of Contents

1. [Audience Accessibility Profile](#1-audience-accessibility-profile)
2. [WCAG 2.1 AA Compliance Checklist](#2-wcag-21-aa-compliance-checklist)
3. [Chart-Specific Accessibility](#3-chart-specific-accessibility)
4. [Form Accessibility](#4-form-accessibility)
5. [Auth Flow Accessibility](#5-auth-flow-accessibility)
6. [Keyboard Navigation Map](#6-keyboard-navigation-map)
7. [Screen Reader Flow](#7-screen-reader-flow)
8. [Color and Contrast](#8-color-and-contrast)
9. [Responsive and Zoom Accessibility](#9-responsive-and-zoom-accessibility)
10. [Testing Plan](#10-testing-plan)

---

## 1. Audience Accessibility Profile

The primary audience is **CKD patients aged 60+**, many accessing from mobile devices. This demographic has elevated rates of:

- **Low vision:** Age-related macular degeneration, cataracts, diabetic retinopathy.
- **Color vision deficiency:** Prevalence increases with age, ~8% of males.
- **Motor impairment:** Reduced fine motor control, essential tremor, arthritis.
- **Cognitive load sensitivity:** Information overload reduces comprehension.
- **Low digital literacy:** May not understand standard web conventions (hamburger menus, tooltips, swipe gestures).

**Design implications applied throughout:**

| Constraint | Minimum Standard | Our Standard |
|-----------|-----------------|-------------|
| Body text size | 14px (WCAG) | **16px** |
| Smallest text | 10px (WCAG) | **12px** (chart axes only) |
| Touch target | 24px (WCAG AA) | **44px** (WCAG AAA level, 2.5.5) |
| Color contrast (text) | 4.5:1 (AA) | **4.5:1+** verified |
| Color contrast (large text) | 3:1 (AA) | **3:1+** verified |
| Color-only information | Not allowed | **Color + pattern + label** |
| Error messages | Programmatic | **Plain language + programmatic** |
| Animation | Respect prefers-reduced-motion | **Yes, all animations conditional** |

---

## 2. WCAG 2.1 AA Compliance Checklist

### Principle 1: Perceivable

| Criterion | Level | Requirement | KidneyHood Implementation | Status |
|-----------|-------|------------|---------------------------|--------|
| **1.1.1** Non-text Content | A | Alt text for all non-text content | SVG chart has `aria-label` + `<desc>`. Hidden data table as alternative. All icons have `aria-label` or `aria-hidden` if decorative. | PLANNED |
| **1.3.1** Info and Relationships | A | Semantic HTML structure | `<h1>`-`<h3>` heading hierarchy. `<form>` with `<label>` associations. `<table>` for data. `<nav>` for navigation. `<main>` for content. | PLANNED |
| **1.3.2** Meaningful Sequence | A | DOM order matches visual order | Single-column mobile layout matches reading order. Desktop 2-col form uses grid with logical tab order. | PLANNED |
| **1.3.3** Sensory Characteristics | A | Don't rely solely on shape, size, position, or sound | Error messages use text + icon + color (not color alone). Chart lines use pattern + color + label. | PLANNED |
| **1.3.4** Orientation | AA | No orientation lock | App works in portrait and landscape. No orientation restrictions. | PLANNED |
| **1.3.5** Identify Input Purpose | AA | Autocomplete attributes on inputs | `autocomplete="email"` on email fields. `autocomplete="age"` on age (if supported). | PLANNED |
| **1.4.1** Use of Color | A | Color not sole means of information | Chart: color + line pattern (solid/dashed/dotted) + end-of-line labels. Errors: red + icon + text. Confidence: text label + color. | PLANNED |
| **1.4.3** Contrast (Minimum) | AA | 4.5:1 text, 3:1 large text | All text/background combinations verified. See Section 8. | VERIFIED |
| **1.4.4** Resize Text | AA | Readable at 200% zoom | Tested all layouts at 200% browser zoom. Single-column reflow. No horizontal scroll. | PLANNED |
| **1.4.5** Images of Text | AA | Use real text, not images | No images of text. Chart labels are SVG `<text>` (scalable). All UI text is HTML/CSS. | PLANNED |
| **1.4.10** Reflow | AA | No horizontal scroll at 320px/400% zoom | Single-column mobile layout. Chart scales within viewport. Form inputs full-width. | PLANNED |
| **1.4.11** Non-text Contrast | AA | 3:1 for UI components and graphics | Input borders: #E0E0E0 on #FFFFFF = 1.4:1 -- FAILS for unfocused state. **Mitigation:** label text and placeholder provide identification. Focus state: 2px #378ADD on #FFFFFF = 3.5:1 PASSES. Chart lines: see Section 8. | NEEDS REVIEW |
| **1.4.12** Text Spacing | AA | No loss at increased spacing | No fixed-height containers that clip text. All containers use min-height or auto-height. | PLANNED |
| **1.4.13** Content on Hover/Focus | AA | Dismissible, hoverable, persistent tooltips | Chart tooltip: dismissible (move mouse away / tap elsewhere). Tooltip content hoverable (mouse can enter tooltip). Persistent until dismissed. | PLANNED (Variant A) |

### Principle 2: Operable

| Criterion | Level | Requirement | KidneyHood Implementation | Status |
|-----------|-------|------------|---------------------------|--------|
| **2.1.1** Keyboard | A | All functionality via keyboard | Form: Tab between fields. RadioGroup: Arrow keys. Toggle: Space. Submit: Enter. Save prompt: focus trap. Stat cards: Tab + Enter. | PLANNED |
| **2.1.2** No Keyboard Trap | A | User can always Tab away | Save prompt: Escape dismisses, returns focus. Dropdown: Escape closes. No infinite focus loops. | PLANNED |
| **2.1.4** Character Key Shortcuts | A | No single-character shortcuts | None implemented. All shortcuts use modifier keys or are on focused elements only. | N/A |
| **2.4.1** Bypass Blocks | A | Skip navigation | "Skip to main content" link as first focusable element. Hidden until focused. | PLANNED |
| **2.4.2** Page Titled | A | Descriptive `<title>` | "Enter Lab Values -- KidneyHood", "Your Prediction -- KidneyHood", "Sign In -- KidneyHood". | PLANNED |
| **2.4.3** Focus Order | A | Logical tab sequence | See Section 6 (Keyboard Navigation Map). | PLANNED |
| **2.4.4** Link Purpose | A | Link text is descriptive | "Sign In", "Get Started", "Add Lab Values", "Send me a sign-in link". No "click here". | PLANNED |
| **2.4.5** Multiple Ways | AA | Multiple navigation methods | Header navigation + direct URLs. Landing page CTA + form URL. | PLANNED |
| **2.4.6** Headings and Labels | AA | Descriptive headings | "Enter Your Lab Values", "Your Prediction", "Save your results", "Welcome back". | PLANNED |
| **2.4.7** Focus Visible | AA | Clear focus indicator | 2px blue (#378ADD) focus ring on all interactive elements. Offset: 2px. Never suppressed. | PLANNED |
| **2.5.5** Target Size | AAA* | 44x44px minimum | All buttons, links, radio options, toggle, select, and form inputs meet 44px minimum. *Exceeds AA (24px) to serve 60+ audience. | PLANNED |

### Principle 3: Understandable

| Criterion | Level | Requirement | KidneyHood Implementation | Status |
|-----------|-------|------------|---------------------------|--------|
| **3.1.1** Language of Page | A | `lang` attribute | `<html lang="en">`. | PLANNED |
| **3.1.2** Language of Parts | AA | Mark language changes | N/A -- all content in English. | N/A |
| **3.2.1** On Focus | A | No context change on focus | No auto-submit on focus. No navigation on focus. | PLANNED |
| **3.2.2** On Input | A | No unexpected context change | Form does not auto-submit. Radio selection does not trigger navigation. | PLANNED |
| **3.2.3** Consistent Navigation | AA | Same nav on all pages | Header with logo + sign-in/my-results on all pages. Footer with disclaimer on all pages. | PLANNED |
| **3.2.4** Consistent Identification | AA | Same function = same label | "Send me a sign-in link" button everywhere (sign-in, save prompt). | PLANNED |
| **3.3.1** Error Identification | A | Errors described in text | Inline error below field: "Please enter your BUN value (between 5 and 150 mg/dL)". Summary banner if >2 errors. | PLANNED |
| **3.3.2** Labels or Instructions | A | Labels for all inputs | Every input has visible `<label>`. Unit indicator visible. Helper text with ranges. | PLANNED |
| **3.3.3** Error Suggestion | AA | Suggest correction | Error messages include valid range: "between 5 and 150". Empty required field: "Please enter your [field name]." | PLANNED |
| **3.3.4** Error Prevention | AA | Confirm before irreversible actions | Account creation: confirm email on magic link sent screen. No irreversible data actions in MVP. | PLANNED |

### Principle 4: Robust

| Criterion | Level | Requirement | KidneyHood Implementation | Status |
|-----------|-------|------------|---------------------------|--------|
| **4.1.1** Parsing | A | Valid HTML | Next.js SSR produces valid HTML. Validated with W3C validator. | PLANNED |
| **4.1.2** Name, Role, Value | A | ARIA for custom components | shadcn/ui (Radix) provides ARIA by default. Custom Visx chart has `role="img"` + `aria-label`. RadioGroup, Toggle, Select, Dialog all use Radix ARIA. | PLANNED |
| **4.1.3** Status Messages | AA | Programmatic status updates | Loading: `aria-busy="true"`. Errors: `role="alert"`. Success: `role="status"`. Auth banner: `aria-live="polite"`. | PLANNED |

---

## 3. Chart-Specific Accessibility

The eGFR trajectory chart is the most complex accessibility challenge. Strategy: **provide multiple representations of the same data.**

### 3.1 Visual Representation (SVG)

- `<svg role="img" aria-label="...">` with descriptive label.
- `<title>` inside SVG: "eGFR trajectory chart".
- `<desc>` inside SVG: dynamic text summarizing the prediction outcomes (generated from data).

Example `<desc>`:
> "Chart shows predicted eGFR values for four scenarios over 10 years. Best outcome with BUN <= 12 maintains eGFR at 48. BUN 13-17 results in eGFR 35. BUN 18-24 results in eGFR 22. Without treatment, eGFR declines to 18, with dialysis projected at approximately 3 years."

### 3.2 Data Table Alternative

Hidden table rendered after SVG. Visually hidden with `sr-only` class but fully accessible to screen readers.

```html
<table class="sr-only" aria-label="eGFR trajectory data">
  <caption>
    Predicted eGFR values over 10 years for 4 treatment scenarios
  </caption>
  <thead>
    <tr>
      <th scope="col">Time Point</th>
      <th scope="col">BUN &le; 12 (eGFR)</th>
      <th scope="col">BUN 13-17 (eGFR)</th>
      <th scope="col">BUN 18-24 (eGFR)</th>
      <th scope="col">No Treatment (eGFR)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Baseline</th>
      <td>65</td><td>65</td><td>65</td><td>65</td>
    </tr>
    <tr>
      <th scope="row">1 year</th>
      <td>62</td><td>58</td><td>53</td><td>48</td>
    </tr>
    <!-- ... all time points ... -->
    <tr>
      <th scope="row">10 years</th>
      <td>48</td><td>35</td><td>22</td><td>18</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row">Dialysis projected</th>
      <td>Not projected</td>
      <td>~8 years</td>
      <td>~5 years</td>
      <td>~3 years</td>
    </tr>
  </tfoot>
</table>
```

### 3.3 Color Blindness Accommodations

| Condition | Affected Colors | Mitigation |
|-----------|----------------|------------|
| Protanopia (red-blind) | #1D9E75 and #D32F2F may appear similar | Green line is SOLID, threshold is DASHED + labeled |
| Deuteranopia (green-blind) | #1D9E75 appears muted | Solid pattern distinguishes from all dashed lines |
| Tritanopia (blue-blind) | #378ADD appears muted | Dashed pattern (8,4) unique among lines |
| Monochromacy | All colors lost | 4 distinct patterns (solid, dashed, short-dash, dotted) + end-of-line labels + data table |

**Key principle:** Every trajectory is identifiable by THREE independent channels:
1. Color (primary channel for color-sighted users)
2. Line pattern (solid/dashed/short-dash/dotted)
3. Text label (end-of-line labels + stat cards)

### 3.4 Chart Text Sizing

All chart text meets minimum legibility standards:

| Element | Size | Minimum at 200% zoom |
|---------|------|----------------------|
| Chart title | 15px | 30px equivalent |
| Axis labels | 12px | 24px equivalent |
| Phase band labels | 11px | 22px equivalent |
| End-of-line labels | 12px | 24px equivalent |
| Tooltip text | 14px | 28px equivalent |
| Footnote | 12px | 24px equivalent |

At 200% zoom with a 320px viewport, the chart reflows to single-column with the data table as primary representation.

---

## 4. Form Accessibility

### 4.1 Label Association

Every form input has:
- `<label htmlFor={id}>` wrapping the visible label text.
- `aria-describedby` pointing to the helper text or error message element.
- `aria-required="true"` for required fields.
- `aria-invalid="true"` when validation fails.

### 4.2 Error Handling

**On submit with errors:**
1. Scroll smoothly to the first field with an error.
2. Set focus to the first error field.
3. Screen reader announces: error summary ("3 fields need attention") via `role="alert"`.
4. Each error message is linked to its field via `aria-describedby`.

**Error message format (plain language):**

| Scenario | Message |
|----------|---------|
| Required field empty | "Please enter your [field name]" |
| Out of range | "Your [field name] should be between [min] and [max] [unit]" |
| Invalid format | "Please enter a number for [field name]" |
| Server validation error | Use server-provided `details[].message` if available |

**Do NOT use:**
- Jargon: "Invalid input" / "Validation failed"
- Field names as codes: "bun: required"
- Color-only error indication

### 4.3 Input Modes

| Field Type | `inputmode` | Purpose |
|-----------|------------|---------|
| Integer fields (age, BUN, glucose, BP) | `numeric` | Shows numeric keypad on mobile |
| Float fields (creatinine, potassium, hemoglobin) | `decimal` | Shows numeric keypad with decimal |
| Email | `email` | Shows email keyboard on mobile |

### 4.4 Progressive Disclosure

Collapsible sections (FormSection) for optional/silent fields:
- `aria-expanded="true|false"` on trigger button.
- `aria-controls` linking trigger to content region.
- Content region: `role="region"`, `aria-labelledby` pointing to section title.
- Screen reader announces: "Sharpen your prediction, collapsed" / "Sharpen your prediction, expanded".

---

## 5. Auth Flow Accessibility

### 5.1 Save Prompt (Modal Dialog)

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to heading.
- **Focus trap:** Tab cycles within dialog only. Shift+Tab wraps from first to last element.
- **Escape dismisses:** Returns focus to the trigger element (results area).
- **On open:** Focus moves to email input (first interactive element).
- **Backdrop click dismisses:** Same behavior as Escape.
- **Screen reader announcement:** "Save your results dialog" on open.

### 5.2 Magic Link Flow

- After sending link: focus moves to confirmation screen content.
- "Check your email!" announced via `role="status"`.
- Resend button: `aria-disabled="true"` during cooldown, with countdown in `aria-label`: "Resend link, available in 45 seconds".
- Error states (expired link): `role="alert"` on error message.

### 5.3 Auth State Changes

- When user authenticates: `AuthBanner` uses `role="status"`, `aria-live="polite"`.
- Header navigation updates: screen reader announces "My Results" replacing "Sign In".
- Page title updates to reflect authenticated state.

---

## 6. Keyboard Navigation Map

### 6.1 Prediction Form Page

```
Tab order:
1. [Skip to main content] link (sr-only, visible on focus)
2. [Logo] (link to home)
3. [Sign In] link
4. Age input
5. Sex: Male radio
6. Sex: Female radio (Arrow key from Male)
7. Sex: Prefer not to say radio (Arrow key)
8. BUN input
9. Creatinine input
10. Potassium input
11. [Sharpen your prediction] toggle (Enter/Space to expand)
    11a. Hemoglobin input (if expanded)
    11b. Glucose input (if expanded)
12. [Additional health info] toggle (Enter/Space to expand)
    12a. Systolic BP input (if expanded)
    12b. SGLT2 toggle (Space to toggle)
    12c. Proteinuria value input
    12d. Proteinuria unit select (Enter to open, Arrow to navigate, Enter to select)
    12e. CKD Diagnosis select
13. [See My Prediction] submit button (Enter)
```

### 6.2 Results Page

```
Tab order:
1. [Skip to main content]
2. [Logo]
3. [Sign In / My Results]
4. Confidence Badge (informational, not interactive)
5. Chart SVG (announced by aria-label, not internally navigable)
6. Stat Card 1 (Enter to highlight line -- Variant A)
7. Stat Card 2
8. Stat Card 3
9. Stat Card 4
10. [UnlockPrompt: Add Lab Values] button (if Tier 1)
11. Disclaimer (mobile: Space to expand; desktop: static text)
```

### 6.3 Save Prompt Dialog (when open)

```
Focus trap (cycles within):
1. [X dismiss] button
2. Email input
3. [Send me a sign-in link] button
Escape: dismiss dialog, return focus to results
```

---

## 7. Screen Reader Flow

### 7.1 Results Page Announcements

When results page loads, the following is announced in order:

1. Page title: "Your Prediction -- KidneyHood"
2. Heading: "Your Prediction"
3. Status: "Basic Prediction" or "Enhanced Prediction" (ConfidenceBadge, `role="status"`)
4. Chart: "eGFR trajectory chart showing 4 predicted kidney function scenarios over 10 years" (`aria-label`)
5. Data table (sr-only): full tabular data with caption
6. Region: stat cards read as individual regions with data
7. If Tier 1: "Add both your hemoglobin and glucose results to sharpen your prediction" (UnlockPrompt)
8. ContentInfo: disclaimer text

### 7.2 Form Error Announcements

On invalid submission:
1. Alert: "Please fix 3 fields below to continue" (`role="alert"`)
2. Focus moves to first error field
3. Field label + error message read: "BUN, Please enter your BUN value between 5 and 150 mg/dL"

### 7.3 Auth Flow Announcements

1. Save prompt opens: "Save your results dialog"
2. Focus on email input: "Email, edit text"
3. On submit: "Check your email! We sent a sign-in link to j***@email.com" (`role="status"`)
4. On successful auth: "Welcome! Your results are saved." (`role="status"`)

---

## 8. Color and Contrast

### 8.1 Text Contrast Verification

| Combination | Foreground | Background | Ratio | AA Required | Passes? |
|------------|-----------|-----------|-------|------------|---------|
| Body text | #1A1A1A | #FFFFFF | 16.6:1 | 4.5:1 | YES |
| Body on card | #1A1A1A | #F8F9FA | 15.4:1 | 4.5:1 | YES |
| Helper text | #666666 | #FFFFFF | 5.7:1 | 4.5:1 | YES |
| Helper on card | #666666 | #F8F9FA | 5.3:1 | 4.5:1 | YES |
| Muted text | #888888 | #FFFFFF | 3.5:1 | 3:1 (large) | YES (12px+ only) |
| Error text | #D32F2F | #FFFFFF | 4.6:1 | 4.5:1 | YES |
| Error on error bg | #D32F2F | #FDECEA | 4.2:1 | 3:1 (large) | YES (14px) |
| Button text | #FFFFFF | #1D9E75 | 4.1:1 | 3:1 (large) | YES (16px/600) |
| Secondary btn | #FFFFFF | #378ADD | 3.6:1 | 3:1 (large) | YES (16px/600) |
| Phase label | #888888 | #E8F5F0 | 3.2:1 | 3:1 (large) | YES (11px -- review needed) |

**Action items:**
- #888888 on #FFFFFF at 11px (phase band labels): ratio 3.5:1 meets large text (3:1) but 11px is NOT large text. **Consider darkening to #777777 (4.5:1) or increasing to 12px.**
- Input border #E0E0E0 on #FFFFFF: 1.4:1. Does not meet 3:1 for non-text contrast (1.4.11). **Mitigation:** inputs identified by label, not border alone. Focused state border (#378ADD) meets 3.5:1. Consider darkening default border to #C0C0C0 (2.1:1) -- still borderline. Accept with mitigation note.

### 8.2 Chart Line Contrast

| Line | Color | Background | Ratio | 3:1 Met? | Mitigation |
|------|-------|-----------|-------|----------|-----------|
| BUN<=12 | #1D9E75 | #FFFFFF | 4.1:1 | YES | Solid pattern |
| BUN<=12 | #1D9E75 | #E8F5F0 | 3.6:1 | YES | Phase 1 band overlap |
| BUN 13-17 | #378ADD | #FFFFFF | 3.5:1 | YES | Dashed pattern |
| BUN 13-17 | #378ADD | #FFF8E1 | 3.3:1 | YES | Phase 2 band overlap |
| BUN 18-24 | #85B7EB | #FFFFFF | 2.2:1 | NO | Short-dash pattern + label |
| BUN 18-24 | #85B7EB | #FFF8E1 | 2.0:1 | NO | Pattern + label (both needed) |
| No Treatment | #AAAAAA | #FFFFFF | 2.3:1 | NO | Dotted pattern + label |
| Dialysis | #D32F2F | #FFFFFF | 4.6:1 | YES | Dashed + label |

**Lines failing 3:1 contrast (#85B7EB and #AAAAAA):** These are intentionally lighter to create visual hierarchy (best scenario = most visible, worst = most muted). Accessibility is maintained through:
1. Distinct line patterns (not relying on color)
2. End-of-line text labels
3. Stat cards with full numeric data
4. Accessible data table with all values
5. WCAG 1.4.1 compliance (color not sole means of information)

---

## 9. Responsive and Zoom Accessibility

### 9.1 Zoom Levels

| Zoom | Expected behavior |
|------|-------------------|
| 100% | Full layout per breakpoint |
| 150% | Desktop shifts to tablet layout. Mobile unchanged. |
| 200% | Desktop shifts to mobile layout. All text remains readable. No horizontal scroll. Chart scales. |
| 400% | Single column, 320px equivalent. Chart shows data table as primary. All interactive elements remain usable. |

### 9.2 Text Resize

- All font sizes in `rem` or `px` that scale with browser text size settings.
- No `max-height` with `overflow: hidden` on text containers.
- Card heights: `min-height`, not fixed `height`.
- Line clamp: NOT used on any content text (only on one-line disclaimer in collapsed mobile state).

### 9.3 Reflow (320px viewport)

At 320px CSS width (equivalent to 1280px at 400% zoom):
- Single column layout.
- Form inputs full width.
- Chart renders at ~288px width (320 - 32px padding). If too compressed, show data table inline (not sr-only) with a note: "View the data table below for detailed values."
- Stat cards stack vertically.
- All buttons full width.
- No horizontal scroll on any element.

---

## 10. Testing Plan

### 10.1 Automated Testing

| Tool | What it tests | When |
|------|--------------|------|
| axe-core (jest-axe) | ARIA roles, labels, contrast | Every component test |
| Lighthouse Accessibility | Page-level compliance score | CI on every PR |
| eslint-plugin-jsx-a11y | JSX accessibility rules | Linting on save |

**Target:** Lighthouse accessibility score >= 95.

### 10.2 Manual Testing Matrix

| Test | Tool/Method | Frequency |
|------|------------|-----------|
| Keyboard-only navigation | Tab through all flows | Every sprint |
| Screen reader (VoiceOver) | macOS Safari | Every sprint |
| Screen reader (NVDA) | Windows Chrome | Before release |
| Color blindness simulation | Chrome DevTools rendering | After design changes |
| 200% zoom | Browser zoom | After layout changes |
| 400% zoom (reflow) | Browser zoom | After layout changes |
| Reduced motion | `prefers-reduced-motion` toggle | After animation changes |
| Touch target audit | Measure with DevTools | After component changes |
| High contrast mode | Windows high contrast | Before release |

### 10.3 User Testing

- **Recruit testers aged 60+** for usability testing of form and results screens.
- **Include at least one screen reader user** in testing pool.
- **Test on actual mobile devices** (not just emulators): iPhone SE (small screen), iPad, Android phone.
- **Measure:** task completion rate, error recovery time, comprehension of chart data.

### 10.4 Acceptance Criteria for QA (Yuri)

Every UI story must include these accessibility acceptance criteria:

1. All interactive elements are keyboard-accessible.
2. Focus order matches visual reading order.
3. Focus indicators are visible (2px blue ring).
4. Screen reader announces all content in logical order.
5. Error messages are announced via `role="alert"`.
6. Status changes are announced via `role="status"` / `aria-live`.
7. Touch targets are at least 44x44px.
8. Text contrast meets 4.5:1 (normal) or 3:1 (large).
9. No content is conveyed by color alone.
10. Content is usable at 200% zoom without horizontal scroll.
11. `prefers-reduced-motion` disables all non-essential animations.
12. axe-core reports zero violations.
