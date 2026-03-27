# Merge Execution Plan — Sprint 2 Backend PRs

**Author:** Luca (CTO)
**Date:** 2026-03-27
**Authority:** backend-meeting-memo.md (BINDING)

---

## Merge Order

```
Step 1: PR #18 (webhook)         — independent, merge now
Step 2: Creatinine migration PR  — independent, merge after Gay Mark opens it
Step 3: PR #16 (fixtures)        — after Pydantic range reverts
Step 4: PR #15 (leads write)     — after John rebases onto main
Step 5: PR #14 (prediction form) — after Harshit updates validation.ts
Step 6: PR #19 (auth+form)       — after validation alignment confirmed
Step 7: PR #17 (k6+visual)       — after rebase onto main
```

---

## Step 1: PR #18 — Clerk Webhook (LKID-9)

**Branch:** `feat/LKID-9-clerk-webhook`
**Owner:** Harshit
**Blocker:** None — independent

### Pre-merge checks

```bash
# 1. Verify Vercel preview deployment (currently failing — investigate)
gh pr checks 18 --repo Automation-Architecture/LKID

# 2. Check if CodeRabbit review has landed
gh api repos/Automation-Architecture/LKID/pulls/18/reviews \
  --jq '.[] | "\(.user.login): \(.state)"'

# 3. Check for merge conflicts
gh pr view 18 --repo Automation-Architecture/LKID --json mergeable \
  --jq '.mergeable'
# Expected: MERGEABLE

# 4. Read the diff to confirm scope is clean
gh pr diff 18 --repo Automation-Architecture/LKID | head -100
```

### Known issue

Vercel preview deploy is failing. Before merging:

```bash
# Inspect the failed deployment
npx vercel inspect dpl_CrhamUNLDKwBjkidVnHenLRGLt4U --logs
```

If the failure is unrelated to the webhook code (e.g., Vercel config for backend-only PR), proceed. If it touches webhook files, fix first.

### Merge

```bash
gh pr merge 18 --repo Automation-Architecture/LKID --squash \
  --subject "feat(webhook): Clerk user.created webhook + DB lead upsert (LKID-9)"
```

### Post-merge verification

```bash
# Confirm merge
gh pr view 18 --repo Automation-Architecture/LKID --json state \
  --jq '.state'
# Expected: MERGED

# Verify main branch has the commit
gh api repos/Automation-Architecture/LKID/commits?per_page=3 \
  --jq '.[].commit.message' | head -5
```

### Jira transition

Transition LKID-9 to **Done**.

### Unblocks

Nothing directly — this is independent. But merging it reduces the open PR count and removes one variable from rebase conflicts.

---

## Step 2: Creatinine Migration PR (new)

