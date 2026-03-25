# Design Sprint Meeting 1: KidneyHood Lean Launch

**Date:** 2026-03-25
**Participants:** Inga (UX/UI Senior Designer), Harshit (Frontend Developer)
**Goal:** Align on simplified user flow, screen specs, component inventory, and prototype plan

---

## 1. Simplified User Flow

### Route Map (4 routes, down from 7)

| Route | Screen | Auth |
|-------|--------|------|
| `/` | Landing page | No |
| `/auth` | Email entry + Magic Link Sent + Expired Link | No |
| `/predict` | Prediction form (name + 4 lab fields) | Clerk session |
| `/results` | Chart + PDF button + disclaimer | Clerk session |

### Happy Path

```
Landing (/)
  |  User taps "Get Started"
  v
Email Entry (/auth)
  |  User enters email, taps "Send me a sign-in link"
  |  POST /auth/request-link (Clerk)
  v
Magic Link Sent (/auth -- same route, swap view)
  |  Deep-link buttons: "Open Gmail" / "Open Outlook"
  |  Resend disabled 60s, 15-min expiry
  |  User opens email, clicks magic link
  v
Verify Handler (/auth/verify?token=...)
  |  Clerk validates token
  |  Auto-redirect, zero extra clicks
  v
Prediction Form (/predict)
  |  Email pre-filled from Clerk session (read-only)
  |  User enters: name, age, BUN, creatinine, potassium
  |  Taps "See My Prediction"
  |  POST /predict (Clerk JWT)
  v
Loading (inline on /results -- skeleton chart)
  |  API returns 4 trajectories
  v
Results (/results)
  |  Summary sentence above chart
  |  Interactive chart (Variant A: tooltips, crosshairs, hover)
  |  PDF download button (full-width mobile, inline desktop)
  |  Disclaimer (inline desktop, sticky collapsed mobile)
```

### Error States

| Error | Trigger | Screen | Behavior |
|-------|---------|--------|----------|
| Invalid email | Bad format on email entry | `/auth` | Inline error below field, red border |
| Expired link | Click magic link after 15 min | `/auth` (expired view) | "This link has expired" + "Send a new link" button |
| Used/invalid link | Token already consumed or malformed | `/auth` (expired view) | Same expired screen, generic message |
| Form validation | Missing/out-of-range lab values | `/predict` | Error summary banner + inline field errors, scroll to first error |
| Server error | 500 or timeout on /predict | `/results` | Toast banner at top: "Something went wrong. Please try again." Form values preserved. |
| PDF error | /predict/pdf fails | `/results` | PDFDownloadButton shows inline error: "Download failed. Try again." |

### Session State (simplified from 5 states to 2)

```
ANONYMOUS --> enters email --> MAGIC_LINK_PENDING --> clicks link --> VERIFIED (15-min session)
```

No guest state, no account state, no expiry state. Session is disposable. Return visitors start fresh.

---

## 2. High-Fidelity Screen Specs

Grid: 8px base. Font: Inter. Max-width: 960px. Form max-width: 640px.
Breakpoints: mobile <768px, tablet 768-1024px, desktop >1024px.

### Screen A: Landing Page

**Purpose:** Single CTA to start the flow.

```
MOBILE (<768px)                          DESKTOP (>1024px, max 960px centered)
+----------------------------------+     +--------------------+--------------------+
| [Logo]                           | 48h | [Logo]                                  | 64h
+----------------------------------+     +-----------------------------------------+
|                                  |     |                    |                    |
|   Understand Your Kidney         | 28b |  [Hero 400x300]    | Understand Your    | 28b
|   Health Trajectory              |     |                    | Kidney Health      |
|                                  |     |                    | Trajectory         |
|   Enter your lab values to see   | 16r |                    |                    |
|   how your kidney health may     |     |                    | Enter your lab...  | 16r
|   change over the next 10 years. |     |                    |                    |
|                                  |     |                    | [Get Started]      | 48h btn
|   [Get Started]                  | 48h |                    |                    |
+----------------------------------+     +-----------------------------------------+
| Disclaimer (sticky, collapsed)   |     | Disclaimer (inline, full text)          |
+----------------------------------+     +-----------------------------------------+
```

- CTA: primary button, full-width mobile, auto-width desktop
- No "Sign In" in header (no accounts)
- Mobile padding: 16px. Desktop padding: 32px within max-width.

### Screen B: Email Entry (/auth)

**Purpose:** Bot gate + email capture. Single field.

