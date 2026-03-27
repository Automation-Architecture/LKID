# Yuri Weakness Remediation — Jira Cards

**Created:** 2026-03-27
**Source:** `agents/luca/drafts/yuri-weakness-remediation-plan.md`
**Label:** All cards tagged `qa-remediation`

## Cards

| Card Key | Title | Owner(s) | Sprint | Effort |
|----------|-------|----------|--------|--------|
| [LKID-48](https://automationarchitecture.atlassian.net/browse/LKID-48) | Spike: set up Playwright visual regression for Visx eGFR chart component | Yuri, Harshit | Sprint 3 | M |
| [LKID-49](https://automationarchitecture.atlassian.net/browse/LKID-49) | Pair with Harshit on Visx rendering lifecycle and screenshot timing | Yuri, Harshit | Sprint 3 | S |
| [LKID-50](https://automationarchitecture.atlassian.net/browse/LKID-50) | Write k6 load test scripts targeting /predict and /lab-entries endpoints | Yuri, John Donaldson | Sprint 3 | M |
| [LKID-51](https://automationarchitecture.atlassian.net/browse/LKID-51) | Document Railway concurrency limits and connection pooling for load test planning | Luca | Sprint 2 | S |
| [LKID-52](https://automationarchitecture.atlassian.net/browse/LKID-52) | Grant Yuri read access to Railway staging environment for load testing | Luca | Sprint 2 | S |
| [LKID-53](https://automationarchitecture.atlassian.net/browse/LKID-53) | Conduct Railway infrastructure walkthrough covering security controls for HIPAA verification | Luca, Yuri | Sprint 3 | S |
| [LKID-54](https://automationarchitecture.atlassian.net/browse/LKID-54) | Grant Yuri Railway CLI access for HIPAA infrastructure verification | Luca | Sprint 2 | S |
| [LKID-55](https://automationarchitecture.atlassian.net/browse/LKID-55) | Pair with Gay Mark on pgaudit configuration and audit log verification | Yuri, Gay Mark | Sprint 3 | S |
| [LKID-56](https://automationarchitecture.atlassian.net/browse/LKID-56) | Create shared test fixture library with factory functions for backend and frontend | Yuri, Gay Mark, Harshit | Sprint 3 | L |
| [LKID-57](https://automationarchitecture.atlassian.net/browse/LKID-57) | Add CI step to validate test fixtures against latest Alembic schema | Yuri, Gay Mark | Sprint 3 | M |
| [LKID-58](https://automationarchitecture.atlassian.net/browse/LKID-58) | Create parameterized data generator script for k6 load test payloads | Yuri | Sprint 3 | S |

## Sprint Breakdown

- **Sprint 2 (3 cards):** LKID-51, LKID-52, LKID-54 — Luca-owned access/documentation tasks that unblock Sprint 3 work
- **Sprint 3 (8 cards):** LKID-48, LKID-49, LKID-50, LKID-53, LKID-55, LKID-56, LKID-57, LKID-58 — capability-building work

## Weakness Coverage

| Weakness | Cards |
|----------|-------|
| 1: Visual Regression Testing with Visx/SVG | LKID-48, LKID-49 |
| 2: Load/Performance Testing with k6 | LKID-50, LKID-51, LKID-52 |
| 4: HIPAA Compliance Verification Depth | LKID-53, LKID-54, LKID-55 |
| 6: Test Data Management at Scale | LKID-56, LKID-57, LKID-58 |
