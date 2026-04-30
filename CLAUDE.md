# Agent Teams Project

## KidneyHood App

**Goal:** Lead gen web app — patients enter kidney health lab values, view an eGFR trajectory chart, download PDF. Email captured for warm campaign.
**Tech Stack:** Next.js 16 (Vercel) + FastAPI (Railway) + PostgreSQL (Railway) + Clerk v7 (auth) + Playwright (PDF)
**Jira:** [SPEC Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/SPEC/boards/329/backlog) | [LKID Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/LKID/boards/363)
**Repo:** [github.com/Automation-Architecture/LKID](https://github.com/Automation-Architecture/LKID)
**Specs:** `/Users/brad/IDE/kidneyhood/` (3 docx files)
**Status:** Sprint 5 COMPLETE + post-sprint hardening in progress. App live at kidneyhood-automation-architecture.vercel.app with no-auth tokenized flow (`/labs` → `/gate/[token]` → `/results/[token]`). G1/G2/G3 guardrails active. CSP enforcing (flipped 2026-04-30). A11y CI suite wired (LKID-93 + LKID-94, PRs #81 + #83). Color-contrast token fixes pending (LKID-96).
**Client Dashboard:** https://kidneyhood-automation-architecture.vercel.app/client/lee-a3f8b2 — auto-updated by `scripts/refresh-sprint-progress.py`.

## Sprint Plan

| Sprint | Dates | Cards | Focus |
|--------|-------|-------|-------|
| Sprint 1 — Design Sprint | Mar 20 – Mar 26 (DONE) | 9 (LKID-30–38) | Hi-fi mockup + prototype, Inga sign-off |
| Sprint 2 — Core Flow | Mar 26 – Apr 2 (DONE) | 17 (LKID-1–3, 6–19) | Auth, DB, API, form, chart — e2e prediction |
| Sprint 3 — PDF, Polish & QA | Mar 30 – Apr 9 (DONE) | 12 (LKID-4–5, 20–29) | Interactivity, PDF, disclaimers, tests, QA gate |
| Sprint 4 — No-Auth Tokenized Flow | Apr 19 – Apr 20 (DONE) | 7 engineering cards + follow-ups (LKID-61–70) | Replace Clerk-gated flow with `/labs` → `/gate/[token]` → `/results/[token]` + Resend + Klaviyo. Shipped 13 days ahead of plan. |
| Sprint 5 — Launch Readiness | Apr 20 (DONE) | 9 cards (LKID-71–76, -79, -80, -82) + Sprint 4 rollovers closed | PostHog analytics, Sentry error monitoring, Results + chart redesign, ResultsView refactor, PDF design parity, Lee dashboard v2, SEO basics, CSP + security headers. Shipped in a single day. |

**Ship date:** April 9, 2026 (Sprint 3). **Sprint 4 shipped:** April 20, 2026.
**Retrospective:** `agents/husser/drafts/sprint4-retrospective.md` — 18 PRs merged, G1/G2/G3 guardrails added, 4 incidents resolved.
**Sprint 5 proposal (selected: Theme A — Launch Readiness):** `agents/luca/drafts/sprint-5-proposal.md`.
**Brad-hands backlog:** `agents/luca/drafts/brad-action-setup-guide.md` covers Resend DNS, Klaviyo Flow, LKID-68 Q&A, LKID-69 deletion approval, Lee sign-off.

## What's Next

### Sprint 5 — Launch Readiness (DONE — shipped Apr 20, 2026)

Theme A delivered end-to-end in a single day. 9 engineering cards merged + deployed (8 planned + LKID-82 PDF added mid-sprint when Brad pointed at `project/PDF Report.html`). Sprint 4 rollovers (LKID-68 postmortem, LKID-69 dup Postgres) also closed during the sprint.

| Card | Title | Owner | Status | PR |
|------|-------|-------|--------|----|
| LKID-72 | Sentry frontend + backend error monitoring | John + Harshit | **Done** | #55 |
| LKID-71 | PostHog conversion funnel analytics (labs/gate/results/pdf) | Harshit | **Done** | #56 |
| LKID-76 | Results page design parity + sitewide font regression | Harshit + Inga | **Done** | #57 |
| LKID-79 | Extract Results page into ResultsView component | Harshit | **Done** | #58 |
| LKID-80 | Chart redesign — pixel-for-pixel match to project/Results.html (design hues, AA override on chart SVG) | Harshit + Inga | **Done** | #59 |
| LKID-75 | Lee dashboard v2 — launch-metrics panels | Harshit + Inga | **Done** | #60 |
| LKID-82 | PDF report design parity to project/PDF Report.html | Harshit + Inga | **Done** | #62 |
| LKID-74 | CSP + 6 security headers (Report-Only mode) | John + Harshit | **Done** | #63 |
| LKID-73 | SEO basics (OG tags, sitemap, robots, JSON-LD, MedicalWebPage) | Harshit + Inga | **Done** | #64 |

**Sprint 4 rollovers closed during Sprint 5:**

- LKID-68 postmortem — 5 Brad-gated items resolved (AI-1/2/4/5 decisions, AI-3 superseded by LKID-71 shipping). SOP Rules 7 (binding runbooks + delta review) and 8 (G1 fail-closed permanent) added.
- LKID-69 dup Postgres service — verified empty and deleted via Railway GraphQL. Live DB unchanged.
- LKID-78 audit discrepancy — closed as working-as-intended. `sex="unknown"` hardcode at `/labs` form locked in per Lee's preference; decision recorded in three places (form comment, engine docstring, investigation memo).

**Backlog (filed, not scheduled):**

- LKID-77 — Engine edge case: `compute_dial_age` returns None when `trajectory[0] < 12` (Low, agent:john-donaldson)
- LKID-96 — Color-contrast AA violations on page chrome: `.sc-pill.gray` (4.30:1), `.lbl`/`.foot` (`--kh-muted` #8A8D96 → 3.04:1), footer links (3.04:1). Root cause: `--kh-muted` token not AA-compliant on tinted backgrounds. Fix: darken token site-wide or introduce `--kh-muted-strong`. Will restore full-page axe scope in results-page test once fixed. (agent:harshit + inga)

**Brad-hands tickets (agents can't do these — filter Jira board by label `brad-hands`):**

| Key | Item | Priority |
|-----|------|----------|
| [LKID-47](https://automationarchitecture.atlassian.net/browse/LKID-47) | Klaviyo Flow dashboard config (engineering shipped; Flow setup + DNS + API key pending) | — |
| [LKID-83](https://automationarchitecture.atlassian.net/browse/LKID-83) | Set PostHog env vars on Vercel — activate analytics | **High** |
| [LKID-84](https://automationarchitecture.atlassian.net/browse/LKID-84) | Set Sentry env vars — DSN set on all envs ✅; still need `SENTRY_ORG` + `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` (source maps) | **High** |
| [LKID-85](https://automationarchitecture.atlassian.net/browse/LKID-85) | Resend DNS + flip FROM email to `reports@kidneyhood.org` | **High** |
| [LKID-86](https://automationarchitecture.atlassian.net/browse/LKID-86) | DNS flip to `kidneyhood.org` + set `NEXT_PUBLIC_APP_URL` | Medium |
| [LKID-88](https://automationarchitecture.atlassian.net/browse/LKID-88) | Send Sprint 5 update email to Lee | Low |

LKID-83/84/85 are blockers but on the backlog — agents will keep moving on engineering work first.

**Done (post-Sprint 5):**

- LKID-87 — CSP flipped from Report-Only → enforcing on frontend + backend (PR #70, merged 2026-04-30). Yuri PASS WITH NITS. Follow-up: wire `report-uri` to Sentry once LKID-84 lands.
- LKID-81 — Visual-regression infrastructure wired (PR #73, merged 2026-04-30). Playwright + 2 chart baselines (Stage 3a, Stage 4) + CI workflow on chart-touching PRs + workflow_dispatch baseline-regen mode. Yuri PASS WITH NITS. Demonstration: deliberate `#D4A017 → #0000FF` flip caught with 1318px diff. Next: remove `TODO(LKID-89)` axe waiver on the chart SVG (visual regression now catches palette regressions).
- LKID-90 — Chart redesign v3 per Lee feedback from 2026-04-09 call (PR #71, merged 2026-04-30). 7 ACs: dramatic divergence wedge (hatched outcome-gap area), dialysis event markers at eGFR=15 crossings, scenario reduction 4→3 (UI-only midpoint of BUN 13–17/18–24, engine emits all 4), `Starting eGFR: {value}` left-edge callout, "reported eGFR"/"structural capacity" stripped from `/results` prose only (PDF preserved). Yuri PASS — 7/7 ACs, `#9F2D2D` marker contrast 7.27:1 (better than claimed 4.78). CodeRabbit CLI review: no findings. Superseded by LKID-91 same day (3 lines → 2).
- LKID-91 — Chart simplification: 2 trajectory lines per Lee feedback (PR #75, merged 2026-04-30). Display-only — engine/API untouched. Hides `bun_lte_12` + `bun_18_24`, relabels `bun_13_17` → "BUN 12-17". Scenario cards 4→2; PDF report 4→2. Healthy-range fill auto-removed (was anchored to hidden ≤12 line). Yuri PASS (3 non-blocking nits). LKID-81 update-baselines `workflow_dispatch` recovery path exercised live — macOS baselines drifted on Linux CI as predicted; regen pushed Linux baselines to branch in 2m31s.
- LKID-92 — Post-LKID-91 cleanup (PR #78, merged 2026-04-30). Removed the `.exclude('[data-testid="egfr-chart-svg"]')` axe waiver + `TODO(LKID-89)` comment block (visual regression now catches palette drift; LKID-91 hid the AA-failing yellow line). Deleted dormant `combineMidScenarios` helper + `bun_13_24` config entry left over from the LKID-90 spike. -105 lines net. Yuri PASS WITH NITS — 2 follow-ups filed: chart-SVG axe scan needs a working test (results-page accessibility test pre-existing broken on main), and no axe workflow exists in CI.
- LKID-93 — Fixed broken results-page a11y test (PR #81, merged 2026-04-30). Root cause: `NEXT_PUBLIC_API_URL` missing from `playwright.a11y.config.ts` `webServer.env` — CSP blocked the route-mock fetch so the page never left its loading skeleton. Fix: added env var + switched `RESULTS_API_URL` to regex to handle query params + scoped axe scan to `[data-testid="egfr-chart-svg"]` (pre-existing page-chrome contrast failures tracked in LKID-96). Yuri PASS 22/22.
- LKID-94 — Wired a11y CI suite (PR #83, merged 2026-04-30). New `.github/workflows/accessibility.yml`: runs axe-core suite on every frontend-touching PR, Playwright browser cache, artifact upload on failure. Added `test:a11y` npm script. Yuri PASS 26/26.

Full acceptance criteria + step-by-step for each in `agents/luca/drafts/brad-hands-cards-pending.md`.

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
3. Auto-review fans out three ways:
   - **Copilot** auto-attaches via the org-wide ruleset (id 15788058 at `https://github.com/organizations/Automation-Architecture/settings/rules/15788058`) — fires on PR open + every push to the PR branch (`pull_request.synchronize`) across all Automation-Architecture repos
   - **CodeRabbit CLI** runs locally via the global Claude Code hook at `~/.claude/hooks/coderabbit-review-pr.sh`, posting findings as a PR comment under "CodeRabbit CLI review (auto-posted by Claude Code hook)". Replaces the unreliable CodeRabbit GitHub bot.
   - The CodeRabbit GitHub bot is no longer relied on (silent failures / rate limits even on Pro plan, 2026-04-30)
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

### Sprint 5 PRs (Launch Readiness)

| PR | Branch | Card | Owner | Status |
|----|--------|------|-------|--------|
| [#55](https://github.com/Automation-Architecture/LKID/pull/55) | `feat/LKID-72-sentry-integration` | LKID-72 | John + Harshit | Merged |
| [#56](https://github.com/Automation-Architecture/LKID/pull/56) | `feat/LKID-71-posthog-analytics` | LKID-71 | Harshit | Merged |
| [#57](https://github.com/Automation-Architecture/LKID/pull/57) | `feat/LKID-76-results-parity` | LKID-76 | Harshit + Inga | Merged |
| [#58](https://github.com/Automation-Architecture/LKID/pull/58) | `feat/LKID-79-resultsview-component-extract` | LKID-79 | Harshit | Merged |
| [#59](https://github.com/Automation-Architecture/LKID/pull/59) | `feat/LKID-80-chart-redesign` | LKID-80 | Harshit + Inga | Merged |
| [#60](https://github.com/Automation-Architecture/LKID/pull/60) | `feat/LKID-75-lee-dashboard-v2` | LKID-75 | Harshit + Inga | Merged |
| [#61](https://github.com/Automation-Architecture/LKID/pull/61) | `fix/sprint-progress-sprint5-refresh` | — | Luca | Merged |
| [#62](https://github.com/Automation-Architecture/LKID/pull/62) | `feat/LKID-82-pdf-design-parity` | LKID-82 | Harshit + Inga | Merged |
| [#63](https://github.com/Automation-Architecture/LKID/pull/63) | `feat/LKID-74-security-headers` | LKID-74 | John + Harshit | Merged |
| [#64](https://github.com/Automation-Architecture/LKID/pull/64) | `feat/LKID-73-seo-basics` | LKID-73 | Harshit + Inga | Merged |
| [#66](https://github.com/Automation-Architecture/LKID/pull/66) | `feat/LKID-89-chart-pixel-parity-v2` | LKID-89 | Harshit + Inga | Merged |
| [#70](https://github.com/Automation-Architecture/LKID/pull/70) | `feat/LKID-87-csp-enforce-flip` | LKID-87 | John + Harshit | Merged |
| [#71](https://github.com/Automation-Architecture/LKID/pull/71) | `feat/LKID-90-chart-v3-divergence` | LKID-90 | Harshit + Inga | Merged |
| [#73](https://github.com/Automation-Architecture/LKID/pull/73) | `feat/LKID-81-visual-regression` | LKID-81 | Harshit + Yuri | Merged |
| [#75](https://github.com/Automation-Architecture/LKID/pull/75) | `feat/LKID-91-chart-2-line` | LKID-91 | Harshit + Yuri | Merged |
| [#78](https://github.com/Automation-Architecture/LKID/pull/78) | `chore/LKID-92-post-lkid-91-cleanup` | LKID-92 | Harshit + Yuri | Merged |
| [#81](https://github.com/Automation-Architecture/LKID/pull/81) | `feat/LKID-93-fix-a11y-results-test` | LKID-93 | Harshit + Yuri | Merged |
| [#83](https://github.com/Automation-Architecture/LKID/pull/83) | `feat/LKID-94-a11y-ci` | LKID-94 | Yuri | Merged |

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

Authoritative file list: **Key Documents** table above. The sitemap here is just folder-level structure.

```
LKID/
├── app/                          # Next.js 16 frontend (Vercel). Patient funnel (/labs, /gate/[token],
│                                 # /results/[token]) + PDF render target (/internal/chart/[token]) +
│                                 # Clerk-gated client dashboard (/client/[slug]).
├── backend/                      # FastAPI backend (Railway). Prediction engine, tokenized endpoints,
│                                 # Resend + Klaviyo services, alembic migrations, pytest suite.
├── project/                      # Design-handoff bundle (claude.ai/design source of truth).
│                                 # Landing Page.html, Lab Form.html, Email Gate.html, Results.html,
│                                 # PDF Report.html, Email Template.html, Design Handoff.html +
│                                 # design_handoff_kidneyhood_web_flow/screenshots/ + uploads/.
├── artifacts/                    # Binding scope docs (Lean Launch MVP PRD, registry.json, archive/).
├── agents/                       # Per-role work folders ({agent}/drafts/, {agent}/outputs/).
│                                 # Each README points back at CLAUDE.md Key Documents for the
│                                 # authoritative list. Roles: gay_mark, harshit, husser, inga,
│                                 # john_donaldson, luca, yuri.
├── active/                       # Currently-active dispatches + chatroom + archive/ for prior sprints.
├── docs/                         # Binding SOPs (discovery/development/QA), memory-system reference,
│                                 # excalidraw diagrams, superpowers specs.
├── memory/                       # JSON-backed memory system (patterns, anti_patterns, decisions,
│                                 # insights, tooling) + compressed_summary.md.
├── Resources/                    # Agent reference docs, Railway + Klaviyo SDK summaries,
│                                 # specs/ (patient_app_spec_v2 + amendments PDFs).
├── tests/                        # Root-level test directory (most testing lives under app/ or backend/).
├── scripts/                      # refresh-sprint-progress.py (Jira → dashboard sync fallback).
├── server_side_calc_spec_v1.md   # Proprietary clinical formulas (NDA).
├── launch-team.sh
├── CLAUDE.md                     # This file — index, not content.
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
| Sprint 5 UI Design Audit | `agents/luca/drafts/ui-design-audit-sprint5.md` | Luca (subagent) | Final | Deployed vs `project/` designs — 8 P0 + 11 P1 + 7 P2, screenshots in `ui-audit-screenshots/` |
| Sprint 5 Chart Palette Decision | `agents/inga/drafts/chart-palette-decision.md` | Inga | Final | Binding — Palette A+ hybrid (WCAG on chart lines, `--s-*` on pills/cards) |
| Sprint 5 Scenario dial_age Sign-off | `agents/john_donaldson/drafts/scenario-dial-age-signoff.md` | John | Final | LKID-76 engine PASS — "Not projected" × 4 is correct for Stage 3a |
| Sprint 5 Results-Parity Dispatch | `active/DISPATCH-sprint5-results-parity.md` | Luca | Final | LKID-76 implementation scope, AC, palette decision reference |
| Sprint 5 PR #55 QA Verdict | `agents/yuri/drafts/sprint5-pr55-qa-verdict.md` | Yuri | Final | LKID-72 Sentry: PASS — 10/10 checks, 1 non-blocking nit on frontend scrubber coverage |
| Sprint 5 PR #56 QA Verdict | `agents/yuri/drafts/sprint5-pr56-qa-verdict.md` | Yuri | Final | LKID-71 PostHog: PASS — PII fix verified (ckd_stage bucket), 3 non-blocking nits |
| Sprint 5 PR #57 QA Verdict | `agents/yuri/drafts/sprint5-pr57-qa-verdict.md` | Yuri | Final | LKID-76 Results parity: PASS with 3 CodeRabbit nits addressed on same branch |
| Sprint 5 PR #58 QA Verdict | `agents/yuri/drafts/sprint5-pr58-qa-verdict.md` | Yuri | Final | LKID-79 ResultsView extract: PASS — 13/13 checks, pure-presentational contract preserved |
| Sprint 5 PR #59 QA Verdict | `agents/yuri/drafts/sprint5-pr59-qa-verdict.md` | Yuri | Final | LKID-80 chart redesign: PASS — 18/18 checks, AA override intentional per Brad |
| Sprint 5 PR #60 QA Verdict | `agents/yuri/drafts/sprint5-pr60-qa-verdict.md` | Yuri | Final | LKID-75 dashboard v2: PASS — HIPAA posture clean, 3 non-blocking nits (opt-in denominator, limiter, UTC buckets) |
| Sprint 5 PR #62 QA Verdict | `agents/yuri/drafts/sprint5-pr62-qa-verdict.md` | Yuri | Final | LKID-82 PDF parity: PASS — 15/15 checks + rendered PDF screenshots |
| Sprint 5 PR #63 QA Verdict | `agents/yuri/drafts/sprint5-pr63-qa-verdict.md` | Yuri | Final | LKID-74 CSP + headers: PASS — 13/13 checks; Report-Only; 6-step post-merge verification for enforcing-mode flip |
| Sprint 5 PR #64 QA Verdict | `agents/yuri/drafts/sprint5-pr64-qa-verdict.md` | Yuri | Final | LKID-73 SEO basics: PASS — 13/13 checks; base URL env-driven for DNS flip |
| LKID-78 Audit Investigation | `agents/john_donaldson/drafts/lkid-78-audit-discrepancy-investigation.md` | John | Final | WAI — "32" was mockup copy; `sex="unknown"` locked in by Lee's preference |
| Brad-Hands Pending Cards | `agents/luca/drafts/brad-hands-cards-pending.md` | Luca | Final | Full acceptance criteria + step-by-step for LKID-83/84/85/86/87/88 (durable reference if Jira is slow) |
| Scenario dial_age Sign-off | `agents/john_donaldson/drafts/scenario-dial-age-signoff.md` | John | Final | LKID-76 engine PASS — "Not projected" output correct for Stage 3a baseline |
| LKID-69 Pre/Post-Delete Memo | `agents/luca/drafts/lkid-69-predelete-verification.md` | Luca (subagent) | Final | Orphan Postgres verified empty, deleted 2026-04-20, post-delete checks all PASS |
| Sprint 3 QA Verdicts | `agents/yuri/drafts/sprint3-pr-qa-verdicts.md` | Yuri | Final | QA verdicts for PRs #22-#27 |
| Sprint 2 Merge Postmortem | `agents/luca/drafts/sprint2-merge-postmortem.md` | Luca | Final | Corrective actions CA-1 through CA-5 |
| Sprint 2 Board Sweep | `agents/husser/drafts/sprint2-close-board-sweep.md` | Husser | Final | Jira alignment + Sprint 3 follow-ups |
| Sprint 2 Debacle QA Report | `agents/yuri/drafts/sprint2-debacle-qa-report.md` | Yuri | Final | Post-merge QA: 4 HIGH bugs found and fixed |
| Doc Restructure Chatroom | `active/chatroom/chatroom_report.md` | Luca/Husser | Final | Decision: defer restructure to post-ship |

## Hygiene

- **This file is an index.** Point to docs, never duplicate them.
- Update sitemap when files change. Every folder must have a README.
