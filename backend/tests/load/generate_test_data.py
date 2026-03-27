#!/usr/bin/env python3
"""
k6 Test Data Generator — LKID-58

Generates N unique patient records with realistic lab values for k6 load
testing. Output is a JSON file consumable by k6's SharedArray.

Usage:
    python backend/tests/load/generate_test_data.py --count 500 --output test_data.json
    python backend/tests/load/generate_test_data.py --count 100 --output test_data.json --seed 42

The generated dataset covers:
- All 4 CKD stages (3a, 3b, 4, 5) with proportional distribution
- Boundary eGFR values near dialysis threshold (12) and stage transitions
- Patients with varying visit counts (1-5)
- Mix of Tier 1 and Tier 2 confidence (with/without hemoglobin + glucose)
- Edge cases: minimum/maximum age, extreme BUN/creatinine values

Output format:
    {
        "predict_payloads": [...],     // For POST /predict load test
        "lab_entry_payloads": [...],   // For POST /lab-entries load test
        "metadata": {
            "count": 500,
            "generated_at": "...",
            "seed": 42,
            "distribution": { ... }
        }
    }
"""

import argparse
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Add the backend root to sys.path so we can import the factories
_backend_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_backend_root))

from tests.fixtures.factories import (  # noqa: E402
    BOUNDARY_EGFR_VALUES,
    CKD_STAGE_PROFILES,
    create_lab_entry,
    create_lab_entry_series,
    create_predict_request,
    create_predict_request_boundary,
    create_predict_request_for_stage,
)

# ---------------------------------------------------------------------------
# Distribution config — what proportion of records per category
# ---------------------------------------------------------------------------

# CKD stage distribution (roughly mirrors clinical prevalence for CKD 3+)
STAGE_WEIGHTS = {
    "stage_3a": 0.35,
    "stage_3b": 0.30,
    "stage_4": 0.25,
    "stage_5": 0.10,
}

# Proportion of records dedicated to edge cases
BOUNDARY_FRACTION = 0.10
EXTREME_AGE_FRACTION = 0.05
EXTREME_LABS_FRACTION = 0.05


def _generate_predict_payloads(count: int) -> tuple[list[dict], dict]:
    """Generate predict request payloads with realistic distribution.

    Returns:
        Tuple of (payloads list, distribution stats dict).
    """
    payloads: list[dict] = []
    stats: dict[str, int] = {
        "stage_3a": 0,
        "stage_3b": 0,
        "stage_4": 0,
        "stage_5": 0,
        "boundary": 0,
        "extreme_age": 0,
        "extreme_labs": 0,
        "tier_2": 0,
    }

    # 1. Boundary cases (near dialysis threshold and stage transitions)
    n_boundary = max(1, int(count * BOUNDARY_FRACTION))
    for i in range(n_boundary):
        boundary_egfr = BOUNDARY_EGFR_VALUES[i % len(BOUNDARY_EGFR_VALUES)]
        payload = create_predict_request_boundary(egfr_boundary=boundary_egfr)
        payloads.append(payload)
        stats["boundary"] += 1

    # 2. Extreme age cases
    n_extreme_age = max(1, int(count * EXTREME_AGE_FRACTION))
    for _ in range(n_extreme_age):
        age = random.choice([18, 19, 20, 95, 100, 110, 115, 120])
        payload = create_predict_request(age=age)
        payloads.append(payload)
        stats["extreme_age"] += 1

    # 3. Extreme lab value cases
    n_extreme_labs = max(1, int(count * EXTREME_LABS_FRACTION))
    for _ in range(n_extreme_labs):
        payload = create_predict_request(
            bun=random.choice([5.0, 5.1, 99.0, 100.0]),
            creatinine=random.choice([0.1, 0.2, 20.0, 25.0]),
            potassium=random.choice([2.0, 2.1, 7.9, 8.0]),
        )
        payloads.append(payload)
        stats["extreme_labs"] += 1

    # 4. Fill remaining with CKD-stage-distributed records
    n_remaining = count - len(payloads)
    for _ in range(n_remaining):
        stage = random.choices(
            list(STAGE_WEIGHTS.keys()),
            weights=list(STAGE_WEIGHTS.values()),
            k=1,
        )[0]
        payload = create_predict_request_for_stage(stage)
        payloads.append(payload)
        stats[stage] += 1

    # Count Tier 2 records (those with both hemoglobin and glucose)
    for p in payloads:
        if p.get("hemoglobin") is not None and p.get("glucose") is not None:
            stats["tier_2"] += 1

    # Shuffle so edge cases aren't all at the start
    random.shuffle(payloads)
    return payloads, stats


def _generate_lab_entry_payloads(count: int) -> list[dict]:
    """Generate lab entry payloads with varying visit counts.

    Creates a mix of:
    - Single-visit patients
    - Multi-visit patients (2-5 visits) to test longitudinal data handling
    """
    payloads: list[dict] = []
    generated = 0

    while generated < count:
        visit_count = random.choices(
            [1, 2, 3, 4, 5],
            weights=[0.3, 0.25, 0.25, 0.1, 0.1],
            k=1,
        )[0]

        # Don't exceed the requested count
        visit_count = min(visit_count, count - generated)

        if visit_count == 1:
            payloads.append(create_lab_entry())
        else:
            series = create_lab_entry_series(visit_count=visit_count)
            payloads.extend(series)

        generated += visit_count

    return payloads[:count]


def generate_test_data(count: int, seed: Optional[int] = None) -> dict:
    """Generate the complete test data file for k6 load tests.

    Args:
        count: Number of unique patient records to generate.
        seed: Optional random seed for reproducibility.

    Returns:
        Dict ready to be serialized to JSON.
    """
    if seed is not None:
        random.seed(seed)

    predict_payloads, distribution = _generate_predict_payloads(count)
    lab_entry_payloads = _generate_lab_entry_payloads(count)

    return {
        "predict_payloads": predict_payloads,
        "lab_entry_payloads": lab_entry_payloads,
        "metadata": {
            "count": count,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "seed": seed,
            "distribution": distribution,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate test data for k6 load tests (LKID-58).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python backend/tests/load/generate_test_data.py --count 500 --output test_data.json
  python backend/tests/load/generate_test_data.py --count 100 --seed 42 --output data.json
  python backend/tests/load/generate_test_data.py --count 1000  # prints to stdout
        """,
    )
    parser.add_argument(
        "--count",
        type=int,
        default=500,
        help="Number of unique patient records to generate (default: 500)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output JSON file path (default: stdout)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Random seed for reproducible output",
    )

    args = parser.parse_args()

    if args.count < 1:
        parser.error("--count must be at least 1")

    data = generate_test_data(count=args.count, seed=args.seed)

    json_str = json.dumps(data, indent=2)

    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json_str)
        print(
            f"Generated {args.count} records -> {output_path.resolve()}",
            file=sys.stderr,
        )
        print(
            f"  Predict payloads: {len(data['predict_payloads'])}",
            file=sys.stderr,
        )
        print(
            f"  Lab entry payloads: {len(data['lab_entry_payloads'])}",
            file=sys.stderr,
        )
        print(f"  Distribution: {data['metadata']['distribution']}", file=sys.stderr)
    else:
        print(json_str)


if __name__ == "__main__":
    main()
