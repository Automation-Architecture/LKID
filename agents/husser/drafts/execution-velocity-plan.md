# Execution Velocity Plan -- Sprint 2 War Room

**Author:** Husser (Product Manager)
**Date:** 2026-03-27
**Status:** ACTIVE -- supersedes all SOPs for the next 5 days
**Ship date:** April 9, 2026 (13 calendar days)
**Sprint 2 closes:** April 2 (6 days)

---

## The Brutal Truth

It is Day 2 of Sprint 2. We have shipped 3 of 17 cards. 12 cards are still To Do. Two agents are idle. One PR has been open for a day with known QA issues that take 10 minutes to fix. We have produced more SOPs, dispatch docs, and process artifacts than lines of production code this sprint.

The execution gap is not a planning failure. The plans are good. The dispatch docs are thorough. The gap is that **nobody is executing the dispatches.** Agents do not self-start. They sit in their folders with beautiful DISPATCH files that no one has acted on. Writing a dispatch note is not the same as shipping code. We confused the map for the territory.

**Starting now, the only artifact that matters is a merged PR.**

---

## 1. Parallel Execution Map -- Right Now

Every agent gets exactly ONE active task. When that task produces a PR, they get the next one. No multi-card juggling, no planning ahead, no documentation side quests.

### Harshit (Frontend Developer)

| Priority | Card | Task | Depends On | Target |
|----------|------|------|------------|--------|
| **NOW** | LKID-1 | Fix 5 QA issues on PR #12 (10 min of work) | Nothing | Mar 27 EOD |
| **NEXT** | LKID-16 | Build prediction form with lab value inputs | Nothing (mock data OK) | Mar 28 EOD |
| **THEN** | LKID-19 | Build Visx chart with 4 trajectory lines | Nothing (mock data OK) | Mar 29 EOD |
| **THEN** | LKID-18 | Connect form to POST /predict | LKID-15 (John) | Mar 30-31 |

Harshit is the bottleneck agent. He owns the most visible user-facing work. He must not touch any documentation, design review, or accessibility work until LKID-16 and LKID-19 have open PRs.

### John Donaldson (API Designer / Backend)

| Priority | Card | Task | Depends On | Target |
|----------|------|------|------------|--------|
| **NOW** | LKID-15 | POST /predict endpoint with placeholder trajectories | Nothing (formulas doc exists, use placeholder math) | Mar 28 EOD |
| **NEXT** | LKID-11 | Write prediction results to leads table | LKID-10 (Done) | Mar 29 |
| **THEN** | LKID-14 | Rules engine integration (real formulas) | Lee's answers OR fallback decision by Mar 30 | Mar 31 |

John has everything he needs for LKID-15 RIGHT NOW. The dispatch doc is written. The finalized-formulas.md is comprehensive. He builds the endpoint with placeholder trajectory math. Real coefficients slot in later. No waiting.

### Gay Mark (Database Engineer) -- CURRENTLY IDLE

| Priority | Card | Task | Depends On | Target |
|----------|------|------|------------|--------|
| **NOW** | LKID-6 | Configure Clerk (webhook, env vars, integration) | Nothing | Mar 28 EOD |
| **NEXT** | Pull forward LKID-24 | Rate limiting (slowapi) on backend | LKID-15 (John, endpoint exists) | Mar 29-30 |
| **THEN** | Pull forward LKID-25 | Prediction engine unit tests (if Yuri is overloaded) | LKID-15 | Mar 31 |

Gay Mark's DB work (LKID-10) is done and merged. He has been idle since. LKID-6 (Clerk config) is infrastructure work that fits his skillset -- it is server-side config, env vars, webhook setup. If LKID-6 is already assigned to Luca, then Gay Mark takes LKID-24 (rate limiting) immediately instead. **Zero tolerance for idle agents.**

### Inga (UX/UI Designer) -- CURRENTLY IDLE

