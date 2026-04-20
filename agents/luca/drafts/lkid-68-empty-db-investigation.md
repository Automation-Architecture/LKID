# LKID-68 — Empty Prod DB Postmortem (Investigation Half)

**Owner:** Luca (CTO)
**Date:** 2026-04-19
**Status:** Investigation complete — synthesis/actions owned by Brad
**Scope:** Root-cause evidence gathering for prod Postgres (`Postgres-726n`) being empty when Sprint 4 shipped. Guardrail proposals attached. No writes, no deletions, no Jira field edits.

---

## Summary

Prod Postgres (`Postgres-726n`) was completely empty at Sprint 4 deploy because **Alembic was never run against it — there is no migration-on-boot hook in the backend, and no one ever executed `railway run alembic upgrade head` against production**. Sprint 2 QA (2026-03-27) flagged the Alembic chain as broken (MG-01, HIGH) but that finding was resolved by fixing the branching in git; no one ever verified the migration actually ran in prod. Through Sprints 2 and 3, the `/predict` path did not write to the DB (LKID-11 lead writes were best-effort fire-and-forget, and real prod traffic volume was ~7 successful POSTs total — internal/QA only), so no one noticed. LKID-62 (PR #35, merged 2026-04-19) rewired `/predict` to INSERT into the brand-new `predictions` table; first real writes hit a completely unmigrated DB and crashed with `UndefinedTableError: relation "predictions" does not exist`. The duplicate `Postgres` service (non-`-726n`) is a 12-minute-older sibling from the same provisioning session on 2026-03-27, also empty — it was never wired to any variable reference and is harmless orphaned infrastructure.

---

## Evidence (timeline)

| Date (UTC) | Event | Evidence |
|---|---|---|
| 2026-03-27 02:59:33 | `Postgres` service (service ID `c544ff17-…`) initialized — PG 18.3, empty volume `vol_jscu8kh82lu0yssw` | `railway logs --service Postgres` first line |
| 2026-03-27 03:11:52 | `Postgres-726n` service (service ID `a8af2a61-…`) initialized — PG 18.3, empty volume `vol_b4fscda40xi3kvfw`. This is what the backend DATABASE_URL was set to. | `railway logs --service Postgres-726n` + `railway variables --service kidneyhood-backend` (host: `postgres-726n.railway.internal`) |
| 2026-03-27 | Sprint 2 Debacle QA (Yuri) flags **MG-01 HIGH**: Alembic chain is branched (002 and 003 both descend from 001) — `alembic upgrade head` would fail with "Multiple head revisions" | `agents/yuri/drafts/sprint2-debacle-qa-report.md` lines 104-130 |
| 2026-03-27 06:54 | Commit `9a62e5b` "resolve 4 HIGH-severity bugs" — fixes MG-01 in git. **No prod-DB verification recorded.** | `git log backend/main.py` |
| 2026-03-27 through 2026-04-08 | Sprint 2/3 merges (#9–#32) ship. `/predict` returns a result but does **not** write to DB (LKID-11 lead writes were fire-and-forget, not asserted). Leads table is referenced by `/leads` POST and Clerk webhook — but neither endpoint had meaningful traffic because the site was gated behind Clerk magic-link auth and the form was internal-QA-only. | `git show b0eeb00` commit msg confirms "Removes the LKID-11 fire-and-forget _write_lead() path" was part of LKID-62, meaning before that `/predict` did NOT write prediction rows |
| 2026-04-19 20:22 | Commit `b0eeb00` (PR #35, LKID-62) rewires `/predict` to **synchronously INSERT into `predictions` (JSONB) and return `report_token`**. First code path that hard-depends on a table existing. | `git show b0eeb00` |
| 2026-04-19 Sprint 4 deploy | First real traffic hits rewired `/predict`. Railway logs show `asyncpg.exceptions.UndefinedTableError: relation "predictions" does not exist` → 500s to users. | `railway logs --service kidneyhood-backend` (9 occurrences of UndefinedTable/does-not-exist errors) |
| Full prod traffic volume (retained log window): | **~8 total `POST /predict`** requests ever: 5 × 200 (pre-LKID-62, no DB write attempted), 1 × 200 (post-LKID-62, raced before crash loop), 2 × 500 (UndefinedTable). **1 × `POST /leads` → 200** (legacy path, LKID-11; INSERT likely silently failed or table was missing). | `railway logs --service kidneyhood-backend \| grep POST` |

**Q1 answer — did real traffic hit the old `/predict` → `/leads` write path?** Effectively no. ~8 `POST /predict` and 1 `POST /leads` across the entire retained log window (30d). These are internal/QA volumes, not patient traffic. Any writes that *were* attempted targeted `postgres-726n` (the configured DATABASE_URL) and would have failed against the empty DB — LKID-11 was a fire-and-forget path with no error propagation, so 200-OK responses to the user did not imply persistence. **Zero patient-identifiable data was lost** because zero patient submissions ever happened in the Sprint 2/3 window.

---

## The duplicate `Postgres` service

- Service ID `c544ff17-d7f8-4b3c-81a9-…`, private domain `postgres.railway.internal`, POSTGRES_DB `railway`.
- Created 2026-03-27 **02:59:33 UTC**, 12m19s before `Postgres-726n` at 03:11:52 UTC. Both empty, both PG 18.3, both on their own bind-mount volumes.
- **Not referenced by the backend service.** `kidneyhood-backend` `DATABASE_URL` points exclusively at `postgres-726n.railway.internal`.
- Most likely origin: the Railway "+ Add Postgres" button was clicked twice during the 2026-03-27 infra setup session — either an aborted first attempt, a mis-click, or a parallel provisioning. The `-726n` suffix on the second one is Railway's auto-dedup. Whoever wired DATABASE_URL chose the second instance.
- Harmless but wastes a volume allocation. Deletion is tracked under LKID-69 — do not delete here.

---

## Why QA missed it

Inspecting `agents/yuri/drafts/sprint2-*.md`, `sprint3-*.md`:

1. **Sprint 2 Debacle QA (2026-03-27)** correctly flagged the Alembic branching as HIGH (MG-01). Resolution was verified **in git**, not against prod. Yuri's report explicitly said: *"verify that `alembic upgrade head` applies 001 -> 002 -> 003"* — a step that was never performed against `postgres-726n`.
2. **No QA pass ever ran a live smoke test against the prod URL.** `agents/yuri/drafts/hipaa-verification-notes.md` lines 136-140 contain a `curl` template for `kidneyhood-api-production.up.railway.app/predict` — but it's a plan, not an executed test. The Sprint 2 e2e test plan (`sprint2-e2e-test-plan.md`) is also a plan.
3. **All E2E test runs were MSW-mocked.** `agents/yuri/drafts/qa-headed-*.png`, `qa-predict-*.png`, `qa-results-*.png` are all local dev server runs. No screenshot or log of a live-prod form submission exists in the repo.
4. **Sprint 4 PR #33 (LKID-61 predictions table) QA verdict explicitly deferred live-DB verification:** `sprint4-pr33-pr34-qa-verdicts.md` line 39: *"PASS (offline-SQL verified; live-DB verification deferred to deploy — author flags this in PR body checklist as pending)"*. This is the smoking gun — the very migration that would have caught the empty DB was allowed through with a "verify at deploy time" note, and deploy time verification didn't happen.
5. **No PostHog or equivalent telemetry.** Grepping the repo returns PostHog references only in a Fireflies transcript and in `techspec-new-flow.md` (future work). There is no runtime signal that would have told anyone "zero prediction rows in 3 weeks of shipping."
6. **No `SELECT count(*) FROM leads` check was ever run.** Yuri's HIPAA doc has the query as a checklist item (line 153), but the checklist was never executed against prod.

---

## Root cause hypothesis

**Missing deploy-time migration step, compounded by a silent write path.** The backend image does not run `alembic upgrade head` on boot (no entrypoint script, no Procfile `release:` phase), and the Sprint 2 deploy runbook — `agents/luca/drafts/railway-deployment-checklist.md` — assumed a human would run `railway run alembic upgrade head` manually. That manual step was never performed. Because `/predict` did not hard-depend on any table for the entire Sprint 2/3 window, the missing migrations produced zero user-visible errors until LKID-62 rewired the endpoint.

---

## Proposed guardrails (2–3 options, for Brad's synthesis)

### G1 — Alembic-on-boot via Procfile `release` phase (RECOMMENDED)
- **How:** Add `release: alembic upgrade head` to `backend/Procfile`, or prepend `alembic upgrade head &&` to the start command. Railway runs `release` before the web process is promoted.
- **Catches:** Every future deploy to a DB missing any revision. Fails the deploy loudly if the migration errors.
- **Pros:** Zero human-in-loop, single source of truth is git revision history, works for rollback too. Industry standard (Heroku/Railway convention).
- **Cons:** Risky migrations block deploys (actually a feature — but would have to be paired with a runbook for manual intervention). Long-running migrations can time out the release phase.

### G2 — Deploy-gate smoke test in CI
- **How:** After the Vercel preview deploy AND after prod deploy, GitHub Actions runs a curl-based smoke: `POST /predict` with a fixed test payload, assert 200 + response shape, then `GET /health` and assert `db.connected && migrations.current == head`. Needs a new `/health` to report the current Alembic revision.
- **Catches:** Empty DB, wrong DATABASE_URL, CORS breakage, API contract drift.
- **Pros:** Black-box — catches *any* class of post-deploy regression, not just migrations. Generates a deploy artifact (pass/fail) that shows up in the PR.
- **Cons:** Requires `/health` to expose Alembic state (small code change). Flaky if the backend is still warming up; need retries.

### G3 — Weekly "prod heartbeat" scheduled agent
- **How:** Add a scheduled Claude Code remote agent (alongside the existing sprint-progress sync) that runs `railway run psql $DATABASE_URL -c "SELECT version_num FROM alembic_version; SELECT count(*) FROM leads; SELECT count(*) FROM predictions;"` weekly, compares against expected head, and opens a Jira ticket on mismatch.
- **Catches:** Silent schema drift, unexpected zero-row windows, disconnected DB.
- **Pros:** Cheap, reuses existing infra. Catches things G1/G2 miss (e.g., DATABASE_URL repointed to a different empty DB).
- **Cons:** Alerting lag up to 1 week. Not a deploy gate.

**Recommended stack:** G1 + G2. G1 is prevention; G2 is detection in case G1 is bypassed or misconfigured. G3 is optional belt-and-suspenders.

---

## Open questions for Brad

1. **Do we want G1 (release-phase alembic) gated behind a feature flag** so we can disable it for emergency hotfix deploys, or is "fail-closed" acceptable? (I'd argue fail-closed — but there's a real argument for flag-guarded.)
2. **Who owns the deploy runbook update** — was `railway-deployment-checklist.md` ever communicated to agents as a binding checklist, or was it treated as reference? Need to tighten the SOP around this.
3. **Should the `Postgres` (non-`-726n`) service be deleted now or post-ship?** LKID-69 exists for this — confirm timing. I'd wait until post-Sprint-4 retro to avoid any accidental DATABASE_URL surprise.
4. **Do we backfill the 7 successful `POST /predict` responses that didn't persist?** Probably not — they were internal/QA traffic — but confirm none of those were Lee or any client-facing demo that we owe a record of.
5. **Telemetry scope for post-ship:** PostHog is in the techspec for the new flow — is it a Sprint 4 line item or Sprint 5? If it had been on from day 1, we'd have caught zero-events in the first 48 hours.

---

## Artifacts referenced

- `agents/yuri/drafts/sprint2-debacle-qa-report.md` (MG-01 HIGH finding)
- `agents/yuri/drafts/sprint4-pr33-pr34-qa-verdicts.md` (live-DB verification deferred)
- `agents/yuri/drafts/hipaa-verification-notes.md` (smoke-test template never executed)
- `agents/luca/drafts/railway-deployment-checklist.md` (manual migration step)
- `backend/alembic/versions/` (4 migrations: 001, 002, 003, 004)
- `git show b0eeb00` (LKID-62 rewire of `/predict`)
- Railway CLI: `railway logs --service kidneyhood-backend`, `railway variables --service kidneyhood-backend`, `railway logs --service Postgres`, `railway logs --service Postgres-726n`
