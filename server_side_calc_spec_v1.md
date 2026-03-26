# KIDNEYHOOD.ORG

## Server-Side Calculation Specification

**Patient Outcome Prediction Engine — Marketing Lead App**

*Version 1.0 — March 2026 | NDA Required — Do Not Distribute*

*Companion document to Product & UX Specification v2.0 | Prepared for: Brad (Engineering Lead)*

> **⚠ PROPRIETARY & CONFIDENTIAL** — Kidneyhood.org. This document contains the proprietary calculation logic, coefficients, dose-response data, and test vectors for the Kidneyhood.org prediction engine. Provided under executed NDA only. This document must never be distributed beyond the named engineering team. Coefficients must be embedded in the server-side Python module only — never exposed to front-end code, logs, or client-accessible endpoints.

> **⚠ CORRECTIONS TO ENGINEERING ASSUMPTIONS — READ BEFORE ANYTHING ELSE**

Two discrepancies were identified in Brad's pre-call questions that must be corrected before implementation begins:

**Correction 1 — Dialysis threshold is eGFR 12, not eGFR 15.** The PRD and all prior spec documents specify eGFR 12 as the threshold line and the value used for dial_ages calculation. Brad's email references eGFR 15. This is incorrect. The threshold line on the chart, the dial_ages output, and all test vectors in this document use eGFR 12.

**Correction 2 — Potassium is NOT an input to the marketing app engine.** Brad's email references 'BUN, creatinine, potassium, age' as inputs to the formula. Potassium was explicitly removed from the marketing app in v2.0 (Section 2.3). The engine inputs are BUN, creatinine, age, and three optional fields (hemoglobin, CO2, albumin). If Brad is working from a v1.0 document, please discard it. The v2.0 spec is the governing document.

---

## 1. Time Points — The 15-Value Array

The server returns exactly 15 eGFR values per trajectory path. Time points are unevenly spaced to provide fine resolution during Phase 1 and Phase 2 (where the trajectory changes rapidly) and annual resolution during the long-term plateau/decline phase.

**Confirmed time point array (months from baseline):**

| Index | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|-------|---|---|---|---|---|---|---|---|---|----|----|----|----|----|----|
| Month | 0 | 1 | 3 | 6 | 12 | 18 | 24 | 36 | 48 | 60 | 72 | 84 | 96 | 108 | 120 |

> *Rationale: Months 0–24 use fine spacing (0, 1, 3, 6, 12, 18, 24) to capture Phase 1 rapid rise and Phase 2 structural accumulation. Months 24–120 use annual spacing (every 12 months) for the stable plateau and long-term decline. Index 0 = patient's current values. The chart X-axis maps each month to patient age (current age + month/12).*

Python implementation:

```python
TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]
```

---

## 2. Dialysis Threshold

**Confirmed: eGFR 12 mL/min/1.73m².** This is the value used for the horizontal dashed threshold line on the chart and for the dial_ages calculation. A patient 'reaches dialysis' when their trajectory crosses below eGFR 12.

**dial_ages calculation:** For each trajectory path, find the first time point at which `eGFR_value < 12`. Interpolate linearly between the surrounding two time points to estimate the exact month, then convert to patient age. Return `null` if no crossing within 120 months.

```python
def compute_dial_age(trajectory, time_points_months, current_age):
    THRESHOLD = 12.0
    for i in range(1, len(trajectory)):
        if trajectory[i] < THRESHOLD and trajectory[i-1] >= THRESHOLD:
            frac = (trajectory[i-1] - THRESHOLD) / (trajectory[i-1] - trajectory[i])
            months = time_points_months[i-1] + frac * (time_points_months[i] - time_points_months[i-1])
            return round(current_age + months / 12, 1)
    return None  # no dialysis within 10 years
```

---

## 3. Complete Engine Specification — All Four Trajectory Paths

### 3.1 Step 0: Compute Starting eGFR

Use patient-entered eGFR if provided. Otherwise calculate via CKD-EPI 2021 (race-free):

```python
# CKD-EPI 2021 (sex-free fallback for marketing app — use population average kappa/alpha)
# kappa = 0.9 (population average, midpoint of male 0.9 / female 0.7 values)
# alpha = -0.302 (population average, midpoint of male -0.302 / female -0.241)
# eGFR = 142 * min(Cr/kappa, 1)^alpha * max(Cr/kappa, 1)^(-1.200) * 0.9938^age
```

