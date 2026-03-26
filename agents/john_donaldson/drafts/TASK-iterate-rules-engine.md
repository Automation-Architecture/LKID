# Task: Iterate Rules Engine Until All 3 Test Vectors Pass

**Priority:** P0 — critical path for Sprint 2
**Assigned to:** John Donaldson (API Designer)
**Date:** 2026-03-26

---

## Status

First draft of `prediction_engine.py` is complete. Structure is correct (4 paths, 15 time points, CKD-EPI, dial_ages, bun_suppression). But **14 of 21 tests fail** — trajectory values drift from Lee's expected outputs.

**What passes:** Baselines (3/3), BUN suppression estimates (3/3), treatment dial_ages null check (1/1)
**What fails:** All 4 trajectory curves across all 3 test vectors, no-treatment dial_age for Vector 2

## Test Results Summary

### Vector 1 (BUN 35, eGFR 33, Age 58)
- No-treatment: off by 0.3 at month 24 (got 28.1, expected 28.4)
- BUN 18-24: off by 1.5 at month 1 (got 35.5, expected 34.0) — Phase 1 curve too aggressive
- BUN 13-17: similar drift in Phase 1
- BUN ≤12: similar drift in Phase 1

### Vector 2 (BUN 53, eGFR 10, Age 65)
- Treatment paths off by 2.6 at month 3 — Phase 1 gain over-projecting
- No-treatment dial_age returning None when it should return ~66.7 — the trajectory crosses eGFR 12 but the interpolation isn't finding it

### Vector 3 (BUN 22, eGFR 48, Age 52)
- Small drifts (0.5-3.3) across all paths — Phase 1 and Phase 2 accumulation rates off

## Where To Look

The errors cluster around these areas:

### 1. Phase 1 exponential curve (Section 3.3)
Your Phase 1 gains are too large too fast. Lee's formula:
```python
phase1_fraction(t) = 1 - exp(-2.5 * t/3)  # for t in [0, 3]
```
Check that you're applying this correctly and that the Phase 1 total is capped at `tier_max`.

### 2. No-treatment BUN modifier (Section 3.2)
The no-treatment decline is slightly off. Check:
```python
bun_modifier = max(0, (baseline_bun - 20) / 10) * 0.15
annual_decline = base_rate + bun_modifier  # base_rate is NEGATIVE
```
Make sure you're adding the modifier to make the decline MORE negative, not less.

### 3. Phase 2 accumulation window (Section 3.4)
Phase 2 runs months 3-24. The logarithmic fraction:
```python
phase2_fraction(t) = log(1 + (t - 3)) / log(1 + 21)  # for t in [3, 24]
```
Check that Phase 2 gain is ADDITIVE on top of Phase 1 plateau, not replacing it.

### 4. dial_ages interpolation (Section 2)
Vector 2 no-treatment should cross eGFR 12 around age 66.7. Your code returns None — check that the interpolation loop runs correctly when the trajectory starts at eGFR 10 (already below threshold for some paths).

## How To Iterate

1. Run `python -m pytest test_prediction_engine.py -v` (pytest is now installed)
2. Pick the simplest failing test (Vector 1 no-treatment, only 0.3 off)
3. Add print statements to trace the calculation step by step
4. Compare your intermediate values against Lee's pseudocode in Section 3.6
5. Fix, rerun, repeat
6. Work through all 3 vectors until 21/21 pass at ±0.2 tolerance

## Reference

- Lee's calc spec: `server_side_calc_spec_v1.md` — Sections 3.1 through 3.6 have the complete pseudocode
- Test vectors: Section 4 — three fully worked examples with exact expected outputs
- Your engine: `prediction_engine.py` in this folder
- Your tests: `test_prediction_engine.py` in this folder

## Definition of Done

All 21 tests pass. Then this module becomes the core of the `/predict` endpoint in Sprint 2.