```
MOBILE                                   DESKTOP (max 400px card, centered)
+----------------------------------+     +----------------------------------+
| [Logo]                           |     | [Logo]                           |
+----------------------------------+     +----------------------------------+
|                                  |     |    +------------------------+    |
|   Get Started                    | 20s |    | Get Started            | 20s|
|                                  |     |    |                        |    |
|   Enter your email to receive    | 16r |    | Enter your email to    |    |
|   a secure sign-in link.         |     |    | receive a secure       |    |
|                                  |     |    | sign-in link.          |    |
|   Email                          |     |    |                        |    |
|   +----------------------------+ |     |    | [email input]          | 48h|
|   | your@email.com             | | 48h |    |                        |    |
|   +----------------------------+ |     |    | [Send me a sign-in     | 48h|
|                                  |     |    |  link]                 |    |
|   [Send me a sign-in link]       | 48h |    +------------------------+    |
+----------------------------------+     +----------------------------------+
```

- `autocomplete="email"`, `inputmode="email"`
- Validation: email format check client-side
- Loading state on button while Clerk sends

### Screen C: Magic Link Sent

**Purpose:** Confirmation with deep-link buttons for 60+ users.

```
+----------------------------------+
|        [Email icon]              | 48px
|                                  |
|   Check your email!              | 20s
|                                  |
|   We sent a sign-in link to      | 16r
|   j***@email.com                 | 16s (masked)
|                                  |
|   The link expires in 15 min.    | 14r muted
|                                  |
|   +----------------------------+ |
|   | [Gmail icon] Open Gmail    | | 48h, secondary btn
|   +----------------------------+ |
|   +----------------------------+ |
|   | [Outlook icon] Open Outlook| | 48h, secondary btn
|   +----------------------------+ |
|                                  |
|   [Resend link]                  | 48h, disabled 60s
|   (available in 58 seconds)      | 14r muted
|                                  |
|   Didn't receive it?             | 14r muted
|   Check your spam folder.        |
+----------------------------------+
```

- Deep-link URLs: `https://mail.google.com/mail/`, `https://outlook.live.com/mail/`
- Resend countdown: 60s timer, `aria-disabled` during cooldown
- Same layout on all breakpoints (max-width 400px centered)

### Screen D: Expired / Invalid Link

```
+----------------------------------+
|        [Warning icon]            | 48px
|                                  |
|   This link has expired          | 20s
|                                  |
|   Sign-in links are valid for    | 16r
|   15 minutes for your security.  |
|                                  |
|   [Send a new link]              | 48h primary
|                                  |
|   [Back to home]                 | text link
+----------------------------------+
```

### Screen E: Prediction Form (/predict)

**Purpose:** Name + 4 lab values. Email pre-filled and read-only.

```
MOBILE (single column)                   DESKTOP (max 640px centered)
+----------------------------------+     +----------------------------------+
| [Logo]                           |     | [Logo]                           |
+----------------------------------+     +----------------------------------+
|                                  |     |                                  |
|  Enter Your Lab Values           | 20s |  Enter Your Lab Values           |
|                                  |     |                                  |
|  Email                           |     |  +--------------+--------------+ |
|  +----------------------------+  |     |  | Email (RO)   | Name *       | | 2-col
|  | j***@email.com         [lock]| | 48h |  +--------------+--------------+ |
|  +----------------------------+  |     |                                  |
|  Pre-filled from sign-in         | 14m |  +--------------+--------------+ |
|                                  |     |  | Age *        | BUN *        | | 2-col
|  Name *                          |     |  | [  ] years   | [  ] mg/dL   | |
|  +----------------------------+  |     |  +--------------+--------------+ |
|  |                            |  | 48h |                                  |
|  +----------------------------+  |     |  +--------------+--------------+ |
|                                  |     |  | Creatinine * | Potassium *  | | 2-col
|  Age *                           |     |  | [  ] mg/dL   | [  ] mEq/L   | |
|  +----------------------------+  |     |  +--------------+--------------+ |
|  |                            |  | 48h |                                  |
|  +----------------------------+  |     |  [See My Prediction]             | 56h
|  years                           |     |                                  |
|                                  |     +----------------------------------+
|  BUN *                           |
|  +----------------------------+  |
|  |                            |  | 48h
|  +----------------------------+  |
|  mg/dL -- Normal range: 7-20    | 14m
|                                  |
|  Creatinine *                    |
|  +----------------------------+  |
|  |                            |  | 48h
|  +----------------------------+  |
|  mg/dL -- Normal range: 0.6-1.2 | 14m
|                                  |
|  Potassium *                     |
|  +----------------------------+  |
|  |                            |  | 48h
|  +----------------------------+  |
|  mEq/L -- Normal range: 3.5-5.0 | 14m
|                                  |
|  [See My Prediction]             | 56h primary btn
|                                  |
+----------------------------------+
| Disclaimer (sticky mobile)       |
+----------------------------------+
```

