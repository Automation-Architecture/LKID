# Sprint 4 Retrospective — No-Auth Tokenized Flow

**Dates:** 2026-04-19 → 2026-04-20 (≈24 hours, autonomous orchestrator run)
**Original ship target:** May 3, 2026 (2-week sprint)
**Actual ship:** April 20, 2026 — **13 days ahead of target**
**Prepared by:** Husser

---

## What shipped

### Engineering tickets

All 7 engineering cards closed. LKID-68 + LKID-69 carry residual items gated on Brad's hands (postmortem answers, deletion approval).

| Card | Title | Owner | PR | Status |
|---|---|---|---|---|
| LKID-61 | DB: predictions table + report_token | Gay Mark | #33 | Done |
| LKID-62 | Backend: tokenized endpoints | John | #35 | Done |
| LKID-63 | Frontend: new funnel + Clerk migration | Harshit + Inga | #37 | Done |
| LKID-64 | Resend email template (no-link, PDF attached) | John + Inga | #34 | Done |
| LKID-65 | QA: E2E + a11y tests updated | Yuri | #40 | Done |
| LKID-66 | Delete legacy `/predict` `/auth` `/results` pages | Harshit | #47 | Done |
| LKID-67 | Chart a11y (text + SVG colors) | Harshit + Inga | #48, #49, #50 | Done |
| LKID-70 | Regenerate `db_schema.sql` from migrations | Gay Mark | #43 | Done |
| LKID-68 | Empty-DB postmortem | Luca | investigation + synthesis drafted | 2 of 4 AC met; Brad owes answers to 5 open questions |
| LKID-69 | Dup Postgres cleanup | John | investigation complete | Brad-gated (explicit delete approval) |
| LKID-47 | Klaviyo Flow + bun_tier | John | #52 | Code shipped; Klaviyo dashboard Flow config still Brad's hands |

### Hotfix + infrastructure PRs

14 additional PRs merged in support of the sprint:

- **#36** — orchestrator workspace: new landing page + techspec + QA verdicts
- **#38** — backend IS-01: `inputs` field in `GET /results/[token]` (unblocked structural-floor callout for BUN>17)
- **#39** — infra: Railway `preDeployCommand` + `psycopg2-binary` (G1 guardrail — prevents future migration-skip incidents)
- **#42** — P0 hotfix: Clerk proxy adds `/labs` + `/gate(.*)` to public-route matcher (funnel was 404'ing post-merge)
- **#44** — G2 guardrail: GitHub Actions post-deploy smoke workflow
- **#45** — post-sprint housekeeping: `.gitignore` + sprint artifacts committed
- **#46** — G3 guardrail: 6-hour scheduled heartbeat extension of the smoke workflow
- **#48/#49/#50** — LKID-67 a11y color work (Harshit text + Inga SVG + exclusion drop)
- **#51** — Brad-action setup guide + `docs/client-comms/` gitignored
- **#52** — bun_tier backend code (governance catch: closed a gap where prod was ahead of git)

**Total PRs merged this sprint:** 18.

### Production milestones

- No-auth tokenized funnel live: Landing → `/labs` → `/gate/[token]` → `/results/[token]` → PDF.
- `POST /predict` (no auth, returns `report_token`), `GET /results/[token]`, `POST /leads`, `GET /reports/[token]/pdf` — all live on Railway.
- Clerk scoped to `/client/[slug]` dashboard only; removed from patient funnel.
- Resend transactional email wired and delivered live test email (stopgap FROM `reports@automationarchitecture.ai` until `kidneyhood.org` DNS verifies).
- Klaviyo "Prediction Completed" event fires with `eGFR_value`, `confidence_tier`, `bun_tier`, `report_url`, profile upsert, idempotency via `unique_id`.
- Chart meets WCAG 2 AA end-to-end (HTML text + SVG internals); `.exclude("svg")` guard dropped.
- 6/6 E2E + 5/5 a11y + 24 backend endpoint tests passing on main.
- G1 (preDeployCommand), G2 (post-deploy smoke), G3 (6-hour heartbeat) all active; first G3 scheduled run at 07:53 UTC passed.

