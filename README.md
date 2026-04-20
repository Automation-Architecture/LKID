# KidneyHood (LKID)

Lead generation web app for kidney health awareness. Patients enter lab values at `/labs`, verify their email at `/gate/[token]`, view an eGFR trajectory chart at `/results/[token]`, and download a PDF report. Email is captured for a warm marketing campaign via Klaviyo.

## Live URLs

| Environment | URL |
|-------------|-----|
| Patient flow | [kidneyhood-automation-architecture.vercel.app](https://kidneyhood-automation-architecture.vercel.app) |
| Lee dashboard | [/client/lee-a3f8b2](https://kidneyhood-automation-architecture.vercel.app/client/lee-a3f8b2) |
| Backend (FastAPI) | Railway — see `agents/luca/drafts/railway-deployment-checklist.md` |

## Tech Stack

Next.js 16 (Vercel) + FastAPI (Railway) + PostgreSQL (Railway) + Clerk v7 (auth, scoped to `/client/*` only) + Playwright (PDF generation). PostHog analytics and Sentry error monitoring wired (env-gated). CSP + 6 security headers shipped in Report-Only mode.

## Patient Flow

Tokenized, no-auth: `/labs` (form) → `/gate/[token]` (email verify) → `/results/[token]` (chart + PDF download). The `report_token` is the only credential — no patient accounts, no sessionStorage.

## Project Links

- **Repo:** [github.com/Automation-Architecture/LKID](https://github.com/Automation-Architecture/LKID)
- **Jira LKID Board:** [LKID Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/LKID/boards/363)
- **Jira SPEC Board:** [SPEC Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/SPEC/boards/329/backlog)

## Sprint Plan

| Sprint | Dates | Focus | Status |
|--------|-------|-------|--------|
| Sprint 1 — Design Sprint | Mar 20 – Mar 26 | Hi-fi mockup + prototype, Inga sign-off | Done |
| Sprint 2 — Core Flow | Mar 26 – Apr 2 | Auth, DB, API, form, chart — e2e prediction | Done |
| Sprint 3 — PDF, Polish & QA | Mar 30 – Apr 9 | Interactivity, PDF, disclaimers, tests, QA gate | Done |
| Sprint 4 — No-Auth Tokenized Flow | Apr 19 – Apr 20 | Replace Clerk-gated flow with tokenized `/labs` → `/gate` → `/results` + Resend + Klaviyo | Done |
| Sprint 5 — Launch Readiness | Apr 20 | PostHog, Sentry, SEO, CSP, Lee dashboard v2, Results/chart/PDF design parity | Done |

Sprint 5 shipped Apr 20, 2026 — 9 engineering cards merged (LKID-71, -72, -73, -74, -75, -76, -79, -80, -82) plus Sprint 4 rollovers closed (LKID-68, -69, -78).

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

See `CLAUDE.md` for the full sitemap, key documents table, development workflow, PR history, and critical rules. This README is a scanability entry point; `CLAUDE.md` is the authoritative index.
