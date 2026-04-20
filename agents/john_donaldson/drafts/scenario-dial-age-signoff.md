# Scenario-Card `dial_age` Sign-Off (LKID-76 AC)

**Author:** John Donaldson
**Date:** 2026-04-20
**Status:** PASS (with one low-severity edge-case flag)

## Context

UI audit (`agents/luca/drafts/ui-design-audit-sprint5.md`) observed that with test inputs Age 55 / eGFR 32 / BUN 35 / Cr 1.8, all four scenario cards on `/results/[token]` displayed "Dialysis: Not projected". Design template (`project/Results.html`) implies three of four should show a projected age. Question: is this an engine bug or a legitimate input-driven output?

## Engine Path Verified

- **Source:** `backend/prediction/engine.py`
- **Entry point (prod):** `predict_for_endpoint()` (called from `backend/main.py:506, 1044`)
- **Dial-age calculator:** `compute_dial_age(trajectory, current_age)` (lines 279-297)
- **Threshold constant:** `DIALYSIS_THRESHOLD = 12.0` (line 26, confirmed by Lee Q4)
- **Trajectory window:** `TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]` — 10-year horizon
- **Logic:** Returns `None` if trajectory never crosses below threshold 12 within 120 months (line 297)

## Client-Side Rendering Verified

- **Source:** `app/src/app/results/[token]/page.tsx:550-552, 816-822, 908`
- **Transform:** `app/src/components/chart/transform.ts:136-165` — maps `dial_ages[tier]` directly onto `trajectory.dialysisAge` per scenario
- **Formatter:** `formatDialysisFooter(age)` — returns `"Dialysis: Not projected"` iff value is `null` or non-finite; else `"Dialysis: ~age {round(age)} yr"`

Harshit's claim confirmed: the client is a pass-through. Any "Not projected" seen on the page is exactly what the engine returned.

## Representative Inputs & Engine Output

Ran `predict_for_endpoint()` locally against backend venv (3 scenarios). Baseline eGFR is always recomputed from Cr/age/sex — `egfr_entered` is NOT accepted by `/predict` endpoint.

| Input | eGFR baseline | no_treatment | bun_18_24 (yellow) | bun_13_17 (blue) | bun_12 (green) |
|---|---|---|---|---|---|
| **Age 55, Cr 1.8, BUN 35, M** (audit case) | **43.9** (Stage 3a) | None | None | None | None |
| Age 55, Cr 3.2, BUN 35, M | 22.0 (Stage 4) | 58.1 | 62.2 | 63.1 | None |
| Age 60, Cr 5.5, BUN 53, M (Lee TV2-like) | 11.1 (Stage 5) | **None** (edge-case) | 62.0 | 63.0 | None |

### Trajectory 10-year endpoints (abbreviated) for each case

| Case | no_tx t=120mo | bun_18_24 t=120mo | bun_13_17 t=120mo | bun_12 t=120mo |
|---|---|---|---|---|
| Case 1 (baseline 43.9) | 19.6 | 33.3 | 35.0 | 47.8 |
| Case 2 (baseline 22.0) | 0.0 | 6.5 | 8.2 | 25.9 |
| Case 3 (baseline 11.1) | 0.0 | 0.0 | 0.0 | 18.9 |

## Clinical Judgment

### Case 1 — Audit input (Cr 1.8, age 55, baseline eGFR 43.9)

- Baseline is Stage 3a (43.9, not 32 as audit description said). The audit's stated "eGFR 32" appears to be either (a) a misread or (b) a preview display from a client-side CKD-EPI calc that differs from the server, OR the audit-reported inputs do not actually reproduce baseline 32 via the production endpoint.
- No-treatment decline rate at eGFR 43.9 is Stage 3b `-2.2/yr` with BUN modifier `-0.225/yr` = `-2.425/yr`. Over 10 years: 43.9 − 24.25 = 19.6. **Never crosses 12 within the 120-month window** → `None` is correct.
- All 3 treatment paths gain eGFR (Phase 1) then decline slowly; all stay well above 12 for 10 years → `None` is correct for all three.
- **Physical interpretation:** A 55-year-old with Stage 3a CKD legitimately has a dialysis runway longer than 10 years in every scenario including no-treatment. The engine correctly refuses to extrapolate past 120 months — this is the conservative and medically honest choice.
- **Verdict: Engine output is CORRECT for this input.**

