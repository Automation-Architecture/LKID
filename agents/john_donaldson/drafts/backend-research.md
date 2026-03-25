# Backend Research: John Donaldson + Gay Mark

**Date:** 2026-03-25 | **Scope:** Lean Launch MVP backend decisions
**Input:** Approved `lean-launch-mvp-prd.md`, Luca CTO review, original drafts from both agents

---

## 1. Joint Decisions

### 1a. PDF Rendering — Option (A): Playwright + Next.js Internal Route

The chart is React/Visx SVG. Python cannot render React. Flow:
1. `POST /predict/pdf` receives lab values, runs prediction engine.
2. FastAPI builds URL: `{FRONTEND_INTERNAL_URL}/internal/chart?data={base64_results}`.
3. Playwright navigates to the URL, waits for SVG, calls `page.pdf()`.
4. Returns `application/pdf`. Estimated: 1-3 seconds.

The `/internal/chart` page is a stripped layout (chart + disclaimer, no nav). Protected by shared secret query param — not public. Playwright runs as a persistent browser context on Railway (reuse browser, new page per request).

**Fallback:** If Vercel latency is unacceptable, bundle a standalone HTML file with a pre-built Visx chart (esbuild). More work, but removes cross-service dependency.

### 1b. Database Connection Strings — Railway Environment Variables

Railway provides `DATABASE_URL` for linked Postgres. All secrets via Railway dashboard Variables. `.env` for local dev only (gitignored). No committed secrets. Append `?sslmode=require` for Railway Postgres SSL.

```python
class Settings(BaseSettings):
    database_url: str        # Railway injects DATABASE_URL
    clerk_secret_key: str
    clerk_jwks_url: str      # https://{clerk-domain}/.well-known/jwks.json
    frontend_url: str        # CORS + PDF rendering
    environment: str = "production"
    model_config = SettingsConfigDict(env_file=".env")
```

### 1c. Error Envelope — Standardized

```json
{"error": {"code": "VALIDATION_ERROR", "message": "...", "details": [{"field": "creatinine", "message": "..."}]}}
```

Codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `RATE_LIMIT_EXCEEDED` (429), `PDF_RENDER_FAILED` (502), `INTERNAL_ERROR` (500). Implemented via custom `AppError` exception + FastAPI exception handler.

---

## 2. John Donaldson — API Spec

### 2a. Five Endpoints

| Endpoint | Auth | Request | Response |
|----------|------|---------|----------|
| `POST /auth/request-link` | None | `{email}` | `{message}` |
| `POST /auth/verify` | None | `{token}` | `{session_token, user: {id, email}}` |
| `POST /predict` | Clerk JWT | `{name, email, bun, creatinine, potassium, age}` | Trajectories + eGFR (see below) |
| `POST /predict/pdf` | Clerk JWT | Same as `/predict` | `application/pdf` |
| `GET /health` | None | — | `{status: "ok"}` |

`/predict` response: `{egfr_current, trajectories: {none, bun24, bun17, bun12} (4x15 floats), time_points_months (15 ints), dialysis_ages}`. Side effect: upserts lead into `leads` table.

### 2b. Clerk JWT — Dependency Injection (Not Middleware)

Middleware would run on `/health` and `/auth/*`. Dependency injection targets only protected routes.

```python
security = HTTPBearer()
async def verify_clerk_jwt(creds: HTTPAuthorizationCredentials = Security(security)) -> dict:
    jwks = get_jwks()  # cached via @lru_cache
    header = jwt.get_unverified_header(creds.credentials)
    key = next(k for k in jwks["keys"] if k["kid"] == header["kid"])
    return jwt.decode(creds.credentials, key, algorithms=["RS256"])

@app.post("/predict")
async def predict(body: PredictRequest, user=Depends(verify_clerk_jwt)): ...
```

### 2c. Clerk Webhook — `user.created`

Secondary lead capture (catches users who verify email but never submit the form). Uses Svix SDK for signature verification. Upserts to `leads` with email only (lab values NULL).

### 2d. slowapi Rate Limits

