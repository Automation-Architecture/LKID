# DISPATCH: Sprint 3 Backend — John Donaldson

**Date:** 2026-03-30
**From:** Luca (CTO / Orchestrator)
**To:** John Donaldson (API Designer / Backend Developer)
**Sprint:** Sprint 3 — PDF, Polish & QA (Mar 30 -- Apr 9)

---

## Status Summary

Sprint 2 is closed. 11 PRs merged. Your LKID-15 endpoint is live and wired to the frontend. Two of your Sprint 3 cards remain blocked on Lee (LKID-14 formula confirmation, LKID-47 Klaviyo API key) — but LKID-14 does NOT block you from starting. This dispatch covers what you can build now without waiting.

Priority order: LKID-14 rules engine scaffold first (Harshit cannot render the Visx chart without real trajectory data), then LKID-25 rate limiting. LKID-47 stays parked until Lee responds.

---

## Task 1: LKID-14 — Rules Engine Scaffold with CKD-EPI Placeholders

**Card:** LKID-14
**Priority:** HIGH — unblocks Harshit's chart (LKID-19) and Gay Mark + Yuri's boundary tests (LKID-27)
**Branch:** `feat/LKID-14-rules-engine`

### Context

Lee has not yet responded to the 6 formula questions (see `agents/john_donaldson/drafts/finalized-formulas.md` Section 8). The escalation path is: follow-up email Mar 28 → Luca escalates Mar 30 → fallback decision Mar 30. Regardless of Lee's response, build the full engine scaffold now. When Lee answers, the formulas slot directly into the structure you create here. The scaffold must produce well-formed, directionally correct trajectory data so Harshit can render the chart and Yuri can write tests against real shapes.

### What to Build

Implement the full prediction engine at `backend/prediction/engine.py`. Replace or extend the existing stub. The engine must conform exactly to the `POST /predict` contract in `agents/john_donaldson/drafts/api_contract.json`.

#### Inputs (from `PredictRequest`)

Required:
- `bun` — float, 5–150 mg/dL
- `creatinine` — float, 0.3–15.0 mg/dL (note: Sprint 2 alignment confirmed max=15.0 in Pydantic; DB migration aligned to creatinine_max=20.0 for safety but Pydantic enforces 15.0)
- `age` — int, 18–100 years

Optional (Confidence Tier 2 modifiers):
- `hemoglobin` — float, g/dL
- `co2` — float, mEq/L
- `albumin` — float, g/dL

Lead capture (optional, not part of engine logic):
- `name` — str
- `email` — email str

#### Output (from `PredictResponse`)

```json
{
  "egfr_baseline": 33.0,
  "time_points_months": [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  "trajectories": {
    "no_treatment": [/* 15 floats */],
    "bun_18_24":    [/* 15 floats */],
    "bun_13_17":    [/* 15 floats */],
    "bun_12":       [/* 15 floats */]
  },
  "dial_ages": {
    "no_treatment": 68.2,
    "bun_18_24": null,
    "bun_13_17": null,
    "bun_12": null
  },
  "bun_suppression_estimate": 7.8
}
```

Time points array is fixed:
```python
TIME_POINTS_MONTHS = [0, 1, 3, 6, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120]
```

#### Step 1: Baseline eGFR via CKD-EPI 2021 (Race-Free, Sex-Free)

No sex input is collected (marketing app). Use the population-average sex coefficients:

```python
kappa = 0.9
alpha = -0.302
egfr_baseline = 142 * min(Cr/kappa, 1)**alpha * max(Cr/kappa, 1)**(-1.200) * 0.9938**age
```

If the patient provides a self-reported eGFR (optional field, not currently in contract), use it directly. Otherwise use this calculation.

#### Step 2: No-Treatment Path

From `finalized-formulas.md` Section 4. Use CKD-stage base decline rates + BUN modifier:

```python
# Base annual decline by CKD stage (eGFR range)
# Stage 3a: 45–59  -> -1.8 mL/min/yr
# Stage 3b: 30–44  -> -2.2 mL/min/yr
# Stage 4:  15–29  -> -3.0 mL/min/yr
# Stage 5:  <15    -> -4.0 mL/min/yr

bun_modifier = max(0, (baseline_bun - 20) / 10) * 0.15  # additive, per yr

annual_decline = base_rate + bun_modifier  # negative value

for t_months in TIME_POINTS_MONTHS:
    egfr_no_tx = max(0, egfr_baseline + annual_decline * (t_months / 12))
```

#### Step 3: Treatment Path Structure (Phase 1 / Phase 2 / Post-Phase 2)

Each of the three treatment tiers (BUN 18-24, BUN 13-17, BUN <=12) uses this structure. For the scaffold, implement the structure fully using the v2.0 formulas from `finalized-formulas.md` Sections 2 and 3. These are the governing formulas; the calc spec's 0.31 coefficient is a simplification that diverges.

