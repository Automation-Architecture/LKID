# Railway Backend Deployment Checklist

**Author:** Luca (CTO)
**Date:** 2026-03-26
**Jira:** LKID-8 (In Progress)
**Repo:** [Automation-Architecture/LKID](https://github.com/Automation-Architecture/LKID) -- `backend/` directory
**Reference:** [infrastructure-setup.md](./infrastructure-setup.md)

---

## Pre-flight: Repo Readiness

The `backend/` directory currently contains:

```
backend/
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 001_create_leads_table.py
└── seeds/
    └── seed_test_vectors.sql
```

> **Blocker:** `main.py` and `requirements.txt` are not yet in the repo. These are Sprint 2 deliverables (LKID-6 API scaffolding). The Railway service can be created now, but it will not build successfully until those files land. Steps below are ordered so you can provision infra today and wire it up once the API code merges.

---

## Step 1 -- Create Railway Project

| # | Action | Details |
|---|--------|---------|
| 1.1 | Log in to [railway.app](https://railway.app) | Use the Automation Architecture org account |
| 1.2 | **New Project** > **Empty Project** | Name it `kidneyhood-api` |
| 1.3 | **Add a Service** > **GitHub Repo** | Connect `Automation-Architecture/LKID` |
| 1.4 | Set **Root Directory** | `backend` |
| 1.5 | Set **Build Command** | `pip install -r requirements.txt` |
| 1.6 | Set **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| 1.7 | Set **Health Check Path** | `/health` |
| 1.8 | Set **Restart Policy** | On failure |

> Railway auto-detects `$PORT`. Do not hardcode a port number.

---

## Step 2 -- Add Railway Postgres

| # | Action | Details |
|---|--------|---------|
| 2.1 | In the `kidneyhood-api` project, click **Add a Service** > **Database** > **PostgreSQL** | Railway provisions managed Postgres 15 |
| 2.2 | Confirm `DATABASE_URL` is auto-injected | Check the **Variables** tab on the Python service -- Railway links it automatically |
| 2.3 | Note the connection string format | `postgresql://postgres:<pw>@<host>.railway.internal:5432/railway` |

### Run migration (after `main.py` + `requirements.txt` are merged)

```bash
# Option A: Railway CLI
railway link            # link to kidneyhood-api project
railway run alembic upgrade head

# Option B: Railway shell
railway shell
cd backend
alembic upgrade head
```

### Seed test vectors

```bash
# Option A: Railway CLI
railway connect postgres
\i seeds/seed_test_vectors.sql

# Option B: psql with the DATABASE_URL from Railway dashboard
psql $DATABASE_URL -f backend/seeds/seed_test_vectors.sql
```

### Verify schema

```sql
\dt           -- should show: leads
\d leads      -- should show all 7 columns with CHECK constraints
SELECT count(*) FROM leads;  -- should return 5 (3 test vectors + 2 boundary rows)
```

---

## Step 3 -- Set Environment Variables

In Railway > `kidneyhood-api` service > **Variables** tab, set:

| Variable | Value | Source |
|----------|-------|--------|
| `DATABASE_URL` | *(auto-injected by Postgres plugin)* | Step 2 |
| `CLERK_SECRET_KEY` | `sk_placeholder_replace_me` | Clerk Dashboard > API Keys (replace when Clerk app is created) |
| `CLERK_WEBHOOK_SECRET` | `whsec_placeholder_replace_me` | Clerk Dashboard > Webhooks (replace when webhook is configured) |
| `ADMIN_API_KEY` | Generate with: `openssl rand -hex 32` | One-time generation |
| `CORS_ORIGINS` | `https://kidneyhood.vercel.app,http://localhost:3000` | Static value |

### Generate the admin key locally

```bash
openssl rand -hex 32
# Copy the 64-character hex string and paste into Railway
```

---

## Step 4 -- Verify Deployment

Once `main.py` and `requirements.txt` are merged and Railway builds successfully:

| # | Check | Expected |
|---|-------|----------|
| 4.1 | `GET {railway-url}/health` | `{"status": "ok"}` |
| 4.2 | `GET {railway-url}/docs` | Swagger UI loads with all endpoints |
| 4.3 | `POST {railway-url}/predict` with test body (below) | Returns stub/calculated prediction response |

### Test prediction request

```bash
curl -X POST https://kidneyhood-api-production.up.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "age": 58,
    "bun": 35,
    "creatinine": 2.1
  }'
```

Expected: 200 response with eGFR trajectory data (or stub response if rules engine is not yet wired).

---

## Step 5 -- Connect Vercel Frontend

In Vercel > KidneyHood project > **Settings** > **Environment Variables**:

| Variable | Value | Scope |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://kidneyhood-api-production.up.railway.app` | Production, Preview |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Development |

After setting, trigger a redeploy on Vercel so the frontend picks up the new env var.

### Verify end-to-end

```bash
# From browser console on the Vercel deployment:
fetch('https://kidneyhood-api-production.up.railway.app/health')
  .then(r => r.json())
  .then(console.log)
# Should log: { status: "ok" }
```

Confirm no CORS errors in the browser console.

---

## Step 6 -- Post-Deployment Cleanup

- [ ] Replace Clerk placeholder env vars once Clerk app is created (LKID-7)
- [ ] Configure Clerk webhook endpoint: `https://kidneyhood-api-production.up.railway.app/webhooks/clerk`
- [ ] Set up custom domain `api.kidneyhood.org` (Railway Settings > Networking > Custom Domain) -- deferred, not blocking
- [ ] Update `NEXT_PUBLIC_API_URL` on Vercel if custom domain is added

---

## Summary Checklist

- [ ] **Railway project** `kidneyhood-api` created
- [ ] **GitHub repo** connected with root directory `backend`
- [ ] **Build/start commands** configured
- [ ] **Postgres plugin** added, `DATABASE_URL` auto-injected
- [ ] **Alembic migration** run (`alembic upgrade head`)
- [ ] **Seeds** loaded (5 rows in `leads` table)
- [ ] **Environment variables** set (5 vars)
- [ ] **Health check** returns `{"status": "ok"}`
- [ ] **Swagger UI** accessible at `/docs`
- [ ] **Predict endpoint** returns response
- [ ] **Vercel** `NEXT_PUBLIC_API_URL` configured
- [ ] **CORS** verified -- no browser errors from Vercel to Railway

---

## Known Blockers

| Blocker | Status | Unblocks |
|---------|--------|----------|
| `main.py` + `requirements.txt` not yet in repo | Pending LKID-6 (API scaffolding) | Railway build |
| LKID-14 (rules engine) -- 5 items pending Lee | Pending | Real prediction responses |
| Clerk app not yet created | Pending LKID-7 | Auth flow end-to-end |
