"""
KidneyHood Prediction API — FastAPI app.

Responsibilities:
- Health endpoint
- CORS middleware
- Async SQLAlchemy database connection
- POST /predict — CKD-EPI 2021 eGFR + trajectory engine, persists a row in
  `predictions` and returns an opaque `report_token` (LKID-62).
- GET /results/{token} — fetch the stored prediction (LKID-62).
- POST /leads — email-gate upsert + fire-and-forget Resend + Klaviyo (LKID-62).
- GET /reports/{token}/pdf — Playwright PDF render from stored inputs (LKID-62).
- POST /predict/pdf — legacy stateless PDF render (preserved for back-compat
  with the old /predict page until LKID-66 removes it).
- POST /webhooks/clerk — Clerk `user.created` webhook lead capture (LKID-9).
- GET /leads — admin leads list (protected, placeholder).
- slowapi rate limiting on write endpoints.
- Approved error envelope (Decision #9).
"""

import asyncio
import base64
import json
import logging
import os
import secrets
from contextlib import asynccontextmanager
from typing import Any, Literal, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from svix.webhooks import Webhook, WebhookVerificationError

from email_renderer import render_report_email
from prediction.engine import predict_for_endpoint
from sentry_scrubber import scrub_report_token
from services.klaviyo_service import track_prediction_completed
from services.resend_service import send_report_email

# ---------------------------------------------------------------------------
# Sentry — LKID-72
#
# Initialise before the FastAPI app is constructed so the FastApi /
# Sqlalchemy / Asyncio integrations can hook the framework at import time.
# The `logging` integration ships by default, which means every existing
# `logger.exception(...)` call in main.py and services/*.py auto-routes to
# Sentry — we MUST NOT add redundant `sentry_sdk.capture_exception()` calls.
#
# `before_send=scrub_report_token` redacts every occurrence of a bearer
# token path (`/results/<tok>`, `/gate/<tok>`, `/reports/<tok>`) from the
# outgoing event. Required for MED-01 compliance (tokens are bearer
# credentials; they must never land in Sentry logs).
# ---------------------------------------------------------------------------
_SENTRY_DSN = os.environ.get("SENTRY_DSN", "").strip()
if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.asyncio import AsyncioIntegration
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
            AsyncioIntegration(),
        ],
        traces_sample_rate=0.1,  # 10% — MVP sampling per LKID-72 techspec
        environment=os.environ.get("RAILWAY_ENVIRONMENT", "production"),
        release=os.environ.get("RAILWAY_GIT_COMMIT_SHA", "unknown"),
        before_send=scrub_report_token,
        # Do not attach request bodies by default — PredictRequest contains
        # lab values (not strictly PII, but conservative default for a
        # health app). Re-enable per-transaction with `set_context()` if
        # debugging requires it.
        send_default_pii=False,
    )

# Playwright's own TimeoutError is NOT a subclass of asyncio.TimeoutError
# (HIGH-01 in PR #35 QA). Import it so the /reports/{token}/pdf handler can
# map Playwright render timeouts to the AC-required 504. Guarded to tolerate
# environments without playwright installed (unit-test runners, some CI
# images) — if the import fails we fall back to a sentinel class that will
# never match a real raise, so the generic `except Exception` handles it.
try:
    from playwright.async_api import TimeoutError as PlaywrightTimeoutError
except ImportError:  # pragma: no cover — only hit in playwright-less envs
    class PlaywrightTimeoutError(Exception):  # type: ignore[no-redef]
        """Fallback — playwright not installed in this environment."""

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATABASE_URL = os.environ.get("DATABASE_URL", "")
# Railway provides postgresql:// but asyncpg needs postgresql+asyncpg://
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
]

ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "")
CLERK_WEBHOOK_SECRET = os.environ.get("CLERK_WEBHOOK_SECRET", "")
PDF_SECRET = os.environ.get("PDF_SECRET", "dev-pdf-secret")
FRONTEND_INTERNAL_URL = os.environ.get(
    "FRONTEND_INTERNAL_URL", "http://localhost:3000"
)
# LKID-62 — public URL used for fallback email links and Klaviyo report_url.
PUBLIC_APP_URL = os.environ.get(
    "PUBLIC_APP_URL", "https://kidneyhood-automation-architecture.vercel.app"
).rstrip("/")

# Playwright render timeout for the tokenized PDF endpoint. Jira AC: 30s cap.
PDF_RENDER_TIMEOUT_MS = 30_000

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

engine = create_async_engine(DATABASE_URL, echo=False) if DATABASE_URL else None
async_session = (
    async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    if engine
    else None
)


async def get_db() -> AsyncSession:
    """Yield an async database session."""
    if async_session is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    async with async_session() as session:
        yield session


# ---------------------------------------------------------------------------
# Lead Capture — LKID-62 tokenized flow
#
# The LKID-11 path (email supplied on /predict, JWT fallback, fire-and-forget
# INSERT into leads) was removed in LKID-62. /predict now stores an anonymous
# `predictions` row keyed by report_token; leads are upserted via the new
# POST /leads endpoint. See `_upsert_lead_and_link_prediction` below.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Rate Limiter
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------


_playwright = None
_browser = None
_browser_lock = asyncio.Lock()


async def _get_browser():
    """Return a persistent Chromium browser instance (lazy-initialized, thread-safe)."""
    global _playwright, _browser
    async with _browser_lock:
        if _browser is None:
            from playwright.async_api import async_playwright

            _playwright = await async_playwright().start()
            _browser = await _playwright.chromium.launch(headless=True)
            logger.info("Playwright browser launched")
    return _browser


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify DB connection
    if engine:
        async with engine.begin() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    yield
    # Shutdown: close Playwright browser + dispose engine
    global _playwright, _browser
    if _browser:
        await _browser.close()
        _browser = None
    if _playwright:
        await _playwright.stop()
        _playwright = None
    if engine:
        await engine.dispose()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="KidneyHood Prediction API",
    version="2.0.0",
    description="Lean Launch MVP API — prediction engine, PDF export, lead capture.",
    lifespan=lifespan,
)

app.state.limiter = limiter


