# Lee's Updated Golden Test Vectors — v2.0 Formula

**Received:** 2026-04-02
**Replaces:** The 3 calc-spec vectors (BUN 35/eGFR 33, BUN 53/eGFR 10, BUN 22/eGFR 48) that used the simplified 0.31 flat coefficient.
**Tolerance:** ±0.2 eGFR (do not widen)

## Vector 1 — Path bun_13_17 (BUN 13-17), Standard Adult

**Inputs:** BUN: 16, eGFR: 28, Age: 58, Stage: 4, Creatinine: 3.2

| Step | Calculation | Value |
|------|-------------|-------|
| Tier target BUN | bun_13_17 | 15 mg/dL |
| Phase 1 total | min(9, (16 - 15) × 0.31) | 0.31 eGFR pts |
| Phase 1 at month 3 | 0.31 × (1 - exp(-2.5)) = 0.31 × 0.918 | 0.285 eGFR pts |
| Phase 2 rate | CKD Stage 4 base rate | -2.0 mL/min/yr |
| Age attenuation | age < 70 | none |
| **Month 12 output** | 28 + 0.285 + (-2.0 × 9/12) | **26.79** |

## Vector 2 — Path bun_12 (BUN ≤12), Best Achiever

**Inputs:** BUN: 11, eGFR: 22, Age: 64, Stage: 4, Creatinine: 4.1

| Step | Calculation | Value |
|------|-------------|-------|
| Tier target BUN | bun_12 | 10 mg/dL |
| Phase 1 total | min(12, (11 - 10) × 0.31) | 0.31 eGFR pts |
| Phase 1 at month 3 | 0.31 × 0.918 | 0.285 eGFR pts |
| Phase 2 rate floor | Path 4, BUN ≤12 | -0.33 mL/min/yr |
| Age attenuation | age < 70 | none |
| **Month 12 output** | 22 + 0.285 + (-0.33 × 9/12) | **22.04** |

## Vector 3 — Path bun_18_24 (BUN 18-24), Older Patient with Age Attenuation

**Inputs:** BUN: 22, eGFR: 18, Age: 74, Stage: 4, Creatinine: 5.8

| Step | Calculation | Value |
|------|-------------|-------|
| Tier target BUN | bun_18_24 | 21 mg/dL |
| Phase 1 total | min(6, (22 - 21) × 0.31) | 0.31 eGFR pts |
| Phase 1 at month 3 | 0.31 × 0.918 | 0.285 eGFR pts |
| Phase 2 rate | CKD Stage 4 base × age attenuation | -2.0 × 0.80 = -1.60 mL/min/yr |
| Age attenuation | age > 70 | ×0.80 |
| **Month 12 output** | 18 + 0.285 + (-1.60 × 9/12) | **17.09** |

## Lee's Formula Structure (Derived from Vectors)

1. **Phase 1 (months 0–3):** Exponential approach to `min(tier_cap, (BUN - target_BUN) × 0.31)`
   - Saturation curve: `f(t) = 1 - exp(-2.5 × t/3)` → ~91.8% at month 3
   - Tier caps: bun_18_24 = 6, bun_13_17 = 9, bun_12 = 12
2. **After month 3:** Linear decline at CKD-stage base rate (NO BUN modifier for treatment paths)
   - Age attenuation: ×0.80 for age > 70
   - Path 4 exception: use -0.33/yr floor instead of CKD-stage rate
3. **No Phase 2 gain function** — treatment benefit is Phase 1 only, then decline continues

## Gap Analysis (Current Engine vs Lee's Vectors)

| Vector | Tier | Engine Output (month 12) | Lee Expects | Delta |
|--------|------|--------------------------|-------------|-------|
| V1 | bun_13_17 | 34.3 | 26.79 | +7.5 |
| V2 | bun_12 | 29.0 | 22.04 | +7.0 |
| V3 | bun_18_24 | 21.5 | 17.09 | +4.4 |

**Root cause:** Engine Phase 1 uses two-component formula (eGFR × 0.08 + rate_differential) instead of 0.31 coefficient. Engine also has a Phase 2 gain function that doesn't exist in Lee's model.

## Action Required

Engine (`backend/prediction/engine.py`) needs to be refactored:
1. Replace two-component Phase 1 with `min(cap, (BUN - target) × 0.31)` coefficient model
2. Phase 1 saturation completes at month 3 (not month 6)
3. Remove Phase 2 continuous BUN gain function entirely
4. After Phase 1: apply CKD-stage base rate × age_attenuation (no BUN modifier for treatment)
5. Path 4: use -0.33/yr floor after Phase 1
6. Update golden_vectors.py with these 3 new vectors

## Note from Lee

> Vector 2 reflects the updated Path 4 rate floor of -0.33 mL/min/yr (corrected from -0.65 in my prior email). Please update Path 4 calculation logic accordingly if not already done. Let me know if you need vectors for additional paths or edge cases.

Path 4 rate already updated to -0.33 in PR #26. The formula structure is the main issue.
