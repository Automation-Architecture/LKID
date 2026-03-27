# Finalized Formulas — KidneyHood Prediction Engine

**Version:** 1.0 — 2026-03-26
**Author:** John Donaldson (API Designer)
**Status:** BINDING technical reference for Sprint 2 implementation
**Sources reconciled:**
1. `server_side_calc_spec_v1.md` (calc spec) — test vectors, time points, BUN tiers
2. `patient_app_spec_v2_updated.pdf` Section 9.5 (v2.0 spec) — Phase 1/2 formulas, Path 4
3. `app_spec_amendments.pdf` — terminology rename, BUN Structural Floor Display

---

## 1. Lean Launch Scope

The full v2.0 spec describes 5 trajectory paths. Our Lean Launch implements **2 of 5**:

| Path | v2.0 Name | Lean Launch? | Notes |
|------|-----------|--------------|-------|
| Path 1 | No Treatment (current decline) | **YES** | Linear decline from baseline |
| Path 2 | Medication-only | No | Excluded from MVP |
| Path 3 | Dietary band | No | Excluded from MVP |
| Path 4 | Kidneyhood Protocol (BUN reduction) | **YES** | 3 BUN tiers (4 from calc spec, simplified) |
| Path 5 | Medications + Protocol | No | Excluded from MVP |

**Lean Launch simplifications:**
- 4 BUN tiers from calc spec: No Treatment, BUN 18-24, BUN 13-17, BUN <=12
- No medication paths, no dietary band
- No 5-pillar weighted decline rate model — use CKD-stage base rates from calc spec
- Optional field modifiers (hemoglobin, CO2, albumin) included for Tier 2 confidence

**Engine inputs (v2.0 Section 2.3 — corrected):**
- Required: BUN, creatinine, age (potassium REMOVED in v2.0)
- Optional: hemoglobin, CO2, albumin
- Optional: patient-entered eGFR (otherwise calculated via CKD-EPI 2021)

---

## 2. Finalized Phase 1 Formula — Months 0 to 6

### The Discrepancy

Two different formulations exist:

**Calc spec (v1.0):**
```python
PHASE1_COEFF = 0.31  # eGFR points per mg/dL BUN reduction
phase1_total = min(tier_max, (baseline_bun - tier_target_bun) * PHASE1_COEFF)
```

**v2.0 Section 9.5:**
```javascript
// Achieved BUN via reduction factor
let reduction = 0.46
if (patient.age > 75) reduction -= 0.05
if (patient.age > 85) reduction -= 0.05
if (patient.eGFR < 15) reduction -= 0.08
else if (patient.eGFR < 30) reduction -= 0.03

const achievedBUN = Math.max(patient.BUN * (1 - reduction), 9)

// Phase 1 has TWO components:
const phase1_suppression = patient.eGFR * 0.08   // BUN suppression removal
const phase1_real = (rate_P1 - newRate) * 0.5     // rate differential * 6 months

const eGFR_6M = patient.eGFR + phase1_real + phase1_suppression
```

### Key Differences

| Aspect | Calc Spec | v2.0 Spec |
|--------|-----------|-----------|
| Phase 1 mechanism | Single coefficient (0.31 per mg/dL BUN drop) | Two components: suppression removal + rate differential |
| BUN suppression | Implicit in 0.31 coefficient | Explicit: `eGFR * 0.08` |
| Rate component | Not separated | `(old_rate - new_rate) * 0.5 years` |
| Achieved BUN | Fixed tier targets (10, 15, 21 mg/dL) | Reduction factor from baseline (0.46, age/eGFR adjusted) |
| Age adjustment | None | Reduction factor decreases for age >75, >85 |
| eGFR adjustment | None | Reduction factor decreases for eGFR <15, <30 |
| Cap | Tier max (12, 9, 6 pts) | Floor on achieved BUN (min 9 mg/dL) |

### Recommended Implementation

