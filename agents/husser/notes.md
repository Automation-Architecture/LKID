# Husser — Product Manager Discovery Plan

## Revised After: Meeting 1 (Pre-Discovery)

**Date:** 2026-03-25
**Project:** KidneyHood.org Patient Outcome Prediction App
**Role:** Product Manager — owns PRD, backlog, sprint planning, acceptance criteria, scope decisions

---

## Meeting 1 Decisions (ALL BINDING)

All 14 decisions below were made by Luca (CTO) at Meeting 1 and are binding. No further debate.

| # | Decision | Impact |
|---|----------|--------|
| 1 | **Auth: Magic link only.** No passwords. | SPEC-20, SPEC-59, SPEC-60 must be rewritten. No bcrypt, no password storage. |
| 2 | **MVP Scope approved as proposed. PDF DEFERRED to Phase 2b.** | PDF export story created but not assigned to Sprint 1. |
| 3 | **Sex field: Required.** Radio: Male / Female / Prefer not to say. "Prefer not to say" = "unknown" = lower confidence tier. | John updates API contract; Inga updates form layout. |
| 4 | **Guest data: Server-side, 24hr TTL, full HIPAA.** "Purged on close" is superseded. | Gay Mark implements server-side cleanup job. Spec language about "purged on close" must be corrected everywhere. |
| 5 | **X-axis: True linear time scale (months).** Chart footer note about non-uniform intervals. | Harshit implements proportional time axis. Inga designs footer note placement. |
| 6 | **Charting library: Visx.** Harshit builds POC in Sprint 0. | No further library evaluation needed. POC is a Sprint 0 gate. |
| 7 | **Frontend stack: shadcn/ui + Tailwind + Zustand + TanStack Query.** No BFF pattern for MVP. | Harshit proceeds with this stack. No backend-for-frontend layer. |
| 8 | **Predict endpoint: Separate concerns.** POST /lab-entries stores data. POST /predict reads from stored (auth) or accepts inline (guest). | John finalizes two-endpoint contract. Decouples storage from computation. |
| 9 | **Error response: John's envelope approved.** `{error: {code, message, details[{field, message}]}}` | All agents use this schema. Harshit builds FE error display against it. |
| 10 | **No prediction result storage in MVP.** Recompute on demand. | No predictions table. Reduces DB complexity and HIPAA surface. |
| 11 | **Disclaimer mobile: Sticky footer (collapsed, expandable).** Legal confirmation required from me. | Inga designs the sticky footer. I must confirm with legal that collapsed display satisfies requirements. |
| 12 | **Tier transitions: BOTH hemoglobin AND glucose required for Tier 2.** | Must be documented in PRD functional requirements. Affects confidence badge logic. |
| 13 | **Test vectors: 10-20 validated pairs from Lee before Sprint 1.** Patient safety blocker. | I coordinate with Lee. Sprint 1 cannot start without these. |
| 14 | **Audit log: ON DELETE SET NULL for user_id.** | Gay Mark implements. Audit records survive user deletion. |

---

## Post-Meeting Action Items

### My Action Items (Husser)

| # | Task | Deadline | Status | Dependency |
|---|------|----------|--------|------------|
| 1 | Rewrite SPEC-20 for magic link auth (remove bcrypt/password references) | Before Sprint 1 | NOT STARTED | None |
| 2 | Rewrite SPEC-59 for magic link auth | Before Sprint 1 | NOT STARTED | None |
| 3 | Rewrite SPEC-60 for magic link auth | Before Sprint 1 | NOT STARTED | None |
| 4 | Build KH-to-SPEC ID mapping table | Before PRD draft | NOT STARTED | None |
| 5 | Coordinate 10-20 validated test vectors from Lee | Before Sprint 1 | NOT STARTED | Lee's availability — PATIENT SAFETY BLOCKER |
| 6 | Legal confirmation: sticky footer disclaimer meets requirements when collapsed | Before Sprint 1 | NOT STARTED | Legal counsel availability |
| 7 | Co-author HIPAA compliance section with Gay Mark | Before PRD draft | NOT STARTED | Gay Mark's schema design |
| 8 | Update all spec/story references to "purged on close" — replace with "server-side 24hr TTL" | Before PRD draft | NOT STARTED | None |
| 9 | Document Tier 2 transition rules (BOTH hemoglobin AND glucose) in PRD | During PRD drafting | NOT STARTED | None |
| 10 | Write acceptance criteria for all Sprint 1 stories | Before Sprint 1 | NOT STARTED | Decisions 1-14 resolved (done) |

### Blockers I Must Escalate

