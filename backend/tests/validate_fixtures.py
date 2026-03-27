#!/usr/bin/env python3
"""
Fixture validation script — LKID-57.

Imports all factory functions, generates one of each fixture type,
and validates each against the Pydantic models. Exits with code 1
if any fixture fails validation.

Usage:
    python backend/tests/validate_fixtures.py

Can be added to CI as a step after `alembic upgrade head` to catch
stale fixtures when schema changes.
"""

import sys
import os

# Add backend/ to the Python path so imports work from repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from tests.fixtures.factories import (
    make_lab_entry,
    make_lab_entry_at_max,
    make_lab_entry_at_min,
    make_lab_entry_invalid,
    make_lead,
    make_predict_request,
    make_predict_request_at_max,
    make_predict_request_at_min,
    make_tier1_entry,
    make_tier2_entry,
)

# Import Pydantic models from the FastAPI app
from main import PredictRequest


def validate_predict_request(data: dict, label: str) -> bool:
    """Validate a dict against PredictRequest. Returns True if valid."""
    try:
        PredictRequest(**data)
        print(f"  PASS: {label}")
        return True
    except Exception as e:
        print(f"  FAIL: {label} -- {e}")
        return False


def validate_lab_entry_ranges(data: dict, label: str) -> bool:
    """Validate lab entry values against DB CHECK constraints.

    DB constraints (from Alembic 001):
      - age:        18 <= age <= 120
      - bun:        5 <= bun <= 150
      - creatinine: 0.3 <= creatinine <= 15.0
    """
    errors = []

    age = data.get("age")
    if age is not None and not (18 <= age <= 120):
        errors.append(f"age={age} outside [18, 120]")

    bun = data.get("bun")
    if bun is not None and not (5 <= bun <= 150):
        errors.append(f"bun={bun} outside [5, 150]")

    creatinine = data.get("creatinine")
    if creatinine is not None and not (0.3 <= creatinine <= 15.0):
        errors.append(f"creatinine={creatinine} outside [0.3, 15.0]")

    if errors:
        print(f"  FAIL: {label} -- {'; '.join(errors)}")
        return False
    else:
        print(f"  PASS: {label}")
        return True


def validate_lead(data: dict, label: str) -> bool:
    """Validate a lead dict has all required fields with correct types."""
    required_fields = {
        "id": str,
        "email": str,
        "name": str,
        "age": int,
        "bun": (int, float),
        "creatinine": (int, float),
        "created_at": str,
    }
    errors = []

    for field, expected_type in required_fields.items():
        if field not in data:
            errors.append(f"missing field '{field}'")
        elif not isinstance(data[field], expected_type):
            errors.append(
                f"'{field}' expected {expected_type}, got {type(data[field]).__name__}"
            )

    # egfr_baseline is nullable
    if "egfr_baseline" not in data:
        errors.append("missing field 'egfr_baseline'")

    if errors:
        print(f"  FAIL: {label} -- {'; '.join(errors)}")
        return False
    else:
        print(f"  PASS: {label}")
        return True


def main() -> int:
    """Run all fixture validations. Returns 0 on success, 1 on failure."""
    all_passed = True

    print("=" * 60)
    print("KidneyHood Fixture Validation")
    print("=" * 60)

    # ------------------------------------------------------------------
    # 1. Lab entry factories against DB CHECK constraints
    # ------------------------------------------------------------------
    print("\n--- Lab Entry Factories (DB CHECK constraints) ---")

    lab = make_lab_entry()
    all_passed &= validate_lab_entry_ranges(lab, "make_lab_entry()")

    lab_min = make_lab_entry_at_min()
    all_passed &= validate_lab_entry_ranges(lab_min, "make_lab_entry_at_min()")

    lab_max = make_lab_entry_at_max()
    all_passed &= validate_lab_entry_ranges(lab_max, "make_lab_entry_at_max()")

    tier1 = make_tier1_entry()
    all_passed &= validate_lab_entry_ranges(tier1, "make_tier1_entry()")

    tier2 = make_tier2_entry()
    all_passed &= validate_lab_entry_ranges(tier2, "make_tier2_entry()")

    # ------------------------------------------------------------------
    # 2. Invalid entry should fail constraints (meta-test)
    # ------------------------------------------------------------------
    print("\n--- Invalid Entry Meta-Tests (should FAIL constraints) ---")

    invalid_age = make_lab_entry_invalid("age", 10)
    result = validate_lab_entry_ranges(invalid_age, "make_lab_entry_invalid('age', 10)")
    if result:
        print("  ERROR: Invalid entry passed validation -- meta-test failed")
        all_passed = False
    else:
        print("  META-PASS: Invalid entry correctly rejected")

    invalid_bun = make_lab_entry_invalid("bun", -1)
    result = validate_lab_entry_ranges(invalid_bun, "make_lab_entry_invalid('bun', -1)")
    if result:
        print("  ERROR: Invalid entry passed validation -- meta-test failed")
        all_passed = False
    else:
        print("  META-PASS: Invalid entry correctly rejected")

    # ------------------------------------------------------------------
    # 3. PredictRequest factories against Pydantic model
    # ------------------------------------------------------------------
    print("\n--- PredictRequest Factories (Pydantic validation) ---")

    req = make_predict_request()
    all_passed &= validate_predict_request(req, "make_predict_request()")

    req_min = make_predict_request_at_min()
    all_passed &= validate_predict_request(req_min, "make_predict_request_at_min()")

    req_max = make_predict_request_at_max()
    all_passed &= validate_predict_request(req_max, "make_predict_request_at_max()")

    # Tier 2 entry should also validate as PredictRequest (has all required + optional)
    tier2_req = make_tier2_entry()
    all_passed &= validate_predict_request(tier2_req, "make_tier2_entry() as PredictRequest")

    # ------------------------------------------------------------------
    # 4. Lead factories against expected schema
    # ------------------------------------------------------------------
    print("\n--- Lead Factories (schema validation) ---")

    lead = make_lead()
    all_passed &= validate_lead(lead, "make_lead()")

    lead_custom = make_lead(email="custom@test.com", age=70)
    all_passed &= validate_lead(lead_custom, "make_lead(email=..., age=70)")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    if all_passed:
        print("ALL FIXTURES VALID")
        return 0
    else:
        print("FIXTURE VALIDATION FAILED -- see errors above")
        return 1


if __name__ == "__main__":
    sys.exit(main())
