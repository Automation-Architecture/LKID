# Railway Deployment Reference

> Compiled from [Railway official docs](https://docs.railway.com) on 2026-03-26.
> Covers Python/FastAPI deployment, Postgres, environment variables, health checks, config-as-code, and custom domains.

---

## 1. Deploying a Python/FastAPI Service

Railway supports four deployment methods: one-click template, GitHub repo, CLI, and Dockerfile.

### From GitHub (recommended)

1. Create a **New Project** at [railway.com/new](https://railway.com/new).
2. Click **Deploy from GitHub repo** and select the repo.
3. Railway auto-detects the language and builds with **Railpack** (default builder) or a **Dockerfile** if one is present.
4. The service is created but **not publicly accessible by default** -- you must generate a domain (see section 6).

### Via CLI

```bash
# Install CLI, authenticate, then from your app directory:
railway init
railway up        # scans, compresses, uploads, and deploys
```

### Via Dockerfile

Railway auto-detects a `Dockerfile` (capital D) at the repo root. Example for FastAPI:

```dockerfile
FROM python:3-alpine
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["hypercorn", "main:app", "--bind", "::"]
```

To use a non-standard Dockerfile path, set the variable `RAILWAY_DOCKERFILE_PATH`:

```
RAILWAY_DOCKERFILE_PATH=backend/Dockerfile
```

### Build cache (pip)

Use Docker cache mounts for faster rebuilds:

```dockerfile
RUN --mount=type=cache,id=s/<service-id>-/root/.cache/pip,target=/root/.cache/pip \
    pip install -r requirements.txt
```

---

## 2. Build and Start Commands (Config as Code)

All build/deploy settings can be defined in a `railway.toml` or `railway.json` file at the repo root. Config in code **always overrides** dashboard settings.

### railway.json example (FastAPI)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
    "preDeployCommand": ["alembic upgrade head"],
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### railway.toml equivalent

```toml
[build]
builder = "DOCKERFILE"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
preDeployCommand = ["alembic upgrade head"]
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
```

### Key settings reference

| Setting | Section | Description |
|---------|---------|-------------|
| `builder` | `build` | `RAILPACK` (default) or `DOCKERFILE` |
| `buildCommand` | `build` | Custom build command |
| `dockerfilePath` | `build` | Path to non-standard Dockerfile |
| `watchPatterns` | `build` | Array of glob patterns to trigger deploys |
| `startCommand` | `deploy` | Container start command |
| `preDeployCommand` | `deploy` | Run before start (e.g., DB migrations) |
| `healthcheckPath` | `deploy` | HTTP path for health check |
| `healthcheckTimeout` | `deploy` | Seconds to wait (default 300) |
| `restartPolicyType` | `deploy` | `ON_FAILURE`, `ALWAYS`, or `NEVER` |
| `restartPolicyMaxRetries` | `deploy` | Max retry count |

### Environment overrides

Override settings per environment (e.g., staging, PR):

```json
{
  "environments": {
    "staging": {
      "deploy": {
        "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1"
      }
    }
  }
}
```

---

## 3. PostgreSQL Provisioning and Connection

### Provisioning

Add a PostgreSQL database via the `Cmd+K` menu or the **+ New** button on the project canvas. Railway deploys an SSL-enabled Postgres image based on the official Docker Hub image.

### Connection variables

The Postgres service automatically exposes these variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Full connection string (most libraries auto-detect this) |
| `PGHOST` | Hostname |
| `PGPORT` | Port |
| `PGUSER` | Username |
| `PGPASSWORD` | Password |
| `PGDATABASE` | Database name |

### Referencing from another service

Use Railway's reference variable syntax to connect your FastAPI service to Postgres:

```
DATABASE_URL=${{ Postgres.DATABASE_URL }}
```

Or reference individual components:

```
PGHOST=${{ Postgres.PGHOST }}
PGPORT=${{ Postgres.PGPORT }}
```

### External connections

External connections (outside the Railway project) use the **TCP Proxy**, which is enabled by default. Note: network egress is billed.

### Configuration tuning

Use `ALTER SYSTEM` for Postgres config changes:

```sql
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
SELECT pg_reload_conf();
-- Then restart the deployment
```

### SHM size

If you see `no space left on device` errors, increase shared memory by setting:

```
RAILWAY_SHM_SIZE_BYTES=524288000   # 500 MB
```

### Backups

Railway has a native **Backups** feature for volumes. For production, set up automated backups and consider the Prometheus + Grafana + PostgreSQL Exporter monitoring stack (available as templates).

---

## 4. Environment Variables

### Defining variables

- **Service variables**: Scoped to a single service, defined in the service's "Variables" tab.
- **Shared variables**: Defined in Project Settings, shared across multiple services.
- **Reference variables**: Dynamically reference other services' variables using template syntax.

### Template syntax

```bash
# Reference another service's variable
${{ SERVICE_NAME.VARIABLE_KEY }}

# Reference a shared variable
${{ shared.VARIABLE_KEY }}

# Reference same-service variable
${{ VARIABLE_NAME }}

# Railway-provided variables
${{ RAILWAY_PUBLIC_DOMAIN }}
${{ RAILWAY_PRIVATE_DOMAIN }}
```

### Auto-detection

Railway scans your repo root for `.env`, `.env.example`, `.env.local`, `.env.production`, and other `.env.*` files, and suggests importing them.

### Sealed variables

For sensitive values, seal a variable via the 3-dot menu. Sealed values are injected at build/runtime but never visible in the UI or API. Sealed variables cannot be un-sealed.

### Railway-provided variables (commonly used)

| Variable | Description |
|----------|-------------|
| `PORT` | Port your app should listen on (Railway injects this) |
| `RAILWAY_PUBLIC_DOMAIN` | Public domain of the service |
| `RAILWAY_PRIVATE_DOMAIN` | Private (internal) domain of the service |
| `RAILWAY_TCP_PROXY_PORT` | TCP proxy port |
| `RAILWAY_ENVIRONMENT` | Current environment name |
| `RAILWAY_SERVICE_NAME` | Service name |

### Using in Dockerfile

Declare variables with `ARG` to use them at build time:

```dockerfile
ARG RAILWAY_ENVIRONMENT
RUN echo "Building for $RAILWAY_ENVIRONMENT"
```

---

## 5. Health Checks

### How it works

When a new deployment is triggered, Railway queries the healthcheck endpoint until it receives an HTTP `200`. Only then does it route traffic to the new deployment (zero-downtime).

Railway does **not** monitor the healthcheck endpoint after the deployment goes live (use Uptime Kuma template for continuous monitoring).

### Configuration

1. Add a `/health` endpoint to your FastAPI app:

```python
@app.get("/health")
def health_check():
    return {"status": "ok"}
```

2. Configure in service settings or `railway.json`:

```json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

### Key details

| Setting | Default | Notes |
|---------|---------|-------|
| Healthcheck path | None (disabled) | Must return HTTP 200 |
| Timeout | 300 seconds (5 min) | Configurable via settings or `RAILWAY_HEALTHCHECK_TIMEOUT_SEC` |
| Hostname | `healthcheck.railway.app` | Must be in allowed hosts if you restrict hostnames |
| Port | Uses `PORT` env var | Set `PORT` variable manually if using target ports |

### Volumes caveat

Services with attached volumes have a small amount of downtime during redeploy (cannot have two deployments mounted simultaneously).

---

## 6. Custom Domains and Public Networking

### Railway-provided domains

1. Go to service **Settings > Networking > Public Networking**.
2. Click **Generate Domain** to get a `*.up.railway.app` domain.
3. Railway auto-detects the listening port and sets the target port.

### Custom domains

1. Click **+ Custom Domain** in the Public Networking section.
2. Enter your domain (e.g., `api.kidneyhood.com`).
3. Railway provides a CNAME value (e.g., `g05ns7.up.railway.app`).
4. Create a CNAME record in your DNS provider pointing to that value.
5. Railway auto-provisions a **Let's Encrypt SSL certificate** (RSA 2048-bit, 90-day validity, auto-renewed at 30 days).

### Plan limits

| Plan | Custom domains per service |
|------|---------------------------|
| Trial | 1 |
| Hobby | 2 |
| Pro | 20 (can be increased on request) |

### Root/apex domains

Root domains require DNS providers that support **CNAME flattening** or **dynamic ALIAS records**:
- **Supported**: Cloudflare, DNSimple, Namecheap, bunny.net
- **Not supported natively**: AWS Route 53, Azure DNS, GoDaddy, Hostinger, NameSilo

**Workaround**: Point your domain's nameservers to Cloudflare.

### Cloudflare-specific setup

- Set SSL/TLS to **Full** (not Full Strict).
- Enable **Universal SSL**.
- If using Cloudflare proxy (orange cloud), disable proxying on `_acme-challenge` records for wildcard domains.

### Target ports

Each domain maps to a specific internal port. Railway auto-detects single-port apps. For multi-port apps, you select which port each domain routes to.

### Private networking (service-to-service)

Services get an internal DNS name: `<service-name>.railway.internal`

```python
# FastAPI service calling another internal service
import httpx
response = httpx.get("http://backend.railway.internal:8000/api/data")
```

Use `http` (not `https`) for internal communication. Private network is scoped to a single project/environment.

Reference variable pattern:

```
BACKEND_URL=http://${{ backend.RAILWAY_PRIVATE_DOMAIN }}:${{ backend.PORT }}
```

---

## 7. KidneyHood-Specific Deployment Checklist

Based on our stack (FastAPI + PostgreSQL + Clerk), here is the recommended Railway setup:

### Project structure

```
Railway Project
  |-- FastAPI service (backend)
  |-- PostgreSQL service (database)
```

### Backend service configuration (`railway.json`)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "preDeployCommand": ["alembic upgrade head"],
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Required environment variables

| Variable | Source | Notes |
|----------|--------|-------|
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` | Reference variable from Postgres service |
| `PORT` | Railway-provided | Injected automatically |
| `CLERK_SECRET_KEY` | Manual (sealed) | Seal this variable |
| `CLERK_PUBLISHABLE_KEY` | Manual | Frontend also needs this |
| `CORS_ORIGINS` | Manual | Set to Vercel frontend URL |

### Dockerfile (backend)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Note: Railway injects `PORT`, so prefer `--port $PORT` in the start command (via `railway.json`) over hardcoding in the Dockerfile CMD.

---

## Sources

- [Deploy a FastAPI App](https://docs.railway.com/guides/fastapi)
- [PostgreSQL](https://docs.railway.com/databases/postgresql)
- [Using Variables](https://docs.railway.com/guides/variables)
- [Healthchecks](https://docs.railway.com/reference/healthchecks)
- [Config as Code](https://docs.railway.com/guides/config-as-code)
- [Config as Code Reference](https://docs.railway.com/config-as-code/reference)
- [Public Networking](https://docs.railway.com/networking/public-networking)
- [Working with Domains](https://docs.railway.com/networking/domains/working-with-domains)
- [Dockerfiles](https://docs.railway.com/builds/dockerfiles)