Use the **v2.0 formulas** as the governing implementation. The calc spec's 0.31 coefficient is a simplification that produces values approximately 3.4 pts too high in some cases.

**Lean Launch adaptation of v2.0 Phase 1:**

```python
def compute_phase1(egfr_baseline, bun_baseline, age, tier_target_bun):
    # v2.0 BUN suppression removal: ~8% of current eGFR
    phase1_suppression = egfr_baseline * 0.08

    # v2.0 reduction factor for achieved BUN
    reduction = 0.46
    if age > 75: reduction -= 0.05
    if age > 85: reduction -= 0.05
    if egfr_baseline < 15: reduction -= 0.08
    elif egfr_baseline < 30: reduction -= 0.03

    achieved_bun = max(bun_baseline * (1 - reduction), 9)

    # For Lean Launch: clamp achieved BUN to tier target
    # (since we use fixed tiers, not the full 5-pillar model)
    achieved_bun_for_tier = max(achieved_bun, tier_target_bun)

    # Rate differential component
    # Uses simplified CKD-stage decline rates (Section 4 of this doc)
    old_rate = get_decline_rate(egfr_baseline, bun_baseline)
    new_rate = get_decline_rate(egfr_baseline, achieved_bun_for_tier)
    phase1_real = (abs(old_rate) - abs(new_rate)) * 0.5  # 6 months

    phase1_total = phase1_suppression + phase1_real
    return phase1_total
```

**Phase 1 curve shape (from calc spec — retained):**

```python
def phase1_fraction(t_months):
    """Exponential approach: reaches ~92% by month 3, 100% by month 6."""
    if t_months >= 6: return 1.0
    return 1 - math.exp(-2.5 * t_months / 3)
```

> Note: The calc spec says Phase 1 completes at month 3; v2.0 says month 6. The exponential curve reaches ~92% by month 3 and ~100% by month 6. Using month 6 as full completion aligns with v2.0.

---

## 3. Finalized Phase 2 Formula — Months 6 to 24

### Calc Spec (discrete tiers):

| Path | Phase 2 Total Gain |
|------|--------------------|
| BUN <=12 | +8.0 eGFR pts |
| BUN 13-17 | +6.0 eGFR pts |
| BUN 18-24 | +4.0 eGFR pts |

### v2.0 Section 9.5 (continuous function):

```python
def compute_phase2_gain(achieved_bun, age):
    """Continuous function of achieved BUN with age attenuation."""
    if achieved_bun <= 12:
        phase2 = 8.0
    elif achieved_bun <= 17:
        phase2 = 8.0 - (achieved_bun - 12) / 5 * 3.0
    elif achieved_bun <= 24:
        phase2 = 5.0 - (achieved_bun - 17) / 7 * 2.0
    elif achieved_bun <= 35:
        phase2 = 3.0 - (achieved_bun - 24) / 11 * 2.0
    else:
        phase2 = 0.0

    # Age-based attenuation of tubular repair capacity
    if age > 80:
        phase2 *= 0.80 * 0.65  # both factors stack
    elif age > 70:
        phase2 *= 0.80

    return phase2
```

### Recommended Implementation

Use the **v2.0 continuous function**. For our Lean Launch BUN tiers, the continuous function at tier midpoints produces:

| Tier | Tier Target BUN | v2.0 Phase 2 at target | Calc Spec Phase 2 |
|------|-----------------|------------------------|--------------------|
| BUN <=12 | 10 | 8.0 | 8.0 |
| BUN 13-17 | 15 | 6.2 | 6.0 |
| BUN 18-24 | 21 | 3.9 | 4.0 |

The values are close but not identical. Using the continuous function is more accurate and handles edge cases better (e.g., a patient who achieves BUN 13 vs BUN 17 within the same tier).

**Phase 2 curve shape (from calc spec — retained):**

```python
def phase2_fraction(t_months):
    """Logarithmic accumulation over months 6-24."""
    if t_months <= 6: return 0.0
    if t_months >= 24: return 1.0
    return math.log(1 + (t_months - 6)) / math.log(1 + 18)
```