- **Test vectors from Lee (Decision 13):** If Lee does not deliver 10-20 validated input/output pairs before Sprint 1, we cannot ship. This is a patient safety blocker. I will contact Lee within 48 hours and escalate to Luca if no response within 1 week.
- **Legal confirmation on disclaimer (Decision 11):** If legal does not confirm that a collapsed sticky footer satisfies regulatory requirements, we may need to redesign. Target: confirmation within 2 weeks.

---

## 1. Role and Deliverables

### What I Own

1. **Product Requirements Document (PRD)** — the single source of truth for implementation, published to `/artifacts/PRD.md`. Must contain all 16 sections required by the Discovery Phase SOP.
2. **Jira backlog management** — story creation, prioritization, acceptance criteria, dependency tracking, sprint assignment, and status governance.
3. **Sprint planning** — defining execution order, milestone targets, and parallel work assignments.
4. **Acceptance criteria** — every story gets testable acceptance criteria before it enters a sprint. Yuri (QA) validates these are sufficient.
5. **Scope decisions** — what is in MVP, what is deferred to Phase 2b/3, what is out of scope entirely.
6. **Open question resolution** — the spec had 7 open questions (Section 7). All material questions are now resolved per Meeting 1 decisions.

### What I Produce During Discovery

- Draft PRD in `/agents/husser/drafts/` (before team review)
- Final PRD in `/artifacts/PRD.md` (after Meeting 2 approval)
- Updated Jira backlog with dependencies captured, acceptance criteria written, and stories assigned to agents
- Sprint plan with milestones and parallel work streams

### What I Do NOT Do

- I do not design UI/UX (Inga owns that)
- I do not write code or make implementation decisions (Harshit, John, Gay Mark own their domains)
- I do not write tests (Yuri owns test strategy and execution)
- I do not make architecture decisions (Luca has final authority; John/Gay Mark/Harshit lead their domains)

---

## 2. Role Boundaries

I lead **product scope** discussions. When debates arise about what to build vs. how to build it:

- **"What" and "why"** = my domain. I decide what features are in MVP, what acceptance criteria define "done," and how stories are prioritized.
- **"How"** = engineering's domain. I do not dictate technology choices, component architecture, database schema design, or API implementation patterns. I provide requirements; they provide solutions.
- **Conflict resolution:** Domain experts lead discussions in their area. I escalate unresolved scope disputes to Luca (CTO) for final decision.

I will resist the temptation to over-specify implementation details in the PRD. The PRD defines behavior, not implementation.

---

## 3. Dependencies I Have on Other Agents

### From Inga (UX/UI Designer)
- **Responsive breakpoint strategy** — the spec has no mobile layout guidance. Spec Review issue #5 flags this as medium severity. I need Inga's responsive design decisions before I can finalize acceptance criteria for chart rendering and stat card stories.
- **Sticky footer disclaimer design (Decision 11)** — Inga must design the collapsed/expandable sticky footer. I must then confirm with legal.
- **Account creation flow wireframes** — Spec Review issue #8: the auth/signup UX is completely unspecified. Magic link flow (Decision 1) needs wireframes before SPEC-20 rewrite is complete.
- **eGFR override field placement** — Spec Review issue #3: where does this optional field appear in the form? I need Inga's recommendation.

### From John Donaldson (API Designer)
- **Finalized API contract** — must reflect the two-endpoint pattern (Decision 8): POST /lab-entries for storage, POST /predict for computation.
- **Error response schema** — confirmed as `{error: {code, message, details[{field, message}]}}` (Decision 9). John to publish full contract.
- **Auth endpoint contract** — magic link flow only (Decision 1). No password endpoints.
- **Validation rules table** with min/max ranges for all inputs.

### From Gay Mark (Database Engineer)
- **Database schema** — must reflect: no password storage (Decision 1), server-side guest data with 24hr TTL (Decision 4), ON DELETE SET NULL for audit log user_id (Decision 14), no prediction result storage (Decision 10).
- **HIPAA storage architecture** — story SPEC-25. Gay Mark and I co-author the compliance section.
- **Data retention policy** — sub-task SPEC-73. Guest data = 24hr TTL (Decision 4). Account data retention TBD with legal.

### From Harshit (Frontend Developer)
- **Visx POC in Sprint 0 (Decision 6)** — must demonstrate true linear time axis (Decision 5), 4-line chart, responsive behavior. This is a gate for Sprint 1.
- **Component architecture** — I need to understand the component tree so acceptance criteria reference real components.
- **Frontend stack confirmation** — shadcn/ui + Tailwind + Zustand + TanStack Query (Decision 7). No open questions remain.

