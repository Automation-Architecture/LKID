# Discovery Phase Engineering SOP

> Standard Operating Procedure for AI Agent Team Discovery Phase
> Version: 1.1

---

## Purpose

This SOP defines the workflow, roles, and responsibilities for the engineering team during the Discovery Phase of a project. The Discovery Phase produces the **final PRD (Product Requirements Document)** — the binding specification from which all implementation proceeds. This SOP governs how the team collaborates to get there: how they prepare, how they meet, how they debate, and how they converge on the final PRD.

---

## Scope

This SOP covers only the Discovery Phase. For implementation, QA, and delivery, see `development-phase-engineering-sop.md`.

No implementation work may begin until the Discovery Phase is complete and the final PRD is signed off by all agents.

---

## Discovery Phase Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    DISCOVERY PHASE                          │
│                                                             │
│  1. Memory Bootstrap & Review                               │
│         ↓                                                   │
│  2. Pre-Meeting Preparation — V1 Domain Drafts (all agents) │
│         ↓                                                   │
│  3. MEETING 1 — Plan Presentations & Debate                 │
│         ↓                                                   │
│  4. Post-Meeting Revision — V2 Final Domain Docs            │
│         ↓                                                   │
│  5. MEETING 2 — Cross-Review & Alignment                    │
│         ↓                                                   │
│  6. Final PRD Synthesis (PM + CTO sign-off)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Chronology & Order of Operations

The Discovery Phase follows a strict sequence. Each step depends on the outputs of the previous step. **No step may be skipped or reordered.**

```
  INDIVIDUAL WORK          TEAM SYNC              INDIVIDUAL WORK          TEAM SYNC           SYNTHESIS
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐   ┌──────────┐
│ Step 2:      │    │ Step 3:          │    │ Step 4:          │    │ Step 5:         │   │ Step 6:  │
│ All agents   │───▶│ MEETING 1        │───▶│ All agents       │───▶│ MEETING 2       │──▶│ PM writes│
│ read specs,  │    │ Present V1 plans │    │ revise docs      │    │ Present V2 docs │   │ final PRD│
│ draft V1     │    │ Debate & decide  │    │ accounting for   │    │ Cross-review    │   │ after    │
│ domain docs  │    │ CTO + PM have    │    │ meeting outcomes │    │ Flag outliers   │   │ meeting 2│
│              │    │ final votes      │    │ Produce polished │    │ Resolve gaps    │   │          │
│              │    │                  │    │ final domain doc │    │                 │   │          │
└──────────────┘    └──────────────────┘    └──────────────────┘    └─────────────────┘   └──────────┘
```

**Critical rule:** The PRD and architecture document are NOT created in parallel with domain drafts. They are synthesis documents:
- **Architecture** (CTO): Synthesized during/after Meeting 2 as the technical summary
- **PRD** (PM): Created ONLY after Meeting 2 concludes, incorporating all finalized domain documents

**Decision authority in debates:**
- **CTO ({ORCHESTRATOR_NAME})** — final vote on all technical disputes (frameworks, tools, architecture patterns, infrastructure)
- **PM ({PM_NAME})** — final vote on all product/user disputes (scope, priority, user experience, acceptance criteria)
- When technical and product concerns conflict, CTO and PM must reach consensus. If deadlocked, CTO defers to PM on user impact, PM defers to CTO on technical feasibility.

---

### Step 1: Memory Bootstrap & Review

**Trigger:** Project start.

**If `/memory/` is empty**, initialize with baseline best practices:

| File | Bootstrap Content |
|------|-------------------|
| `patterns.json` | Contract-first API design, parallel work with mocks, early QA involvement, clear separation of concerns |
| `anti_patterns.json` | Tight coupling between FE/BE, undefined API contracts, skipping QA validation, overwriting other agent artifacts |
| `decisions.json` | Use modular architecture, enforce API contracts before integration |
| `insights.json` | Parallelization reduces delivery time, early alignment reduces rework |
| `tooling.json` | Track useful tools and integrations used |

**If `/memory/` has content**, all agents read existing entries and incorporate patterns and anti-patterns into their planning.

**Rules:**
- Bootstrap is a STARTING POINT only.
- Agents MUST adapt and evolve memory for this project.
- Bootstrap entries may be refined or superseded.

---

### Step 2: Pre-Meeting Preparation — V1 Domain Drafts

**All agents** independently:

1. Read ALL project specification documents (specs, proposals, reviews).
2. Review the Jira backlog — user stories, descriptions, acceptance criteria, and test scenarios.
3. Read `/memory/*` entries.
4. **Draft a V1 domain document** — each agent produces an initial version of their domain deliverable based solely on their own reading of the source material. This is their first-pass interpretation before any team discussion.
5. Prepare a role-specific plan covering:
   - What deliverables they will produce
   - How they will stay within their role boundaries
   - Dependencies they have on other agents
   - Dependencies other agents have on them
   - Risks or concerns they foresee

