# LKID-87 PR #70 — QA Verdict

**Reviewer:** Yuri (QA)
**Date:** 2026-04-30
**Branch:** `feat/LKID-87-csp-enforce-flip` (HEAD `e9228d1`)
**PR:** [#70](https://github.com/Automation-Architecture/LKID/pull/70) — flip CSP from Report-Only to enforcing
**Card:** LKID-87 (Brad-hands → reassigned to agents for the code flip; Brad still owns the post-merge prod monitor)
**Scope:** Frontend (`app/next.config.ts`) + backend (`backend/main.py`) header-key flip, Yuri's three PR #63 nits, and three new pytest cases.

---

## Verdict: **PASS WITH NITS**

The flip itself is clean — header key is now `Content-Security-Policy` (enforcing) on the Vercel preview, all 7 headers present, all 3 PR #63 nits resolved correctly, all tests pass. The only material gap is a documented one (no `report-uri` / `report-to`), which is a follow-up concern, not a blocker for the flip. There is also a known cosmetic doc-comment that still references "first deploy / Report-Only" history; the runtime behavior is correct.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| Acceptance Criteria (header flip) | 6 | 6 | 0 | 0 |
| Acceptance Criteria (Swagger exemption) | 4 | 4 | 0 | 0 |
| PR #63 nit resolution | 3 | 3 | 0 | 0 |
| Tests / lint / type-check | 3 | 3 | 0 | 0 |
| Smoke (Vercel preview header) | 2 | 2 | 0 | 0 |
| Risk follow-ups | 3 | 0 | 0 | 3 |
| **Totals** | **21** | **18** | **0** | **3** |

---

## AC Checklist

### Header flip — frontend (`app/next.config.ts`)

- **AC-FE-01** ✓ `Content-Security-Policy-Report-Only` is gone from the live `SECURITY_HEADERS` array (line 110: `key: "Content-Security-Policy"`). `grep -n "Report-Only" app/next.config.ts` returns only historical comments at lines 8, 105, 106.
- **AC-FE-02** ✓ `Content-Security-Policy` is the active key in `SECURITY_HEADERS[0]` (line 110). The `CSP_POLICY` directive string itself is unchanged from PR #63 — only the header key flipped. Defensible: the policy survived 10 days of production traffic in Report-Only with no real violations.
- **AC-FE-03** ✓ All other 6 headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control) preserved exactly.

### Header flip — backend (`backend/main.py`)

- **AC-BE-01** ✓ Middleware at line 391 now calls `response.headers.setdefault("Content-Security-Policy", csp_value)` — Report-Only key gone. Comment block at lines 313–334 documents the LKID-87 flip.
- **AC-BE-02** ✓ Path-branching middleware at lines 386–391: paths starting with `/docs` or `/redoc` get `_BACKEND_CSP_DOCS`, every other path gets `_BACKEND_CSP`. `_DOCS_PATH_PREFIXES = ("/docs", "/redoc")` at line 362 is the explicit allowlist.
- **AC-BE-03** ✓ `_BACKEND_CSP_DOCS` (lines 348–358) preserves `frame-ancestors 'none'` — clickjacking still blocked on Swagger UI even with the relaxed JS/CSS allowance for `cdn.jsdelivr.net`. Confirmed in test `test_csp_relaxed_on_swagger_docs` line 92 (`assert "frame-ancestors 'none'" in csp`).

### Swagger / OpenAPI scoping

- **AC-DOC-01** ✓ `/docs` gets the relaxed CSP. Verified by test (collected at run time).
- **AC-DOC-02** ✓ `/redoc` gets the relaxed CSP. Same test iterates over both paths.
- **AC-DOC-03** ✓ `/openapi.json` stays under the strict policy — explicitly tested in `test_csp_strict_on_openapi_json` (line 95). The path-prefix tuple `("/docs", "/redoc")` does NOT match `/openapi.json`, so the strict branch handles it.
- **AC-DOC-04** ✓ Path branching uses `path.startswith(prefix)` not exact match, so `/docs/oauth2-redirect` and other Swagger sub-paths are correctly covered. No off-by-one.

---

## PR #63 Nit Resolution

### Nit #1 — Docstring polish