### From Yuri (QA)
- **Test strategy review of acceptance criteria** — Yuri must validate that my acceptance criteria are testable and sufficient before stories enter a sprint.
- **QA gates definition** — what blocks a story from moving to Done? I need Yuri's sign-off process documented so all agents understand it.

### From Luca (CTO)
- **Architecture document** — I reference the architecture summary in PRD Section 6. Luca owns this.
- **Sprint plan approval** — Luca validates the execution order and parallel work assignments.

### From Lee (External — Kidney Health Expert)
- **10-20 validated test vectors (Decision 13)** — input/output pairs for the prediction engine. Patient safety blocker. Sprint 1 cannot begin without these.

---

## 4. Dependencies Other Agents Have on Me

### All Agents Need from Me
- **Scope clarity** — what is in MVP vs. deferred. Every agent's work depends on knowing what they are and are not building. MVP scope is now confirmed (Decision 2).
- **Acceptance criteria** — before any story can be implemented, I must have written and Yuri must have validated the acceptance criteria.
- **Story prioritization** — agents need to know what to work on first. I define the execution order.

### Inga Needs from Me
- ~~Resolution of sex field question~~ **RESOLVED: Decision 3** — Required, radio buttons, "Prefer not to say" = unknown = lower confidence.
- ~~PDF export scope decision~~ **RESOLVED: Decision 2** — Deferred to Phase 2b.
- Confirmation of disclaimer text (verbatim, legally required). Legal confirmation on sticky footer (Decision 11) pending.
- Resolution of Open Questions #3 (account creation timing) and #4 (outcome follow-up emails) and #5 (web only or native mobile).

### John Needs from Me
- ~~Decision on auth approach~~ **RESOLVED: Decision 1** — Magic link only.
- ~~Multi-visit data flow requirements~~ **RESOLVED: Decision 8** — POST /lab-entries stores, POST /predict reads from stored (auth) or accepts inline (guest).
- Finalized input field list (required vs. optional vs. silent) so the API contract covers all fields.
- Guest-to-account data migration requirements.

