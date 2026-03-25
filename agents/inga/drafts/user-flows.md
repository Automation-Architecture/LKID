# KidneyHood User Flows

**Author:** Inga (Senior UX/UI Designer)
**Version:** 2.0 -- Lean Launch (Sprint 1 Revision)
**Date:** 2026-03-25
**Status:** Approved -- aligned with lean-launch-mvp-prd.md and Design Sprint Meeting 1
**Ticket:** LKID-31

---

## Revision Summary

Version 2.0 rewrites user flows to match the lean launch scope. The original v1.0 had 8 flows serving an 89-ticket PRD with accounts, dashboards, multi-visit tracking, confidence tiers, and guest data expiry. The lean launch cuts this to a single happy path with 6 error states, 4 routes, and 2 session states.

### Flows Removed (Deferred to Phase 2)

| Original Flow | Reason |
|---------------|--------|
| Flow 2: Account Creation via Magic Link | No accounts -- magic link is bot gate + email capture only |
| Flow 3: Returning User Sign-In | No accounts, no saved history |
| Flow 4: Multi-Visit Re-Entry | No visit tracking, no slope analysis |
| Flow 5: Tier Upgrade (Optional Fields) | No tiers, no optional fields -- required fields only |
| Flow 8: Guest Data Expiry | No guest sessions, no server-side TTL -- session is disposable |

### Flows Retained (Revised)

| Original Flow | New Section |
|---------------|-------------|
| Flow 1: Guest Prediction | Flow 1: Happy Path (substantially revised) |
| Flow 6: Error Recovery | Flow 2: Error States (expanded) |
| Flow 7: Magic Link Expiry | Folded into Flow 2 error states |

---

## Table of Contents

