# Board Sweep — 2026-04-05

**Agent:** Husser (Board Nanny)
**Sprint:** Sprint 3 — Polish & QA (Mar 30 – Apr 9)
**Source:** Local project files (CLAUDE.md, sprint-progress.json, agent drafts, git log)
**Note:** Atlassian MCP and GitHub MCP unavailable this session — card transitions recorded here for manual execution by Luca/Husser via next MCP-enabled session.

---

## Summary

**Done: 6 | In Progress: 0 (active) | To Do: 9 | Blocked: 2 | STALLED: 2 days since last commit**

**Ship date: Apr 9 — 4 days remaining.**

Zero commits since the Apr 3 sweep. All P0 action items from Apr 3 remain unresolved. LKID-59 (engine formula mismatch), LKID-4 (PDF), and LKID-49 (Visx QA) are now critically overdue. The critical path (LKID-59 fix → LKID-4 → LKID-29) has 3 sequential dependencies with 4 days left.

---

## Card Status (Sprint 3)

| Card | Title | Last Known Status | Reality | Flag |
|------|-------|------------------|---------|------|
| LKID-5 | Medical disclaimers | Done (PR #22 merged) | ✓ Done | — |
| LKID-14 | Rules engine v2.0 | In Progress (Jira stale) | PRs #25+#26 merged — **transition to Done** | ⚠️ |
| LKID-19 | Visx eGFR chart | In Progress (Jira stale) | PR #23 merged — **transition to Done** | ⚠️ |
| LKID-25 | Rate limiting | In Progress (Jira stale) | PR #25 merged — **transition to Done** | ⚠️ |
| LKID-27 | Boundary tests + golden files | In Progress (Jira stale) | PR #24 merged — **transition to Done** | ⚠️ |
| **LKID-59** | **Engine Phase 1 formula mismatch** | **To Do (unassigned)** | **No branch, no file, no commit — day 3 stall** | 🔴 |
| LKID-4 | PDF export (Playwright) | To Do | No branch started — day 4 carry-over | 🔴 |
| LKID-49 | Visx QA pairing | To Do | No branch started — day 4 carry-over | 🔴 |
| LKID-20 | Interactive chart features | To Do | No activity | ⚠️ |
| LKID-21 | Accessible data table | To Do | No activity | ⚠️ |
| LKID-22 | Loading skeleton states | To Do | No activity | ⚠️ |
| LKID-23 | Error boundary + fallbacks | To Do | No activity | ⚠️ |
| LKID-26 | E2E tests (Playwright) | To Do | No activity | ⚠️ |
| LKID-28 | axe-core accessibility audit | To Do | No activity | ⚠️ |
| LKID-29 | Pre-release QA gate | To Do | Blocked until LKID-59/4/49/fixes resolved | ⛔ |
| LKID-47 | Klaviyo lead capture | Blocked | Waiting on Lee API key — day 6 | ⛔ |

---

## Transitions Required

Same as Apr 3 — still unexecuted. Must be applied in next MCP-enabled session.

| Card | From | To | Reason |
|------|------|----|--------|
| LKID-14 | In Progress | Done | PRs #25+#26 merged 2026-03-31 |
| LKID-19 | In Progress | Done | PR #23 merged 2026-03-31 |
| LKID-25 | In Progress | Done | PR #25 merged 2026-03-31 |
| LKID-27 | In Progress | Done | PR #24 merged 2026-03-31 |
| LKID-59 | To Do | In Progress | Assign to John Donaldson immediately |
| LKID-4 | To Do | In Progress | Assign to Harshit; unblocked since LKID-19 merged |
| LKID-49 | To Do | In Progress | Assign to Yuri; unblocked since LKID-19 merged |

---

## Stale PR / Open Issues

**Open PRs: 0.** No new PRs opened since Apr 3.

**14 unresolved CodeRabbit findings** carried into main on merge (full list in Apr 3 sweep). Still no cleanup PR opened. Blocking LKID-29.

Critical subset (must fix before QA gate):

| PR | Severity | Finding | Owner |
|----|----------|---------|-------|
| #23 (chart) | CRITICAL | Dialysis threshold hardcoded as `15` — must read from API (engine uses 12) | Harshit |
| #23 (chart) | HIGH | SR-only table uses only first trajectory | Harshit |
| #23 (chart) | HIGH | 10yr point detection off-by-one (month-120 lookup) | Harshit |
| #24 (tests) | HIGH | `make_lead` factory hardcodes id/email → PK collision failures | Gay Mark |
| #24 (tests) | HIGH | Stage 5 decline rate -4.0 absent from `NO_TX_DECLINE_RATES` | Gay Mark |
| #26 (engine) | HIGH | `bun_12` golden vector assertions not updated for `post_decline = -0.33` | John |
| #27 (floor) | HIGH | `NaN` can reach `setInputBun` — `Number.isFinite` guard missing | Harshit |

---

## QA Pipeline

**QA ready:** Nothing queued. No new PRs.

**Queued after LKID-59/4/49 PRs open:** Yuri, per QA SOP.

**Accumulating backlog:** 14 post-merge findings + LKID-59 fix + LKID-4 + LKID-49 must all be QA-cleared before LKID-29 gate opens.

---

## Idle Agents

| Agent | Status | Recommended Next Action |
|-------|--------|------------------------|
| **John Donaldson** | Idle — LKID-14/25 complete, LKID-47 blocked | **LKID-59 (engine formula fix) — CRITICAL, P0** |
| **Gay Mark** | Idle — LKID-27 complete | Fix PR #24 CodeRabbit findings (HIGH: make_lead factory, Stage 5 decline rate) |
| **Inga** | Idle — LKID-5 complete | LKID-21 (accessible data table) and LKID-22 (loading skeleton) |
| **Harshit** | Should be on LKID-4 | No commit activity since Apr 3 — needs dispatch confirmation |

---

## Blockers

| Blocker | Cards Affected | Owner | Age |
|---------|---------------|-------|-----|
| LKID-59 engine formula mismatch | LKID-4, LKID-29 | John Donaldson (unassigned) | 3 days since flagged |
| Lee API key (Klaviyo) | LKID-47 | Lee | 6 days — needs escalation |
| CodeRabbit cleanup (14 findings) | LKID-29 | Harshit, Gay Mark, John | No PR opened yet |
| Sprint 3 "active" status in Jira | All Sprint 3 cards, sprint sync | Husser/Luca | Unresolved since Apr 3 |

---

## Critical Path — 4 Days Left

```
Today (Apr 5): John starts LKID-59 fix
Apr 6: LKID-59 PR open → QA → merge
Apr 6: Harshit starts LKID-4 (can start in parallel)
Apr 7: CodeRabbit cleanup PR merged
Apr 7: Yuri completes LKID-49 (Visx QA)
Apr 8: LKID-4 PR merged; LKID-26 E2E + LKID-28 axe-core running
Apr 9: LKID-29 QA gate
```

Any further delay to LKID-59 or LKID-4 collapses the path. **Ship date Apr 9 is at serious risk.**

---

## Actions Required

| Priority | Action | Owner | Days Overdue |
|----------|--------|-------|-------------|
| 🔴 P0 | Dispatch John Donaldson to LKID-59 immediately | Luca | Day 3 |
| 🔴 P0 | Dispatch Harshit to LKID-4 (PDF export) | Luca | Day 4 |
| 🔴 P0 | Dispatch Yuri to LKID-49 (Visx QA) | Luca | Day 4 |
| P1 | Execute Jira transitions: LKID-14/19/25/27 → Done, LKID-59/4/49 → In Progress | Husser (MCP) | Day 3 |
| P1 | Open CodeRabbit cleanup PR — assign Gay Mark (PR #24 fixes) + Harshit (PR #23 fixes) | Luca | Day 3 |
| P1 | Escalate Lee on LKID-47 Klaviyo key — 6 days with no response | Luca | Day 6 |
| P1 | Verify Sprint 3 is "active" in Jira board settings | Husser (MCP) | Day 3 |
| P2 | Re-label LKID-20–23, 26, 28, 29 from sprint:2 → sprint:3 | Husser (MCP) | Day 3 |
| P2 | Assign Inga to LKID-21 + LKID-22 | Luca | Day 3 |
| P3 | Delete merged Sprint 3 feature branches | Luca | Day 3 |

---

*Husser — Board Sweep — 2026-04-05 — Sprint 3 Day 6 (4 days to ship)*
