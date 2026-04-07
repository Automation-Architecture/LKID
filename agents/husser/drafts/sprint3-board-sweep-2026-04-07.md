# Board Sweep — 2026-04-07

**Agent:** Husser (Board Nanny)
**Sprint:** Sprint 3 (Mar 30 – Apr 9)
**Ship date:** April 9, 2026 (T-2 days)
**Sources:** Jira project LKID (all issues), GitHub repo Automation-Architecture/LKID (all PRs)

---

## Summary

```
Board Sweep — 2026-04-07
Done: 14 sprint:3 cards | In Progress: 2 | To Do: 9 | Blocked: 1

Transitions made: None (all existing Done cards already correctly transitioned)
Stale PRs: None — no open PRs exist; all 27 PRs are merged
QA ready: None — no open PRs awaiting Yuri review
Idle agents: Gay Mark (no active In Progress cards), Inga (no active In Progress)
Blockers: LKID-47 (Klaviyo, Lee API key), LKID-59 (engine formula mismatch — NO PR yet, T-2 days)
Action items: [see below — CRITICAL on LKID-59]
```

---

## Jira Card Status — Sprint 3 Cards

### Done (confirmed match to merged PRs)

| Card | Summary | PR | Notes |
|------|---------|-----|-------|
| LKID-5 | Polish & QA (epic) | — | Epic closed correctly |
| LKID-14 | Integrate rules engine v2.0 | #25, #26 | Done — both PRs merged Mar 31 |
| LKID-19 | Visx eGFR trajectory chart | #23 | Done — merged Mar 31 |
| LKID-25 | Rate limiting | #25 | Done — merged Mar 31 |
| LKID-27 | Boundary tests + golden files | #24 | Done — merged Mar 31 |
| Structural floor (Lee Q3) | BUN structural floor callout | #27 | Done — merged Mar 31 |

### In Progress

| Card | Summary | Owner | Age | PR? | Risk |
|------|---------|-------|-----|-----|------|
| **LKID-59** | Engine Phase 1 formula mismatch — rewrite to 0.31-coefficient model | John Donaldson | 3 days | **NO PR** | **CRITICAL** |
| LKID-49 | Pair with Harshit on Visx rendering lifecycle | Yuri + Harshit | 3 days | No (pairing task, not code) | Medium |

### To Do (Sprint 3, not started)

| Card | Summary | Owner | Notes |
|------|---------|-------|-------|
| LKID-20 | Add interactive features to eGFR chart | Harshit + Inga | Unblocked (LKID-19 done) |
| LKID-21 | Build results page with chart, disclaimer, PDF button | Harshit + Inga | Unblocked |
| LKID-22 | POST /predict/pdf with Playwright | Harshit + John | Unblocked (LKID-19 done) |
| LKID-23 | Add PDF download button | Harshit | Unblocked |
| LKID-24 | Medical + legal disclaimers | Harshit + Inga | **NOTE: PR #22 already merged this** — verify if card is a duplicate or different scope |
| LKID-26 | Zero critical axe-core violations | Harshit + Inga + Yuri | Unblocked |
| LKID-28 | E2E tests (full user journey) | Harshit + Yuri | Unblocked |
| LKID-29 | Pre-release QA gate (5 checkpoints) | Yuri | Blocked on LKID-59 being resolved first |
| LKID-60 | Clerk v7 + Next.js 16 migration | Harshit | To Do — high risk for ship |

### Blocked

| Card | Summary | Blocker |
|------|---------|---------|
| LKID-47 | Klaviyo lead capture | Lee API key — not received. Still blocked. |

### PDF Export Epic

| Card | Summary | Status |
|------|---------|--------|
| LKID-4 | PDF Export (epic) | To Do — still open; constituent stories (LKID-22, 23) not started |

---

## GitHub PR Check

- **Open PRs:** 0 — no open PRs
- **Recently merged (last 7 days):** PRs #22–#27 all merged 2026-03-31
- **Stale PRs (open >24h without review):** None
- **QA ready:** None (no open PRs)

PR-to-Jira alignment:
- PR #22 (LKID-5 disclaimers) → LKID-5 epic Done ✓. **Note:** LKID-24 (also "disclaimers") still shows To Do — needs clarification if this is a separate card from LKID-5 (the epic) or a duplicate.
- PR #23 (LKID-19 chart) → LKID-19 Done ✓
- PR #24 (LKID-27 boundary tests) → LKID-27 Done ✓
- PR #25 (LKID-14 + LKID-25) → both Done ✓
- PR #26 (Lee Q2/Q7) → covered under LKID-14 Done ✓
- PR #27 (structural floor) → covered under LKID-14 scope Done ✓

---

## Transitions Made

**None.** All cards that should be Done are already Done. No orphan transitions required.