**V1 drafts are written to `/agents/{name}/drafts/`.**

**Important:** At this stage, the PM does NOT write a PRD and the CTO does NOT write an architecture document. Instead:
- **PM** drafts product scope, user stories, acceptance criteria, and success metrics for their domain
- **CTO** drafts technical constraints, infrastructure requirements, and preliminary architecture notes
- Both are domain-scoped V1 documents, NOT synthesis documents

---

### Step 3: Meeting 1 — Plan Presentations & Debate

**Purpose:** Each agent introduces their V1 domain document, the team debates cross-cutting concerns, and decisions are made on disputed points.

#### 3a. Agent Introductions & V1 Presentations (Round-Robin)

Each agent, in turn:

1. **Introduces themselves** and their role on the team.
2. **Presents their V1 domain document** — findings, proposed approach, key decisions they've made.
3. **Declares dependencies** — what they need from other agents, and what others need from them.
4. **Flags risks** — anything that could block or delay their work.

As dependencies are identified, they are **added to the relevant Jira cards** and assigned to the agent who controls the blocker.

5. **Tags Jira cards** with `agent:<name>` labels (e.g., `agent:harshit`, `agent:john-donaldson`) to establish ownership. Multi-owner stories receive multiple agent labels. This tagging begins during Meeting 1 as responsibilities are confirmed and is finalized after Meeting 2.

#### 3b. Product Manager Workflow Briefing

Husser (PM) explains:

- Jira backlog structure and sprint workflow
- GitHub Pull Request workflow
- How acceptance criteria will be validated
- How stories flow from To Do → In Progress → Done

#### 3c. Open Discussion & Debate

After all agents have presented:

1. The team discusses conflicts, overlaps, or gaps between V1 documents.
2. **Domain authority applies** — the expert in each area leads the discussion for their domain:
   - API architecture → John Donaldson leads
   - Database design → Gay Mark leads
   - Frontend architecture → Harshit leads
   - UX/UI decisions → Inga leads
   - Test strategy → Yuri leads
   - Product scope → Husser leads
3. Any agent may raise concerns or propose alternatives.
4. **Decision authority:**
   - **Luca (CTO)** has final vote on technical disputes (frameworks, tools, architecture, infrastructure).
   - **Husser (PM)** has final vote on product/user disputes (scope, priority, UX, acceptance criteria).
5. Decisions are recorded for `/memory/decisions.json`.
6. The team identifies changes each agent must incorporate in their V2 revision — including dependency shifts, framework/tool changes, newly understood blockers, and refactored responsibilities.

#### 3d. Meeting 1 Outputs

- Each agent has a validated (or challenged) V1 plan
- Dependencies are captured in Jira
- Open questions are resolved or assigned owners
- Each agent has a clear list of changes to incorporate in their V2 revision
- Agents depart to produce polished V2 domain documents

---

### Step 4: Post-Meeting Revision — V2 Final Domain Documents

After Meeting 1, each agent (excluding PM and CTO):

1. Revises their domain document based on cross-disciplinary feedback, debates, and decisions from Meeting 1.
2. Accounts for any changes in frameworks, tools, dependencies, or blockers that emerged during debate.
3. Updates their notes in `/agents/{agent_name}/notes.md`.
4. Produces a **polished, final V2 domain document** — this is their definitive requirements and specification for their domain area.

**V2 documents are written to `/agents/{name}/drafts/` and represent the agent's final position entering Meeting 2.**

**What the PM and CTO do during this step:**
- **PM (Husser):** Reviews all V2 domain documents as they are completed. Prepares notes on product coherence, user impact, and scope alignment. Does NOT write the PRD yet.
- **CTO (Luca):** Reviews all V2 domain documents for technical coherence. Prepares notes on architecture implications and cross-cutting concerns. Does NOT write the architecture document yet.

---

### Step 5: Meeting 2 — Cross-Review & Alignment

**Purpose:** Each agent presents their polished V2 domain document. The team cross-reviews for remaining outliers, missed requirements, and final alignment before the PRD is written.

#### 5a. V2 Domain Presentations (Round-Robin)

Each domain agent presents their finalized V2 document:

| Agent | V2 Domain Document |
|-------|----------|
| Inga | UX/UI wireframes, component specs, design tokens, accessibility plan |
| John Donaldson | API contract, endpoint documentation |
| Gay Mark | Database schema, design document |
| Harshit | Frontend component architecture |
| Yuri | Test strategy and coverage plan |

