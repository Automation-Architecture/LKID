# KidneyHood Wireframes -- Lean Launch

**Author:** Inga (Senior UX/UI Designer)
**Version:** 2.0 -- Lean Launch Revision
**Date:** 2026-03-25
**Status:** Revised for LKID-32
**Replaces:** v1.0 (Discovery Phase Draft)

Wireframes for all 7 lean launch screens at 3 breakpoints: Mobile (<768px), Tablet (768-1024px), Desktop (>1024px). Old-scope screens (Save Prompt, Sign-In, Guest Data Expired, Account, Dashboard, History, Settings) have been removed.

---

## Design Foundation

| Property | Value |
|----------|-------|
| Grid | 8px base grid |
| Font | Inter (system sans-serif fallback) |
| Content max-width | 960px |
| Form max-width | 640px |
| Auth card max-width | 400px |
| Breakpoints | Mobile <768px, Tablet 768-1024px, Desktop >1024px |
| Input height | 48px (all breakpoints) |
| Standard button height | 48px |
| Submit button height | 56px |
| Touch target minimum | 44px x 44px |
| Header height | 48px (mobile), 56px (tablet), 64px (desktop) |

### Spacing Reference

| Context | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Page horizontal padding | 16px | 24px | 32px (within max-width) |
| Section gap | 24px | 32px | 32px |
| Field gap (vertical) | 12px | 16px | 16px |
| Card padding | 16px | 16px | 24px |
| Label-to-input gap | 6px | 6px | 6px |
| Input-to-helper gap | 4px | 4px | 4px |

---

## Table of Contents