### Gay Mark Needs from Me
- ~~Data retention policy for guests~~ **RESOLVED: Decision 4** — Server-side, 24hr TTL, full HIPAA.
- HIPAA compliance scope — is full BAA required for MVP soft launch (100 patients)?
- Which data fields are PHI and which are not.
- Co-authored HIPAA compliance section (my Action Item #7).

### Harshit Needs from Me
- ~~Charting library decision~~ **RESOLVED: Decision 6** — Visx.
- ~~X-axis rendering decision~~ **RESOLVED: Decision 5** — True linear time scale.
- ~~Frontend stack decision~~ **RESOLVED: Decision 7** — shadcn/ui + Tailwind + Zustand + TanStack Query.
- Finalized chart rendering spec with responsive breakpoints (after Inga provides them).
- Confidence tier transition rules: Tier 2 requires BOTH hemoglobin AND glucose (Decision 12).
- Slope display rules for 1, 2, and 3+ visits.

### Yuri Needs from Me
- Complete acceptance criteria on all stories before they enter a sprint.
- Validation rules table (input ranges) so test cases can cover boundary conditions.
- Expected behavior for edge cases: What happens with eGFR of 0? Age of 18? BUN at the max range?
- Test vectors from Lee (Decision 13) — I am the coordinator.

---

## 5. Risks and Concerns

### HIGH — Patient Safety Blocker

1. **Test vectors from Lee (Decision 13).** 10-20 validated input/output pairs are required before Sprint 1. Without these, we cannot verify the prediction engine produces clinically correct results. This is the single highest-priority external dependency. I will contact Lee within 48 hours.

### HIGH — HIPAA Compliance Gaps

2. **No HIPAA plan in the spec.** Open Question #6 says "Legal review needed before launch" but provides no detail. Storing lab values (BUN, creatinine, etc.) alongside email and DOB is clearly PHI under HIPAA. We need: a BAA with AWS/GCP, encryption at rest and in transit, audit logging, access controls, data retention policies, and breach notification procedures. Gay Mark and I must co-author a compliance section for the PRD (Action Item #7).

3. **Guest mode and HIPAA (Decision 4).** Guest data is now server-side with 24hr TTL and full HIPAA protections. This is resolved in principle but the implementation must be validated — server-side storage of guest lab values is PHI even without an account.

### HIGH — Legal Confirmation Required

4. **Sticky footer disclaimer (Decision 11).** Luca approved the collapsed/expandable sticky footer for mobile, but I must confirm with legal that a collapsed (not fully visible) disclaimer satisfies regulatory requirements. If legal rejects this, we need a redesign.

### MEDIUM — Scope Creep Risk

5. ~~**Phase 2 vs. Phase 3 boundary.**~~ **RESOLVED.** MVP scope confirmed (Decision 2). PDF deferred to Phase 2b. Klaviyo, MyChart/FHIR, OCR, internationalization, geo-restriction, AI/LLM CS = Phase 3.

6. **Proprietary calculation logic.** The prediction engine is Lee's IP. We build input/output handling only. This creates a hard dependency on Lee providing the calculation logic or a working reference implementation. The test vectors (Decision 13) partially mitigate this — we can validate behavior without seeing internals — but we still need the actual engine code before the backend can ship.

### MEDIUM — Sprint 0 Gate

7. **Visx POC (Decision 6).** Harshit must build a proof-of-concept in Sprint 0 demonstrating the Visx chart with true linear time axis, 4 lines, and responsive behavior. If the POC fails, we must revisit the charting library decision. This is a gate for Sprint 1 planning.

### MEDIUM — UX Gaps

8. **60+ audience, no accessibility spec.** The proposal mentions WCAG 2.0 and "accessibility-first" but the product spec has zero accessibility requirements. Inga must address: minimum font sizes, color contrast ratios (especially for the chart lines -- #AAAAAA on white may fail WCAG AA), keyboard navigation, screen reader compatibility.

### LOW — Operational

9. **Geo-restriction.** The proposal says US-only with IP geolocation blocking. This is not in any Jira story. Deferred to Phase 3 per MVP scope (Decision 2).

10. **Klaviyo integration.** Referenced in the proposal but absent from the Jira backlog entirely. Deferred to Phase 3 per MVP scope (Decision 2).

---

## 6. Jira Workflow Briefing Notes

### Backlog Structure

The SPEC project currently has:
- **1 Epic** (SPEC-1) that serves as the PRD/master story -- contains the full problem statement and all 4 sub-epics
- **29 Stories** (SPEC-2 through SPEC-30) organized into 4 epic groups:
  1. **Patient Input Form** (Epic 1): SPEC-2 through SPEC-10 -- input fields, validation, API endpoint, FE/BE integration
  2. **Prediction Output & Visualization** (Epic 2): SPEC-8 through SPEC-17 -- chart rendering, stat cards, disclaimers, confidence badges
  3. **User Accounts & Multi-Lab Entry** (Epic 3): SPEC-18 through SPEC-28 -- guest mode, auth, account persistence, multi-visit, slope
  4. **Operational & Legal Compliance** (Epic 4): SPEC-25, SPEC-27, SPEC-29, SPEC-30 -- HIPAA storage, encryption, disclaimers, audit logging
- **~49 Sub-tasks** (SPEC-31 through SPEC-79) -- implementation-level tasks under the stories

### Stories Requiring Rewrite (per Meeting 1)

- **SPEC-20:** Must be rewritten for magic link auth (remove all password/bcrypt references)
- **SPEC-59:** Must be rewritten for magic link auth
- **SPEC-60:** Must be rewritten for magic link auth

All stories and sub-tasks are currently **To Do** status. Nothing is in progress.

### Sprint Workflow

Stories follow this lifecycle:

```
Backlog --> To Do --> In Progress --> In Review --> Done
```

- **Backlog:** Story exists but is not ready for a sprint (missing acceptance criteria, unresolved dependencies).
- **To Do:** Story has acceptance criteria, dependencies are met or planned, assigned to sprint.
- **In Progress:** Agent is actively working on the story. PR is open or in draft.
- **In Review:** PR is submitted. Copilot review requested. Yuri validates acceptance criteria.
- **Done:** PR merged. Yuri has signed off. Acceptance criteria verified.

### PR Workflow

1. Agent creates a feature branch from `main` (naming: `feat/SPEC-{number}-{short-description}`)
2. Agent opens a PR linking to the Jira story
3. Copilot is added as a reviewer automatically
4. At least one domain-relevant agent reviews the PR (e.g., John reviews API PRs, Harshit reviews FE PRs)
5. Yuri reviews for test coverage and acceptance criteria compliance
6. Luca has final merge authority on contested PRs

### Acceptance Criteria Standards

Every story must have acceptance criteria that are:
- **Testable** — Yuri can write a pass/fail test against each criterion
- **Specific** — no ambiguous language ("should work well" is not acceptable)
- **Complete** — covers happy path, error cases, and edge cases
- **Tied to the spec** — references the specific spec section or API contract field

I will write acceptance criteria in Given/When/Then format where appropriate.

### Dependency Tracking

Dependencies identified in the spec review and Jira descriptions will be captured as Jira issue links (type: "is blocked by"). I will create a dependency map for the PRD (Section 13) that visualizes the critical path.

---

## 7. Key Product Decisions — Status After Meeting 1

All 8 decisions I brought to Meeting 1 have been resolved. Summary:

| Decision | Outcome | Reference |
|----------|---------|-----------|
| Authentication approach | **Magic link only** | Decision 1 |
| MVP scope definition | **Approved as proposed, PDF to Phase 2b** | Decision 2 |
| Sex field handling | **Required, 3 radio options, "unknown" = lower confidence** | Decision 3 |
| Guest data retention | **Server-side, 24hr TTL, full HIPAA** | Decision 4 |
| Account creation timing | **Post-prediction prompt** (unchanged from my proposal) | Decision 2 (implicit) |
| PDF export scope | **Deferred to Phase 2b** | Decision 2 |
| Non-linear x-axis rendering | **True linear time scale with footer note** | Decision 5 |
| Error response contract | **John's envelope: {error: {code, message, details[]}}** | Decision 9 |

Additional decisions made at Meeting 1 that I did not propose but must implement:

| Decision | Outcome | Reference |
|----------|---------|-----------|
| Charting library | **Visx, POC in Sprint 0** | Decision 6 |
| Frontend stack | **shadcn/ui + Tailwind + Zustand + TanStack Query, no BFF** | Decision 7 |
| Predict endpoint pattern | **Separate: POST /lab-entries + POST /predict** | Decision 8 |
| Prediction result storage | **None in MVP, recompute on demand** | Decision 10 |
| Disclaimer mobile UX | **Sticky footer, collapsed/expandable, legal confirmation needed** | Decision 11 |
| Tier 2 transition rules | **BOTH hemoglobin AND glucose required** | Decision 12 |
| Test vectors | **10-20 from Lee, patient safety blocker** | Decision 13 |
| Audit log deletion behavior | **ON DELETE SET NULL for user_id** | Decision 14 |

---

## 8. Core Product Summary (for team context)

**What we are building:** A free, responsive web application where CKD patients enter 4-6 blood test values and instantly see a personalized 10-year eGFR trajectory chart showing four scenarios: no treatment, and three levels of BUN reduction. The chart answers the patient's core question: "Will this dietary intervention work for me?"

**Who it is for:** Primarily 60+ CKD patients in the US. Mobile-first, accessibility-critical. The design must be forgiving, clear, and not require technical literacy.

**What makes it unique:** Backed by 96 months of longitudinal dietary intervention data (the longest dataset in existence for this domain). The prediction model is Lee's proprietary IP -- all calculations are server-side only, never exposed to the client or any external service.

**Business model:** Free tool that serves as lead generation for Kidneyhood.org's paid dietary intervention program. Also serves as longitudinal data collection for an FDA validation study.

**Key constraint:** No AI generates clinical recommendations. The rules engine is deterministic, based on 8 years of clinical judgment. LLM access is limited to Phase 3 CS automation only.

**Staged rollout:** 100 patients (soft launch) --> 9,000 email subscribers --> US public --> International (Phase 3).

---

## 9. Immediate Next Steps (Post-Meeting 1)

1. ~~Resolve the 8 decisions above based on team discussion~~ **DONE — all resolved at Meeting 1**
2. Rewrite SPEC-20, SPEC-59, SPEC-60 for magic link auth (Action Items #1-3)
3. Build the KH-to-SPEC ID mapping table (Action Item #4)
4. Contact Lee for 10-20 validated test vectors (Action Item #5) — PATIENT SAFETY BLOCKER
5. Confirm with legal: collapsed sticky footer disclaimer (Action Item #6)
6. Co-author HIPAA compliance section with Gay Mark (Action Item #7)
7. Update all "purged on close" references to "server-side 24hr TTL" (Action Item #8)
8. Document Tier 2 transition rules in PRD (Action Item #9)
9. Write acceptance criteria for all Sprint 1 stories (Action Item #10)
10. Draft PRD Sections 1-5 (Problem Statement, Goals, Scope, User Flows, Functional Requirements) in `/agents/husser/drafts/`
11. Coordinate with Inga on responsive design, sticky footer disclaimer, and magic link auth flow wireframes
12. Coordinate with John on finalized two-endpoint API contract
13. Review Yuri's test strategy for alignment with acceptance criteria
