# Sprint 3 Commit & Merge Strategy

> Date: March 30, 2026
> Author: Luca (CTO)
> Status: Awaiting Brad's approval before execution

---

## Situation Assessment

We have uncommitted work in the main working tree (`/Users/brad/IDE/agent-teams`) on
branch `feat/LKID-19-visx-chart`, plus two worktrees with in-progress work. The changes
span five distinct concerns that must NOT be merged as a single blob.

### Sprint 2 Postmortem Lessons Applied

The Sprint 2 merge postmortem (CA-1 through CA-5) identified these root causes:

| Root Cause | How We Address It Here |
|------------|------------------------|
| No isolation protocol (CA-1) | Worktrees already exist for John and QA work |
| No pre-merge rebase (CA-2) | Both worktree branches rebase onto current main BEFORE PR |
| No sequential merge protocol (CA-4) | Explicit merge order with conflict checks between each |
| Stale branches (CA-5) | Both worktree branches are 12 commits behind main; rebase first |

### Current State Summary

**Main working tree** (`/Users/brad/IDE/agent-teams`, branch `feat/LKID-19-visx-chart`):
- Branch has ZERO commits ahead of main (all changes are uncommitted)
- 7 modified files + 10 untracked files spanning 3 different Jira concerns

**Worktree `/tmp/lkid-john/`** (branch `feat/LKID-14-rules-engine`):
- 0 commits ahead of `1600aa1` (merge base), 12 commits behind main
- 2 modified files: `backend/main.py`, `backend/prediction/engine.py`
- 1 untracked file: `backend/tests/test_prediction_engine.py`
- CONFLICT RISK: `backend/main.py` was modified on main since branch-off

**Worktree `/tmp/lkid-qa/`** (branch `feat/LKID-27-boundary-tests`):
- 1 commit ahead of `1600aa1` (merge base), 12 commits behind main
- Committed: `pytest.ini`, `conftest.py`, `boundary_sets.py`, `factories.py`,
  `golden_vectors.py`, `test_prediction_engine.py`
- CONFLICT RISK: `backend/tests/fixtures/factories.py` exists on both main and this branch
- Already pushed to remote

---

## Strategy: Four Branches, Sequential Merge

We separate the work into four independent branches, merge them in dependency order,
and rebase between each merge to keep every PR conflict-free.

### Branch Allocation

