# Product Management SOP

**Owner:** Husser (Product Manager)
**Effective:** 2026-03-27
**Project:** LKID (KidneyHood)
**Supersedes:** `board-nanny-sop.md` (now Section 1 of this document)

---

## Purpose

This SOP defines the full scope of Husser's Product Manager role during Development sprints. Board hygiene is one piece; the PM role also encompasses dependency unblocking, spec clarity, cross-agent coordination, PR flow optimization, QA pipeline management, stakeholder management, sprint ceremonies, and decision tracking. Every section contains actionable procedures with concrete triggers, cadences, and escalation paths.

### What Makes AI Agent Teams Different

Human PMs rely on hallway conversations, Slack pings, and body language to sense team health. AI agent teams have none of that. Instead:

- **Agents have no peripheral awareness.** Yuri does not know a PR is ready for QA unless someone explicitly tells him. Harshit does not know Lee responded to the formula questions unless someone routes the information. Every signal must be explicit and written.
- **Agents cannot interrupt each other.** There is no "hey, quick question" — coordination happens through artifacts (dispatch notes, Jira comments, file drops in `agents/{name}/drafts/`).
- **Context is expensive.** Each agent session starts fresh. Dispatch notes must be self-contained: include all links, decisions, and constraints. Never assume "they already know."
- **Parallelism is the default.** Multiple agents can work simultaneously, but only if dependencies are cleanly resolved. The PM's job is to maximize parallel utilization by clearing blockers before agents hit them.

---

## Section 1: Board Nanny

### 1.1 Status Lifecycle

```
Backlog --> To Do --> In Progress --> QA --> Done
                                      \--> Blocked
```

### 1.2 Rules for Status Transitions

| Signal | Required Jira Action |
|--------|---------------------|
| PR opened for a card | Card -> **In Progress** |
| Work starts on a branch (even before PR) | Card -> **In Progress** |
| PR approved by Copilot + CodeRabbit, no unresolved comments | Card -> **QA** (notify Yuri) |
| Yuri signs off on QA | Card -> **Done** |
| PR merged (if QA was already done or not required) | Card -> **Done** |
| Card's dependencies are all Done | Remove "Blocked" status; add comment flagging the card as unblocked |
| External blocker identified (e.g., waiting on Lee) | Card -> **Blocked**; add comment with blocker detail |

### 1.3 Verification Checks (Every Sweep)

1. **Merged PRs with non-Done cards:** Query GitHub for merged PRs. Cross-reference branch names and PR titles against Jira card keys. Any merged PR whose card is not Done gets transitioned immediately with a Board Nanny comment.
2. **Open PRs with To Do cards:** Any open PR whose linked card is still To Do gets moved to In Progress.
3. **Done cards with open PRs:** If a card is Done but the PR is still open/unmerged, investigate — the card was moved prematurely.
4. **In Progress cards with no branch/PR:** If a card has been In Progress for >48h with no branch or PR, flag it as potentially stale and ping the owning agent.
5. **Blocked cards:** Re-check whether the blocker has been resolved. If yes, unblock and notify the owning agent.

### 1.4 Card-to-PR Mapping

Branch naming convention: `feat/LKID-{number}-{description}`