| Priority | Card | Task | Depends On | Target |
|----------|------|------|------------|--------|
| **NOW** | Design QA on PR #12 fixes | Review Harshit's ClerkProvider fix, verify auth flow UX | Harshit pushes fixes | Mar 27-28 |
| **NEXT** | Design review on LKID-16 PR | Review form layout, spacing, mobile responsiveness | Harshit opens PR | Mar 28-29 |
| **THEN** | Design review on LKID-19 PR | Review chart styling, line colors, stat cards | Harshit opens PR | Mar 29-30 |
| **THEN** | Pull forward LKID-5 | Build disclaimer components (Sprint 3 card) | Nothing | Mar 30-31 |

Inga reviews code as it ships, not before. No upfront design documents for cards that already have detailed specs. Her job for the next 3 days is to be a fast reviewer on Harshit's PRs and then pull Sprint 3 work forward.

### Yuri (QA / Test Writer) -- WAITING FOR CODE

| Priority | Card | Task | Depends On | Target |
|----------|------|------|------------|--------|
| **NOW** | Write test scaffolding for LKID-16 and LKID-19 | data-testid inventory, test file stubs, test vectors | Dispatch docs (already written) | Mar 27-28 |
| **NEXT** | QA re-review PR #12 | Verify Harshit's 5 fixes | Harshit pushes fixes | Mar 28 |
| **THEN** | QA on LKID-15 (POST /predict) | API contract tests, boundary values, error envelope | John opens PR | Mar 29 |
| **THEN** | QA on LKID-16 (form) + LKID-19 (chart) | Frontend tests against AC | Harshit opens PRs | Mar 29-30 |

Yuri's "waiting for code" is a PM failure, not a QA failure. He can write test scaffolding NOW without the code. Test stubs, expected values from the finalized-formulas.md, data-testid contracts. When PRs arrive, he runs the tests, not writes them.

### Luca (CTO / Orchestrator)

| Priority | Card | Task | Depends On | Target |
|----------|------|------|------------|--------|
| **NOW** | LKID-2 | Verify PostgreSQL schema on Railway (if not already done) | Nothing | Mar 27 |
| **NEXT** | LKID-3 | Verify FastAPI health endpoint on Railway | Nothing | Mar 27 |
| **THEN** | Merge PR #12 | After Harshit fixes + Yuri re-review | QA pass | Mar 28 |
| **THEN** | Open PRs for LKID-15, LKID-16, LKID-19 | Create feature branches, open draft PRs | Agent readiness | Mar 28 |

Luca's primary job is branch/PR creation and merge gating. He should not be writing SOPs, dispatch docs, or architecture reviews. Open the branch, tell the agent, merge when QA passes. That is the loop.

### Husser (Product Manager -- me)

See Section 5 below for my specific daily commitments.

---

## 2. Daily Execution Targets

### Mar 27 (Today) -- "Stop the Bleeding"

| Deliverable | Owner | Definition of Done |
|-------------|-------|--------------------|
| PR #12 QA fixes pushed | Harshit | All 5 issues from dispatch addressed, pushed to branch |
| Test scaffolding started for LKID-16/19 | Yuri | Test file stubs with data-testid contracts written |
| LKID-2 and LKID-3 verified | Luca | Railway deploy confirmed, health endpoint returns 200 |
| LKID-15 implementation started | John | Branch created, Pydantic models + route handler skeleton committed |
| Gay Mark assigned and working | Gay Mark | LKID-6 or LKID-24 branch created, work started |

**End-of-day check:** 5 agents actively coding. Zero agents idle.

### Mar 28 -- "First Wave"

| Deliverable | Owner | Definition of Done |
|-------------|-------|--------------------|
| PR #12 merged | Luca | QA re-review passed, merged to main |
| LKID-15 PR opened | John | POST /predict with placeholder trajectories, Pydantic models, CKD-EPI calc, error handling |
| LKID-16 PR opened | Harshit | Prediction form with 5 required fields + 2 optional, validation, responsive |
| QA re-review on PR #12 | Yuri | Sign off or flag remaining issues |
| Design review on PR #12 fixes | Inga | Verify auth flow UX matches user-flows.md |