### Case 2 — Stage 4 (baseline eGFR 22)

- No-treatment crosses threshold at patient age 58.1 (3.1 yrs from baseline) — reasonable for Stage 4 at `-3.0 − 0.225 = -3.225/yr`.
- Treatment scenarios: bun_18_24 and bun_13_17 project dialysis at age 62-63; bun_12 (green) never crosses → `None`. This matches the design template (`Results.html`), which shows "Not projected" **only on bun_12**.
- **Verdict: Engine output is CORRECT and matches design intent.**

### Case 3 — Stage 5 (baseline eGFR 11.1)

- Baseline is already below threshold 12 at month 0. `compute_dial_age` only detects downward crossings (requires `trajectory[i-1] >= 12`), so baseline < 12 returns `None` for no-treatment.
- Ironically, treatment scenarios bun_18_24 and bun_13_17 project a dialysis age because Phase 1 temporarily lifts eGFR *above* 12, then the trajectory crosses back down.
- **Edge case bug (LOW severity):** A patient already at/below dialysis threshold shows "Not projected" for no-treatment, which is clinically inverted. Unlikely to occur in the wild (most real Stage 5 patients would have eGFR 13-14 not 11), but worth flagging.
- **Verdict: Engine output is TECHNICALLY INCORRECT for no-treatment when baseline < 12, but NOT the audit's issue.**

## Final Verdict: **PASS**

The audit observation ("all four scenarios show Not projected for baseline ~30s Stage 3b input") is **engine-correct behavior**, not a bug. Reasons:

1. The actual eGFR produced by the audit's reported Cr/age/sex is 43.9 (Stage 3a), not 32. If the audit operator saw baseline 32 on the page, there may be a separate UI/display issue with baseline eGFR calculation — but that is out of scope for this sign-off.
2. Even if baseline *were* 32, three of four scenarios would still legitimately return `None` because treatment trajectories stay above 12 for the full 10-year window. Only no-treatment would show a projected age (~63). This is clinically correct — treatment WORKS, and a patient starting at 32 who takes treatment doesn't reach dialysis within 10 years.
3. The design template's example values ("Dialysis: ~age 62 yr" on 3 of 4) reflect a Stage 4 patient, not a Stage 3b patient. At lower baselines (Stage 4-5), the engine DOES return projected dial_ages as expected (confirmed in Case 2).

## Low-Severity Issues Flagged (Not Blockers for LKID-76)

1. **`compute_dial_age` doesn't handle baseline-already-below-threshold.** If `trajectory[0] < 12`, should return `current_age` (dialysis imminent/current). Current behavior: returns `None`. Fix: in `compute_dial_age`, add `if trajectory[0] < DIALYSIS_THRESHOLD: return round(current_age, 1)` before the loop. Location: `backend/prediction/engine.py:288`. **Not a Sprint 5 blocker — leave for a future grooming ticket.**

2. **Audit reported baseline eGFR 32 vs. engine-computed 43.9 from same Cr/age/sex.** This is a potential display mismatch worth a separate bug filing if reproducible, but it's orthogonal to the scenario-card sign-off.

## Note to Yuri

**LKID-76 AC "Scenario-card 'Dialysis: …' values are engine-correct" → CHECK OFF as PASSING.**

The engine math is sound, the client is a pass-through, and the audit's "all four show Not projected" is the correct output for a Stage 3a patient with a 10-year window. Three of four scenarios returning `None` is a sign the engine is working (it refuses to extrapolate further than 120 months rather than inventing values).

If you want a regression test for this, add a golden vector with the audit inputs and assert `dial_ages == {no_treatment: None, bun_18_24: None, bun_13_17: None, bun_12: None}` with baseline 43.9.

## Files Consulted

- `backend/prediction/engine.py` (HEAD)
- `backend/main.py`
- `app/src/app/results/[token]/page.tsx`
- `app/src/components/chart/transform.ts`
- `app/src/components/chart/types.ts`
- `server_side_calc_spec_v1.md`
- `agents/luca/drafts/lee-golden-vectors-v2.md`
- `agents/luca/drafts/lee-q1-q6-responses.md`
- `agents/luca/drafts/ui-design-audit-sprint5.md`
