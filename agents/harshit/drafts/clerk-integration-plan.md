# Clerk Authentication Integration Plan (LKID-1)

**Author:** Harshit (Frontend Developer)
**Date:** 2026-03-26
**Card:** LKID-1 / LEAN-001 — Clerk Project Setup & Configuration
**Sprint:** 2, Day 1
**Status:** Ready for implementation

---

## Overview

Replace the prototype auth stub with real Clerk magic-link authentication. Clerk handles all token management, session state, and email delivery. The frontend wires in the SDK; the backend (Donaldson's scope) verifies JWTs via JWKS.

**Goal after this card:** A user can enter their email, receive a real magic link, click it, land on `/predict` with their email pre-filled from the Clerk session, and hit protected API endpoints with a valid JWT.

---

## 1. Package Installation

```bash
cd app
npm install @clerk/nextjs
```

This single package covers:
- `ClerkProvider` (React context)
- `clerkMiddleware` (Next.js edge middleware for route protection)
- `useUser()`, `useAuth()` hooks
- `<SignIn />`, `<SignUp />` prebuilt components
- `currentUser()`, `auth()` server-side helpers

### Environment Variables

Create `.env.local` (never committed):

```env
# Clerk — get from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Route config
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/predict
```

Add to `.env.example` (committed, no values):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/predict
```

Vercel environment variables (set in dashboard, not code):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — publishable key
- `CLERK_SECRET_KEY` — secret key

---

## 2. Middleware Setup

**File:** `app/src/middleware.ts` (new file, Next.js app root)

Clerk's `clerkMiddleware` runs on the edge. By default it does nothing (all routes public). We use `createRouteMatcher` to define which routes require auth.

```typescript
// app/src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/predict(.*)",
  "/results(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

### Route Protection Matrix

| Route | Auth Required | Behavior |
|-------|--------------|----------|
| `/` | No | Landing page, public |
| `/auth` | No | Clerk sign-in, public |
| `/client/[slug]` | No | Client-facing pages, public |
| `/predict` | **Yes** | Redirects to `/auth` if unauthenticated |
| `/results` | **Yes** | Redirects to `/auth` if unauthenticated |

When an unauthenticated user hits `/predict`, Clerk middleware automatically redirects to the `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`/auth`). After sign-in, Clerk redirects back to the original destination.

---

## 3. ClerkProvider Wrapper

**File:** `app/src/app/layout.tsx` (modify existing)

Wrap the entire app with `ClerkProvider`. This gives all client components access to `useUser()`, `useAuth()`, etc.

```typescript
// app/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { SkipNav } from "@/components/skip-nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KidneyHood",
  description: "Track your kidney health with eGFR trajectory predictions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        // Match KidneyHood design tokens
        variables: {
          colorPrimary: "#004D43",       // brand teal
          colorTextOnPrimaryBackground: "#FFFFFF",
          borderRadius: "0.5rem",
          fontSize: "1rem",
        },
      }}
    >
      <html lang="en" className={`${inter.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col">
          <SkipNav />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### Clerk Dashboard Configuration (Manual Step)

In the Clerk Dashboard (https://dashboard.clerk.com), configure:

1. **Authentication > Email, Phone, Username** -- enable "Email address" only
2. **Authentication > Email, Phone, Username > Email address** -- set "Verification" to "Email verification link" (magic link)
3. **Authentication > Social connections** -- disable ALL (Google, Apple, etc.)
4. **Authentication > Password** -- set to "No" (disable passwords entirely)
5. **Session > Session lifetime** -- set to 15 minutes (the "bot gate" session)
6. **Webhooks > Add endpoint** -- point to the FastAPI backend URL (Donaldson's scope, LKID-4)

This ensures the only auth method is magic link. No password fallback, no social logins.

---

## 4. Auth Flow Replacement

**File:** `app/src/app/auth/page.tsx` (replace stub)

The current prototype has three hand-built views (`EmailEntryView`, `MagicLinkSentView`, `ExpiredLinkView`). Replace the entire file with Clerk's `<SignIn />` component, which handles all three states natively with magic link.

```typescript
// app/src/app/auth/page.tsx
import { SignIn } from "@clerk/nextjs";
import { Header } from "@/components/header";

export default function AuthPage() {
  return (
    <>
      <Header />
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-4 md:px-6 lg:px-8"
      >
        <div className="w-full max-w-[400px]">
          <SignIn
            appearance={{
              elements: {
                // Style overrides to match KidneyHood prototype look
                rootBox: "w-full",
                card: "shadow-none border-none p-0 w-full",
                headerTitle: "text-xl font-semibold text-foreground",
                headerSubtitle: "text-base text-foreground mt-2",
                formButtonPrimary:
                  "h-12 w-full rounded-lg text-base font-semibold bg-primary hover:bg-primary/90",
                formFieldInput: "h-12 text-base",
                formFieldLabel: "text-sm font-medium",
                footerAction: "text-sm text-muted-foreground",
                // Hide Clerk branding
                footer: "hidden",
              },
            }}
            routing="path"
            path="/auth"
            afterSignInUrl="/predict"
          />
        </div>
      </main>
    </>
  );
}
```

### What Clerk `<SignIn />` Handles Automatically

Since we configured magic-link-only in the dashboard:
- **Email entry** -- renders an email input + submit button
- **"Check your email"** -- shows confirmation after sending the link
- **Expired/used link** -- shows error with resend option
- **Verification** -- handles the magic link callback URL

We lose the custom deep-link buttons ("Open Gmail" / "Open Outlook") from the prototype. To add them back, use Clerk's `afterSignIn` callback or a custom `waitingScreen`:

```typescript
// Optional: Add deep-link buttons back via Clerk's appearance API
// This goes inside the SignIn appearance.elements:
{
  verificationLinkStatusBox: "space-y-4",
  // Then render a custom component below the SignIn:
}
```

**Alternative approach (if deep-link buttons are a hard requirement from Inga):** Use Clerk's custom flow with `useSignIn()` hook instead of `<SignIn />`. This gives full control over UI while Clerk handles the backend. I recommend starting with `<SignIn />` and iterating if needed.

### Deep-Link Buttons (Custom Flow Fallback)

If Inga requires the deep-link buttons, replace `<SignIn />` with a custom flow:

```typescript
// app/src/app/auth/page.tsx (custom flow variant)
"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, AlertTriangle } from "lucide-react";

type AuthView = "email-entry" | "link-sent" | "error";

export default function AuthPage() {
  const { signIn, isLoaded } = useSignIn();
  const [view, setView] = useState<AuthView>("email-entry");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  if (!isLoaded) return null;

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      await signIn!.create({
        strategy: "email_link",
        identifier: email,
        redirectUrl: `${window.location.origin}/auth/verify`,
      });
      setView("link-sent");
    } catch (err: unknown) {
      const clerkError = err as { errors?: { message: string }[] };
      setError(clerkError.errors?.[0]?.message ?? "Something went wrong");
      setView("error");
    }
  };

  const handleResend = () => {
    setView("email-entry");
    setError("");
  };

  return (
    <>
      <Header />
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-4 md:px-6 lg:px-8"
      >
        <div className="w-full max-w-[400px]">
          {view === "email-entry" && (
            <form onSubmit={handleSendLink} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Get Started
                </h1>
                <p className="mt-2 text-base text-foreground">
                  Enter your email to receive a secure sign-in link.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>
              <Button
                type="submit"
                className="h-12 w-full rounded-lg text-base font-semibold"
              >
                Send me a sign-in link
              </Button>
            </form>
          )}

          {view === "link-sent" && (
            <div className="space-y-6 text-center">
              <Mail className="mx-auto size-12 text-primary" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Check your email!
                </h1>
                <p className="mt-2 text-base text-foreground">
                  We sent a sign-in link to{" "}
                  <span className="font-semibold">{email}</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The link expires in 15 minutes.
                </p>
              </div>

              {/* Deep-link buttons (preserved from prototype) */}
              <div className="space-y-3">
                <a
                  href="https://mail.google.com/mail/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-base font-medium text-foreground transition-colors hover:bg-[#F8F9FA]"
                >
                  Open Gmail
                </a>
                <a
                  href="https://outlook.live.com/mail/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-base font-medium text-foreground transition-colors hover:bg-[#F8F9FA]"
                >
                  Open Outlook
                </a>
              </div>

              <button
                onClick={handleResend}
                className="min-h-[44px] text-base text-muted-foreground underline"
              >
                Resend link
              </button>
            </div>
          )}

          {view === "error" && (
            <div className="space-y-6 text-center">
              <AlertTriangle className="mx-auto size-12 text-destructive" />
              <p className="text-base text-foreground">{error}</p>
              <Button
                onClick={handleResend}
                className="h-12 w-full rounded-lg text-base font-semibold"
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
```

### Verification Callback Page

**File:** `app/src/app/auth/verify/page.tsx` (new file)

When the user clicks the magic link in their email, Clerk redirects to this page. The `AuthenticateWithRedirectCallback` component verifies the token and redirects to `/predict`.

```typescript
// app/src/app/auth/verify/page.tsx
"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function VerifyPage() {
  return (
    <AuthenticateWithRedirectCallback
      afterSignInUrl="/predict"
      afterSignUpUrl="/predict"
    />
  );
}
```

---

## 5. Reading Email from Clerk Session

**File:** `app/src/app/predict/page.tsx` (modify existing)

Replace the hardcoded `j***@email.com` default with the real email from Clerk's `useUser()` hook.

### Key Changes

```typescript
// At the top of predict/page.tsx, add:
import { useUser } from "@clerk/nextjs";

// Inside PredictPage component, add:
const { user } = useUser();
const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? "";
```

Then update the email field definition to use `clerkEmail`:

```typescript
// Replace the static email field definition with a dynamic one.
// Move the `fields` array inside the component so it can use clerkEmail:

export default function PredictPage() {
  const router = useRouter();
  const { user } = useUser();
  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useFormValidation(PREDICT_FORM_RULES);

  // Email field now uses real Clerk data
  const emailField: FormFieldDef = {
    id: "email",
    label: "Email",
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    placeholder: clerkEmail,
    helper: "Pre-filled from sign-in",
    readOnly: true,
    defaultValue: clerkEmail,
  };

  // Replace the static email entry in the fields array
  const formFields = [emailField, ...fields.filter((f) => f.id !== "email")];

  // ... rest of component uses formFields instead of fields
```

### Sending Clerk JWT with API Requests

When submitting the prediction form, include the Clerk JWT in the `Authorization` header. Clerk provides `getToken()` via the `useAuth()` hook.

```typescript
import { useAuth } from "@clerk/nextjs";

// Inside PredictPage:
const { getToken } = useAuth();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  form.markSubmitted();
  if (!form.valid) return;

  setIsSubmitting(true);
  try {
    const token = await getToken();
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: form.values.name,
        bun: Number(form.values.bun),
        creatinine: Number(form.values.creatinine),
        age: Number(form.values.age),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Map API validation errors to form fields
      if (response.status === 422 && errorData.error?.details) {
        errorData.error.details.forEach(
          (detail: { field: string; message: string }) => {
            form.setFieldError(detail.field, detail.message);
          }
        );
      } else {
        throw new Error(errorData.error?.message ?? "Prediction failed");
      }
      return;
    }

    const data = await response.json();
    // Store prediction data for the results page
    sessionStorage.setItem("predictionResult", JSON.stringify(data));
    router.push("/results");
  } catch (err) {
    console.error("Prediction failed:", err);
    // Show generic error — component should have an error state
  } finally {
    setIsSubmitting(false);
  }
};
```

**Note:** The actual API URL will be the FastAPI backend on Railway (e.g., `https://kidneyhood-api.up.railway.app/predict`), not a Next.js API route. Use an environment variable:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # local dev
# On Vercel: https://kidneyhood-api.up.railway.app
```

```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict`, {
  // ...
});
```

---

## 6. Lead Capture via Clerk Webhook

**Preferred approach (server-side, Donaldson's scope):**

Clerk fires a `user.created` webhook when a new user verifies via magic link. The FastAPI backend receives this webhook and inserts a row into the `leads` table. No frontend work needed for this path -- it is covered by LKID-4.

**Frontend responsibility:** None. The webhook fires automatically when Clerk creates the user session. Harshit does not need to POST to any lead-capture endpoint.

**Data enrichment (LKID-6):** When the user submits the prediction form, the `/predict` endpoint updates the lead row with `name`, `bun`, `creatinine`, `age`. This happens server-side in Donaldson's handler. The frontend just sends the form data with the JWT.

---

## 7. Files Summary

### New Files

| File | Purpose |
|------|---------|
| `app/src/middleware.ts` | Clerk route protection middleware |
| `app/src/app/auth/verify/page.tsx` | Magic link callback handler |
| `app/.env.local` | Clerk keys (not committed) |
| `app/.env.example` | Template for env vars (committed) |

### Modified Files

| File | Change |
|------|--------|
| `app/src/app/layout.tsx` | Wrap with `ClerkProvider` |
| `app/src/app/auth/page.tsx` | Replace stub with Clerk `<SignIn />` or custom `useSignIn()` flow |
| `app/src/app/predict/page.tsx` | Add `useUser()` for email pre-fill, `useAuth()` for JWT on API calls |
| `app/package.json` | Add `@clerk/nextjs` dependency |

### No Changes Needed

| File | Reason |
|------|--------|
| `app/src/app/page.tsx` (landing) | Public route, no auth needed |
| `app/src/app/client/[slug]/*` | Public route, no auth needed |
| `app/src/components/*` | No auth-aware components needed |

---

## 8. Implementation Order

Execute in this sequence on the `feat/LKID-1-clerk-setup` branch:

```
Step 1: npm install @clerk/nextjs
Step 2: Create .env.local and .env.example with Clerk keys
Step 3: Create middleware.ts (route protection)
Step 4: Wrap layout.tsx with ClerkProvider
Step 5: Replace auth/page.tsx (start with <SignIn />, iterate if deep-links needed)
Step 6: Create auth/verify/page.tsx (magic link callback)
Step 7: Update predict/page.tsx (useUser for email, useAuth for JWT)
Step 8: Smoke test: email entry -> magic link -> verify -> /predict with real email
```

**Estimated time:** 2-3 hours for the full integration. The Clerk SDK does most of the heavy lifting. The majority of time will be spent on styling the `<SignIn />` component to match the prototype's look and feel, and deciding whether to use `<SignIn />` or the custom `useSignIn()` flow for the deep-link buttons.

---

## 9. Decision Points for Team

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | `<SignIn />` vs custom `useSignIn()` flow? | Prebuilt = faster, less control. Custom = preserves deep-link buttons exactly | Start with `<SignIn />`, switch to custom if Inga requires deep-link buttons |
| 2 | Where does the API URL live? | Env var vs hardcoded | `NEXT_PUBLIC_API_URL` env var, different per environment |
| 3 | How to pass prediction data to results page? | `sessionStorage`, URL params, React context | `sessionStorage` -- simplest, no persistence needed |
| 4 | Clerk branding visible? | Default shows "Secured by Clerk" | Hide via `footer: "hidden"` in appearance config |

---

## 10. Acceptance Criteria Checklist (from LEAN-001)

- [ ] Clerk project created with magic link as the sole auth method
- [ ] 15-minute magic link expiry configured (Clerk Dashboard)
- [ ] `@clerk/nextjs` installed and middleware configured
- [ ] Environment variables documented (`.env.example`)
- [ ] Protected routes (`/predict`, `/results`) redirect to `/auth` when unauthenticated
- [ ] Public routes (`/`, `/auth`, `/client/[slug]`) remain accessible
- [ ] Email pre-filled on `/predict` from Clerk session
- [ ] JWT available for API requests via `useAuth().getToken()`
- [ ] Clerk webhook endpoint configured (Donaldson's scope, LKID-4)
