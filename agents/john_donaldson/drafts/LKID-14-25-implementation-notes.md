# LKID-14 + LKID-25 Implementation Notes

**Date:** 2026-03-30
**Author:** John Donaldson
**Branch:** `feat/LKID-14-rules-engine`
**Worktree:** `/tmp/lkid-john/`

---

## LKID-14: Rules Engine v2.0

### What was replaced

The Sprint 2 engine used the calc spec's simplified `0.31 * (BUN - tier_target)` single-coefficient Phase 1 formula with fixed Phase 2 tier totals. This is replaced entirely with the v2.0 two-component formulas from `finalized-formulas.md`.

### Key changes in `backend/prediction/engine.py`

**Phase 1 (months 0–6):**
- Now two components: BUN suppression removal (`egfr * 0.08`) + rate differential
- Rate differential uses CKD-stage decline rates as substitute for `rate_P1` (5-pillar model — acceptable Lean Launch substitution, Q2)
- Phase 1 completes at month 6, not month 3 (v2.0 alignment)
- Phase 1 fraction: exponential approach `1 - exp(-2.5*t/3)`, reaches ~92% by month 3, 100% by month 6

**Phase 2 (months 6–24):**
- Now a continuous function of achieved BUN (v2.0), not fixed tier totals (calc spec)
- `_compute_phase2_gain(achieved_bun, age)` — at tier targets produces values within 0.2 of calc spec
- Age attenuation: >70 → ×0.80, >80 → ×0.80×0.65
- Phase 2 fraction: logarithmic `log(1 + (t-6)) / log(1+18)` over months 6–24

**Optional field modifiers (Confidence Tier 2):**
- `_compute_optional_modifier(hemoglobin, co2, albumin)` — returns additive annual decline (positive = more decline)
- Hemoglobin < 11: +0.2/yr
- CO2 < 22: +0.3 per 2 mEq deficit
- Albumin < 3.5: +0.3 per 0.5g deficit
- Applied to all four trajectories equally

**Dialysis threshold:**
- `DIALYSIS_THRESHOLD = 12.0` — eGFR 12 per calc spec Section 2 correction (Q4)
- One-line change if Lee corrects to 15

**`predict_for_endpoint()` signature (backward-compatible):**
```python
def predict_for_endpoint(
    bun, creatinine, age, sex,
    potassium=None,    # accepted, unused by engine (legacy)
    hemoglobin=None,   # Tier 2 modifier
    co2=None,          # Tier 2 modifier (NEW)
    albumin=None,      # Tier 2 modifier (NEW)
    glucose=None,      # accepted, unused (legacy)
) -> dict
```

**Confidence tier logic updated:** Tier 2 if any of hemoglobin, co2, albumin is provided (was hemoglobin+glucose).

**Response shape:** Added `bun_suppression_estimate` to the endpoint response. BUN suppression estimate still uses calc spec formula `(BUN - 10) * 0.31` capped at 12.0 (distinct from Amendment 3 structural floor).

### Open questions (unchanged)

- **Q1:** Test vectors from finalized-formulas.md were generated with 0.31-coeff model. v2.0 outputs differ. Expected. Flagged in code comments.
- **Q2:** `rate_P1` substituted with CKD-stage rate + BUN modifier. Documented in code.
- **Q4:** Using eGFR 12. If Lee says 15, change `DIALYSIS_THRESHOLD`.

### Smoke test results (v2.0)

Vector 1 (BUN 35, eGFR 33, Age 58):
- t=0: all paths = 33.0 ✓
- t=24: no_tx=28.1, bun_18_24=39.6, bun_13_17=42.0, bun_12=43.8 ✓
- t=120: no_tx=8.7, bun_18_24=27.6, bun_13_17=34.0, bun_12=39.8
- dial_ages: no_tx=66.7, others=null ✓
- bun_suppression_estimate: 7.8 ✓

Note: t=24 values differ from calc spec (28.4/37.9/41.4/45.7) as expected (Q1).

---

## LKID-25: Rate Limiting

### Changes in `backend/main.py`

1. `/predict` rate limit: `30/minute` → `10/minute` (LKID-25)
2. `/predict/pdf` rate limit: `10/minute` → `5/minute` (LKID-25)
3. 429 response code: `RATE_LIMIT_EXCEEDED` → `RATE_LIMIT` (per dispatch)
4. 429 message: updated to "Too many requests. Please wait before trying again."
5. Added `Retry-After` header to 429 response

`/auth/request-link` slot: NOT applied — Clerk-managed endpoint does not exist yet. Rate limiting hook is in place for future activation.

---

## main.py schema changes (LKID-14)

`PredictRequest` updated:
- `co2: Optional[float]` added (ge=5.0, le=40.0, mEq/L)
- `albumin: Optional[float]` added (ge=1.0, le=6.0, g/dL)
- `glucose` retained as legacy optional field (unused by engine)

`PredictResponse` updated:
- `bun_suppression_estimate: float` added

`predict_for_endpoint()` call updated to pass `co2=body.co2, albumin=body.albumin`.

---

## Test scaffold: `backend/tests/test_prediction_engine.py`

70 structural tests, all passing. Covers:
- TIME_POINTS shape (5 tests)
- CKD-EPI (6 tests)
- Output shape (7 tests)
- Baseline at t=0 (3 tests)
- Treatment >= no-treatment (5 tests)
- Tier ordering (3 tests)
- eGFR floor at 0 (5 tests)
- Dialysis threshold (5 tests)
- Optional modifiers (5 tests)
- BUN suppression estimate (6 tests)
- Confidence tier (7 tests)
- Backward compatibility (4 tests)
- Coefficient security (1 test)
- Vector shape validation (6 tests)

**Important for LKID-27 (Yuri + Gay Mark):** Tests deliberately avoid exact numeric assertions against the calc spec test vectors — those were generated with the simplified 0.31-coeff model and will NOT match v2.0 outputs (Q1). The `TestVectorShapeValidation` class has comments directing where to add golden-file assertions once Lee confirms the formula.

**Pre-existing conftest.py issue:** `conftest.py` imports `make_*` function names but `tests/fixtures/factories.py` exports `create_*` names. This causes `--noconftest` to be needed to run the engine tests. This is NOT my card — flagged for Gay Mark or Yuri to resolve (possibly LKID-27 scope).

---

## Files changed

| File | Change |
|------|--------|
| `backend/prediction/engine.py` | Full v2.0 rewrite (LKID-14) |
| `backend/main.py` | Rate limits, 429 body, new optional fields (LKID-25 + LKID-14) |
| `backend/tests/test_prediction_engine.py` | New — 70 structural tests (scaffold for LKID-27) |

*John Donaldson — 2026-03-30 — Sprint 3*