# ---------------------------------------------------------------------------
# Error Handling — Decision #9: approved error envelope
# ---------------------------------------------------------------------------


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: ErrorBody


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        headers={"Retry-After": str(getattr(exc, "retry_after", 60))},
        content={
            "error": {
                "code": "RATE_LIMIT",
                "message": "Too many requests. Please wait before trying again.",
                "details": [],
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError
):
    """Convert Pydantic validation errors to the approved error envelope.

    SECURITY: Never include engine coefficients or internal details in
    error responses. Only surface field names and user-facing messages.
    """
    details = []
    for err in exc.errors():
        # Build a dot-separated field path from the loc tuple
        loc_parts = [str(p) for p in err.get("loc", []) if p != "body"]
        field = ".".join(loc_parts) if loc_parts else None
        details.append(
            {"field": field, "message": err.get("msg", "Invalid value")}
        )
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "One or more fields failed validation.",
                "details": details,
            }
        },
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    """Catch-all: never leak internal details to the client."""
    logger.exception("Unhandled error in %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
                "details": [],
            }
        },
    )


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
    max_age=3600,
)


# ---------------------------------------------------------------------------
# Security headers — LKID-74 / LKID-87
#
# Mirror of the seven-header set applied on the Next.js frontend (see
# `app/next.config.ts`). Backend CSP is tighter since the API only serves
# JSON / PDF streams: `default-src 'none'` with only `frame-ancestors`
# allowing nothing. No script/style/font/connect allowances are needed
# because the backend never renders HTML.
#
# LKID-87 (2026-04-30): flipped from Report-Only to enforcing mode after
# the 10-day soak window. The header key is now `Content-Security-Policy`.
#
# Swagger / OpenAPI exemption (LKID-87, Yuri PR #63 nit #3):
#   FastAPI's built-in `/docs` (Swagger UI) and `/redoc` pages pull
#   scripts/styles/fonts from `cdn.jsdelivr.net` and would be blocked by
#   the strict `default-src 'none'` policy. We emit a relaxed CSP for
#   exactly those routes so the auto-generated API docs keep working.
#   `/openapi.json` itself is JSON and stays under the strict policy.
#
# HSTS is conditional on the X-Forwarded-Proto header so localhost dev
# (http://localhost:8000) does not get the preload directive. In Railway
# production, the edge always sets X-Forwarded-Proto=https.
# ---------------------------------------------------------------------------

_BACKEND_CSP = (
    "default-src 'none'; "
    "frame-ancestors 'none'; "
    "base-uri 'none'; "
    "form-action 'none'"
)

# Relaxed policy used only on FastAPI's built-in Swagger UI / ReDoc routes.
# Both pages bundle their JS/CSS/fonts from jsdelivr; the strict default
# would prevent the docs from rendering at all once we flip to enforcing
# mode. We deliberately do NOT relax `frame-ancestors` so the docs can
# still not be embedded by third parties.
_BACKEND_CSP_DOCS = (
    "default-src 'none'; "
    "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
    "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
    "img-src 'self' data: https://fastapi.tiangolo.com https://cdn.jsdelivr.net; "
    "font-src 'self' https://cdn.jsdelivr.net; "
    "connect-src 'self'; "
    "frame-ancestors 'none'; "
    "base-uri 'none'; "
    "form-action 'none'"
)