---

## Blocker Assessment

### LKID-47 — Klaviyo (still blocked)
Status: Blocked. Lee API key not received. No change since Mar 30. Scope decision needed: if key doesn't arrive by Apr 8 EOD, this card must be dropped from Sprint 3 scope and deferred. Luca to decide.

### LKID-59 — Engine formula mismatch (CRITICAL — no PR, T-2 days)
Status: In Progress. No PR open. This is the highest-risk item on the board.

- Lee's golden vectors (received Apr 2) show engine outputs are +4–8 eGFR points above expected at month 12
- Root cause: LKID-14 implemented a v2.0 "two-component" Phase 1 formula; Lee's vectors confirm the correct model uses the simpler `0.31 × (BUN - target)` coefficient, no Phase 2 gain function
- LKID-29 (QA gate — the ship gate) cannot execute until this is resolved
- John Donaldson must open a PR today (Apr 7) for same-day Yuri QA
- If PR is not open by EOD Apr 7, Luca must decide whether to descope or extend ship date

Comment posted to LKID-59 in Jira documenting this urgency.

### LKID-49 — Visx QA pairing (medium risk)
Status: In Progress. This is a pairing/investigation task, not a code PR. No PR expected. Should complete as a Jira comment/report. Yuri + Harshit to close this out.

---

## LKID-24 Anomaly — Possible Duplicate

LKID-24 "Add medical and legal disclaimers to the prediction results" is To Do in Jira. However, PR #22 (LKID-5) already implemented disclaimers. Two possibilities:
1. LKID-24 is a separate card with different scope from LKID-5 (e.g., results page specifically vs. global)
2. LKID-24 was made redundant by PR #22 and should be closed

**Action needed:** Luca or Harshit to confirm scope. If PR #22 covers LKID-24's acceptance criteria, transition LKID-24 to Done.

---

## Idle Agents

| Agent | Active Cards | Last Activity |
|-------|-------------|---------------|
| **Gay Mark** | None in sprint | All qa-remediation cards Done (LKID-55–58) |
| **Inga** | LKID-20, 21, 24, 26 (To Do) — no In Progress | Last active PR #22 (Mar 31) |

Gay Mark is fully idle. Available for:
- Assisting John on LKID-59 engine rewrite
- Supporting Harshit on LKID-60 (Clerk v7 migration)
- Load testing once LKID-59 is resolved

---

## QA Pipeline

No open PRs → nothing queued for Yuri right now. However:

1. **LKID-59 PR** (when opened today) → highest priority for Yuri
2. **LKID-60** (Clerk v7 migration) → when opened, must go through Yuri before merge given high build risk
3. **LKID-20–28 batch** → once opened, Yuri needs to clear all before LKID-29 gate can execute

---

## Action Items (Needing Human Attention)

| # | Priority | Item | Owner | Due |
|---|----------|------|-------|-----|
| 1 | CRITICAL | LKID-59: John must open PR today or Luca makes scope call | John / Luca | Apr 7 EOD |
| 2 | HIGH | LKID-60 (Clerk v7): Harshit must start today — high build risk, needs time for review | Harshit | Apr 7-8 |
| 3 | HIGH | LKID-20–28: Harshit + Inga must start To Do cards — 9 cards, 2 days left | Harshit + Inga | Apr 7-8 |
| 4 | HIGH | LKID-29 (QA gate): Cannot begin until LKID-59 resolved AND LKID-20–28 complete | Yuri | Apr 8–9 |
| 5 | MEDIUM | LKID-24 vs PR #22: Confirm if LKID-24 is redundant, transition to Done if so | Luca / Harshit | Apr 7 |
| 6 | MEDIUM | LKID-47 (Klaviyo): If Lee key not received by Apr 8, formally descope | Luca | Apr 8 |
| 7 | MEDIUM | Gay Mark: Reassign to support LKID-59 or LKID-60 | Luca | Apr 7 |
| 8 | LOW | LKID-49: Yuri to close out pairing report as Jira comment/doc | Yuri | Apr 7 |

---

## Sprint Health Assessment

**Status: AT RISK**

Ship date is April 9 (T-2 days). The board has 9 To Do cards plus a critical In Progress bug (LKID-59) with no PR. The team needs to execute flawlessly across the next 48 hours:

- Day 1 (Apr 7): LKID-59 PR opened + reviewed; LKID-20–28 work starts; LKID-60 started
- Day 2 (Apr 8): All LKID-20–28 PRs merged; LKID-59 merged; LKID-60 merged; LKID-29 QA gate begins
- Ship (Apr 9): LKID-29 gate PASS → deploy

If LKID-59 slips past Apr 7, the QA gate cannot run on Apr 8, which means the Apr 9 ship date is in jeopardy. Luca needs to make a risk call today.
