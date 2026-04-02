# Board Sweep — 2026-04-02

**Agent:** Husser (Board Nanny)
**Sprint:** Sprint 3 — Polish & QA (Apr 2 – Apr 9)
**Source:** Local artifacts (sprint-progress.json, QA reports, DISPATCH files, CLAUDE.md)
**Note:** Atlassian and GitHub MCP tools unavailable this session — sweep based on repository artifacts.

---

## Summary

**Done: 6 cards | In Progress: 0 confirmed | To Do: 7 | Blocked: 1 | No Card: 1**

Sprint 3 opened today. All 6 Sprint 3 PRs (#22–#27) are merged. Two cards are now unblocked with no evidence of branches started. Gay Mark and Inga have no active cards.

---

## Card Status (Sprint 3)

| Card | Title | Status (Jira expected) | Evidence | Flag |
|------|-------|----------------------|----------|------|
| LKID-5 | Medical disclaimers | Done | PR #22 merged | ✓ |
| LKID-14 | Rules engine v2.0 + Lee confirmations | Done | PRs #25, #26 merged | ✓ |
| LKID-19 | Visx eGFR trajectory chart | Done | PR #23 merged | ✓ |
| LKID-25 | Rate limiting (slowapi) | Done | PR #25 merged | ✓ |
| LKID-27 | Boundary tests + golden files | Done | PR #24 merged | ✓ |
| BUN structural floor (Lee Q3) | — | Done | PR #27 merged | ✓ |
| **LKID-4** | **PDF export (Playwright)** | **Should be In Progress** | No branch found in artifacts | ⚠️ STALE |
| **LKID-49** | **Visx QA pairing** | **Should be In Progress** | No branch found in artifacts | ⚠️ STALE |
| LKID-20 | PDF download button + flow | To Do | Depends on LKID-4 | — |
| LKID-21 | Accessible data table | To Do | — | — |
| LKID-22 | Loading skeleton states | To Do | — | — |
| LKID-23 | Error boundary + fallbacks | To Do | — | — |
| LKID-26 | E2E tests (Playwright) | To Do | — | — |
| LKID-28 | axe-core accessibility audit | To Do | — | — |
| LKID-29 | Pre-release QA gate | To Do | — | — |
| LKID-47 | Klaviyo lead capture | Blocked | Waiting on Lee API key | ⛔ |
| — | Clerk v7 + Next.js 16 migration | **No Jira card** | Discovered Mar 27 | ⚠️ NEEDS CARD |

---

## Transitions Required

| Card | From | To | Reason |
|------|------|----|--------|
| LKID-4 | To Do | In Progress | LKID-19 and LKID-14 both merged — dependency met, sprint day 1 |
| LKID-49 | To Do | In Progress | LKID-19 merged — dependency met, sprint day 1 |

---

## Stale / At-Risk

### LKID-4 — PDF Export (Harshit + John)
- **Dependency:** LKID-19 merged Mar 30 ✓, LKID-14 merged Mar 30 ✓
- **Status in artifacts:** "upcoming" (sprint-progress.json not yet updated)
- **No branch detected** in any DISPATCH artifact as of Apr 2
- Sprint ship date Apr 9 — 7 days remain. LKID-20 (PDF button) is downstream.
- **Action:** Luca should dispatch Harshit + John immediately if not already started.

### LKID-49 — Visx QA Pairing (Yuri)
- **Dependency:** LKID-19 merged Mar 30 ✓
- **Status in artifacts:** "upcoming" — no QA branch started
- Yuri's next items per DISPATCH-sprint3-qa.md: LKID-49 → LKID-26 (E2E) → LKID-28 (axe-core) → LKID-29 (QA gate)
- **Action:** Yuri should be dispatched to start LKID-49 immediately.

### Clerk v7 + Next.js 16 migration — No Jira card
- Discovered Mar 27, still untracked in Jira
- Harshit's DISPATCH says: "lower priority than LKID-19 and LKID-5; do not start until both merged"
- Both are now merged — this is now unblocked but has no card
- **Action:** Husser to create LKID card for Clerk v7 migration and add to Sprint 3 backlog.

---

## Idle Agents

| Agent | Last Active Card | Status |
|-------|-----------------|--------|
| **Gay Mark** | LKID-27 (merged PR #24) | No Sprint 3 cards remaining — **idle** |
| **Inga** | LKID-5 co-owner (merged PR #22) | No open Sprint 3 assignments — **idle** |

Gay Mark may be needed for any DB/infrastructure work supporting LKID-4 (PDF). Inga should be queued for design review of LKID-21 (accessible data table) and LKID-22 (loading skeletons). Luca should confirm assignments.

---

## Open Technical Issues (from QA artifacts — require Luca decisions)

| # | Issue | Severity | Source | Action |
|---|-------|----------|--------|--------|
| 1 | **Golden vector Q1 discrepancy** — engine output diverges from spec vectors on treatment paths. 78 tests marked xfail. Lee's updated vectors expected this week. | HIGH | qa-lkid-27-boundary-tests.md | Luca to decide: re-generate vectors or wait for Lee? |
| 2 | **dial_age bug** — `compute_dial_age()` returns None when patient starts below DIALYSIS_THRESHOLD (eGFR < 12). Affects Stage 5 patients (eGFR=10 case). Needs UX/clinical design decision before LKID-4 (PDF). | MEDIUM | qa-lkid-27-boundary-tests.md | Luca + Lee decision on sentinel value |
| 3 | **CKD-EPI female/male eGFR inversion** — may be spec-correct for marketing app using sex='unknown'. | LOW | qa-lkid-27-boundary-tests.md | John to confirm |
| 4 | **N-1 cleanup** — `bun_ratio` in `MOCK_PREDICT_RESPONSE.structural_floor` in transform.ts is inconsistent with TypeScript interface. Non-blocking. | LOW | sprint3-pr26-27-qa-verdicts.md | Any author, follow-up PR |

---

## sprint-progress.json Drift

The `sprint-progress.json` file is stale vs. current state:
- LKID-24 labeled "Rate limiting (slowapi)" — should be LKID-25
- LKID-25 labeled "Prediction engine unit tests" — mismatched with Jira
- LKID-49 not listed
- LKID-47 not listed
- All 7 remaining cards show "upcoming" not their actual Jira status

**Action:** Run `scripts/refresh-sprint-progress.py` or update manually to sync.

---

## PR Health

All 6 Sprint 3 PRs (#22–#27) are merged. No open PRs detected in artifacts.

Feature branches from Sprint 3 that should be deleted post-merge:
- `feat/LKID-5-disclaimers`
- `feat/LKID-19-visx-chart`
- `feat/LKID-27-boundary-tests`
- `feat/LKID-14-rules-engine`
- `feat/LKID-14-lee-confirmations`
- `feat/LKID-structural-floor`

---

## QA Pipeline

| PR | Yuri Verdict | Notes |
|----|-------------|-------|
| #22 (LKID-5 disclaimers) | PASS | Merged |
| #23 (LKID-19 visx chart) | PASS | Merged |
| #24 (LKID-27 boundary tests) | PASS (with escalation) | Merged — Q1 xfail tests documented |
| #25 (LKID-14 rules engine) | PASS | Merged |
| #26 (LKID-14 Lee confirmations) | PASS | Merged |
| #27 (structural floor) | PASS WITH CONDITIONS | Merged — rebase condition satisfied (PR #26 merged first) |

**QA ready for next cycle:** Nothing queued yet. LKID-4 and LKID-49 PRs need to be opened before Yuri can start.

---

## Blockers

| Blocker | Cards Affected | Owner | Status |
|---------|---------------|-------|--------|
| Lee API key (Klaviyo) | LKID-47 | Lee | No update since Mar 30 |
| Lee updated golden vectors | LKID-27 Q1 xfails | Lee | Expected "this week" per CLAUDE.md |

---

## Actions Required

| Priority | Action | Owner |
|----------|--------|-------|
| P0 | Dispatch Harshit + John to start LKID-4 (PDF export) immediately | Luca |
| P0 | Dispatch Yuri to start LKID-49 (Visx QA pairing) immediately | Luca |
| P1 | Create Jira card for Clerk v7 + Next.js 16 migration; add to Sprint 3 | Husser |
| P1 | Decide on golden vector Q1 — re-generate or await Lee | Luca |
| P1 | Decide on dial_age Bug #1 sentinel value (before LKID-4 PDF is built) | Luca |
| P2 | Assign Gay Mark to sprint 3 remaining tasks (likely LKID-21 or infra support) | Luca |
| P2 | Assign Inga to LKID-21 design review + LKID-22 loading skeleton design | Luca |
| P2 | Update sprint-progress.json (run refresh script or manual sync) | Luca/Husser |
| P3 | John confirms CKD-EPI Bug #2 is intentional | John Donaldson |
| P3 | Cleanup: remove `bun_ratio` from MOCK_PREDICT_RESPONSE in transform.ts | Any author |
| P3 | Delete merged Sprint 3 feature branches | Luca |

---

*Husser — Board Sweep — 2026-04-02 — Sprint 3 Day 1*