**Phase 1 (months 0–6) — BUN suppression removal + rate differential:**

```python
def compute_phase1(egfr_baseline, bun_baseline, age, tier_target_bun):
    phase1_suppression = egfr_baseline * 0.08

    reduction = 0.46
    if age > 75: reduction -= 0.05
    if age > 85: reduction -= 0.05
    if egfr_baseline < 15: reduction -= 0.08
    elif egfr_baseline < 30: reduction -= 0.03

    achieved_bun = max(bun_baseline * (1 - reduction), 9)
    achieved_bun_for_tier = max(achieved_bun, tier_target_bun)

    old_rate = get_decline_rate(egfr_baseline, bun_baseline)
    new_rate = get_decline_rate(egfr_baseline, achieved_bun_for_tier)
    phase1_real = (abs(old_rate) - abs(new_rate)) * 0.5  # 6 months

    return phase1_suppression + phase1_real

def phase1_fraction(t_months):
    """Exponential approach — ~92% by month 3, 100% by month 6."""
    if t_months >= 6: return 1.0
    return 1 - math.exp(-2.5 * t_months / 3)
```

**Phase 2 (months 6–24) — Tubular repair gain:**

```python
def compute_phase2_gain(achieved_bun, age):
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

    if age > 80:
        phase2 *= 0.80 * 0.65
    elif age > 70:
        phase2 *= 0.80

    return phase2

def phase2_fraction(t_months):
    """Logarithmic accumulation over months 6–24."""
    if t_months <= 6: return 0.0
    if t_months >= 24: return 1.0
    return math.log(1 + (t_months - 6)) / math.log(1 + 18)
```

**Post-Phase 2 decline (months 24–120):**

Tier-specific annual decline rates:
- BUN <=12: -0.5 mL/min/yr
- BUN 13-17: -1.0 mL/min/yr
- BUN 18-24: -1.5 mL/min/yr

```python
egfr_at_24 = egfr_baseline + phase1_total + phase2_total  # peak eGFR
years_after_24 = (t_months - 24) / 12
egfr_t = max(0, egfr_at_24 - abs(post_decline_rate) * years_after_24)
```

#### Step 4: Optional Field Modifiers (Confidence Tier 2)

When hemoglobin, CO2, or albumin are provided and in concerning ranges, they increase post-Phase 2 decline rate across all paths. Apply equally to all four trajectories.

| Field | Concerning Range | Decline Modifier |
|-------|------------------|------------------|
| Hemoglobin | < 11 g/dL | +0.2 mL/min/yr |
| Serum CO2 | < 22 mEq/L | +0.3 mL/min/yr per 2 mEq below 22 |
| Albumin | < 3.5 g/dL | +0.3 mL/min/yr per 0.5g below 3.5 |

#### Step 5: Supplementary Fields

**`bun_suppression_estimate`** (stat card display):
```python
bun_suppression_estimate = max(0, (baseline_bun - 10) * 0.31)
```
Cap at 12.0 for extreme BUN values.

**`dial_ages`** — per trajectory, interpolate the age at which eGFR crosses below 12 (dialysis threshold). Return `null` if no crossing within the 120-month window.

```python
# eGFR 12 is the confirmed dialysis threshold (corrected from 15 per calc spec Section 2)
DIALYSIS_THRESHOLD = 12.0
```

#### Step 6: Tier Target BUN Values

| Tier | Target BUN |
|------|-----------|
| BUN <=12 | 10 mg/dL |
| BUN 13-17 | 15 mg/dL |
| BUN 18-24 | 21 mg/dL |

### Open Questions — Do Not Block On These

The formula questions for Lee (see `finalized-formulas.md` Section 8) are open. Build with v2.0 formulas and document the assumption in code comments. Specifically:

- **Q1:** Test vectors in the calc spec were generated with the simplified 0.31 coefficient model. Your v2.0 implementation will produce different values. This is expected. Flag in a comment.
- **Q2:** `rate_P1` in v2.0 refers to the 5-pillar model rate we don't implement. Use the CKD-stage simplified decline rate as the substitute. Document this.
- **Q4:** Dialysis threshold — using eGFR 12 per calc spec correction. If Lee corrects to 15, it's a one-line change.

### Test Vectors (Framework, Not Golden File)

Set up the test framework using the three vectors from `finalized-formulas.md` Section 7. These vectors were generated with the simplified model and will NOT match v2.0 outputs exactly. Write the tests to assert structural correctness (correct shape, all 15 points, baseline at t=0, treatment paths above no-treatment, etc.) rather than exact numeric matches. Yuri and Gay Mark will take it from here on LKID-27.

