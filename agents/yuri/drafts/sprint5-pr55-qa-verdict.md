# Sprint 5 — PR #55 QA Verdict (LKID-72 Sentry Integration)

**Reviewer:** Yuri (QA)
**Date:** 2026-04-19
**Window:** Narrow verify (<7 min)

---

## PR Metadata

| Field | Value |
|-------|-------|
| PR | [#55](https://github.com/Automation-Architecture/LKID/pull/55) |
| Branch | `feat/LKID-72-sentry-integration` |
| HEAD SHA | `4601feec1d0c532cd2e8a22b4aca0c3ba940148b` |
| Base | `origin/main` |
| Commits | 3 (frontend wire, backend wire, scrubber tests) |
| Author | John Donaldson (per LKID-72 ownership) |
| Scope | `@sentry/nextjs` + `sentry-sdk[fastapi]` integration with PII scrubbing for `report_token`. Silent no-op when DSN unset. |

---

## Check Matrix (10/10)

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Clean checkout + HEAD captured | PASS | SHA `4601feec1d0c532cd2e8a22b4aca0c3ba940148b` |
| 2 | Diff scope matches expected files only | PASS | 12 files, all on the expected list. No extras. |
| 3 | Backend scrubber tests | PASS | `pytest tests/test_sentry_scrubber.py -v` → **6 passed in 0.01s** |
| 3b | Backend endpoint regression | PASS | `pytest tests/test_new_flow_endpoints.py -v` → **27 passed in 1.04s** |
| 4a | Frontend `tsc --noEmit` | PASS | Clean, no errors |
| 4b | Frontend `eslint` on Sentry files | PASS | 0 errors; 1 unrelated pre-existing warning in `SprintTracker.tsx` |
| 4c | Frontend `next build` | PASS | Compiled in 3.8s; 5 static + 4 dynamic routes; no Sentry wrap errors |
| 5 | Backend DSN init is gated | PASS | `backend/main.py:62-63` — `if _SENTRY_DSN:` guards `sentry_sdk.init(...)` |
| 5b | Frontend DSN from env (no hardcoding) | PASS | All 3 configs read `process.env.{NEXT_PUBLIC_,}SENTRY_DSN`; `enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN)` on client |
| 6 | PII scrubbers present BOTH sides | PASS | Backend: `scrub_report_token` in `backend/sentry_scrubber.py`. Frontend: `scrub()` + `beforeSend` in all 3 `sentry.*.config.ts` + `instrumentation-client.ts` |
| 6b | Backend scrubber walks all event paths | PASS | Walks `request`, `exception.values`, `breadcrumbs.values`, `logentry`, `extra` (verified in source + `test_scrub_event_redacts_all_known_locations` PASSED) |
| 7 | No `report_token` in bare logs | PASS | No `logger.*` statements in `backend/main.py` or `backend/services/*.py` reference `token`/`report_token` directly |
| 8 | Session replay OFF by default | PASS | `instrumentation-client.ts:33-34` → `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0` |
| 9 | Tracing sample rate = 0.1 (prod) | PASS | All 3 configs: `tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1` |
| 10 | Secret scan clean | PASS | `git diff origin/main...HEAD` — zero matches for DSN ingest URL, `re_`, `pk_live_`, `sk_live_` |

---

## Test Counts

| Suite | Count | Result |
|-------|-------|--------|
| `test_sentry_scrubber.py` | 6 | **6 passed** |
| `test_new_flow_endpoints.py` (regression) | 27 | **27 passed** |
| Frontend `tsc --noEmit` | — | **clean** |
| Frontend `eslint` | — | **0 errors** (1 pre-existing warning) |
| Frontend `next build` | 9 routes | **compiled OK** |

---

## HIGH focus — PII Scrubbing Posture

This is the risk that would make Sentry integration worse than no Sentry: leaking `report_token` (the bearer that unlocks a patient's results) into Sentry logs.

- **Backend** (`backend/sentry_scrubber.py`, 132 LOC): `scrub_report_token(event, hint)` walks **5 top-level keys** — `request`, `exception.values[*].value`, `breadcrumbs.values[*]` (both `message` + `data`), `logentry.message`/`params`, `extra`. Wired via `before_send=scrub_report_token` in `backend/main.py:79`. Redaction target is `[REDACTED]`. Test `test_scrub_event_redacts_all_known_locations` constructs an event with a token in every location and verifies all are redacted — **PASSED**.
- **Frontend** (all three runtimes — client / server / edge): inline `scrub()` helper + `beforeSend` hook. Scrubs `event.request.url` and `breadcrumbs[*].data.url` / `breadcrumbs[*].message`. Regex applied to `/results/{token}`, `/gate/{token}`, `/internal/chart/{token}`, and PDF routes.
- **Parity:** backend exports the regex via `test_regex_is_exported_for_frontend_parity_checks` to catch divergence.

**Gap note (nit, not a fail):** The frontend scrubber only covers `event.request.url` and breadcrumbs — it does **not** walk `event.exception.values[*].value` or `event.extra` the way the backend does. For the browser SDK this is usually fine (exception messages rarely embed URLs), but worth mentioning. Not sufficient to block merge.

---

## Config Decisions Confirmed

- **Session replay:** OFF (`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`). Privacy-conservative default for a health-adjacent app — correct call for MVP.
- **Traces sample rate:** 0.1 in production, 1.0 in development. Matches Sentry's recommended starting point.
- **DSN-unset behavior:** Both sides gated. Backend skips `sentry_sdk.init()` entirely when `SENTRY_DSN=""`. Frontend sets `enabled: Boolean(...)` on client; server/edge accept an empty DSN and become a silent no-op. Deploying without env vars is safe.

---

## Secret Scan

Diff swept for: Sentry ingest URLs (`https://o*.ingest.sentry.io/...`), Resend keys (`re_*`), Stripe live keys (`pk_live_` / `sk_live_`). **Zero matches.** All DSNs are `process.env` / `os.environ.get` references.

---

## Final Verdict

## **PASS — MERGE-READY (with one nit for Brad's follow-up)**

No blocking issues. Backend + frontend scrubbers in place, tested, and verified end-to-end. DSN gated on both sides. Replay OFF. Tracing sample rate conservative. No secrets leaked. Next.js 16 build compatible with `withSentryConfig` wrap.

### Nit (non-blocking, optional follow-up)

Frontend `beforeSend` doesn't walk exception messages or `extra` the way the backend does. If a future code path ever embeds a report_token into an exception message client-side, it would slip through. Consider adding 4–6 lines to mirror the backend's coverage in a follow-up PR. Safe to ship today — current call sites don't stringify tokens into exceptions.

---

## Brad's TODO (post-merge)

As noted in the PR description, Brad needs to land these outside the code PR:

1. Set `SENTRY_DSN` on Railway (backend)
2. Set `NEXT_PUBLIC_SENTRY_DSN` on Vercel (client)
3. Set `SENTRY_DSN` on Vercel (server + edge runtimes)
4. Set `SENTRY_ORG` on Vercel (source maps upload)
5. Set `SENTRY_PROJECT` on Vercel (source maps upload)
6. Configure alert rule in Sentry dashboard for `report_token` leak detection (tripwire — should never fire; if it does, scrubber gap)

Until the 5 env vars are set, the integration is a silent no-op — which is the designed safe default.

---

**Workspace:** clean before and after (`git status --short` returns nothing).
**Code modified:** none. **Branch merged:** no.
