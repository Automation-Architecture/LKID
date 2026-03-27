# QA Report — PR #12: Clerk Magic-Link Auth Scaffold

**PR:** [#12](https://github.com/Automation-Architecture/LKID/pull/12) (`feat/LKID-1-clerk-auth` -> `main`)
**Reviewer:** Yuri (QA)
**Date:** 2026-03-27
**Scope:** Clerk auth integration — ClerkProvider in root layout, middleware route protection, @clerk/nextjs dependency

---

## Executive Summary

**PASS WITH CONDITIONS** — The Clerk auth scaffold is minimal and structurally correct: ClerkProvider wraps the app, middleware protects `/predict` and `/results`, and public routes are properly configured. However, there are **2 high-severity issues** (one confirmed by both Copilot and CodeRabbit reviewers), **3 medium-severity issues**, and **2 low-severity items** that need attention before merge.

The high-severity items are: (1) ClerkProvider wraps `<html>`, violating Next.js App Router expectations for the root element, and (2) no `.env.example` documents the required `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` variables — the app will crash at runtime without them.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Layout & Provider | 4 | 2 | 1 | 1 |
| Middleware & Routes | 5 | 2 | 2 | 1 |
| Dependency & Config | 4 | 2 | 1 | 1 |
| Cross-Boundary: API Contract | 3 | 3 | 0 | 0 |
| Cross-Boundary: DB Schema | 2 | 2 | 0 | 0 |
| Cross-Boundary: UX Flows | 4 | 2 | 1 | 1 |
| Cross-Boundary: Validation | 2 | 2 | 0 | 0 |
| **Totals** | **24** | **15** | **5** | **4** |

---

## Findings

### 1. Layout & Provider

**CK-01: ClerkProvider wraps `<html>` — invalid document structure** — FAIL [HIGH]

- **File:** `app/src/app/layout.tsx:24-40`
- ClerkProvider is the outermost element returned by RootLayout, wrapping `<html>`. In Next.js App Router, the root layout must return `<html>` as the top-level element. Wrapping it with a React component can break SSR hydration, cause framework warnings, and violate the document structure contract.
- Both **Copilot** and **CodeRabbit** flagged this independently.
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

**CK-02: Appearance variables use brand colors** — PASS

- `colorPrimary: "#004D43"` matches the Automation Architecture teal. `borderRadius: "0.5rem"` and `fontSize: "1rem"` are sensible defaults. Aligns with Inga's component specs.

**CK-03: SkipNav preserved** — PASS

- `<SkipNav />` remains inside `<body>`, ensuring the accessibility skip-to-content mechanism is not broken by the auth integration.

**CK-04: No `afterSignInUrl` or `afterSignUpUrl` configured** — NOTE [LOW]

- **File:** `app/src/app/layout.tsx:24`
- ClerkProvider has no `afterSignInUrl` or `afterSignUpUrl` prop. Clerk defaults to redirecting to `/` after sign-in, but Inga's user-flows.md (Flow 1, Step 4) specifies that after magic link verification, the user should be redirected to `/predict`. Without explicit configuration, users will land on the landing page instead of the prediction form.
- **Recommendation:** Add `afterSignInUrl="/predict"` to ClerkProvider, or handle this via the `/auth/verify` handler as described in the UX flows.

---

### 2. Middleware & Routes

**CK-05: Route matcher patterns miss bare paths** — FAIL [MEDIUM]

- **File:** `app/src/middleware.ts:5-9`
- Public route patterns are: `"/"`, `"/auth(.*)"`, `"/client/(.*)"`, `"/api/(.*)"`.
- The `/client/(.*)` and `/api/(.*)` patterns require at least one character after the slash. A request to `/client` or `/api` (without trailing slash or path segment) would NOT match and would be treated as a protected route, triggering an auth redirect.
- Copilot also flagged this issue.
- **Fix:** Change patterns to `"/client(.*)"` and `"/api(.*)"` (remove the slash before the wildcard), or add explicit bare-path entries: `"/client"`, `"/api"`.

**CK-06: `/predict` and `/results` are correctly protected** — PASS

- Any route not matching the public route list calls `auth.protect()`. Since `/predict` and `/results` are not in the public list, they require Clerk authentication. This matches Inga's route protection table (user-flows.md, Navigation Structure section).

**CK-07: Middleware matcher correctly skips static files** — PASS

- The negative lookahead `/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|...)).*)`  skips `_next` internals and common static file extensions while still matching `.json` files (via the `js(?!on)` pattern). The second matcher `/(api|trpc)(.*)` ensures API routes always run through middleware.

**CK-08: `/results` not protected from direct access without prediction data** — FAIL [MEDIUM]

- **File:** `app/src/middleware.ts`
- Middleware only checks auth status. Per Inga's user-flows.md (Route Protection table), an authenticated user hitting `/results` without having submitted a prediction should be redirected to `/predict`. This is not handled in middleware.
- This is arguably application-level logic (not middleware), but the PR description doesn't mention it. It should be tracked as a follow-up task.
- **Recommendation:** Document this gap explicitly. The `/results` page component should check for prediction data in state and redirect to `/predict` if absent. This is likely part of LKID-16/LKID-19 scope.

**CK-09: No `/auth/verify` route handler** — NOTE [MEDIUM]

- **File:** `app/src/middleware.ts:6`
- The `/auth(.*)` public route matcher covers `/auth/verify`, which is correct (it must be public so the magic link token can be processed). However, there is no actual `/auth/verify` route or page in this PR. The PR description states "Replace /auth stub with real Clerk SignIn component" as a next step.
- Inga's Flow 1 (Step 4) specifies a `/auth/verify?token=...` handler that validates the token, sets the session, and redirects to `/predict`. This is expected to come in a future PR but should be explicitly tracked.
- **Recommendation:** Ensure LKID-1 follow-up cards exist for the `/auth` page implementation and the verify handler.

---

### 3. Dependency & Config

**CK-10: @clerk/nextjs v7.0.7 installed** — PASS

- `package.json` adds `"@clerk/nextjs": "^7.0.7"` as a production dependency. The lock file resolves all transitive dependencies (`@clerk/backend`, `@clerk/react`, `@clerk/shared`). No conflicts with existing dependencies.

**CK-11: No `.env.example` with Clerk variables** — FAIL [HIGH]

- Clerk requires at minimum `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` environment variables. Without them, the app will crash immediately on startup with a Clerk initialization error.
- The PR description mentions "Placeholder env vars — real keys added when Clerk project is provisioned," but no `.env.example` or `.env.local.example` file was created to document these required variables.
- The backend already has a `.env.example` (documented in QA Report #1, BE-14). The frontend should follow the same pattern.
- **Fix:** Create `app/.env.example` documenting:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
  CLERK_SECRET_KEY=sk_test_placeholder
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/predict
  ```

**CK-12: Node.js engine requirement** — PASS

- `@clerk/backend`, `@clerk/nextjs`, `@clerk/react`, and `@clerk/shared` all require `node >= 20.9.0`. The project already targets Node 20+ (confirmed by Next.js 15 requirement). No conflict.

**CK-13: Lock file integrity** — NOTE [LOW]

- The package-lock.json diff adds 183 lines of new dependency entries. All resolved versions are pinned with integrity hashes. No extraneous or phantom dependencies detected. The diff is clean.

---

### 4. Cross-Boundary: API Contract (`api_contract.json`)

**CK-14: Auth scheme aligns** — PASS

- The API contract specifies `clerkJWT` bearer auth on `/predict` and `/predict/pdf`. Clerk middleware on the frontend will issue JWTs for authenticated sessions. The middleware's `auth.protect()` ensures only authenticated users reach `/predict`, so the frontend will always have a valid session to extract the JWT from. Alignment is correct.

**CK-15: Public routes align with API security** — PASS

- API contract: `/health` has `security: []` (no auth), `/webhooks/clerk` has `security: []` (no auth), `/leads` uses `adminApiKey`. Middleware makes `/api/(.*)` public, which is correct — the backend handles its own auth for API routes (Clerk JWT validation on the backend side). The frontend middleware should not block API requests.

**CK-16: Webhook route accessible** — PASS

- `/api/(.*)` is public in the middleware. The Clerk webhook endpoint at `/webhooks/clerk` is on the backend (Railway), not the Next.js frontend. No conflict. The frontend's `/api/(.*)` public route is for Next.js API routes if any are added later.

---

### 5. Cross-Boundary: DB Schema (`db_schema.sql`)

**CK-17: Clerk email maps to leads.email** — PASS

- The DB schema has `email TEXT NOT NULL` in the leads table. The API contract's `/predict` endpoint accepts an optional `email` field that "may be pre-filled from Clerk." The Clerk session provides the user's email, which will be used to populate the form (read-only, per Inga's flows). When the form is submitted, the email flows to the leads table. The auth scaffold correctly enables this pipeline by establishing the Clerk session.

**CK-18: No Clerk user ID column in leads table** — PASS

- The DB schema has no `clerk_user_id` column. This is correct for the Lean Launch MVP — the leads table captures email + lab inputs for the email campaign, not user account management. Clerk is used as an auth gate and email capture mechanism, not a user management system. The schema and auth approach are aligned.

---

### 6. Cross-Boundary: UX Flows (`user-flows.md`)

**CK-19: Route protection matches UX spec** — PASS

- UX flows specify: `/` (no auth), `/auth` (no auth), `/predict` (Clerk session), `/results` (Clerk session). Middleware protects `/predict` and `/results` while leaving `/` and `/auth` public. Match.

**CK-20: Post-auth redirect not implemented** — FAIL [MEDIUM]

- UX flows (Flow 1, Step 4) specify: after magic link verification, auto-redirect to `/predict` with zero extra clicks. The middleware has no redirect logic for authenticated users hitting `/auth`. An authenticated user on `/auth` should be redirected to `/predict` (per the route protection table: `/auth` for verified users -> "Redirect to `/predict`").
- This is related to CK-04 (missing `afterSignInUrl`). Without either middleware redirect logic or ClerkProvider configuration, the post-auth redirect will not work as designed.
- **Fix:** Either add `afterSignInUrl="/predict"` to ClerkProvider, or add middleware logic to redirect authenticated users away from `/auth` to `/predict`.

**CK-21: Session expiry (15 min) not configured** — NOTE [MEDIUM]

- UX flows specify a 15-minute session expiry. Clerk's default session lifetime is much longer (typically days). The 15-minute expiry is a product decision (security for medical data context). This is a Clerk dashboard configuration, not a code change, but it should be documented and tracked.
- **Recommendation:** Add a comment in the middleware or a note in `.env.example` that Clerk session lifetime must be set to 15 minutes in the Clerk dashboard.

**CK-22: Brand colors applied to Clerk components** — PASS

- ClerkProvider's `appearance.variables.colorPrimary` is set to `#004D43` (brand teal). This will style Clerk's pre-built components (sign-in, magic link) with the KidneyHood brand. Aligns with Inga's component specs and the brand palette.

---

### 7. Cross-Boundary: Validation (`validation.ts`)

**CK-23: Validation rules unaffected** — PASS

- `validation.ts` defines `PREDICT_FORM_RULES` for name, age, BUN, and creatinine. The auth scaffold does not modify validation logic. The form fields and their rules remain intact.

**CK-24: Email field not in validation rules (correct)** — PASS

- Email is not in `PREDICT_FORM_RULES` because it is pre-filled from the Clerk session (read-only). The auth scaffold enables this by providing the Clerk session. Validation of the email happens at the Clerk level (magic link requires a valid email), not at the form level. This is correct per the UX flows.

---

## Failure Summary

### HIGH Severity (2)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| CK-01 | layout.tsx:24-40 | ClerkProvider wraps `<html>` — breaks Next.js App Router document structure | Move ClerkProvider inside `<body>` |
| CK-11 | (missing file) | No `.env.example` with required Clerk env vars — app crashes on startup | Create `app/.env.example` with `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` |

### MEDIUM Severity (3)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| CK-05 | middleware.ts:7-8 | `/client/(.*)` and `/api/(.*)` patterns miss bare `/client` and `/api` paths | Change to `/client(.*)` and `/api(.*)` or add bare path entries |
| CK-08 | middleware.ts | `/results` accessible to authenticated users without prediction data | Document as follow-up; handle in `/results` page component |
| CK-20 | layout.tsx + middleware.ts | No post-auth redirect to `/predict` — UX flow requires auto-redirect | Add `afterSignInUrl="/predict"` to ClerkProvider |

### LOW Severity (2)

| ID | Component | Issue |
|----|-----------|-------|
| CK-04 | layout.tsx:24 | No `afterSignInUrl` or `afterSignUpUrl` configured on ClerkProvider |
| CK-21 | (config) | 15-minute session expiry is a Clerk dashboard setting, not yet documented |

---

## Reviewer Cross-Reference

Both automated reviewers (Copilot and CodeRabbit) reviewed this PR. Their findings are incorporated:

| Finding | Copilot | CodeRabbit | Yuri |
|---------|---------|------------|------|
| ClerkProvider wrapping `<html>` | Flagged | Flagged | CK-01 (HIGH) |
| Route patterns miss bare paths | Flagged | -- | CK-05 (MEDIUM) |
| `/client/(.*)` should require auth | -- | Flagged (Major) | Disagree: client dashboard is intentionally public (URL-obfuscated slug). Acceptable for MVP. |

**Note on CodeRabbit's `/client` auth finding:** CodeRabbit flagged `/client/(.*)` as a security issue, arguing client dashboards should require authentication. However, the client dashboard (`/client/[slug]`) is intentionally public with security-through-obscurity (UUID-based slug). This is a product decision for the MVP — Lee (the client) accesses the dashboard via a bookmarked URL without needing a Clerk account. The slug `lee-a3f8b2` is validated server-side (only known slugs resolve; others return 404). This is acceptable for a single-client MVP but should be revisited if more clients are added.

---

## Overall Readiness Assessment

### Merge Readiness: NOT READY — 2 blocking issues

1. **CK-01 (HIGH):** ClerkProvider must be moved inside `<body>`. This is a structural correctness issue confirmed by two independent reviewers. Estimated fix: 2 minutes.
2. **CK-11 (HIGH):** A `.env.example` file must be created so other developers (and Railway/Vercel deployments) know which environment variables are required. Estimated fix: 2 minutes.

### After fixing HIGH items: READY TO MERGE

The middleware route protection is correct, the dependency is clean, and the brand styling is properly applied. The MEDIUM items (CK-05 route patterns, CK-08 results guard, CK-20 post-auth redirect) are real issues but can be addressed in follow-up cards — they don't cause crashes or security vulnerabilities in the current scaffold.

### Recommended Fix Priority

1. Move ClerkProvider inside `<body>` (CK-01) — 2 minutes
2. Create `app/.env.example` with Clerk vars (CK-11) — 2 minutes
3. Fix route patterns to include bare paths (CK-05) — 1 minute
4. Add `afterSignInUrl="/predict"` to ClerkProvider (CK-20) — 30 seconds
5. Document session expiry configuration (CK-21) — 5 minutes

---

*QA review complete. 24 items checked, 15 pass, 5 fail, 4 notes. Two high-severity issues block merge; both are < 5-minute fixes.*
