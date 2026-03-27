# Backend Engineering Meeting Memo — Validation Range Alignment

**From:** Luca (CTO)
**Date:** 2026-03-27
**Attendees:** Luca, John Donaldson, Gay Mark
**Agenda:** Yuri's QA findings on PRs #14-17, cross-boundary range conflicts, merge order
**Status:** BINDING — decisions below are final

---

## Binding Validation Ranges

All layers must conform to this table. No exceptions.

| Field | Frontend (validation.ts) | Pydantic (main.py) | DB CHECK | Migration? |
|-------|--------------------------|---------------------|----------|------------|
| **BUN** | 5–100 (soft cap + warning) | 5–150 | 5–150 | No |
| **Creatinine** | 0.3–20.0 | 0.3–20.0 | 0.3–20.0 | **Yes** (15→20) |
| **Potassium** | 2.0–8.0 | 2.0–8.0 | — | No |
| **Age** | 18–120 | 18–120 | 18–120 | No |
| **Hemoglobin** | 4.0–20.0 | 4.0–20.0 | — | No |
| **Glucose** | 40–500 | 40–500 | — | No |

**Note:** Creatinine max=20.0 is flagged for Lee confirmation (Q6 on LKID-14) before Sprint 3 prod release.

## Merge Order (Locked)

1. Gay Mark's DB migration (creatinine max 15→20)
2. PR #16 (fixtures — with Pydantic range reverts to match this table)
3. PR #15 (leads write — John rebases onto main post-PR16)
4. PR #14 (prediction form — Harshit updates validation.ts to match this table)
5. PR #17 (k6 + visual regression — rebase post-PR16)

## Action Items

| # | Owner | Action | Deadline |
|---|-------|--------|----------|
| 1 | **Gay Mark** | Alembic migration: `creatinine BETWEEN 0.3 AND 20.0` | Today |
| 2 | **John** | Rebase PR #15 onto main after PR16 merges | After PR16 merge |
| 3 | **John** | Add 3-segment JWT guard to `_extract_email_from_jwt()` | PR #15 |
| 4 | **Harshit** | Update `validation.ts`: BUN soft 100/hard 150, creatinine 0.3–20.0, hemoglobin 4.0–20.0, glucose 40–500 | PR #14 |
| 5 | **Harshit** | Fix error envelope parsing: `body.error.details[].message` | PR #14 |
| 6 | **PR16 author** | Revert Pydantic ranges to match binding table (undo PR16 widening) | Before merge |
| 7 | **Husser** | Add creatinine max=20.0 as Q6 to Lee's open questions on LKID-14 | Today |

---

*This memo supersedes the earlier brainstorm document (`qa-remediation-brainstorm.md`). The binding table above is the single source of truth for validation ranges.*
