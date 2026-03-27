"""
Shared test fixture factories for KidneyHood backend.

Produces valid test data matching the current Alembic schema and API contract.
Each factory supports keyword overrides with sensible defaults.

Usage:
    from backend.tests.fixtures.factories import create_predict_request, create_lab_entry

    # Default valid patient
    req = create_predict_request()

    # Override specific fields
    req = create_predict_request(age=85, bun=60, sex="female")

    # Generate a lead record
    lead = create_lead()
"""

import random
import string
import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional


# ---------------------------------------------------------------------------
# CKD stage profiles — realistic lab value combinations
# ---------------------------------------------------------------------------

CKD_STAGE_PROFILES = {
    "stage_3a": {
        "egfr_range": (45, 59),
        "bun_range": (20, 40),
        "creatinine_range": (1.2, 2.0),
        "description": "CKD Stage 3a: eGFR 45-59",
    },
    "stage_3b": {
        "egfr_range": (30, 44),
        "bun_range": (25, 55),
        "creatinine_range": (1.8, 3.5),
        "description": "CKD Stage 3b: eGFR 30-44",
    },
    "stage_4": {
        "egfr_range": (15, 29),
        "bun_range": (35, 70),
        "creatinine_range": (3.0, 6.0),
        "description": "CKD Stage 4: eGFR 15-29",
    },
    "stage_5": {
        "egfr_range": (5, 14),
        "bun_range": (50, 100),
        "creatinine_range": (5.0, 12.0),
        "description": "CKD Stage 5: eGFR <15",
    },
}

# Boundary eGFR values for edge case testing
BOUNDARY_EGFR_VALUES = [12.0, 14.9, 15.0, 15.1, 29.9, 30.0, 44.9, 45.0, 59.9, 60.0]


def _random_string(length: int = 8) -> str:
    """Generate a random lowercase string."""
    return "".join(random.choices(string.ascii_lowercase, k=length))


def _random_email() -> str:
    """Generate a unique random email address."""
    return f"test.{_random_string(6)}@example.com"


def _random_name() -> str:
    """Generate a random patient name."""
    first_names = [
        "Alice", "Bob", "Carol", "David", "Eve", "Frank", "Grace",
        "Hank", "Iris", "Jack", "Kate", "Leo", "Mia", "Noah",
    ]
    last_names = [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
        "Miller", "Davis", "Rodriguez", "Martinez", "Wilson", "Taylor",
    ]
    return f"{random.choice(first_names)} {random.choice(last_names)}"


# ---------------------------------------------------------------------------
# Factory: PredictRequest payload
# ---------------------------------------------------------------------------


def create_predict_request(**overrides: Any) -> dict:
    """Create a valid POST /predict request body.

    Matches the PredictRequest Pydantic model in main.py.
    All values stay within validated ranges.

    Args:
        **overrides: Any field to override (bun, creatinine, potassium, age,
                     sex, hemoglobin, glucose, name, email).

    Returns:
        Dict matching PredictRequest schema.
    """
    defaults: dict[str, Any] = {
        "bun": round(random.uniform(10, 80), 1),
        "creatinine": round(random.uniform(0.5, 10.0), 2),
        "potassium": round(random.uniform(3.5, 5.5), 1),
        "age": random.randint(25, 90),
        "sex": random.choice(["male", "female", "unknown"]),
    }

    # Optionally include Tier 2 fields (~40% of the time by default)
    if overrides.get("hemoglobin") is not None or random.random() < 0.4:
        defaults["hemoglobin"] = round(random.uniform(8.0, 17.0), 1)
    if overrides.get("glucose") is not None or random.random() < 0.4:
        defaults["glucose"] = round(random.uniform(70, 200), 0)

    # Optionally include lead capture fields (~30% of the time)
    if overrides.get("name") is not None or random.random() < 0.3:
        defaults["name"] = _random_name()
    if overrides.get("email") is not None or random.random() < 0.3:
        defaults["email"] = _random_email()

    defaults.update(overrides)
    return defaults


