> **SUPERSEDED:** This SOP has been incorporated into the comprehensive Product Management SOP at `agents/husser/drafts/product-management-sop.md` (Section 1: Board Nanny). This file is retained for historical reference only. All future updates should be made to the PM SOP.

# Board Nanny SOP

**Owner:** Husser (Product Manager)
**Effective:** 2026-03-27
**Project:** LKID (KidneyHood)
**Board:** [LKID Board](https://automationarchitecture.atlassian.net/jira/software/c/projects/LKID/boards/363)

---

## Purpose

The Board Nanny is a continuous operational role ensuring the LKID Jira board reflects reality at all times. Stale cards erode trust in the board, block downstream work, and hide velocity problems. This SOP defines what Husser monitors, how statuses are corrected, and how handoffs between agents are coordinated.

---

## 1. Board Hygiene

### Status Lifecycle

```
Backlog --> To Do --> In Progress --> QA --> Done
                                       \--> Blocked
```

### Rules for Status Transitions

| Signal | Required Jira Action |
|--------|---------------------|
| PR opened for a card | Card -> **In Progress** |
| Work starts on a branch (even before PR) | Card -> **In Progress** |
| PR approved by Copilot + CodeRabbit, no unresolved comments | Card -> **QA** (notify Yuri) |
| Yuri signs off on QA | Card -> **Done** |
| PR merged (if QA was already done or not required) | Card -> **Done** |
| Card's dependencies are all Done | Remove "Blocked" status; add comment flagging the card as unblocked |
| External blocker identified (e.g., waiting on Lee) | Card -> **Blocked**; add comment with blocker detail |

### Verification Checks (Every Sweep)

1. **Merged PRs with non-Done cards:** Query GitHub for merged PRs. Cross-reference branch names and PR titles against Jira card keys. Any merged PR whose card is not Done gets transitioned immediately with a Board Nanny comment.
2. **Open PRs with To Do cards:** Any open PR whose linked card is still To Do gets moved to In Progress.
3. **Done cards with open PRs:** If a card is Done but the PR is still open/unmerged, investigate — the card was moved prematurely.
4. **In Progress cards with no branch/PR:** If a card has been In Progress for >48h with no branch or PR, flag it as potentially stale and ping the owning agent.
5. **Blocked cards:** Re-check whether the blocker has been resolved. If yes, unblock and notify the owning agent.

### How to Identify Card-to-PR Mapping

Branch naming convention: `feat/LKID-{number}-{description}`

However, branch names sometimes reference the wrong card number (see initial cleanup log below). Always cross-reference:
1. Branch name (primary signal)
2. PR title (often includes "LKID-{number}: {description}")
3. Actual work content vs. Jira card description

When a mismatch is found, trust the PR title and actual work content over the branch name. Add a Board Nanny comment documenting the mapping discrepancy.

---

## 2. Dispatch Coordination

When an unblocked task becomes available for work, Husser writes a dispatch note to the owning agent.

### Dispatch Note Format

**File location:** `agents/{agent_name}/drafts/DISPATCH-LKID-{number}.md`

**Template:**

```markdown
# DISPATCH: LKID-{number} — {card summary}

**Date:** {YYYY-MM-DD}
**Agent:** {agent name}
**Card:** [LKID-{number}](https://automationarchitecture.atlassian.net/browse/LKID-{number})
**Priority:** {from Jira}

## Summary
{1-2 sentence description of what this card requires}

## Acceptance Criteria
{Copy from Jira card description}

## Dependencies Now Resolved
- LKID-{dep1} ({summary}) — Done as of {date}, PR #{number}
- LKID-{dep2} ({summary}) — Done as of {date}, PR #{number}

## Relevant Artifacts
- API contract: `agents/john_donaldson/drafts/api_contract.json`
- DB schema: `agents/gay_mark/drafts/db_schema.sql`
- {other relevant files}

## Notes
{Any context the agent needs — decisions made, constraints, gotchas}
```

### Dispatch Triggers

- A card's last dependency moves to Done
- A blocker is removed (e.g., Lee responds with formulas)
- Sprint planning assigns new work to an agent
- Luca explicitly requests an agent be dispatched

### Dispatch Rules

- Only dispatch to the agent identified by the card's `agent:{name}` label
- Never dispatch work that still has unresolved dependencies
- If a card has multiple agent labels, dispatch to the primary (first listed) agent and CC the others in the note
- Check that the agent does not already have 2+ cards In Progress before dispatching (flag overload to Luca)

---

## 3. QA Handoff

### When to Notify Yuri

A card is ready for QA when ALL of the following are true:
1. PR is open and passing CI
2. Copilot has reviewed (or been auto-assigned and reviewed)
3. CodeRabbit has reviewed
4. No unresolved review comments remain
5. The owning engineer has not flagged it as "not ready"

### QA Notification Format

Write a dispatch note: `agents/yuri/drafts/DISPATCH-LKID-{number}.md`

Include:
- Link to the PR
- Link to the Jira card with acceptance criteria
- Relevant sections from `agents/yuri/drafts/test_strategy.md`
- Any edge cases or known limitations flagged during code review
- Links to the Copilot and CodeRabbit review comments

### QA Tracking

Maintain awareness of:
- Which PRs are awaiting Yuri's QA sign-off
- How long each PR has been in QA (flag if >24h)
- Whether Yuri has the test infrastructure needed (e.g., test vectors from Lee for prediction engine cards)

---

## 4. Engineer Handoff (FE/BE Coordination)

### Backend -> Frontend Unblocking

When a backend card moves to Done, check which frontend cards were waiting on it:

| Backend Card (Done) | Frontend Card (Now Unblocked) |
|---------------------|-------------------------------|
| LKID-12: Bootstrap FastAPI | LKID-18: Connect form to POST /predict (partially) |
| LKID-10: Create leads table | LKID-11: Write name/lab values to leads table |
| LKID-15: POST /predict endpoint | LKID-18: Connect form to POST /predict |
| LKID-14: Rules engine integration | LKID-15: POST /predict (dependency) |
| LKID-6: Configure Clerk | LKID-7: Build magic link form, LKID-8: Handle magic link click |

When a backend dependency resolves:
1. Move the newly-unblocked frontend card from Blocked to To Do (or In Progress if the agent is available)
2. Write a dispatch note to the frontend agent
3. Include the API contract, endpoint URL, and any deployment details

### Frontend -> Backend Escalation

If a frontend agent needs a contract or endpoint that the backend has not published:
1. Check if there is a Jira card for the backend work
2. If yes, check its status and flag it to the owning backend agent
3. If no card exists, escalate to Luca for card creation and prioritization

---

## 5. Code Verification Checks

### Per-PR Checks

For every open PR in the LKID repo:

| Check | Action if Failed |
|-------|-----------------|
| Copilot review present | Flag PR as missing review; wait 1h then escalate to Luca |
| CodeRabbit review present | Flag PR as missing review; wait 1h then escalate to Luca |
| PR open >24h without any review | Escalate to Luca |
| Unresolved review comments >24h old | Ping the PR author via Jira comment |
| PR approved but not merged >24h | Ask Luca if merge is blocked |

### Post-Merge Checks

| Check | Action if Failed |
|-------|-----------------|
| Feature branch deleted | Request branch deletion via GitHub |
| Jira card moved to Done | Transition the card (this is the board hygiene sweep) |
| Deployment successful (Railway/Vercel) | Check deployment status; flag failures to Luca |

### How to Check Reviews

```
# List reviews on a PR
gh api repos/Automation-Architecture/LKID/pulls/{number}/reviews \
  --jq '.[] | "\(.user.login): \(.state)"'

# List review comments
gh api repos/Automation-Architecture/LKID/pulls/{number}/comments \
  --jq '.[] | "\(.user.login): \(.body[0:200])"'
```

---

## 6. Velocity Reporting

### Weekly Report (Delivered to Luca Every Monday)

**File location:** `agents/husser/drafts/velocity-report-{YYYY-MM-DD}.md`

**Template:**

```markdown
# Velocity Report — Week of {date}

## Cards Completed This Week
| Card | Summary | Agent | PR | Merged |
|------|---------|-------|-----|--------|

## Cards Currently Blocked
| Card | Summary | Blocker | Days Blocked | Escalation |
|------|---------|---------|--------------|------------|

## Cards At Risk (Sprint Deadline: {date})
| Card | Summary | Risk | Mitigation |
|------|---------|------|------------|

## Agent Utilization
| Agent | In Progress | Done This Week | Idle? | Notes |
|-------|------------|----------------|-------|-------|

## Branch/Card Mapping Issues Found
{Document any mismatches between branch names and Jira card numbers}

## Recommendations
{Prioritization changes, scope adjustments, blocker escalations}
```

### Velocity Metrics

- **Throughput:** Cards moved to Done per week
- **Cycle Time:** Average time from In Progress to Done
- **WIP:** Cards currently In Progress (target: max 2 per agent)
- **Blocked Ratio:** Blocked cards / total active cards (target: <20%)

---

## 7. Operating Cadence

| Frequency | Activity |
|-----------|----------|
| **Continuous** | Monitor Jira board, PR statuses, agent activity |
| **Daily** | Full board sweep — verify all card statuses match reality (GitHub PRs, branches, deployments) |
| **Per-PR** | Check for Copilot + CodeRabbit reviews, flag stale PRs, confirm branch cleanup post-merge |
| **Per-Card Transition** | Add Board Nanny comment documenting the reason for the transition |
| **Weekly (Monday)** | Velocity report to Luca |
| **Sprint Boundary** | Sprint retrospective data: velocity, blocked time, scope changes |

---

## 8. Tools

| Tool | Purpose | MCP Function |
|------|---------|-------------|
| Jira — Search | Find cards by status, sprint, label | `mcp__mcp-atlassian__jira_search` |
| Jira — Get Issue | Read card details and status | `mcp__mcp-atlassian__jira_get_issue` |
| Jira — Get Transitions | Find available status transitions | `mcp__mcp-atlassian__jira_get_transitions` |
| Jira — Transition Issue | Move card to new status | `mcp__mcp-atlassian__jira_transition_issue` |
| Jira — Add Comment | Document Board Nanny actions | `mcp__mcp-atlassian__jira_add_comment` |
| GitHub — List PRs | `gh pr list --repo Automation-Architecture/LKID` | CLI |
| GitHub — PR Reviews | `gh api repos/.../pulls/{n}/reviews` | CLI |
| GitHub — Branches | `gh api repos/.../branches` | CLI |

### Transition IDs (LKID Project)

| ID | Status |
|----|--------|
| 11 | To Do |
| 21 | In Progress |
| 31 | Done |
| 41 | QA |
| 51 | Blocked |

---

## 9. Initial Board Cleanup Log (2026-03-27)

First Board Nanny sweep performed at project onboarding. Findings and corrections:

| Card | Before | After | Reason |
|------|--------|-------|--------|
| LKID-10 | To Do | **Done** | PR #10 merged (leads table migration). Branch was named `feat/LKID-5-db-schema` — card number mismatch in branch. |
| LKID-12 | To Do | **Done** | PR #11 merged (FastAPI scaffold on Railway). Branch was named `feat/LKID-7-fastapi-scaffold` — card number mismatch in branch. |
| LKID-13 | To Do | **Done** | GET /health endpoint implemented as part of PR #11. Code confirmed in `backend/main.py` and `backend/tests/test_health.py`. |
| LKID-1 | To Do | **In Progress** | Epic for Auth & Lead Capture. PR #12 is open (`feat/LKID-1-clerk-auth`). |
| LKID-6 | To Do | **In Progress** | Configure Clerk for magic-link auth. Work included in PR #12. |
| LKID-8 | In Progress | **In Progress** (no change) | Handle magic link click. Part of active Clerk auth work. Status correct. |
| LKID-40 | Done | **Done** (no change) | Dashboard scaffolding. Already correct. |
| LKID-39 | Done | **Done** (no change) | Client dashboard mockup. Already correct. |

### Branch Naming Discrepancies Found

- PR #10 branch `feat/LKID-5-db-schema` references LKID-5 ("Polish & QA" epic), but actual work was LKID-10 ("Create leads table").
- PR #11 branch `feat/LKID-7-fastapi-scaffold` references LKID-7 ("Build magic link email entry form"), but actual work was LKID-12 ("Bootstrap FastAPI project with Railway deployment").
- PR #9 branch `feat/LKID-39-client-dashboard` but CLAUDE.md references LKID-40. PR #9 actually maps to both LKID-39 (design) and LKID-40 (scaffolding).

### Post-Merge Branch Cleanup

All merged feature branches have been deleted. Only `feat/LKID-1-clerk-auth` (open PR #12) and `main` remain.

---

## 10. Escalation Path

1. **Agent idle or blocked:** Comment on the Jira card, write dispatch note
2. **Review missing >1h:** Flag in Jira comment
3. **Review missing >24h or PR stale >24h:** Escalate to Luca
4. **Sprint deadline risk:** Include in weekly velocity report with mitigation proposal
5. **Cross-team dependency conflict:** Escalate to Luca for prioritization decision
6. **Branch/card mismatch:** Document in Board Nanny comment, flag to Luca for naming convention enforcement
