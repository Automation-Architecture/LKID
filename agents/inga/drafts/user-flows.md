# KidneyHood User Flows

**Author:** Inga (Senior UX/UI Designer)
**Version:** 1.0 -- Discovery Phase Draft
**Date:** 2026-03-25
**Status:** Draft for team review

---

## Table of Contents

1. [Flow 1: Guest Prediction (Primary Happy Path)](#flow-1-guest-prediction)
2. [Flow 2: Account Creation via Magic Link](#flow-2-account-creation-via-magic-link)
3. [Flow 3: Returning User Sign-In](#flow-3-returning-user-sign-in)
4. [Flow 4: Multi-Visit Re-Entry](#flow-4-multi-visit-re-entry)
5. [Flow 5: Tier Upgrade (Optional Fields)](#flow-5-tier-upgrade)
6. [Flow 6: Error Recovery](#flow-6-error-recovery)
7. [Flow 7: Magic Link Expiry and Retry](#flow-7-magic-link-expiry-and-retry)
8. [Flow 8: Guest Data Expiry](#flow-8-guest-data-expiry)
9. [State Diagram: Session Lifecycle](#state-diagram-session-lifecycle)

---

## Flow 1: Guest Prediction

The primary path for a first-time visitor. No account required.

```
+========================+
|     Landing Page       |
|     (/ root route)     |
|                        |
|  Headline: "Understand |
|  Your Kidney Health    |
|  Trajectory"           |
|                        |
|  [Get Started] button  |
+===========+============+
            |
            | User taps "Get Started"
            | (scrolls to form OR navigates to /predict)
            v
+========================+
|   Prediction Form      |
|   /predict route       |
|                        |
|   SECTION 1: Required  |
|   - Age (number)       |
|   - Sex (radio: M/F/   |
|     Prefer not to say) |
|   - BUN (number, mg/dL)|
|   - Creatinine (number,|
|     mg/dL)             |
|   - Potassium (number, |
|     mEq/L)             |
+===========+============+
            |
            | All required fields valid
            | (submit button activates)
            |
            | [OPTIONAL BRANCH A]
            | User taps "Sharpen your prediction"
            v
+------------------------+
| SECTION 2: Tier 2      |
| (collapsible, closed   |
|  by default)           |
|                        |
| Unlock prompt:         |
| "Add both your         |
|  hemoglobin and glucose|
|  results to sharpen    |
|  your prediction."     |
|                        |
| - Hemoglobin (g/dL)    |
| - Glucose (mg/dL)      |
+===========+============+
            |
            | [OPTIONAL BRANCH B]
            | User taps "Additional health info"
            v
+------------------------+
| SECTION 3: Silent      |
| (collapsible, closed   |
|  by default)           |
|                        |
| - Systolic BP (mmHg)   |
| - SGLT2 inhibitor      |
|   (toggle: Yes/No)     |
| - Proteinuria (number  |
|   + unit select)       |
| - CKD Diagnosis        |
|   (select dropdown)    |
+===========+============+
            |
            | User taps "See My Prediction"
            v
+========================+
|   Loading State        |
|   (same route, inline) |
|                        |
|   - Skeleton chart     |
|     (pulsing gray)     |
|   - 4 skeleton stat    |
|     cards (pulsing)    |
|   - "Calculating your  |
|     prediction..."     |
+===========+============+
            |
            | POST /api/predict returns 200
            v
+========================+
|   Results Screen       |
|   /results route       |
|                        |
|   - eGFR Chart         |
|   - Stat Card Grid     |
|     (4 scenarios)      |
|   - Confidence Badge   |
|     (Tier 1 or 2)      |
|   - Disclaimer         |
|     (sticky footer     |
|      mobile / inline   |
|      desktop)          |
+===========+============+
            |
            | After 2-second delay
            | (slide-in from bottom)
            v
+========================+
|   Save Prompt          |
|   (overlay card)       |
|                        |
|   "Save your results"  |
|   "Your results will   |
|    be available for    |
|    24 hours. Create a  |
|    free account to     |
|    save them           |
|    permanently."       |
|                        |
|   [Email input]        |
|   [Send me a sign-in   |
|    link] button        |
|                        |
|   [X dismiss]          |
+========================+
```

**Exit points:**
- User dismisses save prompt -> stays on results as guest (24hr TTL)
- User enters email -> branches to Flow 2
- User closes browser -> guest data persists server-side for 24hr

---

## Flow 2: Account Creation via Magic Link

Triggered from the save prompt on the results screen OR from the header sign-in link.

```
+========================+       +========================+
|   Save Prompt          |       |   Header "Sign In"     |
|   (results screen)     |       |   link (any page)      |
+===========+============+       +===========+============+
            |                                |
            +----------+---------------------+
                       |
                       v
            +========================+
            |   Email Entry          |
            |                        |
            |   "Enter your email"   |
            |   [email input]        |
            |   [Send me a sign-in   |
            |    link] button        |
            +===========+============+
                        |
                        | POST /api/auth/magic-link
                        v
            +========================+
            |   MagicLinkSent        |
            |   Confirmation Screen  |
            |                        |
            |   "Check your email!"  |
            |   "We sent a sign-in   |
            |    link to             |
            |    j***@email.com"     |
            |                        |
            |   [Resend link]        |
            |   (disabled 60s after  |
            |    send, then active)  |
            |                        |
            |   "Didn't receive it?  |
            |    Check your spam     |
            |    folder."            |
            +===========+============+
                        |
                        | User opens email,
                        | clicks magic link
                        v
            +========================+
            |   Magic Link Handler   |
            |   /auth/verify?token=  |
            |                        |
            |   System:              |
            |   1. Validates token   |
            |   2. Creates account   |
            |      (if new user)     |
            |   3. Migrates guest    |
            |      session data      |
            |   4. Sets auth cookie  |
            +===========+============+
                        |
                        | Redirect
                        v
            +========================+
            |   Results Screen       |
            |   (authenticated)      |
            |                        |
            |   AuthBanner:          |
            |   "Welcome! Your       |
            |    results are saved." |
            |                        |
            |   Header now shows:    |
            |   [My Results] link    |
            |   instead of           |
            |   [Sign In]            |
            +========================+
```

---

## Flow 3: Returning User Sign-In

For users who already have an account and want to view past results or add new lab values.

```
+========================+
|   Any Page             |
|   Header: [Sign In]    |
+===========+============+
            |
            | User taps "Sign In"
            v
+========================+
|   SignInForm           |
|   /signin route        |
|                        |
|   "Welcome back"       |
|   [Email input]        |
|   [Send me a sign-in   |
|    link] button        |
+===========+============+
            |
            | POST /api/auth/magic-link
            v
+========================+
|   MagicLinkSent        |
|   (same as Flow 2)     |
+===========+============+
            |
            | User clicks link
            | in email
            v
+========================+
|   Magic Link Handler   |
|   Token valid?         |
+===========+============+
     |              |
     | YES          | NO (expired/invalid)
     v              v
+============+  +========================+
| Dashboard  |  | Error Screen           |
| /results   |  |                        |
|            |  | "This link has expired"|
| Shows all  |  | "Sign-in links are     |
| past visits|  |  valid for 15 minutes."|
| with most  |  |                        |
| recent     |  | [Request a new link]   |
| first      |  +========================+
+============+
```

---

## Flow 4: Multi-Visit Re-Entry

Authenticated users adding subsequent lab results to build trajectory history.

```
+========================+
|   Results Dashboard    |
|   (authenticated)      |
|                        |
|   Shows chart with     |
|   existing data points |
|                        |
|   [Add New Lab Values] |
|   button (primary CTA) |
+===========+============+
            |
            | User taps "Add New Lab Values"
            v
+========================+
|   Prediction Form      |
|   (pre-filled context) |
|                        |
|   Banner: "Adding lab  |
|   values from a new    |
|   visit. Your previous |
|   results will remain  |
|   saved."              |
|                        |
|   Age: pre-filled      |
|   Sex: pre-filled      |
|   (both editable)      |
|                        |
|   Lab values: empty    |
|   (new entry required) |
+===========+============+
            |
            | User fills fields,
            | taps "See My Prediction"
            v
+========================+
|   Loading State        |
+===========+============+
            |
            v
+========================+
|   Updated Results      |
|                        |
|   Chart now shows:     |
|   - Previous data      |
|     points (dimmed)    |
|   - New prediction     |
|     trajectories       |
|     (highlighted)      |
|                        |
|   Visit selector:      |
|   [Visit 1: Jan 2026]  |
|   [Visit 2: Mar 2026]  |  <-- active
|                        |
|   Stat cards show      |
|   latest prediction    |
+========================+
```

---

## Flow 5: Tier Upgrade

User starts with Tier 1 (required fields only), then adds optional fields to unlock Tier 2.

```
+========================+
|   Results Screen       |
|   (Tier 1 prediction)  |
|                        |
|   Confidence Badge:    |
|   "Basic Prediction"   |
|   (Tier 1)             |
|                        |
|   UnlockPrompt card:   |
|   "Add both your       |
|    hemoglobin and      |
|    glucose results to  |
|    sharpen your        |
|    prediction."        |
|                        |
|   [Add Lab Values]     |
|   button               |
+===========+============+
            |
            | User taps "Add Lab Values"
            v
+========================+
|   Form (partial)       |
|   Only Tier 2 section  |
|   expanded:            |
|                        |
|   - Hemoglobin (g/dL)  |
|   - Glucose (mg/dL)    |
|                        |
|   Required fields      |
|   shown but pre-filled |
|   from previous entry  |
|                        |
|   [Update My           |
|    Prediction] button  |
+===========+============+
            |
            | Both hemoglobin AND
            | glucose provided
            v
+========================+
|   Updated Results      |
|   (Tier 2 prediction)  |
|                        |
|   Confidence Badge:    |
|   "Enhanced Prediction"|
|   (Tier 2)             |
|                        |
|   UnlockPrompt:        |
|   HIDDEN (Tier 2       |
|   already achieved)    |
|                        |
|   Chart trajectories   |
|   may show different   |
|   curves with          |
|   additional inputs    |
+========================+
```

**Important:** If only ONE of hemoglobin/glucose is provided, the prediction remains Tier 1. The unlock prompt persists. Inline helper: "Both hemoglobin and glucose are needed for an enhanced prediction."

---

## Flow 6: Error Recovery

### 6a: Form Validation Errors

```
+========================+
|   Prediction Form      |
|   User taps "See My    |
|   Prediction" with     |
|   invalid/missing data |
+===========+============+
            |
            | Client-side validation
            v
+========================+
|   Form with Errors     |
|                        |
|   Scroll to FIRST      |
|   field with error     |
|   (smooth scroll)      |
|                        |
|   Each invalid field:  |
|   - Red border         |
|     (2px #D32F2F)      |
|   - Pink background    |
|     (#FDECEA)          |
|   - Error message      |
|     below field in     |
|     plain language:    |
|                        |
|   "Please enter your   |
|    BUN value (between  |
|    5 and 150 mg/dL)"   |
|                        |
|   Submit button:       |
|   remains enabled but  |
|   re-validates on tap  |
|                        |
|   Error summary at top |
|   of form (if >2       |
|   errors):             |
|   "Please fix 3 fields |
|    below to continue"  |
+========================+
```

### 6b: Server-Side Validation Errors (API error envelope)

```
+========================+
|   API returns 422      |
|   {                    |
|     error: {           |
|       code: "INVALID", |
|       message: "...",  |
|       details: [       |
|         { field: "bun",|
|           message: "..."
|         }              |
|       ]                |
|     }                  |
|   }                    |
+===========+============+
            |
            | Map details[].field
            | to form fields
            v
+========================+
|   Form with Server     |
|   Errors               |
|                        |
|   Same visual treatment|
|   as client-side       |
|   errors (red border,  |
|   pink bg, error text) |
|                        |
|   Uses server message  |
|   text directly if     |
|   available, otherwise |
|   falls back to        |
|   generic message      |
+========================+
```

### 6c: Network / Server Errors

```
+========================+
|   Loading State        |
|   POST /api/predict    |
|   fails (500, timeout, |
|   network error)       |
+===========+============+
            |
            v
+========================+
|   Error Banner         |
|   (toast at top of     |
|    screen, NOT modal)  |
|                        |
|   Icon: warning        |
|   "Something went      |
|    wrong. Please try   |
|    again."             |
|                        |
|   [Try Again] button   |
|   (re-submits form)    |
|                        |
|   Form remains filled  |
|   with previous values |
|   (no data loss)       |
+========================+
```

---

## Flow 7: Magic Link Expiry and Retry

```
+========================+
|   User clicks expired  |
|   magic link           |
|   (>15 minutes old)    |
+===========+============+
            |
            v
+========================+
|   Expired Link Screen  |
|   /auth/verify?token=  |
|                        |
|   "This sign-in link   |
|    has expired"        |
|                        |
|   "Sign-in links are   |
|    valid for 15        |
|    minutes for your    |
|    security."          |
|                        |
|   [Send a new link]    |
|   Pre-fills email if   |
|   available from token |
|                        |
|   [Back to home]       |
+===========+============+
            |
            | User taps "Send a new link"
            v
+========================+
|   MagicLinkSent        |
|   (same as Flow 2)     |
+========================+
```

---

## Flow 8: Guest Data Expiry

User returns after 24 hours without having created an account.

```
+========================+
|   User returns to      |
|   /results with        |
|   expired guest        |
|   session (>24hr)      |
+===========+============+
            |
            v
+========================+
|   Data Expired Screen  |
|                        |
|   "Your previous       |
|    results have        |
|    expired"            |
|                        |
|   "Guest results are   |
|    available for 24    |
|    hours. Create a     |
|    free account to     |
|    save your results   |
|    permanently."       |
|                        |
|   [Enter New Lab       |
|    Values] button      |
|   (goes to form)       |
|                        |
|   [Create an Account]  |
|   (goes to sign-in)    |
+========================+
```

---

## State Diagram: Session Lifecycle

```
                    +============+
                    |  ANONYMOUS  |
                    | (no session)|
                    +======+======+
                           |
                           | Visits site
                           v
                    +============+
                    |   GUEST    |
                    | (server-   |
                    |  side 24hr |
                    |  TTL)      |
                    +======+======+
                      |         |
         Creates      |         | 24hr expires
         account      |         |
         (magic link) |         v
                      |  +============+
                      |  |  EXPIRED   |
                      |  | (data gone)|
                      |  +======+======+
                      |         |
                      |         | Re-enters data
                      |         | + creates account
                      v         v
                    +============+
                    | AUTHED     |
                    | (permanent |
                    |  account)  |
                    +======+======+
                           |
                           | Signs out /
                           | session expires
                           v
                    +============+
                    | SIGNED OUT |
                    | (account   |
                    |  exists,   |
                    |  data safe)|
                    +======+======+
                           |
                           | Signs in
                           | (magic link)
                           v
                    +============+
                    |   AUTHED   |
                    | (restored) |
                    +============+
```

---

## Route Map

| Route | State | Screen | Auth Required |
|-------|-------|--------|---------------|
| `/` | Any | Landing page | No |
| `/predict` | Any | Prediction form | No |
| `/results` | Guest | Results + save prompt | No |
| `/results` | Authed | Results dashboard with visit history | Yes |
| `/signin` | Anonymous | Sign-in form (email only) | No |
| `/auth/verify` | Any | Magic link handler (redirect) | No |
| `/auth/expired` | Any | Expired link screen | No |

---

## Navigation Structure

```
+--------------------------------------------------+
| HEADER                                           |
| [KidneyHood logo]          [Sign In] (guest)    |
|                      OR    [My Results] (authed) |
+--------------------------------------------------+

| FOOTER (desktop)                                 |
| Disclaimer text (full, inline)                   |
| [About] [Privacy] [Terms]                        |
+--------------------------------------------------+

| FOOTER (mobile)                                  |
| Sticky disclaimer bar (collapsed, tap to expand) |
+--------------------------------------------------+
```
