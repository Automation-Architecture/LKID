# KidneyHood API Contract Summary

**Version:** 1.0.0
**Base URL:** `https://api.kidneyhood.org/api/v1`
**Author:** John Donaldson (API Designer)
**Date:** 2026-03-25
**Status:** Draft — Parallel Drafting Phase (Step 5)
**Full Spec:** `api_contract.json` (OpenAPI 3.1)

---

## 1. Endpoint Inventory

| # | Method | Path | Summary | Auth | Success |
|---|--------|------|---------|------|---------|
| 1 | POST | `/auth/request-link` | Send magic link email | None | 200 |
| 2 | POST | `/auth/verify` | Validate magic link token, create session | None | 200 |
| 3 | POST | `/auth/refresh` | Refresh access token (rotation) | None* | 200 |
| 4 | POST | `/auth/logout` | Invalidate session | Bearer | 200 |
| 5 | GET | `/me` | Get current user profile | Bearer | 200 |
| 6 | DELETE | `/me` | Delete account + all data (HIPAA) | Bearer | 200 |
| 7 | POST | `/lab-entries` | Store new lab entry | Bearer | 201 |
| 8 | GET | `/lab-entries` | List all lab entries (paginated) | Bearer | 200 |
| 9 | GET | `/lab-entries/{id}` | Get single lab entry | Bearer | 200 |
| 10 | DELETE | `/lab-entries/{id}` | Delete lab entry (audit SET NULL) | Bearer | 200 |
| 11 | POST | `/predict` | Run eGFR trajectory prediction | None/Bearer/Cookie | 200 |
| 12 | GET | `/health` | Health check | None | 200 |

*Refresh token is sent in the request body, not as a Bearer header.

**Total endpoints:** 12
**Deferred (Phase 2b+):** PDF export endpoint

---

## 2. Authentication

### Magic Link Flow (Decision #1)
1. Client sends email to `POST /auth/request-link`
2. Server emails magic link (15 min TTL, single-use)
3. Client sends token to `POST /auth/verify`
4. Server returns JWT access token (1 hr) + refresh token (rotation)
5. Client includes `Authorization: Bearer {token}` on protected endpoints

### Guest Sessions (Decision #4)
- On first guest `POST /predict`, server sets an httpOnly `session_token` cookie
- 24hr TTL, server-side storage
- Guest data migrated on auth verification if cookie present
- Full HIPAA protections apply

### Security Schemes
| Scheme | Type | Location | Used By |
|--------|------|----------|---------|
| BearerAuth | HTTP Bearer (JWT) | Authorization header | All protected endpoints |
| GuestSession | API Key | Cookie (`session_token`) | POST /predict (guests) |

---

## 3. Lab Entry Fields