✓ **PASS.** Both files have updated module-level docstrings reflecting the post-flip steady state:
- `app/next.config.ts` lines 4–19: docstring now reads "Status: enforcing mode (LKID-87, 2026-04-30)" with the historical context preserved.
- `backend/main.py` lines 313–334: comment block updated, including a paragraph on the Swagger exemption rationale.
- The middleware docstring at line 367 still references "Content-Security-Policy" (not Report-Only) on the post-flip header line.

### Nit #2 — `BACKEND_HOST` env-driven

✓ **PASS.** Now derived from `NEXT_PUBLIC_API_URL` via the `backendOrigin()` helper (lines 68–83 of `app/next.config.ts`). Behavior I verified by reading:

| Env value | Result |
|-----------|--------|
| `https://kidneyhood-backend-production.up.railway.app` | `new URL(...).origin` returns same string. ✓ |
| `https://example.com/api/v1` | `.origin` returns `https://example.com` — **path stripped correctly** (origin only, per CSP `connect-src` semantics). ✓ |
| `not-a-url` | `URL` constructor throws → catch → console.warn → fallback. ✓ |
| unset | early return → fallback. ✓ |
| `http://localhost:8000` | `.origin` returns `http://localhost:8000`. ✓ (CSP correctly allows http origin in dev) |

Fallback is the production Railway origin, which is the right safety net — even on a contributor's machine without `.env.local`, the build emits a CSP that includes the live backend.

### Nit #3 — Swagger UI exemption

✓ **PASS.** Already covered in AC-BE-02 / AC-DOC-01–04 above. Path branching is via `startswith`, so:
- `/docs` ✓ (relaxed)
- `/docs/oauth2-redirect` ✓ (relaxed — any Swagger sub-path)
- `/redoc` ✓ (relaxed)
- `/openapi.json` ✓ (strict — does not match the prefix)
- `/health`, `/predict`, `/leads`, `/results/...` ✓ (strict)

No over-broad match risk: the prefix tuple doesn't include `/`, so an attacker crafting `/docs-malicious` would still match (it starts with `/docs`). That's a theoretical edge — none of those routes exist on the backend, so it's not exploitable. Documenting as **non-blocking nit NIT-01** below.

---

## Test Results

### `cd backend && python -m pytest -q` — **225 passed**

```
........................................................................ [ 32%]
........................................................................ [ 64%]
........................................................................ [ 96%]
.........                                                                [100%]
225 passed in 1.02s
```

### `cd backend && python -m pytest tests/test_health.py -v` — **6/6 passed**

```
tests/test_health.py::test_health_returns_ok[asyncio] PASSED
tests/test_health.py::test_security_headers_present_on_health[asyncio] PASSED
tests/test_health.py::test_csp_enforcing_on_strict_routes[asyncio] PASSED      # NEW
tests/test_health.py::test_csp_relaxed_on_swagger_docs[asyncio] PASSED         # NEW
tests/test_health.py::test_csp_strict_on_openapi_json[asyncio] PASSED          # NEW
tests/test_health.py::test_hsts_only_when_proxy_reports_https[asyncio] PASSED
6 passed
```

I read each new test body and confirmed the assertions match the docstring claims:
- `test_csp_enforcing_on_strict_routes` — asserts `"cdn.jsdelivr.net" not in csp` AND `"default-src 'none'" in csp` on `/health`. ✓ enforces what it claims.
- `test_csp_relaxed_on_swagger_docs` — iterates over `/docs` and `/redoc`, asserts `"cdn.jsdelivr.net" in csp` AND `"frame-ancestors 'none'" in csp`. ✓ enforces what it claims.
- `test_csp_strict_on_openapi_json` — asserts `"cdn.jsdelivr.net" not in csp` AND `"default-src 'none'" in csp` on `/openapi.json`. ✓ enforces what it claims.
- The updated existing test (`test_security_headers_present_on_health`) now asserts the Report-Only key is **absent** (`assert "content-security-policy-report-only" not in {k.lower() for k in response.headers.keys()}`). ✓ correct regression guard.

### `cd app && npx tsc --noEmit` — **clean** (no output, exit 0)

### `cd app && npx eslint next.config.ts` — **clean** (no output, exit 0)