**End-of-day check:** 2 new PRs open. 1 PR merged. Sprint 2 Done count: 4.

### Mar 29 -- "Second Wave"

| Deliverable | Owner | Definition of Done |
|-------------|-------|--------------------|
| LKID-15 merged | Luca | After QA pass |
| LKID-19 PR opened | Harshit | Visx chart with 4 lines, mock data, phase bands, stat cards |
| LKID-11 PR opened | John | Prediction write to leads table |
| LKID-16 QA started | Yuri | Form validation tests running |
| LKID-6 or LKID-24 PR opened | Gay Mark | Clerk config or rate limiting |

**End-of-day check:** 3 new PRs open. Sprint 2 Done count: 5-6.

### Mar 30 -- "Integration Day"

| Deliverable | Owner | Definition of Done |
|-------------|-------|--------------------|
| LKID-16 merged | Luca | Form component live |
| LKID-19 QA started | Yuri | Chart rendering tests |
| LKID-18 started | Harshit | Wire form to POST /predict (real API call replacing mock) |
| Lee blocker decision | Husser + Luca | Either Lee responded OR we commit to fallback (Section 3) |
| LKID-14 started (if Lee responded) or descoped | John | Real formulas OR documented descope |

**End-of-day check:** Sprint 2 Done count: 7-8. Integration between FE form and BE endpoint underway.

### Mar 31 -- "Close Sprint"

| Deliverable | Owner | Definition of Done |
|-------------|-------|--------------------|
| LKID-19 merged | Luca | Chart component live |
| LKID-18 merged or PR open | Harshit + John | Form-to-API integration working |
| LKID-11 merged | John | Leads table write working |
| All remaining Sprint 2 QA | Yuri | Every open PR has QA review |
| Sprint 2 retrospective data | Husser | Velocity, blockers, scope changes documented |

**End-of-day check:** Sprint 2 Done count: 10-12 of 17.

### Apr 1 -- "Sprint 2 Wrap + Sprint 3 Kickoff"

| Deliverable | Owner | Definition of Done |
|-------------|-------|--------------------|
| Remaining Sprint 2 PRs merged or triaged | Luca | Merge what passes QA, defer what does not |
| Sprint 3 branches opened | Luca | Top 3 Sprint 3 cards have feature branches |
| Sprint 3 dispatch notes | Husser | Agents know their first Sprint 3 task |
| Incomplete Sprint 2 cards documented | Husser | Jira updated, moved to Sprint 3 or descoped |

---

## 3. The Lee Blocker -- Escalation and Fallback

### Current State

- 5 formula questions sent to Lee on Mar 26 (email from Husser)
- No response as of Mar 27
- LKID-14 (rules engine integration) is blocked
- LKID-14 blocks real trajectory calculations in LKID-15

### Escalation Timeline

| Date | Action | Owner |
|------|--------|-------|
| Mar 26 (done) | Initial email with 5 numbered questions | Husser |
| Mar 28 | Follow-up email. Restate the 5 questions. Offer a 15-min call. Add deadline: "We need answers by Mar 30 to hit our April 9 ship date." | Husser |
| Mar 30 | If no response: escalate to Luca. Luca contacts Lee directly (phone call, not email). | Luca |
| Mar 30 (same day) | **Fallback decision point.** If Lee has not responded, we commit to the fallback. | Husser + Luca |

### Fallback Plan: Ship Without Full Rules Engine

If Lee does not respond by Mar 30:

1. **Use calc spec formulas (0.31 coefficient model)** -- these are simpler, match the test vectors exactly, and are clinically reasonable for a marketing app. John's finalized-formulas.md already documents this as Option (b) in Q1.

2. **Implement age attenuation as a flag** -- code it but default to OFF. When Lee confirms Q5, we flip it on.