| Branch | Jira Card | Files | Source |
|--------|-----------|-------|--------|
| `main` (direct commit) | Ops/PM | CLAUDE.md, dispatches, agent drafts, dashboard fixes | Main tree |
| `feat/LKID-19-visx-chart` | LKID-19 | chart/*, package.json, package-lock.json, results/page.tsx | Main tree |
| `feat/LKID-5-disclaimers` | LKID-5 | disclaimer-block.tsx | Main tree |
| `feat/LKID-14-rules-engine` | LKID-14, LKID-25 | engine.py, main.py, test_prediction_engine.py | Worktree |
| `feat/LKID-27-boundary-tests` | LKID-27 | pytest.ini, conftest.py, fixtures/*, test_prediction_engine.py | Worktree |

### File-to-Branch Mapping (Detailed)

**Commit 1 — Direct to `main` (operational, no PR needed)**

These are project management updates, agent artifacts, and dashboard content fixes.
They don't change application logic and should ship immediately so Lee sees updated
dashboard data on next Vercel rebuild.

| File | Reason |
|------|--------|
| `CLAUDE.md` | Sprint 3 kickoff updates, known issues, automated processes |
| `app/src/components/dashboard/Horizon.tsx` | Fix stale sprint status display |
| `app/src/components/dashboard/WeeklyUpdate.tsx` | Add Week 2 update content |
| `active/DISPATCH-sprint3-backend.md` | John's Sprint 3 dispatch |
| `active/DISPATCH-sprint3-frontend.md` | Harshit's Sprint 3 dispatch |
| `active/DISPATCH-sprint3-qa.md` | Yuri+Gay Mark's Sprint 3 dispatch |
| `agents/harshit/drafts/lkid-19-poc-decision.md` | POC decision doc |
| `agents/john_donaldson/drafts/LKID-14-25-implementation-notes.md` | Implementation notes |
| `agents/yuri/drafts/qa-lkid-27-boundary-tests.md` | QA boundary test report |

**Commit 2 — `feat/LKID-19-visx-chart` branch (PR required)**

Pure LKID-19 feature work. Chart component + visx dependencies + results page wiring.

| File | Reason |
|------|--------|
| `app/package.json` | 10 @visx packages added |
| `app/package-lock.json` | Lockfile for visx packages |
| `app/src/components/chart/types.ts` | New — chart TypeScript types |
| `app/src/components/chart/transform.ts` | New — data transformation utils |
| `app/src/components/chart/EgfrChart.tsx` | New — the Visx eGFR trajectory chart |
| `app/src/components/chart/index.ts` | New — barrel export |
| `app/src/app/results/page.tsx` | Wire EgfrChart with sessionStorage data |

**Commit 3 — `feat/LKID-5-disclaimers` branch (PR required)**

Pure LKID-5 feature work. Medical disclaimers — mobile sticky, desktop inline, WCAG AA.

| File | Reason |
|------|--------|
| `app/src/components/disclaimer-block.tsx` | Medical disclaimer implementation |

**Already on branch — `feat/LKID-14-rules-engine` (PR required after commit + rebase)**

John's rules engine v2.0 rewrite + rate limiting. Currently uncommitted in worktree.

| File | Reason |
|------|--------|
| `backend/prediction/engine.py` | Rules engine v2.0 rewrite |
| `backend/main.py` | Rate limiting middleware |
| `backend/tests/test_prediction_engine.py` | Unit tests for engine |

**Already on branch — `feat/LKID-27-boundary-tests` (PR required after rebase)**

QA boundary tests. Already committed + pushed, but needs rebase onto current main.

| File | Reason |
|------|--------|
| `backend/pytest.ini` | pytest configuration |
| `backend/tests/conftest.py` | Test fixtures/conftest |
| `backend/tests/fixtures/boundary_sets.py` | Boundary test data |
| `backend/tests/fixtures/factories.py` | Test factories (CONFLICT RISK) |
| `backend/tests/fixtures/golden_vectors.py` | Golden vector test data |
| `backend/tests/test_prediction_engine.py` | Comprehensive boundary tests |

---

## Execution Plan

### Phase 1: Stash and Separate (Main Working Tree)

**Goal:** Extract the mixed changes into clean, isolated commits on the correct branches.

```
Step 1.1: Save all current work
  $ cd /Users/brad/IDE/agent-teams
  $ git stash push -u -m "sprint3-mixed-changes"

Step 1.2: Switch to main, commit operational changes
  $ git checkout main
  $ git stash pop
  # Stage ONLY operational files:
  $ git add CLAUDE.md
  $ git add app/src/components/dashboard/Horizon.tsx
  $ git add app/src/components/dashboard/WeeklyUpdate.tsx
  $ git add active/DISPATCH-sprint3-backend.md
  $ git add active/DISPATCH-sprint3-frontend.md
  $ git add active/DISPATCH-sprint3-qa.md
  $ git add agents/harshit/drafts/lkid-19-poc-decision.md
  $ git add agents/john_donaldson/drafts/LKID-14-25-implementation-notes.md
  $ git add agents/yuri/drafts/qa-lkid-27-boundary-tests.md
  $ git commit  # "chore: Sprint 3 kickoff — dispatches, dashboard fixes, known issues"
  $ git push origin main

Step 1.3: Stash remaining changes (LKID-19 + LKID-5 files)
  # Remaining unstaged: package.json, package-lock.json, results/page.tsx,
  #   disclaimer-block.tsx, chart/* directory
  $ git stash push -u -m "sprint3-feature-changes"

Step 1.4: Create LKID-5 disclaimers branch from updated main
  $ git checkout -b feat/LKID-5-disclaimers main
  $ git stash pop
  # Stage ONLY disclaimer file:
  $ git add app/src/components/disclaimer-block.tsx
  $ git commit  # "feat(ui): LKID-5 medical disclaimers — mobile sticky, desktop inline, WCAG AA"
  # Re-stash the remaining LKID-19 changes:
  $ git stash push -u -m "lkid-19-chart-changes"

Step 1.5: Switch to LKID-19 branch, apply chart changes
  $ git checkout feat/LKID-19-visx-chart
  $ git reset --hard main  # Reset to current main (branch had 0 commits ahead)
  $ git stash pop
  # Stage ALL remaining files (should be only LKID-19 related):
  $ git add app/package.json app/package-lock.json
  $ git add app/src/components/chart/
  $ git add app/src/app/results/page.tsx
  $ git commit  # "feat(chart): LKID-19 Visx eGFR trajectory chart + results page wiring"
```

**Verification after Phase 1:**
- `main` has operational commit, pushed, Vercel rebuilds (Lee sees dashboard fixes)
- `feat/LKID-5-disclaimers` has 1 commit ahead of main (disclaimer only)
- `feat/LKID-19-visx-chart` has 1 commit ahead of main (chart + visx only)
- No stashes remaining
- Run `git stash list` to confirm empty

### Phase 2: Worktree Branches (Commit + Rebase)

**Goal:** Get worktree changes committed and rebased onto current main.

```
Step 2.1: Commit John's work in worktree
  $ cd /tmp/lkid-john
  $ git add backend/prediction/engine.py backend/main.py backend/tests/test_prediction_engine.py
  $ git commit  # "feat(api): LKID-14 rules engine v2.0 + LKID-25 rate limiting"

Step 2.2: Rebase John's branch onto main
  $ git fetch origin main
  $ git rebase origin/main
  # EXPECTED CONFLICT: backend/main.py — resolve manually
  #   (John's rate limiting changes should be additive to main's minor fix)
  # After resolving:
  $ git rebase --continue

Step 2.3: Verify John's branch is conflict-free against main
  $ git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main
  # Must show NO conflict markers

Step 2.4: Rebase QA branch onto main
  $ cd /tmp/lkid-qa
  $ git fetch origin main
  $ git rebase origin/main
  # EXPECTED CONFLICT: backend/tests/fixtures/factories.py
  #   QA branch creates factories.py but main also has one from Sprint 2 PR #16.
  #   Resolution: merge both sets of factories (QA version extends Sprint 2 base).
  # After resolving:
  $ git rebase --continue

Step 2.5: Verify QA branch is conflict-free against main
  $ git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main
  # Must show NO conflict markers
```

**Verification after Phase 2:**
- Both worktree branches are rebased onto current main HEAD
- Both pass merge-tree conflict check
- `git log --oneline main..HEAD` shows clean commit(s) on each

### Phase 3: PRs and Sequential Merge

**Goal:** Open PRs, get reviews, merge in the correct order.

**MERGE ORDER (dependency-aware, lowest risk first):**

```
PR 1: feat/LKID-5-disclaimers
  - Zero overlap with any other branch (touches only disclaimer-block.tsx)
  - Smallest change, lowest risk
  - Can merge immediately after review
  - Push: git push -u origin feat/LKID-5-disclaimers
  - Open PR: gh pr create --base main

PR 2: feat/LKID-19-visx-chart
  - Adds new files (chart/*) + modifies package.json and results/page.tsx
  - No overlap with PR 1
  - Does NOT need rebase after PR 1 merge (no file overlap)
  - Push: git push -u origin feat/LKID-19-visx-chart
  - Open PR: gh pr create --base main

PR 3: feat/LKID-27-boundary-tests
  - Backend-only (tests/fixtures)
  - No overlap with PR 1 or PR 2 (frontend vs backend)
  - But shares test_prediction_engine.py file name with PR 4
  - MUST merge BEFORE PR 4 (John's engine rewrite) because:
    * QA tests should be in place before the engine changes
    * If engine merges first, test expectations may need updating
  - Push: git push -u origin feat/LKID-27-boundary-tests (force-with-lease, rebased)
  - Open PR: gh pr create --base main

  >>> PAUSE: After PR 3 merges, rebase PR 4 onto new main <<<
  $ cd /tmp/lkid-john
  $ git fetch origin main && git rebase origin/main
  # EXPECTED CONFLICT: backend/tests/test_prediction_engine.py
  #   (QA's version is now on main; John's version in worktree)
  #   Resolution: John's test file should import from QA's fixtures/conftest
  #   and add engine-specific tests on top

PR 4: feat/LKID-14-rules-engine
  - Largest risk — rewrites engine.py (415 lines changed)
  - Depends on PR 3's test infrastructure being on main
  - MUST be last to merge
  - Push: git push -u origin feat/LKID-14-rules-engine
  - Open PR: gh pr create --base main
```

**Merge verification after each PR (per Development SOP):**
1. `git pull origin main` in main working tree
2. Verify Vercel build passes (frontend PRs)
3. Verify backend tests pass locally (backend PRs)
4. Confirm no regressions via `git diff --stat` between expected and actual

---

## Conflict Risk Matrix

| PR A | PR B | Overlapping Files | Risk | Mitigation |
|------|------|-------------------|------|------------|
| LKID-5 | LKID-19 | None | NONE | N/A |
| LKID-5 | LKID-27 | None | NONE | N/A |
| LKID-5 | LKID-14 | None | NONE | N/A |
| LKID-19 | LKID-27 | None | NONE | N/A |
| LKID-19 | LKID-14 | None | NONE | N/A |
| LKID-27 | LKID-14 | `test_prediction_engine.py` | HIGH | Merge LKID-27 first, rebase LKID-14 onto result |

Only one conflict pair exists (LKID-27 vs LKID-14), and the merge order handles it.

---

## Rollback Plan

If any merge introduces a regression:

1. **Frontend (LKID-5, LKID-19):** Revert commit on main, Vercel auto-redeploys
2. **Backend (LKID-27, LKID-14):** Revert commit on main; Railway auto-redeploys from main
3. **Operational commit:** Only touches docs/dashboard content — zero app logic risk

Each PR is self-contained, so reverting one does not affect the others.

---

## Checklist (For Execution)

- [ ] Phase 1.1: Stash all changes
- [ ] Phase 1.2: Commit operational changes to main, push
- [ ] Phase 1.3: Stash remaining feature changes
- [ ] Phase 1.4: Create feat/LKID-5-disclaimers, commit, re-stash
- [ ] Phase 1.5: Reset feat/LKID-19-visx-chart to main, pop stash, commit
- [ ] Phase 1 verification: git stash list is empty, 3 branches correct
- [ ] Phase 2.1: Commit John's worktree changes
- [ ] Phase 2.2: Rebase John's branch (resolve main.py conflict)
- [ ] Phase 2.3: Verify John's branch conflict-free
- [ ] Phase 2.4: Rebase QA branch (resolve factories.py conflict)
- [ ] Phase 2.5: Verify QA branch conflict-free
- [ ] Phase 3: Open PR 1 (LKID-5), get review, merge
- [ ] Phase 3: Open PR 2 (LKID-19), get review, merge
- [ ] Phase 3: Open PR 3 (LKID-27), get review, merge
- [ ] Phase 3: Rebase LKID-14 onto new main (resolve test file conflict)
- [ ] Phase 3: Open PR 4 (LKID-14), get review, merge
- [ ] Post-merge: Pull main, verify Vercel + Railway builds green
- [ ] Post-merge: Clean up worktrees (`git worktree remove`)
- [ ] Post-merge: Delete merged feature branches locally and remotely

---

## Time Estimate

| Phase | Estimated Time | Notes |
|-------|---------------|-------|
| Phase 1 (separate + commit) | 10 min | Mechanical git operations |
| Phase 2 (worktree rebase) | 15 min | Conflict resolution may add time |
| Phase 3 (PRs + merge) | 30-45 min | Depends on review turnaround |
| Post-merge verification | 10 min | Build checks + smoke test |
| **Total** | **~65-80 min** | |

---

## Why This Order

1. **Operational first** — Lee sees dashboard fixes immediately on Vercel rebuild.
   No PR needed; these are docs, dispatches, and display content.

2. **LKID-5 (disclaimers) second** — Single file, zero overlap, lowest risk.
   Gets medical compliance content shipped early.

3. **LKID-19 (chart) third** — New files mostly (chart/*), plus visx packages.
   No backend overlap. Frontend-only risk.

4. **LKID-27 (boundary tests) fourth** — Test infrastructure must land before
   the engine rewrite. Establishes the test safety net.

5. **LKID-14 (rules engine) last** — Largest change (415+ lines). Highest risk.
   Benefits from having boundary tests already on main to catch regressions.
   The test file conflict is resolved with full context of what QA expects.

This mirrors the Sprint 2 postmortem's CA-4 (sequential merge protocol): merge in
dependency order, verify between each, never stack risk.