---

## Incidents

### Incident 1 — Prod DB was completely empty (caught 2026-04-20)

Post-LKID-62 deploy's `POST /predict` returned 500. Investigation showed `Postgres-726n` had zero tables — migrations 001 through 004 had never run in prod. Sprints 2 and 3 had shipped with the feature but nobody noticed because real traffic volume was near-zero pre-launch (~8 lifetime `POST /predict` calls across the retained log window).

**Resolution window:** ~20 minutes. Applied migrations 001–004 live via `railway ssh` + ephemeral `psycopg2-binary`. Re-smoke green.

**Root cause** (per `agents/luca/drafts/lkid-68-empty-db-investigation.md`): no deploy-time `alembic upgrade head` hook, plus PR #33 QA verdict explicitly deferred live-DB migration verification "to deploy."

**Guardrails shipped (G1/G2/G3):**
- **G1** — `preDeployCommand = ["alembic upgrade head"]` in `backend/railway.toml` so every deploy auto-migrates. `psycopg2-binary` added because Alembic's `env.py` is sync while the app uses `asyncpg`.
- **G2** — GitHub Actions workflow runs full prod smoke (predict → results → leads → PDF) on every push to main. Verified green across 4 push-triggered runs today.
- **G3** — same workflow on a 6-hour cron, catches silent regressions between deploys (env drift, container restart, DNS propagation, expired keys).

### Incident 2 — Landing CTAs 404 (caught 2026-04-20, post-merge)

After PR #37 merged, prod smoke found `/labs` and `/gate/*` were 404'd. Root cause: `app/src/proxy.ts` (Next.js 16's middleware replacement) only listed old routes (`/predict(.*)`, `/auth(.*)`) in `isPublicRoute`. Harshit's PR #37 didn't add the new routes, and MSW-mocked E2E tests didn't exercise real Clerk middleware.

**Resolution window:** ~15 minutes. PR #42 hotfix added `/labs(.*)` + `/gate(.*)` to public-routes matcher.

### Incident 3 — PDF endpoint 504 (caught 2026-04-20, post-merge)

`GET /reports/{token}/pdf` timed out at ~33s. Investigation showed Vercel had `NEXT_PUBLIC_PDF_SECRET` set but not `PDF_SECRET` (server-only). `/internal/chart/[token]/page.tsx` reads `process.env.PDF_SECRET`, which was undefined, so it returned 404, so Playwright waited 30s for `#pdf-ready`, then timed out.

**Resolution window:** ~15 minutes. Copied value into new `PDF_SECRET` env var on Vercel and redeployed.

### Incident 4 — Chart a11y contrast (caught 2026-04-20 by LKID-65 test)

Yuri's updated axe suite surfaced pre-existing Sprint 3 WCAG AA contrast failures in chart stat cards and SVG fills (contrast ratios 2.0–4.0:1 where AA requires 4.5:1). Scope split: Harshit re-tokened HTML text; Inga re-tokened SVG trajectory + label colors (3 PRs total). Post-fix: full chart (including SVG) audits clean; `.exclude("svg")` guard removed.

---

## What went well

- **One-day sprint delivery.** Originally planned as a 2-week effort; autonomous orchestration delivered all engineering work in ~24 hours.
- **18 PRs merged without manual QA regressions.** Yuri ran structured reviews (initial + re-verify) on every code-changing PR. One HIGH finding (Playwright timeout mis-catch) and three MEDIUMs (token logging, Resend base64, Klaviyo independent fire) caught during QA before merge.
- **Guardrails emerged from the incident, not from a checklist.** G1/G2/G3 were born directly from the empty-DB incident. Much stronger than a pre-written checklist would have been.
- **Ops agents with clear secret-handling rules.** The Resend/Klaviyo setup agents moved real API keys onto Railway without ever echoing them — the new global `Dispatch Ops Autonomously` rule in `~/.claude/CLAUDE.md` pulled weight.
- **Copilot + CodeRabbit caught things Yuri might have missed.** Copilot's MED-03 on PR #35 (Resend base64 attachment) saved a 4-5× payload bloat.

