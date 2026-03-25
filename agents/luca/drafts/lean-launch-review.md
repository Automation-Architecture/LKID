# Lean Launch Profile — CTO Review

**Author:** Luca (CTO/Orchestrator)
**Date:** 2026-03-25
**Status:** DECISIONS FINAL

---

## Decision 1: Backend Hosting — Railway

**Choice: Railway.**

| Criterion | Railway | Render | Supabase | Vercel Serverless |
|-----------|---------|--------|----------|-------------------|
| Python/FastAPI support | Native Dockerfile + Nixpacks | Native | Edge Functions only (Deno/TS) | Python cold-start penalty, 10s timeout |
| Managed Postgres | Yes, included | Yes, included | Yes (core product) | No (need external) |
| Deploy speed | Git push → live in ~90s | Git push → live in ~2min | N/A for FastAPI | Git push → live in ~60s |
| Cost (MVP scale) | ~$5/mo hobby, $20/mo pro | Free tier, $19/mo pro | Free tier generous | Free tier, per-invocation |
| Long-running requests | Yes | Yes | N/A | 10s max (Hobby), 60s (Pro) |
| Simplicity | Single platform: API + DB | Single platform: API + DB | Mismatch — not built for FastAPI | Separate DB provider needed |

**Why Railway over Render:** Faster deploys, better DX, built-in Postgres with connection pooling. Render's free tier spins down after inactivity (30s cold starts) — bad for a lead gen tool where first impressions matter. Railway's hobby plan keeps services warm.

**Why not Vercel serverless:** FastAPI on serverless means cold starts, 10-second timeout on hobby tier, no persistent connections to Postgres, and PDF generation will exceed execution limits. Wrong model for our workload.

**Why not Supabase for hosting:** Supabase is a database-first platform. It does not host arbitrary Python services. We would still need Railway/Render for FastAPI.

**Action:** FastAPI + Postgres both deploy on Railway. Frontend stays on Vercel.

---

## Decision 2: Auth Provider — Clerk

**Choice: Clerk.**

| Criterion | Clerk | Supabase Auth |
|-----------|-------|---------------|
| Magic link support | Yes, first-class | Yes |
| Passwordless-only config | Yes — disable all other methods | Yes — but password is the default path |
| Token expiry control | Configurable (we set 15min) | Configurable |
| Email capture for marketing | Webhook on user creation → pipe to lead DB | Triggers available but less ergonomic |
| Next.js integration | `@clerk/nextjs` — middleware, hooks, server components | `@supabase/ssr` — works but more manual |
| Managed UI components | Yes — drop-in `<SignIn />` | No — build your own |
| Free tier | 10k MAU | 50k MAU |

**Why Clerk over Supabase Auth:** Clerk's Next.js SDK is purpose-built. The `<SignIn />` component with magic-link-only config ships the auth UI in under an hour. Supabase Auth works but requires hand-rolling the UI and wiring up the SSR helpers manually. For a 20-ticket MVP, developer time is the bottleneck — Clerk eliminates an entire category of work.

**Why not Supabase Auth:** If we were using Supabase for the database, bundling auth would make sense. We are not. Adding Supabase Auth alongside Railway Postgres means two platforms managing user identity, which is unnecessary complexity.

**Action:** Clerk for auth. Magic link only, all other sign-in methods disabled. 15-minute link expiry. Webhook on `user.created` writes to Railway Postgres `leads` table.

---

## Architectural Review — Risks and Gaps

### Approved without changes
- Endpoint reduction (12 → 5) is sound. The `/predict` and `/predict/pdf` split is correct.
- Single `leads` table is sufficient. No ORM needed — raw SQL or SQLModel is fine.
- Component count (~12-15) is realistic for 2 sprints.
- Interactive chart (Variant A) is feasible — Visx POC was already heading this direction.

### Flags

1. **PDF generation approach matters.** Server-side (WeasyPrint or Playwright) is the right call — client-side html2canvas produces inconsistent chart renders across browsers. John Donaldson should spec `/predict/pdf` to accept the same payload as `/predict` and return a `Content-Type: application/pdf` stream. WeasyPrint is pure Python, no browser binary needed — start there.

2. **Clerk + Railway integration.** Clerk issues JWTs. FastAPI must verify them. Use `clerk-backend-api` Python SDK or verify JWTs manually with Clerk's JWKS endpoint. This is straightforward but must be in Sprint 1 scope.

3. **No rate limiting is a risk.** The profile says "basic provider-level rate limiting only." Railway does not include rate limiting. Add a simple in-memory rate limiter (slowapi) on `/auth/request-link` (3/email/15min) and `/predict` (10/min/IP). Four lines of code, prevents abuse.

4. **Email campaign plumbing is unspecified.** The profile says "email captured for warm campaign" but defers Klaviyo. Clarify: for launch, leads sit in the `leads` table. PM (Husser) can export CSV manually until Klaviyo is wired up. No engineering work needed now, but document this explicitly so the client knows.

5. **CORS config is correct.** `localhost:3000` + one production domain. Ensure the Railway FastAPI service sets `allow_credentials=True` for Clerk's session cookies.

---

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend hosting | **Railway** (API + Postgres) | Single platform, warm instances, fast deploys, native Python |
| Auth provider | **Clerk** | Magic-link-only config, Next.js SDK, ships auth UI in < 1 hour |
| PDF approach | **WeasyPrint** (recommendation to John) | Pure Python, no browser binary, server-side consistency |
| Rate limiting | **slowapi** on FastAPI | Railway has none built-in; 4 lines prevents abuse |

The Lean Launch Profile is architecturally sound. Ship it.