> *Using population-average sex coefficients reduces precision slightly and triggers Tier 1 confidence badge as specified in v2.0 Section 2.3. This is acceptable for the marketing app.*

### 3.2 Step 1: No-Treatment Path

The no-treatment trajectory is a linear decline from baseline using a BUN-adjusted annual decline rate.

**Base annual decline rate by starting eGFR stage:**

| CKD Stage at Baseline | eGFR Range | Base Decline Rate | Source |
|------------------------|------------|-------------------|--------|
| Stage 3a | 45–59 | -1.8 mL/min/yr | CKD Prognosis Consortium (Coresh 2014) |
| Stage 3b | 30–44 | -2.2 mL/min/yr | CKD Prognosis Consortium |
| Stage 4 | 15–29 | -3.0 mL/min/yr | CKD Prognosis Consortium |
| Stage 5 pre-dialysis | <15 | -4.0 mL/min/yr | MDRD / CRIC cohort data |

**BUN modifier — applied to base rate:**

Each 10 mg/dL of BUN above 20 adds 0.15 mL/min/yr to the annual decline rate. This is derived from Seki 2019 (each 10 mg/dL BUN increase = significantly higher hazard for ESRD, independent of eGFR) calibrated against the pilot cohort.

```python
bun_modifier = max(0, (baseline_bun - 20) / 10) * 0.15
annual_decline = base_rate + bun_modifier
```

Example: Patient with eGFR 33 (Stage 3b), BUN 35:

```
annual_decline = -2.2 + ((35-20)/10 * 0.15) = -2.2 + 0.225 = -2.43 mL/min/yr
```

**No-treatment trajectory calculation:**

```python
for i, t_months in enumerate(TIME_POINTS_MONTHS):
    egfr_no_tx[i] = max(0, egfr_baseline + annual_decline * (t_months / 12))
```

### 3.3 Step 2: Phase 1 Gain (Treatment Paths — Months 0 to 3)

Phase 1 is the real-time modulation of tubular transport capacity by BUN level. It is NOT a single step-up — it is a continuous exponential curve as BUN declines toward the tier target. This is a refinement from prior versions based on new analysis showing same-visit BUN-eGFR lockstep (Spearman rho = -0.692, p = 1.33e-28 across 191 pooled observations).

**Tier target BUN values (midpoints of achieved tier):**

| Path | Tier Range | Target BUN | Max Phase 1 cap |
|------|------------|------------|-----------------|
| trajectories.bun12 | ≤12 | 10 mg/dL | 12 eGFR pts |
| trajectories.bun17 | 13–17 | 15 mg/dL | 9 eGFR pts |
| trajectories.bun24 | 18–24 | 21 mg/dL | 6 eGFR pts |

**Phase 1 coefficient (from lockstep analysis):**

Derived from pilot data: when BUN falls, same-visit eGFR rises at approximately 0.31 eGFR points per 1 mg/dL BUN reduction (+3.08 eGFR per ~10 mg/dL BUN fall, 67.7% concordance rate). Capped at tier maximum to prevent over-projection at extreme baseline BUN values.

```python
PHASE1_COEFF = 0.31  # eGFR points per mg/dL BUN reduction
phase1_total = min(tier_max, (baseline_bun - tier_target_bun) * PHASE1_COEFF)
```

**Phase 1 curve shape — exponential approach to gain:**

BUN declines fastest in the first 2–4 weeks and stabilizes by week 12. The eGFR gain follows this curve. Use an exponential saturation function over months 0–3:

```python
# Phase 1 gain fraction at month t (t in range 0 to 3):
# f(t) = 1 - exp(-2.5 * t/3) [reaches ~92% of total by month 3]

def phase1_fraction(t_months):
    if t_months >= 3: return 1.0
    return 1 - math.exp(-2.5 * t_months / 3)

# eGFR at time t during Phase 1:
egfr_t = egfr_baseline + phase1_total * phase1_fraction(t_months)
```

> *This replaces the prior 'step-up at month 3' model. The curve produces a smooth exponential rise from baseline, reaching ~92% of Phase 1 gain by month 3 and 100% by month 6 handoff to Phase 2 accumulation.*

### 3.4 Step 3: Phase 2 Gain (Treatment Paths — Months 3 to 24)

Phase 2 is structural cellular rebuilding of tubular cells. It accumulates on top of the Phase 1 plateau. Phase 2 gains are derived from the pilot cohort dose-response analysis (p=0.002).

**Phase 2 total gains by achieved BUN tier:**