3. **Ship with a "Beta" confidence badge** -- add a small UI indicator that trajectory calculations use simplified formulas. This is honest and gives us a path to upgrade later.

4. **Defer BUN Structural Floor Display** -- Q3 (calc spec suppression vs. Amendment 3 structural floor) can wait. Implement the simpler calc spec version. Amendment 3 becomes a post-launch enhancement.

5. **Use eGFR 12 for dialysis threshold** -- Q4 is a confirmation, not a blocker. The calc spec says 12. Go with 12.

**Bottom line:** We can ship a fully functional app without Lee's answers. The trajectory math will be approximately correct (within clinical tolerances for a marketing app) and upgradeable when Lee responds.

---

## 4. Process Overhead Reduction -- What We Stop Doing

### Honest Assessment of Time Spent

Since Sprint 2 started (Mar 26), the team has produced:

- 1 PM SOP (590 lines) -- this document you are reading is a response to that SOP existing
- 3 DISPATCH docs (total ~300 lines)
- 1 QA testing SOP
- 1 QA skills recommendation doc
- 1 Yuri weakness remediation plan
- Multiple TASK iteration files (john_donaldson has 3 versions of TASK-iterate-rules-engine)
- Sprint progress JSON that is completely stale (all cards show "upcoming")
- Board nanny SOP (now incorporated into the PM SOP)

