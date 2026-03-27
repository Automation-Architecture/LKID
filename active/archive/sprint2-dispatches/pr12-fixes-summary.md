# PR #12 QA Fixes Summary -- Clerk Auth Scaffold

**Branch:** `feat/LKID-1-clerk-auth`
**Date:** 2026-03-27
**Implementer:** Harshit (Frontend Developer)
**Source:** Yuri QA report + Luca dispatch doc

---

## Changes Made

### CK-01 (HIGH): ClerkProvider moved inside `<body>`

**File:** `app/src/app/layout.tsx`

Moved `<ClerkProvider>` from wrapping `<html>` to wrapping content inside `<body>`. The document structure is now `<html> -> <body> -> <ClerkProvider> -> <SkipNav> + {children}`. This fixes SSR hydration and satisfies the Next.js App Router requirement that `<html>` must be the top-level element returned by the root layout.

### CK-11 (HIGH): Created `.env.example` with Clerk vars

**File:** `app/.env.example` (new)

Created `.env.example` documenting all required Clerk environment variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`

Also added a comment about the 15-minute session lifetime Clerk dashboard setting (CK-21).

Updated `app/.gitignore` to add `!.env.example` exception (the existing `.env*` pattern was blocking the file from being tracked).

### CK-05 (MEDIUM): Route matcher now matches bare paths

**File:** `app/src/middleware.ts`

Changed route patterns from:
- `"/client/(.*)"` -> `"/client(/.*)?"`
- `"/api/(.*)"` -> `"/api(/.*)?"`

The `(/.*)?` pattern makes the trailing slash and path segments optional, so `/client` and `/api` (bare, no trailing slash) now correctly match as public routes.

### CK-08 (MEDIUM): Results page guard added

**File:** `app/src/app/results/page.tsx`

Added a `sessionStorage` guard in `ResultsPage`'s `useEffect`. On mount, the component checks for a `prediction_result` key in `sessionStorage`. If absent, it redirects to `/predict` via `router.replace()`. This prevents authenticated users from accessing `/results` directly without having submitted a prediction.

The predict form (LKID-16/LKID-19 scope) will need to set `sessionStorage.setItem("prediction_result", ...)` after successful submission for this guard to pass through.

### CK-20 (MEDIUM): Post-auth redirect to `/predict`

**File:** `app/src/app/layout.tsx`

Added `afterSignInUrl="/predict"` and `afterSignUpUrl="/predict"` props to `<ClerkProvider>`. After magic link verification, Clerk will now auto-redirect users to `/predict` instead of the default `/`. This satisfies Inga's Flow 1, Step 4 requirement.

---

## Files Changed (LKID repo)

| File | Action | QA Item |
|------|--------|---------|
| `app/src/app/layout.tsx` | Modified | CK-01, CK-20 |
| `app/src/middleware.ts` | Modified | CK-05 |
| `app/src/app/results/page.tsx` | Modified | CK-08 |
| `app/.env.example` | Created | CK-11 |
| `app/.gitignore` | Modified | CK-11 (unblock .env.example) |

---

## Notes

- No backend coordination needed for CK-20 -- the redirect is handled purely via ClerkProvider props.
- The CK-08 guard uses `sessionStorage` which is cleared on tab close; this aligns with the 15-minute session expiry intent.
- CK-21 (session lifetime) is documented as a comment in `.env.example` -- it requires a Clerk dashboard config change, not code.
- Ready for Yuri re-review.