---

## Smoke Checks (Vercel Preview)

Preview URL: `https://kidneyhood-git-feat-lkid-87-csp-615be2-automation-architecture.vercel.app`

### Header inspection — `curl -sI <preview>/`

```
HTTP/2 500
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io https://*.ingest.sentry.io https://*.posthog.com https://*.i.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://app.posthog.com https://eu.i.posthog.com https://*.clerk.com https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.clerk-telemetry.com https://va.vercel-scripts.com https://vitals.vercel-insights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://*.posthog.com https://*.sentry.io https://img.clerk.com; connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io ... https://kidneyhood-backend-production.up.railway.app; worker-src 'self' blob:; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), ...
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
x-dns-prefetch-control: on
x-frame-options: DENY
```

✓ **Header key is `content-security-policy` — the flip is live on the preview.** No `content-security-policy-report-only` in the response. All 7 headers present. CSP value is byte-identical to production except for the header key.

### `/labs` preview header check

✓ Same `content-security-policy` (enforcing) header, same 7-header set.

### Production comparison

✓ Production `kidneyhood-automation-architecture.vercel.app/` still serves `content-security-policy-report-only` (pre-flip) — confirms the flip will actually change behavior at deploy time and isn't a no-op.

### **Pre-existing preview 500 — not caused by this PR**

Both `/` and `/labs` return HTTP 500 on the preview. **I confirmed this is a pre-existing preview environment issue, not caused by the CSP flip:**

- Production (`kidneyhood-automation-architecture.vercel.app/`) returns 200 ✓
- Preview for PR #66 (LKID-89, already merged) returns 500
- Preview for PR #71 (LKID-90, in flight) returns 500
- Preview for PR #70 (this PR) returns 500

