# KidneyHood (LKID)

Lead generation web app for kidney health awareness. Patients enter lab values, view an eGFR trajectory chart, and download a PDF report. Email is captured for warm marketing campaigns.

## Live URLs

| Environment | URL | Status |
|-------------|-----|--------|
| Frontend (Vercel) | [kidneyhood.vercel.app](https://kidneyhood.vercel.app) | Live |
| Backend (Railway) | TBD | Deployment pending |

## Tech Stack

Next.js 15 (Vercel) + FastAPI (Railway) + PostgreSQL (Railway) + Clerk (auth) + Playwright (PDF generation)

## Project Links

- **Repo:** [github.com/Automation-Architecture/LKID](https://github.com/Automation-Architecture/LKID)
- **Jira LKID Board:** [LKID Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/LKID/boards/363)
- **Jira SPEC Board:** [SPEC Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/SPEC/boards/329/backlog)

## Sprint Plan

| Sprint | Dates | Cards | Focus | Status |
|--------|-------|-------|-------|--------|
| Sprint 1 — Design Sprint | Mar 30 - Apr 3 | 9 (LKID-30-38) | Hi-fi mockup + prototype, sign-off gates | Complete |
| Sprint 2 — Core Flow | Apr 6 - Apr 10 | 17 (LKID-1-3, 6-19) | Auth, DB, API, form, chart — e2e prediction | In Progress |
| Sprint 3 — PDF, Polish, QA | Apr 13 - Apr 17 | 12 (LKID-4-5, 20-29) | Interactivity, PDF, disclaimers, tests, QA gate | Not Started |

**Ship date:** April 17, 2026

## Team

| Role | Agent | Label |
|------|-------|-------|
| Orchestrator (CTO) | Luca | `agent:luca` |
| Product Manager | Husser | `agent:husser` |
| UX/UI Designer | Inga | `agent:inga` |
| API Designer | John Donaldson | `agent:john-donaldson` |
| Database Engineer | Gay Mark | `agent:gay-mark` |
| Frontend Developer | Harshit | `agent:harshit` |
| QA / Test Writer | Yuri | `agent:yuri` |

## Repository Structure

See `CLAUDE.md` for the full sitemap and development workflow details.