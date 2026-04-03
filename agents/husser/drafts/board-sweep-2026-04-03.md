# Board Sweep — 2026-04-03

**Agent:** Husser (Board Nanny)
**Sprint:** Sprint 3 — Polish & QA (Mar 30 – Apr 9)
**Source:** GitHub MCP (live PR data + review comments) + Atlassian MCP (Jira via sprint JQL)
**Note:** `openSprints()` JQL returned 0 — Sprint 3 may not be marked active in Jira board settings. Card data pulled via `sprint = "Sprint 3"` fallback.

---

## Summary

**Done: 6 | In Progress: 3 (stale — PRs merged) | To Do: ~9 | Blocked: 2**

**New critical blocker since yesterday:** LKID-59 filed — engine Phase 1 formula mismatch confirmed by Lee's 2026-04-02 golden vectors (+4 to +8 eGFR above expected). This is now the highest-priority item for the sprint. No open PRs.

---

## Card Status (Sprint 3)

| Card | Title | Jira Status | Reality | Flag |
|------|-------|-------------|---------|------|
| LKID-5 | Medical disclaimers | — | PR #22 merged ✓ | ✓ |
| LKID-14 | Rules engine v2.0 | In Progress | PRs #25, #26 merged — **transition to Done** | ⚠️ |
| LKID-19 | Visx eGFR chart | In Progress | PR #23 merged — **transition to Done** | ⚠️ |
| LKID-25 | Rate limiting | In Progress | PR #25 merged — **transition to Done** | ⚠️ |
| LKID-27 | Boundary tests + golden files | In Progress | PR #24 merged — **transition to Done** | ⚠️ |
| BUN structural floor (Lee Q3) | — | — | PR #27 merged ✓ | ✓ |
| **LKID-59** | **Engine Phase 1 formula mismatch** | **To Do** | **NEW BUG — unassigned, critical path** | 🔴 |
| LKID-4 | PDF export (Playwright) | To Do | No branch started (P0 carry-over from Apr 2) | ⚠️ |
| LKID-49 | Visx QA pairing | To Do | No branch started (P0 carry-over from Apr 2) | ⚠️ |
| LKID-20 | Interactive chart features | To Do | — | — |
| LKID-21 | Accessible data table | To Do | — | — |
| LKID-22 | Loading skeleton states | To Do | — | — |
| LKID-23 | Error boundary + fallbacks | To Do | — | — |
| LKID-26 | E2E tests (Playwright) | To Do | — | — |
| LKID-28 | axe-core accessibility audit | To Do | — | — |
| LKID-29 | Pre-release QA gate | To Do | — | — |
| LKID-47 | Klaviyo lead capture | Blocked | Waiting on Lee API key | ⛔ |

---

## Transitions Required

| Card | From | To | Reason |
|------|------|----|--------|
| LKID-14 | In Progress | Done | PRs #25 + #26 merged 2026-03-31 |
| LKID-19 | In Progress | Done | PR #23 merged 2026-03-31 |
| LKID-25 | In Progress | Done | PR #25 merged 2026-03-31 |
| LKID-27 | In Progress | Done | PR #24 merged 2026-03-31 |
| LKID-59 | To Do | In Progress | Needs immediate assignment to John Donaldson |

---

## New Critical Issue — LKID-59

**Engine Phase 1 formula mismatch (filed 2026-04-02 from Lee's golden vectors)**

- Lee's updated golden vectors (received 2026-04-02) show engine outputs **+4 to +8 eGFR above expected** on Phase 1 trajectory.
- Root cause identified: 0.31-coefficient model in spec vs. different coefficient in current engine.
- LKID-59 is **unassigned** — must go to John Donaldson immediately.
- This is on the critical path: LKID-4 (PDF), LKID-29 (QA gate), and ship date Apr 9 all depend on engine correctness.
- Analysis at `agents/luca/drafts/lee-golden-vectors-v2.md`.

**Also from Lee's golden vectors:** LKID-26 golden vector in `golden_vectors.py` needs updating for `post_decline = -0.33` (PR #26 changed the rate but golden assertions weren't updated).

---

## Unresolved CodeRabbit Findings (carried into main on merge)

All 6 Sprint 3 PRs were merged with bot-only reviews (COMMENTED state — no APPROVED). No human approvals recorded. Per SOP, Yuri QA PASS is required. Yuri's verdict file exists locally but was not reflected in GitHub review state. The following actionable findings were not addressed before merge:

