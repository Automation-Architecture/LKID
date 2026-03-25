# KidneyHood Wireframes

**Author:** Inga (Senior UX/UI Designer)
**Version:** 1.0 -- Discovery Phase Draft
**Date:** 2026-03-25
**Status:** Draft for team review

All wireframes are text-based representations at three breakpoints: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px).

---

## Table of Contents

1. [Landing Page](#1-landing-page)
2. [Prediction Form](#2-prediction-form)
3. [Loading State](#3-loading-state)
4. [Results Screen](#4-results-screen)
5. [Save Prompt (Overlay)](#5-save-prompt)
6. [Sign-In Screen](#6-sign-in-screen)
7. [Magic Link Sent](#7-magic-link-sent)
8. [Expired Link Screen](#8-expired-link-screen)
9. [Guest Data Expired](#9-guest-data-expired)
10. [Error States](#10-error-states)

---

## 1. Landing Page

### Mobile (<768px)

```
+----------------------------------+
| [Logo]              [Sign In]    |  48px header
+----------------------------------+
|                                  |
|        [Hero illustration]       |  160px
|                                  |
|   Understand Your Kidney         |  28px/700
|   Health Trajectory              |
|                                  |
|   Enter your lab values to see   |  16px/400
|   how your kidney health may     |
|   change over the next 10 years. |
|                                  |
|   +----------------------------+ |
|   |    Get Started             | |  48px height
|   +----------------------------+ |  primary button
|                                  |
|   16px padding all sides         |
+----------------------------------+
| [Sticky disclaimer: 1 line]     |  44px min
| [tap to expand ^]                |
+----------------------------------+
```

### Tablet (768-1024px)

```
+----------------------------------------------+
| [Logo]                          [Sign In]    |  56px header
+----------------------------------------------+
|                                              |
|  +------------------+  +------------------+  |
|  |                  |  |                  |  |
|  | [Hero            |  | Understand Your  |  |
|  |  illustration]   |  | Kidney Health    |  |  28px/700
|  |                  |  | Trajectory       |  |
|  |  240px           |  |                  |  |
|  |                  |  | Enter your lab   |  |  16px/400
|  |                  |  | values to see... |  |
|  |                  |  |                  |  |
|  |                  |  | [Get Started]    |  |  48px button
|  +------------------+  +------------------+  |
|                                              |
|  24px horizontal padding                     |
+----------------------------------------------+
| Disclaimer (inline, full text)               |
| [About] [Privacy] [Terms]                    |
+----------------------------------------------+
```

### Desktop (>1024px)

```
+--------------------------------------------------------------+
| [Logo]                                          [Sign In]    |  64px header
+--------------------------------------------------------------+
|                        max-width: 960px                      |
|  +------------------------+  +----------------------------+  |
|  |                        |  |                            |  |
|  |  [Hero illustration]  |  |  Understand Your Kidney    |  |  28px/700
|  |                        |  |  Health Trajectory         |  |
|  |  400px x 300px         |  |                            |  |
|  |                        |  |  Enter your lab values to  |  |  16px/400
|  |                        |  |  see how your kidney       |  |
|  |                        |  |  health may change over    |  |
|  |                        |  |  the next 10 years.        |  |
|  |                        |  |                            |  |
|  |                        |  |  [Get Started]             |  |  48px button
|  +------------------------+  +----------------------------+  |
|          50%                          50%                     |
|                                                              |
+--------------------------------------------------------------+
| Disclaimer (inline, full text)                               |
| [About] [Privacy] [Terms]                                    |
+--------------------------------------------------------------+
```

---

## 2. Prediction Form

### Mobile (<768px)

```
+----------------------------------+
| [Logo]              [Sign In]    |
+----------------------------------+
|                                  |
|  Enter Your Lab Values           |  20px/600
|                                  |
|  REQUIRED FIELDS                 |  12px/400 uppercase
|  ................................ |
|                                  |
|  Age *                           |  16px label
|  +----------------------------+  |
|  |                            |  |  48px input
|  +----------------------------+  |
|  years                           |  14px helper
|                                  |
|  Sex *                           |  16px label
|  ( ) Male                        |  44px touch target
|  ( ) Female                      |  each radio
|  ( ) Prefer not to say           |
|                                  |
|  BUN *                           |
|  +----------------------------+  |
|  |                            |  |  48px input
|  +----------------------------+  |
|  mg/dL -- Normal range: 7-20    |  14px helper
|                                  |
|  Creatinine *                    |
|  +----------------------------+  |
|  |                            |  |  48px input
|  +----------------------------+  |
|  mg/dL -- Normal range: 0.6-1.2 |
|                                  |
|  Potassium *                     |
|  +----------------------------+  |
|  |                            |  |  48px input
|  +----------------------------+  |
|  mEq/L -- Normal range: 3.5-5.0 |
|                                  |
|  ................................ |
|                                  |
|  [v] Sharpen your prediction     |  collapsible
|  +----------------------------+  |  section
|  | Hemoglobin                 |  |
|  | +------------------------+|  |
|  | |                        ||  |  48px
|  | +------------------------+|  |
|  | g/dL                      |  |
|  |                           |  |
|  | Glucose                   |  |
|  | +------------------------+|  |
|  | |                        ||  |  48px
|  | +------------------------+|  |
|  | mg/dL                     |  |
|  |                           |  |
|  | "Add both to sharpen     |  |  14px muted
|  |  your prediction."       |  |
|  +----------------------------+  |
|                                  |
|  [v] Additional health info      |  collapsible
|  +----------------------------+  |
|  | Systolic BP               |  |
|  | +------------------------+|  |
|  | |                        ||  |
|  | +------------------------+|  |
|  | mmHg                      |  |
|  |                           |  |
|  | SGLT2 Inhibitor           |  |
|  | [=====OFF]   toggle       |  |  44px toggle
|  |                           |  |
|  | Proteinuria               |  |
|  | +----------+ +----------+|  |
|  | | value    | | mg/g  v  ||  |  48px side-by-side
|  | +----------+ +----------+|  |
|  |                           |  |
|  | CKD Diagnosis             |  |
|  | +------------------------+|  |
|  | | Select type...      v  ||  |  48px select
|  | +------------------------+|  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  |   See My Prediction        |  |  56px, bold
|  +----------------------------+  |  primary button
|                                  |
|  16px padding all sides          |
+----------------------------------+
| [Sticky disclaimer]             |
+----------------------------------+
```

### Tablet (768-1024px)

```
+----------------------------------------------+
| [Logo]                          [Sign In]    |
+----------------------------------------------+
|                                              |
|  Enter Your Lab Values             20px/600  |
|                                              |
|  REQUIRED FIELDS                             |
|  ............................................|
|                                              |
|  +-------------------+  +------------------+ |
|  | Age *             |  | Sex *            | |  2-column
|  | +---------------+ |  | ( ) Male         | |
|  | |               | |  | ( ) Female       | |
|  | +---------------+ |  | ( ) Prefer not   | |
|  | years             |  |     to say       | |
|  +-------------------+  +------------------+ |
|                                              |
|  +-------------------+  +------------------+ |
|  | BUN *             |  | Creatinine *     | |  2-column
|  | +---------------+ |  | +-------------+  | |
|  | |               | |  | |             |  | |
|  | +---------------+ |  | +-------------+  | |
|  | mg/dL  7-20       |  | mg/dL  0.6-1.2  | |
|  +-------------------+  +------------------+ |
|                                              |
|  +-------------------+                       |
|  | Potassium *       |                       |  1-column
|  | +---------------+ |                       |
|  | |               | |                       |
|  | +---------------+ |                       |
|  | mEq/L  3.5-5.0    |                       |
|  +-------------------+                       |
|                                              |
|  [v] Sharpen your prediction (collapsible)   |
|  [v] Additional health info (collapsible)    |
|                                              |
|  +------------------------------------------+|
|  |         See My Prediction                ||  56px
|  +------------------------------------------+|
|                                              |
+----------------------------------------------+
| Disclaimer (inline)                          |
+----------------------------------------------+
```

### Desktop (>1024px)

```
+--------------------------------------------------------------+
| [Logo]                                          [Sign In]    |
+--------------------------------------------------------------+
|                     max-width: 640px (form)                  |
|                     centered                                 |
|                                                              |
|  Enter Your Lab Values                           20px/600   |
|                                                              |
|  REQUIRED FIELDS                                             |
|  ...........................................................  |
|                                                              |
|  +------------------+  +------------------+                  |
|  | Age *            |  | Sex *            |    2-column      |
|  | +-------------+  |  | ( ) Male         |                  |
|  | |             |  |  | ( ) Female       |                  |
|  | +-------------+  |  | ( ) Prefer not   |                  |
|  | years            |  |     to say       |                  |
|  +------------------+  +------------------+                  |
|                                                              |
|  +------------------+  +------------------+                  |
|  | BUN *            |  | Creatinine *     |    2-column      |
|  | +--------+ mg/dL |  | +--------+ mg/dL |                  |
|  | |        |       |  | |        |       |                  |
|  | +--------+       |  | +--------+       |                  |
|  | 7-20 mg/dL       |  | 0.6-1.2 mg/dL   |                  |
|  +------------------+  +------------------+                  |
|                                                              |
|  +------------------+                                        |
|  | Potassium *      |                          1-column      |
|  | +--------+ mEq/L |   (unit inline on desktop)            |
|  | |        |       |                                        |
|  | +--------+       |                                        |
|  | 3.5-5.0 mEq/L    |                                        |
|  +------------------+                                        |
|                                                              |
|  [v] Sharpen your prediction                                 |
|  [v] Additional health info                                  |
|                                                              |
|  +--------------------------------------+                    |
|  |       See My Prediction              |       56px         |
|  +--------------------------------------+                    |
|                                                              |
+--------------------------------------------------------------+
| Disclaimer (inline, full text)                               |
+--------------------------------------------------------------+
```

**Desktop note:** Unit labels appear inline to the right of inputs (not below). Form max-width is 640px to prevent overly wide inputs, centered in the 960px content area.

---

## 3. Loading State

### Mobile (<768px)

```
+----------------------------------+
| [Logo]              [Sign In]    |
+----------------------------------+
|                                  |
|  Your Prediction                 |  20px/600
|                                  |
|  Calculating your prediction...  |  16px/400
|                                  |
|  +----------------------------+  |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  |  skeleton chart
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  |  180px height
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  |  pulsing gray
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  |  skeleton card 1
|  +----------------------------+  |
|  +----------------------------+  |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  |  skeleton card 2
|  +----------------------------+  |
|  +----------------------------+  |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  |  skeleton card 3
|  +----------------------------+  |
|  +----------------------------+  |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  |  skeleton card 4
|  +----------------------------+  |
|                                  |
+----------------------------------+
```

### Desktop (>1024px)

```
+--------------------------------------------------------------+
| [Logo]                                          [Sign In]    |
+--------------------------------------------------------------+
|                     max-width: 960px                         |
|                                                              |
|  Your Prediction                                  20px/600   |
|  Calculating your prediction...                   16px/400   |
|                                                              |
|  +--------------------------------------------------------+  |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |  |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |  |  skeleton
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |  |  chart
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |  |  300px
|  +--------------------------------------------------------+  |
|                                                              |
|  +------------+ +------------+ +------------+ +----------+  |
|  | ~~~~~~~~~~~ | | ~~~~~~~~~~~ | | ~~~~~~~~~~~ | | ~~~~~~~~~ |  |  4-col
|  | ~~~~~~~~~~~ | | ~~~~~~~~~~~ | | ~~~~~~~~~~~ | | ~~~~~~~~~ |  |  skeleton
|  +------------+ +------------+ +------------+ +----------+  |  cards
|                                                              |
+--------------------------------------------------------------+
```

---

## 4. Results Screen

### Mobile (<768px)

```
+----------------------------------+
| [Logo]              [Sign In]    |
+----------------------------------+
|                                  |
|  Your Prediction                 |  20px/600
|                                  |
|  +---[Tier 1: Basic]---------+  |  ConfidenceBadge
|                                  |
|  +----------------------------+  |
|  |  eGFR Trajectory Chart     |  |  chart title 15px/700
|  |  Predicted kidney function |  |  subtitle 12px/400
|  |  over 10 years             |  |
|  |                            |  |
|  |  90|                       |  |
|  |    |  ___                  |  |
|  |  60|./   \___              |  |  chart area
|  |    |         \___          |  |  200px min-height
|  |  30|             \---      |  |
|  |    |                 \     |  |
|  |  15|------ dialysis --|    |  |  dashed red line
|  |    +--+--+--+--+--+--+    |  |
|  |    0  12 24 36 ... 120     |  |  months
|  |                            |  |
|  |  [end-of-line labels]      |  |
|  |  BUN<=12: 48               |  |
|  |  BUN 13-17: 35             |  |
|  |  BUN 18-24: 22             |  |
|  |  No treatment: 18          |  |
|  |                            |  |
|  +----------------------------+  |
|  Data points are plotted at      |  footnote 12px
|  actual time intervals. Early    |
|  measurements are more frequent. |
|                                  |
|  +---[UnlockPrompt]----------+  |  if Tier 1
|  | Add both your hemoglobin  |  |
|  | and glucose results to    |  |
|  | sharpen your prediction.  |  |
|  | [Add Lab Values]          |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | BUN <= 12                  |  |  stat card 1
|  | eGFR at 5yr: 48            |  |  left green border
|  | Dialysis: Not projected    |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | BUN 13-17                  |  |  stat card 2
|  | eGFR at 5yr: 35            |  |  left blue border
|  | Dialysis: ~8 years         |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | BUN 18-24                  |  |  stat card 3
|  | eGFR at 5yr: 22            |  |  left light-blue
|  | Dialysis: ~5 years         |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | No Treatment               |  |  stat card 4
|  | eGFR at 5yr: 18            |  |  left gray border
|  | Dialysis: ~3 years         |  |
|  +----------------------------+  |
|                                  |
+----------------------------------+
| [Medical disclaimer...]    [^]  |  sticky footer
+----------------------------------+
```

### Tablet (768-1024px)

```
+----------------------------------------------+
| [Logo]                          [Sign In]    |
+----------------------------------------------+
|                                              |
|  Your Prediction          [Tier 1: Basic]   |
|                                              |
|  +------------------------------------------+|
|  |  eGFR Trajectory Chart                   ||
|  |  Predicted kidney function over 10 years ||
|  |                                          ||
|  |  [Chart area -- full width, 280px]       ||
|  |                                          ||
|  +------------------------------------------+|
|  Footnote about time intervals               |
|                                              |
|  +---[UnlockPrompt]-- if Tier 1 -----------+|
|                                              |
|  +-------------------+  +------------------+ |
|  | BUN <= 12         |  | BUN 13-17        | |  2x2 grid
|  | eGFR at 5yr: 48   |  | eGFR at 5yr: 35  | |
|  | Dialysis: None    |  | Dialysis: ~8yr   | |
|  +-------------------+  +------------------+ |
|  +-------------------+  +------------------+ |
|  | BUN 18-24         |  | No Treatment     | |
|  | eGFR at 5yr: 22   |  | eGFR at 5yr: 18  | |
|  | Dialysis: ~5yr    |  | Dialysis: ~3yr   | |
|  +-------------------+  +------------------+ |
|                                              |
+----------------------------------------------+
| Disclaimer (inline, full text)               |
+----------------------------------------------+
```

### Desktop (>1024px)

```
+--------------------------------------------------------------+
| [Logo]                                          [Sign In]    |
+--------------------------------------------------------------+
|                     max-width: 960px                         |
|                                                              |
|  Your Prediction                     [Tier 2: Enhanced]     |
|                                                              |
|  +--------------------------------------------------------+  |
|  |  eGFR Trajectory Chart                                 |  |
|  |  Predicted kidney function over 10 years               |  |
|  |                                                        |  |
|  |  90|                                                   |  |
|  |    | Phase 1      Phase 2         Phase 3              |  |
|  |    | (band fill)  (band fill)     (band fill)          |  |
|  |  60|.____                                              |  |
|  |    |     \____                                         |  |  chart
|  |    |          \____                                    |  |  340px
|  |  30|               \____                    BUN<=12:48 |  |
|  |    |                    \____               13-17: 35  |  |
|  |  15|-------dialysis----------\___           18-24: 22  |  |
|  |    |                              \         None:  18  |  |
|  |    +----+----+----+----+----+----+----+----+----+----+ |  |
|  |    0    12   24   36   48   60   72   84   96  108 120 |  |
|  |                     Months                             |  |
|  +--------------------------------------------------------+  |
|  Data points are plotted at actual time intervals.           |
|  Early measurements are more frequent.                       |
|                                                              |
|  +------------+ +------------+ +------------+ +----------+  |
|  | BUN <= 12  | | BUN 13-17  | | BUN 18-24  | | No       |  |  4-col
|  |            | |            | |            | | Treatment|  |  grid
|  | eGFR: 48   | | eGFR: 35   | | eGFR: 22   | | eGFR: 18 |  |
|  | Dialysis:  | | Dialysis:  | | Dialysis:  | | Dialysis:|  |
|  | Not proj.  | | ~8 years   | | ~5 years   | | ~3 years |  |
|  +------------+ +------------+ +------------+ +----------+  |
|                                                              |
+--------------------------------------------------------------+
| Disclaimer (inline): This tool provides educational          |
| predictions only and is not a substitute for medical advice. |
| [About] [Privacy] [Terms]                                    |
+--------------------------------------------------------------+
```

---

## 5. Save Prompt

Appears as a slide-up overlay card 2 seconds after results render. Dismissible.

### Mobile (<768px)

```
+----------------------------------+
|  (Results screen dimmed behind)  |
|                                  |
|                                  |
|  +----------------------------+  |
|  |                        [X] |  |  dismiss button
|  |  Save your results         |  |  20px/600
|  |                            |  |
|  |  Your results will be      |  |  16px/400
|  |  available for 24 hours.   |  |
|  |  Create a free account to  |  |
|  |  save them permanently.    |  |
|  |                            |  |
|  |  +------------------------+|  |
|  |  | your@email.com         ||  |  48px input
|  |  +------------------------+|  |
|  |                            |  |
|  |  +------------------------+|  |
|  |  | Send me a sign-in link ||  |  48px button
|  |  +------------------------+|  |
|  +----------------------------+  |
+----------------------------------+
```

### Desktop (>1024px)

```
+--------------------------------------------------------------+
|  (Results screen visible behind)                             |
|                                                              |
|              +------------------------------------+          |
|              |                                [X] |          |
|              |  Save your results       20px/600 |          |
|              |                                    |          |
|              |  Your results will be available    |          |
|              |  for 24 hours. Create a free       |          |
|              |  account to save them permanently. |          |
|              |                                    |          |
|              |  +-------------+ +---------------+ |          |
|              |  | email       | | Send link     | |          |
|              |  +-------------+ +---------------+ |          |
|              +------------------------------------+          |
|                  max-width: 480px, centered                  |
+--------------------------------------------------------------+
```

---

## 6. Sign-In Screen

### Mobile (<768px)

```
+----------------------------------+
| [Logo]              [Sign In]    |
+----------------------------------+
|                                  |
|  Welcome back                    |  20px/600
|                                  |
|  Enter your email to sign in.    |  16px/400
|                                  |
|  Email                           |
|  +----------------------------+  |
|  | your@email.com             |  |  48px input
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Send me a sign-in link     |  |  48px button
|  +----------------------------+  |
|                                  |
|  No account? Enter your lab      |  14px muted
|  values first, then save.        |
|  [Get Started]                   |  text link
|                                  |
+----------------------------------+
```

---

## 7. Magic Link Sent

### Mobile (<768px)

```
+----------------------------------+
| [Logo]              [Sign In]    |
+----------------------------------+
|                                  |
|        [Email icon]              |  48px icon
|                                  |
|  Check your email!               |  20px/600
|                                  |
|  We sent a sign-in link to       |  16px/400
|  j***@email.com                  |  16px/600
|                                  |
|  The link expires in 15 minutes. |  14px muted
|                                  |
|  +----------------------------+  |
|  | Resend link                |  |  48px secondary
|  +----------------------------+  |  btn (disabled
|  (available in 58 seconds)       |   60s countdown)
|                                  |
|  Didn't receive it?             |  14px muted
|  Check your spam folder.         |
|                                  |
+----------------------------------+
```

---

## 8. Expired Link Screen

### Mobile (<768px)

```
+----------------------------------+
| [Logo]              [Sign In]    |
+----------------------------------+
|                                  |
|        [Warning icon]            |  48px icon
|                                  |
|  This sign-in link has expired   |  20px/600
|                                  |
|  Sign-in links are valid for     |  16px/400
|  15 minutes for your security.   |
|                                  |
|  +----------------------------+  |
|  | Send a new link            |  |  48px primary
|  +----------------------------+  |
|                                  |
|  [Back to home]                  |  text link
|                                  |
+----------------------------------+
```

---

## 9. Guest Data Expired

### Mobile (<768px)

```
+----------------------------------+
| [Logo]              [Sign In]    |
+----------------------------------+
|                                  |
|        [Clock icon]              |  48px icon
|                                  |
|  Your previous results           |  20px/600
|  have expired                    |
|                                  |
|  Guest results are available     |  16px/400
|  for 24 hours. Create a free     |
|  account to save your results    |
|  permanently.                    |
|                                  |
|  +----------------------------+  |
|  | Enter New Lab Values       |  |  48px primary
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Create an Account          |  |  48px secondary
|  +----------------------------+  |
|                                  |
+----------------------------------+
```

---

## 10. Error States

### 10a: Form Validation Errors (Mobile)

```
+----------------------------------+
| [Logo]              [Sign In]    |
+----------------------------------+
|                                  |
|  +----------------------------+  |
|  | (!) Please fix 3 fields    |  |  error summary
|  |     below to continue      |  |  banner (pink bg)
|  +----------------------------+  |
|                                  |
|  Age *                           |
|  +----------------------------+  |
|  |  abc                       |  |  red border
|  +----------------------------+  |  pink background
|  Please enter a valid age        |  red 14px error
|  (18-120 years)                  |
|                                  |
|  Sex *                           |
|  ( ) Male                        |  no error
|  (o) Female                      |  (valid)
|  ( ) Prefer not to say           |
|                                  |
|  BUN *                           |
|  +----------------------------+  |
|  |                            |  |  red border
|  +----------------------------+  |  (empty)
|  Please enter your BUN value     |
|  (between 5 and 150 mg/dL)      |
|                                  |
+----------------------------------+
```

### 10b: Server Error Toast (Mobile)

```
+----------------------------------+
| [Logo]              [Sign In]    |
+----------------------------------+
| +------------------------------+ |
| | (!) Something went wrong.    | |  toast banner
| |     Please try again.        | |  at top
| |                  [Try Again] | |  auto-dismiss 8s
| +------------------------------+ |
|                                  |
|  (Form remains with all values   |
|   preserved -- no data loss)     |
|                                  |
+----------------------------------+
```

---

## Spacing Reference

All wireframes use these consistent spacing values:

| Element | Value |
|---------|-------|
| Page horizontal padding (mobile) | 16px |
| Page horizontal padding (tablet) | 24px |
| Page horizontal padding (desktop) | 32px (within max-width) |
| Content max-width (desktop) | 960px |
| Form max-width (desktop) | 640px |
| Section gap | 32px |
| Field gap (vertical) | 16px (tablet/desktop), 12px (mobile) |
| Card gap | 16px |
| Input height | 48px |
| Button height (primary) | 48px (standard), 56px (form submit) |
| Touch target minimum | 44px x 44px |
| Header height | 48px (mobile), 56px (tablet), 64px (desktop) |