Reference vectors for shape validation:

**Vector 1 — BUN 35, eGFR 33, Age 58:**
At t=0: all paths = 33.0. At t=24: no_treatment ≈ 28.4, bun_18_24 ≈ 37.9, bun_13_17 ≈ 41.4, bun_12 ≈ 45.7.

**Vector 2 — BUN 53, eGFR 10, Age 65 (Stage 5):**
At t=0: all paths = 10.0. No-treatment reaches 0 before t=36.

**Vector 3 — BUN 22, eGFR 48, Age 52 (Stage 3a):**
At t=0: all paths = 48.0. At t=120: no_treatment ≈ 29.2.

### Acceptance Criteria

1. `POST /predict` returns `egfr_baseline`, `time_points_months` (exactly 15 values), `trajectories` (4 arrays x 15 floats), `dial_ages` (4 keys, float or null), `bun_suppression_estimate` (float)
2. At t=0, all four trajectory arrays equal `egfr_baseline` (within floating point tolerance)
3. Treatment paths are all >= no-treatment path at every time point
4. Higher BUN tier (better BUN control) produces higher trajectory at all post-baseline time points
5. eGFR never goes negative (floor at 0)
6. `dial_ages` returns `null` when trajectory stays above 12 for the full 120-month window
7. Dialysis threshold used is eGFR 12
8. Optional field modifiers (hemoglobin, CO2, albumin) affect post-Phase 2 decline when provided
9. Structural test file in place for Yuri / Gay Mark to extend for LKID-27
10. Engine coefficients do not appear in any response payload or log output

---

## Task 2: LKID-25 — Rate Limiting (slowapi)

**Card:** LKID-25
**Priority:** MEDIUM — complete after LKID-14 scaffold is merged
**Branch:** `feat/LKID-25-rate-limiting`

### What to Build

Add `slowapi` middleware to the FastAPI backend. Rate limit three endpoints by client IP.

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /predict` | 10 requests | 1 minute |
| `POST /predict/pdf` | 5 requests | 1 minute |
| (Future) `/auth/request-link` | 3 requests | 15 minutes |

Note: `/auth/request-link` is a Clerk-managed endpoint — implement the middleware hook/slot now so it can be activated when the endpoint exists, but do not add it to a Clerk-controlled route if that causes errors. Confirm in the PR description what was and was not applied.

### Response Behavior

- Exceeded limit returns HTTP 429
- Response includes `Retry-After` header (seconds until window resets)
- No custom rate limit headers beyond slowapi defaults (`X-RateLimit-*` if slowapi provides them is fine; do not invent custom headers)
- Rate key: client IP extracted from `request.client.host`

### Implementation Notes

- Add `slowapi` to `requirements.txt`
- Initialize `Limiter` with `key_func=get_remote_address`
- Register `SlowAPIMiddleware` on the FastAPI app
- Add `@limiter.limit(...)` decorators to the affected route handlers
- Return a clean JSON error using the existing error envelope on 429:
  ```json
  {
    "error": {
      "code": "RATE_LIMIT",
      "message": "Too many requests. Please wait before trying again."
    }
  }
  ```

### Acceptance Criteria

1. `POST /predict` is rate-limited at 10/min per IP
2. `POST /predict/pdf` is rate-limited at 5/min per IP
3. Exceeding the limit returns HTTP 429
4. `Retry-After` header is present in the 429 response
5. 429 body uses the existing error envelope with code `RATE_LIMIT`
6. Rate limiting does not affect `GET /health` or `GET /leads`
7. `requirements.txt` updated with `slowapi` dependency

---

## Coordination Notes

- **LKID-14 scaffold is the priority.** Harshit cannot render the Visx chart (LKID-19) without real trajectory data from the prediction engine. Get this merged first.
- **Gay Mark and Yuri (LKID-27)** are writing boundary and integration tests against the prediction engine. Your structural test file (Task 1, step above) is their starting scaffold. Coordinate on the `prediction/engine.py` public interface — they need it stable before writing tests.
- **PDF endpoint (LKID-22)** is Harshit's card and comes after the chart exists. Your engine will be called by the PDF endpoint via the same `POST /predict` path. No additional engine work needed for PDF.
- **LKID-47 (Klaviyo)** remains blocked on Lee's API key. Do NOT start this card. It will be dispatched separately when the key arrives.
- **LKID-14 formula questions** — the Lee escalation deadline is Mar 30. If Lee answers before you finish the scaffold, update the formulas immediately. If Lee does not answer, ship with the v2.0 formulas as implemented. The scaffold is not a throwaway — it is the production engine with placeholder formula choices that may be confirmed or corrected by Lee.

---

*Dispatched by Luca — 2026-03-30*
