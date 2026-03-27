# HIPAA Infrastructure Verification Notes — LKID-53

**Author:** Luca (CTO), for Yuri (QA)
**Date:** 2026-03-27
**Purpose:** Walkthrough output covering Railway security controls for HIPAA verification. Yuri uses this as his reference during Sprint 3 Gate 4 (pre-release).
**Source docs:** `agents/luca/drafts/infrastructure-setup.md` (Sections 6-8), `agents/gay_mark/drafts/pgaudit-setup-notes.md`

---

## 1. Railway Security Controls Overview

### 1.1 Encryption in Transit (TLS)

Railway provides automatic TLS termination at the edge proxy for all `*.up.railway.app` domains:

| Layer | Mechanism | Details |
|-------|-----------|---------|
| Client to Railway edge | HTTPS / TLS 1.2+ | Railway provisions and auto-renews Let's Encrypt certificates for all `*.up.railway.app` domains. No manual certificate management required. |
| Railway edge to Uvicorn | Internal network | Traffic between Railway's load balancer and the Uvicorn process stays within Railway's internal network. Not encrypted at the application layer (standard for PaaS edge-termination architecture). |
| API to PostgreSQL (internal) | SSL optional | Internal `.railway.internal` connections do not require SSL by default. External connections enforce SSL. |
| API to PostgreSQL (external) | SSL enforced | `sslmode=require` is enforced for any connection from outside Railway's network. |

**HIPAA relevance:** All data in transit between patients' browsers and the API is encrypted via TLS. Database connections from outside Railway are SSL-enforced. Internal network traffic relies on Railway's network isolation.

### 1.2 Encryption at Rest

| Component | Encryption | Details |
|-----------|-----------|---------|
| Railway Managed PostgreSQL | AES-256 disk encryption | Railway runs on AWS/GCP infrastructure. Underlying block storage is encrypted at rest by the cloud provider. Railway does not expose configuration for this — it is a platform default. |
| Railway service filesystem | Encrypted | Ephemeral container filesystem, encrypted at the infrastructure layer. |
| Backups | Encrypted | Railway's managed Postgres automated backups inherit the same disk encryption. |

**HIPAA relevance:** PHI stored in the `leads` table is encrypted at rest via the cloud provider's disk encryption. This is a platform-level control, not user-configurable.

### 1.3 Environment Variable Security

Railway treats environment variables as secrets:

- Variables are stored encrypted in Railway's backend and are never exposed in build logs or deployment logs
- The Railway dashboard masks variable values for users with the Viewer role
- Variables are injected into the container at runtime via environment, not baked into the image
- Variable values are never committed to the Git repository (the codebase uses `os.environ` / `.env` files locally)

**Current env vars on Railway** (names only):

| Variable | Purpose | Contains secrets? |
|----------|---------|-------------------|
| `DATABASE_URL` | PostgreSQL connection string | Yes (password) |
| `CLERK_SECRET_KEY` | JWT verification | Yes |
| `CLERK_WEBHOOK_SECRET` | Webhook signature validation | Yes |
| `ADMIN_API_KEY` | Protects `/leads` admin endpoint | Yes |
| `CORS_ORIGINS` | Allowed frontend origins | No |

---

## 2. What Yuri Can Verify Independently

All commands below require Viewer-level Railway access (Section 7.4 of infra-setup.md). Luca must send the team invite before Yuri can proceed.

### 2.1 Confirm SSL Is Active on PostgreSQL

```bash
# Connect to Postgres via Railway CLI
railway connect postgres

# Once in psql:
SHOW ssl;
# Expected: on

# Check current connection SSL details:
SELECT pg_ssl.ssl, pg_ssl.version, pg_ssl.cipher
FROM pg_stat_ssl AS pg_ssl
JOIN pg_stat_activity AS pg_act ON pg_ssl.pid = pg_act.pid
WHERE pg_act.pid = pg_backend_pid();
# Expected: ssl=true, version=TLSv1.3, cipher=TLS_AES_256_GCM_SHA384
```

### 2.2 Confirm TLS on the Public API Endpoint

```bash
# Verify TLS certificate and handshake on the public URL
curl -vI https://kidneyhood-api-production.up.railway.app/health 2>&1 | grep -E "SSL|TLS|subject|issuer|expire"

# Expected output includes:
#   * SSL connection using TLSv1.3
#   * Server certificate: subject: CN=*.up.railway.app
#   * Issuer: Let's Encrypt
#   * expire date: (future date)
```