- Email field: read-only, gray background (#F8F9FA), lock icon, pre-filled from Clerk
- Name field: text input, `autocomplete="name"`, required
- Lab fields: NumberInput with units and normal-range helper text
- All inputs: 48px height, 16px font (prevents iOS zoom), 44px touch targets
- Submit: 56px height, full-width, primary color

### Screen F: Loading State

```
+----------------------------------+
|  Your Prediction                 | 20s
|  Calculating your prediction...  | 16r muted
|                                  |
|  +----------------------------+  |
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  | skeleton chart
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  | 200px mobile / 340px desktop
|  |  ~~~~~~~~~~~~~~~~~~~~~~~~  |  | animate-pulse
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  |  ~~~~~~~~~~~~~~~~~~~~~     |  | skeleton button (PDF placeholder)
|  +----------------------------+  |
+----------------------------------+
```

- No skeleton stat cards (deferred)
- `aria-busy="true"` on results container
- Duration: typically <2s

### Screen G: Results (/results)

**Purpose:** Chart + PDF download + disclaimer. The chart IS the product.

```
MOBILE                                   DESKTOP (max 960px)
+----------------------------------+     +--------------------------------------------------+
| [Logo]                           |     | [Logo]                                           |
+----------------------------------+     +--------------------------------------------------+
|                                  |     |                                                  |
|  Your Prediction                 | 20s |  Your Prediction                                 |
|                                  |     |                                                  |
|  Here is how your kidney         | 16r |  Here is how your kidney function may change     |
|  function may change over the    |     |  over the next 10 years under four scenarios.     |
|  next 10 years under four        |     |                                                  |
|  scenarios.                      |     |  +----------------------------------------------+|
|                                  |     |  | CHART AREA                                   ||
|  +----------------------------+  |     |  | Visx SVG: 4 trajectories + tooltips          ||
|  | CHART AREA                 |  |     |  | + crosshair + phase bands + dialysis line    ||
|  | 200px min-height           |  |     |  | + end-of-line labels                         ||
|  | Visx interactive chart     |  |     |  | 340px height                                 ||
|  | (placeholder in prototype) |  |     |  +----------------------------------------------+|
|  +----------------------------+  |     |  Footnote: Data points are plotted at actual...  |
|  Footnote (12px italic muted)    |     |                                                  |
|                                  |     |  +----------------------------------------------+|
|  +----------------------------+  |     |  | [PDF icon] Download Your Results (PDF)       ||
|  | [PDF] Download Your        |  | 56h |  +----------------------------------------------+|
|  |   Results (PDF)            |  |     |                                                  |
|  +----------------------------+  |     +--------------------------------------------------+
|                                  |     | Disclaimer (inline, full text)                   |
+----------------------------------+     | [About] [Privacy] [Terms]                        |
| [Medical disclaimer...]    [^]  |     +--------------------------------------------------+
| (tap to expand)                  |
+----------------------------------+
```

- Summary sentence above chart replaces stat cards for comprehension
- Chart: placeholder box in prototype, labeled dimensions
- PDF button: primary CTA, full-width mobile, auto-width desktop, 56px height
- Button label: "Download Your Results (PDF)" with PDF icon
- Loading spinner inside button while PDF generates
- Disclaimer: inline on desktop (full text), sticky collapsed bar on mobile

---

## 3. Component Inventory (21 components)

### Auth Components (3)

| # | Component | Props | Responsive | A11y |
|---|-----------|-------|------------|------|
| 1 | `MagicLinkForm` | `onSubmit: (email: string) => void`, `isLoading: boolean`, `error?: string` | Max-width 400px centered on all breakpoints | `autocomplete="email"`, `inputmode="email"`, `aria-invalid` on error |
| 2 | `MagicLinkSent` | `email: string`, `onResend: () => void`, `isResending: boolean` | Max-width 400px centered | Resend button: `aria-disabled` during 60s cooldown with countdown in `aria-label` |
| 3 | `VerifyHandler` | `token: string` | N/A (redirect-only, no visible UI) | `aria-busy="true"` during verification, `role="alert"` on error |

### Form Components (4 unique)

| # | Component | Props | Responsive | A11y |
|---|-----------|-------|------------|------|
| 4 | `PredictionForm` | `email: string`, `onSubmit: (data: PredictionInput) => void`, `isLoading: boolean`, `serverErrors?: FieldError[]` | Single column mobile, 2-col desktop (max 640px) | `<form>`, error summary `role="alert"`, scroll-to-first-error |
| 5 | `NumberInput` | `id, name, label, unit, helperText, min, max, step, value, onChange, error, required` | Unit below input (mobile), inline right (desktop) | `<label htmlFor>`, `aria-describedby`, `aria-invalid`, `aria-required`, `inputmode="numeric"` or `"decimal"` |
| 6 | `NameInput` | `id, value, onChange, error, required` | Full-width all breakpoints | `autocomplete="name"`, same a11y pattern as NumberInput |
| 7 | `FormErrorSummary` | `errors: { field: string, message: string }[]` | Full-width banner above form fields | `role="alert"`, `aria-live="assertive"`, focus-on-mount |

### Chart Components (10)

| # | Component | Props | Responsive | A11y |
|---|-----------|-------|------------|------|
| 8 | `PredictionChart` | `data: ChartData` | ParentSize wrapper. 200px mobile, 280px tablet, 340px desktop | `<svg role="img" aria-label="...">`, `<title>`, `<desc>` |
| 9 | `TrajectoryLines` | `trajectories: TrajectoryData[], scales, highlightId?` | Scales adapt via ParentSize | `aria-hidden="true"` (data table is the accessible alternative) |
| 10 | `PhaseBands` | `phases: PhaseDefinition[], yScale, width` | Full chart width | `aria-hidden="true"` |
| 11 | `DialysisThreshold` | `yScale, width, threshold: number` | Full chart width | `aria-hidden="true"`, label text in SVG |
| 12 | `Tooltips` | `data, scales, activePoint?` | Desktop: follow cursor. Mobile: above tap point | Tooltip content readable by screen readers via `role="tooltip"` |
| 13 | `Crosshair` | `x, y, scales` | Desktop only (hidden on mobile) | `aria-hidden="true"` |
| 14 | `ChartAxes` | `xScale, yScale, width, height` | Mobile: every-other x-label. Desktop: all labels | Axis text in SVG `<text>` elements |
| 15 | `EndOfLineLabels` | `trajectories, xScale, yScale` | Labels shift below chart if clipped on mobile | 12px/600, collision avoidance (15px min vertical sep) |
| 16 | `AccessibleDataTable` | `trajectories: TrajectoryData[]` | Visually hidden (`sr-only`), full data | `<table>`, `<caption>`, `<th scope>`, full tabular data |
| 17 | `LoadingSkeleton` | `variant: "chart" | "button"` | Chart: 200px mobile / 340px desktop. Button: full-width | `aria-busy="true"`, `animate-pulse` |

### Results Components (3)

| # | Component | Props | Responsive | A11y |
|---|-----------|-------|------------|------|
| 18 | `ChartContainer` | `children (chart + PDF button + footnote)` | Max-width 960px, padding per breakpoint | `<section aria-label="Your kidney health prediction">` |
| 19 | `PDFDownloadButton` | `predictionInput: PredictionInput`, `isLoading: boolean`, `error?: string` | Full-width 56px mobile, auto-width desktop | 44px min touch target, `aria-busy` during download, inline error on failure |
| 20 | `DisclaimerBlock` | `isExpanded: boolean`, `onToggle: () => void` | Sticky collapsed bar (mobile), inline full text (desktop) | Mobile: `aria-expanded`, `role="region"`. `shadow-up` on sticky bar |

### Layout Components (2)

| # | Component | Props | Responsive | A11y |
|---|-----------|-------|------------|------|
| 21 | `Header` | none (no auth links needed for lean launch) | 48px mobile, 56px tablet, 64px desktop | `<header>`, logo as `<a href="/">` with `aria-label="KidneyHood home"` |
| -- | `Footer` | none | Inline on desktop, hidden on mobile (disclaimer is sticky) | `<footer>`, links: About, Privacy, Terms |

**Note:** Footer is absorbed into DisclaimerBlock for lean launch. Not counted separately.

### Removed from Original (~19 components cut)

SexRadioGroup, FormSection (collapsible), OptionalFieldsSection, SilentFieldsSection, VisitDatePicker, StatCardGrid, StatCard (x4), ConfidenceBadge, UnlockPrompt, SavePromptDialog, SignInForm, AuthBanner, AccountDashboard, HistoryPage, middleware routes.

---

## 4. Prototype Plan

### Decision: Code-based prototype with Next.js + shadcn/ui

**Why not Figma:**
- Harshit can reuse prototype code directly in production
- Form inputs with validation need real behavior to test with 60+ users
- Chart area is a placeholder box regardless (Visx comes later)
- shadcn/ui components are faster to wire up than Figma hi-fi mockups

**What is included (real):**
- All 7 screens with real navigation (Next.js App Router)
- Working form inputs with client-side validation (NumberInput, NameInput)
- Email entry with format validation
- Magic Link Sent screen with 60s resend countdown timer
- Expired link screen
- Error states (form validation errors, server error toast)
- Responsive layout at all 3 breakpoints
- Design tokens applied (Inter font, color palette, 8px grid, spacing)
- Disclaimer (sticky mobile, inline desktop)
- PDF download button (with loading spinner, no actual PDF generation)
- Accessible markup (labels, aria attributes, focus management)

**What is stubbed:**
- Auth: no real Clerk integration, button clicks advance to next screen
- API: MSW mock returning hardcoded 4-trajectory response
- Chart: gray placeholder box with labeled dimensions ("Chart: 4 trajectories, 340px x 960px")
- PDF: button triggers loading spinner for 2s then shows "Download complete" toast
- Deep-link buttons: link to Gmail/Outlook URLs but no email is actually sent

**Fidelity level:** Hi-fi layout with real form behavior, placeholder chart, working navigation between all screens. Visually representative of final product minus chart rendering.

### Build Sequence

| Day | Task | Owner |
|-----|------|-------|
| 1 | Project setup: Next.js 15 + shadcn/ui + Tailwind + design tokens in globals.css | Harshit |
| 1 | Header, Footer/DisclaimerBlock, layout wrapper (max-width, padding) | Harshit |
| 2 | Landing page, MagicLinkForm, MagicLinkSent (with deep-link buttons + countdown) | Harshit |
| 2 | Expired link screen, VerifyHandler stub | Harshit |
| 3 | PredictionForm with NumberInput (x4) + NameInput + email read-only + FormErrorSummary | Harshit |
| 3 | Client-side validation (ranges, required checks) | Harshit |
| 4 | Results page: ChartContainer + placeholder chart box + PDFDownloadButton + DisclaimerBlock | Harshit |
| 4 | LoadingSkeleton, server error toast, MSW mock for /predict | Harshit |
| 5 | Responsive pass (test all 3 breakpoints), accessibility pass (axe-core zero violations) | Harshit + Inga review |

### Inga's Deliverables (Parallel)

| Day | Task |
|-----|------|
| 1-2 | Revise `user-flows.md` to match this document (kill flows 2-5, 8) |
| 2-3 | Revise `wireframes.md` (remove 3 dead screens, update form + results) |
| 3-4 | Revise `component-specs.md` (remove ~8, add NameInput + PDFDownloadButton) |
| 4-5 | Review Harshit's prototype, annotate spacing/alignment issues |

---

## 5. Open Questions for CTO (Luca)

1. **Route structure:** Is `/auth` acceptable as a single route with view-swapping (email entry, magic link sent, expired), or does Luca want separate routes (`/auth/email`, `/auth/sent`, `/auth/expired`)?
2. **PDF button placement:** Below chart (current plan) or in the header area? Below chart is more prominent but pushes disclaimer down.
3. **Clerk redirect URL:** After magic link verification, redirect to `/predict` (form) or `/` (landing)? Current plan: `/predict`.

---

## Agreed Decisions

| # | Decision | Agreed By |
|---|----------|-----------|
| 1 | Code-based prototype (Next.js + shadcn/ui), not Figma | Inga + Harshit |
| 2 | 7 screens total: landing, email entry, magic link sent, expired link, form, loading, results | Inga + Harshit |
| 3 | Email field on form is read-only (pre-filled from Clerk), not editable | Inga + Harshit |
| 4 | No stat cards -- summary sentence above chart replaces them | Inga + Harshit |
| 5 | PDF button: primary CTA, full-width mobile, directly below chart | Inga + Harshit |
| 6 | Chart is a labeled placeholder box in prototype; Visx rendering is a separate task | Inga + Harshit |
| 7 | 21 components total (3 auth + 4 form + 10 chart + 3 results + 1 layout) | Inga + Harshit |
| 8 | 5-day prototype build, Inga reviews on day 5 | Inga + Harshit |
