# John Donaldson — API Designer

## Meeting 1 Decisions

**Date:** 2026-03-25 | **Meeting:** Discovery Phase, Meeting 1

All 14 decisions below are **binding** per Luca (CTO/Orchestrator).

| # | Decision | API Impact |
|---|----------|------------|
| 1 | **Auth: Magic link only.** Endpoints: POST /auth/request-link, POST /auth/verify, POST /auth/refresh, POST /auth/logout. No password endpoints. | MAJOR — removes register/login/reset, no password storage |
| 2 | **MVP Scope: PDF DEFERRED to Phase 2b.** Remove PDF endpoint from MVP contract. | Removes `GET /predictions/{id}/pdf` from MVP |
| 3 | **Sex field: Required.** Enum: `"male"`, `"female"`, `"unknown"`. | Schema update — sex is required, enum validated |
| 4 | **Guest data: Server-side, 24hr TTL.** Guest session token in httpOnly cookie. | Cookie-based guest auth, server-side storage |
| 5 | X-axis: True linear time scale. | No API impact |
| 6 | Charting library: Visx. | No API impact |
| 7 | **Frontend: shadcn/ui + Tailwind + Zustand + TanStack Query. No BFF — FE calls API directly.** CORS config needed. | Must define CORS policy in contract |
| 8 | **Predict endpoint: Option C approved.** POST /lab-entries stores. POST /predict reads from stored (auth) or accepts inline (guest). | Confirms my recommended architecture |
| 9 | **Error response: My envelope approved.** `{error: {code, message, details[]}}` | Standardized across all endpoints |
| 10 | **No prediction result storage.** Remove predictions GET endpoint from MVP. Keep predict POST. | Removes `GET /predictions/{id}` from MVP |
| 11 | Disclaimer mobile: Sticky footer. | No API impact |
| 12 | **Tier transitions: Both hemoglobin AND glucose for Tier 2.** | Affects confidence_tier logic documentation |
| 13 | Test vectors from Lee. | No API impact — informs mock responses |
| 14 | **Audit log: ON DELETE SET NULL.** | Affects DELETE endpoint behavior documentation |

---

## Post-Meeting Action Items

1. **Finalize OpenAPI 3.1 contract** during parallel drafting phase (Step 5 of SOP)
   - Write to `/agents/john_donaldson/drafts/api_contract.json`
   - Incorporate all 14 binding decisions
   - Include example responses for every endpoint (Harshit needs these for mocks)
2. **Define CORS policy** — allowed origins, methods, headers for direct FE-to-API calls
3. **Document guest session flow** — httpOnly cookie lifecycle, 24hr TTL, server-side cleanup
4. **Align with Gay Mark** on DB schema field names before publishing contract
5. **Document Tier 2 unlock criteria** — hemoglobin AND glucose both required (Decision 12)
6. **Add audit log behavior to DELETE endpoints** — ON DELETE SET NULL semantics (Decision 14)
7. **Prepare mock response data** using Lee's test vectors (Decision 13) once available

---

## 1. Role and Deliverables

I am the API Designer for the KidneyHood project. My primary deliverable is the **API contract** (`/artifacts/api_contract.json`) — an OpenAPI 3.1 specification that serves as the binding interface between the Next.js 15 frontend and the FastAPI/Python backend.

### Deliverables

1. **OpenAPI 3.1 Specification** — Complete endpoint definitions with request/response schemas, published as JSON
2. **Authentication Flow Design** — Magic link auth endpoints, session management, guest mode token lifecycle
3. **Request/Response Schemas** — Pydantic-compatible JSON schemas for every endpoint
4. **Error Handling Contract** — Standardized error response format (APPROVED — Decision 9)
5. **API Versioning Strategy** — Path-based versioning (`/api/v1/`) with migration guidance
6. **Mock Server Specification** — Enough detail for Harshit to build against mocks from day one
7. **CORS Policy** — Origins, methods, headers for direct FE-to-API communication (Decision 7)

---

## 2. Role Boundaries

