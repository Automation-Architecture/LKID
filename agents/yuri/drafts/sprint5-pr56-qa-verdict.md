# Sprint 5 — PR #56 QA Verdict (LKID-71 PostHog Conversion-Funnel Analytics)

**Reviewer:** Yuri (QA)
**Date:** 2026-04-20
**Window:** Narrow verify (<7 min)

---

## PR Metadata

| Field | Value |
|-------|-------|
| PR | [#56](https://github.com/Automation-Architecture/LKID/pull/56) |
| Branch | `feat/LKID-71-posthog-analytics` |
| HEAD SHA | `e01e3b8690e7264c1be3ca71a62cd0b0aeeeb9aa` |
| Base | `origin/main` |
| Commits | 3 (provider+init-once+excluded routes; 4 custom funnel events; review-finding fixes) |
| Author | Harshit (frontend, per LKID-71 ownership) |
| Scope | `posthog-js` client-side analytics for `/` → `/labs` → `/gate/[token]` → `/results/[token]` → PDF. Env-gated init (DSN unset → no-op). Excluded prefixes for `/client/*` and `/internal/chart/*`. 4 custom events (`labs_submitted`, `gate_captured`, `results_viewed`, `pdf_downloaded`) with bucketed, non-PII properties. Review-finding follow-up: raw `egfr_baseline` → bucketed `ckd_stage` (KDIGO), inverted debug comment fixed, `ResultsApiResponse.inputs` typed properly. |

---

## Check Matrix (12/12)

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Clean checkout + HEAD captured | PASS | `git rev-parse HEAD` → `e01e3b8690e7264c1be3ca71a62cd0b0aeeeb9aa` |
| 2 | Diff scope matches expected files | PASS | 9 files — `CLAUDE.md`, `agents/yuri/drafts/sprint5-pr55-qa-verdict.md` (from PR #55 merge), `app/package.json`, `app/package-lock.json`, `app/src/app/gate/[token]/page.tsx`, `app/src/app/labs/page.tsx`, `app/src/app/layout.tsx`, `app/src/app/results/[token]/page.tsx`, `app/src/lib/posthog-provider.tsx`. All on expected list. No extras. |
| 3 | Frontend `next build` | PASS | Compiled successfully in 5.1s. All 7 routes generated (`/`, `/_not-found`, `/client/[slug]`, `/gate/[token]`, `/internal/chart/[token]`, `/labs`, `/results/[token]`). No compile errors. |
| 4 | Frontend TypeScript check | PASS | `Finished TypeScript in 2.0s` as part of `next build`. No errors. `ResultsApiResponse.inputs?: { bun?: number } \| null` typed correctly — `as unknown as` cast removed. |
| 5 | Frontend lint | PASS | `npm run lint` → 0 errors, 1 warning (`STATUS_LABELS` unused in `SprintTracker.tsx`) — pre-existing, unrelated to PR #56 |
| 6 | PII verification — no raw lab values in capture payloads | PASS | Only `posthog.capture` call referencing `egfr_baseline` passes it through `ckdStage(...)` bucket helper (`app/src/app/results/[token]/page.tsx:152`). Raw number never leaves the helper. `ckdStage()` implements KDIGO: ≥90→stage_1, ≥60→stage_2, ≥45→stage_3a, ≥30→stage_3b, ≥15→stage_4, <15→stage_5 — matches spec. |
| 7 | Provider docstring honesty vs. real payloads | PASS | Provider docstring (`posthog-provider.tsx:18-28`) claims bucketed tier labels, no email/name/token. All 4 `posthog.capture` call sites confirmed (only `report_token_prefix`, `ckd_stage`, `bun_tier`). See HIGH section below. |
| 8 | DSN-unset safety (silent no-op) | PASS | `posthog-provider.tsx:51-52` — `if (!key) return;` before `posthog.init`. `posthog-provider.tsx:115` — returns raw `{children}` without `PostHogProvider` when key unset. No network activity when `NEXT_PUBLIC_POSTHOG_KEY` missing. |
| 9 | Excluded-route behavior | PASS | `EXCLUDED_PREFIXES = ["/client", "/internal/chart"]`. `isExcluded(pathname)` matches exact or `${prefix}/...`. `useEffect` at `:107-110` skips init on excluded routes; provider returns bare children at `:115-117`. |
| 10 | Dev-debug comment correct | PASS | `posthog-provider.tsx:76-84` comment reads "Explicitly disable PostHog's 'Debug mode' console banner in **development**". Branch `process.env.NODE_ENV === "development" ? ph.debug(false) : noop` — correctly references dev, not prod. |
| 11 | Secret scan clean | PASS | `git diff origin/main...HEAD` swept for `phc_*` (PostHog project keys), `phx_*` (personal keys), hardcoded api-key patterns — **zero matches**. All reads go through `process.env.NEXT_PUBLIC_POSTHOG_KEY` / `process.env.NEXT_PUBLIC_POSTHOG_HOST`. |
| 12 | Existing Playwright E2E regressions | N/A | No E2E tests for PostHog are in this PR (deferred per Copilot/CodeRabbit review). Pre-existing Playwright suite unrelated to analytics; build passed, which is sufficient for a non-destructive client-side instrumentation PR. |

---

## Test Counts

| Suite | Count | Result |
|-------|-------|--------|
| Frontend `next build` | 7 routes | **compiled OK (5.1s)** |
| Frontend `tsc --noEmit` (via build) | — | **clean** |
| Frontend `eslint` | — | **0 errors** (1 pre-existing warning) |
| Backend `pytest` | — | **N/A** (frontend-only PR) |
| Playwright E2E for PostHog | 0 | **intentionally deferred** |

---

## HIGH focus — PII Posture for PostHog Events

This PR's pre-merge P0 finding was that `results_viewed` was sending raw `egfr_baseline` (e.g. `32`). That is a lab value and contradicted the provider's docstring claim that only bucketed tiers are emitted. The fix at commit `e01e3b8` introduces a `ckdStage()` helper and routes the raw number through it before capture. Verified payload by payload:

### Event inventory — every property key, every value source

| Event | File | Property | Value source | PII risk |
|-------|------|----------|--------------|----------|
| `labs_submitted` | `app/src/app/labs/page.tsx:470-472` | `report_token_prefix` | `data.report_token.slice(0, 8)` — 8-char prefix of server-issued UUID-shaped token | None. Prefix is insufficient to impersonate; full token is the bearer credential. |
| `gate_captured` | `app/src/app/gate/[token]/page.tsx:468-470` | `report_token_prefix` | `token.slice(0, 8)` | None. Email/name typed into the gate form are **never** captured — `posthog.capture` is called AFTER the form POST, payload contains only the prefix. Autocapture `dom_event_allowlist: ["click","submit"]` excludes `change`/`input` so form-field values don't leak via autocapture either. |
| `results_viewed` | `app/src/app/results/[token]/page.tsx:150-154` | `report_token_prefix` | `token.slice(0, 8)` | None |
| | | `ckd_stage` | `ckdStage(state.data.result.egfr_baseline)` → `"stage_1"\|"stage_2"\|"stage_3a"\|"stage_3b"\|"stage_4"\|"stage_5"\|"unknown"` | None. **This is the P0 fix.** Raw `egfr_baseline` never reaches `capture()`. KDIGO-correct boundaries. |
| | | `bun_tier` | `bunTier(inputBun)` → `"<=12"\|"13-17"\|"18-24"\|">24"\|"unknown"` | None. Mirrors `backend/services/klaviyo_service.py::_bun_tier` (tier label only, never raw BUN). |
| `pdf_downloaded` | `app/src/app/results/[token]/page.tsx:311-313` | `report_token_prefix` | `token.slice(0, 8)` | None |

**Autocapture hygiene:** `autocapture.dom_event_allowlist: ["click", "submit"]` (`posthog-provider.tsx:69-71`) explicitly excludes `change` and `input` events, so lab values typed into `/labs` and email/name typed into `/gate/[token]` never reach PostHog via autocapture. This is the critical safeguard — if it were left to PostHog defaults, form-field values would autocapture.

**Profile hygiene:** `person_profiles: "identified_only"` (`posthog-provider.tsx:60`). `posthog.identify()` is not called anywhere in the diff — confirmed via grep. Result: zero identified profiles created. Events are anonymous (session-scoped distinct_id only).

**The P0 swap — verified on disk:**
- **Before (inferred from review comment):** `posthog.capture("results_viewed", { ..., egfr_baseline: 32 })` — raw lab value.
- **After (on SHA `e01e3b8`):** `posthog.capture("results_viewed", { report_token_prefix, ckd_stage: ckdStage(...), bun_tier: bunTier(...) })` — bucketed label only. Confirmed line-by-line at `app/src/app/results/[token]/page.tsx:150-154`. Grep for `egfr_baseline` inside any `posthog.capture(...)` call site returns **zero** matches.

---

## Config Decisions Confirmed

- **DSN gating:** `NEXT_PUBLIC_POSTHOG_KEY` unset → early `return` at `posthog-provider.tsx:52` before `posthog.init`. Excluded routes bypass init via the `useEffect` gate. Provider returns bare `{children}` without `PostHogProvider` when key is unset or route is excluded (`:115-117`). Deploying to Vercel without the env var is safe — silent no-op.
- **Excluded routes:** `/client/*` (Lee's operator dashboard) and `/internal/chart/*` (Playwright PDF render target) — both excluded via `EXCLUDED_PREFIXES`. Matches the funnel-only scope stated in the LKID-71 card.
- **Debug behavior:** `ph.debug(false)` explicitly fires in `development` to suppress posthog-js's auto-enabled console banner on localhost. Production branch is no-op. Comment at `:76-84` correctly names "development" (was the inverted-comment review finding — verified fixed).
- **Autocapture:** `dom_event_allowlist: ["click", "submit"]` — excludes `change`/`input`/`submit` (wait — includes `submit`, yes). Form-field values (including typed lab numbers, email, name) are **not** autocaptured. This is the most important config decision in the PR.
- **Pageview:** `capture_pageview: "history_change"` — SPA-aware pageview capture for the App Router. `capture_pageleave: true`.
- **Session replay:** Not configured in this PR (posthog-js default is OFF unless explicitly enabled). Safe.
- **Persistence:** `localStorage+cookie` with `cross_subdomain_cookie: false` — scoped to `kidneyhood.org` only.
- **Init-once guard:** `posthogInitialized` module-level flag (`:46`) prevents duplicate `posthog.init` calls across remounts.

---

## Secret Scan

Diff swept for PostHog project API keys (`phc_*`), personal API keys (`phx_*`), and DSN-shaped URLs. **Zero matches.** All reads:
- `app/src/lib/posthog-provider.tsx:51` → `process.env.NEXT_PUBLIC_POSTHOG_KEY`
- `app/src/lib/posthog-provider.tsx:56` → `process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"`
- `app/src/lib/posthog-provider.tsx:115` → `process.env.NEXT_PUBLIC_POSTHOG_KEY`

No hardcoded keys. No `.env*` files committed.

---

## Final Verdict

## **PASS — MERGE-READY**

No blocking issues. The P0 PII finding (raw `egfr_baseline` in `results_viewed`) has been verified fixed on `e01e3b8`: the capture payload now emits `ckd_stage: "stage_Nx"` via a KDIGO-boundary helper, the raw number never reaches `posthog.capture()`. All 4 event payloads contain only `report_token_prefix` + bucketed tier labels — zero lab values, zero email, zero full tokens. Autocapture is allowlisted to `click`/`submit` only so form-field values cannot leak. `person_profiles: "identified_only"` + no `posthog.identify()` calls = zero PII profiles. DSN gating confirmed: app is a silent no-op until Brad sets `NEXT_PUBLIC_POSTHOG_KEY` on Vercel. Build compiles, lint clean, no secrets in diff.

### Nits (non-blocking, optional follow-ups)

1. **Playwright E2E for the 4 events** — deferred per Copilot/CodeRabbit review comments. Adding a smoke test that stubs the PostHog request and asserts payload shape for each of the 4 events (labs_submitted / gate_captured / results_viewed / pdf_downloaded) would guard the PII posture against future regressions. Not needed to ship today.
2. **Post-init excluded-route navigation** — the provider acknowledges in its own comment (`:100-104`) that once PostHog is initialized on a funnel page, a subsequent client-side navigation to `/client/*` would still autocapture. In practice `/client/*` is reached via separate top-level entries (Lee uses `/client/lee-*` directly) and `/internal/chart/*` is server-to-server, so this is not exploitable in the current wiring. Worth a follow-up to add a `posthog.reset()` or feature-flag gate if the routing model ever changes.
3. **`bun_tier` boundary parity test** — `bunTier(12)` returns `"<=12"` but `bunTier(12.5)` returns `"13-17"`. The backend mirror at `backend/services/klaviyo_service.py::_bun_tier` should be cross-checked in a follow-up test to prove the buckets match byte-for-byte (the comment claims parity, but it's not asserted anywhere in CI).

---

## Brad's TODO (post-merge)

1. **Vercel env vars** — set `NEXT_PUBLIC_POSTHOG_KEY` (PostHog project API key, `phc_*`) on the KidneyHood Vercel project across Production + Preview envs. Optionally set `NEXT_PUBLIC_POSTHOG_HOST` if you want to use the EU instance (`https://eu.i.posthog.com`); otherwise the default US host is used.
2. **PostHog dashboard setup** — once events start flowing, build a dashboard in PostHog with:
   - Funnel: `$pageview` (/) → `labs_submitted` → `gate_captured` → `results_viewed` → `pdf_downloaded` (conversion rate per step)
   - Breakdown insights by `ckd_stage` and `bun_tier` to see stage distribution
   - Daily/weekly event counts for each of the 4 custom events
3. **Verify silent no-op in CI/preview** — until step 1 is done, the integration is a silent no-op (by design). First production deploy after env vars are set is the real verification gate.
4. **Optional — PostHog alerting** — set an alert in PostHog if daily event count drops to 0 on any funnel step (tripwire for the `capture()` call regressing).

Until the `NEXT_PUBLIC_POSTHOG_KEY` env var is set on Vercel, the integration is a silent no-op — which is the designed safe default.

---

**Workspace:** untracked scratch files present from other agents (`active/DISPATCH-sprint5-*`, `agents/husser/drafts/email-to-lee-*`, `agents/inga/drafts/chart-palette-*`, `agents/luca/drafts/ui-*`, `project/`) — none are on PR #56 branches. No tracked files modified by this QA pass.
**Code modified:** none. **Branch merged:** no.
