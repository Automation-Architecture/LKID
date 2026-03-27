# QA Report -- PR #13: POST /predict with CKD-EPI 2021 (LKID-15)

**PR:** [#13](https://github.com/Automation-Architecture/LKID/pull/13) (`feat/LKID-15-post-predict` -> `main`)
**Reviewer:** Yuri (QA)
**Date:** 2026-03-27
**Scope:** POST /predict endpoint -- CKD-EPI 2021 eGFR, 4 trajectory paths, confidence tiers, error envelope, Pydantic models
**Method:** QA Testing SOP Workflow 2b (API endpoint review against contract + cross-boundary checks)

---

## Executive Summary

**PASS WITH CONDITIONS** -- The prediction engine implements CKD-EPI 2021 correctly with sex-specific coefficients, and the confidence tier logic matches Decision #12. The error envelope conforms to Decision #9. Engine coefficients are properly isolated (never leaked). However, there are **1 high-severity cross-boundary issue** (response shape mismatch with frontend), **2 medium-severity issues** (Copilot findings with real impact), and **3 low-severity items** (cleanup).

The HIGH issue is a **cross-boundary shape mismatch** between what the backend produces and what Harshit's frontend mock expects. This must be resolved before the frontend can integrate with the real API.

| Area | Items | PASS | FAIL | NOTE |
|------|-------|------|------|------|
| CKD-EPI 2021 Formula | 4 | 4 | 0 | 0 |
| Confidence Tier Logic | 3 | 3 | 0 | 0 |
| Error Envelope (Decision #9) | 4 | 4 | 0 | 0 |
| Coefficient Security | 2 | 2 | 0 | 0 |
| Pydantic Models & Validation | 4 | 2 | 1 | 1 |
| Trajectory Engine | 3 | 3 | 0 | 0 |
| Cross-Boundary: Frontend | 4 | 1 | 1 | 2 |
| Cross-Boundary: API Contract | 3 | 1 | 1 | 1 |
| Copilot Findings | 4 | 0 | 2 | 2 |
| **Totals** | **31** | **20** | **5** | **6** |

---

## Findings

### 1. CKD-EPI 2021 Formula Verification

**PP-01: Sex-specific coefficients are correct** -- PASS

- **File:** `backend/prediction/engine.py:27-29`
- Female: kappa=0.7, alpha=-0.241, sex_multiplier=1.012
- Male: kappa=0.9, alpha=-0.302, sex_multiplier=1.0
- These match the CKD-EPI 2021 Inker et al. reference values exactly.

**PP-02: Formula implementation is correct** -- PASS

- **File:** `backend/prediction/engine.py:59-76`
- Formula: `142 * min(Scr/kappa, 1)^alpha * max(Scr/kappa, 1)^(-1.200) * 0.9938^age * sex_multiplier`
- Verified by independent calculation: male, cr=2.1, age=58 produces eGFR 35.8. The engine's `_compute_egfr_for_sex()` matches.

**PP-03: Unknown sex handled correctly** -- PASS

- **File:** `backend/prediction/engine.py:88-91`
- For `sex='unknown'`, the engine averages male and female results. This is a reasonable approach for a marketing app when sex is not specified.

**PP-04: Results are rounded to 1 decimal** -- PASS

- Both `_compute_egfr_for_sex` return path and the `compute_egfr_ckd_epi_2021` wrapper use `round(..., 1)`.

---

### 2. Confidence Tier Logic (Decision #12)

**PP-05: Tier 2 requires BOTH hemoglobin AND glucose** -- PASS

- **File:** `backend/prediction/engine.py:223-235`
- `compute_confidence_tier()` returns 2 only when `hemoglobin is not None and glucose is not None`. Providing only one does not upgrade the tier. This matches Decision #12 exactly.

**PP-06: Tier 1 is the default** -- PASS

- When either hemoglobin or glucose is None, tier is 1. Correct per Decision #12.

**PP-07: Tier 3 not achievable in single-entry mode** -- PASS

- Comment in code correctly notes Tier 3 requires 3+ visits. The current single-entry endpoint cannot produce Tier 3. This is expected and correct.

---

### 3. Error Envelope (Decision #9)

**PP-08: Validation errors use approved envelope** -- PASS

- **File:** `backend/main.py:142-168`
- `RequestValidationError` handler returns `{"error": {"code": "VALIDATION_ERROR", "message": "...", "details": [{"field": "...", "message": "..."}]}}`. Matches Decision #9 exactly.
- Field paths strip the "body" prefix from Pydantic loc tuples (line 154). This produces clean field names like `bun` instead of `body.bun`.

**PP-09: Rate limit errors use approved envelope** -- PASS

- **File:** `backend/main.py:128-139`
- Returns `{"error": {"code": "RATE_LIMIT_EXCEEDED", ...}}` with empty details array. Matches Decision #9.

**PP-10: Generic errors use approved envelope** -- PASS

- **File:** `backend/main.py:171-184`
- Catch-all returns `{"error": {"code": "INTERNAL_ERROR", ...}}`. Logs exception server-side but never leaks details. Correct.

**PP-11: Validation error HTTP status is 422** -- PASS

- Line 160: `status_code=422`. Matches API contract's `VALIDATION_ERROR` mapping.

---

### 4. Coefficient Security

**PP-12: Engine coefficients not exposed in responses** -- PASS

- **File:** `backend/prediction/engine.py:13-14`
- Proprietary coefficients (`_CKD_EPI_COEFFICIENTS`, `PHASE1_COEFF`, `TIER_CONFIG`, `NO_TX_DECLINE_RATES`) are module-level constants prefixed with underscore or in ALL_CAPS (internal convention).
- The `predict_for_endpoint()` return dict (lines 370-378) contains only: `egfr_baseline`, `confidence_tier`, `trajectories`, `time_points_months`, `dial_ages`, `dialysis_threshold`, `stat_cards`. No coefficients leaked.

**PP-13: Error handlers never expose internals** -- PASS

- Validation handler only surfaces field names and Pydantic messages.
- Generic handler returns static "An unexpected error occurred" string.
- Endpoint try/except (main.py:308-331) returns static "Prediction engine encountered an error" string.

---

### 5. Pydantic Models & Validation

**PP-14: Required field ranges match API contract** -- FAIL [MEDIUM]

- **File:** `backend/main.py:209-221`
- `PredictRequest` validation ranges differ from the API contract (`api_docs.md` Section 5):

| Field | Engine (main.py) | API Contract | Match? |
|-------|-------------------|-------------|--------|
| bun | ge=5, le=100 | min=5, max=150 | **NO -- max 100 vs 150** |
| creatinine | ge=0.1, le=25.0 | min=0.3, max=15.0 | **NO -- min 0.1 vs 0.3, max 25.0 vs 15.0** |
| potassium | ge=2.0, le=8.0 | min=2.0, max=8.0 | YES |
| age | ge=18, le=120 | min=18, max=120 | YES |
| hemoglobin | ge=3.0, le=25.0 | min=4.0, max=20.0 | **NO -- min 3.0 vs 4.0, max 25.0 vs 20.0** |
| glucose | ge=20, le=600 | min=40, max=500 | **NO -- min 20 vs 40, max 600 vs 500** |

Four of six validated fields have range mismatches. The engine accepts wider ranges than the API contract specifies. This means values the contract says should be rejected (e.g., creatinine=0.2, BUN=120) would pass backend validation.

- **Fix:** Align Pydantic Field ranges to the API contract values. The contract ranges are binding (they also match the DB CHECK constraints).

**PP-15: Sex enum includes "unknown"** -- PASS

- `Literal["male", "female", "unknown"]` matches the API contract.

**PP-16: Unused model `TrajectoryPoint`** -- NOTE [LOW]

- **File:** `backend/main.py:238-240`
- `TrajectoryPoint` model is defined but never used. The response uses `list[float]` directly. Copilot also flagged this. Should be removed for clarity.

**PP-17: Lead capture fields (name, email) accepted but ignored** -- NOTE [LOW]

- `PredictRequest` includes optional `name` and `email` fields (lines 230-235) for lead capture, but the `predict()` endpoint does not use them. This is acceptable as a forward-looking schema addition, but they should be explicitly documented as unused in the current implementation.

---

### 6. Trajectory Engine

**PP-18: Four trajectories with 15 time points each** -- PASS

- `TIME_POINTS_MONTHS` has 15 entries (engine.py:22).
- `predict_for_endpoint()` computes `no_treatment`, `bun_18_24`, `bun_13_17`, `bun_12` -- all use the same time points array.

**PP-19: Dialysis threshold is eGFR 12.0** -- PASS

- **File:** `backend/prediction/engine.py:24`
- `DIALYSIS_THRESHOLD = 12.0` with comment "NOT 15". Matches confirmed spec and Q4 resolution.

**PP-20: Dial ages use linear interpolation** -- PASS

- `compute_dial_age()` (engine.py:193-209) linearly interpolates between adjacent time points when trajectory crosses below threshold. Correct per spec.

---

### 7. Cross-Boundary: Frontend Response Shape

**PP-21: Response shape does NOT match frontend mock** -- FAIL [HIGH]

This is the most critical finding. The backend `PredictResponse` and the frontend MSW mock (`app/src/mocks/handlers.ts`) use fundamentally different shapes for the same data.

**Backend response shape (`PredictResponse`):**
```json
{
  "egfr_baseline": 33.0,
  "confidence_tier": 2,
  "trajectories": {
    "no_treatment": [33.0, 32.8, ...],
    "bun_18_24": [33.0, 34.0, ...],
    "bun_13_17": [33.0, 34.6, ...],
    "bun_12": [33.0, 35.4, ...]
  },
  "time_points_months": [0, 1, 3, ...],
  "dial_ages": {
    "no_treatment": 68.2,
    "bun_18_24": null,
    "bun_13_17": null,
    "bun_12": null
  },
  "dialysis_threshold": 12.0,
  "stat_cards": { ... }
}
```

**Frontend mock shape (handlers.ts):**
```json
{
  "egfr_baseline": 33.0,
  "egfr_calculated": 33.0,
  "current_age": 58,
  "time_points_months": [0, 1, 3, ...],
  "bun_suppression_estimate": 7.8,
  "trajectories": {
    "no_treatment": {
      "label": "No Treatment",
      "values": [33.0, 32.8, ...],
      "dial_age": 68.2
    },
    "bun_18_24": { "label": "BUN 18-24", "values": [...], "dial_age": null },
    "bun_13_17": { "label": "BUN 13-17", "values": [...], "dial_age": null },
    "bun_le_12": { "label": "BUN <=12", "values": [...], "dial_age": null }
  }
}
```

**Key mismatches:**

| Aspect | Backend | Frontend Mock | Issue |
|--------|---------|---------------|-------|
| Trajectory values | Flat `list[float]` | Nested `{label, values, dial_age}` | **Structural mismatch** |
| Dial ages | Separate `dial_ages` top-level object | Nested inside each trajectory | **Different location** |
| 4th tier key | `bun_12` | `bun_le_12` | **Key name mismatch** |
| `egfr_calculated` | Not present | Present | Missing field |
| `current_age` | Not present | Present | Missing field |
| `bun_suppression_estimate` | Inside `stat_cards` | Top-level | Different nesting |
| `confidence_tier` | Present | Not present | Backend adds, mock lacks |
| `dialysis_threshold` | Present | Not present | Backend adds, mock lacks |
| `stat_cards` | Present | Not present | Backend adds, mock lacks |
| Trajectory labels | Not present | Present per trajectory | Backend lacks |

**Impact:** When Harshit's frontend switches from MSW mocks to the real API, every field access pattern will break. Code like `response.trajectories.no_treatment.values` will fail because the backend returns `response.trajectories.no_treatment` as a flat array.

**Fix:** Either (a) align the backend response to the mock shape, or (b) align the mock to the backend shape and update all frontend consumers. Option (b) is preferred since the PR being reviewed defines the backend contract. The mock should be updated to match.

---

**PP-22: Missing fields the frontend expects** -- NOTE [MEDIUM]

The frontend mock includes fields the backend does not produce:
- `egfr_calculated` (redundant with `egfr_baseline` but the frontend may reference it)
- `current_age` (useful for chart axis labels)
- `bun_suppression_estimate` as a top-level field (backend buries it in `stat_cards`)
- Trajectory `label` strings (e.g., "No Treatment", "BUN 18-24")

These should be added to the backend response or explicitly removed from the frontend expectations.

---

**PP-23: Backend adds fields the frontend does not expect** -- NOTE [LOW]

The backend includes `confidence_tier`, `dialysis_threshold`, and `stat_cards` that the mock does not have. This is fine -- adding new fields is backward-compatible. The frontend simply needs to be updated to consume them when ready.

---

**PP-24: Response model annotation mismatch** -- PASS

The `PredictResponse` Pydantic model correctly describes the shape the endpoint actually returns. The model itself is internally consistent.

---

### 8. Cross-Boundary: API Contract (`api_docs.md`)

**PP-25: Response shape diverges from API contract** -- FAIL [MEDIUM]

The API contract (Section 4.11) specifies yet a third shape:
- Trajectory keys: `none`, `bun24`, `bun17`, `bun12` (contract) vs `no_treatment`, `bun_18_24`, `bun_13_17`, `bun_12` (backend)
- `egfr_calculated` (contract) vs `egfr_baseline` (backend)
- `slope`, `slope_description`, `visit_count`, `unlock_prompt` (contract) vs not present (backend -- acceptable since those are multi-visit fields)

The trajectory key naming is a three-way mismatch: contract uses `none`/`bun24`/`bun17`/`bun12`, backend uses `no_treatment`/`bun_18_24`/`bun_13_17`/`bun_12`, frontend mock uses `no_treatment`/`bun_18_24`/`bun_13_17`/`bun_le_12`.

**Fix:** All three must agree on a single naming convention. The backend's naming (`no_treatment`, `bun_18_24`, `bun_13_17`, `bun_12`) is the most descriptive. Update the contract and frontend mock to match.

**PP-26: Single-visit fields correctly omitted** -- PASS

The contract's `slope`, `slope_description`, `visit_count`, and `unlock_prompt` are multi-visit features. The current endpoint only supports single-visit predictions. Their absence is expected and documented.

**PP-27: Error codes match contract** -- NOTE [LOW]

`VALIDATION_ERROR` (422), `RATE_LIMIT_EXCEEDED` (429), and `INTERNAL_ERROR` (500) all match the contract's error code table. The 400 `VALIDATION_ERROR` from the contract maps to 422 in the implementation -- this is a minor discrepancy (Pydantic uses 422 by default, contract says 400). Acceptable since both communicate the same meaning.

---

### 9. Copilot Findings Assessment

**PP-28: Mutable default `details: list[ErrorDetail] = []`** -- NOTE [MEDIUM]

- **File:** `backend/main.py:121`
- Copilot correctly flagged that `details: list[ErrorDetail] = []` in the Pydantic model uses a mutable default. While Pydantic v2 handles this safely internally (it copies the default), best practice is `Field(default_factory=list)` for clarity and to avoid surprises if the model is ever used outside Pydantic context.
- **Severity:** Low risk in practice (Pydantic v2 is safe), but worth fixing for hygiene. **Non-blocking.**

**PP-29: Unused import `run_prediction`** -- FAIL [LOW]

- **File:** `backend/main.py:30`
- `from prediction.engine import predict as run_prediction` is imported but never used. The endpoint uses `predict_for_endpoint` (line 31). The dead import should be removed.
- **Fix:** Remove line 30.

**PP-30: Unused model `TrajectoryPoint`** -- NOTE [LOW]

- **File:** `backend/main.py:238-240`
- Same as PP-16. Defined but unreferenced. Remove it.

**PP-31: Duplicate try/except in `/predict` endpoint** -- FAIL [MEDIUM]

- **File:** `backend/main.py:308-331`
- The endpoint has a local try/except that catches `Exception` and returns a 500 error. This duplicates the global `@app.exception_handler(Exception)` handler at line 171. Worse, the local handler's message ("Prediction engine encountered an error.") differs from the global handler's message ("An unexpected error occurred."), creating inconsistent error responses.
- The local handler also returns `JSONResponse` directly while the endpoint is annotated with `response_model=PredictResponse`, which means FastAPI's response serialization is bypassed for the error case. This is functionally correct (the JSONResponse takes precedence) but architecturally messy.
- **Fix:** Remove the local try/except and let exceptions bubble to the global handler. If a prediction-specific error message is needed, raise a custom exception with a dedicated handler.

---

## Failure Summary

### HIGH Severity (1)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| PP-21 | Response shape | Backend response structure does not match frontend mock -- flat arrays vs nested objects, different key names, missing fields | Align frontend mock to backend shape OR vice versa; requires coordination between Harshit (frontend) and John Donaldson (API) |

### MEDIUM Severity (3)

| ID | Component | Issue | Fix |
|----|-----------|-------|-----|
| PP-14 | main.py:209-227 | Pydantic validation ranges (BUN, creatinine, hemoglobin, glucose) do not match API contract or DB constraints | Align Field ranges to api_docs.md Section 5 |
| PP-25 | Response shape | Trajectory key names are a 3-way mismatch across contract, backend, and frontend | Standardize on one convention; update contract and mock |
| PP-31 | main.py:308-331 | Local try/except duplicates global error handler with different message | Remove local handler; let global handler catch |

### LOW Severity (3)

| ID | Component | Issue |
|----|-----------|-------|
| PP-28 | main.py:121 | Mutable default on Pydantic model (safe in practice, clean up for hygiene) |
| PP-29 | main.py:30 | Unused import `run_prediction` |
| PP-30 | main.py:238-240 | Unused model `TrajectoryPoint` |

---

## Reviewer Cross-Reference

| Finding | Copilot | CodeRabbit | Yuri |
|---------|---------|------------|------|
| Mutable default `details=[]` | Flagged | -- | PP-28 (LOW) |
| Unused import `run_prediction` | Flagged | -- | PP-29 (LOW) |
| Unused model `TrajectoryPoint` | Flagged | -- | PP-30 (LOW) |
| Duplicate try/except | Flagged | -- | PP-31 (MEDIUM) |
| Response shape mismatch | -- | -- | PP-21 (HIGH) |
| Validation range mismatch | -- | -- | PP-14 (MEDIUM) |
| Trajectory key naming | -- | -- | PP-25 (MEDIUM) |

Copilot's 4 findings are all valid. The mutable default (PP-28) is low-risk due to Pydantic v2 safety. The unused import and model (PP-29, PP-30) are cleanup items. The duplicate try/except (PP-31) is a real architectural issue.

---

## CKD-EPI 2021 Formula Verification Summary

| Parameter | Expected (Inker 2021) | Engine Value | Match |
|-----------|----------------------|--------------|-------|
| Female kappa | 0.7 | 0.7 | YES |
| Female alpha | -0.241 | -0.241 | YES |
| Female multiplier | 1.012 | 1.012 | YES |
| Male kappa | 0.9 | 0.9 | YES |
| Male alpha | -0.302 | -0.302 | YES |
| Male multiplier | 1.0 | 1.0 | YES |
| Base constant | 142 | 142.0 | YES |
| Age factor | 0.9938 | 0.9938 | YES |
| Exponent (high Scr) | -1.200 | -1.200 | YES |

Independent calculation for male, cr=2.1, age=58: engine produces 35.8 mL/min/1.73m2. Matches hand calculation.

---

## Overall Readiness Assessment

### Merge Readiness: NOT READY -- 1 blocking issue + 3 medium issues

1. **PP-21 (HIGH):** Response shape mismatch between backend and frontend is a cross-boundary blocker. The frontend will break when switching from mocks to the real API. This requires a coordination decision between Harshit and John Donaldson before merge.

2. **PP-14 (MEDIUM):** Validation ranges should match the binding API contract. 4 of 6 field ranges are misaligned.

3. **PP-25 (MEDIUM):** Trajectory key naming must be standardized across all three layers (contract, backend, frontend).

4. **PP-31 (MEDIUM):** Duplicate error handling should be cleaned up for consistency.

### Recommended Fix Priority

1. Resolve response shape alignment (PP-21) -- requires discussion, ~30 min
2. Fix Pydantic validation ranges (PP-14) -- 5 min
3. Standardize trajectory key names (PP-25) -- 10 min (touches 3 files)
4. Remove duplicate try/except (PP-31) -- 2 min
5. Remove unused import and model (PP-29, PP-30) -- 1 min
6. Fix mutable default (PP-28) -- 1 min

---

*QA review complete. 31 items checked, 20 pass, 5 fail, 6 notes. One high-severity cross-boundary issue blocks merge. CKD-EPI 2021 formula is clinically correct. Confidence tier logic matches Decision #12. Error envelope matches Decision #9. Engine coefficients are never leaked.*
