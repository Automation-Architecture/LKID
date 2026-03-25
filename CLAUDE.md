# Agent Teams Project

## KidneyHood App

**Goal:** Lead gen web app — patients enter kidney health lab values, view an eGFR trajectory chart, download PDF. Email captured for warm campaign.
**Tech Stack:** Next.js 15 (Vercel) + FastAPI (Railway) + PostgreSQL (Railway) + Clerk (auth) + Playwright (PDF)
**Jira:** [SPEC Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/SPEC/boards/329/backlog) | [LKID Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/LKID/boards/363)
**Repo:** [github.com/Automation-Architecture/LKID](https://github.com/Automation-Architecture/LKID)
**Specs:** `/Users/brad/IDE/kidneyhood/` (3 docx files)
**Status:** CEO Test + backend research complete. Design Sprint → Core Flow → QA.

## Sprint Plan

| Sprint | Dates | Cards | Focus |
|--------|-------|-------|-------|
| Sprint 1 — Design Sprint | Mar 30 – Apr 3 | 9 (LKID-30–38) | Hi-fi mockup + prototype, Inga sign-off gates Sprint 2 |
| Sprint 2 — Core Flow | Apr 6 – Apr 10 | 17 (LKID-1–3, 6–19) | Auth, DB, API, form, chart — e2e prediction |
| Sprint 3 — PDF, Polish & QA | Apr 13 – Apr 17 | 12 (LKID-4–5, 20–29) | Interactivity, PDF, disclaimers, tests, QA gate |

**Ship date:** April 17, 2026
**Blocker:** LKID-14 (rules engine) — 5 items pending Lee

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
│   ├── gay_mark/drafts/          # db_design.md, db_docs.md, db_schema.sql
│   ├── harshit/drafts/           # frontend_architecture.md, lean-launch-review.md
│   ├── husser/drafts/            # lean-launch-stories.md, design-sprint-stories.md
│   ├── inga/drafts/              # 7 UX files + design-sprint-meeting-1.md, lean-launch-review.md
│   ├── john_donaldson/drafts/    # api_contract.json, api_docs.md, lean-launch-review.md, backend-research.md
│   ├── luca/drafts/              # architecture.md, lean-launch-review.md
│   └── yuri/drafts/              # test_strategy.md, lean-launch-review.md
├── docs/
│   ├── discovery-phase-engineering-sop.md
│   ├── discovery-phase-flow.excalidraw
│   ├── development-phase-engineering-sop.md
│   ├── memory-system-reference.md
│   ├── prd-sprint-timeline.excalidraw
│   ├── prd-agent-workload.excalidraw
│   ├── jira-lean-setup.md            # Manual setup instructions for LKID project
│   └── superpowers/specs/2026-03-25-prd-structure-design.md
├── memory/
│   ├── patterns.json, anti_patterns.json, decisions.json
│   ├── insights.json, tooling.json
│   └── compressed_summary.md
├── app/                          # Empty — Development Phase
├── tests/                        # Empty — Development Phase
├── Resources/agent-teams-reference.md
├── launch-team.sh
└── README.md
```

## Hygiene

- **This file is an index.** Point to docs, never duplicate them.
- Update sitemap when files change. Every folder must have a README.