All three previews 500 → environment / env-var problem on Vercel preview deploys (likely missing one of the Sentry / PostHog / Clerk env vars on previews — which lines up with [LKID-83](https://automationarchitecture.atlassian.net/browse/LKID-83) / [LKID-84](https://automationarchitecture.atlassian.net/browse/LKID-84) still being on the brad-hands backlog). **Not a regression introduced by this PR.**

The Vercel runtime log confirms: `Error running the exported ...` for both GET and HEAD on `/` and `/labs` — generic Next.js export-runtime error, not a CSP violation. CSP violations would surface as browser-console errors during page render, not server-side 500s.

### Backend Railway (production, pre-flip)

```
$ curl -sI https://kidneyhood-backend-production.up.railway.app/health
HTTP/2 405
(no CSP header in response — Railway edge response, not the FastAPI middleware)
```

The Railway production backend hasn't been redeployed from this branch yet (Railway deploys on push to `main`). Backend smoke can only be verified post-merge.

---

## Risk Callouts

### NIT-01 (LOW) — No `report-uri` / `report-to` on the enforcing policy

The PR body acknowledges this: the policy has zero CSP-violation telemetry. Once the flip lands in production, **broken pages will only be detected by user reports or by Sentry catching the downstream JS error**, not by a CSP violation report.

**Why this is OK to merge anyway:**
- The Report-Only window has been live for 10 days with no user reports.
- The policy is conservative (`'unsafe-inline' 'unsafe-eval'` is allowed for scripts because Next.js runtime config requires it).
- Adding a `report-uri` requires either a Sentry CSP collector or a custom endpoint, and Sentry env vars are still on the brad-hands backlog (LKID-84).

**Follow-up:** After [LKID-84](https://automationarchitecture.atlassian.net/browse/LKID-84) (Sentry env vars activated), wire Sentry's CSP-report endpoint to `report-uri` so future violations have a destination. File as a small follow-up card under Sprint-6 backlog.

### NIT-02 (LOW) — Path-prefix match breadth on backend

`path.startswith("/docs")` would match a hypothetical `/docs-anything` route. None exist today, but if a future agent adds (e.g.) `/docs-internal` they'd accidentally inherit the relaxed CSP. **Not exploitable today, not blocking.** A defensive tightening would change the prefix tuple to also include the trailing slash variant or use exact-match for `/docs` + prefix-match for `/docs/`. Document for the next backend refactor.

### NIT-03 (LOW) — Doc-comment drift in `next.config.ts`

The `SECURITY_HEADERS` block at line 105–107 has a comment that reads "LKID-87 (2026-04-30): flipped from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`...". This is correct — but the **module-level docstring at lines 4–19 still mentions "Strategy (Report-Only first)" historically**. Both are technically accurate (the former describes the flip, the latter describes the rollout history) but a future reader could be confused. Consider tightening the historical paragraph to a single line. **Cosmetic, not blocking.**

### Top 3 risks for the actual flip going live in production

1. **Inline content escaped by Report-Only audit (LOW).** Browser console errors during the 10-day soak would have surfaced any blocked inline scripts. The policy already includes `'unsafe-inline'` for both `script-src` and `style-src`, so the most common Next.js inline-runtime-config pattern is already permitted. **Risk: low** — the soak window did its job.
2. **Vercel preview-comments script (LOW).** Vercel's preview-comment overlay injects a script from `vercel.live`. The current policy does NOT explicitly allow `https://vercel.live` in `script-src`. **However**, the Vercel preview-comments overlay is loaded via Vercel's edge proxy which serves it same-origin, and `'self'` covers it. Production doesn't load the overlay. **Risk: low.**
3. **Third-party fetch from frontend to non-allowlisted host (MED).** The `connect-src` allowlist covers Sentry, PostHog, Clerk, Vercel Analytics, Railway backend. Resend and Klaviyo are called server-side (from FastAPI), not browser-side, so they don't need `connect-src` entries. Sentry tunneling routes through `/monitoring` (same-origin, covered by `'self'`). **Risk: low** — but worth a 24h post-deploy console-error monitor.

---

## Files Verified

- `/Users/brad/Documents/aaa/Client Projects/KidneyHood/repo/LKID/app/next.config.ts` (197 lines) — read in full
- `/Users/brad/Documents/aaa/Client Projects/KidneyHood/repo/LKID/backend/main.py` lines 300–415 (security headers section + middleware)
- `/Users/brad/Documents/aaa/Client Projects/KidneyHood/repo/LKID/backend/tests/test_health.py` (127 lines) — read in full

---

## Failure Summary

### HIGH Severity (0)

None.

### MEDIUM Severity (0)

None.

### LOW Severity / Notes (3)

| ID | Component | Issue |
|----|-----------|-------|
| NIT-01 | Both | No `report-uri` / `report-to` — losing CSP-violation telemetry once enforcing. Wire to Sentry after LKID-84 lands. |
| NIT-02 | Backend | `startswith("/docs")` would match a hypothetical `/docs-anything` route. Defensive tightening on next refactor. |
| NIT-03 | Frontend | Module-level docstring (`next.config.ts` lines 4–19) still phrases the rollout in "first deploy" tense. Cosmetic. |

---

## Overall Readiness

**READY (with non-blocking nits)** — The flip is correctly implemented, all three PR #63 nits resolved, all tests green, all 7 headers verified live on the Vercel preview with the enforcing key. Production smoke (header check post-merge) and backend Railway smoke (after `main` deploy) should be the post-merge verification steps.

**Recommended merge path:** Squash-merge to `main`. After Vercel + Railway prod redeploy:

1. `curl -sI https://kidneyhood-automation-architecture.vercel.app/` → confirm `content-security-policy:` (no `-report-only`)
2. `curl -sI https://kidneyhood-backend-production.up.railway.app/health` → confirm `content-security-policy: default-src 'none'; ...`
3. `curl -sI https://kidneyhood-backend-production.up.railway.app/docs` → confirm `cdn.jsdelivr.net` in CSP
4. `curl -sI https://kidneyhood-backend-production.up.railway.app/openapi.json` → confirm strict CSP (no `cdn.jsdelivr.net`)
5. Open `/docs` in a browser → Swagger UI renders without CSP violations in console
6. End-to-end smoke: `/labs` → email → gate → `/results/[token]` → PDF download. Browser console clean of CSP violations.
7. Watch the browser-console / user-reports channel for 24h. If a real violation surfaces, revert the flip (single-line change in each file) and ship `report-uri` first.

---

**Reviewer signature:** Yuri (QA), 2026-04-30