def create_predict_request_for_stage(
    stage: Literal["stage_3a", "stage_3b", "stage_4", "stage_5"],
    **overrides: Any,
) -> dict:
    """Create a predict request with lab values typical for a CKD stage.

    Uses creatinine and BUN ranges that would produce eGFR values in the
    expected range for the given CKD stage.
    """
    profile = CKD_STAGE_PROFILES[stage]
    stage_defaults = {
        "bun": round(random.uniform(*profile["bun_range"]), 1),
        "creatinine": round(random.uniform(*profile["creatinine_range"]), 2),
    }
    stage_defaults.update(overrides)
    return create_predict_request(**stage_defaults)


def create_predict_request_boundary(
    egfr_boundary: float = 12.0,
    **overrides: Any,
) -> dict:
    """Create a predict request near a clinically significant eGFR boundary.

    Useful for testing dial_age calculations near the dialysis threshold (12)
    or CKD stage transitions.
    """
    # Use age=60 and pick creatinine that gives roughly the target eGFR
    # CKD-EPI 2021 for male, age 60: eGFR ~ 142 * (Scr/0.9)^-1.2 * 0.9938^60
    # Rough inverse: higher creatinine = lower eGFR
    age = overrides.pop("age", 60)
    sex = overrides.pop("sex", "male")

    # Approximate creatinine for target eGFR (rough inverse of CKD-EPI)
    if egfr_boundary < 15:
        creatinine = round(random.uniform(5.0, 8.0), 2)
    elif egfr_boundary < 30:
        creatinine = round(random.uniform(3.0, 5.0), 2)
    elif egfr_boundary < 45:
        creatinine = round(random.uniform(1.8, 3.0), 2)
    elif egfr_boundary < 60:
        creatinine = round(random.uniform(1.2, 1.8), 2)
    else:
        creatinine = round(random.uniform(0.5, 1.2), 2)

    return create_predict_request(
        age=age, sex=sex, creatinine=creatinine, **overrides
    )


# ---------------------------------------------------------------------------
# Factory: Lab entry (for POST /lab-entries load testing)
# ---------------------------------------------------------------------------


def create_lab_entry(**overrides: Any) -> dict:
    """Create a valid lab entry record.

    Represents a single patient visit with lab values.
    """
    defaults: dict[str, Any] = {
        "patient_id": str(uuid.uuid4()),
        "visit_date": datetime.now(timezone.utc).isoformat(),
        "bun": round(random.uniform(10, 80), 1),
        "creatinine": round(random.uniform(0.5, 10.0), 2),
        "potassium": round(random.uniform(3.5, 5.5), 1),
        "age": random.randint(25, 90),
        "sex": random.choice(["male", "female", "unknown"]),
        "hemoglobin": round(random.uniform(8.0, 17.0), 1),
        "glucose": round(random.uniform(70, 200), 0),
    }
    defaults.update(overrides)
    return defaults


def create_lab_entry_series(
    patient_id: Optional[str] = None,
    visit_count: int = 3,
    **overrides: Any,
) -> list[dict]:
    """Create a series of lab entries for the same patient over time.

    Simulates longitudinal data with slight variation between visits.
    """
    pid = patient_id or str(uuid.uuid4())
    base_bun = overrides.pop("bun", round(random.uniform(15, 60), 1))
    base_creatinine = overrides.pop(
        "creatinine", round(random.uniform(1.0, 5.0), 2)
    )
    base_age = overrides.pop("age", random.randint(30, 80))
    sex = overrides.pop("sex", random.choice(["male", "female", "unknown"]))

    entries = []
    for i in range(visit_count):
        # Slight variation per visit (disease progression)
        entry = create_lab_entry(
            patient_id=pid,
            bun=round(base_bun + random.uniform(-3, 5) * i, 1),
            creatinine=round(base_creatinine + random.uniform(-0.2, 0.3) * i, 2),
            age=base_age + i,  # one year between visits
            sex=sex,
            **overrides,
        )
        entries.append(entry)
    return entries


# ---------------------------------------------------------------------------
# Factory: Lead record (matches Alembic leads table)
# ---------------------------------------------------------------------------


def create_lead(**overrides: Any) -> dict:
    """Create a valid lead record matching the leads table schema.

    Fields match 001_create_leads_table.py migration.
    """
    defaults: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "email": _random_email(),
        "name": _random_name(),
        "age": random.randint(18, 100),
        "bun": round(random.uniform(5, 100), 1),
        "creatinine": round(random.uniform(0.3, 15.0), 2),
        "egfr_baseline": round(random.uniform(5, 90), 1),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    defaults.update(overrides)
    return defaults