---

## What didn't go well

- **PR #33 QA deferred migration verification "to deploy."** This is the smoking-gun line. Explicit deferral of a DB concern to ops time meant nobody verified migrations had actually run in prod. New QA rule: any card that touches DB schema MUST include a prod-DB verification step in the QA verdict, not just "migration file renders valid SQL."
- **MSW-mocked tests missed real-middleware issues twice** (proxy 404 on `/labs`, Vercel env var split on `/internal/chart`). MSW is fine for unit-style tests but can't substitute for a real prod smoke. Hence G2/G3.
- **Chart contrast was a pre-existing Sprint 3 issue surfaced by Sprint 4.** Sprint 3 a11y tests at `/results` used sessionStorage indirection that never rendered the chart, so axe never audited it. Lesson: a11y tests need to exercise the actual rendered state, not just the route.
- **Uncommitted-but-deployed code** (the bun_tier work). The John agent's usage limit hit mid-task; a later `railway up` pushed the working-tree state to prod without git history catching up. Closed retroactively via PR #52, but the gap existed for ~2 hours. Worth a norm: agents that intend to ship must commit + push before returning.
- **Two Postgres services in Railway** (`Postgres` + `Postgres-726n`) — provisioning double-click that nobody noticed for weeks. Caught during ops smoke. LKID-69 tracks cleanup.

---

## Lessons learned

1. **Deploy-time verification beats deploy-time assumptions.** "The migration file looks right" is not the same as "the migration has run." Bake `alembic upgrade head` into the deploy, not the QA hope.
2. **Server-side env vars need server-side names.** `NEXT_PUBLIC_*` is a client-bundle convention; server components can read it but shouldn't treat it as a trusted secret. When coding server components, explicitly read a non-public var.
3. **The 6-hour heartbeat is worth its weight.** Env drift between deploys is silent; cron-based smoke makes it loud.
4. **"Keep looping" + autonomous-ops rule produces outsized throughput.** Brad's standing instruction to dispatch ops autonomously cut round-trip time by >50% for this sprint.
5. **Copilot is a useful redundant reviewer.** Don't skip waiting for its review just because Yuri is green.

---

## Follow-ups (carried into Sprint 5 planning)

| Item | Type | Owner | Notes |
|---|---|---|---|
| `kidneyhood.org` DNS records → flip Resend FROM | Ops | Brad | Records delivered in chat 2026-04-20; needs DNS registrar edit |
| Klaviyo Flow dashboard configuration | Ops | Brad | Section 2c of `agents/luca/drafts/brad-action-setup-guide.md` |
| LKID-68 postmortem — answer 5 open questions | Product | Brad | See `agents/luca/drafts/lkid-68-postmortem-synthesis.md` §8 |
| LKID-69 dup Postgres deletion | Ops | Brad | Card AC requires explicit deletion approval |
| Lee sign-off on chart palette (LKID-67 soft AC) | Comms | Brad | Email draft in setup guide §3a |
| PostHog / analytics integration | Feature | TBD | Proposed for Sprint 5 — see `agents/luca/drafts/sprint-5-proposal.md` |

---

## Team recognition

- **Gay Mark** (DB): LKID-61 + LKID-70, clean migration + schema snapshot regen, clean Alembic discipline under pressure
- **John Donaldson** (Backend): LKID-62 + LKID-64 + multi-round fixes, closed 1 HIGH + 3 MED findings same-day
- **Harshit** (Frontend): LKID-63 (4 new routes + Clerk migration + transitional layouts) + LKID-66 + LKID-67 text half
- **Inga** (Design): LKID-67 SVG palette — option B-revised (emerald/sky/amber/charcoal) with colorblind-safety reasoning
- **Yuri** (QA): 6 rounds of structured QA verdicts, caught HIGH Playwright-timeout bug, caught stat-card contrast regression
- **Luca** (CTO): investigation memo + postmortem synthesis + techspec + 3 guardrails
- **Husser** (PM): Jira card creation, board transitions, this retrospective