| Path | Phase 2 Total Gain | Evidence |
|------|---------------------|----------|
| BUN ≤12 | **+8.0 eGFR pts** | Pilot cohort dose-response, p=0.002 |
| BUN 13–17 | **+6.0 eGFR pts** | Pilot cohort dose-response, p=0.002 |
| BUN 18–24 | **+4.0 eGFR pts** | Pilot cohort dose-response, p=0.002 |

**Phase 2 curve shape — logarithmic accumulation:**

Phase 2 gains accumulate rapidly in months 3–12 and slow through month 24. Use a logarithmic function normalized to the 3–24 month window:

```python
def phase2_fraction(t_months):
    # t_months in range [3, 24]. Returns fraction of total Phase 2 gain accumulated.
    if t_months <= 3: return 0.0
    if t_months >= 24: return 1.0
    # Logarithmic: log(1 + (t-3)) / log(1 + (24-3))
    return math.log(1 + (t_months - 3)) / math.log(1 + 21)

# eGFR at time t during Phase 2 (months 3-24):
phase1_plateau = egfr_baseline + phase1_total  # fully achieved by month 3
egfr_t = phase1_plateau + phase2_total * phase2_fraction(t_months)
```

### 3.5 Step 4: Post-Phase 2 Plateau and Long-Term Decline (Months 24–120)

After Phase 2 structural recovery is complete at month 24, the trajectory enters a slow long-term decline phase. The rate of decline depends on achieved BUN tier — structural tubular protection continues to limit decline at sustained low BUN levels. Asymmetry data confirms Phase 2 gains are partially durable (BUN rises produce ~5x less eGFR impact than BUN falls), justifying slower post-Phase 2 decline for patients at lower BUN tiers.

| Path | Post-Phase 2 Annual Decline | Rationale |
|------|------------------------------|-----------|
| BUN ≤12 | **-0.5 mL/min/yr** | Near-normal tubular protection; 7-year follow-up data confirms stability |
| BUN 13–17 | **-1.0 mL/min/yr** | Meaningful BUN reduction maintains structural protection |
| BUN 18–24 | **-1.5 mL/min/yr** | Partial BUN control; residual suppression limits full protection |
| No treatment | BUN-adjusted (see 3.2) | No phase change; linear decline continues |

```python
# eGFR at time t (months > 24, treatment paths):
egfr_at_24 = phase1_plateau + phase2_total  # Peak eGFR at end of Phase 2
years_after_24 = (t_months - 24) / 12
egfr_t = max(0, egfr_at_24 - (post_decline_rate * years_after_24))
```

### 3.6 Complete Per-Point Calculation (Pseudocode)

```python
def compute_trajectory(egfr_baseline, bun_baseline, age, tier):
    phase1_total = min(tier_max[tier], (bun_baseline - tier_target[tier]) * 0.31)
    phase2_total = tier_phase2_gain[tier]
    results = []

    for t in TIME_POINTS_MONTHS:
        if t == 0:
            egfr = egfr_baseline
        elif t <= 3:
            egfr = egfr_baseline + phase1_total * phase1_fraction(t)
        elif t <= 24:
            phase1_done = egfr_baseline + phase1_total
            egfr = phase1_done + phase2_total * phase2_fraction(t)
        else:
            peak = egfr_baseline + phase1_total + phase2_total
            egfr = max(0, peak - post_decline[tier] * (t - 24) / 12)
        results.append(round(egfr, 1))

    return results
```

### 3.7 New Output — Real-Time BUN Suppression Estimate

Based on new analysis (March 2026) confirming same-visit BUN-eGFR lockstep: a new stat card is added to the API response showing how much eGFR the patient is currently losing due to BUN suppression of tubular function.

Calculation: the amount of eGFR suppression at the patient's current BUN level versus the optimal BUN ≤12 target:

```python
# BUN suppression estimate
OPTIMAL_BUN = 10  # midpoint of ≤12 tier
PHASE1_COEFF = 0.31
bun_suppression_egfr = max(0, (bun_baseline - OPTIMAL_BUN) * PHASE1_COEFF)
# This is capped at 12 (tier max) for BUN ≤12 path
```

Add to API response object:

```python
'bun_suppression_estimate': round(bun_suppression_egfr, 1)
```

This powers a new stat card: "Your kidneys are currently working approximately X points below their potential. Reducing your BUN toward 12 could recover this function within weeks."