### 2.3 Verify Environment Variables Are Set (Names Only)

```bash
# List all variable names (values masked for Viewer role)
railway variables

# Expected output should include:
#   DATABASE_URL = ********
#   CLERK_SECRET_KEY = ********
#   CLERK_WEBHOOK_SECRET = ********
#   ADMIN_API_KEY = ********
#   CORS_ORIGINS = https://kidneyhood.vercel.app,http://localhost:3000
```

**Checklist items Yuri can tick off:**

- [ ] `DATABASE_URL` is set
- [ ] `CLERK_SECRET_KEY` is set
- [ ] `CLERK_WEBHOOK_SECRET` is set
- [ ] `ADMIN_API_KEY` is set
- [ ] `CORS_ORIGINS` contains only known, restrictive domains
- [ ] No secrets appear in plaintext in the codebase (grep the repo for `sk_live`, `whsec_`, password strings)

### 2.4 Check TLS Evidence in Deployment Logs

```bash
# View recent deployment logs
railway logs

# Filter for TLS/SSL references
railway logs | grep -i -E "ssl|tls|https|certificate"

# View Postgres service logs specifically
railway logs --service postgres
```

**What to look for:**
- Uvicorn startup log showing it binds to `$PORT` (Railway terminates TLS at edge, so Uvicorn itself does not handle certificates)
- No SSL certificate errors
- Database connection logs showing `sslmode=require` or similar

### 2.5 Verify Admin Endpoint Access Control

```bash
# Attempt to access /leads without the admin API key — should return 401
curl -s -o /dev/null -w "%{http_code}" https://kidneyhood-api-production.up.railway.app/leads
# Expected: 401

# Attempt to access /predict without auth — should return 401 or 403
curl -s -o /dev/null -w "%{http_code}" -X POST https://kidneyhood-api-production.up.railway.app/predict \
  -H "Content-Type: application/json" \
  -d '{"bun": 35, "creatinine": 2.1, "age": 58}'
# Expected: 401 (no Clerk JWT)
```

### 2.6 Query the Audit Log (If pgaudit Is Enabled)

Reference: `agents/gay_mark/drafts/pgaudit-setup-notes.md`, Section 4.

**Step 1 — Check if pgaudit is available:**

```sql
-- In psql via `railway connect postgres`
SELECT * FROM pg_available_extensions WHERE name = 'pgaudit';
-- If no rows returned: pgaudit is NOT available on this Railway image

SHOW shared_preload_libraries;
-- Should include 'pgaudit' if it is loaded

SELECT extname, extversion FROM pg_extension WHERE extname = 'pgaudit';
-- Should return a row if the extension is created
```

**Step 2 — If pgaudit IS active, verify audit logging:**

```sql
-- Insert a test record
INSERT INTO leads (email, name, age, bun, creatinine)
VALUES ('audit-test@example.com', 'Audit Test', 50, 25.0, 1.5);

-- Then check Railway logs:
-- railway logs --service postgres | grep "AUDIT:.*leads"

-- Clean up
DELETE FROM leads WHERE email = 'audit-test@example.com';

-- Verify the DELETE also appears in the audit log
```

