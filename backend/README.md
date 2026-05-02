# backend/ — KidneyHood Prediction API

FastAPI service deployed to Railway (Python 3.11+). Handles the prediction engine, tokenized PDF generation, email-gate lead capture, and the Lee client dashboard metrics endpoint.

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check for Railway zero-downtime deploys |
| `POST` | `/predict` | Run CKD-EPI 2021 eGFR + 4-trajectory engine; returns `report_token` |
| `POST` | `/leads` | Email-gate upsert — links a lead to a prediction and fires Resend + Klaviyo |
| `GET` | `/results/{token}` | Fetch stored prediction by `report_token` |
| `GET` | `/reports/{token}/pdf` | Render Playwright PDF for a stored prediction |
| `GET` | `/client/{slug}/metrics` | Lee dashboard launch metrics (LKID-75) |

Rate limits: 10/min on `/predict`, 5/min on `/leads` and `/reports/{token}/pdf`.

## Local Development

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs on `http://localhost:8000` by default. Set `DATABASE_URL` in `.env` for a full local stack; without it, `/predict` still returns tokens but `/results` and `/leads` will 503 (`Database not configured`); 404 applies when the DB is configured but the token is unknown.

## Running Tests

```bash
cd backend
pytest
```

## Migrations

```bash
cd backend
alembic upgrade head
```

Migrations run automatically on Railway deploy via `preDeployCommand` in `railway.toml`.

## References

- API contract: `agents/john_donaldson/drafts/api_contract.json`
- Railway deployment checklist: `agents/luca/drafts/railway-deployment-checklist.md`
- Security headers (LKID-74 / LKID-87): see `main.py` `security_headers_middleware`