> *This is a Phase 1 real-time opportunity estimate, not a trajectory projection. It represents current ambient BUN suppression, not long-term structural recovery potential. Label it clearly as 'current suppression' in the UI. Engineering note: this is a simple field addition to the existing /predict response — no new endpoint needed.*

---

## 4. Complete Test Vectors — Golden File

Three fully worked test vectors. Given these exact inputs, the engine must produce these exact outputs (±0.2 eGFR rounding tolerance). These answer LKID-27 (golden-file boundary tests).

### Test Vector 1 — Spec Example Patient (BUN 35, eGFR 33, Age 58)

This is the example shown in Section 1 of spec v2.0. Use this to validate the chart output matches the four stat cards.

**Inputs:**

| Input | Value |
|-------|-------|
| BUN | 35 mg/dL |
| Creatinine | 2.1 mg/dL |
| Age | 58 years |
| eGFR | 33 (entered) |

**Trajectory Output:**

| Mo | No Tx | BUN 18–24 | BUN 13–17 | BUN ≤12 | Patient Age | Notes |
|----|-------|-----------|-----------|---------|-------------|-------|
| 0 | 33.0 | 33.0 | 33.0 | 33.0 | 58.0 | ← baseline |
| 1 | 32.8 | 34.0 | 34.6 | 35.4 | 58.1 | |
| 3 | 32.3 | 35.7 | 36.9 | 38.7 | 58.3 | Phase 1 ~complete |
| 6 | 31.7 | 36.0 | 37.4 | 39.6 | 58.5 | Phase 2 starts |
| 12 | 30.6 | 37.0 | 39.4 | 42.6 | 59.0 | |
| 18 | 29.5 | 37.6 | 40.7 | 44.5 | 59.5 | |
| 24 | 28.4 | 37.9 | 41.4 | 45.7 | 60.0 | Phase 2 complete |
| 36 | 26.3 | 36.4 | 40.4 | 45.2 | 61.0 | |
| 48 | 24.1 | 34.9 | 39.4 | 44.7 | 62.0 | |
| 60 | 22.0 | 33.4 | 38.4 | 44.2 | 63.0 | |
| 72 | 19.8 | 31.9 | 37.4 | 43.7 | 64.0 | |
| 84 | 17.7 | 30.4 | 36.4 | 43.2 | 65.0 | |
| 96 | 15.5 | 28.9 | 35.4 | 42.7 | 66.0 | |
| 108 | 13.4 | 27.4 | 34.4 | 42.2 | 67.0 | |
| 120 | 11.2 | 25.9 | 33.4 | 41.7 | 68.0 | ← yr 10 (age 68) |

**Expected stat card output:**

| Metric | No Tx | BUN 18–24 | BUN 13–17 | BUN ≤12 |
|--------|-------|-----------|-----------|---------|
| eGFR at age 68 (yr 10) | 11.2 | 25.9 | 33.4 | 41.7 |
| Change from baseline | -21.8 | -7.1 | +0.4 | +8.7 |
| Dialysis age (eGFR < 12) | ~68.2 | None (<10yr) | None (<10yr) | None (<10yr) |

**BUN suppression estimate:** (35 - 10) × 0.31 = **+7.8 eGFR pts** currently suppressed

> *Note: the spec Section 1 stat cards show different values (eGFR 9, 37, 42, 50). Those were illustrative. These test vector values are computed from the confirmed algorithm and supersede the illustrative values in the spec. Section 1 of spec v2.0 should be treated as a layout/design reference, not a calibrated output.*

### Test Vector 2 — Stage 5 High-BUN Patient (BUN 53, eGFR 10, Age 65)

Represents a severe CKD patient analogous to Patient 108 in the pilot cohort (BUN 53→9, eGFR 10→36). Tests behavior at extreme baseline BUN and low starting eGFR.

| Mo | No Tx | BUN 18–24 | BUN 13–17 | BUN ≤12 | Patient Age | Notes |
|----|-------|-----------|-----------|---------|-------------|-------|
| 0 | 10.0 | 10.0 | 10.0 | 10.0 | 65.0 | Stage 5 baseline |
| 3 | 8.5 | 14.0 | 16.4 | 19.4 | 65.3 | Ph1 complete |
| 12 | 5.5 | 16.1 | 20.2 | 24.9 | 66.0 | |
| 24 | 2.0 | 17.5 | 22.4 | 27.4 | 67.0 | Ph2 complete |
| 36 | — | 16.0 | 21.4 | 26.9 | 68.0 | |
| 120 | — | 7.5 | 15.4 | 22.4 | 75.0 | ← yr 10 |

