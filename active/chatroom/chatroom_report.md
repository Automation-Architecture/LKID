# Backend Engineering Meeting Report

**Problem**: Resolve Yuri's QA findings across PRs #14-17 — validation range conflicts, merge order, action items
**Agents**: 3 | **Rounds**: 2 (converged early)
**Date**: 2026-03-27

## Participants

| Agent | Role | Final Confidence |
|-------|------|-----------------|
| Luca | CTO / Chair | 8/10 |
| John Donaldson | API / Backend Engineer | 8/10 |
| Gay Mark | Database Engineer | 8/10 |

## Consensus

All three agents converged on the following binding decisions:

### Authoritative Validation Ranges

| Field | Frontend | Pydantic (API) | DB CHECK | Notes |
|-------|----------|---------------|----------|-------|
| BUN | 5–100 (soft cap, warning above) | 5–150 | 5–150 | Frontend warns but allows submission up to 150 |
| Creatinine | 0.3–20.0 | 0.3–20.0 | 0.3–20.0 | **DB migration needed** (currently 15.0 max). Pending Lee confirmation for prod. |
| Potassium | 2.0–8.0 | 2.0–8.0 | (not constrained) | All layers agree |
| Age | 18–120 | 18–120 | 18–120 | All layers agree |
| Hemoglobin | 4.0–20.0 | 4.0–20.0 | (not constrained) | Main branch values are correct; PR16 widening must revert |
| Glucose | 40–500 | 40–500 | (not constrained) | Main branch values are correct; PR16 widening must revert |

### Key Decisions

1. **Creatinine min stays at 0.3** — Values below 0.3 are not realistic for the CKD patient population. John conceded his 0.1 position.
2. **Creatinine max widens to 20.0** — Stage 5 patients pre-dialysis can reach 15-18 mg/dL. All three agreed 20.0 covers the clinical tail with margin. Luca conceded from 15.0, John conceded from 25.0.
3. **BUN Pydantic max = 150** — Luca's tiebreaker: Pydantic matches DB at 150. Frontend soft-caps at 100 with a UX warning. Gay Mark's concern about untested engine territory is valid but addressed at the UX layer, not the API validation layer.
4. **Gay Mark cuts an Alembic migration** to widen creatinine max from 15.0 to 20.0. Migration deploys before PR16 merges.
5. **Flag creatinine max=20.0 for Lee confirmation** before Sprint 3 prod release. Not a Sprint 2 blocker.

### Merge Order (Binding)

1. Gay Mark's DB migration (creatinine max 15.0 → 20.0)
2. PR #16 (fixtures + CI — with Pydantic range reverts)
3. PR #15 (leads write — John rebases onto current main)
4. PR #14 (prediction form — Harshit updates validation.ts)
5. PR #17 (k6 + visual regression — rebase after PR16)

## Key Disagreement (Resolved)

**BUN Pydantic max: 100 vs 150**

Gay Mark argued Pydantic should cap at 100 because the prediction engine hasn't been tested above BUN=53. Luca and John argued Pydantic should match DB at 150 to maintain layer consistency, with the frontend handling the UX concern.

**Resolution (Luca's call):** Pydantic = 150, frontend = 100 soft cap with warning. The prediction engine will produce results for BUN 100-150 that are extrapolations beyond test vectors — the UX warning makes this transparent to the user.

## Action Items

| Owner | Action | PR |
|-------|--------|-----|
| **Gay Mark** | Alembic migration: creatinine max 15.0 → 20.0 | New PR (merge first) |
| **John** | Rebase PR #15 onto current main after PR16 merges | PR #15 |
| **John** | Add 3-segment JWT guard to lead write | PR #15 |
| **Harshit** | Update validation.ts: creatinine 0.3–20.0, BUN soft cap 100 / hard 150, hemoglobin 4.0–20.0, glucose 40–500 | PR #14 |
| **Harshit** | Fix error envelope parsing: `body.error.details[].message` not `body.detail[].msg` | PR #14 |
| **Yuri/Fixtures** | Revert PR16 Pydantic ranges to match binding table. Update factory boundaries. | PR #16 |
| **Husser** | Add Lee confirmation of creatinine max=20.0 as Q6 on LKID-14 | Jira comment |

## Unresolved Risks

1. **Creatinine max=20.0 is a clinical estimate, not a confirmed value.** Lee must sign off before prod. If Lee says the ceiling should be different, one migration + one Pydantic bump handles it.
2. **BUN values 100-150 produce extrapolated predictions.** The engine was tested only up to BUN=53. A UX warning is the agreed mitigation, but the predictions in that range may be less accurate.
3. **Hemoglobin and glucose have no DB CHECK constraints.** They're validated only at Pydantic. If a future code path bypasses Pydantic, invalid values could reach the DB. Low risk for MVP.

## Debate Highlights

- **Luca moved the most** — conceded creatinine max from 15.0 to 20.0 after Gay Mark's clinical argument about Stage 5 patients. Originally insisted "no DB migration needed," ended agreeing one was necessary.
- **John moved on creatinine min** — dropped 0.1 to 0.3 after Gay Mark argued it's not realistic for CKD patients. Also dropped 25.0 to 20.0 for creatinine max.
- **Gay Mark held firm on DB-as-floor** while conceding that one migration was needed. His position was the most stable across rounds.
- The critical insight: **the DB constraint at 15.0 was an implementation artifact, not a clinical decision.** All three agents agreed the original constraint was too tight for Stage 5 patients.
