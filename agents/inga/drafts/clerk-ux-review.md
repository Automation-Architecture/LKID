# Clerk Magic-Link UX Review for 60+ Users

**Author:** Inga (UX/UI Designer)
**Date:** 2026-03-26
**Source:** `agents/harshit/drafts/clerk-integration-plan.md`
**Audience:** CKD patients, predominantly 60+ years old

---

## Summary

Harshit's Clerk integration plan is technically sound. The custom `useSignIn()` flow (not the default `<SignIn />` component) is the right choice for this audience. The deep-link buttons, explicit instructions, and large touch targets in the prototype must be preserved.

This review covers five areas where the auth flow needs adjustment for older, less tech-savvy users who may never have seen a magic-link flow before.

---

## 1. Terminology: Replace "Magic Link"

**Problem:** The term "magic link" means nothing to a 60-year-old CKD patient. It sounds gimmicky, possibly suspicious. "Is this a scam?" is a real risk.

**Recommendation:** Never surface the phrase "magic link" in the UI. Use plain language:

| Current (Avoid) | Recommended |
|-----------------|-------------|
| "We sent you a magic link" | "We sent you a sign-in link" |
| "Click the magic link in your email" | "Open your email and click the link we sent" |
| "Magic link expired" | "Your sign-in link has expired" |
| "Resend magic link" | "Send a new link" |

