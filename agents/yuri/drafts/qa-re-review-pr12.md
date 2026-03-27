# QA Re-Review -- PR #12: Clerk Magic-Link Auth Scaffold

**PR:** [#12](https://github.com/Automation-Architecture/LKID/pull/12) (`feat/LKID-1-clerk-auth` -> `main`)
**Reviewer:** Yuri (QA)
**Date:** 2026-03-27
**Type:** Re-review -- verifying fixes for 5 original findings

---

## Original Findings Verification

### CK-01 [HIGH]: ClerkProvider wraps `<html>` -- PASS

**Original issue:** ClerkProvider was the outermost element wrapping `<html>`, violating Next.js App Router document structure.

**Verified fix:** In `app/src/app/layout.tsx`, ClerkProvider is now inside `<body>`, wrapping only `<SkipNav />` and `{children}`:

```tsx
<html lang="en" className={`${inter.variable} h-full antialiased`}>
  <body className="min-h-full flex flex-col">
    <ClerkProvider afterSignInUrl="/predict" afterSignUpUrl="/predict" appearance={{...}}>
      <SkipNav />
      {children}
    </ClerkProvider>
  </body>
</html>
```

`<html>` is now the top-level returned element. **RESOLVED.**

---

### CK-05 [MEDIUM]: Route patterns miss bare `/client` and `/api` -- PASS

**Original issue:** Patterns `/client/(.*)` and `/api/(.*)` required at least one character after the slash, so bare `/client` and `/api` would not match.

**Verified fix:** In `app/src/middleware.ts:7-8`, patterns now use optional group syntax:

```ts
"/client(/.*)?",
"/api(/.*)?",
```

The `(/.*)?` group is optional, so `/client` (bare), `/client/` (trailing slash), and `/client/lee-a3f8b2` (with segment) all match. Same for `/api`. **RESOLVED.**

---

### CK-08 [MEDIUM]: Results page accessible without prediction data -- PASS

**Original issue:** No guard prevented authenticated users from accessing `/results` without having submitted a prediction.

**Verified fix:** In `app/src/app/results/page.tsx:130-135`, the component now checks for prediction data in sessionStorage on mount:

```tsx
useEffect(() => {
  if (typeof window !== "undefined" && !sessionStorage.getItem("prediction_result")) {
    setHasData(false);
    window.location.href = "/predict";
    return;
  }
  // ...
}, []);
```

If no `prediction_result` exists in sessionStorage, the page redirects to `/predict`. While this uses `window.location.href` instead of `useRouter` (see CodeRabbit note below), the guard logic is functionally correct. **RESOLVED.**

---

### CK-11 [HIGH]: No `.env.example` with Clerk vars -- PASS

**Original issue:** No `.env.example` file documented the required Clerk environment variables.

**Verified fix:** `app/.env.example` now exists with all required variables:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
CLERK_SECRET_KEY=sk_test_placeholder
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/predict
```

File also includes a note about the 15-minute session lifetime Clerk dashboard setting. **RESOLVED.**

---

### CK-20 [MEDIUM]: No `afterSignInUrl="/predict"` on ClerkProvider -- PASS

**Original issue:** ClerkProvider had no `afterSignInUrl` prop, so users would land on `/` after sign-in instead of `/predict`.

**Verified fix:** In `app/src/app/layout.tsx:27-28`:

```tsx
<ClerkProvider
  afterSignInUrl="/predict"
  afterSignUpUrl="/predict"
```

Both `afterSignInUrl` and `afterSignUpUrl` are now set to `/predict`. **RESOLVED.**

---

## CodeRabbit Nitpick Assessment: `useRouter` vs `window.location.href`

**Finding:** CodeRabbit flagged that `app/src/app/results/page.tsx:133` uses `window.location.href = "/predict"` for the redirect when no prediction data exists. CodeRabbit recommends using Next.js `useRouter().push()` for client-side navigation without a full page reload.

**Assessment:** This is a valid improvement but **NOT blocking**. Reasons:

1. The redirect fires on page mount for users who arrive at `/results` without data -- this is an error recovery path, not a hot navigation path. A full reload is acceptable.
2. Using `window.location.href` actually clears any stale client-side state, which is arguably a feature for this specific case.
3. The performance difference (full reload vs SPA navigation) is negligible for a redirect that happens once on a guard failure.

**Verdict:** Non-blocking. Track as a follow-up improvement. If the team wants to address it, the fix is straightforward:

```tsx
import { useRouter } from "next/navigation";
// ...
const router = useRouter();
// ...
router.push("/predict");
```

---

## New Issues Found

None. The fixes are clean and address all 5 original findings correctly.

---

## Summary

| Finding | Severity | Original | Re-Review |
|---------|----------|----------|-----------|
| CK-01: ClerkProvider position | HIGH | FAIL | **PASS** |
| CK-05: Route patterns | MEDIUM | FAIL | **PASS** |
| CK-08: Results guard | MEDIUM | FAIL | **PASS** |
| CK-11: .env.example | HIGH | FAIL | **PASS** |
| CK-20: afterSignInUrl | MEDIUM | FAIL | **PASS** |

## Final Verdict: APPROVED FOR MERGE

All 5 original findings are resolved. CodeRabbit's `useRouter` nitpick is non-blocking (follow-up). No new issues found. PR #12 is ready to merge.

---

*QA re-review complete. 5/5 findings resolved. Approved for merge.*