Each agent explains:
- What changed between V1 and V2 (and why)
- How they incorporated Meeting 1 feedback
- Any remaining concerns or open questions

#### 5b. Cross-Review & Gap Analysis

The team reviews documents together to identify:

1. **Outliers** — decisions in one domain that conflict with another
2. **Missed requirements** — gaps no single agent caught individually
3. **Interface mismatches** — API ↔ frontend, schema ↔ API, UX ↔ frontend inconsistencies
4. **Dependency confirmation** — all declared dependencies are met

#### 5c. Final Conflict Resolution

If disagreements remain:
- Domain expert leads the specific discussion.
- **Luca (CTO)** has final vote on technical disputes.
- **Husser (PM)** has final vote on product/user disputes.
- Decisions are recorded in `/memory/decisions.json`.

#### 5d. Meeting 2 Outputs

- All agents have confirmed understanding and agreement on each other's V2 documents.
- All remaining conflicts are resolved with recorded decisions.
- All Jira backlog stories have finalized `agent:<name>` labels reflecting confirmed ownership.
- **Husser (PM) is now authorized to synthesize the final PRD.**

**Jira Ownership Labels:**

All Jira stories and subtasks must be tagged with `agent:<name>` labels to indicate the responsible agent(s). This enables filtering the backlog by agent during development (e.g., `labels = "agent:harshit"` shows all of Harshit's work).

| Label | Agent | Domain |
|-------|-------|--------|
| `agent:husser` | Husser | Product requirements, scope, legal coordination |
| `agent:inga` | Inga | UX/UI design, accessibility, disclaimer coordination |
| `agent:luca` | Luca | Architecture, cross-cutting coordination |
| `agent:john-donaldson` | John Donaldson | API endpoints, backend logic, auth flow |
| `agent:gay-mark` | Gay Mark | Database schema, encryption, HIPAA storage, backups |
| `agent:harshit` | Harshit | Frontend components, charting, state management |
| `agent:yuri` | Yuri | Test strategy, QA gates, code review |

Stories with shared ownership (e.g., full-stack features) receive multiple agent labels.

---

### Step 6: Final PRD Synthesis

**Trigger:** Meeting 2 is complete. All V2 domain documents are finalized and agreed upon.

**Owner:** Husser (PM) writes the PRD. Luca (CTO) reviews and approves it.

**The PRD is created ONLY after Meeting 2 concludes.** It is a synthesis of all finalized domain documents, not a parallel draft. Husser reads every agent's V2 document and produces a single comprehensive document.

The final PRD is published to `/artifacts/PRD.md`.

**Required sections:**

1. **Executive Summary** — High-level overview of the product, its purpose, and key decisions
2. **Problem Statement** — What problem the product solves and for whom
3. **Goals & Success Criteria** — Measurable outcomes
4. **Scope** — What is in MVP and what is deferred
5. **User Flows** — End-to-end journeys through the application
6. **Functional Requirements** — Feature-by-feature specifications
7. **Technical Architecture** — Tech stack, system design, deployment approach, architecture diagram (authored by CTO)
8. **API Contracts** — Agreed endpoints, request/response schemas
9. **Database Schema** — Tables, relationships, constraints
10. **Frontend Architecture** — Component tree, state management, routing
11. **Auth & Security** — Authentication flow, session management, compliance considerations
12. **UX/UI Specifications** — Responsive strategy, accessibility, component design
13. **Test Strategy** — Coverage requirements, QA gates, blocking conditions
14. **Dependency Map** — Cross-agent dependencies and Jira card links
15. **Sprint Plan** — Execution order, milestones, parallel work assignments
16. **Risks & Mitigations** — Identified risks with owners and mitigation plans
17. **Decisions Log** — Key decisions made during Discovery with rationale

**Appendices (REQUIRED):**

Each agent's finalized V2 domain document is included as an appendix to the PRD. These are the authoritative reference for domain-specific detail.

| Appendix | Content | Source Agent |
|----------|---------|--------------|
| A | API Contract & Documentation | API Designer |
| B | Database Schema & Design | Database Engineer |
| C | Frontend Architecture | Frontend Developer |
| D | UX/UI Specifications (wireframes, components, tokens, accessibility) | UX/UI Designer |
| E | Test Strategy & Coverage Plan | QA / Test Writer |
| F | CTO Architecture Notes & Diagram | CTO / Orchestrator |

**The final PRD is the binding contract for the Execution Phase.** Changes after this point require team discussion and Luca's approval.

---

## Discovery Phase Memory Checkpoint

At the end of the Discovery Phase, agents MUST write memory entries capturing patterns, decisions, and insights from meetings and planning. See `memory-system-reference.md` for entry format, write rules, and all checkpoint definitions.