| Endpoint | Limit | Key |
|----------|-------|-----|
| `/auth/request-link` | 3/15min | IP |
| `/predict` | 10/min | IP |
| `/predict/pdf` | 5/min | IP |
| `/auth/verify`, `/health` | None | — |

In-memory storage (default). Sufficient for single Railway instance.

### 2e. CORS

Two origins: `http://localhost:3000`, `https://kidneyhood.org`. `allow_credentials=True` (Clerk cookies). Methods: GET, POST, OPTIONS. `max_age=3600`.

---

## 3. Gay Mark — Database

### 3a. `leads` Table DDL

The original 5-table schema is **entirely replaced** by one table. Clerk manages auth.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE leads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL,
    name        VARCHAR(255),
    bun         NUMERIC(5,1)  CHECK (bun BETWEEN 5 AND 150),
    creatinine  NUMERIC(4,2)  CHECK (creatinine BETWEEN 0.3 AND 15.0),
    potassium   NUMERIC(3,1)  CHECK (potassium BETWEEN 2.0 AND 8.0),
    age         INTEGER       CHECK (age BETWEEN 18 AND 120),
    source      VARCHAR(20)   NOT NULL DEFAULT 'predict' CHECK (source IN ('predict','webhook')),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_leads_email ON leads (email);
CREATE INDEX idx_leads_created_at ON leads (created_at);
```

Lab values are nullable (webhook-only leads have no lab data). `source` distinguishes `/predict` vs webhook origin. No RBAC, no audit log, no HIPAA apparatus — this is lead gen, not PHI.

### 3b. Alembic on Railway

`alembic.ini` reads `DATABASE_URL` from env. `env.py` fixes Railway's `postgres://` to `postgresql://` (SQLAlchemy requirement). Deploy command: `alembic upgrade head && uvicorn app.main:app`.

### 3c. SQLAlchemy Model

```python
class Lead(Base):
    __tablename__ = "leads"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=True)
    bun = Column(Numeric(5, 1), nullable=True)
    creatinine = Column(Numeric(4, 2), nullable=True)
    potassium = Column(Numeric(3, 1), nullable=True)
    age = Column(Integer, nullable=True)
    source = Column(String(20), nullable=False, server_default="predict")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 3d. Connection Pooling — asyncpg

`asyncpg` via `sqlalchemy[asyncio]`. FastAPI is async; `psycopg2` would block the event loop. Config: `pool_size=5, max_overflow=10, pool_pre_ping=True`. Conservative for Railway hobby tier (max 20 connections).

### 3e. Upsert Strategy

```python
stmt = insert(Lead).values(email=email, name=name, bun=bun, ...)
stmt = stmt.on_conflict_do_update(
    index_elements=["email"],
    set_={"name": func.coalesce(stmt.excluded.name, Lead.name),
          "bun": func.coalesce(stmt.excluded.bun, Lead.bun), ...}
)
```

`COALESCE(new, existing)` — never overwrites lab values with NULLs. Webhook creates email-only lead; `/predict` later fills lab values without losing the record.

---

## 4. Status

### Resolved (11 decisions)

PDF architecture (Playwright + internal route), error envelope, Clerk JWT via DI, Clerk webhook with Svix, `leads` DDL, Alembic on Railway, asyncpg pooling, upsert with COALESCE, slowapi limits, CORS config, env var management.

### Pending — Needs Lee's Input

1. **Prediction engine code/spec** — function signature, input/output types, 4 trajectory keys
2. **Time points** — are the 15 months fixed? What values?
3. **Formula** — CKD-EPI 2021 or proprietary?
4. **Dialysis threshold** — eGFR 12 or 15?
5. **Golden-file test vectors** — expected outputs for Yuri's boundary tests

### Pending — Sprint 1 Tasks

1. Write `lean-api-contract.json` (OpenAPI 3.1) — John
2. Write Alembic initial migration — Gay Mark
3. Build `/internal/chart` Next.js page — Harshit
4. Configure Clerk project (magic link, webhook) — Luca
5. Set up Railway project (Postgres, env vars) — Luca
6. Confirm production domain — Brad/client
