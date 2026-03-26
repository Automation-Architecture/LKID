# KidneyHood Infrastructure Setup Guide

**Version:** 1.0
**Author:** Luca (CTO)
**Date:** 2026-03-26
**Purpose:** Sprint 2 Day 1 runbook. Stand up Railway, Postgres, Clerk, and Vercel so the team can start building immediately.

---

## 1. Railway FastAPI Backend

### 1.1 Create Railway Project

1. Log in to [railway.app](https://railway.app)
2. Click **New Project** > **Empty Project**
3. Name the project `kidneyhood-api`
4. In the project, click **Add a Service** > **GitHub Repo**
5. Connect the [Automation-Architecture/LKID](https://github.com/Automation-Architecture/LKID) repository
6. Set the **Root Directory** to `/api` (the FastAPI app lives here)

### 1.2 Runtime Configuration

| Setting | Value |
|---------|-------|
| Runtime | Python 3.11 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| Restart Policy | On failure |

Railway auto-detects the `PORT` environment variable. Do not hardcode a port.

### 1.3 Environment Variables

Set these in the Railway service **Variables** tab:

| Variable | Source | Example |
|----------|--------|---------|
| `DATABASE_URL` | Auto-injected by Railway Postgres plugin (see Section 2) | `postgresql+asyncpg://postgres:xxx@db.railway.internal:5432/railway` |
| `CLERK_SECRET_KEY` | Clerk Dashboard > API Keys | `sk_live_...` |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard > Webhooks > Signing Secret | `whsec_...` |
| `ADMIN_API_KEY` | Generate with `openssl rand -hex 32` | `a1b2c3d4...` (64-char hex) |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://kidneyhood.vercel.app,http://localhost:3000` |

### 1.4 Expected URLs

| Environment | URL |
|-------------|-----|
| Production | `https://kidneyhood-api-production.up.railway.app` |
| Health check | `GET https://kidneyhood-api-production.up.railway.app/health` |
| Custom domain (later) | `https://api.kidneyhood.org` (add via Railway Settings > Networking > Custom Domain) |

### 1.5 CORS Configuration

The FastAPI app uses `CORSMiddleware` configured for:

```
Allowed Origins:  https://kidneyhood.vercel.app, http://localhost:3000
Allowed Methods:  GET, POST, OPTIONS
Allowed Headers:  Authorization, Content-Type
Credentials:      false
Max Age:          3600 seconds
```

Origins are read from the `CORS_ORIGINS` env var so they can be updated without redeploying.

---

## 2. Railway Managed Postgres

### 2.1 Provision the Database

1. In the `kidneyhood-api` Railway project, click **Add a Service** > **Database** > **PostgreSQL**
2. Railway provisions a managed Postgres 15 instance automatically
3. Railway injects `DATABASE_URL` into all services in the same project

### 2.2 Connection String Format

Railway provides a connection string like:

```
postgresql://postgres:<password>@<host>.railway.internal:5432/railway
```

For async SQLAlchemy with asyncpg, replace the scheme:

```
postgresql+asyncpg://postgres:<password>@<host>.railway.internal:5432/railway
```

The app reads `DATABASE_URL` and swaps the scheme automatically (see `main.py`).

### 2.3 Initialize the Schema

Connect to the Railway Postgres instance and run Gay Mark's leads table DDL:

```sql
-- KidneyHood Database Schema v2.0.0 (Lean Launch MVP)
-- Single-table lead-gen schema. Clerk handles auth externally.

CREATE TABLE leads (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT        NOT NULL,
    name            TEXT        NOT NULL,
    age             INTEGER     NOT NULL CHECK (age BETWEEN 18 AND 120),
    bun             NUMERIC     NOT NULL CHECK (bun BETWEEN 5 AND 150),
    creatinine      NUMERIC     NOT NULL CHECK (creatinine BETWEEN 0.3 AND 15.0),
    egfr_baseline   NUMERIC,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  leads IS 'Lead capture table. One row per prediction submission.';
COMMENT ON COLUMN leads.email IS 'Patient email captured via Clerk magic link.';
COMMENT ON COLUMN leads.name IS 'Patient name entered on the prediction form.';
COMMENT ON COLUMN leads.age IS 'Patient age in years. Range: 18-120.';
COMMENT ON COLUMN leads.bun IS 'Blood Urea Nitrogen (mg/dL). Range: 5-150.';
COMMENT ON COLUMN leads.creatinine IS 'Serum Creatinine (mg/dL). Range: 0.3-15.0.';
COMMENT ON COLUMN leads.egfr_baseline IS 'Calculated baseline eGFR (CKD-EPI 2021). Nullable.';
COMMENT ON COLUMN leads.created_at IS 'Timestamp of prediction submission (UTC).';

CREATE INDEX idx_leads_email ON leads (email);
CREATE INDEX idx_leads_created_at ON leads (created_at);
```

**How to run it:**

Option A — Railway CLI:
```bash
railway connect postgres
# Paste the SQL above into the psql session
```

Option B — Railway Dashboard:
1. Click the Postgres service
2. Go to the **Data** tab
3. Open the SQL editor
4. Paste and execute the DDL

### 2.4 Verify

```bash
railway connect postgres
\dt           -- should show the leads table
\d leads      -- should show all columns with constraints
```

---

## 3. Clerk Project Setup

### 3.1 Create Clerk Application

1. Log in to [clerk.com](https://clerk.com) and create a new application
2. Name it `kidneyhood`
3. In **Authentication** > **Email, Phone, Username**, configure:
   - Enable **Email address** as identifier
   - Disable **Password** (magic link only)
   - Enable **Email verification link** (magic link)
   - Disable all social providers (Google, GitHub, etc.)

### 3.2 Session Configuration

1. Go to **Sessions** settings
2. Set **Session lifetime** to `15 minutes` (900 seconds)
3. Set **Inactivity timeout** to `15 minutes`
4. This ensures the magic link serves as a short-lived bot gate, not a persistent session

### 3.3 Webhook Configuration

1. Go to **Webhooks** in the Clerk Dashboard
2. Click **Add Endpoint**
3. Set the endpoint URL:
   - Production: `https://kidneyhood-api-production.up.railway.app/webhooks/clerk`
   - (Update to `https://api.kidneyhood.org/webhooks/clerk` after custom domain setup)
4. Subscribe to events: **user.created** only
5. Copy the **Signing Secret** (`whsec_...`) and set it as `CLERK_WEBHOOK_SECRET` in Railway

### 3.4 API Keys

From the Clerk Dashboard > **API Keys**, collect:

| Key | Where It Goes |
|-----|---------------|
| **Publishable Key** (`pk_live_...`) | Vercel env var: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| **Secret Key** (`sk_live_...`) | Vercel env var: `CLERK_SECRET_KEY` AND Railway env var: `CLERK_SECRET_KEY` |

### 3.5 Next.js SDK Configuration

Install in the frontend:

```bash
npm install @clerk/nextjs
```

Wrap the app in `ClerkProvider` in `app/layout.tsx`:

```tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

Protect the prediction route with Clerk middleware in `middleware.ts`:

```ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: ['/predict/:path*'],
};
```

### 3.6 JWT Verification on FastAPI

The FastAPI backend verifies Clerk JWTs on protected endpoints (`/predict`, `/predict/pdf`). Use the `clerk-backend-api` Python SDK or manually verify using Clerk's JWKS endpoint:

```
https://<your-clerk-domain>/.well-known/jwks.json
```

The `CLERK_SECRET_KEY` env var on Railway is used for this verification.

---

## 4. Vercel Frontend Configuration

### 4.1 Environment Variables

Set these in Vercel Project > **Settings** > **Environment Variables**:

| Variable | Value | Scope |
|----------|-------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` (from Clerk Dashboard) | Production, Preview, Development |
| `CLERK_SECRET_KEY` | `sk_live_...` (from Clerk Dashboard) | Production, Preview, Development |
| `NEXT_PUBLIC_API_URL` | `https://kidneyhood-api-production.up.railway.app` | Production |
| `NEXT_PUBLIC_API_URL` | `https://kidneyhood-api-production.up.railway.app` | Preview |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Development |

### 4.2 Clerk Redirect URLs

In the Clerk Dashboard, configure allowed redirect URLs:

```
https://kidneyhood.vercel.app/*
http://localhost:3000/*
```

### 4.3 Verify End-to-End

After all services are up:

1. Visit the Vercel deployment URL
2. Enter an email address
3. Receive the magic link email
4. Click the link -- should redirect back to the app, authenticated
5. Submit the prediction form
6. Confirm the chart renders with 4 trajectories
7. Check Railway Postgres for a new row in the `leads` table

---

## 5. Local Development

### 5.1 Backend (FastAPI)

```bash
cd api/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file (never commit this)
cat > .env << 'EOF'
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/kidneyhood
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
ADMIN_API_KEY=dev-admin-key
CORS_ORIGINS=http://localhost:3000
EOF

# Start the server
uvicorn main:app --reload --port 8000
```

### 5.2 Frontend (Next.js)

```bash
cd app/
npm install

# Create .env.local (never commit this)
cat > .env.local << 'EOF'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

npm run dev
```

### 5.3 Local Postgres

```bash
# Option A: Docker
docker run --name kidneyhood-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=kidneyhood -p 5432:5432 -d postgres:15

# Connect and run the schema DDL from Section 2.3
psql postgresql://postgres:postgres@localhost:5432/kidneyhood < db_schema.sql
```

---

## 6. Checklist

Sprint 2 Day 1 — confirm all green before writing code:

- [ ] Railway project created with FastAPI service
- [ ] Railway Postgres provisioned, `leads` table created
- [ ] `GET /health` returns `{"status": "ok"}` on Railway
- [ ] Clerk application created, magic link only, 15-min session
- [ ] Clerk webhook configured for `user.created` pointing at Railway
- [ ] Clerk API keys copied to Railway and Vercel env vars
- [ ] Vercel env vars set (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`)
- [ ] CORS tested: frontend on Vercel can reach Railway API without errors
- [ ] Local dev environment working for both frontend and backend
