# Task: Fix Lean Launch Stories for Sprint 2

**Priority:** P0 — must be done before Sprint 2 (Apr 6)
**Assigned to:** Husser (Product Manager)
**Date:** 2026-03-26

---

## What's Wrong

Your `lean-launch-stories.md` has several issues that will cause wrong implementations in Sprint 2:

### 1. Potassium references (5 stories)
Lee's v2.0 spec explicitly removed potassium from the marketing app engine inputs. Your stories still reference it:
- LEAN-005, LEAN-006, LEAN-009, LEAN-011, LEAN-022

**Fix:** Remove all potassium references. Inputs are: BUN, creatinine, age (required) + hemoglobin, CO2, albumin (optional Tier 2, deferred).

### 2. eGFR threshold wrong
LEAN-014 (chart story) says "Dialysis threshold line displayed at eGFR 15." Lee's calc spec corrects this to **eGFR 12**.

**Fix:** Change all eGFR 15 references to eGFR 12.

### 3. LEAN-xxx vs LKID-xxx numbering
The sprint plan in CLAUDE.md references LKID-1 through LKID-29. Your stories use LEAN-xxx numbering. This creates confusion when agents cross-reference.

**Fix:** Align numbering to LKID-xxx, or add a mapping table at the top of the file showing which LEAN-xxx maps to which LKID-xxx.

### 4. Field count
Stories that say "4 required fields" or "4 lab values" should say "3 required fields" / "3 lab values" (BUN, creatinine, age). The PRD has already been corrected.

## How To Fix

1. Read the updated PRD: `artifacts/lean-launch-mvp-prd.md` (corrected Mar 26)
2. Read Lee's calc spec: `server_side_calc_spec_v1.md` (Section 2.3 — potassium removal)
3. Do a search-and-replace through `lean-launch-stories.md`
4. Verify every story's acceptance criteria matches the corrected scope

## Reference

- Lean Launch PRD: `artifacts/lean-launch-mvp-prd.md`
- Lee's calc spec: `server_side_calc_spec_v1.md`
- Inga's sign-off exceptions: `agents/inga/drafts/design-sprint-sign-off.md`