> Note: Adjusted start from month 3 to month 6 to align with v2.0's Phase 1 completion at month 6.

---

## 4. No-Treatment Path — Base Decline Rates

From calc spec Section 3.2, confirmed unchanged in v2.0.

**Base annual decline rate by CKD stage:**

| CKD Stage | eGFR Range | Base Decline Rate | Source |
|-----------|------------|-------------------|--------|
| Stage 3a | 45-59 | -1.8 mL/min/yr | Coresh 2014 |
| Stage 3b | 30-44 | -2.2 mL/min/yr | CKD Prognosis Consortium |
| Stage 4 | 15-29 | -3.0 mL/min/yr | CKD Prognosis Consortium |
| Stage 5 | <15 | -4.0 mL/min/yr | MDRD / CRIC cohort |

**BUN modifier (additive):**

```python
bun_modifier = max(0, (baseline_bun - 20) / 10) * 0.15  # mL/min/yr per 10 mg/dL above 20
annual_decline = base_rate + bun_modifier
```

**No-treatment trajectory:**

```python
for i, t_months in enumerate(TIME_POINTS_MONTHS):
    egfr_no_tx[i] = max(0, egfr_baseline + annual_decline * (t_months / 12))
```

> Note: The v2.0 spec uses a 5-pillar weighted decline rate model (Section 8) which is more complex. For Lean Launch, we use the simplified CKD-stage rates above. This is an acceptable simplification since the 5-pillar model requires additional inputs we don't collect.

---

## 5. Post-Phase 2 Decline — Months 24 to 120

From calc spec Section 3.5. Tier-specific rates reflecting ongoing tubular protection.

| Path | Post-Phase 2 Annual Decline | Rationale |
|------|------------------------------|-----------|
| BUN <=12 | -0.5 mL/min/yr | Near-normal tubular protection |
| BUN 13-17 | -1.0 mL/min/yr | Meaningful BUN reduction |
| BUN 18-24 | -1.5 mL/min/yr | Partial BUN control |
| No treatment | BUN-adjusted (Section 4) | Linear decline continues |

```python
# Post-Phase 2 (months > 24):
egfr_at_24 = egfr_baseline + phase1_total + phase2_total  # peak eGFR
years_after_24 = (t_months - 24) / 12
egfr_t = max(0, egfr_at_24 - abs(post_decline_rate) * years_after_24)
```

---

## 6. BUN Structural Floor Display (Amendment 3 — NEW)

A new input-screen callout showing patients their true structural kidney capacity. Displayed when BUN > 17.

**Formula:**

```python
structural_floor_egfr = reported_egfr + (current_bun - 15) * bun_ratio
```

**BUN ratio lookup table:**

| BUN Range | Ratio | Interpretation |
|-----------|-------|----------------|
| < 15 | 0.00 | No suppression — reported eGFR = structural eGFR |
| 15-20 | 0.67 | High suppression per BUN point |
| 20-30 | 0.47 | Moderate suppression per BUN point |
| 30-50 | 0.32 | Lower marginal suppression |
| > 50 | 0.25 | Diminishing returns at extreme BUN |

**Implementation notes:**
- When BUN and eGFR brackets suggest different ratios, use the more conservative (lower) ratio
- Only display when BUN > 17 (below that, suppression is negligible)
- This is a display-only feature on the input/results screen, not part of the trajectory engine

**Display format:**
> "Your reported eGFR is [X]. At your current BUN of [Y], approximately [Z] points of that reading reflect BUN workload suppression, not permanent damage. Your estimated structural capacity is eGFR [X+Z]."

**Example:** Patient with BUN 35, eGFR 33:
- BUN range 30-50, ratio = 0.32
- Suppression = (35 - 15) * 0.32 = 6.4 pts
- Structural floor = 33 + 6.4 = 39.4