### Required Fields
| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `visit_date` | date | not future | Date of lab visit |
| `bun` | number | 5-150 | Blood Urea Nitrogen (mg/dL) |
| `creatinine` | number | 0.3-15.0 | Serum creatinine (mg/dL) |
| `potassium` | number | 2.0-8.0 | Serum potassium (mEq/L) |
| `age_at_visit` | integer | 18-120 | Patient age at visit |
| `sex` | enum | male/female/unknown | Biological sex (Decision #3) |

### Optional Fields (Tier 2 unlock)
| Field | Type | Range | Notes |
|-------|------|-------|-------|
| `hemoglobin` | number | 4.0-20.0 | Required with glucose for Tier 2 (Decision #12) |
| `glucose` | number | 40-500 | Required with hemoglobin for Tier 2 (Decision #12) |

### Optional Fields (Additional)
| Field | Type | Description |
|-------|------|-------------|
| `egfr_override` | number (1-200) | Patient-provided eGFR, bypasses CKD-EPI calc |
| `phosphorus` | number | Serum phosphorus (mg/dL) |
| `albumin` | number | Serum albumin (g/dL) |
| `bicarbonate` | number | Serum bicarbonate (mEq/L) |
| `uric_acid` | number | Serum uric acid (mg/dL) |
| `bp_systolic` | integer (60-300) | Systolic blood pressure (mmHg) |
| `bp_diastolic` | integer | Diastolic blood pressure (mmHg) |
| `bp_on_medication` | boolean | Whether on BP medication |
| `hba1c` | number | HbA1c percentage |
| `calcium` | number | Serum calcium (mg/dL) |
| `upcr` | number (>=0) | Urine protein-to-creatinine ratio |
| `upcr_unit` | enum | `mg_per_g` or `mg_per_mg` (required if upcr provided) |
| `diagnosis_stage` | string | CKD stage (e.g., "3a", "3b", "4") |
| `height_inches` | number | Patient height in inches |
| `weight_lbs` | number | Patient weight in pounds |

### Server-Generated Fields (on stored LabEntry)
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Lab entry ID |
| `user_id` | UUID | Owning user ID |
| `egfr_calculated` | number | CKD-EPI 2021 result |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last update timestamp |

---

## 4. Prediction (POST /predict)

### Two Modes (Decision #8)

**Authenticated:** Send `lab_entry_ids` (array of UUIDs) referencing stored entries.

**Guest:** Send `lab_entries` (array of inline lab data). Server stores in session with httpOnly cookie (24hr TTL).

Cannot send both. Must send exactly one.

### Confidence Tiers (Decision #12)
| Tier | Criteria | unlock_prompt |
|------|----------|---------------|
| 1 | Required fields only | "Add hemoglobin and glucose results to sharpen your estimate." |
| 2 | Tier 1 + BOTH hemoglobin AND glucose | "Add 2 more visit dates to unlock trend analysis." |
| 3 | Tier 2 + 3 or more visits | null |

### Response Shape
```json
{
  "egfr_calculated": 38,
  "confidence_tier": 2,
  "unlock_prompt": "Add 2 more visit dates to unlock trend analysis.",
  "trajectories": {
    "none":  [15 eGFR values],
    "bun24": [15 eGFR values],
    "bun17": [15 eGFR values],
    "bun12": [15 eGFR values]
  },
  "time_points_months": [0,3,6,9,12,18,24,36,48,60,72,84,96,108,120],
  "dial_ages": { "none": 68, "bun24": null, "bun17": null, "bun12": null },
  "slope": -3.2,
  "slope_description": "declining",
  "visit_count": 3,
  "created_at": "2026-03-25T12:00:00Z"
}
```

- `trajectories`: 4 lines x 15 points (months 0-120)
- `dial_ages`: predicted age at dialysis threshold (eGFR=12), null if not reached in 10 years
- `slope`/`slope_description`: only populated with 3+ visits
- Results are NOT stored (Decision #10)

---

## 5. Error Handling (Decision #9)

### Error Envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [
      { "field": "bun", "message": "BUN must be between 5 and 150 mg/dL." }
    ]
  }
}
```

### Error Codes
| HTTP | Code | When |
|------|------|------|
| 400 | VALIDATION_ERROR | Field validation failure |
| 401 | UNAUTHENTICATED | No/invalid auth token |
| 401 | INVALID_TOKEN | Magic link expired or used |
| 401 | INVALID_REFRESH_TOKEN | Refresh token invalid/revoked |
| 403 | FORBIDDEN | Action not permitted |
| 404 | NOT_FOUND | Resource not found or not owned |
| 422 | UNPROCESSABLE_ENTITY | Structurally valid but semantically invalid |
| 429 | RATE_LIMIT_EXCEEDED | Rate limit hit |
| 500 | INTERNAL_ERROR | Server failure |

---

## 6. Rate Limiting

All rate-limited responses include:
- `X-RateLimit-Remaining` header (requests left in window)
- `Retry-After` header (seconds until reset, on 429s)

| Endpoint | Guest Limit | Auth Limit |
|----------|-------------|------------|
| POST /auth/request-link | 3/email/15min | N/A |
| POST /predict | 10/min | 30/min |

---

## 7. CORS Policy (Decision #7)

No BFF -- frontend calls API directly. CORS configured as:

| Setting | Value |
|---------|-------|
| Allowed Origins | `kidneyhood.org`, `www.kidneyhood.org`, `staging.kidneyhood.org`, `localhost:3000` |
| Allowed Methods | GET, POST, DELETE, OPTIONS |
| Allowed Headers | Authorization, Content-Type, Accept, X-Request-ID |
| Exposed Headers | X-RateLimit-Remaining, Retry-After |
| Credentials | true (required for httpOnly session cookie) |
| Preflight Cache | 3600 seconds |

---

## 8. Pagination (GET /lab-entries)

Query parameters:
- `limit` (1-100, default 50)
- `offset` (>=0, default 0)

Response wrapper:
```json
{
  "entries": [...],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

---

## 9. Audit & Data Deletion (Decision #14)

- `DELETE /me` removes user + all lab entries + magic link tokens
- Audit log records are retained with `user_id` set to NULL (ON DELETE SET NULL)
- `DELETE /lab-entries/{id}` creates an audit record; audit `user_id` preserved until account deletion

---

## 10. Meeting 1 Decision Traceability

| Decision | Where Applied |
|----------|---------------|
| #1 Magic link auth only | Auth endpoints (no password fields) |
| #3 Sex field: male/female/unknown | SexEnum schema, LabEntryBase.sex |
| #4 Guest data: server-side httpOnly cookie, 24hr TTL | GuestSession security scheme, POST /predict |
| #7 No BFF, FE calls API directly | x-cors-policy, server URLs |
| #8 POST /lab-entries stores, POST /predict reads/accepts inline | Separate endpoints, PredictRequest oneOf |
| #9 Error envelope | ErrorResponse schema |
| #10 No prediction storage | POST /predict returns but does not persist |
| #12 Tier 2: BOTH hemoglobin AND glucose | PredictionResponse.confidence_tier, unlock_prompt |
| #14 Audit log: ON DELETE SET NULL | DELETE /me description |
| PDF deferred to Phase 2b | No PDF endpoint in spec |

---

## 11. For Harshit (Frontend Developer)

The full OpenAPI 3.1 spec (`api_contract.json`) includes example responses for every endpoint and every error case. Use these examples to build frontend mocks during parallel development. Key points:

1. **All IDs are UUIDs** -- use the example UUIDs from the spec for consistent mocks
2. **Auth flow** returns `AuthTokenResponse` with embedded `UserProfile`
3. **Lab entry list** uses `{ entries: [...], total, limit, offset }` wrapper
4. **Predict** response always has 4 trajectory arrays of exactly 15 values each
5. **Errors** always follow the `{ error: { code, message, details } }` envelope
6. **Guest predict** will set a `session_token` cookie -- ensure `credentials: 'include'` on fetch
7. **CORS**: allowed origins include `localhost:3000` for local dev
