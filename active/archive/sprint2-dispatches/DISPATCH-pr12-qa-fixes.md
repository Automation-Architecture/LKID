# DISPATCH: PR #12 QA Fixes -- Clerk Auth Scaffold

**PR:** [#12](https://github.com/Automation-Architecture/LKID/pull/12) (`feat/LKID-1-clerk-auth`)
**Assignee:** Harshit (Frontend Developer)
**Date:** 2026-03-27
**Source:** Yuri's QA report at `agents/yuri/drafts/qa-report-pr12-clerk-auth.md`

---

## Context

Yuri completed QA on PR #12 (Clerk magic-link auth scaffold). The PR is **not ready to merge** -- 2 HIGH-severity and 3 MEDIUM-severity issues were identified. Both Copilot and CodeRabbit also flagged CK-01 independently.

All fixes go on the existing `feat/LKID-1-clerk-auth` branch. After fixes, request Yuri re-review.

---

## HIGH -- Must Fix Before Merge

### CK-01: ClerkProvider wraps `<html>` instead of being inside `<body>`

- **File:** `app/src/app/layout.tsx:24-40`
- **Problem:** ClerkProvider is the outermost element returned by RootLayout, wrapping `<html>`. In Next.js App Router, the root layout must return `<html>` as the top-level element. This breaks SSR hydration and violates the document structure contract.
- **Confirmed by:** Copilot, CodeRabbit, Yuri
- **Fix:** Move ClerkProvider inside `<html><body>`, wrapping `{children}`:

```tsx
<html lang="en" className={`${inter.variable} h-full antialiased`}>
  <body className="min-h-full flex flex-col">
    <ClerkProvider appearance={{...}}>
      <SkipNav />
      {children}
    </ClerkProvider>
  </body>
</html>
```

### CK-11: No `.env.example` with required Clerk environment variables

- **File:** (missing -- needs to be created)
- **Problem:** App crashes on startup without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. No `.env.example` or `.env.local.example` documents these required variables. The backend already has a `.env.example` -- the frontend should follow the same pattern.
- **Fix:** Create `app/.env.example` with:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
CLERK_SECRET_KEY=sk_test_placeholder
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/predict
```

---

## MEDIUM -- Fix in This PR (Preferred) or Track as Follow-Up

### CK-05: Route matcher misses bare `/client` and `/api` paths

- **File:** `app/src/middleware.ts:5-9`
- **Problem:** Patterns `/client/(.*)` and `/api/(.*)` require at least one character after the slash. Requests to `/client` or `/api` (no trailing slash) will not match, triggering an unintended auth redirect. Copilot also flagged this.
- **Fix:** Update patterns to include the bare path. Two options:
  - Change to `"/client(.*)"` and `"/api(.*)"` (remove slash before wildcard)
  - Or use `"/client(/.*)?$"` and `"/api(/.*)?$"` to be explicit

### CK-08: `/results` accessible without prediction data

- **File:** `app/src/middleware.ts` (middleware only checks auth, not app state)
- **Problem:** An authenticated user can hit `/results` directly without having submitted a prediction. Per Inga's user-flows.md, this should redirect to `/predict`.
- **Fix:** Add a guard in the `/results` page component (not middleware) that checks for prediction data in state and redirects to `/predict` if absent. This may overlap with LKID-16/LKID-19 scope -- if deferring, create a follow-up card and document the gap.

### CK-20: No post-auth redirect to `/predict`

- **File:** `app/src/app/layout.tsx` + `app/src/middleware.ts`
- **Problem:** After magic link verification, users should auto-redirect to `/predict` with zero extra clicks (per Inga's Flow 1, Step 4). Currently, Clerk defaults to redirecting to `/`. No `afterSignInUrl` is configured on ClerkProvider, and no middleware redirect logic exists for authenticated users on `/auth`.
- **Fix:** Add `afterSignInUrl="/predict"` and `afterSignUpUrl="/predict"` props to ClerkProvider. Alternatively, add middleware logic to redirect authenticated users from `/auth` to `/predict`.

> **Coordination point with John Donaldson:** If the post-auth redirect involves backend/Clerk webhook configuration (e.g., a `/auth/verify` handler that processes the magic link token server-side before redirecting), coordinate with John. The `/auth/verify` route handler is not yet implemented (noted as CK-09 in the QA report). If the redirect can be handled purely via ClerkProvider props and/or frontend middleware, no backend work is needed. Assess and flag if John's help is required.

---

## LOW -- Informational (No Action Required This PR)

| ID | Issue | Notes |
|----|-------|-------|
| CK-04 | No `afterSignInUrl`/`afterSignUpUrl` on ClerkProvider | Subsumed by CK-20 fix above |
| CK-21 | 15-minute session expiry not configured | Clerk dashboard setting, not code. Add a comment in `.env.example` noting this must be configured in the Clerk dashboard. |

---

## Fix Priority

| Order | ID | Severity | Estimated Time |
|-------|-----|----------|---------------|
| 1 | CK-01 | HIGH | 2 minutes |
| 2 | CK-11 | HIGH | 2 minutes |
| 3 | CK-05 | MEDIUM | 1 minute |
| 4 | CK-20 | MEDIUM | 1 minute (if ClerkProvider props suffice) |
| 5 | CK-08 | MEDIUM | 5-10 minutes (page-level guard + redirect) |

---

## After Fixes

1. Push all changes to `feat/LKID-1-clerk-auth`
2. Request Yuri re-review on PR #12
3. If CK-08 is deferred, create a follow-up Jira card and comment on the PR

---

*Dispatch issued by Luca (CTO). Reference: `agents/yuri/drafts/qa-report-pr12-clerk-auth.md`*