| PR | Severity | Finding | Owner |
|----|----------|---------|-------|
| #23 (chart) | **CRITICAL** | Dialysis threshold hardcoded as `15` in `PHASE_DEFINITIONS` — must read from API response | Harshit |
| #23 (chart) | HIGH | 10yr point detection off-by-one (month-120 lookup) | Harshit |
| #23 (chart) | HIGH | SR-only table uses first trajectory only (not all 4) | Harshit |
| #23 (chart) | MEDIUM | `dialysisAge` unit label: months vs. years inconsistency | Harshit |
| #23 (chart) | MEDIUM | React 19.2.4 vs. `@visx/*` peer dep max React 18.x | Harshit |
| #24 (tests) | HIGH | `make_lead` factory hardcodes id/email → PK collision failures | Gay Mark |
| #24 (tests) | HIGH | `make_lab_entry` shape diverged from API contract | Gay Mark |
| #24 (tests) | HIGH | `test_unknown_sex` expects average but engine maps unknown → male | Gay Mark |
| #24 (tests) | HIGH | Stage 5 decline rate -4.0 absent from `NO_TX_DECLINE_RATES` | Gay Mark |
| #24 (tests) | MEDIUM | `_assert_valid_result()` silent fallback masks missing keys | Gay Mark |
| #25 (engine) | MEDIUM | `bun_suppression_estimate` missing from frontend `PredictResponse` type | John |
| #26 (engine) | HIGH | `bun_12` golden vector assertions not updated for `post_decline = -0.33` | John |
| #27 (floor) | HIGH | `NaN` can reach `setInputBun` — `Number.isFinite` guard missing | Harshit |
| #27 (floor) | MEDIUM | `test_suppression_below_half_point_returns_none` hits wrong guard (BUN ≤17 early exit) | John |

These need a follow-up PR before LKID-29 (QA gate). Recommend Luca create a single "post-merge cleanup" card or assign these as sub-tasks under existing cards.

---

## Sprint Label Drift

Most "To Do" Sprint 3 cards still carry `sprint:2` label. The following need re-labeling to `sprint:3`:

LKID-20, LKID-21, LKID-22, LKID-23, LKID-24, LKID-26, LKID-28, LKID-29

---

## PR Health

**Open PRs: 0** — All Sprint 3 PRs (#22–#27) are merged. No stale PRs.

Merged Sprint 3 feature branches (candidates for deletion):
- `feat/LKID-5-disclaimers`
- `feat/LKID-19-visx-chart`
- `feat/LKID-27-boundary-tests`
- `feat/LKID-14-rules-engine`
- `feat/LKID-14-lee-confirmations`
- `feat/LKID-structural-floor`

---

## QA Pipeline

**QA ready:** Nothing queued. LKID-4 and LKID-49 have not started — no PRs to hand off.

**QA backlog accumulating:** 14 unresolved CodeRabbit findings across PRs #23–#27 (see above). These will block LKID-29 (pre-release QA gate) if not addressed before Yuri begins gate check.

---

## Idle Agents

| Agent | Status | Next Card |
|-------|--------|-----------|
| **Gay Mark** | Idle — LKID-27 complete | Candidate for CodeRabbit fix-up PR (#24 findings) |
| **Inga** | Idle — LKID-5 complete | Candidate for LKID-21 (accessible table), LKID-22 (loading skeleton design) |

---

## Blockers

| Blocker | Cards Affected | Owner | Age |
|---------|---------------|-------|-----|
| Lee API key (Klaviyo) | LKID-47 | Lee | 4 days (no update since Mar 30) |
| Engine formula fix | LKID-59, LKID-4, LKID-29 | John Donaldson | NEW — confirmed Apr 2 via golden vectors |
| Sprint 3 not "active" in Jira | All Sprint 3 cards | Husser/Luca | `openSprints()` returns 0 — board settings need check |

---

## Jira Infrastructure Issue

`openSprints()` JQL returned 0 results. Sprint 3 may not have been formally opened after Sprint 2 (ID 128) was closed. This prevents scheduled automation (trig_017nHqTJu4Y3tTstg3UtTwb1) from querying correctly and will break the client dashboard auto-update.

**Action:** Husser or Luca must verify Sprint 3 is "active" in Jira board settings (LKID board, Sprint 3 — successor to ID 128).

---

## Actions Required

| Priority | Action | Owner | Carry-over? |
|----------|--------|-------|-------------|
| P0 | Assign LKID-59 to John Donaldson; transition to In Progress | Luca | NO — new today |
| P0 | Dispatch Harshit + John to start LKID-4 (PDF export) | Luca | YES — day 2 with no action |
| P0 | Dispatch Yuri to start LKID-49 (Visx QA pairing) | Luca | YES — day 2 with no action |
| P0 | Verify Sprint 3 is "active" in Jira board settings | Husser/Luca | NO — new today |
| P1 | Transition LKID-14, LKID-19, LKID-25, LKID-27 → Done in Jira | Husser | YES — day 2 |
| P1 | Create follow-up PR for CodeRabbit post-merge cleanup (14 findings) | Luca assigns | NO — new today |
| P1 | Fix hardcoded dialysis threshold `15` in chart (PR #23, CRITICAL) | Harshit | NO — new today |
| P1 | Update `bun_12` golden vector for post_decline = -0.33 (PR #26) | John | NO — new today |
| P1 | Re-label LKID-20–23, 26, 28, 29 from sprint:2 → sprint:3 | Husser | YES |
| P2 | Assign Gay Mark to PR #24 CodeRabbit fix-up (4 HIGH findings) | Luca | NO — new today |
| P2 | Assign Inga to LKID-21 + LKID-22 design tasks | Luca | YES — day 2 |
| P3 | Delete merged Sprint 3 feature branches | Luca | YES — day 2 |

---

*Husser — Board Sweep — 2026-04-03 — Sprint 3 Day 4 (6 days to ship)*
