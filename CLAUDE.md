# Agent Teams Project

## KidneyHood App

**Goal:** Lead gen web app — patients enter kidney health lab values, view an eGFR trajectory chart, download PDF. Email captured for warm campaign.
**Tech Stack:** Next.js 15 (Vercel) + FastAPI (Railway) + PostgreSQL (Railway) + Clerk (auth) + Playwright (PDF)
**Jira:** [SPEC Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/SPEC/boards/329/backlog) | [LKID Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/LKID/boards/363)
**Repo:** [github.com/Automation-Architecture/LKID](https://github.com/Automation-Architecture/LKID)
**Specs:** `/Users/brad/IDE/kidneyhood/` (3 docx files)
**Status:** Sprint 2 DONE (Mar 26 -- Apr 2). 11 PRs merged (#9--#21 minus deferred). Post-merge QA found 4 HIGH bugs — all fixed. LKID-14 (rules engine) and LKID-47 (Klaviyo) blocked on Lee. LKID-19 deferred to Sprint 3.
**Client Dashboard:** https://kidneyhood.vercel.app/client/lee-a3f8b2 — auto-updated by `scripts/refresh-sprint-progress.py`.

## Sprint Plan

| Sprint | Dates | Cards | Focus |
|--------|-------|-------|-------|
| Sprint 1 — Design Sprint | Mar 20 – Mar 26 (DONE) | 9 (LKID-30–38) | Hi-fi mockup + prototype, Inga sign-off |
| Sprint 2 — Core Flow | Mar 26 – Apr 2 (DONE) | 17 (LKID-1–3, 6–19) | Auth, DB, API, form, chart — e2e prediction |
| Sprint 3 — PDF, Polish & QA | Apr 2 – Apr 9 | 12 (LKID-4–5, 20–29) | Interactivity, PDF, disclaimers, tests, QA gate |

**Ship date:** April 9, 2026
**Blockers:** LKID-14 (rules engine) awaiting Lee's response on Phase 1 formula (5 questions + Q6 creatinine max=20.0). LKID-47 (Klaviyo) needs API key from Lee. LKID-19 (Visx chart) deferred to Sprint 3.
**Lee escalation:** Follow-up email Mar 28 → Luca escalates Mar 30 → fallback decision Mar 30 (ship with CKD-EPI placeholder trajectories if no response).
**Creatinine max=20.0:** Agreed in backend engineering meeting. DB migration, Pydantic model, and test fixtures all aligned to 20.0. Pending Lee confirmation (Q6) before Sprint 3 prod release.

## What's Next

### Sprint 3 Kickoff (Apr 2)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Re-label LKID-20–29 from `sprint:2` → `sprint:3` in Jira | Husser | Pending (Apr 2) |
| 2 | Close Sprint 2 (ID 128) in Jira | Husser | Pending (Apr 2) |
| 3 | Update epics LKID-2 and LKID-3 to Done (child stories complete) | Husser | Pending (Apr 2) |
| 4 | Lee escalation: follow-up email Mar 28, Luca escalates Mar 30, fallback decision Mar 30 | Luca | In progress |

### Sprint 3 Cards (Apr 2 – Apr 9)

| Card | Title | Owner | Dependency |
|------|-------|-------|------------|
| LKID-19 | Visx eGFR trajectory chart | Harshit | None |
| LKID-49 | Visx QA pairing (deferred from Sprint 2) | Yuri | LKID-19 |
| LKID-4 | PDF export (Playwright rendering) | Harshit + John | LKID-19 (chart in PDF) |
| LKID-5 | Medical disclaimers (verbatim, all viewports) | Harshit + Inga | None |
| LKID-20–29 | Polish, tests, QA gate (10 cards) | Various | See Jira |
| LKID-14 | Rules engine (Phase 1 formula) | John Donaldson | **Blocked on Lee** |
| LKID-47 | Klaviyo lead capture | John Donaldson | **Blocked on Lee API key** |

### Post-Ship (after April 9 retro)

| # | Task | Owner |
|---|------|-------|
| 1 | Full document restructure into `docs/governance/`, `docs/technical/`, `docs/clinical/`, `docs/reports/`, `docs/specs/`, `docs/reference/` | Husser + Luca |
| 2 | Create Jira card to track restructure (prevents indefinite deferral) | Husser |

See `active/chatroom/chatroom_report.md` for the full decision rationale.

### Done (Sprint 2 Close)

- 11 PRs merged (#9–#21). Jira board swept and aligned.
- 4 HIGH-severity post-merge bugs found and fixed (`agents/yuri/drafts/sprint2-debacle-qa-report.md`).
- Client dashboard live and auto-updating for Lee.
- Remediation cards LKID-48–58: 10/11 complete. Only LKID-49 deferred with chart.

## Automated Processes

- **Sprint progress sync:** `scripts/refresh-sprint-progress.py` runs daily at 8am ET via cron. Auto-loads `.env`, pulls Jira statuses, updates JSON, commits+pushes to git, triggers Vercel rebuild. Requires `.env` with `JIRA_EMAIL`, `JIRA_API_TOKEN`, `VERCEL_DEPLOY_HOOK_URL`.
- **Husser board sweep:** Scheduled remote agent runs daily at 8am ET (trigger ID: `trig_01VZxLyxxsNXe8AqswJkev2M`). Checks card-to-PR alignment, stale PRs, blocker detection, QA pipeline readiness. Manage at https://claude.ai/code/scheduled.

## Development Workflow

CTO (Luca) opens one PR per Jira card. Each card gets a feature branch (`feat/LKID-{number}-{description}`). Copilot is added as reviewer on every PR. Agents implement on their branches. PRs merge to `main` when approved.

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
│   ├── harshit/drafts/           # frontend_architecture.md, lean-launch-review.md, clerk-integration-plan.md
│   ├── harshit/outputs/          # Finalized deliverables (currently empty)
│   ├── husser/drafts/            # lean-launch-stories.md, design-sprint-stories.md, client-dashboard-stories-v2.md, week-1-product-update.md, email-to-lee-week1.md, lean-launch-review.md, product-management-sop.md, execution-velocity-plan.md, jira-cards-yuri-remediation.md, sprint2-close-board-sweep.md
│   ├── husser/outputs/           # Finalized deliverables (currently empty)
│   ├── inga/drafts/              # wireframes.md, component-specs.md, design-tokens.md, user-flows.md, chart-specs.md, accessibility-plan.md, clerk-ux-review.md, client-dashboard-mockup.md, client-dashboard-review.md, dashboard-polish-fixes.md, bun-floor-display-design.md, design-sprint-meeting-1.md, design-sprint-sign-off.md, lean-launch-review.md
│   ├── inga/outputs/             # Finalized deliverables (currently empty)
│   ├── john_donaldson/drafts/    # api_contract.json, api_contract_summary.md, api_docs.md, backend-research.md, debug_calc.py, finalized-formulas.md, lean-launch-review.md, prediction_engine.py, test_debug.py, test_prediction_engine.py, week-1-technical-update.md, TASK-iterate-rules-engine-v3.md
│   ├── john_donaldson/outputs/   # Finalized deliverables (currently empty)
│   ├── luca/drafts/              # architecture.md, infrastructure-setup.md, railway-deployment-checklist.md, medical-expert-review.md, backend-meeting-memo.md, lean-launch-review.md, merge-execution-plan.md, sprint2-merge-postmortem.md, qa-remediation-brainstorm.md, qa-skills-recommendations.md, yuri-weakness-remediation-plan.md, sprint-progress.json, spec-tracker.json, main.py
│   ├── luca/outputs/             # Finalized deliverables (currently empty)
│   ├── yuri/drafts/              # test_strategy.md, design-sprint-qa-report.md, test_golden_file.py, sprint2-qa-report-1.md, sprint2-qa-report-2.md, lean-launch-review.md, qa-report-pr12-clerk-auth.md, qa-re-review-pr12.md, qa-report-pr13-post-predict.md, qa-re-review-pr13.md, qa-batch-prs-14-17.md, test-scaffold-form-chart.md, hipaa-verification-notes.md, sop-review-and-self-assessment.md, qa-client-dashboard-sprint2.md, sprint2-debacle-qa-report.md
│   └── yuri/outputs/             # Finalized deliverables (currently empty)
├── active/
│   ├── chatroom/                  # Agent chatroom workspace (chat.json, chatroom_report.md)
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
| Sprint 2 Merge Postmortem | `agents/luca/drafts/sprint2-merge-postmortem.md` | Luca | Final | Corrective actions CA-1 through CA-5 |
| Sprint 2 Board Sweep | `agents/husser/drafts/sprint2-close-board-sweep.md` | Husser | Final | Jira alignment + Sprint 3 follow-ups |
| Sprint 2 Debacle QA Report | `agents/yuri/drafts/sprint2-debacle-qa-report.md` | Yuri | Final | Post-merge QA: 4 HIGH bugs found and fixed |
| Doc Restructure Chatroom | `active/chatroom/chatroom_report.md` | Luca/Husser | Final | Decision: defer restructure to post-ship |

## Hygiene

- **This file is an index.** Point to docs, never duplicate them.
- Update sitemap when files change. Every folder must have a README.
