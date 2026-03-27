# Sprint 2 Merge Post-Mortem

> Date: March 27, 2026
> Author: Luca (CTO)
> Scope: PRs #12--#21, merged in a single session

---

## Summary

On March 27, 2026, we merged 11 PRs (#12--#21) in one session, moving ~15 Jira cards to Done. The merge process was chaotic, requiring manual intervention, a full PR rebuild, and an emergency engineering meeting to reconcile divergent validation ranges. This post-mortem documents what happened, why, and what we are changing.

---

## Timeline

| Event | Detail |
|-------|--------|
| Session start | 3 cards Done; 11 PRs open |
| Parallel dispatch | Harshit, John Donaldson, Gay Mark dispatched simultaneously to `/Users/brad/IDE/LKID` |
| Repo collision | Agents checked out different branches in the same working tree, stomping on each other |
| Manual untangle | Stashed changes recovered, branches manually separated |
| Worktree adoption | `isolation: "worktree"` introduced mid-session after collision |
| Sequential merges | PRs #14, #15, #16 merged; #17 and #19 now conflict with updated main |
| PR #19 rebuild | 10+ conflict markers; PR abandoned and rebuilt as PR #21 |
| PR #17 rebase | Manual rebase required against updated main |
| Range divergence found | Yuri's batch QA revealed creatinine validation ranges diverged across 4 layers |
| Engineering meeting | Binding validation range table produced (`backend-meeting-memo.md`) |
| Fixes applied | DB migration + fixes to 3 PRs to align ranges |
| API errors | Two agent dispatches hit Anthropic 500/529 errors, requiring retries |
| Session end | All 11 PRs merged; ~15 cards Done |

---

## What Went Well

1. **Volume:** 11 PRs merged in a single session, a Sprint 2 record.
2. **Card throughput:** ~15 cards moved to Done (started the day at 3).
3. **Engineering meeting outcome:** The backend engineering meeting produced a binding validation range table, resolving a long-standing ambiguity.
4. **QA caught real issues:** Yuri's batch QA identified cross-boundary problems (creatinine range mismatch, response shape mismatch) that would have shipped as bugs.

---

## What Went Wrong

### 1. Parallel Agent Repo Collision

Three agents (Harshit, John Donaldson, Gay Mark) were dispatched to work on the same `/Users/brad/IDE/LKID` directory simultaneously. Each checked out a different branch, stomping on each other's working trees. Changes got stashed, lost, or mixed across branches. Required manual untangling.

**Impact:** ~30 minutes lost to manual recovery. Risk of silent data loss.

### 2. Late Worktree Adoption

Git worktree isolation existed as a tool (`isolation: "worktree"`) but was not used until AFTER the collision. It should have been the default from the start for any parallel agent work.

**Impact:** The collision was entirely preventable.

### 3. Merge Conflicts from Sequential Merges

PRs #14, #15, #16 were merged in sequence. This caused PRs #17 and #19 to conflict with the updated main. PR #19 had 10+ conflict markers and had to be abandoned and rebuilt from scratch as PR #21. PR #17 required a manual rebase.

**Impact:** One PR destroyed and rebuilt. Significant time spent on conflict resolution.

### 4. Cross-Boundary Range Divergence

Validation ranges diverged across 4 layers (frontend form validation, Pydantic models, DB CHECK constraints, test fixtures) without anyone catching it until Yuri's batch QA. Each layer had independently guessed at acceptable ranges. Required an engineering meeting, a DB migration, and fixes to 3 PRs.

**Impact:** Potential for silent data corruption if ranges had shipped misaligned. Engineering meeting added to timeline.

### 5. Stale Branch Regression

PR #15 was branched from old main and would have regressed the `PredictRequest` model if merged without rebase. QA caught it, but the merge process should have caught it first.

**Impact:** Near-miss regression. Only caught by QA, not by process.

### 6. API 500 Errors

Two agent dispatches hit Anthropic API 500/529 errors, requiring retries and adding delay to the session.

**Impact:** Unpredictable delays. No mitigation available beyond retry.

---

## Root Causes

| Root Cause | Incidents |
|------------|-----------|
| No isolation protocol for parallel agent work | #1, #2 |
| No pre-merge rebase verification step | #3, #5 |
| Range values never centrally defined | #4 |
| No automated conflict detection before merge attempts | #3 |

---

## Corrective Actions

These are now **binding rules** in the Engineering SOP (see `docs/development-phase-engineering-sop.md`, "Merge Protocol" section).

### CA-1: Worktree Isolation Is Mandatory

All parallel agent work on the same repo MUST use `isolation: "worktree"` on Agent dispatches. No exceptions. Agents must never share a working tree.

### CA-2: Pre-Merge Rebase Check

Before merging any PR, verify it is conflict-free against current main:

```bash
git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main
```

If conflicts exist, the PR must be rebased before merge.

### CA-3: Binding Validation Range Table

One authoritative table exists in `agents/luca/drafts/backend-meeting-memo.md`. All layers (frontend, Pydantic, DB CHECK, fixtures) reference this table. No layer may define its own ranges independently. Any range change requires updating the table first, then propagating to all layers.

### CA-4: Sequential Merge Protocol

When merging multiple PRs in a session:

1. Rebase ALL PRs against current main first.
2. Verify all are conflict-free.
3. Merge in dependency order.
4. After each merge, re-verify remaining PRs if they touch overlapping files.

### CA-5: Stale Branch Detection

Any PR branch more than 2 days behind main must be rebased before QA review, not after. This is checked at PR creation and before any merge attempt.

---

## Metrics

| Metric | Value |
|--------|-------|
| PRs merged | 11 |
| PRs rebuilt from scratch | 1 (#19 -> #21) |
| PRs requiring manual rebase | 1 (#17) |
| Cards moved to Done | ~15 |
| Cross-boundary bugs found by QA | 2 |
| Agent collisions | 1 (3 agents) |
| API errors requiring retry | 2 |

---

## References

- Binding validation range table: `agents/luca/drafts/backend-meeting-memo.md`
- Engineering SOP merge protocol: `docs/development-phase-engineering-sop.md`
- Yuri Sprint 2 QA reports: `agents/yuri/drafts/sprint2-qa-report-1.md`
