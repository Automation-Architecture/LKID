# Sprint 5 — PR #60 QA Verdict (LKID-75 Lee Dashboard v2 — Launch-Metrics Panels)

**Reviewer:** Yuri (QA)
**Date:** 2026-04-20
**Window:** Narrow verify (<10 min)

---

## PR Metadata

| Field | Value |
|-------|-------|
| PR | [#60](https://github.com/Automation-Architecture/LKID/pull/60) |
| Branch | `feat/LKID-75-lee-dashboard-v2` |
| HEAD SHA | `522ea7c1084c6848e90f4516f78ef04b8249849d` |
| Base | `origin/main` |
| Commits | 2 (`b4a489b` backend `/client/{slug}/metrics` + 7 tests; `522ea7c` frontend `<LaunchMetrics>` panels + PostHog/Klaviyo placeholders) |
| Author | Harshit (LKID-75 ownership per dispatch) |
| Scope | Read-only launch-metrics panel row for `/client/lee-a3f8b2`. Adds `GET /client/{slug}/metrics` returning DB-driven KPIs (total predictions/leads, windowed 7d/24h counts, opt-in rate with min-N=10 gate, BUN tier distribution, 7-day sparkline with zero-filled `generate_series`, recent-10 leads with HIPAA-masked email + name initial + BUN tier). Adds `<LaunchMetrics>` component with 10-min refresh, placeholder skeleton cards for PostHog funnel + Klaviyo email-performance. 4 files changed, +1134 / −0. |

---

## Check Matrix (16/16)

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | HEAD verified | PASS | `git rev-parse HEAD` → `522ea7c1084c6848e90f4516f78ef04b8249849d` — exact match. Branch `feat/LKID-75-lee-dashboard-v2`, 2 commits ahead of `main`. |
| 2 | Diff scope | PASS | `git diff --name-only main...HEAD` → exactly the 4 dispatched files: `backend/main.py`, `backend/tests/test_new_flow_endpoints.py`, `app/src/components/dashboard/LaunchMetrics.tsx` (new), `app/src/app/client/[slug]/page.tsx`. No scope creep — engine untouched, PostHog provider untouched, Sentry config untouched, funnel event firings untouched, `/labs`, `/gate/[token]`, `/results/[token]`, chart code all 0 lines changed. |
| 3 | Frontend `next build` | PASS | `cd app && npm run build` → "Compiled successfully in 5.0s", TypeScript finished clean in 1942ms. All 7 routes generated. New `<LaunchMetrics>` wire-in into `/client/[slug]` typechecks; client-side refs (`useEffect`, `fetch`, `setInterval`) compile under the strict config. |
| 4 | Frontend lint | PASS | `cd app && npm run lint` → **0 errors**, 1 pre-existing warning (`STATUS_LABELS` unused in `SprintTracker.tsx` — carried over from earlier PRs, unrelated to this PR). |
| 5 | Backend `pytest` | PASS | `cd backend && venv/bin/python -m pytest tests/test_new_flow_endpoints.py -v` → **34 passed in 0.55s** (27 existing from prior PRs + 7 new for LKID-75: `test_unknown_slug_returns_404`, `test_metrics_shape_with_empty_db`, `test_metrics_opt_in_visible_above_min_sample`, `test_metrics_masks_emails_and_bucket_buns`, `test_bun_tier_label_boundaries`, `test_mask_email_edge_cases`, `test_name_initial`). Zero regressions in the existing 27-test suite (LKID-62 tokenized flow, LKID-47 Klaviyo, MED-02/03 invariants, etc.). Matches Harshit's 34/34 report exactly. |
| 6 | **HIPAA posture — HIGH focus** | **PASS** | See HIPAA section below. `_mask_email` output is irreversible-ish (`j***@d****.com`), `_name_initial` is a single uppercased character, the `recent_leads` response never contains `email`, `name`, `bun`, `creatinine`, `egfr`, or any other raw value. BUN tier distribution is per-tier COUNTS, not raw values (frontend computes percent from counts). Full PII/PHI trail clean — no raw emails, raw names, or raw lab values anywhere in the response shape. |
| 7 | Slug-as-secret auth | PASS | `backend/main.py:1229` declares `CLIENT_DASHBOARD_SLUGS = frozenset({"lee-a3f8b2"})` — same allowlist pattern (and same single slug) as `VALID_SLUGS` in `app/src/app/client/[slug]/page.tsx:11`. Unknown slugs → `raise HTTPException(status_code=404, detail="Unknown client dashboard")` at `main.py:1330`. **404, not 403** — correct choice; does not leak that `/client/*` is a gated family. Test `test_unknown_slug_returns_404` pins this at `tests/test_new_flow_endpoints.py:1171–1174`. Comment block at `main.py:1217–1225` explicitly calls out slug-as-shared-secret + mirrors VALID_SLUGS. |
| 8 | Opt-in-rate min-sample gate | PASS | `main.py:1234` sets `OPT_IN_MIN_SAMPLE = 10`. At `main.py:1468–1474`: if `predictions_total < 10`, response is `{"percent": None, "visible": False, "reason": "insufficient_data", "min_sample": 10}` — explicitly machine-readable, no NaN, no division-by-zero (numeric division only runs in the `else` branch after the guard). Frontend `LaunchMetrics.tsx:76–81` `formatPercent` returns `—` when `!rate.visible \|\| rate.percent === null`; KPI card sublabel at L518 shows `"Need ≥ ${data?.opt_in_rate.min_sample ?? 10} predictions"`; card goes `muted` grey via L520. Graceful UX. Test `test_metrics_shape_with_empty_db` at `tests/test_new_flow_endpoints.py:1198–1202` confirms the gate body shape on empty DB. `test_metrics_opt_in_visible_above_min_sample` at L1221–1253 confirms 12 predictions → gate opens, 3 linked leads → 25.0% surfaces. |
| 9 | Windowed counts (TZ + zero-fill) | PARTIAL | **7d / 24h counts** at `main.py:1336–1363` use `now() - interval '7 days'` / `'24 hours'` on `predictions.created_at` and `leads.created_at`. Both columns default to `timestamptz` per the schema — comparing a `timestamptz` to `now()` is timezone-aware and correct, so the rolling windows are fine. **Sparkline daily buckets** at `main.py:1398–1417` use `date_trunc('day', now())` and `date_trunc('day', p.created_at)` without an explicit `AT TIME ZONE 'UTC'`. CodeRabbit correctly flagged this at line 1421: `generated_at` at L1502 is explicitly UTC (`_dt.now(_tz.utc).isoformat()`), so if Railway's session TimeZone GUC is not UTC, a prediction near midnight UTC could land in the "wrong" calendar day relative to `generated_at`. Low practical risk (Railway Postgres defaults to UTC; traffic near midnight is low during launch); flagged as Nit #2 below — not a merge-blocker but worth pinning. **Zero-fill:** `generate_series` produces exactly 7 rows regardless of data at L1405–1409, and the `LEFT JOIN predictions` preserves zero-count days. Frontend at L148 fixes `max = Math.max(1, ...series.map(s => s.count))` so a 0-count day still shows a faint 6%-height bar (L166). Zero-division guarded. |
| 10 | Recent-leads JOIN semantics | PASS | `main.py:1429–1453` uses a `WITH latest_pred AS (SELECT DISTINCT ON (p.lead_id) p.lead_id, p.inputs->>'bun' ORDER BY p.lead_id, p.created_at DESC)` CTE → correctly handles the re-submit case where one email (= one lead via `ON CONFLICT (email)` upsert at `main.py:712`) has multiple prediction rows. Picks the most recent prediction's BUN tier per lead. The outer `LEFT JOIN latest_pred lp ON lp.lead_id = l.id` includes leads with **no** predictions (Clerk-webhook leads); those fall through with `bun_raw = NULL` → `_bun_tier_label(None) → "unknown"`. **Intentional per dispatch §10** — `bun_tier: "unknown"` is a reasonable signal to Lee that some leads came from a different pipeline (webhook) rather than hiding them. `ORDER BY l.created_at DESC LIMIT 10` at L1448–1449 gives recency. Test `test_metrics_masks_emails_and_bucket_buns` at L1255–1284 exercises the BUN=20 → "18-24" + email mask + name initial path end-to-end. |
| 11 | Frontend refresh interval | PASS | `LaunchMetrics.tsx:19` sets `REFRESH_INTERVAL_MS = 10 * 60 * 1000` (600,000ms). `useEffect` at L419–452 uses `let cancelled = false` flag, calls `load()` once immediately, then `setInterval(load, REFRESH_INTERVAL_MS)`, and in the cleanup returns `() => { cancelled = true; clearInterval(id); }`. Fetch call at L424 has `cache: "no-store"` — Next.js won't stale-cache. Loading state rendered via `setLoading(true)` default + `"…"` placeholders at L497/507/514/524; error state rendered with a red banner via `role="alert"` at L477–490. `cancelled` guard prevents state updates after unmount. Clean React hooks. |
| 12 | Placeholder cards | PASS | Two `<PlaceholderCard>` instances at `LaunchMetrics.tsx:543–551`: "Conversion funnel" (awaiting PostHog) + "Email performance" (awaiting Klaviyo API key). Implementation at L347–412 uses a diagonal-stripe hatch overlay (`repeating-linear-gradient`, 4% opacity navy) + three skeleton `<div>` bars + a pill badge "Coming soon" using `--s-blue-bg / --s-blue-text` tokens + a note paragraph. Styled so Lee reads "feature pending" not "dashboard broken" per dispatch §12. |
| 13 | Styling consistency | PASS | Every color literal in the new component uses existing CSS variables: `--brand-teal` (KPI card value), `--brand-body` (labels/sublabels), `--brand-divider` (card border), `--brand-divider-subtle` (table cell border), `--brand-gray` (muted KPI), `--brand-track` (skeleton backgrounds + distribution track), `--brand-black` (table name initial + BUN tier labels), `--s-green / --s-blue / --s-yellow / --s-gray` (BUN tier bars + blue-bg on placeholder pills), `--s-blue-bg / --s-blue-text` (pill). Only **one** non-token hex: `#B1553A` on `LaunchMetrics.tsx:64` for the ">24" BUN tier (warm orange). This is a single-use accent — the comment at L64 flags it as "still in brand range". Error banner uses `#FEE2E2 / #FECACA / #991B1B` literal red (L481–483) — cosmetic status color not covered by brand tokens, acceptable one-off. No new tokens introduced in `globals.css`. |
| 14 | Does not touch protected surfaces | PASS | `git diff main...HEAD --name-only` confirms zero changes to: `/results/[token]` code, `/labs` page, `/gate/[token]` page, `app/src/components/chart/**`, PostHog provider (`PostHogProvider.tsx`, `posthog.ts`), Sentry config (`sentry.*.config.ts`, `sentry_scrubber.py`), engine (`backend/prediction/engine.py`, `backend/prediction/*.py`), migrations (`backend/alembic/**`, `backend/db_schema.sql`), `services/klaviyo_service.py`, `services/resend_service.py`, `email_renderer.py`, CI workflows. The only frontend file wired in is `client/[slug]/page.tsx` (+4 lines: import at L9 + render at L30 between `WeeklyUpdate` and `PrototypePreview`). |
| 15 | Secret scan | PASS | `git diff main...HEAD \| grep -Ei 'phc_\|phx_\|sntry_\|api_key\|API_KEY\|sk_live\|sk_test\|postgres://\|postgresql://\|BEGIN PRIVATE\|BEGIN RSA\|bearer'` → **zero matches**. No DSNs, no API keys, no bearer tokens, no database URLs. The placeholder cards name PostHog + Klaviyo by brand but embed no credentials. |
| 16 | CI status | PASS | `gh pr checks 60` → **CodeRabbit: pass** (review completed), **Vercel: pass** (deploy `vercel.com/automation-architecture/kidneyhood/4awZaveCV6fGykQjSgPMU41Mq5zN`), **Vercel Preview Comments: pass**. `gh api repos/.../pulls/60/reviews` → Copilot and CodeRabbit both reviewed; no human request-changes. PR marked `MERGEABLE`. Inline comments present (see Review Feedback section below) — mostly actionable nits, none merge-blocking. |

---

## Test Counts

| Suite | Count | Result |
|-------|-------|--------|
| Frontend `next build` | 7 routes | **compiled OK (5.0s)** |
| Frontend `tsc --noEmit` (via build) | — | **clean (1942ms)** |
| Frontend `eslint` | — | **0 errors** (1 pre-existing warning) |
| Backend `pytest tests/test_new_flow_endpoints.py` | 34 | **34 passed in 0.55s** (27 existing + 7 new for LKID-75) |
| New LKID-75 tests | 7 | **all pass** |
| Playwright a11y / E2E / visual | present | **Cannot run locally** — `@playwright/test` install gap inherited from PR #57/58/59. CI exercises; not regressed by this PR (no test files touched in those suites). |
| Jest / Vitest | 0 | **N/A** — no JS unit-test runner configured. |

---

## HIPAA posture — HIGH-focus section

This endpoint serves live PII/PHI-adjacent production data to the Lee dashboard over a shared-secret URL. Every field Lee can see was examined for leak vectors.

### 1. `_mask_email` is irreversible-ish

`main.py:1266–1301`. Input `alice@example.com` → output `a***@e****.com`. Format: first char of local + `***` + `@` + first char of domain base + `****` + `.` + TLD.

Test cases pinned at `tests/test_new_flow_endpoints.py:1309–1323`:

| Input | Output |
|---|---|
| `alice@example.com` | `a***@e****.com` |
| `bob@example.co.uk` | `b***@e****.uk` (co-TLD: only the final dot-segment is TLD) |
| `j@example.com` | `j***@e****.com` (single-char local) |
| `None` / `""` / `no-at-sign` | `***` |
| `user@localhost` | `u***@l****` (no-TLD fallback) |

The function preserves exactly 2 characters from the original email (first local + first domain) plus the TLD extension. For a 12-character address like `alice@google.com`, this reveals 3 characters of source info vs the 16 original. Reversibility: no — without the raw email, `a***@e****.com` could match any local beginning with `a` at any `e*.com` domain (Ethereum, Enron, example.com, eyeota.com, etc.). The `****` fixed length intentionally does **not** encode the original domain length, so even a character-count attack fails.

**Assessment:** meets the HIPAA-cautious bar for an internal dashboard Lee reads. A true medical-record dashboard would demand SHA-256 truncation or full redaction to `***@***`, but the "first-char + TLD" scheme here is the right trade-off — Lee gets enough to spot "did John Doe sign up?" without seeing the full email.

### 2. `_name_initial` is a single character, not first name

`main.py:1304–1309`. Input `"Alice Smith"` → output `"A"`. Input `"  bob"` → `"B"`. Input `""` / `None` / whitespace-only → `"?"`. The function slices `[:1]` after `.strip()` and uppercases. **Never emits more than one character.** Test at `tests/test_new_flow_endpoints.py:1325–1332`.

No family-name leakage. No first-name leakage. The recent-leads table cell at `LaunchMetrics.tsx:310–318` renders this as a single bold uppercase letter.

### 3. No raw eGFR / BUN / creatinine / potassium values in any response field

Searched the response shape:

| Field | Content | Raw value risk |
|---|---|---|
| `predictions.total / last_7d / last_24h` | row counts | **None** — integers. |
| `leads.total / last_7d / last_24h` | row counts | **None** — integers. |
| `opt_in_rate.percent` | single rounded percentage | **None** — aggregate. |
| `bun_tier_distribution` | `{"<=12": n, "13-17": n, ...}` | **None** — per-tier counts, never raw BUN. |
| `predictions_per_day[].count` | daily row count | **None** — aggregate. |
| `recent_leads[].bun_tier` | tier label string | **None** — label only (`"<=12"`, `"13-17"`, `"18-24"`, `">24"`, `"unknown"`). |
| `recent_leads[].created_at` | ISO timestamp | **None** — not PHI. |
| `recent_leads[].name_initial` | single char | **None** — per §2. |
| `recent_leads[].email_masked` | masked email | **None** — per §1. |

No `egfr_baseline`, no raw `bun`, no `creatinine`, no `potassium`, no `age`, no `sex` anywhere in the response JSON. The BUN value is read from the `inputs->>'bun'` JSONB path internally at `main.py:1373` and `main.py:1436`, bucketed via `_bun_tier_label`, and only the **label** leaves the handler. Same for the distribution counts — raw BUN never reaches the wire.

### 4. BUN tier distribution is counts, not raw values

`main.py:1380–1393` builds a fixed-keys dict `{"<=12": 0, "13-17": 0, "18-24": 0, ">24": 0, "unknown": 0}` and increments per prediction. The response shape is `bun_tier_distribution: Record<string, int>`. **Counts only.** Frontend at `LaunchMetrics.tsx:222–254` computes percent locally as `count / total` — the server never transmits raw BUN numbers.

### 5. Test coverage for HIPAA invariants

`test_metrics_masks_emails_and_bucket_buns` at `tests/test_new_flow_endpoints.py:1255–1284` locks the HIPAA contract: seeds a prediction with BUN=20 + a lead `alice@example.com / Alice Smith`, asserts `email_masked == "a***@e****.com"`, `name_initial == "A"`, `bun_tier == "18-24"`, and explicitly asserts `"email" not in entry`, `"name" not in entry`, `"bun" not in entry`. This is the regression guard that prevents a future contributor from silently adding a raw-email field to the response.

### 6. Net HIPAA posture

**PASS.** The three masking helpers (`_mask_email`, `_name_initial`, `_bun_tier_label`) are deterministic, covered by unit tests, and every raw PII/PHI field is filtered before the response is built. The slug-as-secret auth pattern (`frozenset({"lee-a3f8b2"})` + 404 on miss) is consistent with the existing `/client/*` surface. The `generated_at` timestamp is UTC. No logs or Sentry trails expose raw emails (Sentry DSN only captures exception stacks, and `before_send=scrub_report_token` runs on every event).

**Merge-blocker status:** NONE of the §6 HIPAA checks fail. This section is merge-cleared.

---

## Scope Discipline

Diff touches exactly the 4 dispatched files, all within LKID-75 scope.

- `backend/main.py` (+306) — Adds 3 helpers (`_bun_tier_label`, `_mask_email`, `_name_initial`), 2 constants (`CLIENT_DASHBOARD_SLUGS`, `OPT_IN_MIN_SAMPLE`), 1 endpoint (`GET /client/{slug}/metrics`). All code appended below existing `/leads` admin handler — zero modifications to existing routes or Sentry init.
- `backend/tests/test_new_flow_endpoints.py` (+269) — Adds `_FakeAllResult` class for multi-row queries + extends `FakeStore.dispatch` with 4 new SQL-pattern branches (metrics count queries, BUN distribution SELECT, `generate_series` sparkline, `latest_pred` recent-leads CTE). Adds 2 new test classes: `TestClientDashboardMetricsEndpoint` (4 tests) + `TestClientMetricsHelpers` (3 tests) = 7 tests total.
- `app/src/components/dashboard/LaunchMetrics.tsx` (+555, new file) — Single exported `<LaunchMetrics>` component + 5 internal sub-components (`KpiCard`, `SparklineBars`, `BunDistribution`, `RecentLeadsTable`, `PlaceholderCard`) + 2 formatters (`formatPercent`, `formatRelative`). All client-side (`"use client"` at L1). Uses `fetch` + `setInterval`, no external state library.
- `app/src/app/client/[slug]/page.tsx` (+4) — Imports `<LaunchMetrics>` at L9, renders `<LaunchMetrics slug={slug} />` at L30 between `<WeeklyUpdate />` and `<PrototypePreview />` with a LKID-75 comment block. VALID_SLUGS unchanged. notFound() gate unchanged.

**Confirmed untouched:** engine, chart components, PostHog provider, Sentry config, `/labs`, `/gate/[token]`, `/results/[token]`, Resend service, Klaviyo service, migrations, `db_schema.sql`, `globals.css`, CI workflows.

No scope creep.

---

## Review Feedback (CodeRabbit + Copilot)

CodeRabbit posted 4 actionable findings. Copilot posted 5 nits. Summary:

### CodeRabbit findings

| # | File:line | Severity | Issue |
|---|---|---|---|
| CR-1 | `backend/main.py:1332` | Major (P1) | **Missing `@limiter.limit()` decorator** on the new endpoint. Every other write handler (`/predict` 10/min, `/leads` 5/min, `/predict/pdf` 5/min, `/webhooks/clerk` 60/min) rate-limits. The slug is a shared secret, not an auth layer — if the URL leaks, this endpoint is 5+ DB round-trips per call (counts × 2, distribution scan, daily rollup, recent-leads CTE). CodeRabbit proposes `@limiter.limit("30/minute")` comfortably above the 10-min frontend refresh. **Not HIPAA-blocking** but a real cost-of-DoS concern. See Nit #1 below. |
| CR-2 | `backend/main.py:1483` | Major (P1) | **Opt-in rate overcounts.** `leads_total` is `COUNT(*) FROM leads` — but the `leads` table is also populated by `POST /webhooks/clerk` at `main.py:1172–1178` (Clerk-sourced signups that never ran a prediction). So `leads_total / predictions_total` blends two populations and can exceed 100% once Clerk usage accumulates. Lee's actual question ("what % of predictions resulted in a lead capture?") is better answered by `COUNT(*) FROM predictions WHERE lead_id IS NOT NULL / COUNT(*) FROM predictions`. The Sprint 4 Clerk-removal work (LKID-66) removed the `/predict`/`/auth` surfaces but the `/webhooks/clerk` handler is still wired at `main.py:1104–1190` — Clerk-webhook-only leads are a live, non-zero source. **Real correctness bug.** Not HIPAA, not merge-blocking, but worth addressing. See Nit #3 below. |
| CR-3 | `backend/main.py:1421` | Minor (P2) | **Sparkline day-bucketing not pinned to UTC.** `generated_at` at L1502 is `_dt.now(_tz.utc).isoformat()`, but `date_trunc('day', now())` at L1406 / `date_trunc('day', p.created_at)` at L1411 follow the session `TimeZone` GUC. If Railway's Postgres session TZ is not UTC, a prediction created near midnight UTC could land in the "wrong" day relative to `generated_at`. Proposed fix: `AT TIME ZONE 'UTC'` on both sides of the JOIN. Low practical risk — Railway's default is UTC and launch-volume traffic near midnight is negligible — but worth pinning before the app scales. See Nit #2 below. |
| CR-4 | `backend/tests/test_new_flow_endpoints.py:260` | Minor (P2) | **If CR-2 is adopted, the FakeStore needs a dispatch branch for `lead_id IS NOT NULL`.** The current "from predictions + count(*)" branch at L241–249 returns `len(self.predictions)` unconditionally. If CR-2 is taken, the opt-in numerator query `SELECT COUNT(*) FROM predictions WHERE lead_id IS NOT NULL` would match the existing branch by keyword fallthrough and silently return all 12 predictions instead of just the 3 with non-null `lead_id`. `test_metrics_opt_in_visible_above_min_sample` would still pass but with wrong semantics. Heads-up only; not actionable until CR-2 is merged. |

### Copilot findings

| # | File:line | Severity | Issue |
|---|---|---|---|
| CP-1 | `LaunchMetrics.tsx:488` | Minor | Error banner says "Retrying in a few minutes" but the actual retry cadence is 10 minutes. Either match the copy or add a shorter error-backoff interval. Cosmetic. |
| CP-2 | `LaunchMetrics.tsx:177` | Minor | `aria-label` on a plain `<div>` (sparkline bar) won't be reliably announced by screen readers because the element has no semantic role. Fair point — add `role="img"` or switch to a native `<figure>` wrapper. |
| CP-3 | `LaunchMetrics.tsx:295` | Minor | Recent-leads table `<th>` headers lack `scope="col"`. Trivial a11y fix. |
| CP-4 | `backend/main.py:1478` | Minor | Duplicates CR-2 (opt-in rate overcount). Same root issue. |
| CP-5 | `backend/main.py:1333` | Nit | `ErrorResponse` is declared in the `responses={}` block but `HTTPException(status_code=404, detail=...)` goes through FastAPI's default error handler, not the project's custom `ErrorBody` envelope wrapper at `main.py:231–283`. The generic_error_handler only catches `Exception`, not `HTTPException`. Consequence: this endpoint's 404 body will be `{"detail": "Unknown client dashboard"}`, not `{"error": {"code": ..., "message": ...}}` like the `RateLimitExceeded` handler emits. Same pattern used on every other endpoint in this file (e.g., `/results/{token}` at L596 declares `ErrorResponse` but raises plain HTTPException) — so it's a pre-existing inconsistency, not a PR #60 regression. Documenting for the eventual error-envelope sweep. |

---

## Secret Scan

`git diff main...HEAD` across all 4 modified files + grep for `phc_`, `phx_`, `sntry_`, `api_key`, `API_KEY`, `secret`, `sk_live`, `sk_test`, `postgres://`, `postgresql://`, `BEGIN PRIVATE`, `BEGIN RSA`, `bearer`. **Zero matches.** Placeholder cards name PostHog + Klaviyo by brand but embed no credentials.

---

## Final Verdict

## **PASS-with-nits — MERGE-READY**

All 16 checks resolve to PASS or PARTIAL. The HIPAA-focused section §6 (the only merge-blocker class per the dispatch) passes clean: `_mask_email` is irreversible enough, `_name_initial` is single-char, raw lab values never appear in the response, BUN tier distribution is counts-only, the slug-allowlist is consistent with the frontend and returns 404 (not 403) on miss, the opt-in min-sample gate is correctly machine-readable, and a dedicated test locks the HIPAA invariants.

Backend tests pass 34/34 (27 existing + 7 new) in 0.55s with zero regressions to prior LKID-62 / LKID-47 / MED-02 / MED-03 work. Frontend build + lint green. CodeRabbit + Vercel + Preview Comments all pass.

Review feedback surfaced one non-HIPAA correctness concern (opt-in rate overcount from Clerk-webhook leads — CR-2) that is real but not merge-blocking; the fix is a 10-line SQL tweak that can land as a follow-up PR without destabilizing any existing test.

### Nits (in priority order)

1. **[P1 — correctness, non-blocking] Opt-in rate overcount (CR-2).** `leads_total / predictions_total` blends Clerk-webhook leads (which never ran a prediction) with tokenized-flow leads (which did). Can exceed 100% once Clerk-sourced signups accumulate — the `/webhooks/clerk` handler at `main.py:1104–1190` is still live. **Recommended fix:** use `SELECT COUNT(*) FROM predictions WHERE lead_id IS NOT NULL` as the numerator; leave `leads_total` as a separate display KPI. Paired with CR-4 update to the FakeStore (add a `"lead_id is not null"` dispatch branch). Post-merge follow-up PR; not a merge gate because the metric is read-only, Lee-only, and early-launch traffic is low enough that the divergence is imperceptible for a few weeks. **Until fix lands, add a sublabel caveat** on the opt-in KPI card or defer the card entirely.

2. **[P2 — correctness, non-blocking] Add rate limiter to `/client/{slug}/metrics` (CR-1).** Every other handler in `main.py` is `@limiter.limit()`-decorated; this one isn't. With 5+ DB round-trips per call and a shared-secret URL, a leaked slug + a loop is a small-scale DoS. **Recommended fix:** `@limiter.limit("30/minute")` — 3× the 10-min frontend refresh cadence so a legitimate reload never trips. One-line change.

3. **[P2 — correctness, non-blocking] Pin sparkline day buckets to UTC (CR-3).** `generated_at` is explicitly UTC at L1502 but the `date_trunc('day', now())` / `date_trunc('day', p.created_at)` at L1406/L1411 follow the session GUC. Railway defaults to UTC so this is theoretical today, but a future config drift would create a subtle off-by-one in the "last 7 days" chart relative to the timestamp. **Recommended fix:** `date_trunc('day', now() AT TIME ZONE 'UTC')` and `date_trunc('day', p.created_at AT TIME ZONE 'UTC')` on both sides of the CTE.

4. **[P2 — a11y, non-blocking] Sparkline bar semantics + table header scope (CP-2 + CP-3).** `<div aria-label>` on the sparkline bars → add `role="img"` or convert to a semantic element. Recent-leads `<th>` → add `scope="col"`. Both are one-line fixes. Low priority because the dashboard is Lee-only (not a public a11y-compliance surface), but good hygiene.

5. **[Nit — copy] Error banner retry cadence mismatch (CP-1).** "Retrying in a few minutes" but the actual `setInterval` is a hard 10-minute cycle. Either update the copy to "Next retry in ~10 minutes" or add a short-interval error-backoff (e.g., retry every 30s for 3 attempts, then settle to 10 min). Low priority — error states are uncommon.

6. **[Nit — housekeeping] FakeStore `lead_id IS NOT NULL` dispatch branch (CR-4).** Only actionable if Nit #1 is adopted; flagging so the test update doesn't get forgotten.

7. **[Nit — housekeeping] Error envelope inconsistency on HTTPException responses (CP-5).** Pre-existing on every endpoint in `main.py` — `responses={}` declares `ErrorResponse` but actual 404/410/422 bodies come through FastAPI's default `{"detail": "..."}` format because `generic_error_handler` only catches bare `Exception`, not `HTTPException`. Separate sweep PR when someone has time; not PR #60's problem.

8. **[Nit — inherited] Playwright install gap.** `@playwright/test` still missing from `app/node_modules` — carried over from PRs #57/58/59. Same recommendation as prior verdicts: one-off housekeeping PR adds `npm i -D @playwright/test` + wires `test:a11y`/`test:e2e`/`test:visual` scripts.

---

## Brad's TODO (post-merge)

**Merge flow plus 2 small follow-ups for Lee's sanity.**

1. Merge via `gh pr merge 60 --squash` once Brad is satisfied.
2. Visual sanity check on Vercel preview: open `/client/lee-a3f8b2`, scroll to "Launch Metrics", confirm the 4 KPI cards, sparkline + BUN distribution row, recent-leads table, and 2 "Coming soon" placeholder cards render. Opt-in KPI should show "—" with sublabel "Need ≥ 10 predictions" on a near-empty production DB.
3. **Follow-up PR recommended (P1):** address the opt-in overcount (Nit #1) before traffic grows — the metric is the most visible "launch signal" on the dashboard, and a `>100%` reading would destroy Lee's trust in the numbers. Small 10-line SQL change + FakeStore dispatch tweak.
4. **Follow-up PR recommended (P2):** add the `@limiter.limit("30/minute")` decorator (Nit #2). Single-line change.
5. No env-var changes, no DB migrations, no backend deploy gate (the endpoint is side-effect free, pure read), no Klaviyo/Resend/PostHog/Sentry config changes.
6. Lee-comms heads-up: the PostHog + Klaviyo placeholder cards are intentional. When Brad wires the Vercel env vars + grants the PostHog API key / Klaviyo API key, the placeholders get replaced in a later PR. Dashboard does not break in their absence.

---

**Workspace:** untracked scratch files present from prior QA passes and other agents (`active/DISPATCH-sprint5-results-parity.md`, `agents/husser/drafts/email-to-lee-sprint5-update.md`, `agents/john_donaldson/drafts/scenario-dial-age-signoff.md`, `agents/luca/drafts/lkid-69-predelete-verification.md`, `agents/luca/drafts/ui-audit-screenshots/`, `agents/luca/drafts/ui-design-audit-sprint5.md`, `agents/yuri/drafts/sprint5-pr56-qa-verdict.md`, `agents/yuri/drafts/sprint5-pr57-qa-verdict.md`, `agents/yuri/drafts/sprint5-pr58-qa-verdict.md`, `agents/yuri/drafts/sprint5-pr59-qa-verdict.md`, `project/`) — none touched during this QA pass. This verdict file (`agents/yuri/drafts/sprint5-pr60-qa-verdict.md`) is the only file created. Source tree read-only throughout; branch `feat/LKID-75-lee-dashboard-v2` unchanged.
**Code modified:** none. **Branch merged:** no.

---

## 2-Line Summary

PR #60 (LKID-75) delivers a read-only launch-metrics panel on `/client/lee-a3f8b2` — backend `GET /client/{slug}/metrics` with DB-driven counts + 7-day sparkline + BUN tier distribution + HIPAA-masked recent-leads, frontend `<LaunchMetrics>` with 10-min refresh + PostHog/Klaviyo placeholder cards; HIPAA §6 passes clean (irreversible email mask, single-char initial, no raw lab values, BUN counts-only, slug-allowlist returns 404), backend 34/34 tests pass, build + lint + CodeRabbit + Vercel green.

**Verdict: PASS-with-nits — merge-ready.** Two follow-up PRs recommended (P1 opt-in rate overcount from Clerk-webhook leads blending two populations; P2 missing `@limiter.limit()` on the new endpoint) — neither merge-blocking, neither HIPAA-affecting.

**Verdict file:** `agents/yuri/drafts/sprint5-pr60-qa-verdict.md`
