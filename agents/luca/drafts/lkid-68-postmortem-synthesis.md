# LKID-68 Postmortem — Empty Prod Database at Sprint 4 Deploy

**Owner:** Luca (CTO)
**Date:** 2026-04-20
**Status:** Draft for Brad's review — client-shareable pending approval
**Jira:** [LKID-68](https://automationarchitecture.atlassian.net/browse/LKID-68) · related [LKID-69](https://automationarchitecture.atlassian.net/browse/LKID-69)

---

## 1. Incident summary

During the Sprint 4 deploy on 2026-04-20, the first backend request that hard-depended on a database table returned HTTP 500 with `relation "predictions" does not exist`. Investigation showed that prod Postgres had been empty since provisioning on 2026-03-27 — Alembic migrations 001–004 had never been applied. The issue was detected by the team's own pre-launch smoke checks before any patient traffic reached the new flow, remediated within the same session, and permanently fenced by three new guardrails.

## 2. Timeline

- **2026-03-27 02:59 UTC** — Railway `Postgres` service provisioned (service ID `c544ff17…`), empty volume. Later unused; became the orphan later tracked as LKID-69.
- **2026-03-27 03:11 UTC** — Railway `Postgres-726n` service provisioned (service ID `a8af2a61…`), empty volume. Backend `DATABASE_URL` wired to this instance.
- **2026-03-27 06:54 UTC** — Commit `9a62e5b` resolves the Alembic-branching finding (MG-01 HIGH) in git. No live-DB verification recorded.
- **2026-03-27 → 2026-04-08 (Sprints 2–3)** — PRs #9–#32 ship. `/predict` returns successful responses without writing to the DB; the only write path (LKID-11 fire-and-forget leads) has no error propagation. Retained logs show ~8 total `POST /predict` and 1 `POST /leads` across the 30-day window — internal/QA volume only.
- **2026-04-19** — Investigation memo completed (`lkid-68-empty-db-investigation.md`); guardrails proposed.
- **2026-04-20 07:04 UTC** — PR #33 (`587225a`) merges the predictions-table migration (LKID-61).
- **2026-04-20 07:51 UTC** — PR #35 (`a8abcf1`) merges LKID-62, rewiring `/predict` to synchronously `INSERT` into `predictions`. First code path that hard-depends on a table existing.
- **2026-04-20 (Sprint 4 deploy)** — Post-deploy smoke fails on `POST /predict` with `asyncpg.exceptions.UndefinedTableError`. Logs show 2 × 500s. No patient traffic.
- **2026-04-20 (same session)** — Ad-hoc remediation: `railway ssh` → `alembic upgrade head` applies 001–004 to `Postgres-726n`. Smoke returns 200.
- **2026-04-20 09:58 UTC** — PR #39 (`00e3fad`) merges **G1**: `preDeployCommand = "alembic upgrade head"` in `backend/railway.toml`.
- **2026-04-20 12:11 UTC** — PR #44 (`e4c5845`) merges **G2**: GitHub Actions post-deploy prod smoke workflow.
- **2026-04-20 12:17 UTC** — PR #46 (`2b10734`) merges **G3**: scheduled heartbeat running the smoke workflow every 6 hours.

## 3. Root cause

The backend had no automated migration step at deploy time. The Sprint 2 deploy runbook (`agents/luca/drafts/railway-deployment-checklist.md`) assumed a human would execute `railway run alembic upgrade head` against prod; that manual step was never performed. The omission remained invisible for three sprints because `/predict` did not hard-depend on any table until LKID-62 rewired it to write predictions. The very first request that exercised a real table hit an entirely unmigrated database and failed loudly.

## 4. Contributing factors

- **Runbook-as-prose, not runbook-as-code.** Deploy-time migration was documented as a step in a checklist rather than encoded in `Procfile`/`railway.toml`, so it could be forgotten without any warning.
- **Silent write path through Sprints 2–3.** The LKID-11 leads write was fire-and-forget with no error surface, so a failed `INSERT` produced a 200-OK response to callers. There was no monitor for "zero rows persisted in N days."
- **QA gates verified in git, not in prod.** The Sprint 2 Alembic-branching finding (MG-01 HIGH) was closed on the basis of a git-level fix; the Sprint 4 PR #33 verdict explicitly deferred live-DB verification with the phrase *"live-DB verification deferred to deploy"* (`sprint4-pr33-pr34-qa-verdicts.md` line 39). Neither gate required an executed smoke against the prod URL.
- **All E2E runs were MSW-mocked.** No QA artifact in the repo records a live-prod form submission.
- **No runtime telemetry.** PostHog is in the forward-looking techspec but was not instrumented. A "zero events in 72 hours" alert would have flagged the condition in Sprint 2.
- **Pre-launch traffic masked the defect.** Internal/QA volume (~8 `POST /predict` over 30 days) gave no statistical signal that writes weren't landing.

## 5. Customer impact

**None.** The site was pre-launch throughout Sprints 2 and 3 — no patient-facing launch announcement had gone out, and the form was gated behind Clerk magic-link auth reserved for internal QA. Retained Railway logs over the full 30-day window show ~8 `POST /predict` and 1 `POST /leads` requests — internal and QA volume only, no patient submissions. The Sprint 4 deploy's two 500s were observed during the team's own post-deploy smoke, not by any end user. Zero patient-identifiable data was lost because zero patient submissions were ever made during the affected window.

## 6. Remediation applied

- **2026-04-20 (same deploy session)** — Manual `alembic upgrade head` against `Postgres-726n` applied migrations 001–004. Post-migration smoke returned 200 on `POST /predict`, `GET /results/[token]`, and `POST /leads`.
- **PR #39 — G1** (merged 2026-04-20) — Added `preDeployCommand = "alembic upgrade head"` to `backend/railway.toml`, making migrations a fail-closed step in every future Railway deploy.
- **PR #44 — G2** (merged 2026-04-20) — GitHub Actions `post-deploy-smoke.yml` runs a black-box smoke test against prod after every deploy.
- **PR #46 — G3** (merged 2026-04-20) — Scheduled cron invocation of the smoke workflow every 6 hours, catching drift that occurs between deploys.

## 7. Preventive measures

| Guardrail | What it catches | Limitation |
|---|---|---|
| **G1 — `preDeployCommand` auto-migration** (PR #39) | Any deploy landing against a DB that is behind `head`. Fails the deploy loudly if a migration errors, before the web process is promoted. | Cannot catch drift caused by `DATABASE_URL` being repointed to a different empty DB, or by manual schema edits made out-of-band. |
| **G2 — Post-deploy smoke in CI** (PR #44) | Empty DB, wrong `DATABASE_URL`, CORS breakage, API contract regressions — anything visible to a black-box caller hitting the live URL immediately after deploy. | Cannot catch slow-burn regressions that appear hours or days after deploy (timezone bugs, scheduled-job failures, data-volume-dependent queries). |
| **G3 — Scheduled 6-hour heartbeat** (PR #46) | Silent post-deploy drift — certificate expiry, DB pool exhaustion, DNS changes, `DATABASE_URL` repointed to an empty DB. | Alerting lag of up to 6 hours; not a deploy gate. Does not exercise the full write path end-to-end unless the smoke is extended to do so. |

The three layers compose: G1 prevents the Sprint-4-style root cause, G2 catches it immediately if G1 is bypassed or misconfigured, and G3 catches drift that appears after a successful deploy.

## 8. Action items

All 5 Brad-gated items resolved 2026-04-20.

| # | Item | Owner | Status | Resolution |
|---|---|---|---|---|
| AI-1 | Decide deletion timing for orphan `Postgres` service (LKID-69). | Brad | **Resolved** 2026-04-20 | **Delete now.** Pre-delete verification dispatched (`agents/luca/drafts/lkid-69-predelete-verification.md`); actual delete on Brad greenlight after memo. |
| AI-2 | Backfill the ~8 successful `POST /predict` responses from Sprints 2–3 that did not persist. | Brad | **Resolved** 2026-04-20 | **No backfill.** Confirmed as internal/QA traffic; no client-facing demo is owed a record. Closed. |
| AI-3 | PostHog instrumentation — Sprint 4 line item or Sprint 5? | Brad | **Resolved** 2026-04-20 | Shipped in Sprint 5 as LKID-71 (PR #56, merged 2026-04-20). "Zero events in N hours" alert is a Sprint 5+ follow-up. |
| AI-4 | Tighten deploy-runbook governance — mark `railway-deployment-checklist.md` binding and add runbook-delta review to Development Phase SOP. | Brad | **Resolved** 2026-04-20 | **Approved.** `docs/development-phase-engineering-sop.md` updated; `railway-deployment-checklist.md` now classified "binding." |
| AI-5 | G1 feature-flag policy — `preDeployCommand` fail-closed permanent vs. bypassable for hotfix? | Brad | **Resolved** 2026-04-20 | **Fail-closed permanent.** No bypass. Emergency hotfixes still run migrations. Policy documented in the SOP. |
| AI-6 | Extend G2 smoke to exercise `POST /predict` + `GET /results/[token]` round-trip (currently health-only if kept minimal). | Luca | Open | None — scheduled for Sprint 5 |
| AI-7 | Add `SELECT version_num FROM alembic_version` to G3 heartbeat output to lock revision against git `head`. | Luca | Open | None — scheduled for Sprint 5 |

## 9. Lessons learned

- **Encode runbook steps in configuration, not prose.** Any step a human has to remember will eventually be forgotten. `preDeployCommand` turns what was a checklist item into a fail-closed invariant.
- **QA verification has to touch the production surface at least once.** Test pyramid coverage in git gives no signal about whether migrations ran in prod. A single live-URL smoke per deploy closes this gap.
- **Silent write paths are worse than loud failures.** The LKID-11 fire-and-forget pattern let a 30-day outage look like healthy traffic. Writes that matter should surface errors; writes that are truly fire-and-forget should be counted by runtime telemetry.

## 10. Appendix

### Referenced documents

- Investigation memo — `agents/luca/drafts/lkid-68-empty-db-investigation.md`
- Sprint 4 QA verdicts (PR #33, #34) — `agents/yuri/drafts/sprint4-pr33-pr34-qa-verdicts.md`
- Sprint 2 Debacle QA report (MG-01 HIGH) — `agents/yuri/drafts/sprint2-debacle-qa-report.md`
- HIPAA verification notes (smoke-test template) — `agents/yuri/drafts/hipaa-verification-notes.md`
- Railway deployment checklist — `agents/luca/drafts/railway-deployment-checklist.md`

### Relevant PRs

- [PR #33](https://github.com/Automation-Architecture/LKID/pull/33) — LKID-61 predictions table migration (`587225a`)
- [PR #35](https://github.com/Automation-Architecture/LKID/pull/35) — LKID-62 `/predict` rewire (`a8abcf1`) — the trigger commit
- [PR #39](https://github.com/Automation-Architecture/LKID/pull/39) — G1: `preDeployCommand` auto-migration (`00e3fad`)
- [PR #44](https://github.com/Automation-Architecture/LKID/pull/44) — G2: post-deploy smoke workflow (`e4c5845`)
- [PR #46](https://github.com/Automation-Architecture/LKID/pull/46) — G3: scheduled heartbeat (`2b10734`)

### Jira

- [LKID-68](https://automationarchitecture.atlassian.net/browse/LKID-68) — Postmortem (this document)
- [LKID-69](https://automationarchitecture.atlassian.net/browse/LKID-69) — Orphan Postgres service cleanup

---

*Luca — 2026-04-20 — draft for Brad's review*