# Path prefixes that get the relaxed Swagger/ReDoc policy. `/openapi.json`
# is intentionally excluded — it's a pure JSON document and stays strict.
_DOCS_PATH_PREFIXES: tuple[str, ...] = ("/docs", "/redoc")


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Apply the LKID-74 / LKID-87 security header set to every response.

    Headers mirror `app/next.config.ts`:
      - Content-Security-Policy — tight `default-src 'none'` policy on
        every route except `/docs` + `/redoc`, which get a relaxed policy
        so FastAPI's bundled Swagger UI / ReDoc render correctly.
      - Strict-Transport-Security — only when the edge advertises HTTPS
        via X-Forwarded-Proto, so localhost dev is unaffected.
      - X-Frame-Options: DENY (redundant with frame-ancestors, kept for
        legacy browsers).
      - X-Content-Type-Options: nosniff.
      - Referrer-Policy: strict-origin-when-cross-origin.
      - Permissions-Policy: disables camera/mic/geo/payment/usb/sensors.
      - X-DNS-Prefetch-Control: on.
    """
    response = await call_next(request)

    # LKID-87: pick the appropriate CSP based on path. The Swagger/ReDoc
    # pages need a relaxed policy; everything else stays strict.
    path = request.url.path
    if any(path.startswith(prefix) for prefix in _DOCS_PATH_PREFIXES):
        csp_value = _BACKEND_CSP_DOCS
    else:
        csp_value = _BACKEND_CSP
    response.headers.setdefault("Content-Security-Policy", csp_value)
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault(
        "Referrer-Policy", "strict-origin-when-cross-origin"
    )
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), "
        "usb=(), magnetometer=(), accelerometer=(), gyroscope=()",
    )
    response.headers.setdefault("X-DNS-Prefetch-Control", "on")

    # HSTS only when the edge indicates HTTPS. Railway + Vercel both set
    # X-Forwarded-Proto; localhost does not, so dev curl -I shows no HSTS
    # but production traffic always does.
    if request.headers.get("x-forwarded-proto", "").lower() == "https":
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload",
        )

    return response

# ---------------------------------------------------------------------------
# Schemas (Pydantic) — LKID-15 enhanced request/response models
# ---------------------------------------------------------------------------


class PredictRequest(BaseModel):
    """Prediction request body — LKID-14/15 v2.0 engine inputs.

    Required fields: bun, creatinine, potassium, age, sex.
    Optional Confidence Tier 2 modifiers: hemoglobin, co2, albumin.
    Glucose and potassium accepted for storage/legacy but unused by engine.

    LKID-62 note: `name` and `email` were removed here — the tokenized flow
    captures contact info via POST /leads instead. Pydantic v2's default
    behavior is to silently ignore extra fields, so the legacy /predict page
    (which still sends `name`/`email`) keeps working unchanged; the extra
    fields are dropped before they reach the engine or DB.
    """

    bun: float = Field(
        ..., ge=5, le=150, description="Blood Urea Nitrogen mg/dL"
    )
    creatinine: float = Field(
        ..., ge=0.3, le=20.0, description="Serum Creatinine mg/dL"
    )
    potassium: float = Field(
        ..., ge=2.0, le=8.0, description="Potassium mEq/L"
    )
    age: int = Field(..., ge=18, le=120, description="Patient age in years")
    sex: Literal["male", "female", "unknown"] = Field(
        ..., description="Biological sex"
    )
    # Confidence Tier 2 modifiers (LKID-14): affect post-Phase 2 decline
    hemoglobin: Optional[float] = Field(
        None, ge=4.0, le=20.0, description="Hemoglobin g/dL"
    )
    co2: Optional[float] = Field(
        None, ge=5.0, le=40.0, description="Serum CO2 mEq/L"
    )
    albumin: Optional[float] = Field(
        None, ge=1.0, le=6.0, description="Albumin g/dL"
    )
    # Legacy optional field — accepted but unused by v2.0 engine
    glucose: Optional[float] = Field(
        None, ge=40, le=500, description="Fasting Glucose mg/dL"
    )


class LeadCaptureRequest(BaseModel):
    """POST /leads body — LKID-62 email gate.

    All three fields are required: the report_token ties the lead back to
    the stored prediction; name + email are the marketing identity.
    """

    report_token: str = Field(
        ..., min_length=32, max_length=128,
        description="Opaque token from POST /predict response.",
    )
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr = Field(...)


class Trajectories(BaseModel):
    no_treatment: list[float]
    bun_18_24: list[float]
    bun_13_17: list[float]
    bun_12: list[float]


class DialAges(BaseModel):
    no_treatment: Optional[float] = None
    bun_18_24: Optional[float] = None
    bun_13_17: Optional[float] = None
    bun_12: Optional[float] = None


class StructuralFloor(BaseModel):
    """Amendment 3 BUN structural floor — display-only, NOT part of trajectory engine.

    Only present in the response when BUN > 17.
    """

    structural_floor_egfr: float
    suppression_points: float


class PredictResponse(BaseModel):
    """POST /predict response — LKID-14/15 v2.0 shape + LKID-62 `report_token`.

    LKID-62: The response now also carries `report_token`, the opaque
    32-byte URL-safe base64 credential the frontend uses for subsequent
    GET /results/{token} and GET /reports/{token}/pdf calls. Existing fields
    are preserved so the legacy /predict page keeps rendering its chart.
    """

    # LKID-62 — opaque bearer token for the tokenized flow. Added as the
    # first field on the response so it is obvious in any API trace. New
    # consumers (LKID-63 /gate page) are required to honor it; the legacy
    # /predict page ignores it and renders from its existing sessionStorage.
    report_token: str
    egfr_baseline: float
    confidence_tier: int  # 1 or 2
    trajectories: Trajectories
    time_points_months: list[int]
    dial_ages: DialAges
    dialysis_threshold: float  # always 12.0
    stat_cards: dict[str, float]
    # Optional so that frontend clients that do not yet have this field in
    # their TypeScript types will not throw on deserialization.  The engine
    # always populates it; Optional here is a forward-compat safety net only.
    bun_suppression_estimate: Optional[float] = None
    # Amendment 3: BUN structural floor display callout.  Only present when BUN > 17.
    structural_floor: Optional[StructuralFloor] = None


class ResultsResponse(BaseModel):
    """GET /results/{token} response — LKID-62 §5.2."""

    report_token: str
    captured: bool
    created_at: str  # ISO 8601
    result: dict[str, Any]
    # LKID-63 IS-01: raw validated inputs (bun, creatinine, potassium, age,
    # sex, hemoglobin, co2, albumin, glucose) — powers the BUN structural-
    # floor callout on the frontend results page. Safe to expose: lab values
    # and demographics only, no PII (name/email captured separately via /leads).
    inputs: dict[str, Any]
    lead: Optional[dict[str, Any]] = None


class LeadCaptureResponse(BaseModel):
    """POST /leads response — LKID-62 §5.3.

    Returns a superset of Jira AC (`{token}`) and the techspec-prompt
    (`{ok, captured}`) so both callers stay happy. LKID-63 can rely on
    any of the three keys.
    """

    ok: bool = True
    captured: bool = True
    token: str


# ---------------------------------------------------------------------------
# 1. GET /health — Infrastructure health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["Infrastructure"])
async def health():
    """Health check for Railway zero-downtime deploys."""
    return {"status": "ok", "version": "2.0.0"}


# ---------------------------------------------------------------------------
# 2. POST /predict — Run prediction engine (LKID-15)
# ---------------------------------------------------------------------------


@app.post(
    "/predict",
    response_model=PredictResponse,
    responses={
        422: {"model": ErrorResponse, "description": "Validation error"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Prediction"],
)
@limiter.limit("10/minute")
async def predict(request: Request, body: PredictRequest):
    """
    Run the CKD-EPI 2021 eGFR calculation and 4-trajectory prediction engine,
    persist the anonymous result in `predictions`, and return it along with an
    opaque `report_token` that the frontend uses for the subsequent email-gate
    and PDF download steps (LKID-62).

    Returns baseline eGFR, confidence tier, 4 trajectory paths (15 time points
    each), dial_ages per trajectory, dialysis threshold, and stat cards, plus
    the new `report_token`.

    LKID-62 changes:
    - No longer accepts/stores `name` or `email` (new flow captures via POST
      /leads). Pydantic ignores unknown fields, so the legacy /predict page
      continues to work unchanged.
    - Writes a row to `predictions (report_token, inputs, result, ...)` before
      returning. `lead_id`/`email_sent_at` stay NULL until POST /leads links
      them.
    - Rate limit (10/min/IP) preserved from LKID-25 — `slowapi`'s
      `get_remote_address` key function uses the client IP, which is exactly
      what we want now that there is no email on this endpoint.

    Engine coefficients are server-side only — never exposed in responses.
    """
    result = predict_for_endpoint(
        bun=body.bun,
        creatinine=body.creatinine,
        age=body.age,
        sex=body.sex,
        potassium=body.potassium,
        hemoglobin=body.hemoglobin,
        co2=body.co2,
        albumin=body.albumin,
        glucose=body.glucose,
    )

    # LKID-62: generate an opaque 32-byte URL-safe base64 bearer token.
    # `secrets.token_urlsafe(32)` yields ~43 chars, 256 bits of entropy.
    report_token = secrets.token_urlsafe(32)

    # Persist the prediction row. The DB is the source of truth from this
    # point on; if the INSERT fails we raise 500 because returning a token
    # that maps to nothing would hand the user a broken flow.
    if async_session is not None:
        inputs_json = body.model_dump(mode="json", exclude_none=False)
        async with async_session() as session:
            await session.execute(
                text(
                    """
                    INSERT INTO predictions (report_token, inputs, result)
                    VALUES (
                        :report_token,
                        CAST(:inputs AS JSONB),
                        CAST(:result AS JSONB)
                    )
                    """
                ),
                {
                    "report_token": report_token,
                    "inputs": json.dumps(inputs_json),
                    "result": json.dumps(result),
                },
            )
            await session.commit()
    else:
        # Local-dev fallback: no DB configured. Log the condition but still
        # return a token so the dev harness keeps flowing. The /results and
        # /leads endpoints will simply 404 on this token.
        logger.warning(
            "POST /predict returning token without DB insert "
            "(DATABASE_URL unset; dev mode only)"
        )

    return {"report_token": report_token, **result}


# ---------------------------------------------------------------------------
# 2a. GET /results/{token} — Fetch stored prediction (LKID-62)
# ---------------------------------------------------------------------------


async def _fetch_prediction_by_token(token: str) -> dict[str, Any]:
    """Return the full prediction row as a dict. Raises 404/410/503 on miss.

    Shared by GET /results/{token} and GET /reports/{token}/pdf so error
    semantics (404 missing / 410 revoked / 503 no-DB) stay consistent.
    """
    if async_session is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    async with async_session() as session:
        row = (
            await session.execute(
                text(
                    """
                    SELECT id, report_token, token_created_at, revoked_at,
                           inputs, result, lead_id, email_sent_at, created_at
                    FROM predictions
                    WHERE report_token = :token
                    LIMIT 1
                    """
                ),
                {"token": token},
            )
        ).mappings().first()

    if row is None:
        raise HTTPException(status_code=404, detail="Report not found")
    if row["revoked_at"] is not None:
        raise HTTPException(status_code=410, detail="Report revoked")

    return dict(row)


@app.get(
    "/results/{token}",
    response_model=ResultsResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Token not found"},
        410: {"model": ErrorResponse, "description": "Token revoked"},
    },
    tags=["Prediction"],
)
async def get_results(token: str):
    """LKID-62 — fetch the stored prediction for the given report_token.

    - 404 if the token is unknown.
    - 410 if the row has been revoked (reserved; not enforced by UI in MVP).
    - 200 with `captured=true` when a lead has already linked via POST /leads.
      The `lead` block includes the display name and email_captured_at so the
      gate page can detect prior captures and skip re-prompting.
    """
    row = await _fetch_prediction_by_token(token)

    captured = row["lead_id"] is not None

    # Pull lead details when linked so the frontend can skip the gate.
    lead_block: Optional[dict[str, Any]] = None
    if captured and async_session is not None:
        async with async_session() as session:
            lead_row = (
                await session.execute(
                    text(
                        """
                        SELECT name, email, created_at, updated_at
                        FROM leads
                        WHERE id = :lead_id
                        LIMIT 1
                        """
                    ),
                    {"lead_id": row["lead_id"]},
                )
            ).mappings().first()
        if lead_row is not None:
            # `email_captured_at` in the response ≡ the first time we saw
            # this lead tied to this prediction, which is effectively the
            # lead's created_at (or updated_at if re-seen).
            captured_at = lead_row.get("updated_at") or lead_row.get("created_at")
            lead_block = {
                "name": lead_row["name"],
                "email_captured_at": (
                    captured_at.isoformat() if captured_at else None
                ),
            }

    created_at = row["created_at"]
    return {
        "report_token": row["report_token"],
        "captured": captured,
        "created_at": (
            created_at.isoformat() if created_at else ""
        ),
        "result": row["result"],
        # LKID-63 IS-01: include stored inputs so the frontend structural-
        # floor callout (BUN > 17) can render. `inputs` is always populated
        # by POST /predict (non-null JSONB column), so an empty dict is a
        # harmless fallback for any malformed legacy row.
        "inputs": row["inputs"] or {},
        "lead": lead_block,
    }


# ---------------------------------------------------------------------------
# 2b. POST /leads — Email gate: upsert lead, link prediction, fire-and-forget
#                   Resend + Klaviyo (LKID-62).
# ---------------------------------------------------------------------------


async def _upsert_lead_and_link_prediction(
    *, report_token: str, name: str, email: str
) -> tuple[str, str]:
    """Upsert a leads row and link it to the predictions row identified by
    `report_token`. Returns `(prediction_id, lead_id)` as UUID strings.

    Raises 404/410 if the token is unknown/revoked, 503 if no DB.

    Idempotent on email: re-submitting with the same email updates name +
    `updated_at` and returns the existing lead_id (uses ON CONFLICT (email)).
    """
    if async_session is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    async with async_session() as session:
        async with session.begin():
            # 1. Verify the prediction exists and is active.
            pred_row = (
                await session.execute(
                    text(
                        """
                        SELECT id, revoked_at
                        FROM predictions
                        WHERE report_token = :token
                        FOR UPDATE
                        """
                    ),
                    {"token": report_token},
                )
            ).mappings().first()
            if pred_row is None:
                raise HTTPException(status_code=404, detail="Report not found")
            if pred_row["revoked_at"] is not None:
                raise HTTPException(status_code=410, detail="Report revoked")

            # 2. Upsert the lead row on (email).
            lead_row = (
                await session.execute(
                    text(
                        """
                        INSERT INTO leads (email, name)
                        VALUES (:email, :name)
                        ON CONFLICT (email) DO UPDATE
                            SET name       = EXCLUDED.name,
                                updated_at = now()
                        RETURNING id
                        """
                    ),
                    {"email": email, "name": name},
                )
            ).mappings().first()
            lead_id = str(lead_row["id"])

            # 3. Link the prediction to the lead.
            await session.execute(
                text(
                    """
                    UPDATE predictions
                       SET lead_id = :lead_id
                     WHERE report_token = :token
                    """
                ),
                {"lead_id": lead_row["id"], "token": report_token},
            )

    return str(pred_row["id"]), lead_id


async def _render_pdf_for_token(token: str) -> bytes:
    """Render the PDF for a report_token by navigating the internal chart
    page. Raises on any Playwright failure (caller handles fallback).

    The internal chart route is `/internal/chart/{token}?secret={PDF_SECRET}`
    (LKID-63 will build this). The token identifies the user; the secret is
    the service-to-service credential so the /internal route only serves
    the backend.
    """
    chart_url = (
        f"{FRONTEND_INTERNAL_URL}/internal/chart/{token}"
        f"?secret={PDF_SECRET}"
    )
    page = None
    try:
        browser = await _get_browser()
        page = await browser.new_page(viewport={"width": 1060, "height": 800})
        await page.goto(
            chart_url, wait_until="networkidle", timeout=PDF_RENDER_TIMEOUT_MS
        )
        await page.wait_for_selector(
            "#pdf-ready", timeout=PDF_RENDER_TIMEOUT_MS
        )
        return await page.pdf(
            format="Letter",
            print_background=True,
            margin={
                "top": "0.4in",
                "bottom": "0.4in",
                "left": "0.3in",
                "right": "0.3in",
            },
        )
    finally:
        if page:
            await page.close()


async def _mark_email_sent(report_token: str) -> None:
    """UPDATE predictions.email_sent_at = now() for the given token.

    Called from the fire-and-forget task after Resend success (and also on
    the PDF-failure fallback path, per techspec §4.2: the email still went
    out, just without an attachment).
    """
    if async_session is None:
        return
    try:
        async with async_session() as session:
            await session.execute(
                text(
                    """
                    UPDATE predictions
                       SET email_sent_at = now()
                     WHERE report_token = :token
                    """
                ),
                {"token": report_token},
            )
            await session.commit()
    except Exception:
        logger.exception(
            "Failed to set email_sent_at for token_prefix=%s",
            report_token[:8],
        )


async def _send_report_email_task(
    *,
    report_token: str,
    prediction_id: str,
    lead_email: str,
    lead_name: str,
    egfr_baseline: float,
    confidence_tier: Any,
    bun: Optional[float] = None,
) -> None:
    """Fire-and-forget pipeline invoked from POST /leads.

    Steps (techspec §8.4–§8.5):
      1. Render the PDF via Playwright (30s timeout, Jira AC).
      2. Render the HTML email body (standard template if PDF OK, fallback
         template with /results/{token} link if PDF failed).
      3. Send via Resend (with or without attachment).
      4. On Resend success, set predictions.email_sent_at = now().
         On PDF failure but Resend success, still set email_sent_at —
         the email reached the user, just without a file.
      5. Fire the Klaviyo "Prediction Completed" event.

    Never raises — a failure here cannot block POST /leads which has
    already returned 200 to the client.

    MED-02 fix (PR #35 QA): the Resend pipeline and the Klaviyo fire are
    independent. Klaviyo MUST fire regardless of whether PDF render,
    template render, or Resend itself fail — the warm campaign is
    lead-capture business data and cannot be gated on transactional email
    success. Each integration gets its own try/except below.
    """
    # --- Resend pipeline (render PDF -> render template -> send -> mark sent) ---
    try:
        pdf_bytes: Optional[bytes]
        pdf_failed = False
        try:
            pdf_bytes = await _render_pdf_for_token(report_token)
        except Exception:
            logger.exception(
                "PDF render failed for prediction %s — using fallback email",
                prediction_id,
            )
            pdf_bytes = None
            pdf_failed = True

        # Confidence tier: the renderer accepts Optional[str]; stringify so
        # we do not silently drop int values the engine emits.
        tier_str: Optional[str] = (
            None if confidence_tier is None else str(confidence_tier)
        )

        html_body = render_report_email(
            name=lead_name,
            egfr_baseline=egfr_baseline,
            confidence_tier=tier_str,
            token=report_token,
            pdf_failed=pdf_failed,
        )

        sent_ok = await send_report_email(
            to_email=lead_email,
            html_body=html_body,
            pdf_bytes=pdf_bytes,
        )

        if sent_ok:
            # Per techspec §4.2: even when PDF failed, if the email went out
            # we still set email_sent_at — the outbound side succeeded.
            # Invariant: email_sent_at is gated on Resend success. A template
            # render failure or Resend failure must NOT set this column.
            await _mark_email_sent(report_token)
    except Exception:
        # Any failure in the Resend pipeline (template render, send, etc.)
        # is logged and swallowed — we still need to fire Klaviyo below.
        logger.exception(
            "Resend pipeline failed for prediction %s", prediction_id
        )

    # --- Klaviyo event — independent of Resend outcome ---
    # Fires regardless of PDF/template/Resend success so the warm campaign
    # triggers for every captured lead. Its own try/except so a Klaviyo
    # hiccup cannot escape the fire-and-forget boundary.
    try:
        report_url = f"{PUBLIC_APP_URL}/results/{report_token}"
        await track_prediction_completed(
            email=lead_email,
            name=lead_name,
            prediction_id=prediction_id,
            egfr_baseline=egfr_baseline,
            confidence_tier=confidence_tier,
            report_url=report_url,
            bun=bun,
        )
    except Exception:
        logger.exception(
            "Klaviyo fire failed for prediction %s", prediction_id
        )


@app.post(
    "/leads",
    response_model=LeadCaptureResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Token not found"},
        410: {"model": ErrorResponse, "description": "Token revoked"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"},
    },
    tags=["Prediction"],
)
@limiter.limit("5/minute")
async def capture_lead(request: Request, body: LeadCaptureRequest):
    """LKID-62 — email-gate capture.

    1. Validate the token (404/410).
    2. Upsert the lead (idempotent on email) and link predictions.lead_id.
    3. Kick off the fire-and-forget Resend + Klaviyo pipeline.
    4. Return immediately — email/Klaviyo outcomes do not block.

    Rate limit: 5/min/IP (Jira AC).
    """
    prediction_id, _lead_id = await _upsert_lead_and_link_prediction(
        report_token=body.report_token,
        name=body.name,
        email=body.email,
    )

    # Pull the engine result + egfr_baseline / confidence_tier off the
    # stored prediction so the fire-and-forget task has everything it needs
    # without a second round-trip to the engine.
    pred_row = await _fetch_prediction_by_token(body.report_token)
    result_json = pred_row["result"] or {}
    egfr_baseline = float(result_json.get("egfr_baseline", 0.0))
    confidence_tier = result_json.get("confidence_tier")

    # BUN lives on the stored `inputs` JSON; coerce defensively since
    # JSON drivers can round-trip numerics as Decimal/str.
    inputs_json = pred_row["inputs"] or {}
    bun_raw = inputs_json.get("bun")
    bun: Optional[float]
    try:
        bun = float(bun_raw) if bun_raw is not None else None
    except (TypeError, ValueError):
        bun = None

    asyncio.create_task(
        _send_report_email_task(
            report_token=body.report_token,
            prediction_id=prediction_id,
            lead_email=body.email,
            lead_name=body.name,
            egfr_baseline=egfr_baseline,
            confidence_tier=confidence_tier,
            bun=bun,
        )
    )

    return {
        "ok": True,
        "captured": True,
        "token": body.report_token,
    }


# ---------------------------------------------------------------------------
# 2c. GET /reports/{token}/pdf — In-app PDF download (LKID-62).
# ---------------------------------------------------------------------------


@app.get("/reports/{token}/pdf", tags=["Prediction"])
async def get_report_pdf(token: str):
    """LKID-62 — render the Playwright PDF for a stored prediction.

    The prediction row must exist and not be revoked. The token in the path
    identifies the user; PDF_SECRET is passed to the internal chart route
    as the service-to-service credential.

    Returns `application/pdf` as an inline download (the browser shows it
    in-tab). A 30s Playwright timeout matches the Jira AC; on timeout the
    endpoint returns 504.
    """
    import io

    # Validate the token first — 404/410 before we spend Chromium cycles.
    await _fetch_prediction_by_token(token)

    try:
        pdf_bytes = await _render_pdf_for_token(token)
    except (asyncio.TimeoutError, PlaywrightTimeoutError):
        # Playwright's own TimeoutError is NOT a subclass of asyncio.TimeoutError,
        # so both must be caught explicitly to map 30s renders to the AC-required
        # 504. A generic `except Exception` below would have swallowed the
        # Playwright timeout as a 500.
        logger.warning(
            "PDF render timed out for token_prefix=%s", token[:8]
        )
        raise HTTPException(
            status_code=504,
            detail="PDF rendering timed out. Please try again.",
        )
    except Exception:
        logger.exception(
            "PDF render failed for token_prefix=%s", token[:8]
        )
        raise HTTPException(
            status_code=500,
            detail="PDF rendering failed. Please try again.",
        )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                'inline; filename="kidney-health-report.pdf"'
            ),
        },
    )


# ---------------------------------------------------------------------------
# 3. POST /predict/pdf — Re-run engine + render PDF via Playwright
# ---------------------------------------------------------------------------


@app.post("/predict/pdf", tags=["Prediction"])
@limiter.limit("5/minute")
async def predict_pdf(request: Request, body: PredictRequest):
    """
    Re-run the prediction engine with the same inputs, render the chart
    page via Playwright (headless Chromium), and return the PDF.

    Stateless — does not accept pre-computed results.
    Flow: run engine -> base64-encode results -> Playwright navigates to
    /internal/chart?data={b64}&secret={secret} -> page.pdf() -> return PDF.
    """
    import io

    # 1. Run prediction engine (same as /predict)
    result = predict_for_endpoint(
        bun=body.bun,
        creatinine=body.creatinine,
        age=body.age,
        sex=body.sex,
        potassium=body.potassium,
        hemoglobin=body.hemoglobin,
        co2=body.co2,
        albumin=body.albumin,
        glucose=body.glucose,
    )

    # 2. Encode prediction data for the internal chart page (standard base64)
    payload = json.dumps({"result": result, "bun": body.bun})
    data_b64 = base64.b64encode(payload.encode()).decode()

    # 3. Build internal chart page URL
    chart_url = (
        f"{FRONTEND_INTERNAL_URL}/internal/chart"
        f"?data={data_b64}&secret={PDF_SECRET}"
    )

    # 4. Render PDF via Playwright (try/finally ensures page is always closed)
    page = None
    try:
        browser = await _get_browser()
        page = await browser.new_page(viewport={"width": 1060, "height": 800})
        await page.goto(chart_url, wait_until="networkidle")
        # Wait for the chart to render (the page sets id="pdf-ready" when done)
        await page.wait_for_selector("#pdf-ready", timeout=10000)
        pdf_bytes = await page.pdf(
            format="Letter",
            print_background=True,
            margin={"top": "0.4in", "bottom": "0.4in", "left": "0.3in", "right": "0.3in"},
        )
    except Exception:
        logger.exception("PDF rendering failed")
        raise HTTPException(
            status_code=502,
            detail="PDF rendering failed. Please try again.",
        )
    finally:
        if page:
            await page.close()

    # 5. Return PDF as downloadable file
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=kidneyhood-prediction.pdf",
        },
    )


# ---------------------------------------------------------------------------
# 4. POST /webhooks/clerk — Clerk auth webhook for lead capture
# ---------------------------------------------------------------------------


@app.post("/webhooks/clerk", tags=["Webhooks"])
@limiter.limit("60/minute")
async def clerk_webhook(request: Request):
    """
    Receives `user.created` events from Clerk. Verifies the webhook
    signature via Svix, extracts user data, and inserts a lead row.

    Clerk sends Svix headers: svix-id, svix-timestamp, svix-signature.
    Verification uses the CLERK_WEBHOOK_SECRET env var.
    """
    # ------------------------------------------------------------------
    # 1. Verify webhook signature (Clerk uses Svix under the hood)
    # ------------------------------------------------------------------
    if not CLERK_WEBHOOK_SECRET:
        logger.error("CLERK_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    body = await request.body()

    svix_id = request.headers.get("svix-id")
    svix_timestamp = request.headers.get("svix-timestamp")
    svix_signature = request.headers.get("svix-signature")

    if not all([svix_id, svix_timestamp, svix_signature]):
        raise HTTPException(status_code=400, detail="Missing Svix headers")

    try:
        wh = Webhook(CLERK_WEBHOOK_SECRET)
        payload = wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        })
    except WebhookVerificationError:
        logger.warning("Clerk webhook signature verification failed")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # ------------------------------------------------------------------
    # 2. Only handle user.created events
    # ------------------------------------------------------------------
    event_type = payload.get("type")
    if event_type != "user.created":
        # Acknowledge but ignore other event types
        return {"status": "ignored", "event_type": event_type}

    # ------------------------------------------------------------------
    # 3. Extract user data from Clerk payload
    # ------------------------------------------------------------------
    data = payload.get("data", {})
    clerk_user_id = data.get("id")

    email_addresses = data.get("email_addresses", [])
    email = email_addresses[0].get("email_address") if email_addresses else None

    first_name = data.get("first_name") or ""
    last_name = data.get("last_name") or ""
    name = f"{first_name} {last_name}".strip()

    if not email:
        logger.warning("Clerk user.created event missing email: %s", clerk_user_id)
        raise HTTPException(status_code=422, detail="No email in webhook payload")

    # ------------------------------------------------------------------
    # 4. Insert lead into database
    # ------------------------------------------------------------------
    # Gay Mark will implement insert_lead_from_webhook() in a DB module.
    # For now, import and call the placeholder.
    try:
        from db.leads import insert_lead_from_webhook  # noqa: E402

        await insert_lead_from_webhook(
            email=email,
            name=name or "Unknown",
            clerk_user_id=clerk_user_id,
        )
    except ImportError:
        # DB module not yet implemented — log and continue so the webhook
        # still returns 200 (prevents Clerk from retrying endlessly).
        logger.warning(
            "db.leads module not available; skipping DB insert for %s", email
        )
    except Exception:
        logger.exception("Failed to insert lead from webhook for %s", email)
        raise HTTPException(status_code=500, detail="Failed to store lead")

    logger.info("Clerk user.created processed: %s (%s)", email, clerk_user_id)
    return {"status": "ok", "event_type": "user.created"}


# ---------------------------------------------------------------------------
# 5. GET /leads — Admin-only leads list for CSV export
# ---------------------------------------------------------------------------


@app.get("/leads", tags=["Admin"])
async def list_leads(x_admin_key: str = Header(alias="X-Admin-Key")):
    """
    Returns all leads from the leads table. Internal use only — for manual
    CSV export to feed email campaigns. Protected by admin API key.
    """
    if not ADMIN_API_KEY or x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin API key")

    # --- Placeholder: query leads table ---
    raise HTTPException(
        status_code=501,
        detail="Leads listing not yet implemented.",
    )


# ---------------------------------------------------------------------------
# 6. GET /client/{slug}/metrics — Lee dashboard v2 launch metrics (LKID-75)
#
# HIPAA note: this endpoint serves the Lee dashboard at
# /client/lee-a3f8b2 — the slug itself is a shared-secret path token
# (same pattern as VALID_SLUGS in app/src/app/client/[slug]/page.tsx).
# We mirror that allowlist here rather than inventing a new auth layer.
#
# The response is HIPAA-cautious: email addresses are masked at the
# backend (`j***@d****.com`), raw lab values are never included, and BUN
# readings are bucketed into tier labels only.
# ---------------------------------------------------------------------------

# Slug allowlist — must stay in sync with app/src/app/client/[slug]/page.tsx.
# Extend when additional client dashboards go live.
CLIENT_DASHBOARD_SLUGS = frozenset({"lee-a3f8b2"})

# Minimum prediction count required before we compute/display the opt-in
# percentage. Below this, we surface an explicit "insufficient_data" state
# so Lee doesn't read a wobbly percentage off a tiny denominator.
OPT_IN_MIN_SAMPLE = 10


def _bun_tier_label(bun: Optional[float]) -> str:
    """Bucket a BUN value into one of five tier labels.

    Mirrors `services.klaviyo_service._bun_tier` semantics:
      - None / non-numeric -> "unknown"
      - bun <= 12          -> "<=12"
      - 12 <  bun <= 17    -> "13-17"
      - 17 <  bun <= 24    -> "18-24"
      - bun >  24          -> ">24"

    The `13-17` and `18-24` labels are displayed inclusive for Lee's
    consumption even though the upper boundary is half-open; this keeps
    the labels human-readable without changing the underlying math.
    """
    if bun is None:
        return "unknown"
    try:
        b = float(bun)
    except (TypeError, ValueError):
        return "unknown"
    if b <= 12:
        return "<=12"
    if b <= 17:
        return "13-17"
    if b <= 24:
        return "18-24"
    return ">24"


def _mask_email(email: Optional[str]) -> str:
    """Return a HIPAA-cautious masked email suitable for `/client/*`.

    Format: `<first-local-char>***@<first-domain-char>****.<tld>`.
    Edge cases handled:
      - None / empty / malformed (no `@`)     -> "***"
      - Subdomains (`a.b.example.co.uk`)      -> preserve the final `.xxx`
      - Single-char local/domain parts        -> still emit deterministic mask
      - Missing TLD (`user@localhost`)        -> mask to "l****"

    Never returns any raw character beyond the first of local + first of
    domain + the actual TLD extension. Callers MUST NOT log or persist
    the un-masked email after this function runs.
    """
    if not email or "@" not in email:
        return "***"
    try:
        local, domain = email.rsplit("@", 1)
    except ValueError:
        return "***"
    if not local or not domain:
        return "***"

    local_mask = f"{local[0]}***"

    # TLD is the last dot-segment; strip it off for the domain mask so the
    # extension stays visible (`j***@d****.com`). If there's no dot, the
    # whole domain collapses to the masked-first-char form.
    if "." in domain:
        domain_base, tld = domain.rsplit(".", 1)
        base_first = domain_base[0] if domain_base else ""
        domain_mask = f"{base_first}****.{tld}"
    else:
        domain_mask = f"{domain[0]}****"

    return f"{local_mask}@{domain_mask}"


def _name_initial(name: Optional[str]) -> str:
    """Return the first character of `name` uppercased, or "?" if empty."""
    if not name:
        return "?"
    first = name.strip()[:1]
    return first.upper() if first else "?"


@app.get(
    "/client/{slug}/metrics",
    tags=["Client Dashboard"],
    responses={
        404: {"model": ErrorResponse, "description": "Unknown client slug"},
        503: {"model": ErrorResponse, "description": "Database not configured"},
    },
)
async def client_dashboard_metrics(slug: str):
    """LKID-75 — launch-metrics panels for the Lee dashboard.

    DB-driven metrics only. PostHog / Klaviyo / PDF metrics are stubbed on
    the frontend until the env vars land (Brad-hands backlog).

    Auth: the slug itself is the shared secret (same as the existing
    dashboard page). Unknown slugs 404.
    """
    if slug not in CLIENT_DASHBOARD_SLUGS:
        raise HTTPException(status_code=404, detail="Unknown client dashboard")
    if async_session is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    async with async_session() as session:
        # --- Prediction counts (total / 7d / 24h) -----------------------------
        pred_counts_row = (
            await session.execute(
                text(
                    """
                    SELECT
                        COUNT(*)                                                     AS total,
                        COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')  AS last_7d,
                        COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS last_24h
                    FROM predictions
                    """
                )
            )
        ).mappings().first() or {}

        # --- Lead counts (total / 7d / 24h) -----------------------------------
        lead_counts_row = (
            await session.execute(
                text(
                    """
                    SELECT
                        COUNT(*)                                                     AS total,
                        COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')  AS last_7d,
                        COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS last_24h
                    FROM leads
                    """
                )
            )
        ).mappings().first() or {}

        # --- BUN tier distribution (all predictions) -------------------------
        # Bucket in Python for clarity; at Lee's scale (low-thousands) the
        # whole-table scan is trivially cheap and we avoid a finicky CASE
        # expression against JSONB.
        bun_rows = (
            await session.execute(
                text(
                    """
                    SELECT inputs ->> 'bun' AS bun_raw
                    FROM predictions
                    """
                )
            )
        ).mappings().all()

        bun_distribution: dict[str, int] = {
            "<=12": 0,
            "13-17": 0,
            "18-24": 0,
            ">24": 0,
            "unknown": 0,
        }
        for r in bun_rows:
            raw = r.get("bun_raw")
            try:
                tier = _bun_tier_label(float(raw)) if raw is not None else "unknown"
            except (TypeError, ValueError):
                tier = "unknown"
            bun_distribution[tier] = bun_distribution.get(tier, 0) + 1

        # --- Predictions per day — last 7 days (for sparkline) ----------------
        # generate_series gives us a zero-filled calendar so the frontend
        # doesn't have to patch holes.
        pred_daily_rows = (
            await session.execute(
                text(
                    """
                    SELECT
                        to_char(d.day, 'YYYY-MM-DD')                         AS day,
                        COUNT(p.id)                                          AS n
                    FROM generate_series(
                        date_trunc('day', now()) - interval '6 days',
                        date_trunc('day', now()),
                        interval '1 day'
                    ) AS d(day)
                    LEFT JOIN predictions p
                           ON date_trunc('day', p.created_at) = d.day
                    GROUP BY d.day
                    ORDER BY d.day
                    """
                )
            )
        ).mappings().all()
        predictions_per_day = [
            {"day": row["day"], "count": int(row["n"] or 0)}
            for row in pred_daily_rows
        ]

        # --- Recent leads (latest 10) ----------------------------------------
        # DISTINCT ON (l.id) guards against the re-submit case where a
        # single lead links multiple predictions (the upsert in POST /leads
        # is keyed on email). We pick the most recent linked prediction's
        # inputs to derive the tier; Clerk-webhook leads with no prediction
        # fall through with NULL -> "unknown".
        recent_leads_rows = (
            await session.execute(
                text(
                    """
                    WITH latest_pred AS (
                        SELECT DISTINCT ON (p.lead_id)
                            p.lead_id,
                            p.inputs ->> 'bun' AS bun_raw
                        FROM predictions p
                        WHERE p.lead_id IS NOT NULL
                        ORDER BY p.lead_id, p.created_at DESC
                    )
                    SELECT
                        l.created_at,
                        l.name,
                        l.email,
                        lp.bun_raw
                    FROM leads l
                    LEFT JOIN latest_pred lp ON lp.lead_id = l.id
                    ORDER BY l.created_at DESC
                    LIMIT 10
                    """
                )
            )
        ).mappings().all()

    # ----- Build JSON response ------------------------------------------------
    predictions_total = int(pred_counts_row.get("total") or 0)
    predictions_7d = int(pred_counts_row.get("last_7d") or 0)
    predictions_24h = int(pred_counts_row.get("last_24h") or 0)

    leads_total = int(lead_counts_row.get("total") or 0)
    leads_7d = int(lead_counts_row.get("last_7d") or 0)
    leads_24h = int(lead_counts_row.get("last_24h") or 0)

    # Opt-in rate gated on OPT_IN_MIN_SAMPLE; below the gate we return an
    # explicit `visible: false` with a machine-readable reason so the
    # frontend can render a friendly "insufficient data" message without
    # guessing at the numeric state.
    if predictions_total < OPT_IN_MIN_SAMPLE:
        opt_in_rate = {
            "percent": None,
            "visible": False,
            "reason": "insufficient_data",
            "min_sample": OPT_IN_MIN_SAMPLE,
        }
    else:
        # Guarded above — `predictions_total >= OPT_IN_MIN_SAMPLE >= 10`.
        percent = round((leads_total / predictions_total) * 100, 1)
        opt_in_rate = {
            "percent": percent,
            "visible": True,
            "reason": None,
            "min_sample": OPT_IN_MIN_SAMPLE,
        }

    recent_leads = []
    for row in recent_leads_rows:
        created_at = row.get("created_at")
        recent_leads.append(
            {
                "created_at": (
                    created_at.isoformat() if created_at else None
                ),
                "name_initial": _name_initial(row.get("name")),
                "email_masked": _mask_email(row.get("email")),
                "bun_tier": _bun_tier_label(row.get("bun_raw")),
            }
        )

    from datetime import datetime as _dt, timezone as _tz

    return {
        "generated_at": _dt.now(_tz.utc).isoformat(),
        "predictions": {
            "total": predictions_total,
            "last_7d": predictions_7d,
            "last_24h": predictions_24h,
        },
        "leads": {
            "total": leads_total,
            "last_7d": leads_7d,
            "last_24h": leads_24h,
        },
        "opt_in_rate": opt_in_rate,
        "bun_tier_distribution": bun_distribution,
        "predictions_per_day": predictions_per_day,
        "recent_leads": recent_leads,
    }
