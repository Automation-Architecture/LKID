# KidneyHood API Documentation

**Version:** 1.0.0
**Base URL:** `https://api.kidneyhood.org/api/v1`
**Author:** John Donaldson (API Designer)
**Date:** 2026-03-25
**Status:** Draft — Parallel Drafting Phase (Step 5)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Guest vs. Authenticated Behavior](#3-guest-vs-authenticated-behavior)
4. [Endpoints](#4-endpoints)
5. [Validation Rules](#5-validation-rules)
6. [Error Handling](#6-error-handling)
7. [Confidence Tiers](#7-confidence-tiers)
8. [Rate Limiting](#8-rate-limiting)
9. [CORS Policy](#9-cors-policy)
10. [DB Schema Alignment](#10-db-schema-alignment)
11. [Deferred Endpoints (Phase 2b+)](#11-deferred-endpoints)

---

## 1. Overview

The KidneyHood API is a RESTful service built on FastAPI/Python, serving the Next.js 15 frontend directly (no BFF layer, per Decision #7). It provides:

- **Magic link authentication** (Decision #1) — no passwords
- **Lab entry storage** for authenticated users (Decision #8)
- **eGFR trajectory prediction** for both guests and authenticated users (Decision #8)
- **HIPAA-compliant data handling** including audit logging (Decision #14)

All endpoints use JSON request/response bodies. All timestamps are UTC in ISO 8601 format. All IDs are UUIDs.

### Architecture: Separate Storage from Prediction (Decision #8)

The API separates data storage from prediction computation:

1. **`POST /lab-entries`** stores lab values (authenticated users only)
2. **`POST /predict`** runs the prediction engine (both guests and authenticated users)

This separation enables clean concerns: lab entries are persistent resources; predictions are stateless computations.

---

## 2. Authentication

### Magic Link Flow (Decision #1)

KidneyHood uses magic link authentication exclusively. There are no password fields, no registration endpoint, and no password reset flow.

**Flow:**

```
1. Patient enters email
   POST /auth/request-link { "email": "patient@example.com" }
   <- 200 { "message": "If an account exists...", "expires_in": 900 }

2. Patient clicks link in email (contains token)
   POST /auth/verify { "token": "<token_from_email>" }
   <- 200 { "access_token": "...", "refresh_token": "...", "user": {...} }

3. Patient uses access_token for authenticated requests
   GET /me
   Authorization: Bearer <access_token>

4. When access_token expires (1 hour), refresh it
   POST /auth/refresh { "refresh_token": "..." }
   <- 200 { "access_token": "...", "refresh_token": "...", "user": {...} }

5. Patient logs out
   POST /auth/logout
   Authorization: Bearer <access_token>
   <- 200 { "message": "Session invalidated successfully." }
```

**Security properties:**
- Magic link tokens are single-use and expire in 15 minutes
- Tokens are stored as hashes in the DB (`magic_link_tokens.token_hash`)
- Access tokens expire in 1 hour; refresh tokens are rotated on each use
- The response to `/auth/request-link` is intentionally identical whether the email exists or not (prevents email enumeration)
- If a guest `session_token` cookie is present during `/auth/verify`, guest data is migrated to the new account

### Token Storage (Frontend Guidance for Harshit)

- **Access token:** Store in memory (Zustand store). Do NOT put in localStorage.
- **Refresh token:** Store in memory or a secure httpOnly cookie (TBD with backend implementation).
- **Guest session_token:** Automatically set as httpOnly cookie by the server. Frontend does not need to manage it.

---

## 3. Guest vs. Authenticated Behavior

| Aspect | Guest | Authenticated |
|--------|-------|---------------|
| **Identity** | Anonymous; identified by httpOnly `session_token` cookie | Identified by JWT in Authorization header |
| **Data storage** | Server-side session, JSONB, 24hr TTL (Decision #4) | Persistent in `lab_entries` table |
| **Prediction** | `POST /predict` with inline `lab_entries[]` in body | `POST /predict` with `lab_entry_ids[]` referencing stored entries |
| **Lab entry CRUD** | Not available | Full CRUD via `/lab-entries` endpoints |
| **Data retention** | Purged after 24 hours by cron job | Persisted until user deletes entry or account |
| **HIPAA** | Full protections apply (Decision #4) | Full protections apply |
| **Rate limit** | 10 predictions/minute | 30 predictions/minute |
| **Account creation** | After viewing prediction, prompted to save via magic link | Already authenticated |
| **Data migration** | On magic link verify, guest session data migrates to account | N/A |

### Guest Session Lifecycle

```
1. Guest submits prediction form
   POST /predict { "lab_entries": [...] }
   <- Server sets httpOnly cookie: session_token=<uuid>
   <- Server stores lab data in guest_sessions table (JSONB, 24hr TTL)
   <- 200 { prediction response }

2. Guest views chart, decides to save
   POST /auth/request-link { "email": "..." }
   ...magic link flow...
   POST /auth/verify { "token": "..." }
   <- Server reads session_token from cookie
   <- Server parses guest_sessions JSONB, creates lab_entries rows
   <- Server deletes guest_sessions row
   <- Server clears session_token cookie
   <- 200 { ..., "guest_data_migrated": true }
```

---

## 4. Endpoints

### 4.1 Auth: Request Magic Link

```
POST /auth/request-link
```

**Request:**
```json
{
  "email": "patient@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account exists for this email, a magic link has been sent.",
  "expires_in": 900
}
```

**Notes:**
- If the email does not exist in the system, an account is auto-created
- Response is deliberately identical for existing/new accounts
- Rate limited: 3 requests per email per 15 minutes

---

### 4.2 Auth: Verify Token

```
POST /auth/verify
```

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123def456"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "rt_a1b2c3d4e5f67890abcdef1234567890",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "patient@example.com",
    "name": null,
    "date_of_birth": null,
    "sex": null,
    "created_at": "2026-03-25T10:00:00Z"
  },
  "guest_data_migrated": false
}
```

**Error (401):** Token expired, invalid, or already used.

---

### 4.3 Auth: Refresh Token

```
POST /auth/refresh
```

**Request:**
```json
{
  "refresh_token": "rt_a1b2c3d4e5f67890abcdef1234567890"
}
```

**Response (200):** Same shape as verify response with new token pair.

**Error (401):** Refresh token invalid or revoked.

---

### 4.4 Auth: Logout

```
POST /auth/logout
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Session invalidated successfully."
}
```

---

### 4.5 User: Get Profile

```
GET /me
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "patient@example.com",
  "name": "Jane Doe",
  "date_of_birth": "1968-05-15",
  "sex": "female",
  "height_cm": 165.0,
  "weight_kg": 68.0,
  "created_at": "2026-03-20T14:30:00Z",
  "updated_at": "2026-03-25T09:15:00Z",
  "lab_entry_count": 3
}
```

---

### 4.6 User: Delete Account (HIPAA Right to Delete)

```
DELETE /me
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Your account and all associated data have been permanently deleted."
}
```

**Behavior:**
- Deletes `users` row (CASCADE deletes all `lab_entries` and `magic_link_tokens`)
- Audit log entries are RETAINED with `user_id` set to NULL (ON DELETE SET NULL, Decision #14)
- This action is irreversible
- Session is invalidated

---

### 4.7 Lab Entries: Create

```
POST /lab-entries
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{
  "visit_date": "2026-03-15",
  "bun": 35.0,
  "creatinine": 1.80,
  "potassium": 4.5,
  "age_at_visit": 58,
  "sex": "male",
  "hemoglobin": 12.5,
  "glucose": 110.0,
  "egfr_override": null,
  "systolic_bp": 140,
  "sglt2_inhibitor": true,
  "upcr": 500.00,
  "upcr_unit": "mg_per_g",
  "ckd_diagnosis": "diabetic_nephropathy"
}
```

**Response (201):**
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "visit_date": "2026-03-15",
  "bun": 35.0,
  "creatinine": 1.80,
  "potassium": 4.5,
  "age_at_visit": 58,
  "sex": "male",
  "hemoglobin": 12.5,
  "glucose": 110.0,
  "egfr_override": null,
  "egfr_calculated": 38.2,
  "systolic_bp": 140,
  "sglt2_inhibitor": true,
  "upcr": 500.00,
  "upcr_unit": "mg_per_g",
  "ckd_diagnosis": "diabetic_nephropathy",
  "created_at": "2026-03-25T12:00:00Z",
  "updated_at": "2026-03-25T12:00:00Z"
}
```

**Notes:**
- `egfr_calculated` is computed server-side from creatinine, age_at_visit, and sex using CKD-EPI 2021
- `visit_date` cannot be in the future
- If `upcr` is provided, `upcr_unit` is required
- Location header returns the URL of the new resource

---

### 4.8 Lab Entries: List

```
GET /lab-entries?limit=50&offset=0
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "entries": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "visit_date": "2026-03-15",
      "bun": 35.0,
      "creatinine": 1.80,
      "potassium": 4.5,
      "age_at_visit": 58,
      "sex": "male",
      "hemoglobin": 12.5,
      "glucose": 110.0,
      "egfr_override": null,
      "egfr_calculated": 38.2,
      "systolic_bp": 140,
      "sglt2_inhibitor": true,
      "upcr": 500.00,
      "upcr_unit": "mg_per_g",
      "ckd_diagnosis": "diabetic_nephropathy",
      "created_at": "2026-03-25T12:00:00Z",
      "updated_at": "2026-03-25T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

**Notes:**
- Ordered by `visit_date` descending (most recent first)
- Only returns entries belonging to the authenticated user

---

### 4.9 Lab Entries: Get Single

```
GET /lab-entries/{id}
Authorization: Bearer <access_token>
```

Returns a single `LabEntry` object. Returns 404 if entry does not exist or belongs to another user.

---

### 4.10 Lab Entries: Delete

```
DELETE /lab-entries/{id}
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Lab entry deleted successfully."
}
```

**Notes:**
- The deletion is logged in `audit_log`
- Returns 404 if entry does not exist or belongs to another user

---

### 4.11 Predict

```
POST /predict
Authorization: Bearer <access_token>  (optional — required only for lab_entry_ids mode)
Content-Type: application/json
```

**Authenticated user request:**
```json
{
  "lab_entry_ids": [
    "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    "c3d4e5f6-a7b8-9012-cdef-345678901234",
    "d4e5f6a7-b8c9-0123-defa-456789012345"
  ]
}
```

**Guest request:**
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

**Response (200) — Tier 2, single visit:**
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
  "dial_ages": {
    "none": 68,
    "bun24": null,
    "bun17": null,
    "bun12": null
  },
  "slope": null,
  "slope_description": null,
  "visit_count": 1,
  "created_at": "2026-03-25T12:00:00Z"
}
```

**Response (200) — Tier 3, 3 visits with slope:**
```json
{
  "egfr_calculated": 38,
  "confidence_tier": 3,
  "unlock_prompt": null,
  "trajectories": {
    "none": [38, 36, 34, 32, 30, 27, 24, 19, 16, 13, 11, 10, 9, 8, 7],
    "bun24": [38, 37, 37, 36, 36, 35, 35, 34, 33, 33, 32, 32, 31, 31, 30],
    "bun17": [38, 38, 39, 40, 41, 42, 44, 46, 48, 49, 50, 51, 51, 52, 52],
    "bun12": [38, 39, 41, 43, 46, 49, 53, 58, 62, 65, 67, 68, 69, 70, 71]
  },
  "time_points_months": [0, 3, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120],
  "dial_ages": {
    "none": 68,
    "bun24": null,
    "bun17": null,
    "bun12": null
  },
  "slope": -3.2,
  "slope_description": "declining",
  "visit_count": 3,
  "created_at": "2026-03-25T12:00:00Z"
}
```

**Key behaviors:**
- You must provide EITHER `lab_entry_ids` OR `lab_entries`, never both (422 if both)
- `lab_entry_ids` requires Bearer auth (401 if missing)
- Guest inline data is stored in server-side session (httpOnly cookie set automatically)
- Results are NOT stored anywhere (Decision #10) — compute-on-demand
- Each trajectory array has exactly 15 values at the fixed time points
- `dial_ages` values are null when the trajectory does not reach the dialysis threshold (eGFR 12) within 10 years

---

### 4.12 Health Check

```
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-03-25T12:00:00Z"
}
```

No authentication required.

---

## 5. Validation Rules

All validation ranges are enforced at both the API layer (Pydantic) and the DB layer (CHECK constraints). These are the authoritative validation rules for the application.

### Required Fields

| Field | Type | Min | Max | Unit | DB Column | Pydantic Type |
|-------|------|-----|-----|------|-----------|---------------|
| `visit_date` | date | - | today | ISO 8601 | `lab_entries.visit_date` (DATE) | `datetime.date` |
| `bun` | number | 5 | 150 | mg/dL | `lab_entries.bun` (NUMERIC(5,1)) | `float` |
| `creatinine` | number | 0.3 | 15.0 | mg/dL | `lab_entries.creatinine` (NUMERIC(4,2)) | `float` |
| `potassium` | number | 2.0 | 8.0 | mEq/L | `lab_entries.potassium` (NUMERIC(3,1)) | `float` |
| `age_at_visit` | integer | 18 | 120 | years | `lab_entries.age_at_visit` (INTEGER) | `int` |
| `sex` | enum | - | - | - | `lab_entries.sex` via user | `Literal["male","female","unknown"]` |

### Optional Fields (Tier 2 unlock: BOTH hemoglobin AND glucose required)

| Field | Type | Min | Max | Unit | DB Column | Pydantic Type |
|-------|------|-----|-----|------|-----------|---------------|
| `hemoglobin` | number | 4.0 | 20.0 | g/dL | `lab_entries.hemoglobin` (NUMERIC(4,1)) | `Optional[float]` |
| `glucose` | number | 40 | 500 | mg/dL | `lab_entries.glucose` (NUMERIC(5,1)) | `Optional[float]` |
| `egfr_override` | number | 1 | 200 | mL/min/1.73m2 | `lab_entries.egfr_override` (NUMERIC(5,1)) | `Optional[float]` |

### Silently Collected Fields

| Field | Type | Min | Max | Unit | DB Column | Pydantic Type |
|-------|------|-----|-----|------|-----------|---------------|
| `systolic_bp` | integer | 60 | 300 | mmHg | `lab_entries.systolic_bp` (INTEGER) | `Optional[int]` |
| `sglt2_inhibitor` | boolean | - | - | - | `lab_entries.sglt2_inhibitor` (BOOLEAN) | `Optional[bool]` |
| `upcr` | number | 0 | - | - | `lab_entries.upcr` (NUMERIC(8,2)) | `Optional[float]` |
| `upcr_unit` | enum | - | - | - | `lab_entries.upcr_unit` (VARCHAR(10)) | `Optional[Literal["mg_per_g","mg_per_mg"]]` |
| `ckd_diagnosis` | enum | - | - | - | `lab_entries.ckd_diagnosis` (VARCHAR(30)) | `Optional[Literal[...]]` |

### Cross-Field Rules

1. If `upcr` is provided, `upcr_unit` is required
2. `visit_date` cannot be in the future
3. Sex is always required (Decision #3)
4. Tier 2 confidence requires BOTH `hemoglobin` AND `glucose` to be non-null (Decision #12)
5. Tier 3 confidence requires Tier 2 + 3 or more distinct visit dates

---

## 6. Error Handling

### Error Response Envelope (Decision #9)

Every 4xx and 5xx response uses this exact structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the problem.",
    "details": [
      {
        "field": "bun",
        "message": "BUN must be between 5 and 150 mg/dL."
      }
    ]
  }
}
```

### Error Codes

| HTTP Status | Error Code | When Used |
|-------------|-----------|-----------|
| 400 | `VALIDATION_ERROR` | Request body fails validation (missing required field, out-of-range value) |
| 401 | `UNAUTHENTICATED` | No valid Bearer token for an endpoint that requires auth |
| 401 | `INVALID_TOKEN` | Magic link token is expired, invalid, or already used |
| 401 | `INVALID_REFRESH_TOKEN` | Refresh token is invalid or revoked |
| 403 | `FORBIDDEN` | Authenticated but not authorized (e.g., accessing another user's data) |
| 404 | `NOT_FOUND` | Resource does not exist or does not belong to the requesting user |
| 422 | `UNPROCESSABLE_ENTITY` | Structurally valid JSON but semantically invalid (e.g., future visit_date, both lab_entry_ids and lab_entries provided) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests in the rate limit window |
| 500 | `INTERNAL_ERROR` | Unexpected server error (prediction engine failure, DB error) |

### Frontend Error Mapping (Guidance for Harshit)

For `VALIDATION_ERROR` responses, map `details[].field` to form field names:

```typescript
// Example: mapping API errors to form fields
type ApiErrorDetail = { field: string; message: string };

function mapApiErrorsToForm(details: ApiErrorDetail[]) {
  const fieldErrors: Record<string, string> = {};
  for (const detail of details) {
    // Strip array notation for nested fields: "lab_entries[0].bun" -> "bun"
    const fieldName = detail.field.replace(/^lab_entries\[\d+\]\./, '');
    fieldErrors[fieldName] = detail.message;
  }
  return fieldErrors;
}
```

---

## 7. Confidence Tiers

### Tier Rules (Decision #12)

| Tier | Badge | Requirements | unlock_prompt |
|------|-------|-------------|---------------|
| 1 | Low confidence | Required fields only: BUN, creatinine, potassium, age, sex | "Add hemoglobin and glucose results to sharpen your estimate." |
| 2 | Medium confidence | Tier 1 + BOTH hemoglobin AND glucose | "Add 2 more visit dates to unlock trend analysis." (varies by visit count) |
| 3 | High confidence | Tier 2 + 3 or more visit dates | `null` (no prompt) |

### Important: Tier 2 requires BOTH fields

Adding hemoglobin alone does NOT upgrade to Tier 2. Adding glucose alone does NOT upgrade to Tier 2. Both must be present. This is a binding decision from Meeting 1 (Decision #12).

### Slope Behavior by Visit Count

| Visit Count | slope | slope_description | Display |
|-------------|-------|-------------------|---------|
| 1 | `null` | `null` | No trend data shown |
| 2 | `null` | `"improving"`, `"stable"`, or `"declining"` | Directional tag only (no numeric slope) |
| 3+ | numeric (e.g., `-3.2`) | `"improving"`, `"stable"`, or `"declining"` | Full slope tag with numeric value |

### Slope Categories

- `slope > 0` -> `"improving"`
- `slope == 0` -> `"stable"`
- `slope < 0` -> `"declining"`

---

## 8. Rate Limiting

### Limits by Endpoint and Auth Status

| Endpoint | Guest | Authenticated |
|----------|-------|---------------|
| `POST /auth/request-link` | 3 per email per 15 min | N/A |
| `POST /predict` | 10 per minute | 30 per minute |
| All other endpoints | N/A | 60 per minute |

### Rate Limit Headers

Every response includes:
- `X-RateLimit-Remaining`: requests remaining in current window
- `Retry-After`: seconds until window resets (present on 429 responses or when approaching limit)

### 429 Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": []
  }
}
```

---

## 9. CORS Policy

Since the frontend calls the API directly (Decision #7, no BFF), CORS must be configured:

```python
# FastAPI CORS configuration
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kidneyhood.org",
        "https://www.kidneyhood.org",
        "https://staging.kidneyhood.org",
        "http://localhost:3000",  # Next.js dev server
    ],
    allow_credentials=True,  # Required for httpOnly cookie (guest session_token)
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-RateLimit-Remaining", "Retry-After"],
)
```

**Key points:**
- `allow_credentials=True` is required for the httpOnly `session_token` cookie to be sent cross-origin
- Only GET, POST, DELETE, and OPTIONS are needed (no PUT/PATCH in MVP)
- Rate limit headers are exposed so the frontend can read them

---

## 10. DB Schema Alignment

This section documents the mapping between API field names and Gay Mark's DB schema to ensure no transformation mismatches.

### users table -> UserProfile schema

| DB Column | API Field | Type Mapping |
|-----------|-----------|-------------|
| `users.id` | `id` | UUID -> string (uuid format) |
| `users.email` | `email` | VARCHAR(255) -> string (email format) |
| `users.name` | `name` | VARCHAR(255) -> string or null |
| `users.date_of_birth` | `date_of_birth` | DATE -> string (date format) or null |
| `users.sex` | `sex` | VARCHAR(10) CHECK -> enum or null |
| `users.height_cm` | `height_cm` | NUMERIC(5,1) -> number or null |
| `users.weight_kg` | `weight_kg` | NUMERIC(5,1) -> number or null |
| `users.created_at` | `created_at` | TIMESTAMPTZ -> string (date-time) |
| `users.updated_at` | `updated_at` | TIMESTAMPTZ -> string (date-time) or null |

### lab_entries table -> LabEntry schema

| DB Column | API Field | Type Mapping |
|-----------|-----------|-------------|
| `lab_entries.id` | `id` | UUID -> string (uuid format) |
| `lab_entries.user_id` | `user_id` | UUID -> string (uuid format) |
| `lab_entries.visit_date` | `visit_date` | DATE -> string (date format) |
| `lab_entries.bun` | `bun` | NUMERIC(5,1) CHECK 5-150 -> number min:5 max:150 |
| `lab_entries.creatinine` | `creatinine` | NUMERIC(4,2) CHECK 0.3-15.0 -> number min:0.3 max:15.0 |
| `lab_entries.potassium` | `potassium` | NUMERIC(3,1) CHECK 2.0-8.0 -> number min:2.0 max:8.0 |
| `lab_entries.age_at_visit` | `age_at_visit` | INTEGER CHECK 18-120 -> integer min:18 max:120 |
| `lab_entries.hemoglobin` | `hemoglobin` | NUMERIC(4,1) CHECK 4.0-20.0 -> number or null |
| `lab_entries.glucose` | `glucose` | NUMERIC(5,1) CHECK 40-500 -> number or null |
| `lab_entries.egfr_override` | `egfr_override` | NUMERIC(5,1) -> number or null |
| `lab_entries.systolic_bp` | `systolic_bp` | INTEGER CHECK 60-300 -> integer or null |
| `lab_entries.sglt2_inhibitor` | `sglt2_inhibitor` | BOOLEAN -> boolean or null |
| `lab_entries.upcr` | `upcr` | NUMERIC(8,2) -> number or null |
| `lab_entries.upcr_unit` | `upcr_unit` | VARCHAR(10) CHECK -> enum or null |
| `lab_entries.ckd_diagnosis` | `ckd_diagnosis` | VARCHAR(30) CHECK -> enum or null |
| `lab_entries.created_at` | `created_at` | TIMESTAMPTZ -> string (date-time) |
| `lab_entries.updated_at` | `updated_at` | TIMESTAMPTZ -> string (date-time) |

**Note:** `egfr_calculated` is NOT stored in Gay Mark's current schema draft. It is computed server-side by the API layer. If we want to cache it, Gay Mark needs to add a column. This is an open alignment item.

### guest_sessions table

| DB Column | API Interaction |
|-----------|----------------|
| `guest_sessions.id` | Internal only |
| `guest_sessions.session_token` | httpOnly cookie (never in API response body) |
| `guest_sessions.lab_data` | JSONB — same shape as InlineLabEntry schema |
| `guest_sessions.created_at` | Internal only |
| `guest_sessions.expires_at` | 24hr TTL; purged by cron |

### audit_log table (Decision #14)

| DB Column | Relevance |
|-----------|-----------|
| `audit_log.user_id` | ON DELETE SET NULL — preserved after user deletion for HIPAA compliance |
| `audit_log.session_token` | Tracks guest session actions |
| `audit_log.action` | e.g., "lab_entry.create", "lab_entry.delete", "user.delete", "auth.verify" |
| `audit_log.resource_type` | e.g., "lab_entry", "user", "guest_session" |
| `audit_log.resource_id` | UUID of the affected resource |

---

## 11. Deferred Endpoints (Phase 2b+)

These endpoints are NOT in the MVP contract per binding decisions:

| Endpoint | Deferred To | Decision |
|----------|-------------|----------|
| `GET /predictions/{id}/pdf` | Phase 2b | Decision #2 |
| `GET /predictions/{id}` | Removed (no prediction storage) | Decision #10 |

---

## Appendix A: Complete Endpoint Summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/request-link` | None | Send magic link email |
| POST | `/auth/verify` | None | Verify token, return JWT |
| POST | `/auth/refresh` | None | Refresh access token |
| POST | `/auth/logout` | Bearer | Invalidate session |
| GET | `/me` | Bearer | Get user profile |
| DELETE | `/me` | Bearer | Delete account (HIPAA) |
| POST | `/lab-entries` | Bearer | Create lab entry |
| GET | `/lab-entries` | Bearer | List lab entries |
| GET | `/lab-entries/{id}` | Bearer | Get single lab entry |
| DELETE | `/lab-entries/{id}` | Bearer | Delete lab entry |
| POST | `/predict` | None/Bearer/Cookie | Run prediction |
| GET | `/health` | None | Health check |

**Total MVP endpoints: 12**

---

## Appendix B: Decisions Referenced

| # | Decision | Impact on API |
|---|----------|--------------|
| 1 | Magic link auth only | Auth endpoint design, no password fields |
| 2 | PDF deferred to Phase 2b | No PDF endpoint in MVP |
| 3 | Sex field required, enum: male/female/unknown | Schema validation |
| 4 | Guest data: server-side, 24hr TTL, httpOnly cookie | Guest session flow |
| 7 | No BFF — FE calls API directly | CORS configuration |
| 8 | Separate storage (POST /lab-entries) from prediction (POST /predict) | Endpoint architecture |
| 9 | Error envelope: {error: {code, message, details[]}} | All error responses |
| 10 | No prediction result storage | No GET /predictions endpoint |
| 12 | Tier 2 requires BOTH hemoglobin AND glucose | Confidence tier logic |
| 14 | Audit log: ON DELETE SET NULL | DELETE endpoint behavior |