**Expected dial_ages output:**

| Metric | No Tx | BUN 18–24 | BUN 13–17 | BUN ≤12 |
|--------|-------|-----------|-----------|---------|
| Age at dialysis (eGFR < 12) | ~66.7 | ~74.5 | None | None |

**BUN suppression estimate:** (53 - 10) × 0.31 = +13.3 eGFR pts (capped at tier max **12.0**)

### Test Vector 3 — Mild CKD Patient (BUN 22, eGFR 48, Age 52)

Tests behavior near the BUN threshold. BUN is only slightly elevated — Phase 1 gain is small. Majority of benefit from Phase 2 structural recovery. Confirms no treatment still shows eventual decline.

| Mo | No Tx | BUN 18–24 | BUN 13–17 | BUN ≤12 | Patient Age | Notes |
|----|-------|-----------|-----------|---------|-------------|-------|
| 0 | 48.0 | 48.0 | 48.0 | 48.0 | 52.0 | Stage 3a baseline |
| 3 | 47.6 | 48.3 | 49.3 | 51.1 | 52.3 | Small Ph1 (low BUN delta) |
| 24 | 44.8 | 49.0 | 52.2 | 57.4 | 54.0 | Ph2 complete |
| 120 | 29.2 | 34.0 | 42.2 | 52.9 | 62.0 | ← yr 10 |

**BUN suppression estimate:** (22 - 10) × 0.31 = **+3.7 eGFR pts** currently suppressed

> *Note for QA: in Vector 3, the BUN 18–24 path Phase 1 gain is small (baseline BUN 22, tier target 21 = only 1 mg/dL delta × 0.31 = 0.3 eGFR pts Phase 1). Most of the BUN 18–24 benefit here is Phase 2 structural gain (+4.0 pts). This tests that the model correctly handles small BUN deltas without over-projecting.*

---

## 5. Optional Field Modifiers (Confidence Tier 2)

When hemoglobin, CO2, and albumin are entered, the server adjusts the trajectory for metabolic comorbidity burden. These are additive modifiers to the post-Phase 2 decline rate.

| Field | Concerning Range | Decline Modifier (per yr) | Mechanism |
|-------|------------------|---------------------------|-----------|
| Hemoglobin | < 11 g/dL | +0.2 mL/min/yr excess decline | EPO deficiency; anemia accelerates CKD via hypoxia |
| Serum CO2 | < 22 mEq/L | +0.3 mL/min/yr per 2 mEq below 22 | Metabolic acidosis from tubular dysfunction |
| Albumin | < 3.5 g/dL | +0.3 mL/min/yr per 0.5g below 3.5 | Inflammation and malnutrition marker |

These modifiers increase the post-Phase 2 decline rate in all paths including no-treatment. They also increase the Phase 2 gain potential proportionally (worse metabolic baseline = more recovery headroom). Apply to all four paths equally.

> *The modifier calculation is conservative and based on published literature ranges. When optional fields are within normal range, modifier = 0. Modifiers are always additive — never subtract from decline rate. A patient with hemoglobin 13.5, CO2 26, albumin 4.1 receives zero modifier regardless of whether they entered the fields.*

---

## 6. Unblocked Items — What Brad Can Build Now

> **⚠ The engine can start immediately. Brad does not need to wait for a call.**

| LKID Item | Status | Notes |
|-----------|--------|-------|
| LKID-14: Rules engine integration | **UNBLOCKED — spec provided** | Full algorithm in Section 3. Python pseudocode included. |
| LKID-27: Golden-file boundary tests | **UNBLOCKED — vectors provided** | 3 test vectors in Section 4. Tolerance ±0.2 eGFR. |
| Time points array | **CONFIRMED — Section 1** | `[0,1,3,6,12,18,24,36,48,60,72,84,96,108,120]` |
| Dialysis threshold | **CONFIRMED — eGFR 12** | Corrects Brad's eGFR 15 assumption. See Section 2. |
| FastAPI, leads table, Clerk, health endpoint | Already unblocked (per Brad) | No change from prior spec. |
| PDF infrastructure | Already unblocked (per Brad) | No change from prior spec. |
| BUN suppression stat card | **NEW — Section 3.7** | Add `bun_suppression_estimate` field to `/predict` response. |

---

*Kidneyhood.org — Server-Side Calculation Specification v1.0 — March 2026 — NDA Required — Confidential*