> Note: This is distinct from the `bun_suppression_estimate` field in the calc spec (Section 3.7), which uses `(BUN - 10) * 0.31`. Amendment 3's formula uses a different baseline (BUN 15 vs 10) and a lookup-table ratio instead of a fixed coefficient. Both may coexist — the suppression estimate is for the stat card, the structural floor is for the input screen callout.

---

## 7. Test Vectors

Three test vectors from calc spec Section 4. These are the golden file for LKID-27.

**IMPORTANT CAVEAT:** These vectors were generated using the calc spec's simplified model (0.31 coefficient, fixed tier targets, no age adjustment). They may NOT match the v2.0 formula outputs exactly. This is flagged as an open question for Lee (Section 8).

### Vector 1 — Spec Example (BUN 35, eGFR 33, Age 58)

| Input | Value |
|-------|-------|
| BUN | 35 mg/dL |
| Creatinine | 2.1 mg/dL |
| Age | 58 |
| eGFR | 33 (entered) |

| Mo | No Tx | BUN 18-24 | BUN 13-17 | BUN <=12 | Age |
|----|-------|-----------|-----------|---------|-----|
| 0 | 33.0 | 33.0 | 33.0 | 33.0 | 58.0 |
| 1 | 32.8 | 34.0 | 34.6 | 35.4 | 58.1 |
| 3 | 32.3 | 35.7 | 36.9 | 38.7 | 58.3 |
| 6 | 31.7 | 36.0 | 37.4 | 39.6 | 58.5 |
| 12 | 30.6 | 37.0 | 39.4 | 42.6 | 59.0 |
| 18 | 29.5 | 37.6 | 40.7 | 44.5 | 59.5 |
| 24 | 28.4 | 37.9 | 41.4 | 45.7 | 60.0 |
| 36 | 26.3 | 36.4 | 40.4 | 45.2 | 61.0 |
| 48 | 24.1 | 34.9 | 39.4 | 44.7 | 62.0 |
| 60 | 22.0 | 33.4 | 38.4 | 44.2 | 63.0 |
| 72 | 19.8 | 31.9 | 37.4 | 43.7 | 64.0 |
| 84 | 17.7 | 30.4 | 36.4 | 43.2 | 65.0 |
| 96 | 15.5 | 28.9 | 35.4 | 42.7 | 66.0 |
| 108 | 13.4 | 27.4 | 34.4 | 42.2 | 67.0 |
| 120 | 11.2 | 25.9 | 33.4 | 41.7 | 68.0 |

BUN suppression estimate: (35 - 10) * 0.31 = **7.8 pts** (calc spec method)

### Vector 2 — Stage 5 High-BUN (BUN 53, eGFR 10, Age 65)

| Mo | No Tx | BUN 18-24 | BUN 13-17 | BUN <=12 | Age |
|----|-------|-----------|-----------|---------|-----|
| 0 | 10.0 | 10.0 | 10.0 | 10.0 | 65.0 |
| 3 | 8.5 | 14.0 | 16.4 | 19.4 | 65.3 |
| 12 | 5.5 | 16.1 | 20.2 | 24.9 | 66.0 |
| 24 | 2.0 | 17.5 | 22.4 | 27.4 | 67.0 |
| 36 | -- | 16.0 | 21.4 | 26.9 | 68.0 |
| 120 | -- | 7.5 | 15.4 | 22.4 | 75.0 |

BUN suppression estimate: (53 - 10) * 0.31 = 13.3 pts, capped at **12.0 pts**

### Vector 3 — Mild CKD (BUN 22, eGFR 48, Age 52)

| Mo | No Tx | BUN 18-24 | BUN 13-17 | BUN <=12 | Age |
|----|-------|-----------|-----------|---------|-----|
| 0 | 48.0 | 48.0 | 48.0 | 48.0 | 52.0 |
| 3 | 47.6 | 48.3 | 49.3 | 51.1 | 52.3 |
| 24 | 44.8 | 49.0 | 52.2 | 57.4 | 54.0 |
| 120 | 29.2 | 34.0 | 42.2 | 52.9 | 62.0 |

