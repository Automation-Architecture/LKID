"""
KidneyHood Prediction API — FastAPI scaffold for Sprint 2.

Minimal working app with:
- Health endpoint
- CORS middleware
- Async SQLAlchemy database connection
- Placeholder routes for all 5 endpoints from the API contract
- slowapi rate limiting on /predict and /webhooks/clerk

Donaldson drops the prediction engine into predict() and predict_pdf().
"""

import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

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

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

engine = create_async_engine(DATABASE_URL, echo=False) if DATABASE_URL else None
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False) if engine else None


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


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "RATE_LIMIT",
                "message": "Rate limit exceeded. Please try again later.",
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
# Schemas (Pydantic)
# ---------------------------------------------------------------------------


class PredictRequest(BaseModel):
    bun: float = Field(..., ge=5, le=150, description="Blood Urea Nitrogen (mg/dL)")
    creatinine: float = Field(..., ge=0.3, le=15.0, description="Serum Creatinine (mg/dL)")
    age: int = Field(..., ge=18, le=100, description="Patient age in years")
    name: Optional[str] = Field(None, max_length=200, description="Patient name for lead capture")
    email: Optional[EmailStr] = Field(None, description="Patient email for lead capture")


class Trajectories(BaseModel):
    no_treatment: list[float]
    bun_18_24: list[float]
    bun_13_17: list[float]
    bun_12: list[float]


class DialAges(BaseModel):
    no_treatment: Optional[float]
    bun_18_24: Optional[float]
    bun_13_17: Optional[float]
    bun_12: Optional[float]


class PredictResponse(BaseModel):
    egfr_baseline: float
    time_points_months: list[int]
    trajectories: Trajectories
    dial_ages: DialAges
    bun_suppression_estimate: float


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Optional[list[ErrorDetail]] = None


class ErrorResponse(BaseModel):
    error: ErrorBody


# ---------------------------------------------------------------------------
# 1. GET /health — Infrastructure health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["Infrastructure"])
async def health():
    """Health check for Railway zero-downtime deploys."""
    return {"status": "ok", "version": "2.0.0"}


# ---------------------------------------------------------------------------
# 2. POST /predict — Run prediction engine + capture lead
# ---------------------------------------------------------------------------


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
@limiter.limit("30/minute")
async def predict(request: Request, body: PredictRequest):
    """
    Run the prediction engine. Returns 4 trajectory paths (15 time points
    each), dial_ages per trajectory, and bun_suppression_estimate.

    Lead is captured in the leads table if name and email are provided.

    TODO (Donaldson): Drop prediction engine logic here.
    """
    # --- Placeholder: prediction engine goes here ---
    raise HTTPException(
        status_code=501,
        detail="Prediction engine not yet implemented. Awaiting Donaldson's rules engine.",
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
async def clerk_webhook(request: Request):
    """
    Receives `user.created` events from Clerk. Extracts email and pipes
    to the leads table. Verified via Clerk webhook signing secret (svix).

    TODO: Implement svix signature verification.
    TODO: Extract email from payload and insert into leads table.
    """
    # --- Placeholder: webhook verification + lead capture ---
    raise HTTPException(
        status_code=501,
        detail="Clerk webhook handler not yet implemented.",
    )


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