### I own
- Endpoint design (paths, methods, query parameters, headers)
- Request/response payload schemas
- Authentication and authorization flow at the API layer
- Error response structure and HTTP status codes
- API versioning approach
- Rate limiting and throttling specifications
- CORS policy definition

### I do NOT own
- Frontend implementation or component architecture (Harshit)
- Database table design, migrations, or SQL (Gay Mark)
- UX flows or wireframes (Inga)
- Product scope or acceptance criteria (Husser)
- Test implementation (Yuri)
- Infrastructure or deployment (Luca)
- The proprietary rules engine / prediction calculation logic (external — Lee's IP)

### Gray areas requiring alignment
- **eGFR calculation placement**: The spec says the server computes `egfr_calculated` from creatinine, age, and sex using the CKD-EPI formula. I design the contract interface; Gay Mark and the backend own the implementation. I need to confirm: does the prediction engine run as a separate internal service, or is it embedded in FastAPI route handlers? This affects whether I model it as a single endpoint or an internal service call.
- **Klaviyo integration**: The proposal mentions automatic Klaviyo email sequences on submission. I need to know if this is an API-triggered webhook or a backend-side event. If API-triggered, I need an endpoint or event contract.

### Resolved gray areas
- ~~**PDF generation**~~: DEFERRED to Phase 2b (Decision 2). Not in MVP contract.

---

## 3. Dependencies I Have on Other Agents

### From Gay Mark (Database Engineer)
- **Database schema** — I need the `users`, `lab_entries`, and `guest_sessions` table definitions to align API response shapes with stored data structures. Specifically:
  - Column names and types for `lab_entries` (maps directly to my request/response fields)
  - User model fields (what `GET /me` returns)
  - Guest session token format and storage approach (Decision 4: server-side, httpOnly cookie, 24hr TTL)
  - Multi-visit data model (how `visit_date` links to `lab_entries`)
  - Audit log table structure with ON DELETE SET NULL behavior (Decision 14)
- **Priority**: HIGH — schema misalignment between API contract and DB is the #1 integration risk

### From Husser (Product Manager)
- ~~**Issue #1**: Sex field enum values~~ — RESOLVED: `"male"`, `"female"`, `"unknown"` (Decision 3)
- ~~**Issue #4**: Multi-visit data flow~~ — RESOLVED: Option C — store then predict (Decision 8)
- ~~**Issue #8**: Authentication mechanism~~ — RESOLVED: Magic link only (Decision 1)
- **Still needed**: PM sign-off on user-facing error messages (error envelope structure approved per Decision 9, but message copy TBD)
- **Still needed**: Data retention policy details — can patients request full data deletion? (HIPAA right of access / right to delete)

### From Inga (UX/UI Designer)
- **User flow mapping** — I need the complete set of screens and transitions to ensure every user action has a corresponding API call. Specifically:
  - Guest-to-account conversion flow (does the guest session data migrate?)
  - "Add another test date" flow — is this a new form submission or an edit?
  - Save prompt timing — when does the FE call the save endpoint?
- ~~**PDF download trigger**~~ — DEFERRED to Phase 2b (Decision 2)
- **Responsive breakpoints** — Not directly API, but confirms no different response shapes needed

### From Luca (CTO)
- **Architecture decision on prediction engine isolation** — Is the rules engine a separate microservice behind the FastAPI layer, or co-located? This determines whether I model internal service contracts.
- ~~**HIPAA audit log design**~~ — PARTIALLY RESOLVED: ON DELETE SET NULL decided (Decision 14). Still need: are audit log endpoints exposed via API, or purely backend?

---

## 4. Dependencies Other Agents Have on Me

### Harshit (Frontend Developer) depends on me for:
- **Complete API contract with mock responses** — Harshit cannot build the `PredictionService`, form submission, auth flows, or chart data fetching without my endpoint specs. This is the critical path.
- **Error response format** — APPROVED (Decision 9). Harshit can begin building error states.
- **Auth token format and storage guidance** — Magic link flow (Decision 1), guest session httpOnly cookie (Decision 4).
- **CORS configuration** — FE calls API directly, no BFF (Decision 7). Must specify allowed origins.
- **Jira stories directly blocked by my contract**:
  - SPEC-10: Integrate Frontend with Prediction API
  - SPEC-41: Map form data to API request schema
  - SPEC-42: Handle API loading/error states in UI
  - SPEC-43: Integrate service call into PredictionForm submission

### Gay Mark (Database Engineer) depends on me for:
- **API field names and types** — The DB schema should align with API contract field names to minimize transformation layers.
- **Data access patterns** — Which queries the API needs informs indexing strategy.
- **Audit log ON DELETE SET NULL contract** — How DELETE endpoints document this behavior (Decision 14).

### Yuri (Test Writer / QA) depends on me for:
- **API contract for test plan** — Yuri writes integration tests, contract tests, and acceptance tests against my spec.
- **Validation rules** — Min/max ranges for lab values, required vs optional field rules, edge cases.
- **Auth test scenarios** — Guest mode (httpOnly cookie), magic link flow, expired token, invalid magic link.
- **Lee's test vectors** will inform expected mock responses (Decision 13).

### Husser (Product Manager) depends on me for:
- **API Contracts section of the final PRD** — Section 7 of the PRD template requires agreed endpoints and schemas.

---

## 5. Risks and Concerns

### RESOLVED

**~~R1: Magic link auth vs. email/password — contradictory specs~~**
RESOLVED at Meeting 1 (Decision 1). **Magic link only.** Jira stories SPEC-20, SPEC-59, SPEC-60 describing password-based auth are superseded by this binding decision. Auth endpoints: POST /auth/request-link, POST /auth/verify, POST /auth/refresh, POST /auth/logout.

**~~R4: Multi-visit predict endpoint complexity~~**
RESOLVED at Meeting 1 (Decision 8). **Option C approved.** POST /lab-entries stores data. POST /predict reads from stored data (auth) or accepts inline data (guest). Clean separation of concerns.

**~~R5: PDF generation endpoint is unspecified~~**
RESOLVED at Meeting 1 (Decision 2). **Deferred to Phase 2b.** No PDF endpoint in MVP contract. Placeholder noted for future phase.

### HIGH RISK

**R2: HIPAA compliance affects every endpoint**
This app handles PHI (Protected Health Information) — kidney lab values tied to patient identity. Every API endpoint that touches patient data must:
- Use TLS 1.2+ (SPEC-29)
- Include audit logging (SPEC-30) — audit log uses ON DELETE SET NULL (Decision 14)
- Enforce authentication before data access
- Return minimal data (no over-fetching)
- Handle data retention/deletion (SPEC-73: right to delete)
Still need team agreement: do we need a `DELETE /me` endpoint for data deletion requests? Do we need consent tracking at the API layer?

**R3: eGFR calculation logic placement**
The spec says the server calculates `egfr_calculated` from creatinine, age, and sex (CKD-EPI 2021 formula). But there is also a proposed `egfr` override field (spec review Issue #3) where the patient can enter their own eGFR. The API contract needs to handle both cases cleanly: calculate if not provided, use override if provided, and indicate which was used in the response. This affects the confidence tier logic. Additionally, Tier 2 requires both hemoglobin AND glucose (Decision 12).

### MEDIUM RISK

**R6: Guest-to-account data migration**
When a guest creates an account, does their session data migrate to the new account? Guest data is server-side with 24hr TTL and httpOnly cookie (Decision 4). The API needs either a magic link verification endpoint that accepts a guest `session_token` to migrate data, or a separate migration endpoint. This flow needs alignment with Inga.

### LOW RISK

**R7: API versioning strategy**
The Jira backlog uses `/api/v1/` prefix. This is fine for MVP. But given the phased roadmap (Phase 2 MVP, Phase 3 monitoring layer), we should agree now on how v2 will coexist with v1.

**R8: Rate limiting for public-facing prediction endpoint**
Guests can hit `POST /predict` without authentication (with inline data). Rate limiting needed to prevent abuse. I will include rate limit headers (`X-RateLimit-Remaining`, `Retry-After`) in the contract.

---

## 6. Key API Design Decisions — Status After Meeting 1

### Decision 1: Authentication mechanism — RESOLVED
- **Outcome**: (A) Magic link only (Decision 1)
- No password endpoints, no password storage, reduced attack surface

### Decision 2: Prediction endpoint — RESOLVED
- **Outcome**: (C) Store entries first, then predict from stored data (Decision 8)
- `POST /lab-entries` stores data. `POST /predict` reads from stored (auth) or accepts inline (guest).

### Decision 3: PDF generation approach — RESOLVED (DEFERRED)
- **Outcome**: Deferred to Phase 2b (Decision 2)
- Placeholder in notes for future phase. No MVP endpoint.

### Decision 4: Guest session management — RESOLVED
- **Outcome**: Server-side storage, 24hr TTL, httpOnly cookie (Decision 4)
- No data persists beyond 24 hours unless account is created.

### Decision 5: Error response contract — RESOLVED
- **Outcome**: My proposed envelope approved (Decision 9)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [
      {"field": "bun", "message": "BUN must be between 5 and 150 mg/dL"}
    ]
  }
}
```
- HTTP status codes: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 422 (unprocessable entity — FastAPI default for Pydantic failures), 429 (rate limited), 500 (server error)

---

## 7. Contract-First Approach

### How I will enable parallel FE/BE work

1. **Draft API contract in OpenAPI 3.1 format** — written to `/agents/john_donaldson/drafts/api_contract.json` during the parallel drafting phase (Step 5 of SOP)
2. **Include example responses** for every endpoint — these become Harshit's mock data
3. **Publish to `/artifacts/api_contract.json`** once reviewed — this is the binding contract per PAT-001 and DEC-002
4. **Provide a Swagger/ReDoc URL** or static HTML doc generated from the spec for easy browsing
5. **Version the contract** — any change after publication requires a team discussion and Luca's approval

### Endpoint Inventory (Updated Post-Meeting 1)

| Method | Path | Purpose | Auth Required | Status |
|--------|------|---------|---------------|--------|
| `POST` | `/api/v1/auth/request-link` | Send magic link email | No | MVP |
| `POST` | `/api/v1/auth/verify` | Validate magic link token, return session | No | MVP |
| `POST` | `/api/v1/auth/refresh` | Refresh expired session | Yes (refresh token) | MVP |
| `POST` | `/api/v1/auth/logout` | Invalidate session | Yes | MVP |
| `GET` | `/api/v1/me` | Get current user profile | Yes | MVP |
| `DELETE` | `/api/v1/me` | Delete account and all data (HIPAA) | Yes | MVP |
| `POST` | `/api/v1/lab-entries` | Store a new lab entry | Yes | MVP |
| `GET` | `/api/v1/lab-entries` | List all lab entries for user | Yes | MVP |
| `GET` | `/api/v1/lab-entries/{id}` | Get a single lab entry | Yes | MVP |
| `DELETE` | `/api/v1/lab-entries/{id}` | Delete a lab entry (audit: SET NULL) | Yes | MVP |
| `POST` | `/api/v1/predict` | Run prediction — stored data (auth) or inline (guest) | No (guest) / Yes (account) | MVP |
| `GET` | `/api/v1/health` | Health check (infra) | No | MVP |

#### Removed from MVP (Phase 2b)
| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| `GET` | `/api/v1/predictions/{id}/pdf` | Download prediction as PDF | Deferred — Decision 2 |

#### Removed from MVP (no prediction storage)
| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| `GET` | `/api/v1/predictions/{id}` | Get a stored prediction result | Removed — Decision 10 |

### Predict endpoint — Option C design (Decision 8)

**Authenticated user flow:**
1. `POST /api/v1/lab-entries` — store lab entry (one per visit date)
2. `POST /api/v1/predict` — server reads all stored lab entries for user, runs prediction

**Guest flow:**
1. `POST /api/v1/predict` with inline `lab_entries[]` in request body — server runs prediction without storage (data held in server-side session with 24hr TTL per Decision 4)

### Request schema (predict endpoint — draft)

**Authenticated user:**
```json
{
  "lab_entry_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Guest (inline data):**
```json
{
  "lab_entries": [
    {
      "bun": 35,
      "creatinine": 1.8,
      "potassium": 4.5,
      "age": 58,
      "sex": "male",
      "egfr_override": null,
      "phosphorus": 4.2,
      "albumin": 3.8,
      "bicarbonate": 22,
      "uric_acid": 7.1,
      "bp_systolic": 140,
      "bp_diastolic": 90,
      "bp_on_medication": true,
      "glucose": 110,
      "hba1c": 6.5,
      "hemoglobin": 12.5,
      "calcium": 9.2,
      "upcr": 500,
      "diagnosis_stage": "3b",
      "height_inches": 70,
      "weight_lbs": 185,
      "visit_date": "2026-03-15"
    }
  ],
  "session_token": "from_httpOnly_cookie"
}
```

Note: `sex` is required, enum `"male" | "female" | "unknown"` (Decision 3). Both `hemoglobin` and `glucose` are required for Tier 2 confidence (Decision 12).

### Response schema (predict endpoint — draft)

```json
{
  "egfr_calculated": 33,
  "confidence_tier": 1,
  "unlock_prompt": "Add CBC results to sharpen your estimate",
  "trajectories": {
    "none": [33, 31, 29, 27, 25, 22, 20, 18, 16, 14, 13, 12, 11, 10, 9],
    "bun24": [33, 32, 31, 31, 30, 30, 29, 29, 28, 28, 27, 27, 26, 26, 25],
    "bun17": [33, 33, 34, 35, 36, 37, 38, 39, 39, 40, 40, 41, 41, 42, 42],
    "bun12": [33, 34, 36, 38, 40, 42, 44, 46, 47, 48, 49, 50, 51, 52, 53]
  },
  "dial_ages": {
    "none": 68,
    "bun24": null,
    "bun17": null,
    "bun12": null
  },
  "slope": null,
  "slope_description": null,
  "created_at": "2026-03-25T12:00:00Z"
}
```

Note: `prediction_id` removed from response — no prediction storage in MVP (Decision 10).

---

## 8. Preparation Checklist for Meeting 1

- [x] Read all three spec documents (proposal, product/UX spec, spec review)
- [x] Review Jira backlog — 29 stories, 50 sub-tasks across 4 epics
- [x] Read memory files (patterns, anti-patterns, decisions, insights, tooling)
- [x] Read Discovery Phase SOP
- [x] Identify blocking dependencies (auth mechanism, multi-visit flow, PDF generation)
- [x] Draft preliminary endpoint inventory
- [x] Draft request/response schemas
- [x] Document risks with severity ratings
- [x] Prepare design decisions for team debate
- [x] **MEETING 1 COMPLETE** — all 5 design decisions resolved

---

## 9. Questions Raised at Meeting 1 — Resolution Status

1. ~~**To Husser**: Is auth magic link or email/password?~~ — RESOLVED: Magic link only (Decision 1)
2. **To Husser**: What is the data retention policy? Can patients request full data deletion? — OPEN
3. ~~**To Husser**: Is PDF generation in MVP scope?~~ — RESOLVED: Deferred to Phase 2b (Decision 2)
4. **To Gay Mark**: What is the planned schema for `lab_entries`? — OPEN (needed for contract alignment)
5. **To Gay Mark**: How will guest sessions be stored? — PARTIALLY RESOLVED: server-side, httpOnly cookie, 24hr TTL (Decision 4). Table structure TBD.
6. **To Inga**: What is the guest-to-account conversion UX? — OPEN
7. **To Inga**: What happens when "Add another test date" is clicked? — OPEN
8. ~~**To Harshit**: What HTTP client will you use?~~ — RESOLVED: TanStack Query (Decision 7)
9. **To Luca**: Is the prediction rules engine a separate service or embedded? — OPEN
10. **To Yuri**: What test tooling for API contract testing? — OPEN
