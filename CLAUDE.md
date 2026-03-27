# Agent Teams Project

## KidneyHood App

**Goal:** Lead gen web app — patients enter kidney health lab values, view an eGFR trajectory chart, download PDF. Email captured for warm campaign.
**Tech Stack:** Next.js 15 (Vercel) + FastAPI (Railway) + PostgreSQL (Railway) + Clerk (auth) + Playwright (PDF)
**Jira:** [SPEC Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/SPEC/boards/329/backlog) | [LKID Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/LKID/boards/363)
**Repo:** [github.com/Automation-Architecture/LKID](https://github.com/Automation-Architecture/LKID)
**Specs:** `/Users/brad/IDE/kidneyhood/` (3 docx files)
**Status:** Sprint 2 active (Mar 26 -- Apr 2). Backend deploying on Railway. Dashboard live. Email sent to Lee. Waiting on 5 formula answers.

## Sprint Plan

| Sprint | Dates | Cards | Focus |
|--------|-------|-------|-------|
| Sprint 1 — Design Sprint | Mar 20 – Mar 26 (DONE) | 9 (LKID-30–38) | Hi-fi mockup + prototype, Inga sign-off gates Sprint 2 |
| Sprint 2 — Core Flow | Mar 26 – Apr 2 | 17 (LKID-1–3, 6–19) | Auth, DB, API, form, chart — e2e prediction |
| Sprint 3 — PDF, Polish & QA | Apr 2 – Apr 9 | 12 (LKID-4–5, 20–29) | Interactivity, PDF, disclaimers, tests, QA gate |

**Ship date:** April 9, 2026
**Blocker:** LKID-14 (rules engine) awaiting Lee's response on Phase 1 formula (5 questions sent). LKID-47 (Klaviyo) needs API key from Lee.

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
| [#12](https://github.com/Automation-Architecture/LKID/pull/12) | `feat/LKID-1-clerk-auth` | LKID-1 | Harshit | Open |

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

## Diagramming

Use Excalidraw MCP (`mcp__claude_ai_Excalidraw__create_view`) for all diagrams. Save `.excalidraw` files alongside related docs. Use Automation Architecture brand palette (defined in global CLAUDE.md).

## Sitemap

```
agent-teams/
├── artifacts/
│   ├── lean-launch-mvp-prd.md    # Lean Launch MVP PRD — binding scope for Development
│   ├── registry.json             # Approved artifact registry
│   └── archive/
│       └── PRD-v2-original.md    # Original PRD (89 tickets) — archived, reference only
├── agents/
│   ├── gay_mark/drafts/          # db_design.md, db_docs.md, db_schema.sql, db-deployment-runbook.md, TASK-rewrite-db-schema.md
│   ├── harshit/drafts/           # frontend_architecture.md, lean-launch-review.md
│   ├── husser/drafts/            # lean-launch-stories.md, design-sprint-stories.md, client-dashboard-stories(-v2).md, week-1-product-update.md, email-to-lee-week1.md, TASK-fix-stories-for-sprint2.md
│   ├── inga/drafts/              # 7 UX files, design-sprint-sign-off.md, client-dashboard-mockup.md, client-dashboard-review.md, dashboard-polish-fixes.md, bun-floor-display-design.md, clerk-ux-review.md
│   ├── john_donaldson/drafts/    # api_contract.json, api_docs.md, backend-research.md, week-1-technical-update.md, prediction_engine.py, test_prediction_engine.py, finalized-formulas.md, TASK-*.md
│   ├── luca/drafts/              # architecture.md, infrastructure-setup.md, railway-deployment-checklist.md, medical-expert-review.md, sprint-progress.json, spec-tracker.json, main.py
│   └── yuri/drafts/              # test_strategy.md, design-sprint-qa-report.md, test_golden_file.py, sprint2-qa-report-1.md
├── docs/
│   ├── discovery-phase-engineering-sop.md
│   ├── discovery-phase-flow.excalidraw
│   ├── development-phase-engineering-sop.md
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
├── patient_app_spec_v2_updated.pdf
├── app_spec_amendments.pdf
├── Resources/
│   ├── agent-teams-reference.md
│   ├── railway-docs-summary.md   # Railway deployment reference (FastAPI, Postgres, domains, etc.)
│   └── klaviyo-docs-summary.md   # Klaviyo Python SDK, Profiles/Events API, Flows, rate limits (LKID-47)
├── launch-team.sh
└── README.md
```

## Key Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Finalized Formulas | `agents/john_donaldson/drafts/finalized-formulas.md` | Phase 1 eGFR/UACR formulas with open questions for Lee |
| Medical Expert Review | `agents/luca/drafts/medical-expert-review.md` | Clinical accuracy review of prediction engine |
| Railway Deployment Checklist | `agents/luca/drafts/railway-deployment-checklist.md` | Backend deployment steps and status |
| Infrastructure Setup | `agents/luca/drafts/infrastructure-setup.md` | Railway + Vercel + Clerk infrastructure config |

## Hygiene

- **This file is an index.** Point to docs, never duplicate them.
- Update sitemap when files change. Every folder must have a README.
