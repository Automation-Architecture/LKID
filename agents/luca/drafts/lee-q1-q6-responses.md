# Lee's Responses to Open Questions — 2026-03-30

**Status:** BINDING — These answers are the definitive clinical authority.

---

## Q1: Formula — Use v2.0

- Go with v2.0 two-component formula (BUN suppression removal + rate differential)
- 0.31 coefficient was an earlier simplification, superseded by v2.0
- Lee will send updated test vectors this week (Option A)
- ±0.2 tolerance stays — do not widen

**Action:** Already implemented in PR #25 (merged). Await updated golden vectors from Lee.

## Q2: rate_P1 — CKD-stage base rates acceptable

- Simplified CKD-stage rates are fine for rate_P1 in marketing app
- Full 5-pillar model reserved for clinical app
- Add code comment flagging swap point for clinical app engineer

**Action:** Add code comment in engine.py. No formula change needed.

## Q3: Implement BOTH suppression estimate AND structural floor

- `(BUN - 10) × 0.31` → stat card (keep as-is)
- Amendment 3 structural floor `eGFR + (BUN - 15) × stratified_ratio` → input-screen callout
- Different baselines (10 vs 15), different coefficients (flat vs stratified)
- Structural floor only renders when **BUN > 17**

**Action:** Implement structural floor display. Both calculations coexist.

## Q4: Dialysis threshold — eGFR 12 confirmed

- eGFR 12 is correct per calc spec
- Jira acceptance criteria referencing 15 is a documentation error — update ticket
- eGFR 12 across all four trajectory paths

**Action:** Update LKID-19 chart threshold from 15 → 12. Update Jira ticket.

## Q5: Phase 2 age attenuation — implement now

- Already in v2.0 spec, two lines:
  ```
  if (patient.age > 70) phase2 *= 0.80
  if (patient.age > 80) phase2 *= 0.65  // cumulative
  ```
- Older patients will use from day one — projections wrong without it

**Action:** Already implemented in v2.0 engine (PR #25). Verified. ✓

## Q6: Creatinine max 20.0 — confirmed

- Stage 4/5 patients commonly 4–10, some reach 15–18 before dialysis
- 15.0 cap would reject valid entries for primary audience

**Action:** Already aligned across all layers. ✓

---

## BONUS: Path 4 BUN ≤12 post-Phase 2 rate floor update

- Old rate: -0.65 mL/min/yr (based on BUN 15 threshold)
- New rate: **-0.33 mL/min/yr** (pilot data, n=28, R²=0.40)
- Only affects Path 4 (BUN ≤12), not other three paths
- Produces slightly better long-term projections for best-case path

**Action:** Update `_TIER_CONFIG["bun_12"]["post_decline"]` from current value to -0.33.
