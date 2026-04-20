# Agent Teams Project

## KidneyHood App

**Goal:** Lead gen web app — patients enter kidney health lab values, view an eGFR trajectory chart, download PDF. Email captured for warm campaign.
**Tech Stack:** Next.js 16 (Vercel) + FastAPI (Railway) + PostgreSQL (Railway) + Clerk v7 (auth) + Playwright (PDF)
**Jira:** [SPEC Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/SPEC/boards/329/backlog) | [LKID Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/LKID/boards/363)
**Repo:** [github.com/Automation-Architecture/LKID](https://github.com/Automation-Architecture/LKID)
**Specs:** `/Users/brad/IDE/kidneyhood/` (3 docx files)
**Status:** Sprint 4 COMPLETE (shipped Apr 20 — 13 days ahead of plan). 7 engineering cards Done + LKID-47 backend code shipped. PRs #33–#52 merged. App live at kidneyhood-automation-architecture.vercel.app with no-auth tokenized flow (`/labs` → `/gate/[token]` → `/results/[token]`). G1/G2/G3 guardrails active.
**Client Dashboard:** https://kidneyhood-automation-architecture.vercel.app/client/lee-a3f8b2 — auto-updated by `scripts/refresh-sprint-progress.py`.

## Sprint Plan

| Sprint | Dates | Cards | Focus |
|--------|-------|-------|-------|
| Sprint 1 — Design Sprint | Mar 20 – Mar 26 (DONE) | 9 (LKID-30–38) | Hi-fi mockup + prototype, Inga sign-off |
| Sprint 2 — Core Flow | Mar 26 – Apr 2 (DONE) | 17 (LKID-1–3, 6–19) | Auth, DB, API, form, chart — e2e prediction |
| Sprint 3 — PDF, Polish & QA | Mar 30 – Apr 9 (DONE) | 12 (LKID-4–5, 20–29) | Interactivity, PDF, disclaimers, tests, QA gate |
| Sprint 4 — No-Auth Tokenized Flow | Apr 19 – Apr 20 (DONE) | 7 engineering cards + follow-ups (LKID-61–70) | Replace Clerk-gated flow with `/labs` → `/gate/[token]` → `/results/[token]` + Resend + Klaviyo. Shipped 13 days ahead of plan. |

**Ship date:** April 9, 2026 (Sprint 3). **Sprint 4 shipped:** April 20, 2026.
**Retrospective:** `agents/husser/drafts/sprint4-retrospective.md` — 18 PRs merged, G1/G2/G3 guardrails added, 4 incidents resolved.
**Sprint 5 proposal:** `agents/luca/drafts/sprint-5-proposal.md` — 3 theme candidates (Launch Readiness recommended), awaiting Brad sign-off.
**Brad-hands backlog:** `agents/luca/drafts/brad-action-setup-guide.md` covers Resend DNS, Klaviyo Flow, LKID-68 Q&A, LKID-69 deletion approval, Lee sign-off.

## What's Next

### Sprint 5 — Scope pending

See `agents/luca/drafts/sprint-5-proposal.md` for 3 theme candidates:
- **Theme A — Launch Readiness** (recommended): PostHog analytics, Sentry error monitoring, SEO basics, CSP headers, Lee dashboard v2
- **Theme B — Observability**: measurement + alerting foundation before further features
- **Theme C — Content & Brand**: Inga polish pass on every user-facing surface

Awaiting Brad's theme pick + answers to 5 open questions (launch timing, analytics provider, error-monitoring provider, Lee dashboard scope, HIPAA posture). Husser creates cards after selection.

### Sprint 4 — No-Auth Tokenized Flow (DONE — shipped Apr 20, 2026)

**Shipped 13 days ahead of plan** in a single autonomous orchestrator run. 18 PRs merged, 7 engineering cards Done, LKID-47 backend code shipped, 3 guardrails added (G1 preDeploy migrations, G2 CI post-deploy smoke, G3 6-hour heartbeat).

**Full retro:** `agents/husser/drafts/sprint4-retrospective.md`.

#### Sprint 4 Cards (as shipped)

| Card | Title | Owner | Status | PR(s) |
|------|-------|-------|--------|-------|
| [LKID-61](https://automationarchitecture.atlassian.net/browse/LKID-61) | DB: predictions table + report_token | Gay Mark | Done | #33 |
| [LKID-62](https://automationarchitecture.atlassian.net/browse/LKID-62) | Backend: tokenized endpoints | John Donaldson | Done | #35 |
| [LKID-63](https://automationarchitecture.atlassian.net/browse/LKID-63) | Frontend: new funnel + Clerk migration | Harshit + Inga | Done | #37 |
| [LKID-64](https://automationarchitecture.atlassian.net/browse/LKID-64) | Resend transactional email template | John + Inga | Done | #34 |
| [LKID-65](https://automationarchitecture.atlassian.net/browse/LKID-65) | QA: E2E + a11y tests updated | Yuri | Done | #40 |
| [LKID-66](https://automationarchitecture.atlassian.net/browse/LKID-66) | Delete legacy /predict /auth /results | Harshit | Done | #47 |
| [LKID-67](https://automationarchitecture.atlassian.net/browse/LKID-67) | Chart WCAG AA contrast (text + SVG) | Harshit + Inga | Done | #48 #49 #50 |
| [LKID-70](https://automationarchitecture.atlassian.net/browse/LKID-70) | Regen db_schema.sql from migrations | Gay Mark | Done | #43 |
| [LKID-47](https://automationarchitecture.atlassian.net/browse/LKID-47) | Klaviyo Flow + bun_tier | John | Code Done (#52); Flow config Brad-gated | #52 |
| [LKID-68](https://automationarchitecture.atlassian.net/browse/LKID-68) | Empty-DB postmortem | Luca | 2/4 AC met; 5 open Qs for Brad | — |
| [LKID-69](https://automationarchitecture.atlassian.net/browse/LKID-69) | Dup Postgres cleanup | John | Investigation done; deletion Brad-gated | — |

**Infrastructure PRs (support):** #36 (chore — landing redesign + techspec), #38 (IS-01 inputs field), #39 (G1 preDeploy), #42 (P0 proxy hotfix), #44 (G2 smoke), #45 (housekeeping), #46 (G3 heartbeat), #51 (Brad setup guide + gitignore).

#### Brad-hands backlog

See `agents/luca/drafts/brad-action-setup-guide.md` for step-by-step:
1. DNS records for `kidneyhood.org` → flip Resend FROM email
2. Klaviyo Flow dashboard configuration (profile props + event schema + warm campaign)
3. LKID-68 postmortem — answer 5 open questions in `lkid-68-postmortem-synthesis.md` §8
4. LKID-69 deletion approval for the duplicate Postgres service
5. Lee sign-off on chart palette + optional postmortem share

### Sprint 3 Retrospective (Done)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Re-label LKID-20–29 from `sprint:2` → `sprint:3` in Jira | Husser | Done |
| 2 | Close Sprint 2 (ID 128) in Jira | Husser | Done |
| 3 | Update epics LKID-2 and LKID-3 to Done (child stories complete) | Husser | Done |
| 4 | Lee escalation: follow-up email Mar 28, Luca escalates Mar 30, fallback decision Mar 30 | Luca | Done — Lee responded Mar 30 |

### Sprint 3 Cards (Mar 30 – Apr 9)

| Card | Title | Owner | Dependency |
|------|-------|-------|------------|
| LKID-19 | Visx eGFR trajectory chart | Harshit | **MERGED — PR #23** |
| LKID-5 | Medical disclaimers (verbatim, all viewports) | Harshit + Inga | **MERGED — PR #22** |
| LKID-14 | Rules engine v2.0 + Lee confirmations | John Donaldson | **MERGED — PRs #25, #26** |
| LKID-25 | Rate limiting (API endpoints) | John Donaldson | **MERGED — PR #25** |
| LKID-27 | Boundary tests + golden files | Yuri + Gay Mark | **MERGED — PR #24** |
| — | BUN structural floor callout (Q3) | Harshit + John | **MERGED — PR #27** |
| LKID-49 | Visx QA pairing (deferred from Sprint 2) | Yuri | **DONE — closed Apr 8** |
| LKID-4 | PDF export (Playwright rendering) | Harshit + John | **MERGED — PR #29** |
| LKID-20–29 | Polish, tests, QA gate (10 cards) | Various | **DONE — all merged Apr 8** |
| LKID-59 | Engine Phase 1 formula rewrite (0.31-coefficient model) | John Donaldson | **MERGED — PR #28** |
| LKID-47 | Klaviyo lead capture | John Donaldson | **Blocked — needs planning sprint** |
| LKID-60 | Clerk v7 proxy for Next.js 16 | Harshit | **MERGED — PR #32** |

### Lee's Responses (2026-03-30) — All 6 Questions Answered

Full responses at `agents/luca/drafts/lee-q1-q6-responses.md`. Summary:
- Q1: Use v2.0 formulas — **golden vectors received 2026-04-02** (see `agents/luca/drafts/lee-golden-vectors-v2.md`)
- Q2: CKD-stage rates OK for marketing app
- Q3: Both suppression estimate AND structural floor (BUN > 17)
- Q4: Dialysis threshold = eGFR 12 confirmed
- Q5: Age attenuation — implemented (two lines)
- Q6: Creatinine max 20.0 confirmed
- Bonus: Path 4 post-decline rate → -0.33 (pilot data n=28)

**Still waiting on Lee:** Klaviyo API key (LKID-47). Treatment decline rates for Stages 3a, 3b, 5 (Lee's vectors only cover Stage 4 — uses -2.0/yr vs engine's -3.0/yr for that stage).

### Post-Ship (after April 9 retro)

| # | Task | Owner |
|---|------|-------|
| 1 | Full document restructure into `docs/governance/`, `docs/technical/`, `docs/clinical/`, `docs/reports/`, `docs/specs/`, `docs/reference/` | Husser + Luca |
| 2 | Create Jira card to track restructure (prevents indefinite deferral) | Husser |

See `active/chatroom/chatroom_report.md` for the full decision rationale.

### Done (Sprint 2 Close)

- 11 PRs merged (#9–#21). Jira board swept and aligned.
- 4 HIGH-severity post-merge bugs found and fixed (`agents/yuri/drafts/sprint2-debacle-qa-report.md`).
- 3 Vercel build blockers fixed (Playwright tsconfig, Clerk v7 types, middleware). Clerk middleware disabled temporarily — full migration needed in Sprint 3.
- Client dashboard live and auto-updating for Lee.
- Remediation cards LKID-48–58: 10/11 complete. Only LKID-49 deferred with chart.

## Automated Processes

- **Sprint progress sync:** Scheduled remote agent runs every 6 hours (trigger ID: `trig_017nHqTJu4Y3tTstg3UtTwb1`). Uses Atlassian MCP to pull Jira statuses, updates `sprint-progress.json` in both locations, commits+pushes to trigger Vercel rebuild. Manage at https://claude.ai/code/scheduled/trig_017nHqTJu4Y3tTstg3UtTwb1. Fallback script: `scripts/refresh-sprint-progress.py` (requires `.env` with `JIRA_EMAIL`, `JIRA_API_TOKEN`, `VERCEL_DEPLOY_HOOK_URL`).
- **Husser board sweep:** Scheduled remote agent runs daily at 8am ET (trigger ID: `trig_01VZxLyxxsNXe8AqswJkev2M`). Checks card-to-PR alignment, stale PRs, blocker detection, QA pipeline readiness. Manage at https://claude.ai/code/scheduled.

## Development Workflow

CTO (Luca) opens one PR per Jira card. Each card gets a feature branch (`feat/LKID-{number}-{description}`). Copilot is added as reviewer on every PR. Agents implement on their branches. PRs merge to `main` when approved.

### PR Review & Merge Cycle

1. Push branch → open PR via `gh pr create`
2. Poll reviews (~60s): `gh api repos/Automation-Architecture/LKID/pulls/{N}/reviews` + `/comments`
3. Both **Copilot** and **CodeRabbit** auto-review — address all actionable findings
4. Dispatch engineer agent to fix review findings on the correct branch
5. Yuri QA pass — verdict must be PASS before merge
6. Merge via `gh pr merge {N} --squash`
7. If next PR has overlap, rebase onto updated main before merging

### Merge Order Protocol (from Sprint 2 postmortem)

- Merge in dependency order: lowest-risk/no-overlap first, highest-risk last
- Rebase between each merge when branches share files
- See `agents/luca/drafts/sprint3-commit-strategy.md` for the template

### Sprint 1 PRs (Design Sprint)

| PR | Branch | Card | Owner |
|----|--------|------|-------|
| [#1](https://github.com/Automation-Architecture/LKID/pull/1) | `feat/LKID-31-revise-user-flows` | LKID-31 | Inga |
| [#2](https://github.com/Automation-Architecture/LKID/pull/2) | `feat/LKID-32-revise-wireframes` | LKID-32 | Inga |
| [#3](https://github.com/Automation-Architecture/LKID/pull/3) | `feat/LKID-33-revise-component-specs` | LKID-33 | Inga + Harshit |
| [#4](https://github.com/Automation-Architecture/LKID/pull/4) | `feat/LKID-34-scaffold-prototype` | LKID-34 | Harshit |
| [#5](https://github.com/Automation-Architecture/LKID/pull/5) | `feat/LKID-35-build-prototype-screens` | LKID-35 | Harshit + Inga |
| [#6](https://github.com/Automation-Architecture/LKID/pull/6) | `feat/LKID-36-form-validation-msw` | LKID-36 | Harshit |
| [#7](https://github.com/Automation-Architecture/LKID/pull/7) | `feat/LKID-37-accessibility-baseline` | LKID-37 | Harshit + Inga |
| [#8](https://github.com/Automation-Architecture/LKID/pull/8) | `feat/LKID-38-design-sign-off` | LKID-38 | Inga (gate) |

### Sprint 2 PRs (Core Flow)

| PR | Branch | Card | Owner | Status |
|----|--------|------|-------|--------|
| [#9](https://github.com/Automation-Architecture/LKID/pull/9) | `feat/LKID-40-client-dashboard` | LKID-40 | Harshit + Inga | Merged |
| [#10](https://github.com/Automation-Architecture/LKID/pull/10) | `feat/LKID-7-db-migration` | LKID-7 | Gay Mark | Merged |
| [#11](https://github.com/Automation-Architecture/LKID/pull/11) | `feat/LKID-8-fastapi-scaffold` | LKID-8 | John Donaldson | Merged |
| [#12](https://github.com/Automation-Architecture/LKID/pull/12) | `feat/LKID-1-clerk-auth` | LKID-1, 6, 8 | Harshit | Merged |
| [#13](https://github.com/Automation-Architecture/LKID/pull/13) | `feat/LKID-15-post-predict` | LKID-15 | John Donaldson | Merged |
| [#14](https://github.com/Automation-Architecture/LKID/pull/14) | `feat/LKID-16-prediction-form` | LKID-16 | Harshit | Merged |
| [#15](https://github.com/Automation-Architecture/LKID/pull/15) | `feat/LKID-11-leads-write` | LKID-11 | John Donaldson | Merged |
| [#16](https://github.com/Automation-Architecture/LKID/pull/16) | `feat/LKID-56-test-fixtures` | LKID-55, 56, 57 | Gay Mark | Merged |
| [#17](https://github.com/Automation-Architecture/LKID/pull/17) | `feat/LKID-58-test-data-gen` | LKID-48, 50, 58 | Gay Mark | Merged |
| [#18](https://github.com/Automation-Architecture/LKID/pull/18) | `feat/LKID-9-clerk-webhook` | LKID-9 | John + Gay Mark | Merged |
| [#20](https://github.com/Automation-Architecture/LKID/pull/20) | `feat/LKID-creatinine-max-migration` | — | Gay Mark | Merged |
| [#21](https://github.com/Automation-Architecture/LKID/pull/21) | `feat/LKID-7-17-18-v2` | LKID-7, 17, 18 | Harshit | Merged |
| — | — | LKID-14 | John Donaldson | Blocked (Lee) |
| — | — | LKID-47 | John Donaldson | Blocked (Lee) |
| — | — | LKID-19 | Harshit | Deferred to Sprint 3 |

### Sprint 3 PRs (Polish & QA)

| PR | Branch | Card | Owner | Status |
|----|--------|------|-------|--------|
| [#22](https://github.com/Automation-Architecture/LKID/pull/22) | `feat/LKID-5-disclaimers` | LKID-5 | Harshit + Inga | Merged |
| [#23](https://github.com/Automation-Architecture/LKID/pull/23) | `feat/LKID-19-visx-chart` | LKID-19 | Harshit | Merged |
| [#24](https://github.com/Automation-Architecture/LKID/pull/24) | `feat/LKID-27-boundary-tests` | LKID-27 | Yuri + Gay Mark | Merged |
| [#25](https://github.com/Automation-Architecture/LKID/pull/25) | `feat/LKID-14-rules-engine` | LKID-14, LKID-25 | John Donaldson | Merged |
| [#26](https://github.com/Automation-Architecture/LKID/pull/26) | `feat/LKID-14-lee-confirmations` | Lee Q2/Q7 | John Donaldson | Merged |
| [#27](https://github.com/Automation-Architecture/LKID/pull/27) | `feat/LKID-structural-floor` | Lee Q3 | Harshit + John | Merged |
| [#28](https://github.com/Automation-Architecture/LKID/pull/28) | `feat/LKID-59-engine-golden-vectors` | LKID-59 | John Donaldson | Merged |
| [#29](https://github.com/Automation-Architecture/LKID/pull/29) | `feat/LKID-4-pdf-export` | LKID-4 | Harshit + John | Merged |
| [#30](https://github.com/Automation-Architecture/LKID/pull/30) | `feat/LKID-28-e2e-tests` | LKID-28 | Yuri + Gay Mark | Merged |
| [#31](https://github.com/Automation-Architecture/LKID/pull/31) | `feat/LKID-26-axe-core-audit` | LKID-26 | Yuri | Merged |
| [#32](https://github.com/Automation-Architecture/LKID/pull/32) | `feat/LKID-60-clerk-proxy` | LKID-60 | Harshit | Merged |

## Team

| Role | Agent | Jira Label |
|------|-------|------------|
| Orchestrator (CTO) | Luca | `agent:luca` |
| Product Manager | Husser | `agent:husser` |
| UX/UI Designer | Inga | `agent:inga` |
| API Designer | John Donaldson | `agent:john-donaldson` |
| Database Engineer | Gay Mark | `agent:gay-mark` |
| Frontend Developer | Harshit | `agent:harshit` |
| QA / Test Writer | Yuri | `agent:yuri` |

## Known Issues

- **Worktree subagent permissions:** Background subagents cannot get interactive permission approvals. Worktrees created via `git worktree add` don't help — the Bash/Write tools are still denied. Foreground deployment (sequential) works. Only one background agent (Harshit, Sprint 3) got through permissions; root cause unclear.
- **Cross-branch stash conflicts:** Never `git stash pop` when the stash contains files from multiple feature branches. Files that exist on one branch but not another (e.g., `chart/` on LKID-19 but not LKID-5) cause add/delete conflicts. Fix: commit each branch sequentially — never stash mixed cross-branch work.
- **Multi-agent workspace contamination:** When dispatching multiple foreground agents for different branches, each agent's edits land in the same workspace regardless of target branch. The last agent's checkout wins. Fix: dispatch one agent, commit+push its branch, then dispatch the next.

## Critical Rules

- Agents write ONLY in their own `/agents/{name}/` folder
- Agents may read but NOT modify another agent's artifacts
- Approved contracts are binding; QA approval REQUIRED
- **Jira is the source of truth.** When new information comes in (docs, specs, decisions), update the relevant Jira cards immediately. Card descriptions, comments, and statuses must always reflect current state. Don't let agent drafts diverge from Jira.
- All `memory/*.json` must stay in sync with project artifacts (114 entries: 31 patterns, 19 anti-patterns, 16 decisions, 17 insights, 31 tools)
- **Husser is Board Nanny** — daily Jira sweep at 8am ET (see `agents/husser/drafts/product-management-sop.md`)
- **QA SOP is binding** — Yuri follows `docs/qa-testing-sop.md` for all reviews; skill invocation rules in `agents/yuri/notes.md`
- **Merge protocol** — post-merge verification required per `docs/development-phase-engineering-sop.md` (corrective actions from Sprint 2 post-mortem)

## Diagramming

Use Excalidraw MCP (`mcp__claude_ai_Excalidraw__create_view`) for all diagrams. Save `.excalidraw` files alongside related docs. Use Automation Architecture brand palette (defined in global CLAUDE.md).

## Sitemap

```
agent-teams/
├── artifacts/
│   ├── lean-launch-mvp-prd.md    # Lean Launch MVP PRD — binding scope for Development
│   ├── registry.json             # Approved artifact registry
│   ├── frontend_build/           # Frontend build artifacts (currently empty)
│   ├── test_suite/               # Test suite artifacts (currently empty)
│   └── archive/
│       └── PRD-v2-original.md    # Original PRD (89 tickets) — archived, reference only
├── agents/
│   ├── gay_mark/drafts/          # db_design.md, db_docs.md, db_schema.sql, db-deployment-runbook.md, pgaudit-setup-notes.md
│   ├── gay_mark/outputs/         # Finalized deliverables (currently empty)
│   ├── harshit/drafts/           # frontend_architecture.md, lean-launch-review.md, clerk-integration-plan.md, lkid-19-poc-decision.md
│   ├── harshit/outputs/          # Finalized deliverables (currently empty)
│   ├── husser/drafts/            # lean-launch-stories.md, design-sprint-stories.md, client-dashboard-stories-v2.md, week-1-product-update.md, email-to-lee-week1.md, lean-launch-review.md, product-management-sop.md, execution-velocity-plan.md, jira-cards-yuri-remediation.md, sprint2-close-board-sweep.md
│   ├── husser/outputs/           # Finalized deliverables (currently empty)
│   ├── inga/drafts/              # wireframes.md, component-specs.md, design-tokens.md, user-flows.md, chart-specs.md, accessibility-plan.md, clerk-ux-review.md, client-dashboard-mockup.md, client-dashboard-review.md, dashboard-polish-fixes.md, bun-floor-display-design.md, design-sprint-meeting-1.md, design-sprint-sign-off.md, lean-launch-review.md
│   ├── inga/outputs/             # Finalized deliverables (currently empty)
│   ├── john_donaldson/drafts/    # api_contract.json, api_contract_summary.md, api_docs.md, backend-research.md, debug_calc.py, finalized-formulas.md, lean-launch-review.md, prediction_engine.py, test_debug.py, test_prediction_engine.py, week-1-technical-update.md, TASK-iterate-rules-engine-v3.md, LKID-14-25-implementation-notes.md
│   ├── john_donaldson/outputs/   # Finalized deliverables (currently empty)
│   ├── luca/drafts/              # architecture.md, infrastructure-setup.md, railway-deployment-checklist.md, medical-expert-review.md, backend-meeting-memo.md, lean-launch-review.md, merge-execution-plan.md, sprint2-merge-postmortem.md, sprint3-commit-strategy.md, lee-q1-q6-responses.md, lee-golden-vectors-v2.md, engine-refactor-analysis.md, qa-remediation-brainstorm.md, qa-skills-recommendations.md, yuri-weakness-remediation-plan.md, sprint-progress.json, spec-tracker.json, main.py
│   ├── luca/outputs/             # Finalized deliverables (currently empty)
│   ├── yuri/drafts/              # test_strategy.md, design-sprint-qa-report.md, test_golden_file.py, sprint2-qa-report-1.md, sprint2-qa-report-2.md, lean-launch-review.md, qa-report-pr12-clerk-auth.md, qa-re-review-pr12.md, qa-report-pr13-post-predict.md, qa-re-review-pr13.md, qa-batch-prs-14-17.md, test-scaffold-form-chart.md, hipaa-verification-notes.md, sop-review-and-self-assessment.md, qa-client-dashboard-sprint2.md, sprint2-debacle-qa-report.md, qa-lkid-27-boundary-tests.md, sprint3-pr-qa-verdicts.md, sprint3-pr26-27-qa-verdicts.md
│   └── yuri/outputs/             # Finalized deliverables (currently empty)
├── active/
│   ├── chatroom/                  # Agent chatroom workspace (chat.json, chatroom_report.md)
│   ├── DISPATCH-sprint3-backend.md   # John's Sprint 3 dispatch
│   ├── DISPATCH-sprint3-frontend.md  # Harshit's Sprint 3 dispatch
│   ├── DISPATCH-sprint3-qa.md        # Yuri+Gay Mark's Sprint 3 dispatch
│   └── archive/sprint2-dispatches/  # Completed DISPATCH/TASK files from Sprint 2 (9 files)
├── docs/
│   ├── discovery-phase-engineering-sop.md
│   ├── discovery-phase-flow.excalidraw
│   ├── development-phase-engineering-sop.md
│   ├── qa-testing-sop.md          # Binding QA SOP for Yuri
│   ├── memory-system-reference.md
│   ├── design-sprint/              # Placeholder files for each LKID PR branch
│   ├── prd-sprint-timeline.excalidraw
│   ├── prd-agent-workload.excalidraw
│   ├── jira-lean-setup.md
│   ├── superpowers/specs/2026-03-25-prd-structure-design.md
│   └── superpowers/specs/2026-03-26-client-dashboard-design.md
├── memory/
│   ├── patterns.json, anti_patterns.json, decisions.json
│   ├── insights.json, tooling.json
│   └── compressed_summary.md
├── backend/                      # FastAPI backend — main.py, requirements.txt, Procfile, railway.toml, .env.example, prediction/engine.py, tests/, alembic/, seeds/
├── app/                          # Next.js frontend (prototype + dashboard screens)
├── server_side_calc_spec_v1.md
├── Resources/
│   ├── agent-teams-reference.md
│   ├── railway-docs-summary.md   # Railway deployment reference (FastAPI, Postgres, domains, etc.)
│   ├── klaviyo-docs-summary.md   # Klaviyo Python SDK, Profiles/Events API, Flows, rate limits (LKID-47)
│   └── specs/
│       ├── patient_app_spec_v2_updated.pdf  # Patient app specification v2
│       └── app_spec_amendments.pdf          # Amendments to the original spec
├── tests/                       # Root-level test directory
├── scripts/
│   └── refresh-sprint-progress.py # Sprint progress sync script
├── launch-team.sh
└── README.md
```

## Key Documents

> **Maintenance rule:** When an artifact listed here changes, the owning agent updates this row in the same PR. Husser audits for drift during daily board sweeps.

| Document | Location | Owner | Status | Purpose |
|----------|----------|-------|--------|---------|
| **Governance** | | | | |
| Lean Launch MVP PRD | `artifacts/lean-launch-mvp-prd.md` | Husser | Final | Binding scope for all sprints |
| Discovery Phase SOP | `docs/discovery-phase-engineering-sop.md` | Luca | Final | Phase 1 workflow and roles |
| Development Phase SOP | `docs/development-phase-engineering-sop.md` | Luca | Final | Engineering SOP incl. merge protocol |
| QA Testing SOP | `docs/qa-testing-sop.md` | Luca/Yuri | Final | Binding QA process, skill invocation rules |
| Product Management SOP | `agents/husser/drafts/product-management-sop.md` | Husser | Final | Board Nanny + PM process |
| Memory System Reference | `docs/memory-system-reference.md` | Luca | Final | Entry format, write rules, checkpoints |
| **Technical** | | | | |
| Backend Meeting Memo | `agents/luca/drafts/backend-meeting-memo.md` | Luca | Final | Binding validation range table |
| Architecture | `agents/luca/drafts/architecture.md` | Luca | Draft | System design (Next.js + FastAPI + Railway) |
| Frontend Architecture | `agents/harshit/drafts/frontend_architecture.md` | Harshit | Draft | Frontend structure and patterns |
| API Contract | `agents/john_donaldson/drafts/api_contract.json` | John | Draft | OpenAPI spec for all endpoints |
| API Contract Summary | `agents/john_donaldson/drafts/api_contract_summary.md` | John | Draft | Human-readable API reference |
| DB Design | `agents/gay_mark/drafts/db_design.md` | Gay Mark | Draft | Schema rationale and decisions |
| DB Schema | `agents/gay_mark/drafts/db_schema.sql` | Gay Mark | Draft | Current schema definition |
| Infrastructure Setup | `agents/luca/drafts/infrastructure-setup.md` | Luca | Draft | Railway + Vercel + Clerk config |
| Railway Deployment Checklist | `agents/luca/drafts/railway-deployment-checklist.md` | Luca | Draft | Backend deployment steps |
| **Clinical** | | | | |
| Server-Side Calc Spec | `server_side_calc_spec_v1.md` | — | Final | Proprietary formulas (NDA) |
| Finalized Formulas | `agents/john_donaldson/drafts/finalized-formulas.md` | John | Draft | Phase 1 eGFR/UACR with open questions for Lee |
| Medical Expert Review | `agents/luca/drafts/medical-expert-review.md` | Luca | Draft | Clinical accuracy review |
| HIPAA Verification | `agents/yuri/drafts/hipaa-verification-notes.md` | Yuri | Draft | Compliance audit notes |
| **Specs & Design** | | | | |
| Test Strategy | `agents/yuri/drafts/test_strategy.md` | Yuri | Final | Test pyramid, frameworks, coverage thresholds |
| User Flows | `agents/inga/drafts/user-flows.md` | Inga | Draft | UX flow specifications |
| Component Specs | `agents/inga/drafts/component-specs.md` | Inga | Draft | UI component specifications |
| Design Tokens | `agents/inga/drafts/design-tokens.md` | Inga | Draft | Color, spacing, typography tokens |
| **Reports** | | | | |
| Lee Q1-Q6 Responses | `agents/luca/drafts/lee-q1-q6-responses.md` | Luca | Final | Binding clinical answers from Lee (2026-03-30) |
| Lee Golden Vectors v2.0 | `agents/luca/drafts/lee-golden-vectors-v2.md` | Luca | Final | 3 golden vectors + gap analysis (2026-04-02) |
| Engine Refactor Analysis | `agents/luca/drafts/engine-refactor-analysis.md` | Luca | Final | LKID-59 detailed analysis for John's dispatch |
| Sprint 3 Commit Strategy | `agents/luca/drafts/sprint3-commit-strategy.md` | Luca | Final | 4-branch merge plan, conflict risk matrix |
| Sprint 3 QA Verdicts | `agents/yuri/drafts/sprint3-pr-qa-verdicts.md` | Yuri | Final | QA verdicts for PRs #22-#27 |
| Sprint 2 Merge Postmortem | `agents/luca/drafts/sprint2-merge-postmortem.md` | Luca | Final | Corrective actions CA-1 through CA-5 |
| Sprint 2 Board Sweep | `agents/husser/drafts/sprint2-close-board-sweep.md` | Husser | Final | Jira alignment + Sprint 3 follow-ups |
| Sprint 2 Debacle QA Report | `agents/yuri/drafts/sprint2-debacle-qa-report.md` | Yuri | Final | Post-merge QA: 4 HIGH bugs found and fixed |
| Doc Restructure Chatroom | `active/chatroom/chatroom_report.md` | Luca/Husser | Final | Decision: defer restructure to post-ship |

## Hygiene

- **This file is an index.** Point to docs, never duplicate them.
- Update sitemap when files change. Every folder must have a README.