**Branch:** `feat/LKID-creatinine-max-migration`
**Owner:** Gay Mark
**Blocker:** Gay Mark must create the PR first (action item #1 from meeting memo)

### Pre-merge checks

```bash
# 1. Confirm PR exists
gh pr list --repo Automation-Architecture/LKID --head feat/LKID-creatinine-max-migration

# 2. Verify migration content — must change creatinine CHECK from 15 to 20
gh pr diff <PR_NUMBER> --repo Automation-Architecture/LKID

# 3. Confirm the Alembic migration is well-formed
# Look for: ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT
# Creatinine range must be 0.3–20.0

# 4. Wait for CI + CodeRabbit
gh pr checks <PR_NUMBER> --repo Automation-Architecture/LKID

# 5. Confirm mergeable
gh pr view <PR_NUMBER> --repo Automation-Architecture/LKID --json mergeable
```

### Merge

```bash
gh pr merge <PR_NUMBER> --repo Automation-Architecture/LKID --squash \
  --subject "fix(db): widen creatinine CHECK constraint to 0.3–20.0"
```

### Post-merge verification

```bash
# Confirm merge
gh pr view <PR_NUMBER> --repo Automation-Architecture/LKID --json state

# Verify Railway deployment picks up the migration
# (check Railway dashboard or logs)
```

### Jira transition

No dedicated card — this is a sub-task of the range alignment decision. Add a comment on LKID-14 noting the migration is merged.

### Unblocks

**PR #16 (fixtures)** — fixtures depend on the DB schema being correct. Without this migration, test data with creatinine > 15 would violate the CHECK constraint.

---

## Step 3: PR #16 — Test Fixtures (LKID-55, 56, 57)

**Branch:** `feat/LKID-56-test-fixtures`
**Owner:** Yuri (author) — **Luca must request Pydantic reverts before merge**
**Blocker:** (a) Step 2 merged, (b) Pydantic ranges reverted to match binding table

### Engineer action required

**PR #16 author** must revert Pydantic range widening to match the binding table:

| Field | Required Pydantic Range |
|-------|------------------------|
| BUN | 5–150 |
| Creatinine | 0.3–20.0 |
| Potassium | 2.0–8.0 |
| Age | 18–120 |
| Hemoglobin | 4.0–20.0 |
| Glucose | 40–500 |

### Pre-merge checks

```bash
# 1. Confirm Step 2 (creatinine migration) is merged
gh pr view <STEP2_PR> --repo Automation-Architecture/LKID --json state

# 2. Verify Pydantic ranges have been reverted in the PR diff
gh pr diff 16 --repo Automation-Architecture/LKID | grep -A2 -B2 "creatinine\|bun\|potassium\|hemoglobin\|glucose"

# 3. Rebase onto main (picks up creatinine migration)
# Ask author to run: git rebase origin/main && git push --force-with-lease

# 4. Wait for CI green
gh pr checks 16 --repo Automation-Architecture/LKID

# 5. Check for merge conflicts
gh pr view 16 --repo Automation-Architecture/LKID --json mergeable
```

### Merge

```bash
gh pr merge 16 --repo Automation-Architecture/LKID --squash \
  --subject "feat(test): shared fixture library + CI validation (LKID-55,56,57)"
```

### Post-merge verification

```bash
gh pr view 16 --repo Automation-Architecture/LKID --json state
gh api repos/Automation-Architecture/LKID/commits?per_page=3 \
  --jq '.[].commit.message' | head -5
```

### Jira transition

Transition LKID-55, LKID-56, LKID-57 to **Done**.

### Unblocks

**PR #15 (leads write)** and **PR #17 (k6+visual)** — both depend on fixtures being in main.

---

## Step 4: PR #15 — Leads Write (LKID-11)

**Branch:** `feat/LKID-11-leads-write`
**Owner:** John Donaldson
**Blocker:** (a) Step 3 merged, (b) John rebases onto main, (c) John adds 3-segment JWT guard

### Engineer action required

**John Donaldson** must:
1. Rebase PR #15 onto main (picks up migration + fixtures)
2. Add 3-segment JWT guard to `_extract_email_from_jwt()` (action item #3 from memo)

### Pre-merge checks

```bash
# 1. Confirm Step 3 (fixtures) is merged
gh pr view 16 --repo Automation-Architecture/LKID --json state

# 2. Confirm rebase is done — no merge conflicts
gh pr view 15 --repo Automation-Architecture/LKID --json mergeable

# 3. Verify JWT guard is present in the diff
gh pr diff 15 --repo Automation-Architecture/LKID | grep -A5 "_extract_email_from_jwt"

# 4. Wait for CI green
gh pr checks 15 --repo Automation-Architecture/LKID

# 5. Check for CodeRabbit/Copilot reviews
gh api repos/Automation-Architecture/LKID/pulls/15/reviews \
  --jq '.[] | "\(.user.login): \(.state)"'
```

### Merge

```bash
gh pr merge 15 --repo Automation-Architecture/LKID --squash \
  --subject "feat(api): write prediction results to leads table (LKID-11)"
```

### Post-merge verification

```bash
gh pr view 15 --repo Automation-Architecture/LKID --json state
```

### Jira transition

Transition LKID-11 to **Done**.

### Unblocks

Downstream frontend PRs can now rely on the `/predict` endpoint persisting results to the leads table.

---

## Step 5: PR #14 — Prediction Form (LKID-16)

**Branch:** `feat/LKID-16-prediction-form`
**Owner:** Harshit
**Blocker:** (a) Steps 1–4 merged, (b) Harshit updates validation.ts, (c) Harshit fixes error envelope parsing

### Engineer action required

**Harshit** must:
1. Update `validation.ts` to match the binding table:
   - BUN: soft cap 100 (warning), hard cap 150 (reject)
   - Creatinine: 0.3–20.0
   - Hemoglobin: 4.0–20.0
   - Glucose: 40–500
2. Fix error envelope parsing to use `body.error.details[].message` (action item #5)
3. Rebase onto main

### Pre-merge checks

```bash
# 1. Confirm Steps 1–4 are merged
for pr in 18 16 15; do
  echo "PR #$pr: $(gh pr view $pr --repo Automation-Architecture/LKID --json state --jq '.state')"
done

# 2. Verify validation.ts ranges match binding table
gh pr diff 14 --repo Automation-Architecture/LKID | grep -A3 "BUN\|creatinine\|hemoglobin\|glucose"

# 3. Verify error envelope fix
gh pr diff 14 --repo Automation-Architecture/LKID | grep -B2 -A2 "details\[.*\].message"

# 4. Confirm rebase + no conflicts
gh pr view 14 --repo Automation-Architecture/LKID --json mergeable

# 5. Wait for CI green
gh pr checks 14 --repo Automation-Architecture/LKID
```

### Merge

```bash
gh pr merge 14 --repo Automation-Architecture/LKID --squash \
  --subject "feat(form): prediction form with 5 required + 2 optional fields (LKID-16)"
```

### Post-merge verification

```bash
gh pr view 14 --repo Automation-Architecture/LKID --json state
```

### Jira transition

Transition LKID-16 to **Done**.

### Unblocks

**PR #19 (auth+form integration)** — the form must be correct before the integration layer can merge.

---

## Step 6: PR #19 — Auth + Form Integration (LKID-7, 17, 18)

**Branch:** `feat/LKID-7-17-18-auth-form-integration`
**Owner:** Harshit
**Blocker:** (a) Step 5 merged, (b) validation.ts alignment confirmed in main

### Pre-merge checks

```bash
# 1. Confirm Step 5 (form) is merged
gh pr view 14 --repo Automation-Architecture/LKID --json state

# 2. Rebase onto main
# Ask Harshit to: git rebase origin/main && git push --force-with-lease

# 3. Confirm no conflicts after rebase
gh pr view 19 --repo Automation-Architecture/LKID --json mergeable

# 4. Verify validation.ts is NOT duplicated or overridden in this PR
gh pr diff 19 --repo Automation-Architecture/LKID | grep "validation.ts" || echo "OK — no validation.ts changes"

# 5. Run QA check — Yuri should sign off on auth flow
# Confirm on Jira or in PR comments

# 6. Wait for CI green + reviews
gh pr checks 19 --repo Automation-Architecture/LKID
gh api repos/Automation-Architecture/LKID/pulls/19/reviews \
  --jq '.[] | "\(.user.login): \(.state)"'
```

### Merge

```bash
gh pr merge 19 --repo Automation-Architecture/LKID --squash \
  --subject "feat(auth+form): magic link, email pre-fill, API integration (LKID-7,17,18)"
```

### Post-merge verification

```bash
gh pr view 19 --repo Automation-Architecture/LKID --json state
```

### Jira transition

Transition LKID-7, LKID-17, LKID-18 to **Done**.

### Unblocks

End-to-end auth flow is complete. Sprint 2 core path (auth -> form -> predict -> persist) is merged.

---

## Step 7: PR #17 — k6 + Visual Regression (LKID-48, 50, 58)

**Branch:** `feat/LKID-58-test-data-gen`
**Owner:** Yuri
**Blocker:** (a) Step 3 merged (fixtures), (b) rebase onto main

### Engineer action required

**Yuri** must rebase PR #17 onto main after Step 3 merges (fixtures must be available).

### Pre-merge checks

```bash
# 1. Confirm all prior PRs are merged
for pr in 18 16 15 14 19; do
  echo "PR #$pr: $(gh pr view $pr --repo Automation-Architecture/LKID --json state --jq '.state')"
done

# 2. Confirm rebase is done
gh pr view 17 --repo Automation-Architecture/LKID --json mergeable

# 3. Wait for CI green
gh pr checks 17 --repo Automation-Architecture/LKID

# 4. Check reviews
gh api repos/Automation-Architecture/LKID/pulls/17/reviews \
  --jq '.[] | "\(.user.login): \(.state)"'
```

### Merge

```bash
gh pr merge 17 --repo Automation-Architecture/LKID --squash \
  --subject "feat(test): k6 load tests, data gen, visual regression (LKID-48,50,58)"
```

### Post-merge verification

```bash
gh pr view 17 --repo Automation-Architecture/LKID --json state

# Final: all 7 PRs should be merged
gh pr list --repo Automation-Architecture/LKID --state open --json number,title
# Expected: empty list (or only PR #12 Clerk auth if still open)
```

### Jira transition

Transition LKID-48, LKID-50, LKID-58 to **Done**.

### Unblocks

Sprint 2 test infrastructure is complete. Sprint 3 QA can build on these fixtures and load tests.

---

## Engineer Action Summary

| Engineer | What | Which PR | Must complete before |
|----------|------|----------|---------------------|
| **Gay Mark** | Create creatinine migration PR (CHECK 15 -> 20) | New PR | Step 2 |
| **PR #16 author** | Revert Pydantic ranges to binding table | #16 | Step 3 |
| **John Donaldson** | Rebase + add 3-segment JWT guard | #15 | Step 4 |
| **Harshit** | Update validation.ts + fix error envelope parsing | #14 | Step 5 |
| **Harshit** | Rebase auth+form integration onto main | #19 | Step 6 |
| **Yuri** | Rebase k6+visual onto main | #17 | Step 7 |
| **Husser** | Add creatinine max=20.0 as Q6 on LKID-14 | Jira | Today (non-blocking) |

---

## Abort Conditions

- **CI red on main after any merge** — stop, diagnose, fix before continuing
- **Merge conflict that changes validation ranges** — re-verify against binding table before resolving
- **Railway deploy failure after creatinine migration** — roll back migration, diagnose, re-attempt before Step 3
- **Lee responds to Q6 with different creatinine max** — pause Step 3+, update binding table, propagate to all layers

---

*This plan supersedes the merge order section of backend-meeting-memo.md with operational detail. The binding validation ranges table in the memo remains the single source of truth for range values.*