1. [Landing Page](#1-landing-page)
2. [Email Entry](#2-email-entry)
3. [Magic Link Sent](#3-magic-link-sent)
4. [Expired / Invalid Link](#4-expired--invalid-link)
5. [Prediction Form](#5-prediction-form)
6. [Loading State](#6-loading-state)
7. [Results](#7-results)
8. [Error States](#8-error-states)

---

## 1. Landing Page

**Route:** `/`
**Auth:** None
**Purpose:** Single CTA hero to funnel users into the email entry flow.

### Mobile (<768px)

```
+------------------------------------+
| [Logo]                             |  h=48px
+------------------------------------+
|  p=16px                            |
|                                    |
|  Understand Your Kidney            |  28px/700, #1A1A1A
|  Health Trajectory                 |  line-height: 34px
|                                    |  letter-spacing: -0.02em
|                                    |  mt=32px
|                                    |
|  Enter your lab values to see      |  16px/400, #1A1A1A
|  how your kidney health may        |  line-height: 24px
|  change over the next 10 years.    |  mt=16px
|                                    |
|  +--------------------------------+|
|  |         Get Started            ||  h=48px, w=100%
|  +--------------------------------+|  bg=#1D9E75, text=#FFF
|                                    |  16px/600, rounded-lg (8px)
|                                    |  mt=24px
|                                    |
+------------------------------------+
| [Medical disclaimer...]      [^]  |  sticky bottom bar
| (tap to expand)                    |  h=44px min, bg=#F8F9FA
+------------------------------------+  shadow-up, 14px/400 #666
```

**Notes:**
- No hero illustration on mobile (text-only for fast LCP)
- No "Sign In" link in header (no accounts in lean launch)
- CTA button: full-width, primary color, 48px height
- Disclaimer: sticky collapsed bar, `aria-expanded="false"`, tap to expand full text

### Tablet (768-1024px)

```
+------------------------------------------------+
| [Logo]                                         |  h=56px
+------------------------------------------------+
|  p=24px                                        |
|                                                |
|  +--------------------+  +--------------------+|
|  |                    |  |                    ||
|  | [Hero illustration]|  | Understand Your    ||  28px/700
|  |                    |  | Kidney Health      ||
|  |  240px x 180px     |  | Trajectory         ||
|  |  aspect-ratio 4:3  |  |                    ||
|  |                    |  | Enter your lab     ||  16px/400
|  |                    |  | values to see how  ||
|  |                    |  | your kidney health ||
|  |                    |  | may change over    ||
|  |                    |  | the next 10 years. ||
|  |                    |  |                    ||
|  |                    |  | +----------------+ ||
|  |                    |  | | Get Started    | ||  h=48px, auto-width
|  |                    |  | +----------------+ ||  min-w=200px
|  +--------------------+  +--------------------+|
|       50%                      50%              |
|                                                |
+------------------------------------------------+
| Disclaimer (inline, full text)                 |  14px/400 #666
| [About] [Privacy] [Terms]                      |  text links, 14px
+------------------------------------------------+
```

**Notes:**
- 2-column layout: hero left (50%), copy + CTA right (50%)
- Hero: 240x180px placeholder, `aspect-ratio: 4/3`
- CTA: auto-width button, min-width 200px
- Disclaimer: inline full text (not sticky), footer links below

### Desktop (>1024px)

```
+------------------------------------------------------------------+
| [Logo]                                                           |  h=64px
+------------------------------------------------------------------+
|                       max-width: 960px, centered                 |
|  p=32px                                                          |
|                                                                  |
|  +---------------------------+  +-------------------------------+|
|  |                           |  |                               ||
|  |  [Hero illustration]     |  |  Understand Your Kidney       ||  28px/700
|  |                           |  |  Health Trajectory            ||
|  |  400px x 300px            |  |                               ||
|  |  aspect-ratio 4:3         |  |  Enter your lab values to see ||  16px/400
|  |                           |  |  how your kidney health may   ||
|  |                           |  |  change over the next 10      ||
|  |                           |  |  years.                       ||
|  |                           |  |                               ||
|  |                           |  |  +-------------------------+  ||
|  |                           |  |  |     Get Started         |  ||  h=48px
|  |                           |  |  +-------------------------+  ||  auto-width
|  +---------------------------+  +-------------------------------+|  min-w=200px
|          50%                            50%                      |
|                                                                  |
+------------------------------------------------------------------+
| Disclaimer (inline, full text)                                   |  14px/400 #666
| [About] [Privacy] [Terms]                                        |
+------------------------------------------------------------------+
```

**Notes:**
- Same 2-column structure as tablet but wider hero (400x300px)
- Content area capped at 960px, centered with auto margins
- 32px padding inside content area
- CTA auto-width, not full-width

---

## 2. Email Entry

**Route:** `/auth`
**Auth:** None
**Purpose:** Bot gate + email capture. Single email field in a centered card.

### Mobile (<768px)

```
+------------------------------------+
| [Logo]                             |  h=48px
+------------------------------------+
|  p=16px                            |
|                                    |
|  Get Started                       |  20px/600, #1A1A1A
|                                    |  mt=32px
|                                    |
|  Enter your email to receive       |  16px/400, #1A1A1A
|  a secure sign-in link.            |  mt=8px
|                                    |
|  Email                             |  16px/600, #1A1A1A (label)
|  +--------------------------------+|  mb=6px (label-to-input)
|  | your@email.com                 ||  h=48px, 16px/400
|  +--------------------------------+|  border: 1px #E0E0E0
|                                    |  rounded-md (6px)
|                                    |  autocomplete="email"
|                                    |  inputmode="email"
|                                    |
|  +--------------------------------+|
|  |  Send me a sign-in link       ||  h=48px, w=100%
|  +--------------------------------+|  bg=#1D9E75, text=#FFF
|                                    |  16px/600, rounded-lg
|                                    |  mt=16px
|                                    |
+------------------------------------+
```

**Notes:**
- No card wrapper on mobile; content fills full width with 16px padding
- Input: `autocomplete="email"`, `inputmode="email"`, prevents iOS zoom at 16px
- Button shows spinner (16px) replacing text while Clerk sends
- Error state: red border (2px #D32F2F), pink bg (#FDECEA), error text below (14px/400 #D32F2F)

### Tablet (768-1024px)

```
+------------------------------------------------+
| [Logo]                                         |  h=56px
+------------------------------------------------+
|                                                |
|       +----------------------------------+     |
|       | max-width: 400px, centered       |     |  card bg=#FFFFFF
|       |  p=24px                          |     |  border: 1px #E0E0E0
|       |                                  |     |  rounded-xl (12px)
|       |  Get Started                     |     |  20px/600
|       |                                  |     |
|       |  Enter your email to receive     |     |  16px/400
|       |  a secure sign-in link.          |     |
|       |                                  |     |
|       |  Email                           |     |  16px/600 (label)
|       |  +----------------------------+  |     |
|       |  | your@email.com             |  |     |  h=48px
|       |  +----------------------------+  |     |
|       |                                  |     |
|       |  +----------------------------+  |     |
|       |  | Send me a sign-in link     |  |     |  h=48px, w=100%
|       |  +----------------------------+  |     |  primary button
|       +----------------------------------+     |
|                                                |
+------------------------------------------------+
```

**Notes:**
- Card wrapper: max-width 400px, horizontally + vertically centered
- Card: white bg, 1px border, 12px radius, 24px internal padding
- Vertically centered using flexbox `items-center justify-center min-h-[calc(100vh-56px)]`

### Desktop (>1024px)

```
+------------------------------------------------------------------+
| [Logo]                                                           |  h=64px
+------------------------------------------------------------------+
|                                                                  |
|                +----------------------------------+              |
|                | max-width: 400px, centered       |              |  card bg=#FFFFFF
|                |  p=24px                          |              |  shadow-md
|                |                                  |              |  rounded-xl (12px)
|                |  Get Started                     |              |  20px/600
|                |                                  |              |
|                |  Enter your email to receive     |              |  16px/400
|                |  a secure sign-in link.          |              |
|                |                                  |              |
|                |  Email                           |              |  16px/600 (label)
|                |  +----------------------------+  |              |
|                |  | your@email.com             |  |              |  h=48px
|                |  +----------------------------+  |              |
|                |                                  |              |
|                |  +----------------------------+  |              |
|                |  | Send me a sign-in link     |  |              |  h=48px, w=100%
|                |  +----------------------------+  |              |
|                +----------------------------------+              |
|                                                                  |
+------------------------------------------------------------------+
```

**Notes:**
- Identical to tablet layout but with shadow-md on card and 64px header
- Vertically centered: `min-h-[calc(100vh-64px)]`

---

## 3. Magic Link Sent

**Route:** `/auth` (same route, view swap)
**Auth:** None
**Purpose:** Confirmation screen with deep-link buttons for 60+ users to find their email easily.

### Mobile (<768px)

```
+------------------------------------+
| [Logo]                             |  h=48px
+------------------------------------+
|  p=16px, text-center               |
|                                    |
|         [Email icon]               |  48px, #1D9E75
|                                    |  mt=32px
|                                    |
|  Check your email!                 |  20px/600, #1A1A1A
|                                    |  mt=16px
|                                    |
|  We sent a sign-in link to         |  16px/400, #1A1A1A
|  j***@email.com                    |  16px/600, #1A1A1A (masked)
|                                    |  mt=8px
|                                    |
|  The link expires in 15 minutes.   |  14px/400, #666666
|                                    |  mt=8px
|                                    |
|  +--------------------------------+|
|  | [Gmail icon] Open Gmail        ||  h=48px, w=100%
|  +--------------------------------+|  border: 1px #E0E0E0
|                                    |  bg=#FFF, text=#1A1A1A
|                                    |  16px/500, rounded-lg
|                                    |  mt=24px (secondary btn)
|                                    |
|  +--------------------------------+|
|  | [Outlook icon] Open Outlook    ||  h=48px, w=100%
|  +--------------------------------+|  same style as Gmail btn
|                                    |  mt=12px
|                                    |
|  +--------------------------------+|
|  | Resend link                    ||  h=48px, w=100%
|  +--------------------------------+|  text-only button, #666
|  (available in 58 seconds)         |  14px/400, #666666
|                                    |  mt=24px
|                                    |  aria-disabled during 60s
|                                    |
|  Didn't receive it?               |  14px/400, #666666
|  Check your spam folder.           |  mt=16px
|                                    |
+------------------------------------+
```

**Notes:**
- Deep-link URLs: Gmail `https://mail.google.com/mail/`, Outlook `https://outlook.live.com/mail/`
- Deep-link buttons: secondary style (white bg, border), with provider icon (20px) left-aligned
- Resend button: `aria-disabled="true"` during 60s cooldown, countdown updates every second
- Countdown text: "(available in Xs)" pattern, `aria-label="Resend link, available in X seconds"`
- Email masked for privacy: first char + *** + @ + domain

### Tablet (768-1024px)

```
+------------------------------------------------+
| [Logo]                                         |  h=56px
+------------------------------------------------+
|                                                |
|       +----------------------------------+     |
|       | max-width: 400px, centered       |     |  card bg=#FFFFFF
|       |  p=24px, text-center             |     |  border: 1px #E0E0E0
|       |                                  |     |  rounded-xl (12px)
|       |         [Email icon]             |     |  48px, #1D9E75
|       |                                  |     |
|       |  Check your email!               |     |  20px/600
|       |                                  |     |
|       |  We sent a sign-in link to       |     |  16px/400
|       |  j***@email.com                  |     |  16px/600
|       |                                  |     |
|       |  The link expires in 15 min.     |     |  14px/400, #666
|       |                                  |     |
|       |  +----------------------------+  |     |
|       |  | [Gmail] Open Gmail         |  |     |  h=48px, secondary
|       |  +----------------------------+  |     |
|       |  +----------------------------+  |     |
|       |  | [Outlook] Open Outlook     |  |     |  h=48px, secondary
|       |  +----------------------------+  |     |
|       |                                  |     |
|       |  [Resend link]                   |     |  text btn, disabled 60s
|       |  (available in 58 seconds)       |     |  14px/400 #666
|       |                                  |     |
|       |  Didn't receive it?             |     |
|       |  Check your spam folder.         |     |
|       +----------------------------------+     |
|                                                |
+------------------------------------------------+
```

### Desktop (>1024px)

```
+------------------------------------------------------------------+
| [Logo]                                                           |  h=64px
+------------------------------------------------------------------+
|                                                                  |
|                +----------------------------------+              |
|                | max-width: 400px, centered       |              |  card bg=#FFFFFF
|                |  p=24px, text-center             |              |  shadow-md
|                |                                  |              |  rounded-xl (12px)
|                |         [Email icon]             |              |  48px, #1D9E75
|                |                                  |              |
|                |  Check your email!               |              |  20px/600
|                |                                  |              |
|                |  We sent a sign-in link to       |              |  16px/400
|                |  j***@email.com                  |              |  16px/600
|                |                                  |              |
|                |  The link expires in 15 min.     |              |  14px/400, #666
|                |                                  |              |
|                |  +----------------------------+  |              |
|                |  | [Gmail] Open Gmail         |  |              |  h=48px
|                |  +----------------------------+  |              |
|                |  +----------------------------+  |              |
|                |  | [Outlook] Open Outlook     |  |              |  h=48px
|                |  +----------------------------+  |              |
|                |                                  |              |
|                |  [Resend link]                   |              |  text btn
|                |  (available in 58 seconds)       |              |
|                |                                  |              |
|                |  Didn't receive it?             |              |
|                |  Check your spam folder.         |              |
|                +----------------------------------+              |
|                                                                  |
+------------------------------------------------------------------+
```

**Notes:**
- Same layout as tablet, max-width 400px card centered
- Desktop adds shadow-md to card
- All three breakpoints use the same 400px card structure

---

## 4. Expired / Invalid Link

**Route:** `/auth` (expired view)
**Auth:** None
**Purpose:** Inform user their magic link has expired or is invalid. Provide clear recovery path.

### Mobile (<768px)

```
+------------------------------------+
| [Logo]                             |  h=48px
+------------------------------------+
|  p=16px, text-center               |
|                                    |
|         [Warning icon]             |  48px, #D32F2F
|                                    |  mt=32px
|                                    |
|  This link has expired             |  20px/600, #1A1A1A
|                                    |  mt=16px
|                                    |
|  Sign-in links are valid for       |  16px/400, #1A1A1A
|  15 minutes for your security.     |  mt=8px
|                                    |
|  +--------------------------------+|
|  |    Send a new link             ||  h=48px, w=100%
|  +--------------------------------+|  bg=#1D9E75, text=#FFF
|                                    |  16px/600, rounded-lg
|                                    |  mt=24px (primary)
|                                    |
|  Back to home                      |  16px/400, #378ADD
|                                    |  text link, underline
|                                    |  mt=16px
|                                    |  min-h=44px touch target
|                                    |
+------------------------------------+
```

### Tablet (768-1024px)

```
+------------------------------------------------+
| [Logo]                                         |  h=56px
+------------------------------------------------+
|                                                |
|       +----------------------------------+     |
|       | max-width: 400px, centered       |     |  card bg=#FFFFFF
|       |  p=24px, text-center             |     |  border: 1px #E0E0E0
|       |                                  |     |  rounded-xl (12px)
|       |         [Warning icon]           |     |  48px, #D32F2F
|       |                                  |     |
|       |  This link has expired           |     |  20px/600
|       |                                  |     |
|       |  Sign-in links are valid for     |     |  16px/400
|       |  15 minutes for your security.   |     |
|       |                                  |     |
|       |  +----------------------------+  |     |
|       |  |   Send a new link          |  |     |  h=48px, primary
|       |  +----------------------------+  |     |
|       |                                  |     |
|       |  Back to home                    |     |  text link, #378ADD
|       +----------------------------------+     |
|                                                |
+------------------------------------------------+
```

### Desktop (>1024px)

```
+------------------------------------------------------------------+
| [Logo]                                                           |  h=64px
+------------------------------------------------------------------+
|                                                                  |
|                +----------------------------------+              |
|                | max-width: 400px, centered       |              |  card bg=#FFFFFF
|                |  p=24px, text-center             |              |  shadow-md
|                |                                  |              |  rounded-xl (12px)
|                |         [Warning icon]           |              |  48px, #D32F2F
|                |                                  |              |
|                |  This link has expired           |              |  20px/600
|                |                                  |              |
|                |  Sign-in links are valid for     |              |  16px/400
|                |  15 minutes for your security.   |              |
|                |                                  |              |
|                |  +----------------------------+  |              |
|                |  |   Send a new link          |  |              |  h=48px, primary
|                |  +----------------------------+  |              |
|                |                                  |              |
|                |  Back to home                    |              |  text link
|                +----------------------------------+              |
|                                                                  |
+------------------------------------------------------------------+
```

**Notes:**
- Same 400px card pattern as Email Entry and Magic Link Sent
- "Send a new link" returns user to Email Entry view (pre-fills email if available)
- "Back to home" links to `/` (landing page)
- Generic message covers both expired (15min timeout) and invalid (consumed/malformed) tokens

---

## 5. Prediction Form

**Route:** `/predict`
**Auth:** Clerk session required
**Purpose:** Collect name + 4 lab values. Email pre-filled from Clerk session (read-only).

### Mobile (<768px)

```
+------------------------------------+
| [Logo]                             |  h=48px
+------------------------------------+
|  p=16px                            |
|                                    |
|  Enter Your Lab Values             |  20px/600, #1A1A1A
|                                    |  mt=24px
|                                    |
|  Email                             |  16px/600, #1A1A1A (label)
|  +--------------------------------+|  mb=6px
|  | j***@email.com           [lock]||  h=48px, bg=#F8F9FA
|  +--------------------------------+|  border: 1px #E0E0E0
|  Pre-filled from sign-in           |  14px/400, #666666
|                                    |  read-only, cursor-default
|                                    |  mt=4px (helper gap)
|                                    |
|  Name *                            |  16px/600, #1A1A1A (label)
|  +--------------------------------+|  mb=6px
|  |                                ||  h=48px, 16px/400
|  +--------------------------------+|  border: 1px #E0E0E0
|                                    |  autocomplete="name"
|                                    |  gap=12px to next field
|                                    |
|  Age *                             |  16px/600 (label)
|  +--------------------------------+|
|  |                                ||  h=48px
|  +--------------------------------+|  inputmode="numeric"
|  years                             |  14px/400 #666 (helper)
|                                    |
|  BUN *                             |
|  +--------------------------------+|
|  |                                ||  h=48px
|  +--------------------------------+|  inputmode="decimal"
|  mg/dL -- Normal range: 7-20      |  14px/400 #666 (helper)
|                                    |
|  Creatinine *                      |
|  +--------------------------------+|
|  |                                ||  h=48px
|  +--------------------------------+|  inputmode="decimal"
|  mg/dL -- Normal range: 0.6-1.2   |  14px/400 #666
|                                    |
|  Potassium *                       |
|  +--------------------------------+|
|  |                                ||  h=48px
|  +--------------------------------+|  inputmode="decimal"
|  mEq/L -- Normal range: 3.5-5.0   |  14px/400 #666
|                                    |
|  +--------------------------------+|
|  |      See My Prediction         ||  h=56px, w=100%
|  +--------------------------------+|  bg=#1D9E75, text=#FFF
|                                    |  16px/700, rounded-lg
|                                    |  mt=24px
|                                    |
+------------------------------------+
| [Medical disclaimer...]      [^]  |  sticky bottom bar
+------------------------------------+  h=44px, bg=#F8F9FA
```

**Notes:**
- Single column layout, all fields stacked
- Email field: read-only, gray bg (#F8F9FA), lock icon (16px, #666) right-aligned
- All inputs: 48px height, 16px font (prevents iOS zoom), rounded-md (6px)
- Field gap: 12px between fields on mobile
- Unit + normal range as helper text below each lab input
- Submit button: 56px height (larger than standard), bold weight
- Disclaimer: sticky collapsed bar identical to landing page

### Tablet (768-1024px)

```
+------------------------------------------------+
| [Logo]                                         |  h=56px
+------------------------------------------------+
|                       max-width: 640px         |
|                       centered                 |
|  p=24px                                        |
|                                                |
|  Enter Your Lab Values                         |  20px/600
|                                                |
|  +----------------------+  +------------------+|
|  | Email                |  | Name *           ||  2-column row
|  | +------------------+ |  | +--------------+ ||
|  | | j***@email.com   | |  | |              | ||  h=48px each
|  | +------------------+ |  | +--------------+ ||
|  | Pre-filled [lock]    |  |                  ||
|  +----------------------+  +------------------+|
|       50%                      50%              |  gap=16px
|                                                |
|  +----------------------+  +------------------+|
|  | Age *                |  | BUN *            ||  2-column row
|  | +------------------+ |  | +--------------+ ||
|  | |                  | |  | |              | ||  h=48px each
|  | +------------------+ |  | +--------------+ ||
|  | years                |  | mg/dL  7-20     ||
|  +----------------------+  +------------------+|
|                                                |
|  +----------------------+  +------------------+|
|  | Creatinine *         |  | Potassium *      ||  2-column row
|  | +------------------+ |  | +--------------+ ||
|  | |                  | |  | |              | ||  h=48px each
|  | +------------------+ |  | +--------------+ ||
|  | mg/dL  0.6-1.2      |  | mEq/L  3.5-5.0  ||
|  +----------------------+  +------------------+|
|                                                |
|  +--------------------------------------------+|
|  |          See My Prediction                  ||  h=56px, w=100%
|  +--------------------------------------------+|  primary, mt=24px
|                                                |
+------------------------------------------------+
| Disclaimer (inline, full text)                 |
+------------------------------------------------+
```

**Notes:**
- 2-column grid: `grid-cols-2 gap-4` (16px gap)
- Form max-width: 640px, centered
- Email + Name share first row; Age + BUN share second row; Creatinine + Potassium share third row
- Disclaimer switches to inline full text on tablet
- Submit: full-width within 640px form container

### Desktop (>1024px)

```
+------------------------------------------------------------------+
| [Logo]                                                           |  h=64px
+------------------------------------------------------------------+
|                       max-width: 640px (form)                    |
|                       centered within 960px content              |
|  p=32px                                                          |
|                                                                  |
|  Enter Your Lab Values                                           |  20px/600
|                                                                  |
|  +---------------------------+  +---------------------------+    |
|  | Email                     |  | Name *                    |    |  2-col row
|  | +---------------------+   |  | +---------------------+   |    |
|  | | j***@email [lock]   |   |  | |                     |   |    |  h=48px
|  | +---------------------+   |  | +---------------------+   |    |
|  | Pre-filled from sign-in   |  |                           |    |
|  +---------------------------+  +---------------------------+    |
|           50%                          50%                        |  gap=16px
|                                                                  |
|  +---------------------------+  +---------------------------+    |
|  | Age *                     |  | BUN *                     |    |  2-col row
|  | +--------+ years          |  | +--------+ mg/dL         |    |
|  | |        |                |  | |        |               |    |  h=48px
|  | +--------+                |  | +--------+               |    |  unit inline
|  | Valid: 18-120              |  | Normal: 7-20 mg/dL       |    |  right of input
|  +---------------------------+  +---------------------------+    |
|                                                                  |
|  +---------------------------+  +---------------------------+    |
|  | Creatinine *              |  | Potassium *               |    |  2-col row
|  | +--------+ mg/dL         |  | +--------+ mEq/L         |    |
|  | |        |                |  | |        |               |    |  h=48px
|  | +--------+                |  | +--------+               |    |  unit inline
|  | Normal: 0.6-1.2 mg/dL     |  | Normal: 3.5-5.0 mEq/L    |    |
|  +---------------------------+  +---------------------------+    |
|                                                                  |
|  +----------------------------------------------------------+    |
|  |                  See My Prediction                        |    |  h=56px, w=100%
|  +----------------------------------------------------------+    |  primary, mt=24px
|                                                                  |
+------------------------------------------------------------------+
| Disclaimer (inline, full text)                                   |
| [About] [Privacy] [Terms]                                        |
+------------------------------------------------------------------+
```

**Notes:**
- Desktop: unit label appears inline to the right of the input (not below)
- Helper text (normal range) appears below each field group
- Form container: max-width 640px, centered within the 960px content max-width
- All inputs: 48px height, 16px font, rounded-md, border 1px #E0E0E0
- Focus state: 2px border #378ADD (ring color), `box-shadow: 0 0 0 2px rgba(55,138,221,0.2)`
- Required indicator: * in label text, `aria-required="true"` on input

### Field Specifications

| Field | Type | inputmode | autocomplete | Validation | Range | Unit |
|-------|------|-----------|--------------|------------|-------|------|
| Email | text | email | email | read-only, pre-filled | -- | -- |
| Name | text | text | name | required, min 1 char | -- | -- |
| Age | number | numeric | off | required, integer | 18-120 | years |
| BUN | number | decimal | off | required, float | 5-150 | mg/dL |
| Creatinine | number | decimal | off | required, float | 0.1-30 | mg/dL |
| Potassium | number | decimal | off | required, float | 1.0-10.0 | mEq/L |

---

## 6. Loading State

**Route:** `/results` (inline loading, not a separate route)
**Auth:** Clerk session required
**Purpose:** Skeleton UI while the prediction API responds (~1-2s typical).

### Mobile (<768px)

```
+------------------------------------+
| [Logo]                             |  h=48px
+------------------------------------+
|  p=16px                            |
|                                    |
|  Your Prediction                   |  20px/600, #1A1A1A
|  Calculating your prediction...    |  16px/400, #666666
|                                    |  mt=24px
|                                    |
|  +--------------------------------+|
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ||  skeleton chart
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ||  h=200px (min-height)
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ||  bg=#F8F9FA
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ||  animate-pulse (1.5s)
|  +--------------------------------+|  rounded-lg
|                                    |  mt=16px
|                                    |
|  +--------------------------------+|
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~   ||  skeleton button
|  +--------------------------------+|  h=56px, bg=#F8F9FA
|                                    |  animate-pulse
|                                    |  rounded-lg, mt=16px
|                                    |
+------------------------------------+
```

**Notes:**
- `aria-busy="true"` on results container
- No skeleton stat cards (deferred to Phase 2)
- Skeleton shimmer: bg #F8F9FA with gradient to #E0E0E0

### Tablet (768-1024px)

```
+------------------------------------------------+
| [Logo]                                         |  h=56px
+------------------------------------------------+
|                       max-width: 960px         |
|  p=24px                                        |
|                                                |
|  Your Prediction                               |  20px/600
|  Calculating your prediction...                |  16px/400, #666
|                                                |
|  +--------------------------------------------+|
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ||  skeleton chart
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ||  h=280px
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ||  animate-pulse
|  +--------------------------------------------+|  rounded-lg
|                                                |
|  +--------------------------------------------+|
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ||  skeleton button
|  +--------------------------------------------+|  h=56px, animate-pulse
|                                                |
+------------------------------------------------+
```

### Desktop (>1024px)

```
+------------------------------------------------------------------+
| [Logo]                                                           |  h=64px
+------------------------------------------------------------------+
|                       max-width: 960px, centered                 |
|  p=32px                                                          |
|                                                                  |
|  Your Prediction                                                 |  20px/600
|  Calculating your prediction...                                  |  16px/400, #666
|                                                                  |
|  +----------------------------------------------------------+    |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |    |  skeleton chart
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |    |  h=340px
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |    |  animate-pulse
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |    |  rounded-lg
|  +----------------------------------------------------------+    |
|                                                                  |
|  +----------------------------------------------------------+    |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  |    |  skeleton button
|  +----------------------------------------------------------+    |  h=56px
|                                                                  |
+------------------------------------------------------------------+
```

**Notes:**
- Chart skeleton heights: 200px (mobile), 280px (tablet), 340px (desktop)
- Button skeleton matches PDF download button dimensions
- Duration: typically <2s; shows immediately on route load

---

## 7. Results

**Route:** `/results`
**Auth:** Clerk session required
**Purpose:** Display the eGFR trajectory chart (the product), PDF download, and medical disclaimer.

### Mobile (<768px)

```
+------------------------------------+
| [Logo]                             |  h=48px
+------------------------------------+
|  p=16px                            |
|                                    |
|  Your Prediction                   |  20px/600, #1A1A1A
|                                    |  mt=24px
|                                    |
|  Here is how your kidney           |  16px/400, #1A1A1A
|  function may change over the      |  mt=8px
|  next 10 years under four          |
|  scenarios.                        |
|                                    |
|  +--------------------------------+|
|  |  CHART AREA                    ||  section aria-label=
|  |                                ||  "Your kidney health
|  |  Visx SVG responsive chart     ||   prediction"
|  |  ParentSize wrapper            ||
|  |  min-height: 200px             ||
|  |  width: 100% (fluid)           ||
|  |                                ||  mobile: every-other
|  |  4 trajectory lines            ||  x-axis label
|  |  + phase bands                 ||
|  |  + dialysis threshold          ||  tooltips: above
|  |  + end-of-line labels           ||  tap point
|  |  (labels may shift below       ||
|  |   chart if clipped)            ||  no crosshair on
|  |                                ||  mobile
|  +--------------------------------+|  rounded-lg, mt=16px
|                                    |
|  Data points are plotted at actual  |  12px/400 #888, italic
|  time intervals. Early measure-     |  mt=8px
|  ments are more frequent.           |
|                                    |
|  +--------------------------------+|
|  | [PDF icon] Download Your       ||  h=56px, w=100%
|  |   Results (PDF)                ||  bg=#1D9E75, text=#FFF
|  +--------------------------------+|  16px/600, rounded-lg
|                                    |  mt=16px
|                                    |  PDF icon: 20px, left
|                                    |  of text
|                                    |
+------------------------------------+
| [Medical disclaimer...]      [^]  |  sticky bottom bar
| (tap to expand)                    |  h=44px min, bg=#F8F9FA
+------------------------------------+  shadow-up
                                        14px/400, #666
                                        aria-expanded="false"
```

**Notes:**
- Summary sentence above chart replaces stat cards for comprehension
- Chart: Visx SVG, `<svg role="img" aria-label="eGFR trajectory prediction chart">` with `<title>` and `<desc>`
- Chart width: fluid, fills container (100% - 32px for padding)
- Chart height: 200px min on mobile
- Tooltips: appear above tap point on mobile (no crosshair)
- X-axis labels: show every-other label on mobile to prevent overlap
- End-of-line labels: shift below chart if they would clip on mobile
- PDF button: primary CTA, full-width, 56px height, PDF icon (20px) inline-start
- PDF button loading state: spinner (16px) replaces icon, text changes to "Generating PDF..."
- PDF button error state: inline error below button "Download failed. Try again." (14px/400 #D32F2F)
- `AccessibleDataTable` (sr-only) rendered below chart for screen readers
- Disclaimer: sticky collapsed bar on mobile, same as landing + form

### Tablet (768-1024px)

```
+------------------------------------------------+
| [Logo]                                         |  h=56px
+------------------------------------------------+
|                       max-width: 960px         |
|  p=24px                                        |
|                                                |
|  Your Prediction                               |  20px/600
|                                                |
|  Here is how your kidney function may change   |  16px/400
|  over the next 10 years under four scenarios.  |
|                                                |
|  +--------------------------------------------+|
|  |  CHART AREA                                ||
|  |                                            ||  section aria-label
|  |  Visx SVG: 4 trajectories                  ||
|  |  + tooltips (follow cursor)                ||
|  |  + crosshair (vertical line)               ||
|  |  + phase bands                             ||
|  |  + dialysis threshold line                 ||
|  |  + end-of-line labels (right edge)         ||
|  |                                            ||
|  |  height: 280px                             ||
|  |  width: 100% (fluid within max-width)      ||
|  |                                            ||
|  +--------------------------------------------+|  rounded-lg
|                                                |
|  Data points are plotted at actual time         |  12px/400 #888
|  intervals. Early measurements are more         |  italic
|  frequent.                                      |  mt=8px
|                                                |
|  +--------------------------------------------+|
|  | [PDF icon] Download Your Results (PDF)      ||  h=56px, w=100%
|  +--------------------------------------------+|  primary, mt=16px
|                                                |
+------------------------------------------------+
| Disclaimer (inline, full text)                 |  14px/400, #666
| This tool provides educational predictions     |
| only and is not a substitute for medical       |
| advice. Always consult your doctor.            |
| [About] [Privacy] [Terms]                      |
+------------------------------------------------+
```

**Notes:**
- Chart height: 280px on tablet
- Crosshair (vertical line) enabled on tablet + desktop
- Tooltips follow cursor (desktop-style interaction)
- PDF button: full-width within content area
- Disclaimer: inline full text in footer area

### Desktop (>1024px)

```
+------------------------------------------------------------------+
| [Logo]                                                           |  h=64px
+------------------------------------------------------------------+
|                       max-width: 960px, centered                 |
|  p=32px                                                          |
|                                                                  |
|  Your Prediction                                                 |  20px/600
|                                                                  |
|  Here is how your kidney function may change over the next       |  16px/400
|  10 years under four scenarios.                                  |
|                                                                  |
|  +----------------------------------------------------------+    |
|  |  CHART AREA                                              |    |
|  |                                                          |    |  section
|  |  Visx SVG: 4 trajectory lines                            |    |  aria-label
|  |  + tooltips (follow cursor, snap to nearest point)       |    |
|  |  + crosshair (vertical line at hover x)                  |    |
|  |  + phase bands (horizontal color bands)                  |    |
|  |  + dialysis threshold (dashed red at eGFR=15)            |    |
|  |  + end-of-line labels (right edge, 15px min sep)         |    |
|  |                                                          |    |
|  |  height: 340px                                           |    |
|  |  width: 100% (fluid within 960px - 64px padding)        |    |
|  |  = ~896px effective chart width                          |    |
|  |                                                          |    |
|  +----------------------------------------------------------+    |  rounded-lg
|                                                                  |
|  Data points are plotted at actual time intervals. Early          |  12px/400 #888
|  measurements are more frequent.                                 |  italic, mt=8px
|                                                                  |
|  +----------------------------------------------------------+    |
|  | [PDF icon] Download Your Results (PDF)                    |    |  h=56px
|  +----------------------------------------------------------+    |  w=auto (min-w=320px)
|                                                                  |  or w=100%
|                                                                  |  primary, mt=16px
|                                                                  |
+------------------------------------------------------------------+
| Disclaimer (inline, full text)                                   |  14px/400 #666
| This tool provides educational predictions only and is not a     |
| substitute for professional medical advice, diagnosis, or         |
| treatment. Always consult your healthcare provider about your     |
| kidney health. Results are based on statistical models and        |
| individual outcomes may vary.                                     |
| [About] [Privacy] [Terms]                                        |
+------------------------------------------------------------------+
```

**Notes:**
- Chart height: 340px on desktop
- Effective chart width: ~896px (960px max-width minus 64px total horizontal padding)
- End-of-line labels: right-aligned at chart edge, 12px/600, trajectory color, 15px minimum vertical separation with collision avoidance
- PDF button: full-width within content area on desktop (matches meeting 1 decision)
- Crosshair: vertical line that follows mouse X position
- Tooltips: positioned near cursor, snap to nearest data point
- Disclaimer: full inline text with complete medical disclaimer copy
- Footer links: About, Privacy, Terms as text links (14px, #378ADD)

### Chart Dimensions Summary

| Breakpoint | Chart Height | Chart Width | X-Axis Labels | Crosshair | Tooltip Position |
|-----------|-------------|-------------|---------------|-----------|-----------------|
| Mobile <768px | 200px min | 100% fluid | Every other | Hidden | Above tap point |
| Tablet 768-1024px | 280px | 100% fluid | All labels | Visible | Follow cursor |
| Desktop >1024px | 340px | ~896px max | All labels | Visible | Follow cursor |

---

## 8. Error States

Error states are not standalone screens. They appear as overlays on the relevant screen.

### 8a. Email Validation Error (on Email Entry)

```
+------------------------------------+
|                                    |
|  Email                             |  16px/600 (label)
|  +--------------------------------+|
|  | not-an-email                   ||  h=48px
|  +--------------------------------+|  border: 2px #D32F2F
|  Please enter a valid email        |  bg: #FDECEA
|  address.                          |  14px/400 #D32F2F
|                                    |  aria-invalid="true"
|                                    |  aria-describedby points
|                                    |  to error message id
|                                    |
+------------------------------------+
```

### 8b. Form Validation Errors (on Prediction Form)

```
+------------------------------------+
| [Logo]                             |
+------------------------------------+
|                                    |
|  +--------------------------------+|
|  | (!) Please fix 2 errors below  ||  error summary banner
|  +--------------------------------+|  bg=#FDECEA, border-l: 4px
|                                    |  #D32F2F, p=12px
|                                    |  14px/600, #D32F2F
|                                    |  role="alert"
|                                    |  aria-live="assertive"
|                                    |  focus-on-mount
|                                    |
|  Name *                            |
|  +--------------------------------+|
|  |                                ||  no error (valid or empty
|  +--------------------------------+|  but not submitted)
|                                    |
|  Age *                             |
|  +--------------------------------+|
|  |  abc                           ||  red border 2px #D32F2F
|  +--------------------------------+|  bg=#FDECEA
|  Please enter a valid age          |  14px/400 #D32F2F
|  (18-120 years)                    |
|                                    |
|  BUN *                             |
|  +--------------------------------+|
|  |                                ||  red border (empty)
|  +--------------------------------+|
|  BUN is required                   |  14px/400 #D32F2F
|                                    |
+------------------------------------+
```

**Notes:**
- Error summary banner appears above all fields on submit
- Individual field errors shown inline below each invalid field
- Scroll-to-first-error: page scrolls to first field with error, field receives focus
- Error count in summary updates as user corrects fields
- Red border (2px #D32F2F) + pink background (#FDECEA) on invalid inputs
- `aria-invalid="true"` on each invalid input
- `aria-describedby` links each input to its error message

### 8c. Server Error Toast (on Results page)

```
+------------------------------------+
| [Logo]                             |
+------------------------------------+
| +--------------------------------+ |
| | (!) Something went wrong.      | |  toast banner
| |     Please try again.          | |  bg=#FDECEA
| |                    [Try Again] | |  border-l: 4px #D32F2F
| +--------------------------------+ |  p=12px, 14px/400
|                                    |  role="alert"
|  (Form values preserved. User     |  auto-dismiss 8s
|   can tap "Try Again" to re-      |  or manual dismiss [X]
|   submit without re-entering      |
|   data.)                           |
+------------------------------------+
```

### 8d. PDF Download Error (on Results page)

```
|  +--------------------------------+|
|  | [PDF icon] Download Your       ||  button stays enabled
|  |   Results (PDF)                ||
|  +--------------------------------+|
|  Download failed. Try again.       |  14px/400 #D32F2F
|                                    |  mt=4px, inline below btn
```

**Notes:**
- PDF error is inline below the button, not a toast
- Button remains enabled for retry
- Error clears on next click attempt

---

## Responsive Behavior Summary

| Element | Mobile <768px | Tablet 768-1024px | Desktop >1024px |
|---------|--------------|-------------------|-----------------|
| Header height | 48px | 56px | 64px |
| Page padding | 16px | 24px | 32px |
| Content max-width | 100% | 100% | 960px |
| Form max-width | 100% | 640px centered | 640px centered |
| Auth card max-width | 100% (no card) | 400px centered | 400px centered |
| Form layout | 1 column | 2 columns | 2 columns |
| Chart height | 200px min | 280px | 340px |
| Chart crosshair | Hidden | Visible | Visible |
| CTA button width | 100% | 100% (within container) | 100% (within container) |
| Disclaimer | Sticky collapsed bar | Inline full text | Inline full text |
| Hero image | Hidden | 240x180px | 400x300px |

---

## Component-to-Screen Map

| Component | Landing | Email Entry | Magic Link Sent | Expired Link | Form | Loading | Results |
|-----------|---------|-------------|-----------------|--------------|------|---------|---------|
| Header | x | x | x | x | x | x | x |
| MagicLinkForm | | x | | | | | |
| MagicLinkSent | | | x | | | | |
| PredictionForm | | | | | x | | |
| NumberInput | | | | | x (x4) | | |
| NameInput | | | | | x | | |
| FormErrorSummary | | | | | x | | |
| PredictionChart | | | | | | | x |
| LoadingSkeleton | | | | | | x | |
| PDFDownloadButton | | | | | | | x |
| DisclaimerBlock | x | | | | x | | x |
| AccessibleDataTable | | | | | | | x |