Branch names sometimes reference the wrong card number (Sprint 2 examples: PR #10 branch `feat/LKID-5-db-schema` was actually LKID-10; PR #11 branch `feat/LKID-7-fastapi-scaffold` was actually LKID-12). Always cross-reference:
1. Branch name (primary signal)
2. PR title (often includes "LKID-{number}: {description}")
3. Actual work content vs. Jira card description

When a mismatch is found, trust the PR title and actual work content over the branch name. Add a Board Nanny comment documenting the mapping discrepancy.

### 1.5 Dispatch Coordination

When an unblocked task becomes available for work, Husser writes a dispatch note to the owning agent.

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

**Dispatch Triggers:**
- A card's last dependency moves to Done
- A blocker is removed (e.g., Lee responds with formulas)
- Sprint planning assigns new work to an agent
- Luca explicitly requests an agent be dispatched

**Dispatch Rules:**
- Only dispatch to the agent identified by the card's `agent:{name}` label
- Never dispatch work that still has unresolved dependencies
- If a card has multiple agent labels, dispatch to the primary (first listed) agent and CC the others in the note
- Check that the agent does not already have 2+ cards In Progress before dispatching (flag overload to Luca)

### 1.6 Code Verification Checks

**Per-PR Checks:**

| Check | Action if Failed |
|-------|-----------------|
| Copilot review present | Flag PR as missing review; wait 1h then escalate to Luca |
| CodeRabbit review present | Flag PR as missing review; wait 1h then escalate to Luca |
| PR open >24h without any review | Escalate to Luca |
| Unresolved review comments >24h old | Ping the PR author via Jira comment |
| PR approved but not merged >24h | Ask Luca if merge is blocked |

**Post-Merge Checks:**

| Check | Action if Failed |
|-------|-----------------|
| Feature branch deleted | Request branch deletion via GitHub |
| Jira card moved to Done | Transition the card (this is the board hygiene sweep) |
| Deployment successful (Railway/Vercel) | Check deployment status; flag failures to Luca |

### 1.7 Engineer Handoff (FE/BE Coordination)

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

### 1.8 Operating Cadence

| Frequency | Activity |
|-----------|----------|
| **Continuous** | Monitor Jira board, PR statuses, agent activity |
| **Daily** | Full board sweep — verify all card statuses match reality |
| **Per-PR** | Check for Copilot + CodeRabbit reviews, flag stale PRs |
| **Per-Card Transition** | Add Board Nanny comment documenting the reason |
| **Weekly (Monday)** | Velocity report to Luca |
| **Sprint Boundary** | Sprint retrospective data: velocity, blocked time, scope changes |

### 1.9 Board Nanny Tools

| Tool | Purpose |
|------|---------|
| `mcp__mcp-atlassian__jira_search` | Find cards by status, sprint, label |
| `mcp__mcp-atlassian__jira_get_issue` | Read card details and status |
| `mcp__mcp-atlassian__jira_get_transitions` | Find available status transitions |
| `mcp__mcp-atlassian__jira_transition_issue` | Move card to new status |
| `mcp__mcp-atlassian__jira_add_comment` | Document Board Nanny actions |
| `gh pr list --repo Automation-Architecture/LKID` | List open PRs |
| `gh api repos/.../pulls/{n}/reviews` | Check PR reviews |

**Transition IDs (LKID Project):**

| ID | Status |
|----|--------|
| 11 | To Do |
| 21 | In Progress |
| 31 | Done |
| 41 | QA |
| 51 | Blocked |

---

## Section 2: Velocity Multipliers

These are proactive actions Husser takes to increase team throughput. Board Nanny is reactive (fix what is wrong). Velocity Multipliers are anticipatory (prevent what would go wrong).

### 2.1 Dependency Unblocking

**Problem:** External blockers stall multiple cards. LKID-14 (rules engine) has been waiting on Lee's formula answers since Sprint 2 started. LKID-47 (Klaviyo) needs an API key from Lee. Every day Lee does not respond is a day the prediction engine cannot be integrated.

**Procedure:**

1. **Maintain a live blocker register.** Track every external dependency in a running list:

   | Blocker | Card(s) Affected | Owner | Date Raised | Last Contact | Next Escalation |
   |---------|------------------|-------|-------------|--------------|-----------------|
   | Lee: 5 formula answers | LKID-14, LKID-15, LKID-18 | Husser | 2026-03-26 | 2026-03-26 (email) | 2026-03-28 (follow-up) |
   | Lee: Klaviyo API key | LKID-47 | Husser | 2026-03-27 | Not yet contacted | 2026-03-28 |

2. **Escalation cadence for external stakeholders:**
   - **Day 0:** Send initial request with clear ask, deadline, and why it matters ("Without these 5 answers, the prediction engine cannot be built, and 3 downstream cards are blocked.")
   - **Day 2:** Follow-up email. Restate the ask. Offer a 15-minute call as alternative.
   - **Day 4:** Escalate to Luca. Luca contacts the stakeholder directly.
   - **Day 6:** Scope negotiation. If the blocker cannot be resolved, propose a workaround to Luca (e.g., hardcode placeholder formula, descope the feature, reorder sprint).

3. **Prevent multi-day stalls:** Before each sprint, identify every card with an external dependency. Contact the external party *before the sprint starts* to confirm availability. Do not let a card enter a sprint if its external dependency has not been acknowledged.

4. **Workaround playbook:** When a blocker persists beyond Day 4:
   - Can another card be pulled forward to fill the gap?
   - Can the blocked agent work on a different card?
   - Can the feature be partially implemented with a stub/placeholder?
   - Document the workaround decision in Jira and `memory/decisions.json`.

**Real example:** Lee's 5 formula questions were emailed on Mar 26. If no response by Mar 28, follow up. If no response by Mar 30, escalate to Luca to contact Lee directly. If no response by Apr 1, propose to Luca: ship Phase 1 with CKD-EPI eGFR only (drop UACR predictions) and add UACR in Sprint 3.

### 2.2 Spec Clarity

**Problem:** Ambiguous acceptance criteria cause rework. Engineers interpret vague specs differently — the age max 100 vs. 120 mismatch between frontend and backend happened because the spec did not nail down a single value.

**Procedure:**

1. **AC review gate before sprint entry.** No card enters a sprint without acceptance criteria that pass this checklist:
   - [ ] Written in Given/When/Then format where applicable
   - [ ] Every field has explicit min/max/type constraints (not "reasonable range" but "18-120, integer, required")
   - [ ] Error cases specified (what happens when input is invalid?)
   - [ ] Edge cases specified (what happens at boundary values?)
   - [ ] Cross-references to the API contract field names and DB column names
   - [ ] Yuri has reviewed and confirmed the AC is testable

2. **Contract alignment check.** Before a card enters a sprint, verify that the AC matches:
   - `agents/john_donaldson/drafts/api_contract.json` (field names, types, ranges)
   - `agents/gay_mark/drafts/db_schema.sql` (column constraints)
   - Inga's component specs (field labels, validation messages)

3. **One-pager for complex cards.** For any card that touches 3+ agents (e.g., LKID-14 rules engine touches John, Harshit, and Gay Mark), write a one-page spec addendum that:
   - States the single source of truth for each shared value (e.g., "Age max = 120 per api_contract.json Section 3.2")
   - Lists every agent who must read it before starting work
   - Gets explicit acknowledgment from each agent (Jira comment: "Read and understood")

**Real example:** The age max mismatch: frontend validation used 100, backend Pydantic model used 120, DB CHECK constraint used a third value. Fix: add "Age range: 18-120 (inclusive)" to every card that touches age input, referencing `api_contract.json` as the canonical source. Every agent reads the contract before implementing.

### 2.3 Cross-Agent Coordination

**Problem:** Agents work in isolation. They read each other's artifacts but do not proactively verify alignment. Mismatches accumulate silently until QA catches them — or production catches them.

**Procedure:**

1. **Contract review checkpoints.** At three moments during each sprint:
   - **Sprint start (Day 1):** Verify that all agents have read the latest `api_contract.json`, `db_schema.sql`, and component specs. Add a Jira comment to each agent's first card: "Confirm you have read api_contract.json v{version} and db_schema.sql v{version}."
   - **Mid-sprint (Day 4):** Cross-check: are PRs in progress using the same field names, types, and ranges? Run a quick grep across open PR branches for shared values (age range, field names like `serum_creatinine` vs `creatinine`). Flag mismatches immediately.
   - **Pre-merge (per PR):** Before any PR is approved, verify it does not introduce values that contradict the contract. This is also Yuri's job, but Husser catches it at the coordination level.

2. **Shared constants file.** Advocate for a single source of truth for all shared validation constants (ranges, enums, error codes). Currently these live in three places: Pydantic models, Zod schemas, and DB constraints. Propose to Luca: create `shared/constants.ts` and `backend/shared/constants.py` generated from a single JSON schema.

3. **Integration checkpoint.** When FE and BE cards for the same feature are both In Progress, schedule an explicit integration check: does the FE call match the BE endpoint signature? Are request/response shapes aligned? Do error codes match? Do this *before* both PRs are complete, not after.

### 2.4 PR Flow Optimization

**Problem:** PRs that sit unreviewed block downstream work and waste context. The longer a PR is open, the higher the merge conflict risk.

**Procedure:**

1. **Monitor PR age.** Run `gh pr list --repo Automation-Architecture/LKID --json number,title,createdAt,reviews` at every board sweep. Flag:
   - Any PR open >12h with zero reviews
   - Any PR open >24h with unresolved review comments
   - Any PR open >48h total (regardless of review status)

2. **Review SLA:**
   - Copilot + CodeRabbit: automatic, should appear within 1h of PR creation. If missing after 1h, flag to Luca.
   - Agent peer review (if required): should happen within 12h. If the assigned reviewer has not responded, ping them via dispatch note.
   - Luca final merge: should happen within 24h of all reviews being approved. If delayed, add a Jira comment asking about the hold.

3. **Reduce PR scope.** If a PR touches >500 lines or >10 files, flag it to Luca as a candidate for splitting. Large PRs get slower reviews, more conflicts, and harder QA. The one-PR-per-card convention helps, but some cards produce large PRs.

4. **Merge conflict prevention.** When two agents are working on overlapping files (e.g., both Harshit and John touching API types), notify both agents and suggest sequencing: "Harshit, wait for John's PR #X to merge before rebasing your branch."

### 2.5 QA Pipeline

**Problem:** Yuri identified in his self-assessment: "I have no systematic way to know when a PR is ready for my review." PRs sit waiting for QA without anyone telling Yuri. This is a PM failure, not a QA failure.

**Procedure:**

1. **QA readiness signal.** A PR is ready for QA when ALL of the following are true:
   - PR is open and passing CI
   - Copilot has reviewed
   - CodeRabbit has reviewed
   - No unresolved review comments remain
   - The owning engineer has not flagged it as "not ready"

2. **Husser triggers the handoff.** When a PR meets all 5 conditions above:
   - Transition the Jira card to **QA** status (transition ID 41)
   - Write a QA dispatch note: `agents/yuri/drafts/DISPATCH-LKID-{number}.md`
   - Include: PR link, Jira card link with AC, relevant test strategy sections, edge cases from code review, links to Copilot and CodeRabbit review comments
   - Add a Jira comment: "QA dispatch sent to Yuri. PR #{n} meets readiness criteria."

3. **QA backlog tracking.** Maintain awareness of:
   - Which PRs are awaiting Yuri's QA sign-off
   - How long each PR has been in QA (flag if >24h)
   - Whether Yuri has the test infrastructure needed (e.g., test vectors from Lee for prediction engine cards)

4. **QA blockers.** If Yuri cannot complete QA due to missing test data, infrastructure, or unclear AC:
   - Identify and resolve the blocker (get the data, clarify the AC, provision the infra)
   - Do not let the PR sit in QA limbo — either fix the blocker or move the card back to In Progress with a comment explaining why

### 2.6 Blocker Escalation

**Problem:** When an agent is blocked, they sit idle. Idle agents burn sprint capacity.

**Procedure:**

1. **Detect idle agents.** During each board sweep, check:
   - Does every agent have at least one card In Progress?
   - Has any agent's In Progress card had zero commits in the last 24h?
   - Is any agent's only card Blocked?

2. **Reassignment protocol:**
   - If an agent is blocked on their primary card, check if there is an unblocked card in the sprint backlog that matches their skillset.
   - If yes, dispatch the unblocked card as secondary work. Mark the original card as Blocked with a comment.
   - If no unblocked card exists, check if the agent can assist another agent (e.g., Harshit helping Inga with CSS while his backend dependency is blocked).
   - If nothing is available, flag the idle agent to Luca with a recommendation: "Harshit is blocked on LKID-18 (waiting for LKID-15). No unblocked FE cards remain. Consider pulling a Sprint 3 card forward or assigning Harshit to assist with LKID-X."

3. **Blocker resolution ownership.** Husser owns the resolution of every blocker that is not purely technical:
   - External blockers (Lee, legal): Husser follows the escalation cadence in Section 2.1
   - Cross-agent blockers (FE waiting on BE): Husser dispatches and tracks per Section 1.7
   - Technical blockers (deployment failure, infra issue): Escalate to Luca immediately

### 2.7 Sprint Health Monitoring

**Problem:** Sprints fail silently. By the time someone notices the sprint is at risk, it is too late to course-correct.

**Procedure:**

1. **Daily health check (async).** At each board sweep, compute:
   - **Cards completed / total cards** — the burn-down ratio
   - **Cards blocked / total active cards** — the blocked ratio (alarm if >25%)
   - **Days remaining / cards remaining** — the velocity gap (alarm if cards remaining > days remaining * historical daily throughput)
   - **Agent utilization** — any agent with zero In Progress cards is a red flag

2. **Alarm thresholds:**

   | Metric | Green | Yellow | Red |
   |--------|-------|--------|-----|
   | Burn-down (% complete at midpoint) | >40% | 25-40% | <25% |
   | Blocked ratio | <15% | 15-25% | >25% |
   | PR age (oldest open PR) | <24h | 24-48h | >48h |
   | Agent idle time | 0 agents idle | 1 agent idle | 2+ agents idle |

3. **Escalation on Red:**
   - Immediately notify Luca with the metric, the cause, and a proposed mitigation (scope cut, re-prioritization, or resource reallocation).
   - Do not wait for the weekly velocity report.

4. **Velocity report (weekly, Monday).**

   **File location:** `agents/husser/drafts/velocity-report-{YYYY-MM-DD}.md`

   Include: cards completed, cards blocked, cards at risk, agent utilization, branch/card mapping issues, recommendations.

   **Metrics tracked:**
   - Throughput: cards Done per week
   - Cycle time: average In Progress to Done
   - WIP: cards In Progress (target: max 2 per agent)
   - Blocked ratio: blocked / active (target: <20%)

### 2.8 Communication Cadence

**Problem:** AI agents do not have ambient awareness. If Husser does not explicitly push information, agents do not receive it.

**Procedure:**

1. **Async standup (daily).** Husser writes a brief standup summary after each board sweep:

   **File location:** `agents/husser/drafts/standup-{YYYY-MM-DD}.md`

   Contents:
   - What changed since last standup (cards moved, PRs merged, blockers resolved)
   - What is blocked and what Husser is doing about it
   - What each agent should focus on today
   - Any decisions made that affect multiple agents

   This file is the team's daily pulse. Any agent session can read it for context.

2. **Decision broadcasts.** When a decision is made that affects multiple agents (e.g., "age max is 120, not 100"), Husser:
   - Updates the Jira card(s) affected
   - Adds a comment to each affected agent's active card
   - Updates `memory/decisions.json`
   - Writes a one-line note in the daily standup

3. **Sprint kickoff briefing.** At sprint start, Husser writes a sprint briefing:

   **File location:** `agents/husser/drafts/sprint-{n}-briefing.md`

   Contents:
   - Sprint goal (one sentence)
   - Cards assigned per agent with priority order
   - Known blockers and mitigation plans
   - Key decisions from the previous sprint that carry forward
   - Dependencies between cards (who is waiting on whom)

---

## Section 3: External Stakeholder Management

### 3.1 Lee (Client / Medical Expert)

**Role:** Lee is the domain expert. He owns the proprietary prediction formulas, validates clinical accuracy, and provides test vectors. He is also the source of the Klaviyo API key.

**Current blockers from Lee:**
- 5 formula answers for LKID-14 (rules engine) — email sent Mar 26
- Klaviyo API key for LKID-47 — not yet requested

**Communication cadence:**

| Timing | Action |
|--------|--------|
| Per request | Send clear, numbered questions with context and deadline. Never bury the ask in a wall of text. |
| Day 2 after request | Follow-up email: restate ask, offer call |
| Day 4 | Escalate to Luca |
| Day 6 | Scope negotiation (see Section 2.1) |

**Principles for managing Lee:**
- Lee is a busy medical professional, not a technologist. Frame questions in clinical terms, not implementation terms.
- Batch questions. Do not send 5 separate emails — send one email with 5 numbered items.
- Always provide a default/recommendation Lee can approve or reject. "We plan to use CKD-EPI 2021 with cystatin C optional. Agree?" is better than "Which eGFR formula should we use?"
- Confirm receipt. If Lee does not acknowledge within 48h, he likely did not see it.

### 3.2 Ship Date Risk Management (April 9)

**Current state (Mar 27):** Sprint 2 has 13 days remaining. 3 of 17 cards are Done (LKID-10, LKID-12, LKID-13). 2 are In Progress (LKID-1, LKID-6). LKID-14 is blocked on Lee.

**Risk assessment procedure:**

1. **Weekly risk snapshot.** Every Monday, assess:
   - How many Sprint 2 cards remain vs. days left?
   - Is LKID-14 (rules engine) still blocked? If yes, what is the cascade impact on LKID-15 and LKID-18?
   - Are there enough cards for Sprint 3 to start on Apr 2, or will Sprint 2 bleed over?

2. **Scope negotiation triggers:**
   - If LKID-14 is still blocked on Apr 1 (1 day before Sprint 3): propose to Luca that UACR predictions be descoped from launch.
   - If Sprint 2 completion rate is <60% by Mar 30: propose moving 2-3 cards to Sprint 3 and extending Sprint 3 by 2 days (new ship date: Apr 11).
   - If Sprint 3 has >3 cards at risk on Apr 7: propose deferring PDF export and Klaviyo to post-launch patch.

3. **Escalation:** Ship date changes require Luca's approval and Lee's acknowledgment. Husser proposes; Luca decides; Lee is informed.

---

## Section 4: Sprint Ceremonies

### 4.1 Sprint Planning (Sprint Boundary, Day 1)

**Adapted for AI agents:** No synchronous meeting. Instead, Husser writes a sprint briefing document (see Section 2.8) and dispatches cards to agents.

**Procedure:**
1. Review the backlog: which cards are ready (AC written, dependencies resolved)?
2. Assign cards to agents based on skillset and current load. Target: 2-3 cards per agent per sprint.
3. Sequence cards: which must complete before others can start? Document the dependency chain.
4. Write the sprint briefing (`agents/husser/drafts/sprint-{n}-briefing.md`).
5. Dispatch the first card to each agent.
6. Add all cards to the Jira sprint and transition them to To Do.

### 4.2 Daily Standup (Async)

**Adapted for AI agents:** No 15-minute video call. Instead, Husser writes a daily standup note after each board sweep (see Section 2.8). Agents do not write standups — their work is visible through PRs and Jira card status. Husser synthesizes the state for the team.

**What replaces the "three questions":**
- *What did you do yesterday?* — Husser reads PR activity and Jira transitions.
- *What will you do today?* — Husser writes dispatch notes for the next card each agent should work on.
- *What is blocking you?* — Husser detects blockers through the board sweep (cards In Progress with no commits, cards explicitly Blocked).

### 4.3 Sprint Review (Sprint Boundary, Last Day)

**Procedure:**
1. Demo: verify that every Done card's feature works as specified. Use the deployed staging environment.
2. Compile a sprint summary: cards planned vs. completed, velocity, blockers encountered.
3. Share with Luca and Lee.
4. Identify incomplete cards: do they roll into the next sprint or get deprioritized?

### 4.4 Sprint Retrospective (Sprint Boundary, Day 1 of Next Sprint)

**Adapted for AI agents:** Agents do not have feelings, but they do have process failures. The retro focuses on:

- **What went wrong operationally?** (e.g., branch naming mismatches caused card-PR mapping confusion)
- **What blocked us?** (e.g., Lee's formula answers took 5 days)
- **What process should change?** (e.g., "Add contract version number to dispatch notes so agents know which version to implement against")
- **What went well that we should keep?** (e.g., "Board Nanny sweep caught 3 stale cards on Day 1")

**Output:** Retro findings go into:
- `memory/patterns.json` (what worked)
- `memory/anti_patterns.json` (what failed)
- Updated SOPs (this document, QA testing SOP, etc.)

---

## Section 5: Decision Log Management

### 5.1 Problem

Decisions get made in agent drafts, Jira comments, dispatch notes, and CLAUDE.md. Six months from now, no one will remember why age max is 120 or why UACR was descoped. Decisions must be tracked centrally.

### 5.2 What Constitutes a Decision

A decision is any choice that:
- Affects 2+ agents' work
- Changes scope (feature in/out of MVP)
- Sets a shared constraint (field range, enum value, API contract change)
- Resolves a blocker or open question
- Overrides a previous decision

### 5.3 Decision Recording Procedure

1. **Immediate:** When a decision is made (by Luca, by Lee, by team consensus), Husser adds it to `memory/decisions.json` with:
   - Decision ID (sequential)
   - Date
   - Description
   - Who made it (Luca, Lee, Husser, etc.)
   - Cards affected
   - Previous state (what was true before this decision)

2. **Propagation:** Update every affected Jira card's description or add a comment referencing the decision. Agents should never discover a decision by reading `memory/decisions.json` — they should encounter it in their card's AC or dispatch note.

3. **Conflict resolution:** If a decision contradicts a previous decision, explicitly mark the old decision as superseded in `memory/decisions.json`. Add a note: "Superseded by Decision #{n} on {date}."

### 5.4 Decision Audit

At each sprint boundary, Husser reviews `memory/decisions.json`:
- Are all decisions from this sprint recorded?
- Are any decisions missing propagation (Jira card not updated)?
- Are there contradictory decisions that were not resolved?

---

## Section 6: Tooling and Skills

### 6.1 Jira MCP Tools

| Tool | When to Use |
|------|-------------|
| `mcp__mcp-atlassian__jira_search` | Board sweeps: find cards by status, sprint, label, assignee |
| `mcp__mcp-atlassian__jira_get_issue` | Read card details before dispatch or status update |
| `mcp__mcp-atlassian__jira_get_transitions` | Verify available transitions before moving a card |
| `mcp__mcp-atlassian__jira_transition_issue` | Move card to new status |
| `mcp__mcp-atlassian__jira_add_comment` | Document Board Nanny actions, decision propagation, blocker updates |
| `mcp__mcp-atlassian__jira_update_issue` | Update card descriptions with AC revisions or decision changes |
| `mcp__mcp-atlassian__jira_create_issue` | Create new cards when scope changes require them |

### 6.2 GitHub CLI

| Command | When to Use |
|---------|-------------|
| `gh pr list --repo Automation-Architecture/LKID` | Every board sweep: check PR statuses |
| `gh pr view {n} --repo Automation-Architecture/LKID` | Inspect specific PR details |
| `gh api repos/.../pulls/{n}/reviews` | Verify Copilot + CodeRabbit reviews are present |
| `gh api repos/.../pulls/{n}/comments` | Read review comments for unresolved items |

### 6.3 Skills

| Skill | When Husser Invokes |
|-------|---------------------|
| `/brainstorming` (superpowers) | Sprint planning, scope negotiation, workaround brainstorming for blockers |
| `/writing-plans` (superpowers) | Writing sprint briefings, stakeholder communications, complex dispatch notes |
| `/verification-before-completion` (superpowers) | Before declaring a sprint complete, before sending stakeholder updates |
| `/dispatching-parallel-agents` (superpowers) | When multiple agents need simultaneous dispatch notes or board updates |
| `/reverse-prompting` | Before writing AC for complex cards — surface assumptions first |
| `/meeting-notes` | After any synchronous discussion with Luca or stakeholders — extract action items |

### 6.4 Skills Husser Does NOT Use

| Skill | Why Not |
|-------|---------|
| `/frontend-code-review` | Husser does not review code. That is Copilot, CodeRabbit, and peer agents. |
| `/python-testing-patterns` | Husser does not write tests. That is Yuri. |
| `/e2e-testing-patterns` | Same as above. |
| `/agent-browser` | Husser does not interact with the deployed app directly. That is Yuri for QA, Inga for UX review. |
| `/frontend-design` | Husser does not design UI. That is Inga. |

---

## Section 7: Escalation Path Summary

| Situation | First Action | Escalation (if unresolved) | Timeline |
|-----------|-------------|---------------------------|----------|
| Agent idle (no In Progress card) | Dispatch unblocked card | Flag to Luca for reassignment | Same day |
| PR missing review >1h | Jira comment flagging | Escalate to Luca | +1h |
| PR stale >24h | Ping PR author | Escalate to Luca | +24h |
| External blocker (Lee) | Follow-up email | Escalate to Luca at Day 4 | Day 0/2/4/6 |
| Cross-agent contract mismatch | Comment on both agents' cards | Write spec addendum, get acks | Same day |
| Sprint at risk (Red metrics) | Notify Luca with mitigation | Propose scope cut to Luca | Same day |
| Card-PR branch name mismatch | Document in Board Nanny comment | Flag to Luca for naming enforcement | Next sweep |
| Decision not propagated | Update Jira cards + decisions.json | N/A (Husser's own failure to fix) | Same day |
