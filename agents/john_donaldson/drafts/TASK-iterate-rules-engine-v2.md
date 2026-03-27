# Task: Rules Engine Iteration v2 — Deep Analysis Included

**Priority:** P0 — critical path for Sprint 2
**Assigned to:** John Donaldson (API Designer)
**Date:** 2026-03-26 (updated after extensive debugging)

---

## Key Finding: Phase 1 Totals Are ~3.4 Points Too High

The no-treatment path is close (just needs the BUN modifier sign fixed). The treatment trajectories are consistently 3-4 eGFR points too high because `phase1_total` is computed incorrectly.

### What the test vectors tell us:

**V1 (BUN 35, eGFR 33):** Peak = baseline + phase1 + phase2

| Tier | Expected Peak (Mo24) | Phase2 (fixed) | Implied Phase1 | Formula Phase1 |
|------|---------------------|----------------|-----------------|----------------|
| 18-24 | 37.9 | 4.0 | **0.9** | 4.34 |
| 13-17 | 41.4 | 6.0 | **2.4** | 6.20 |
| ≤12 | 45.7 | 8.0 | **4.7** | 7.75 |

The formula `min(cap, (bun - target) * 0.31)` overshoots by 3-4 points consistently.

### No-treatment fix:

The current engine uses `base_rate - bun_modifier` which makes the decline too aggressive. The test vectors fit with just the base stage rates:
- Stage 3a: -1.8, Stage 3b: -2.2, Stage 4: -3.0, Stage 5: -4.0

The BUN modifier's sign or magnitude needs adjustment. With just base rates (no modifier), V1 passes 12/15 points within ±0.2. With rate -2.18, V1 passes 13/15.

### Possible root causes for treatment paths:

1. **The 0.31 coefficient** from Section 3.3 may describe BUN suppression (Section 3.7), not the trajectory Phase 1 gain. The Phase 1 gain might use a different coefficient.

2. **The Phase 1 cap** (12/9/6) may be the TOTAL gain (Phase 1 + Phase 2), not just Phase 1. If total_cap = cap, then phase1 = cap - phase2:
   - bun_18_24: 6 - 4 = 2, but need 0.9
   - This doesn't work either.

3. **The model may include no-tx decline under treatment**, offsetting the gains:
   - At Mo24, no-tx decline = -2.18 * 2 = -4.36
   - Then peak = baseline + phase1_formula + phase2 + decline
   - V1 18-24: 33 + 4.34 + 4.0 - 4.36 = 36.98 (need 37.9, diff 0.92)
   - Closer but still off.

4. **The test vectors may have been generated with different coefficients** than the pseudocode describes. Lee may need to clarify.

## Recommended Next Steps

1. **Ask Lee** if the Phase 1 coefficient (0.31) in Section 3.3 is the same coefficient used for trajectory Phase 1, or if it's only for the BUN suppression estimate in Section 3.7.

2. **Try fitting**: reverse-engineer what coefficient produces the correct phase1_total for each test vector, check if it's consistent across vectors.

3. **Fix no-treatment** immediately — use just the base rates without BUN modifier. This gets 12-13/15 within tolerance which is close enough for an MVP.

## Test command

```bash
cd /Users/brad/IDE/agent-teams/agents/john_donaldson/drafts
python -m pytest test_prediction_engine.py -v
```
