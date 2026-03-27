# DISPATCH: Sprint 2 Backend — John Donaldson

**Date:** 2026-03-27
**From:** Luca (CTO / Orchestrator)
**To:** John Donaldson (API Designer / Backend Developer)
**Sprint:** Sprint 2 — Core Flow (Mar 26 -- Apr 2)

---

## Status Summary

PR #11 (feat/LKID-8-fastapi-scaffold) has been merged. You have one verification task and one HIGH-priority implementation task. LKID-14 (rules engine) remains blocked on Lee's 5 formula answers — do NOT wait on that. Build everything you can around it.

---

## Task 1: LKID-12 / LKID-13 — Verify FastAPI Scaffold + Health Endpoint

**Cards:** LKID-12, LKID-13
**Priority:** MEDIUM — verification only, should be quick
**Status:** PR #11 was merged. Verify the work is complete.

### What to Verify

1. FastAPI scaffold in `backend/` is functional — `main.py` runs, dependencies install from `requirements.txt`
2. `GET /health` endpoint returns the expected response:
   ```json
   {
     "status": "healthy",
     "version": "1.0.0",
     "database": "connected",
     "timestamp": "2026-03-27T12:00:00Z"
   }
   ```
3. CORS middleware is configured per your API docs (Section 9) — allows the frontend origin, credentials, and rate limit headers
4. Railway deployment config is in place (`railway.toml`, `Procfile`)

### If Already Complete

Confirm the work is complete. Husser will handle the Jira transition, but you should verify there are no gaps before moving to Task 2.

### If Gaps Exist

Fix them on a new branch (`fix/LKID-12-scaffold-gaps` or similar). Keep it small and focused.

---

## Task 2: LKID-15 — Implement POST /predict Endpoint

**Card:** LKID-15
**Priority:** HIGH — Harshit needs this contract to wire the frontend form and chart
**Branch:** `feat/LKID-15-post-predict`

### What to Build

Implement the `POST /predict` endpoint with the full request/response contract. The prediction math will use placeholder logic for now (the full rules engine is blocked on LKID-14), but the endpoint shape, validation, error handling, and basic eGFR calculation must be production-ready.

### Request Schema

**Guest request (inline lab data):**
```json
{
  "lab_entries": [
    {
      "visit_date": "2026-03-25",
      "bun": 35.0,
      "creatinine": 1.80,
      "potassium": 4.5,
      "age_at_visit": 58,
      "sex": "male",
      "hemoglobin": 12.5,
      "glucose": 110.0,
      "systolic_bp": 140,
      "sglt2_inhibitor": true,
      "upcr": 500.00,
      "upcr_unit": "mg_per_g",
      "ckd_diagnosis": "diabetic_nephropathy"
    }
  ]
}
```

**Authenticated request (stored entry IDs):**
```json
{
  "lab_entry_ids": ["uuid1", "uuid2"]
}
```

**Validation rules:** Must provide EITHER `lab_entry_ids` OR `lab_entries`, never both (422 if both). `lab_entry_ids` requires Bearer auth (401 if missing).

### Response Schema

```json
{
  "egfr_calculated": 38,
  "confidence_tier": 2,
  "unlock_prompt": "Add 2 more visit dates to unlock trend analysis.",
  "trajectories": {
    "none": [38, 36, 34, 32, 30, 27, 24, 19, 16, 13, 11, 10, 9, 8, 7],
    "bun24": [38, 37, 37, 36, 36, 35, 35, 34, 33, 33, 32, 32, 31, 31, 30],
    "bun17": [38, 38, 39, 40, 41, 42, 44, 46, 48, 49, 50, 51, 51, 52, 52],
    "bun12": [38, 39, 41, 43, 46, 49, 53, 58, 62, 65, 67, 68, 69, 70, 71]
  },
  "time_points_months": [0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  "dial_ages": { "none": 68, "bun24": null, "bun17": null, "bun12": null },
  "slope": null,
  "slope_description": null,
  "visit_count": 1,
  "created_at": "2026-03-27T12:00:00Z"
}
```

### Implementation Approach

1. **Build the endpoint structure NOW** — Pydantic request/response models, route handler, validation, error responses
2. **Implement CKD-EPI 2021 eGFR calculation** — this formula is known and not blocked:
   - Female: 142 x min(Scr/0.7, 1)^-0.241 x max(Scr/0.7, 1)^-1.200 x 0.9938^Age x 1.012
   - Male: 142 x min(Scr/0.8, 1)^-0.302 x max(Scr/0.8, 1)^-1.200 x 0.9938^Age
3. **Use placeholder trajectory logic** — generate realistic-looking trajectory arrays that respond to input values directionally. The exact coefficients will come from LKID-14 when Lee responds.
4. **Implement confidence tier logic** per Decision #12:
   - Tier 1: Required fields only
   - Tier 2: Tier 1 + BOTH hemoglobin AND glucose
   - Tier 3: Tier 2 + 3 or more visit dates
5. **Error handling** — use your approved error envelope (Decision #9) for all 4xx/5xx responses

### Security Constraints

- Engine coefficients must NEVER be exposed to the client
- Engine coefficients must NEVER be logged
- Engine coefficients must NEVER appear in error responses
- All prediction computation is server-side only

### Existing Code to Extend

The prediction engine stub is already at `backend/prediction/engine.py`. Extend it rather than starting from scratch. Also reference:

- Your API contract: `agents/john_donaldson/drafts/api_contract.json`
- Your finalized formulas: `agents/john_donaldson/drafts/finalized-formulas.md`
- Your API docs: `agents/john_donaldson/drafts/api_docs.md` (Sections 4.11, 5, 6, 7)
- Existing backend scaffold: `backend/main.py`, `backend/requirements.txt`

### Acceptance Criteria

1. `POST /predict` accepts both guest (inline) and authenticated (entry IDs) request shapes
2. Returns 422 if both `lab_entry_ids` and `lab_entries` are provided
3. Returns 401 if `lab_entry_ids` used without Bearer auth
4. Pydantic validation enforces all field ranges (BUN 5--150, creatinine 0.3--15.0, potassium 2.0--8.0, age 18--120, etc.)
5. Validation errors use the approved error envelope: `{error: {code, message, details[{field, message}]}}`
6. Response includes all fields: `egfr_calculated`, `confidence_tier`, `unlock_prompt`, `trajectories` (4 arrays x 15 points), `time_points_months`, `dial_ages`, `slope`, `slope_description`, `visit_count`, `created_at`
7. CKD-EPI 2021 eGFR calculation is correct for both male and female
8. Confidence tier logic correctly requires BOTH hemoglobin AND glucose for Tier 2
9. No engine coefficients leak in responses or logs

---

## Coordination Notes

- **LKID-14 (rules engine)** remains blocked on Lee's 5 formula answers. Do NOT wait. Build the endpoint structure, validation, eGFR calculation, and placeholder trajectories. When Lee responds, the coefficients slot into the existing engine.
- **Harshit** is building the prediction form (LKID-16) and chart (LKID-19) against mock data shaped to your API contract. The response shape above is what he is mocking. When your endpoint is live, frontend integration should be a clean swap.
- **Gay Mark** owns LKID-10 (leads table). If you need DB access for LKID-11 (leads table write on prediction), coordinate with him. That dependency flows through LKID-10 which Gay Mark owns.
- **Yuri** will write API integration tests against your endpoint. Ensure your Pydantic models are well-documented so he can generate test cases.

---

*Dispatched by Luca — 2026-03-27*