BUN suppression estimate: (22 - 10) * 0.31 = **3.7 pts**

### Tolerance

All values must match within **+/- 0.2 eGFR** per calc spec Section 4.

---

## 8. Open Questions for Lee

These must be resolved before Sprint 2 implementation can be finalized.

### Q1: Which formula do the test vectors use?

The 3 test vectors in the calc spec appear to use the simplified 0.31 coefficient model, not the v2.0 Section 9.5 formulas (`eGFR * 0.08` + rate differential). If we implement the v2.0 formulas, the engine output will likely NOT match the test vectors within +/- 0.2 tolerance.

**Options:**
- (a) Re-generate test vectors using v2.0 formulas (Lee provides updated golden file)
- (b) Use calc spec formulas for implementation (simpler, matches vectors, but diverges from v2.0)
- (c) Both are valid simplifications for the marketing app — Lee confirms acceptable tolerance

### Q2: Rate differential — what is `rate_P1`?

The v2.0 formula uses `phase1_real = (rate_P1 - newRate) * 0.5`. The variable `rate_P1` appears to be the patient's current decline rate from the 5-pillar model (Section 8). For our Lean Launch, we use CKD-stage base rates + BUN modifier instead. Is using our simplified decline rate acceptable for `rate_P1`?

### Q3: BUN Structural Floor vs. BUN Suppression Estimate — are both needed?

The calc spec defines `bun_suppression_estimate = (BUN - 10) * 0.31` for a stat card. Amendment 3 defines `structural_floor = eGFR + (BUN - 15) * ratio` for an input-screen callout. These use different baselines (BUN 10 vs 15), different coefficients (0.31 vs lookup table), and serve different purposes. Should both be implemented, or does Amendment 3 supersede the calc spec's suppression estimate?

### Q4: Dialysis threshold confirmation

Calc spec Section 2 confirms eGFR 12. But LKID-19 acceptance criteria say eGFR 15. The calc spec correction says eGFR 12 is correct. Please confirm eGFR 12 for the threshold line and dial_ages calculation.

### Q5: Phase 2 age attenuation — does it apply in our age range?

The v2.0 Phase 2 formula attenuates gains for age >70 (0.80) and >80 (0.65 stacked). Test Vector 2 (age 65) should not be affected, but future patients could be. Should we implement age attenuation now, or defer since our MVP target demographic is unlikely to be >70?

---

## Reference: Time Points Array

```python
TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]
```

15 values, unevenly spaced. Fine resolution during Phase 1/2 (months 0-24), annual resolution for long-term decline (months 24-120).

## Reference: CKD-EPI 2021 (Race-Free)

```python
# Population-average sex coefficients (marketing app — no sex input)
kappa = 0.9
alpha = -0.302
eGFR = 142 * min(Cr/kappa, 1)**alpha * max(Cr/kappa, 1)**(-1.200) * 0.9938**age
```

## Reference: Dialysis Threshold

**eGFR 12 mL/min/1.73m2** (corrected from 15 per calc spec Section 2).

## Reference: Optional Field Modifiers (Confidence Tier 2)

| Field | Concerning Range | Decline Modifier (per yr) |
|-------|------------------|---------------------------|
| Hemoglobin | < 11 g/dL | +0.2 mL/min/yr excess decline |
| Serum CO2 | < 22 mEq/L | +0.3 mL/min/yr per 2 mEq below 22 |
| Albumin | < 3.5 g/dL | +0.3 mL/min/yr per 0.5g below 3.5 |

These increase post-Phase 2 decline rate in all paths. Apply equally to all four paths.

---

*KidneyHood.org — Finalized Formulas v1.0 — 2026-03-26 — BINDING for Sprint 2*
*Reconciles: calc spec v1.0, v2.0 spec Section 9.5, Amendments 1-3*
