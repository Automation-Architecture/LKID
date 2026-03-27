"""
KidneyHood Prediction API — FastAPI scaffold for Sprint 2.

Minimal working app with:
- Health endpoint
- CORS middleware
- Async SQLAlchemy database connection
- POST /predict with CKD-EPI 2021 eGFR + placeholder trajectories (LKID-15)
- slowapi rate limiting on /predict and /webhooks/clerk
- Approved error envelope (Decision #9)

Donaldson drops the prediction engine into predict() and predict_pdf().
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import Literal, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from svix.webhooks import Webhook, WebhookVerificationError

from prediction.engine import predict_for_endpoint

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
# Rate Limiter
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify DB connection
    if engine:
        async with engine.begin() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    yield
    # Shutdown: dispose engine
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
        content={
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Too many requests. Please try again later.",
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
# Schemas (Pydantic) — LKID-15 enhanced request/response models
# ---------------------------------------------------------------------------


class PredictRequest(BaseModel):
    """Prediction request body — guest inline mode (LKID-15).

    Required fields: bun, creatinine, potassium, age, sex.
    Optional fields unlock Tier 2 confidence: hemoglobin AND glucose.
    """

    bun: float = Field(
        ..., ge=5, le=150, description="Blood Urea Nitrogen mg/dL"
    )
    creatinine: float = Field(
        ..., ge=0.3, le=15.0, description="Serum Creatinine mg/dL"
    )
    potassium: float = Field(
        ..., ge=2.0, le=8.0, description="Potassium mEq/L"
    )
    age: int = Field(..., ge=18, le=120, description="Patient age in years")
    sex: Literal["male", "female", "unknown"] = Field(
        ..., description="Biological sex"
    )
    hemoglobin: Optional[float] = Field(
        None, ge=4.0, le=20.0, description="Hemoglobin g/dL"
    )
    glucose: Optional[float] = Field(
        None, ge=40, le=500, description="Fasting Glucose mg/dL"
    )

    # Lead capture fields (optional)
    name: Optional[str] = Field(
        None, max_length=200, description="Patient name for lead capture"
    )
    email: Optional[EmailStr] = Field(
        None, description="Patient email for lead capture"
    )


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


class PredictResponse(BaseModel):
    """POST /predict response — LKID-15 enhanced shape."""

    egfr_baseline: float
    confidence_tier: int  # 1, 2, or 3
    trajectories: Trajectories
    time_points_months: list[int]
    dial_ages: DialAges
    dialysis_threshold: float  # always 12.0
    stat_cards: dict[str, float]


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
@limiter.limit("30/minute")
async def predict(request: Request, body: PredictRequest):
    """
    Run the CKD-EPI 2021 eGFR calculation and 4-trajectory prediction engine.

    Returns baseline eGFR, confidence tier, 4 trajectory paths (15 time points
    each), dial_ages per trajectory, dialysis threshold, and stat cards.

    Potassium is validated but does not affect engine output (per spec).
    Hemoglobin + glucose together unlock Tier 2 confidence.

    Engine coefficients are server-side only — never exposed in responses.
    """
    return predict_for_endpoint(
        bun=body.bun,
        creatinine=body.creatinine,
        potassium=body.potassium,
        age=body.age,
        sex=body.sex,
        hemoglobin=body.hemoglobin,
        glucose=body.glucose,
    )


# ---------------------------------------------------------------------------
# 3. POST /predict/pdf — Re-run engine + render PDF via Playwright
# ---------------------------------------------------------------------------


@app.post("/predict/pdf", tags=["Prediction"])
@limiter.limit("10/minute")
async def predict_pdf(request: Request, body: PredictRequest):
    """
    Re-run the prediction engine with the same inputs, render the chart
    page via Playwright (headless Chromium), and return the PDF.

    Stateless — does not accept pre-computed results.

    TODO (Donaldson): Wire up prediction engine.
    TODO (Harshit): Wire up Playwright PDF rendering.
    """
    raise HTTPException(
        status_code=501,
        detail="PDF generation not yet implemented.",
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
            session_factory=async_session,
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