**Step 3 — Audit log verification checklist (from Gay Mark's notes):**

- [ ] `SHOW shared_preload_libraries` includes `pgaudit`
- [ ] `SELECT extname FROM pg_extension WHERE extname = 'pgaudit'` returns a row
- [ ] INSERT on `leads` produces an `AUDIT:` log entry
- [ ] UPDATE on `leads` produces an `AUDIT:` log entry
- [ ] DELETE on `leads` produces an `AUDIT:` log entry
- [ ] Log entries include the table name (`leads`)
- [ ] Log entries include parameter values (not just `$1, $2`)
- [ ] DDL changes (ALTER TABLE, DROP TABLE) produce audit entries

---

## 3. What Requires Luca's Access

Yuri has Viewer role on Railway. The following items cannot be verified with Viewer access and require Luca (Admin) to provide screenshots, attestations, or direct confirmation.

### 3.1 Items Requiring Admin Screenshots or Attestation

| Item | Why Yuri Cannot Verify | What Luca Must Provide |
|------|----------------------|----------------------|
| Encryption at rest configuration | Railway does not expose disk-encryption settings in the dashboard; this is a platform default | Written attestation that Railway runs on AWS/GCP with AES-256 disk encryption, citing Railway's security documentation |
| PostgreSQL backup encryption | Backup settings are not visible to Viewer role | Screenshot of backup configuration or Railway documentation reference |
| Railway team member list and roles | Viewer cannot see project member management | Screenshot of Settings > Members showing all users and their roles |
| Environment variable values | Viewer sees masked values only | Attestation that all secret values are strong (generated via `openssl rand`, not default/weak), without revealing the values themselves |
| `ALTER SYSTEM` permissions | Requires running the command as the database owner | Luca to test and confirm whether `ALTER SYSTEM SET shared_preload_libraries = 'pgaudit'` is permitted |
| pgaudit availability | Requires checking `pg_available_extensions` (Viewer can do this via `railway connect postgres`, but enabling it requires Admin) | If pgaudit is NOT available: decision on whether to use custom Dockerfile or application-level fallback |
| Log drain configuration | Setting up log drains requires Admin access | Screenshot or confirmation that a log drain is configured (or acknowledgment that it is not yet set up) |
| Railway plan tier | Plan details visible only to project owner | Confirmation of current plan (Trial/Hobby/Pro) and its resource limits |

### 3.2 Railway Compliance Attestations Needed

Railway publishes compliance documentation. Luca should provide Yuri with links or copies of:

| Attestation | What It Covers | Where to Find |
|-------------|---------------|---------------|
| Railway SOC 2 Type II report | Controls over security, availability, processing integrity | Request from Railway support or check [railway.app/security](https://railway.app/security) |
| Railway infrastructure security page | TLS, encryption at rest, network isolation, access controls | [railway.app/security](https://railway.app/security) |
| Railway HIPAA eligibility statement | Whether Railway offers a BAA (Business Associate Agreement) | Contact Railway support — **critical for HIPAA** |
| Data residency confirmation | Which AWS/GCP region the Postgres instance runs in | Railway dashboard (Admin view) or support ticket |

> **Critical note on BAA:** HIPAA requires a Business Associate Agreement (BAA) with any service provider that handles PHI. If Railway does not offer a BAA, this is a **blocking compliance gap** — PHI cannot be stored on Railway without one. Luca must verify BAA availability with Railway support.

---

## 4. HIPAA Verification Checklist

Yuri fills in the Status column during Sprint 3 Gate 4. Use the following statuses:
- **Verified** — independently confirmed by Yuri
- **Attested** — confirmed via Luca's screenshot/documentation (not independently verifiable)
- **Not Verified** — not yet checked
- **Blocked** — cannot be verified with current setup (see Known Gaps)
- **N/A** — not applicable to current architecture

### 4.1 Administrative Safeguards (HIPAA Section 164.308)

| # | Control | Verification Method | Owner | Status |
|---|---------|-------------------|-------|--------|
| A1 | Access control — only authorized team members have Railway access | Luca provides screenshot of Railway Members page | Luca | Not Verified |
| A2 | Role-based access — Viewer vs. Member vs. Admin roles assigned appropriately | Luca provides screenshot of Railway Members page | Luca | Not Verified |
| A3 | Unique user identification — each team member has individual Railway account | Luca provides screenshot of Railway Members page | Luca | Not Verified |
| A4 | Automatic session timeout — Clerk sessions expire after 15 minutes | Yuri tests: sign in, wait 16 min, confirm session expired | Yuri | Not Verified |
| A5 | Security awareness — team aware of PHI handling requirements | Documented in project CLAUDE.md and team SOPs | Luca | Not Verified |

### 4.2 Technical Safeguards (HIPAA Section 164.312)

| # | Control | Verification Method | Owner | Status |
|---|---------|-------------------|-------|--------|
| T1 | Encryption in transit — API (TLS) | `curl -vI` on public URL, check TLS version and cert | Yuri | Not Verified |
| T2 | Encryption in transit — Database (SSL) | `SHOW ssl;` and `pg_stat_ssl` query via `railway connect postgres` | Yuri | Not Verified |
| T3 | Encryption at rest — Database storage | Railway platform default (AES-256); Luca attests | Luca | Not Verified |
| T4 | Encryption at rest — Backups | Railway platform default; Luca attests | Luca | Not Verified |
| T5 | Access control — API endpoints require authentication | `curl` to `/predict` without JWT returns 401 | Yuri | Not Verified |
| T6 | Access control — Admin endpoint protected by API key | `curl` to `/leads` without key returns 401 | Yuri | Not Verified |
| T7 | Secrets management — no secrets in codebase | `grep -r "sk_live\|whsec_\|password" .` returns no matches in committed code | Yuri | Not Verified |
| T8 | Secrets management — env vars configured on Railway | `railway variables` shows expected vars with masked values | Yuri | Not Verified |
| T9 | Audit logging — DB writes on PHI tables logged | pgaudit `AUDIT:` entries for INSERT/UPDATE/DELETE on `leads` | Yuri | Blocked |
| T10 | Audit logging — log entries include table name and parameters | Inspect `AUDIT:` log entries for table name and parameter values | Yuri | Blocked |
| T11 | CORS — only approved origins allowed | `railway variables` shows `CORS_ORIGINS` with only known domains | Yuri | Not Verified |
| T12 | Rate limiting — brute force protection on sensitive endpoints | Verify `slowapi` config in `main.py` (30/min on `/predict`, 10/min on `/predict/pdf`) | Yuri | Not Verified |

### 4.3 Physical Safeguards (HIPAA Section 164.310)

| # | Control | Verification Method | Owner | Status |
|---|---------|-------------------|-------|--------|
| P1 | Data center physical security | Railway's cloud provider (AWS/GCP) certifications — SOC 2, ISO 27001 | Luca (attestation) | Not Verified |
| P2 | Data residency — known region | Luca confirms which AWS/GCP region hosts the Postgres instance | Luca | Not Verified |

### 4.4 Organizational Requirements (HIPAA Section 164.314)

| # | Control | Verification Method | Owner | Status |
|---|---------|-------------------|-------|--------|
| O1 | Business Associate Agreement — Railway | Luca contacts Railway support to obtain BAA or confirm availability | Luca | Blocked |
| O2 | Business Associate Agreement — Clerk | Clerk's BAA availability (Clerk handles email addresses, which are PHI identifiers) | Luca | Blocked |
| O3 | Business Associate Agreement — Vercel | Vercel does not store PHI (frontend only), but confirm no PHI in logs | Yuri | Not Verified |

### 4.5 Audit and Accountability (HIPAA Section 164.312(b))

| # | Control | Verification Method | Owner | Status |
|---|---------|-------------------|-------|--------|
| AU1 | Audit trail exists for PHI access | pgaudit enabled and logging writes on `leads` table | Yuri + Gay Mark | Blocked |
| AU2 | Audit logs are tamper-resistant | Server logs — application cannot modify its own log output (Railway-managed) | Luca (attestation) | Not Verified |
| AU3 | Audit log retention meets 6-year requirement | Log drain configured to long-term storage | Luca | Blocked |
| AU4 | Audit logs are reviewable | Yuri can filter logs via `railway logs --service postgres | grep AUDIT:` | Yuri | Blocked |

---

## 5. Known Gaps and Risks

### 5.1 pgaudit Availability on Railway (HIGH RISK)

**Issue:** Railway's managed PostgreSQL image does NOT include pgaudit by default (per Gay Mark's research in `pgaudit-setup-notes.md`, Section 5).

**Impact:** Without pgaudit, there is no database-level audit trail for PHI access — a core HIPAA requirement. This blocks items T9, T10, AU1, AU3, AU4 in the checklist above.

**Mitigation options (in order of preference):**

1. **Request from Railway support** — ask them to add pgaudit to the PostgreSQL image. Low effort if they agree.
2. **Custom Dockerfile** — deploy PostgreSQL via `FROM postgres:15` with `apt-get install postgresql-15-pgaudit`. Moves from managed Postgres to self-managed, increasing operational burden.
3. **Application-level audit logging (fallback)** — implement audit logging in the FastAPI layer using Python's `logging` module with a dedicated `audit` logger. Less robust than pgaudit (application can be modified to skip logging), but satisfies the intent.

**Action required:** Luca to check pgaudit availability (`SELECT * FROM pg_available_extensions WHERE name = 'pgaudit'`) and report back before Sprint 3 Gate 4.

### 5.2 Log Retention: 7 Days vs. HIPAA's 6 Years (HIGH RISK)

**Issue:** Railway retains service logs for approximately 7 days (Pro plan). HIPAA requires audit logs to be retained for a minimum of 6 years.

**Impact:** Even if pgaudit is enabled, audit log entries will be lost after 7 days. This makes post-breach investigation impossible beyond a one-week window.

**Mitigation:** Configure a Railway log drain to forward all PostgreSQL logs to a long-term storage service:

- Papertrail (simple, affordable)
- Datadog (richer, more expensive)
- AWS CloudWatch via log drain

**Action required:** Luca to set up a log drain before Sprint 3 Gate 4. Until this is done, AU3 remains blocked.

### 5.3 Business Associate Agreements (HIGH RISK)

**Issue:** HIPAA requires a BAA with every service provider that stores, processes, or transmits PHI. We need BAAs from:

| Provider | Stores PHI? | BAA Status |
|----------|-------------|------------|
| Railway | Yes (PostgreSQL with `leads` table) | Unknown — must contact Railway support |
| Clerk | Yes (email addresses are PHI identifiers under HIPAA) | Unknown — check Clerk's enterprise plan |
| Vercel | No (frontend only, no PHI in server logs) | Likely not required, but verify no PHI leaks into Vercel logs |

**Impact:** Without BAAs, storing PHI on these platforms violates HIPAA regardless of technical controls. This is the single most critical compliance gap.

**Action required:** Luca to contact Railway and Clerk support to determine BAA availability. If unavailable, the team must evaluate alternative hosting (e.g., AWS with BAA, Aptible, or similar HIPAA-eligible platforms).

### 5.4 No ALTER SYSTEM Access (MEDIUM RISK)

**Issue:** Railway may not grant `ALTER SYSTEM` permissions to the default database user. This would prevent Gay Mark from configuring pgaudit settings even if the extension is available.

**Impact:** Blocks pgaudit configuration entirely if `ALTER SYSTEM` is restricted.

**Mitigation:** If `ALTER SYSTEM` is blocked, configuration must be set via Railway's PostgreSQL environment variables or by contacting Railway support. Luca to verify permissions.

### 5.5 Single Environment (LOW RISK for HIPAA, HIGH for Testing)

**Issue:** There is currently no dedicated staging environment. Production and staging share the same Railway deployment. Load testing against production risks degrading service and exposing PHI in test data.

**Impact:** Test data inserted during QA or load testing (k6) goes into the production database alongside real PHI.

**Mitigation:** Provision a separate Railway service for staging before Sprint 3 load testing begins. Use synthetic data only — never real patient data in test environments.

### 5.6 Internal Network Traffic Not Encrypted (LOW RISK)

**Issue:** Traffic between Railway's TLS-terminating edge proxy and the Uvicorn application container is unencrypted (standard PaaS pattern). Similarly, internal `.railway.internal` database connections may not use SSL by default.

**Impact:** If Railway's internal network were compromised, traffic could be intercepted. This is a theoretical risk mitigated by Railway's network isolation.

**Mitigation:** For higher assurance, configure the database connection string with `sslmode=require` even for internal connections. Verify with `pg_stat_ssl`.

---

## 6. Summary of Action Items

| # | Action | Owner | Deadline | Blocks |
|---|--------|-------|----------|--------|
| 1 | Send Railway team invite to Yuri (Viewer role) | Luca | Before Apr 2 | All Yuri verification |
| 2 | Check pgaudit availability on Railway Postgres | Luca | Before Apr 2 | T9, T10, AU1, AU3, AU4 |
| 3 | Check `ALTER SYSTEM` permissions on Railway | Luca | Before Apr 2 | pgaudit configuration |
| 4 | Contact Railway support about BAA availability | Luca | Before Apr 2 | O1 |
| 5 | Contact Clerk support about BAA availability | Luca | Before Apr 2 | O2 |
| 6 | Set up Railway log drain for long-term retention | Luca | Before Gate 4 | AU3 |
| 7 | Configure pgaudit (if available) | Gay Mark | Sprint 3 | T9, T10, AU1 |
| 8 | Implement app-level audit fallback (if pgaudit unavailable) | Gay Mark + John Donaldson | Sprint 3 | T9, T10, AU1 |
| 9 | Provision separate staging environment | Luca | Before load testing | Clean test isolation |
| 10 | Yuri runs full verification checklist | Yuri | Gate 4 | Pre-release sign-off |
