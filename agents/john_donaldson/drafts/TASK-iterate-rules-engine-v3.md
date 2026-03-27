# Task: Rules Engine v3 — Use v2.0 Spec Path 4 Formula

**Priority:** P0 — this unblocks the rules engine
**Assigned to:** John Donaldson (API Designer)
**Date:** 2026-03-26

---

## BREAKTHROUGH: The Calc Spec and v2.0 Spec Use Different Formulas

The calc spec (server_side_calc_spec_v1.md) uses `PHASE1_COEFF = 0.31` which produces values ~3.4 pts too high. The full v2.0 spec (patient_app_spec_v2_updated.pdf, Section 9.5) has the ACTUAL Path 4 implementation with different formulas.

## The Correct Path 4 Formula (from v2.0 Section 9.5)

```javascript
// Phase 1: Months 0-6
// Achievable BUN = patient.BUN * (1 - reduction) where reduction starts at 0.46
// Adjusted down for age >75 (-0.05), age >85 (-0.05), eGFR <15 (-0.08), eGFR <30 (-0.03)
let reduction = 0.46
if (patient.age > 75) reduction -= 0.05
if (patient.age > 85) reduction -= 0.05  // additional 5% above 85
if (patient.eGFR < 15) reduction -= 0.08
else if (patient.eGFR < 30) reduction -= 0.03

const achievedBUN = Math.max(patient.BUN * (1 - reduction), 9)
const newRate = recalcModel(patient, {BUN: achievedBUN})

// Phase 1 REAL gain: difference in decline rates * 0.5 years
const phase1_real = (rate_P1 - newRate) * 0.5

// BUN suppression removal: ~8% of current eGFR
const phase1_suppression = patient.eGFR * 0.08

// eGFR at month 6
const eGFR_6M = patient.eGFR + phase1_real + phase1_suppression
```

### Key differences from the calc spec:
1. **Phase 1 suppression = eGFR * 0.08** (not `(BUN - target) * 0.31`)
2. **Phase 1 real = (old_rate - new_rate) * 0.5** (rate differential, not BUN delta)
3. **Achieved BUN** uses a reduction factor (0.46) from baseline, not fixed tier targets
4. **The model uses a weighted 5-pillar decline rate** (Section 8), not simple CKD stage rates

### Phase 2 (from v2.0 Section 9.5):
```javascript
let phase2 = 0
if (achievedBUN <= 12) phase2 = 8.0
else if (achievedBUN <= 17) phase2 = 8.0 - (achievedBUN - 12) / 5 * 3.0
else if (achievedBUN <= 24) phase2 = 5.0 - (achievedBUN - 17) / 7 * 2.0
else if (achievedBUN <= 35) phase2 = 3.0 - (achievedBUN - 24) / 11 * 2.0
// BUN > 35: phase2 = 0

// Age reduces tubular repair capacity
if (patient.age > 70) phase2 *= 0.80
if (patient.age > 80) phase2 *= 0.65  // on top of >70 factor
```

Phase 2 is a CONTINUOUS function of achieved BUN, not discrete tiers.

## Amendment 2: Rename phase1_artifact → phase1_suppression

All occurrences of `phase1_artifact` should be `phase1_suppression`. The comment should read:
```
// BUN suppression removal: ~8% of current eGFR was hidden by uremic toxin
// competition at tubular transporters (OAT/OCT). This is real function returning
// — NOT a dietary artifact or creatinine measurement effect.
```

## What This Means for Our Lean Launch Engine

Our lean launch simplifies the full 5-pillar model into 4 BUN tiers. But the Phase 1 and Phase 2 formulas should use the v2.0 logic, not the calc spec's 0.31 coefficient.

**Recommended approach:**
1. Implement Phase 1 as: `phase1_suppression = egfr * 0.08` + rate differential component
2. Implement Phase 2 as the continuous function of achieved BUN (not discrete tiers)
3. Validate against the 3 test vectors from the calc spec
4. If the test vectors were generated with the simplified calc spec model (not v2.0), then the test vectors themselves may need to be re-validated with Lee

## New Feature: BUN Structural Floor Display (Amendment 3)

A new callout on the input screen when BUN > 17:

**Formula:** `Structural Floor eGFR = Reported eGFR + [(Current BUN - 15) × BUN_ratio]`

**BUN_ratio lookup:**
| BUN Range | Ratio |
|-----------|-------|
| < 15 | 0.00 |
| 15–20 | 0.67 |
| 20–30 | 0.47 |
| 30–50 | 0.32 |
| > 50 | 0.25 |

Use the more conservative ratio when BUN and eGFR brackets differ.

**Display format:**
"Your reported eGFR is [X]. At your current BUN of [Y], approximately [Z] points of that reading reflect BUN workload suppression, not permanent damage. Your estimated structural capacity is eGFR [X+Z]."

This is a Sprint 2/3 feature for Harshit to implement on the input screen.

## Reference Files
- Full v2.0 spec: `patient_app_spec_v2_updated.pdf` (Section 9.5 for Path 4)
- Amendments: `app_spec_amendments.pdf` (3 amendments)
- Calc spec: `server_side_calc_spec_v1.md` (test vectors in Section 4)
- Your engine: `prediction_engine.py`
- Your tests: `test_prediction_engine.py`