Estimated: **60-70% of agent time has gone to documentation, process, and planning.** Maybe 30% to actual code (PR #10, #11, #12, and Gay Mark's/John's merged work).

### What We STOP Doing Right Now

| Activity | Status | Reason |
|----------|--------|--------|
| Writing new SOPs | **STOPPED** | We have enough process. Execute the existing process. |
| Writing TASK iteration docs | **STOPPED** | One dispatch per card is enough. If the first dispatch was unclear, fix it -- do not write v2 and v3. |
| Updating sprint-progress.json manually | **STOPPED** | Jira is the source of truth. This JSON is a stale copy. |
| Pre-implementation design reviews | **STOPPED** | Inga reviews PRs, not plans. The component specs from Sprint 1 are sufficient. |
| Agent skill assessments and remediation plans | **STOPPED** | Yuri knows how to QA. Let him QA. |
| Board nanny sweeps as a formal ceremony | **REDUCED** | One sweep per day, 10 minutes max. No written report unless a Red alarm fires. |
| Velocity reports | **DEFERRED** | No Monday velocity report this sprint. Ship code instead. Report at sprint boundary. |

### Minimum Viable Process for Remaining Sprint

1. **Luca opens branch + draft PR** for each card before dispatching
2. **Agent implements** on the branch
3. **Agent pushes** and marks PR ready for review
4. **Copilot + CodeRabbit** auto-review (wait max 1h)
5. **Yuri QA** (same day if possible)
6. **Luca merges** and moves card to Done
7. **Husser dispatches next card** to the agent

That is the entire process. Seven steps. No SOPs, no formal sweeps, no written standups, no dispatch ceremonies. If an agent is stuck, they say so in a Jira comment and Husser unblocks within 2 hours.

---

## 5. Husser's Personal Commitments

I am done writing SOPs. Here is what I will actually do every day for the next 5 days.

### Daily Actions (15 minutes max, not 2 hours)

1. **Morning (first action):** Check Jira + GitHub for overnight activity. Which PRs moved? Which agents are blocked? Write a 5-line standup in Jira, not a multi-page doc.

2. **Unblock immediately:** If any agent is stuck, I fix it within 2 hours. Fix means: answer their question, update the AC, get them the artifact they need, or escalate to Luca. Not "write a dispatch note about the blocker."

3. **Dispatch next task:** When an agent's PR is merged, I immediately tell them their next card. A Jira comment with the card number and a one-line summary. Not a 150-line dispatch document.

4. **Lee follow-up:** Mar 28 I send the follow-up email. Mar 30 I escalate to Luca if no response. I own this blocker until it is resolved or we commit to the fallback.

5. **End of day:** Count merged PRs. That is the only metric that matters.

### What I Will NOT Do

- Write another SOP
- Write multi-page dispatch documents (one Jira comment per dispatch from now on)
- Update sprint-progress.json (Jira is truth)
- Write formal velocity reports mid-sprint
- Produce any document that does not directly unblock an agent

---

## 6. Risk Assessment -- Will We Hit April 9?

### Current Velocity

- Sprint 2: 3 of 17 cards Done in 1.5 days = 2 cards/day
- At 2 cards/day with 6 days left in Sprint 2: 12 more cards = 15 total
- Sprint 2 target: 17 cards. **Achievable at 2.5 cards/day. Tight but possible.**

### Critical Path

```
PR #12 fix (Mar 27) --> LKID-16 form (Mar 28) --> LKID-18 integration (Mar 30) --> E2E flow
                                                    ^
LKID-15 endpoint (Mar 28) --> LKID-11 leads (Mar 29) --+

LKID-19 chart (Mar 29) --------------------------------+
```

The critical path runs through Harshit (form) and John (endpoint). If either slips by more than 1 day, Sprint 2 bleeds into Sprint 3.

### Scope Cut Proposal (if velocity drops below 2 cards/day by Mar 29)

**Cut from Sprint 2 (defer to Sprint 3):**

| Card | Reason to Cut |
|------|---------------|
| LKID-14 | Rules engine -- already blocked on Lee. Use placeholder math and upgrade later. |
| LKID-9 | Form validation + error handling -- can be a fast-follow after LKID-16 merges with basic validation |
| LKID-7 | Magic link flow details -- basic Clerk flow works from LKID-1, polish can wait |

**Cut from Sprint 3 (defer to post-launch):**

| Card | Reason to Cut |
|------|---------------|
| LKID-47 | Klaviyo integration -- blocked on API key from Lee, not critical for launch |
| LKID-28 | axe-core audit -- do a manual a11y check instead, formal audit post-launch |
| LKID-21 | Accessible data table -- nice-to-have, chart is primary visualization |

**Revised ship-date risk:**
- If we maintain 2+ cards/day: **April 9 is achievable.**
- If velocity drops to 1.5 cards/day: **April 11 (2-day slip).** Cut 3 cards from Sprint 3.
- If velocity drops below 1 card/day: **April 14 (5-day slip).** Cut LKID-14, LKID-47, and 3 Sprint 3 cards. Escalate to Luca for stakeholder communication.

### The One Thing That Would Kill the Ship Date

If Harshit cannot ship LKID-16 (form) and LKID-19 (chart) by Mar 29, nothing downstream works. The form and chart are the product. Everything else is plumbing. **Harshit is the constraint. Protect his focus at all costs.**

---

## 7. Execution Rules for the Next 5 Days

1. **No new documents unless they unblock an agent.** If you are about to create a file, ask: "Does this directly result in a PR being opened or merged?" If no, do not create it.

2. **Dispatch via Jira comment, not DISPATCH files.** A Jira comment on the card with the branch name and one-line instruction is enough. Agents can read the card's AC.

3. **PR review SLA: same day.** Copilot and CodeRabbit auto-review within 1h. Yuri reviews within 4h. Inga reviews within 4h. Luca merges within 8h of QA pass. If any of these slip, Husser escalates.

4. **One card at a time per agent.** Finish, ship, move on. No parallel card work. No "starting" three things.

5. **If blocked, say so in Jira and move to the next card.** Do not sit idle. Do not write a document about being blocked. Comment on the card, tell Husser, start the next unblocked card.

6. **The daily standup is a 5-line Jira comment, not a document.** Format: "Done: X. Doing: Y. Blocked: Z. Need: W. ETA: date."

7. **Sprint-progress.json is dead.** Do not update it. Jira is truth.

---

*This plan is effective immediately. The next thing that happens is not a review of this plan -- it is Harshit fixing PR #12.*
