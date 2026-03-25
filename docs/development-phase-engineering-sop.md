# Development Phase Engineering SOP

> Standard Operating Procedure for AI Agent Team Development Phase
> Version: 1.0

---

## Purpose

This SOP defines the workflow, roles, and responsibilities for the engineering team during the Development Phase. The Development Phase begins after the final PRD is approved (see `discovery-phase-engineering-sop.md`) and ends when all deliverables pass QA and are ready for deployment.

---

## Scope

This SOP covers implementation, QA, delivery, and memory compression. It assumes the Discovery Phase is complete and a signed-off PRD exists at `/artifacts/PRD.md`.

---

## Development Phase Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  DEVELOPMENT PHASE                          │
│                                                             │
│  1. Execution (parallel, autonomous)                        │
│         ↓                                                   │
│  2. QA Loop (continuous, blocking)                          │
│         ↓                                                   │
│  3. Final Output & Delivery                                 │
│         ↓                                                   │
│  4. Memory Write & Compression                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 1: Execution

Once the final PRD is approved:

1. Agents begin implementation per the sprint plan defined in the PRD.
2. Work proceeds in parallel where dependencies allow.
3. Agents may spawn sub-agents for focused tasks.
4. The artifact registry (`/artifacts/registry.json`) is continuously updated.
5. Agents write ONLY in their own `/agents/{name}/` workspace.
6. Finalized code and artifacts are published to `/app/` and `/artifacts/` respectively.

**Rules:**
- The PRD is the binding contract. Deviations require team discussion and Luca's approval.
- Agents must check Jira for dependency status before starting blocked work.
- Update Jira card status as work progresses (To Do → In Progress → Done).

---

### Step 2: QA Loop

Yuri (QA) runs continuous testing throughout the Development Phase.

**Process:**

```
Code submitted → Yuri tests → Pass? → Done
                                ↓ No
                         Blocking artifact issued
                                ↓
                         Agent fixes issue
                                ↓
                         Resubmit → Retest
```

**Rules:**
- Any test failure produces a **blocking artifact** — the responsible agent must fix before proceeding.
- Fix → resubmit → retest loop continues until the test passes.
- QA approval is REQUIRED before any deliverable is marked complete.
- Test results are recorded in `/tests/report.md`.

**Memory checkpoint:** After QA cycles, agents write memory entries capturing what passed, what failed, and what was learned.

---

### Step 3: Final Output & Delivery

Before the project is marked complete, the following must exist:

- [ ] Running app at `http://localhost:3000`
- [ ] `/tests/report.md` — approved by Yuri
- [ ] `/docs/build-summary.md` — final build documentation
- [ ] `/artifacts/PRD.md` — Final PRD from Discovery Phase
- [ ] `CLAUDE.md` — updated with deployment and next steps
- [ ] `/memory/compressed_summary.md` — consolidated learnings
- [ ] All `/memory/*.json` files populated with project-specific entries
- [ ] `/artifacts/registry.json` — complete artifact index

**Luca (CTO) synthesizes the FINAL_OUTPUT** and validates that all success conditions are met.

---

### Step 4: Memory Write & Compression

At project completion:

1. All agents write final memory entries to `/memory/*.json` files.
2. Luca synthesizes all entries into `/memory/compressed_summary.md`.

**Compressed summary structure:**

1. KEY PATTERNS — What worked best
2. KEY ANTI-PATTERNS — What to avoid
3. CRITICAL DECISIONS — And why they were made
4. PERFORMANCE INSIGHTS — Speed, quality improvements
5. TOOLING EFFECTIVENESS — What tools helped or hindered
6. RECOMMENDED APPROACH — If rebuilding this project from scratch

**Rules:**
- Focus on SIGNAL over volume.
- Remove redundant or low-value entries.
- Prioritize clarity and reuse.

---

## Development Phase Memory Checkpoints

Agents MUST write memory entries after architecture decisions, QA cycles, and at final completion. See `memory-system-reference.md` for entry format, write rules, and all checkpoint definitions.