The button label should read **"Send me a sign-in link"** (already correct in Harshit's custom flow). The confirmation screen heading should read **"Check your email"** (also correct).

**Implementation note:** Clerk's default `<SignIn />` component uses its own copy. If we use `<SignIn />`, we cannot control this terminology. This is a strong reason to use the custom `useSignIn()` flow that Harshit already drafted.

**Verdict:** Use the custom `useSignIn()` flow. The `<SignIn />` component does not give enough copy control for this audience.

---

## 2. Deep-Link Buttons (Open Gmail / Open Outlook)

**Problem:** Harshit's plan notes that switching to Clerk's `<SignIn />` component would lose the "Open Gmail" and "Open Outlook" deep-link buttons from the prototype. These buttons are critical for 60+ users.

**Why they matter:**
- Older users may not know how to switch between browser tabs
- "Check your email" is vague -- they may not know which app to open
- The buttons reduce the cognitive load of "what do I do next?"
- In usability testing with seniors, explicit "go here next" buttons dramatically reduce drop-off

**Recommendation:** Hard requirement -- preserve the deep-link buttons. Use the custom `useSignIn()` flow.

### Additional deep-link buttons to consider

| Provider | URL | Include? |
|----------|-----|----------|
| Gmail | `https://mail.google.com/mail/` | Yes (already in prototype) |
| Outlook | `https://outlook.live.com/mail/` | Yes (already in prototype) |
| Yahoo Mail | `https://mail.yahoo.com/` | Yes -- Yahoo has significant 60+ market share |
| Apple Mail | N/A (no web deep link) | No, but add a note: "Or open the Mail app on your phone" |

### Button design for deep-link row

```
[  Open Gmail   ]    <-- full-width, 56px height, 18px text
[  Open Outlook ]
[  Open Yahoo Mail ]
```

- Each button: `h-14` (56px), full width, `text-lg` (18px), `font-medium`
- Provider icon on the left (Gmail logo, Outlook logo, Yahoo logo) at 24px
- Border: 1px solid `#D8D8D8` (divider gray)
- Background: `#FFFFFF` (white)
- Hover: `#F9F7F2` (cream)

Below the buttons, add a plain text fallback:

> Or open your email app and look for a message from **KidneyHood**.

---

## 3. Link Expiry (15-Minute Timeout)

**Problem:** 15 minutes is tight for a 60+ user who may need to find their reading glasses, open their email app, scroll past promotions to find the email, and then click the link. If the link expires, they hit an error page with no clear recovery path.

### Recommendation A: Extend to 30 minutes

If Clerk dashboard allows it, extend the magic link expiry to 30 minutes. The security risk is minimal -- this is a lead-gen app, not a banking portal. The session itself is already capped at 15 minutes per LKID spec.

### Recommendation B: Clear expiry messaging

Regardless of timeout duration, the expired-link screen must be crystal clear:

**Current error pattern (generic):**
> "Something went wrong"

**Recommended expired-link screen:**

```
[Clock icon -- Lucide Clock, 48px, #004D43 teal]

This link has expired.

Sign-in links are only valid for [15/30] minutes.
Don't worry -- we can send you a new one.

[ Send me a new link ]    <-- primary button, h-14, full width

Having trouble? Call us at [phone number] or email [support email].
```

**Key elements:**
- No blame language ("you took too long")
- Reassurance ("Don't worry")
- Single clear action (one button)
- Human fallback (phone number) -- essential for 60+ users who may give up on digital flows
- Font sizes: heading at `1.5rem` (24px), body at `1.125rem` (18px)

### On the "link sent" screen, set expectations

Add a visible countdown or at minimum a static note:

> This link will work for the next **30 minutes**.

Do not show a live countdown timer -- it creates anxiety. A static statement is sufficient.

---

## 4. Font Sizes, Button Sizes, and Contrast

The auth screens must meet WCAG AAA for this audience, not just AA. Older users with CKD often have comorbid vision issues (diabetic retinopathy, glaucoma).

### Minimum sizes

| Element | Minimum Size | Harshit's Current | Verdict |
|---------|-------------|-------------------|---------|
| Page heading | 28px / `1.75rem` | 20px (`text-xl`) | **Increase** |
| Body / instruction text | 18px / `1.125rem` | 16px (`text-base`) | **Increase** |
| Input field text | 18px / `1.125rem` | 16px (`text-base`) | **Increase** |
| Input field height | 56px / `h-14` | 48px (`h-12`) | **Increase** |
| Button text | 18px / `1.125rem` | 16px (`text-base`) | **Increase** |
| Button height | 56px / `h-14` | 48px (`h-12`) | **Increase** |
| Helper / secondary text | 16px / `1rem` | 14px (`text-sm`) | **Increase** |
| Touch target (all interactive) | 48px minimum | 44px (`min-h-[44px]`) | **Increase** |

### Specific Clerk appearance overrides

If using the custom flow (recommended), these are just Tailwind classes. If using `<SignIn />`, override via:

```typescript
appearance={{
  variables: {
    fontSize: "1.125rem",        // 18px base
    borderRadius: "0.75rem",     // 12px
    spacingUnit: "1.25rem",      // 20px
  },
  elements: {
    formFieldInput: "h-14 text-lg",
    formButtonPrimary: "h-14 text-lg font-semibold",
    headerTitle: "text-2xl font-bold",        // 28px+
    headerSubtitle: "text-lg mt-3",           // 18px
    formFieldLabel: "text-base font-medium",  // 16px
  },
}}
```

### Contrast requirements

| Pair | Ratio | Target |
|------|-------|--------|
| `#004D43` (teal) on `#FFFFFF` (white) | 8.6:1 | Passes AAA |
| `#004D43` (teal) on `#F9F7F2` (cream) | 8.1:1 | Passes AAA |
| `#FFFFFF` (white) on `#004D43` (teal button) | 8.6:1 | Passes AAA |
| `#636363` (body) on `#FFFFFF` (white) | 5.9:1 | Passes AA, fails AAA -- **use `#4A4A4A` instead for body text on auth screens** |
| `#898A8D` (gray) on `#FFFFFF` (white) | 3.5:1 | **Fails AA** -- do not use for any text on auth screens |

### Input field design

- Visible border: 2px solid `#898A8D` (gray), not the default 1px. Older users need to see where to click.
- Focus state: 2px solid `#004D43` (teal) with a `0 0 0 3px rgba(0, 77, 67, 0.2)` ring
- Label position: above the field (not placeholder-only). Floating labels are disorienting for older users.
- Placeholder text: light hint only, never the sole label

---

## 5. Step-by-Step Instructions

Older users need explicit, numbered instructions. Do not assume they understand the magic-link mental model.

### On the email entry screen

Below the heading "Get Started", add:

> **How it works:**
> 1. Enter your email address below
> 2. We will send you a sign-in link
> 3. Open your email and click the link
> 4. You will be brought back here to enter your lab values

This sets expectations upfront. The numbered list is scannable and reduces "what happens next?" anxiety.

### On the "check your email" screen

Replace or supplement the current copy with:

> **What to do next:**
> 1. Open your email (use one of the buttons below)
> 2. Find the email from **KidneyHood** (check your spam folder if needed)
> 3. Click the **"Sign in to KidneyHood"** button in the email
> 4. You will be redirected back to this site automatically

### On successful verification (redirect to /predict)

Show a brief confirmation before the form:

> **You are signed in.** Your email ([email]) has been verified. You can now enter your lab values below.

This confirms the flow worked. Without it, users may not realize they successfully authenticated, especially if the redirect is fast.

---

## 6. Additional Recommendations

### A. Email sender name

Configure Clerk to send from a recognizable name. Default Clerk emails come from "Clerk" or the app name. Ensure the sender is:

- **From name:** "KidneyHood"
- **From email:** `noreply@kidneyhood.com` (or similar branded domain)
- **Subject line:** "Your KidneyHood sign-in link" (not "Verify your email" which sounds like account creation)

### B. Email template customization

Clerk allows custom email templates. The magic-link email body should:

- Use 18px+ font size in the email HTML
- Have one large, obvious button: **"Sign in to KidneyHood"** (not "Verify" or "Confirm")
- Include the instruction: "Click the button above to sign in. This link expires in 30 minutes."
- No footer clutter, no "manage your account" links
- Brand teal (`#004D43`) button with white text

### C. Error states to design

| Error | Screen | Copy |
|-------|--------|------|
| Invalid email format | Email entry | "Please enter a valid email address (example: name@email.com)" |
| Rate limited (too many attempts) | Email entry | "Too many attempts. Please wait a few minutes and try again." |
| Link already used | Verification | "This link has already been used. If you need to sign in again, enter your email to get a new link." |
| Link expired | Verification | See Section 3 above |
| Network error | Any | "We could not connect. Please check your internet connection and try again." |

### D. Session expiry during form entry

The Clerk session is set to 15 minutes. If a user takes longer than 15 minutes to fill out the prediction form (plausible for a 60+ user looking up lab values from paperwork), the session expires mid-form and the API call will fail with a 401.

**Recommendation:** Show a gentle re-auth prompt, NOT a redirect that loses their form data:

> "Your session has timed out for security. Click below to sign in again -- your entered values will be saved."

Preserve form state in `sessionStorage` before re-authenticating. After re-auth, restore the form. This is a Sprint 3 enhancement but should be planned now.

---

## Summary of Hard Requirements for Harshit

1. **Use custom `useSignIn()` flow**, not `<SignIn />` component -- copy control is essential
2. **Preserve deep-link buttons** (Gmail, Outlook) and add Yahoo Mail
3. **Increase all font sizes and touch targets** per the table in Section 4
4. **Add numbered instructions** on email entry and link-sent screens
5. **Design the expired-link screen** with reassurance copy and a human fallback
6. **Add post-auth confirmation** on the /predict page
7. **Plan for session expiry** during form entry (preserve form state)
