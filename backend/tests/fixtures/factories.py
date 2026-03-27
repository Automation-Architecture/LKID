"""
Factory functions for KidneyHood test fixtures.

All defaults match the DB CHECK constraints (Alembic 001_create_leads_table)
and Pydantic validation ranges in main.py PredictRequest (LKID-15 enhanced).

DB constraints (leads table):
  - age:        INTEGER, 18 <= age <= 120
  - bun:        NUMERIC, 5 <= bun <= 150
  - creatinine: NUMERIC, 0.3 <= creatinine <= 15.0

Pydantic PredictRequest constraints (current main.py):
  - bun:        float, ge=5, le=100
  - creatinine: float, ge=0.1, le=25.0
  - potassium:  float, ge=2.0, le=8.0
  - age:        int, ge=18, le=120
  - sex:        Literal["male", "female", "unknown"]
  - hemoglobin: Optional[float], ge=3.0, le=25.0
  - glucose:    Optional[float], ge=20, le=600
  - name:       Optional[str], max_length=200
  - email:      Optional[EmailStr]

Tier definitions (per Decision #12):
  - Tier 1: bun, creatinine, potassium, age, sex (required fields)
  - Tier 2: Tier 1 + hemoglobin AND glucose (both must be present)
"""

import uuid
from datetime import datetime, timezone
from typing import Any


# ---------------------------------------------------------------------------
# Defaults — midrange values that pass all validation
# ---------------------------------------------------------------------------

_LAB_DEFAULTS: dict[str, Any] = {
    "bun": 35.0,
    "creatinine": 2.1,
    "potassium": 4.5,
    "age": 58,
    "sex": "male",
}

_LEAD_DEFAULTS: dict[str, Any] = {
    "id": None,  # generated per call
    "email": "testpatient@example.com",
    "name": "Test Patient",
    "age": 58,
    "bun": 35.0,
    "creatinine": 2.1,
    "egfr_baseline": 33.0,
    "created_at": None,  # generated per call
}

_PREDICT_REQUEST_DEFAULTS: dict[str, Any] = {
    "bun": 35.0,
    "creatinine": 2.1,
    "potassium": 4.5,
    "age": 58,
    "sex": "male",
    "hemoglobin": None,
    "glucose": None,
    "name": "Test Patient",
    "email": "testpatient@example.com",
}

# Tier 2 optional fields — both required together per Decision #12
_TIER2_EXTRAS: dict[str, Any] = {
    "hemoglobin": 12.5,  # g/dL, typical CKD range
    "glucose": 100.0,    # mg/dL, fasting normal
}


# ---------------------------------------------------------------------------
# Core factory: make_lab_entry
# ---------------------------------------------------------------------------


def make_lab_entry(**overrides: Any) -> dict[str, Any]:
    """Return a valid lab entry dict with defaults for all fields.

    Contains the core lab fields: bun, creatinine, potassium, age, sex.
    Accepts arbitrary overrides to customize any field.

    Example:
        entry = make_lab_entry(age=85, bun=50)
    """
    entry = {**_LAB_DEFAULTS, **overrides}
    return entry


# ---------------------------------------------------------------------------
# Boundary value helpers
# ---------------------------------------------------------------------------


def make_lab_entry_at_min() -> dict[str, Any]:
    """Return a lab entry at minimum valid boundaries.

    Uses the intersection of DB CHECK and Pydantic constraints:
      age=18, bun=5, creatinine=0.3 (DB min), potassium=2.0
    Note: Pydantic creatinine min is 0.1, DB min is 0.3. We use 0.3
    (the stricter DB constraint) for lab entries.
    """
    return make_lab_entry(
        age=18,
        bun=5.0,
        creatinine=0.3,
        potassium=2.0,
        sex="female",
    )


def make_lab_entry_at_max() -> dict[str, Any]:
    """Return a lab entry at maximum valid boundaries.

    Uses the intersection of DB CHECK and Pydantic constraints:
      age=120, bun=100 (Pydantic max), creatinine=15.0 (DB max), potassium=8.0
    Note: DB bun max is 150, Pydantic max is 100. We use 100 for API tests.
    """
    return make_lab_entry(
        age=120,
        bun=100.0,
        creatinine=15.0,
        potassium=8.0,
        sex="male",
    )


def make_lab_entry_invalid(field: str, value: Any) -> dict[str, Any]:
    """Return a lab entry with one specific field set to an invalid value.

    Example:
        invalid = make_lab_entry_invalid("age", 10)       # below min of 18
        invalid = make_lab_entry_invalid("bun", -1)        # below min of 5
        invalid = make_lab_entry_invalid("potassium", 0.5) # below min of 2.0
    """
    return make_lab_entry(**{field: value})


# ---------------------------------------------------------------------------
# Tier helpers
# ---------------------------------------------------------------------------


def make_tier1_entry(**overrides: Any) -> dict[str, Any]:
    """Return a Tier 1 lab entry (bun, creatinine, potassium, age, sex).

    Tier 1 uses only the required fields. hemoglobin and glucose are
    explicitly absent (or None).
    """
    entry = make_lab_entry(**overrides)
    entry.pop("hemoglobin", None)
    entry.pop("glucose", None)
    return entry


def make_tier2_entry(**overrides: Any) -> dict[str, Any]:
    """Return a Tier 2 lab entry (Tier 1 + hemoglobin AND glucose).

    Per Decision #12, Tier 2 requires BOTH hemoglobin and glucose.
    If only one is provided, the confidence tier stays at 1.

    Example:
        entry = make_tier2_entry(hemoglobin=10.0, glucose=130.0)
    """
    base = {**_LAB_DEFAULTS, **_TIER2_EXTRAS}
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# PredictRequest factory
# ---------------------------------------------------------------------------


def make_predict_request(**overrides: Any) -> dict[str, Any]:
    """Return a valid PredictRequest-shaped dict.

    Matches the Pydantic PredictRequest model in main.py (LKID-15):
      Required: bun, creatinine, potassium, age, sex
      Optional: hemoglobin, glucose, name, email

    Example:
        req = make_predict_request(bun=50, email="other@example.com")
    """
    request = {**_PREDICT_REQUEST_DEFAULTS, **overrides}
    return request


def make_predict_request_at_min() -> dict[str, Any]:
    """PredictRequest at minimum valid Pydantic boundaries."""
    return make_predict_request(
        bun=5.0,
        creatinine=0.1,
        potassium=2.0,
        age=18,
        sex="unknown",
    )


def make_predict_request_at_max() -> dict[str, Any]:
    """PredictRequest at maximum valid Pydantic boundaries."""
    return make_predict_request(
        bun=100.0,
        creatinine=25.0,
        potassium=8.0,
        age=120,
        sex="female",
        hemoglobin=25.0,
        glucose=600.0,
    )


# ---------------------------------------------------------------------------
# Lead (DB row) factory
# ---------------------------------------------------------------------------


def make_lead(**overrides: Any) -> dict[str, Any]:
    """Return a valid leads table row dict.

    Generates a fresh UUID and created_at timestamp per call unless
    overridden. Matches the Alembic 001 schema exactly.

    Example:
        lead = make_lead(email="custom@example.com", age=70)
    """
    lead = {**_LEAD_DEFAULTS, **overrides}

    # Generate dynamic defaults if not overridden
    if lead["id"] is None:
        lead["id"] = str(uuid.uuid4())
    if lead["created_at"] is None:
        lead["created_at"] = datetime.now(timezone.utc).isoformat()

    return lead
