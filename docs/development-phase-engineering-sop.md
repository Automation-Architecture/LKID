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

## Merge Protocol

> Added March 27, 2026 following Sprint 2 merge post-mortem.
> See `agents/luca/drafts/sprint2-merge-postmortem.md` for full context.

These rules are **binding** for all merge operations. Violations are blocking findings.

### Rule 1: Worktree Isolation Is Mandatory

All parallel agent work on the same repo MUST use `isolation: "worktree"` on Agent dispatches. Agents must never share a working tree. This applies to any scenario where two or more agents are dispatched to the same repository concurrently.

**Rationale:** On Mar 27, three agents checked out different branches in the same working tree, causing stashed changes, lost work, and cross-branch contamination.

### Rule 2: Pre-Merge Rebase Check

Before merging any PR, verify it is conflict-free against current main:

```bash
git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main
```

If the output contains conflict markers, the PR must be rebased before merge. No exceptions.

**Rationale:** PRs #17 and #19 conflicted with main after earlier PRs were merged. PR #19 had 10+ conflicts and had to be rebuilt from scratch.

### Rule 3: Binding Validation Range Table

One authoritative validation range table exists in `agents/luca/drafts/backend-meeting-memo.md`. All layers (frontend form validation, Pydantic models, DB CHECK constraints, test fixtures) MUST reference this table. No layer may define its own ranges independently. Any range change requires:

1. Update the authoritative table first.
2. Propagate to all layers in the same PR or coordinated PR set.
3. QA verifies all layers match.

**Rationale:** Validation ranges diverged across 4 layers without detection until Yuri's batch QA. Required an engineering meeting, a DB migration, and fixes to 3 PRs.

### Rule 4: Sequential Merge Protocol

When merging multiple PRs in a single session:

1. Rebase ALL PRs against current main before starting merges.
2. Verify all are conflict-free.
3. Merge in dependency order (base layers first, then consumers).
4. After each merge, re-verify remaining PRs if they touch overlapping files.

**Rationale:** Merging PRs #14, #15, #16 in sequence without pre-rebasing caused downstream PRs to conflict with updated main.

### Rule 5: Document Graduation

When a document becomes binding (referenced in a closed Jira card, signed off by Luca or Husser, no open revision comments), the owning agent must:

1. Copy the document to their `agents/{name}/outputs/` folder.
2. Update the Key Documents table in `CLAUDE.md` — set Status to `Final` and verify the path is correct.
3. The original in `drafts/` remains as the working copy. The `outputs/` copy is the point-in-time finalized version.

Husser audits the Key Documents table during daily board sweeps. Any binding document missing from the table or with a stale path is a sweep finding.

**Merge checklist addition:** Before merging any PR that modifies a document listed in Key Documents, verify the table row is updated in the same PR.

**Rationale:** Sprint 2 closed with 11 binding documents but only 9 listed in the Key Documents table. Agent `outputs/` folders were empty because no graduation criteria existed.

### Rule 6: Stale Branch Detection

Any PR branch more than 2 days behind main must be rebased before QA review, not after. This check applies at:

- PR creation
- QA review start
- Pre-merge verification

**Rationale:** PR #15 was branched from old main and would have regressed the `PredictRequest` model if merged without rebase. Only caught by QA, not by process.

### Rule 7: Binding Deploy Runbooks + Runbook-Delta Review

Runbooks that describe how prod is deployed are **binding**, not reference. Any PR that adds, removes, or changes a step in a binding runbook must include a **runbook-delta** line in the PR description that names the affected runbook and summarizes the change. Reviewers block merge if a deploy-touching PR is missing that line.

**Currently binding runbooks:**

- `agents/luca/drafts/railway-deployment-checklist.md` — backend deploy, DB migrations, env-var changes on Railway
- (Add here as more are promoted from reference → binding)

**Rationale:** LKID-68 root-caused an 8-day empty-DB state to a migration step that lived in prose in `railway-deployment-checklist.md` but was never codified. Prose runbooks decay; binding runbooks + a mandatory delta note in every deploy-touching PR force the update to happen in-band with the code change.

### Rule 8: G1 preDeployCommand Is Fail-Closed, Permanent

The Railway `preDeployCommand` migration guardrail (G1, added in PR #39) is **fail-closed and non-bypassable.** A deploy that cannot run `alembic upgrade head` to success does NOT proceed. This applies to all environments including emergency hotfixes — migrations run first, or nothing ships.

- No `--skip-migrations` flag
- No "deploy without G1" mode in Railway config
- Hotfix protocol: if the bug is in a migration, write a fix-migration, don't bypass the guard

**Rationale:** Any bypass renders the guardrail worthless. LKID-68 established that a single missed migration caused an 8-day silent-data-loss window; making G1 optional in any scenario reintroduces the exact failure mode it was built to prevent. Migrations are authored as reversible; if prod can't run them, prod can't take the code that depends on them.

---

## Development Phase Memory Checkpoints

Agents MUST write memory entries after architecture decisions, QA cycles, and at final completion. See `memory-system-reference.md` for entry format, write rules, and all checkpoint definitions.
