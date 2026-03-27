# LKID-15: POST /predict Implementation Summary

**Author:** John Donaldson (API Designer / Backend Developer)
**Date:** 2026-03-27
**Branch:** `feat/LKID-15-post-predict`
**Card:** [LKID-15](https://automationarchitecture.atlassian.net/browse/LKID-15)

---

## What Changed

### `backend/prediction/engine.py`

1. **Sex-aware CKD-EPI 2021 formula** — replaced the single sex-free formula with the full sex-specific implementation:
   - Female: kappa=0.7, alpha=-0.241, multiplier=1.012
   - Male: kappa=0.9, alpha=-0.302, multiplier=1.0
   - Unknown: averages male + female results
   - Old population-average constants (`CKD_EPI_KAPPA`, `CKD_EPI_ALPHA`) removed; replaced with `_CKD_EPI_COEFFICIENTS` dict.

2. **`compute_confidence_tier()`** — implements Decision #12:
   - Tier 1: required fields only
   - Tier 2: BOTH hemoglobin AND glucose present (one alone stays Tier 1)
   - Tier 3: not reachable in single-entry mode (requires 3+ visits)

3. **`compute_stat_cards()`** — summary statistics for the frontend stat cards:
   - Baseline eGFR, 10-year no-treatment, 10-year best-case, potential gain, BUN suppression estimate

4. **`predict_for_endpoint()`** — new wrapper function returning the LKID-15 response shape:
   - Calls the existing trajectory engine (no_treatment, bun_18_24, bun_13_17, bun_12)
   - Adds confidence_tier, dialysis_threshold (12.0), stat_cards
   - Accepts potassium for validation but does not pass to engine (per spec)

5. **Legacy `predict()` preserved** — kept for backward compatibility with `predict_pdf` and any other callers. Now accepts optional `sex` parameter (defaults to "unknown").

### `backend/main.py`

1. **Enhanced `PredictRequest` model:**
   - Added `potassium` (required, 2.0-8.0)
   - Added `sex` (required, Literal["male", "female", "unknown"])
   - Added `hemoglobin` (optional, 3.0-25.0)
   - Added `glucose` (optional, 20-600)
   - BUN range tightened to 5-100 (from 5-150) per task spec
   - Creatinine range widened to 0.1-25.0 (from 0.3-15.0) per task spec

2. **Enhanced `PredictResponse` model:**
   - Added `confidence_tier` (int: 1, 2, or 3)
   - Added `dialysis_threshold` (always 12.0)
   - Added `stat_cards` (dict of summary statistics)
   - Removed `bun_suppression_estimate` from top level (now inside stat_cards)

3. **Error handling (Decision #9):**
   - `RequestValidationError` handler: converts Pydantic errors to `{error: {code: "VALIDATION_ERROR", message, details[{field, message}]}}`
   - `Exception` catch-all: returns `INTERNAL_ERROR` without leaking internals
   - `RateLimitExceeded`: returns `RATE_LIMIT_EXCEEDED` in error envelope
   - Security: no engine coefficients, no stack traces, no internal paths in any error response

4. **Endpoint wired to `predict_for_endpoint()`** with try/except that logs but never exposes engine errors.

---

## Verification

Tested locally with Python — all assertions pass:

| Test | Result |
|------|--------|
| Male eGFR (Cr=1.80, age=58) | 43.1 |
| Female eGFR (Cr=1.80, age=58) | 32.3 |
| Unknown eGFR (average) | 37.7 |
| Tier 1 (no optionals) | 1 |
| Tier 1 (hemoglobin only) | 1 |
| Tier 2 (both hemoglobin + glucose) | 2 |
| Response has all 7 keys | Yes |
| 15 time points per trajectory | Yes |
| Dialysis threshold = 12.0 | Yes |

---

## What Is NOT Implemented (Blocked / Deferred)

- **Full rules engine coefficients** — blocked on LKID-14 (Lee's 5 formula answers). Current trajectories use the calc spec simplified model (0.31 coefficient, CKD-stage base rates). When Lee responds, coefficients slot into the existing engine functions.
- **Authenticated mode** (`lab_entry_ids`) — requires DB integration (LKID-10/11). Currently only guest inline mode works.
- **Guest session storage** — httpOnly cookie + guest_sessions table not wired yet.
- **Lead capture** — name/email fields accepted but not persisted to leads table (LKID-10 dependency).
- **Tier 3** — requires 3+ visits, which requires multi-entry support.

---

## For Harshit (Frontend Integration)

The endpoint is ready for frontend integration. Response shape matches the mock data structure from the API contract (Section 4.11). Key differences from the earlier scaffold:

1. Request now requires `potassium` and `sex` fields
2. Response includes `confidence_tier`, `dialysis_threshold`, and `stat_cards`
3. Validation errors return the `{error: {code, message, details}}` envelope, not raw Pydantic errors

---

*John Donaldson — 2026-03-27*