1. [Route Map](#route-map)
2. [Flow 1: Happy Path](#flow-1-happy-path)
3. [Flow 2: Error States](#flow-2-error-states)
4. [Session Model](#session-model)
5. [Navigation Structure](#navigation-structure)

---

## Route Map

Four routes, down from seven in v1.0. Auth uses a single route with view-swapping rather than separate routes.

| Route | Screen(s) | Auth Required | Notes |
|-------|-----------|---------------|-------|
| `/` | Landing page | No | Single CTA: "Get Started" |
| `/auth` | Email Entry, Magic Link Sent, Expired Link | No | Three views on one route, swapped by state |
| `/predict` | Prediction form (name + 4 lab fields) | Clerk session | Email pre-filled from Clerk, read-only |
| `/results` | Loading skeleton, Chart + PDF + Disclaimer | Clerk session | Loading is inline (skeleton), then results render |

---

## Flow 1: Happy Path

The primary and only path for all users. No accounts, no returning users, no saved history. Every visit starts fresh.

```
+========================+
|     Landing Page       |
|     Route: /           |
|                        |
|  "Understand Your      |
|   Kidney Health        |
|   Trajectory"          |
|                        |
|  "Enter your lab       |
|   values to see how    |
|   your kidney health   |
|   may change over the  |
|   next 10 years."      |
|                        |
|  [Get Started]         |
|  (primary button)      |
|                        |
|  Disclaimer:           |
|  - Desktop: inline     |
|  - Mobile: sticky bar  |
+===========+============+
            |
            | User taps "Get Started"
            | Navigate to /auth
            v
+========================+
|   Email Entry          |
|   Route: /auth         |
|   (email-entry view)   |
|                        |
|  "Get Started"         |
|                        |
|  "Enter your email to  |
|   receive a secure     |
|   sign-in link."       |
|                        |
|  [Email input]         |
|  autocomplete="email"  |
|  inputmode="email"     |
|                        |
|  [Send me a sign-in    |
|   link]                |
|  (primary button)      |
|                        |
|  POST /auth/request-   |
|  link (Clerk)          |
+===========+============+
            |
            | Clerk sends magic link
            | View swaps (same route)
            v
+========================+
|   Magic Link Sent      |
|   Route: /auth         |
|   (link-sent view)     |
|                        |
|  [Email icon]          |
|                        |
|  "Check your email!"   |
|                        |
|  "We sent a sign-in    |
|   link to              |
|   j***@email.com"      |
|  (masked email)        |
|                        |
|  "The link expires     |
|   in 15 minutes."      |
|                        |
|  [Open Gmail]          |
|  (deep-link button)    |
|                        |
|  [Open Outlook]        |
|  (deep-link button)    |
|                        |
|  [Resend link]         |
|  (disabled for 60s,    |
|   countdown shown)     |
|                        |
|  "Didn't receive it?   |
|   Check your spam      |
|   folder."             |
+===========+============+
            |
            | User opens email,
            | clicks magic link
            v
+========================+
|   Verify Handler       |
|   Route: /auth/verify  |
|   ?token=...           |
|                        |
|  System (no visible    |
|  UI -- redirect only): |
|  1. Clerk validates    |
|     token              |
|  2. Sets session       |
|     (15-min expiry)    |
|  3. Auto-redirect to   |
|     /predict           |
|  Zero extra clicks.    |
+===========+============+
            |
            | Redirect to /predict
            v
+========================+
|   Prediction Form      |
|   Route: /predict      |
|                        |
|  "Enter Your Lab       |
|   Values"              |
|                        |
|  Email [read-only]     |
|  (pre-filled from      |
|   Clerk session,       |
|   gray bg, lock icon)  |
|                        |
|  Name *                |
|  [text input]          |
|  autocomplete="name"   |
|                        |
|  Age *                 |
|  [number input] years  |
|                        |
|  BUN *                 |
|  [number input] mg/dL  |
|  Normal range: 7-20    |
|                        |
|  Creatinine *          |
|  [number input] mg/dL  |
|  Normal range: 0.6-1.2 |
|                        |
|  Potassium *           |
|  [number input] mEq/L  |
|  Normal range: 3.5-5.0 |
|                        |
|  [See My Prediction]   |
|  (56px primary button) |
|                        |
|  POST /predict         |
|  (Clerk JWT)           |
|                        |
|  Disclaimer:           |
|  - Desktop: inline     |
|  - Mobile: sticky bar  |
+===========+============+
            |
            | API processing
            v
+========================+
|   Loading State        |
|   Route: /results      |
|   (inline skeleton)    |
|                        |
|  "Your Prediction"     |
|  "Calculating your     |
|   prediction..."       |
|                        |
|  [Skeleton chart]      |
|  (pulsing placeholder, |
|   200px mobile,        |
|   340px desktop)       |
|                        |
|  [Skeleton button]     |
|  (PDF placeholder)     |
|                        |
|  aria-busy="true"      |
|  Duration: typically   |
|  < 2 seconds           |
+===========+============+
            |
            | POST /predict returns
            | 4 trajectories
            v
+========================+
|   Results Screen       |
|   Route: /results      |
|                        |
|  "Your Prediction"     |
|                        |
|  Summary sentence:     |
|  "Here is how your     |
|   kidney function may  |
|   change over the next |
|   10 years under four  |
|   scenarios."          |
|                        |
|  [Interactive Chart]   |
|  Visx SVG:             |
|  - 4 trajectory lines  |
|  - Tooltips on hover   |
|  - Crosshair (desktop) |
|  - Phase bands         |
|  - Dialysis threshold  |
|  - End-of-line labels  |
|  200px mobile,         |
|  340px desktop         |
|                        |
|  Footnote (12px muted) |
|                        |
|  [Download Your        |
|   Results (PDF)]       |
|  (56px primary button, |
|   full-width mobile,   |
|   auto-width desktop)  |
|  POST /predict/pdf     |
|                        |
|  Disclaimer:           |
|  - Desktop: inline     |
|  - Mobile: sticky bar  |
+========================+
```

**Exit points:**
- User downloads PDF -- lead already captured by `/predict` call
- User closes browser -- session is disposable, no data persists for user
- Return visitors start fresh from Landing

**What is NOT in this flow (deferred to Phase 2):**
- No save prompt after results
- No account creation
- No "Sign In" header link
- No stat cards or confidence badges
- No tier 2/3 optional fields (hemoglobin, glucose, systolic BP, etc.)
- No visit history or multi-visit chart overlay

---

## Flow 2: Error States

Six error states cover every failure point in the happy path.

### 2a: Invalid Email

**Trigger:** User submits email entry form with invalid format.
**Route:** `/auth` (email-entry view)

```
+========================+
|   Email Entry          |
|   Route: /auth         |
|                        |
|  [Email input]         |
|  Red border (2px)      |
|  "Please enter a       |
|   valid email address" |
|  (inline error below   |
|   field)               |
|                        |
|  [Send me a sign-in    |
|   link]                |
|  (remains enabled,     |
|   re-validates on tap) |
+========================+
```

- Client-side validation only (format check)
- Error clears when user corrects input
- No submission to Clerk until format is valid

### 2b: Expired Magic Link

**Trigger:** User clicks magic link after 15-minute expiry window.
**Route:** `/auth` (expired-link view)

```
+========================+
|   Expired Link         |
|   Route: /auth         |
|   (expired-link view)  |
|                        |
|  [Warning icon]        |
|                        |
|  "This link has        |
|   expired"             |
|                        |
|  "Sign-in links are    |
|   valid for 15 minutes |
|   for your security."  |
|                        |
|  [Send a new link]     |
|  (primary button --    |
|   returns to email     |
|   entry, pre-fills     |
|   email if available   |
|   from token)          |
|                        |
|  [Back to home]        |
|  (text link to /)      |
+========================+
```

### 2c: Used or Invalid Magic Link

**Trigger:** Token already consumed or malformed.
**Route:** `/auth` (expired-link view)

Same screen as 2b. Generic message: "This link has expired" covers both cases without leaking token state to the user. User taps "Send a new link" to restart.

### 2d: Form Validation Errors

**Trigger:** User submits prediction form with missing or out-of-range values.
**Route:** `/predict`

```
+========================+
|   Prediction Form      |
|   Route: /predict      |
|                        |
|  +--------------------+|
|  | Error Summary      ||
|  | role="alert"       ||
|  | aria-live=          ||
|  | "assertive"        ||
|  |                    ||
|  | "Please fix N      ||
|  |  fields below to   ||
|  |  continue"         ||
|  | (shown if >1 error)||
|  +--------------------+|
|                        |
|  Each invalid field:   |
|  - Red border (2px)    |
|  - Error message below |
|    in plain language:  |
|                        |
|    "Please enter your  |
|     BUN value (between |
|     5 and 150 mg/dL)"  |
|                        |
|  Auto-scroll to first  |
|  error field (smooth)  |
|  + focus               |
|                        |
|  Submit button remains |
|  enabled, re-validates |
|  on tap                |
+========================+
```

**Validation rules (client-side + server-side 422 mapping):**

| Field | Required | Type | Range | Error Message |
|-------|----------|------|-------|---------------|
| Name | Yes | text | 1-100 chars | "Please enter your name" |
| Age | Yes | integer | 18-120 | "Please enter a valid age (18-120)" |
| BUN | Yes | number | 5-150 mg/dL | "Please enter your BUN value (between 5 and 150 mg/dL)" |
| Creatinine | Yes | number | 0.1-30 mg/dL | "Please enter your creatinine value (between 0.1 and 30 mg/dL)" |
| Potassium | Yes | number | 1.0-10.0 mEq/L | "Please enter your potassium value (between 1.0 and 10.0 mEq/L)" |

Server-side 422 errors map `details[].field` to form fields and display server message text. Same visual treatment as client-side errors (red border, error text below field).

### 2e: Server Error on Prediction

**Trigger:** POST `/predict` returns 500, times out, or network error.
**Route:** `/results`

```
+========================+
|   Results Screen       |
|   Route: /results      |
|                        |
|  +--------------------+|
|  | Toast Banner       ||
|  | (top of screen)    ||
|  |                    ||
|  | [Warning icon]     ||
|  | "Something went    ||
|  |  wrong. Please     ||
|  |  try again."       ||
|  |                    ||
|  | [Try Again]        ||
|  | (re-submits form)  ||
|  +--------------------+|
|                        |
|  Form values preserved |
|  (no data loss)        |
+========================+
```

- Toast, not modal -- user can still see the page
- "Try Again" re-submits with the same payload
- Form input values are preserved in state

### 2f: PDF Download Error

**Trigger:** POST `/predict/pdf` fails.
**Route:** `/results`

```
+========================+
|   Results Screen       |
|   Route: /results      |
|                        |
|  [Chart renders        |
|   normally]            |
|                        |
|  [Download Your        |
|   Results (PDF)]       |
|  Button shows inline   |
|  error state:          |
|  "Download failed.     |
|   Try again."          |
|  (red text below       |
|   button, button       |
|   resets to default    |
|   state for retry)     |
+========================+
```

- Chart and results remain visible -- only the PDF failed
- No toast (inline error on the button is sufficient)
- User can retry immediately

---

## Session Model

Two states, down from five in v1.0. No guest state, no account state, no expiry state. Session is disposable.

```
+=============+                              +=============+
|  ANONYMOUS  |  -- enters email ----------> |  VERIFIED   |
| (no session)|  -- clicks magic link -----> | (Clerk      |
|             |                              |  session,   |
|             |                              |  15-min     |
|             |                              |  expiry)    |
+=============+                              +=============+
      ^                                            |
      |                                            |
      +--- session expires / browser closes -------+
           (return visitors start fresh)
```

### State Details

| State | Duration | What User Can Access | Data Stored |
|-------|----------|---------------------|-------------|
| ANONYMOUS | Indefinite | Landing (`/`), Email Entry (`/auth`) | Nothing |
| VERIFIED | 15 minutes (Clerk session) | Prediction Form (`/predict`), Results (`/results`) | Lead captured in `leads` table on POST `/predict` |

### What Is NOT in the Session Model

- No `GUEST` state with server-side TTL
- No `AUTHED` / `SIGNED_OUT` cycle
- No `EXPIRED` data state
- No session migration or data persistence across visits
- No refresh tokens or JWT rotation
- Clerk manages the entire session lifecycle

---

## Navigation Structure

Simplified header with no auth links. No "Sign In" or "My Results" -- there are no accounts.

```
+--------------------------------------------------+
| HEADER                                           |
| [KidneyHood logo]                               |
| (logo links to / on all pages)                   |
| No auth links, no navigation menu                |
+--------------------------------------------------+

| DISCLAIMER (desktop -- all pages with content)   |
| Full disclaimer text (inline)                    |
| [About] [Privacy] [Terms]                        |
+--------------------------------------------------+

| DISCLAIMER (mobile -- all pages with content)    |
| Sticky bar at bottom (collapsed by default)      |
| Tap to expand full text                          |
| shadow-up effect                                 |
+--------------------------------------------------+
```

### Route Protection

| Route | Unauthenticated User | Verified User |
|-------|---------------------|---------------|
| `/` | Landing page | Landing page (no change) |
| `/auth` | Email entry / link sent / expired | Redirect to `/predict` |
| `/predict` | Redirect to `/auth` | Prediction form |
| `/results` | Redirect to `/auth` | Results (or redirect to `/predict` if no prediction submitted) |

---

## Phase 2 Backlog (Deferred Flows)

These flows are not deleted. They will be redesigned when their backing features ship.

| Flow | Depends On | Phase 2 Feature |
|------|-----------|-----------------|
| Account Creation | User accounts epic | Persistent accounts with saved results |
| Returning User Sign-In | User accounts epic | Dashboard with visit history |
| Multi-Visit Re-Entry | Multi-visit tracking epic | Slope analysis, visit selector, dimmed prior data |
| Tier Upgrade | Confidence tiers epic | Optional fields (hemoglobin, glucose, etc.) unlock Tier 2/3 |
| Guest Data Expiry | Guest sessions epic | Server-side TTL with save prompt before expiry |
