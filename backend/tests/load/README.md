# Load Testing — k6

> **These scripts target the pre-Sprint 4 API contract (before the tokenized flow).**
> `lab_entries_load.js` targets a non-existent endpoint (was never implemented).
> `predict_load.js` uses the old `/predict` shape — incompatible with the current
> tokenized response. Scripts need a full rewrite before use. `API_BASE_URL` example
> below is also pending LKID-86 (DNS flip not yet complete; use Railway URL for now).

Load test infrastructure for the KidneyHood Prediction API.

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed locally
- Python 3.11+ (for test data generation)
- Backend running locally or deployed to Railway staging

## Quick Start

### 1. Generate test data

```bash
# Generate 500 records (default)
python backend/tests/load/generate_test_data.py --count 500 --output backend/tests/load/test_data.json

# Reproducible output with seed
python backend/tests/load/generate_test_data.py --count 500 --seed 42 --output backend/tests/load/test_data.json
```

The generator creates realistic patient records covering:
- All CKD stages (3a, 3b, 4, 5) with clinical prevalence distribution
- Boundary eGFR values (dialysis threshold at 12, stage transitions)
- Extreme age and lab value edge cases
- Mix of Tier 1 and Tier 2 confidence levels
- Multi-visit longitudinal data series

### 2. Run load tests

```bash
# POST /predict — ramp to 100 VUs
k6 run backend/tests/load/predict_load.js

# POST /lab-entries — ramp to 50 VUs
k6 run backend/tests/load/lab_entries_load.js

# Against staging
API_BASE_URL=https://api.kidneyhood.org k6 run backend/tests/load/predict_load.js
```

### 3. Review results

k6 prints a summary including:
- **p50 / p95 / p99** response times
- **Request throughput** (req/s)
- **Error rate** (% of non-2xx responses)

Thresholds are built into each script:
- `p(95) < 2000ms` — 95th percentile under 2 seconds
- `http_req_failed rate < 0.01` — less than 1% errors

## Files

| File | Purpose |
|------|---------|
| `generate_test_data.py` | Python CLI to generate realistic test data JSON |
| `predict_load.js` | k6 script for POST /predict endpoint |
| `lab_entries_load.js` | k6 script for POST /lab-entries endpoint |
| `test_data.json` | Generated test data (gitignored, regenerate locally) |

## Test Data Format

The generated JSON has this structure:

```json
{
  "predict_payloads": [
    { "bun": 35.2, "creatinine": 2.1, "potassium": 4.2, "age": 58, "sex": "male", ... }
  ],
  "lab_entry_payloads": [
    { "patient_id": "uuid", "bun": 35.2, "creatinine": 2.1, ... }
  ],
  "metadata": {
    "count": 500,
    "generated_at": "2026-03-27T...",
    "seed": 42,
    "distribution": { "stage_3a": 120, "stage_3b": 105, ... }
  }
}
```

## Railway Concurrency Notes

When testing against Railway staging, be aware of infrastructure limits.
See `agents/luca/drafts/infrastructure-setup.md` for Railway plan limits,
connection pool sizes, and Uvicorn worker count.
