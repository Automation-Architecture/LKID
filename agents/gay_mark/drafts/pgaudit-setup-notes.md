# pgaudit Configuration Notes — LKID-55

**Author:** Gay Mark (Database Engineer)
**Date:** 2026-03-27
**Purpose:** Document pgaudit setup for HIPAA compliance on Railway PostgreSQL.

---

## 1. Enabling pgaudit on Railway PostgreSQL

Railway uses managed PostgreSQL instances. Enabling pgaudit requires modifying the `shared_preload_libraries` setting, which needs a server restart.

### Steps

1. **Check if pgaudit is available:**
   ```sql
   SELECT * FROM pg_available_extensions WHERE name = 'pgaudit';
   ```
   If pgaudit is not listed, it is not compiled into the Railway PostgreSQL image. See "Railway-Specific Limitations" below.

2. **Load the extension (requires superuser or Railway support):**
   ```sql
   -- Add to shared_preload_libraries (requires restart)
   ALTER SYSTEM SET shared_preload_libraries = 'pgaudit';

   -- Create the extension
   CREATE EXTENSION IF NOT EXISTS pgaudit;
   ```

3. **Configure audit logging settings:**
   ```sql
   -- Log all DML on specified tables (INSERT, UPDATE, DELETE, SELECT)
   ALTER SYSTEM SET pgaudit.log = 'write, ddl';

   -- Log the statement parameters (actual values, not just $1, $2)
   ALTER SYSTEM SET pgaudit.log_parameter = on;

   -- Include the object name in log entries
   ALTER SYSTEM SET pgaudit.log_relation = on;

   -- Log statement even if it was part of a transaction that rolled back
   ALTER SYSTEM SET pgaudit.log_statement_once = off;
   ```

4. **Restart the PostgreSQL service** via Railway dashboard or CLI:
   ```bash
   railway service restart
   ```

5. **Verify pgaudit is loaded:**
   ```sql
   SHOW shared_preload_libraries;
   -- Should include 'pgaudit'

   SELECT extname, extversion FROM pg_extension WHERE extname = 'pgaudit';
   ```

---

## 2. Tables Requiring Audit Logging

All tables containing PHI (Protected Health Information) must be audited under HIPAA:

| Table | PHI Fields | Audit Scope |
|-------|-----------|-------------|
| `leads` | email, name, age, bun, creatinine, egfr_baseline | INSERT, UPDATE, DELETE |
| `lab_entries` (future) | All lab values linked to a patient | INSERT, UPDATE, DELETE |
| `users` (future) | email, name, Clerk user ID | INSERT, UPDATE, DELETE |

### Object-Level Audit Configuration

For granular control, use object-level auditing instead of (or in addition to) statement-level:

```sql
-- Create an audit role
CREATE ROLE auditor NOLOGIN;

-- Grant the audit role SELECT on PHI tables
-- pgaudit logs all access by this role
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO auditor;

-- Set the role for object auditing
ALTER SYSTEM SET pgaudit.role = 'auditor';
```

This is more targeted than statement-level logging (`pgaudit.log = 'write'`), which logs ALL writes across all tables including non-PHI tables.

---

## 3. Recommended pgaudit.log Settings for HIPAA

```sql
-- HIPAA-recommended settings
ALTER SYSTEM SET pgaudit.log = 'write, ddl';
ALTER SYSTEM SET pgaudit.log_parameter = on;
ALTER SYSTEM SET pgaudit.log_relation = on;
ALTER SYSTEM SET pgaudit.log_catalog = off;     -- skip pg_catalog queries (noisy)
ALTER SYSTEM SET pgaudit.log_level = 'log';     -- use 'log' level (captured by Railway)
ALTER SYSTEM SET pgaudit.log_statement_once = off;
```

### Setting Rationale

| Setting | Value | Why |
|---------|-------|-----|
| `pgaudit.log` | `write, ddl` | Captures all data modifications and schema changes. HIPAA requires tracking who accessed/modified PHI. |
| `pgaudit.log_parameter` | `on` | Logs actual parameter values so auditors can see what data was inserted/modified. Required for breach investigation. |
| `pgaudit.log_relation` | `on` | Includes table name in every log entry — essential for filtering PHI table access. |
| `pgaudit.log_catalog` | `off` | Suppresses noisy pg_catalog queries that add no HIPAA value. |
| `pgaudit.log_level` | `log` | Ensures entries appear in Railway's log viewer (Railway captures LOG level and above). |

### What Gets Logged

Each audit log entry includes:
- Timestamp (UTC)
- Database user
- Remote host/IP
- SQL command type (INSERT, UPDATE, DELETE, DDL)
- Full SQL statement text
- Parameter values (if `log_parameter = on`)
- Table/relation name (if `log_relation = on`)
- Session ID

---

## 4. How Yuri Can Query the Audit Log

pgaudit writes to the standard PostgreSQL server log, not to a separate table. On Railway, logs are accessible via:

### Option A: Railway Dashboard

1. Navigate to the PostgreSQL service in the Railway dashboard
2. Click the "Logs" tab
3. Filter for `AUDIT:` prefix — all pgaudit entries start with this string
4. Use the search bar to filter by table name: `AUDIT: leads`

### Option B: Railway CLI

```bash
# Stream logs and filter for audit entries
railway logs --service postgres | grep "AUDIT:"

# Filter for specific table
railway logs --service postgres | grep "AUDIT:.*leads"

# Filter for a specific operation
railway logs --service postgres | grep "AUDIT:.*INSERT.*leads"
```

### Option C: SQL Verification Query

Run a test INSERT and verify it appears in the logs:

```sql
-- 1. Insert a test lead
INSERT INTO leads (email, name, age, bun, creatinine)
VALUES ('audit-test@example.com', 'Audit Test', 50, 25.0, 1.5);

-- 2. Check Railway logs within 5 seconds — look for:
--    AUDIT: SESSION,1,1,WRITE,INSERT,,leads,
--    "INSERT INTO leads (email, name, age, bun, creatinine) VALUES ($1, $2, $3, $4, $5)"

-- 3. Clean up
DELETE FROM leads WHERE email = 'audit-test@example.com';

-- 4. Verify the DELETE also appears in audit log
```

### Verification Checklist for Yuri

- [ ] `SHOW shared_preload_libraries` includes `pgaudit`
- [ ] `SELECT extname FROM pg_extension WHERE extname = 'pgaudit'` returns a row
- [ ] INSERT on `leads` produces an `AUDIT:` log entry
- [ ] UPDATE on `leads` produces an `AUDIT:` log entry
- [ ] DELETE on `leads` produces an `AUDIT:` log entry
- [ ] Log entries include the table name (`leads`)
- [ ] Log entries include parameter values (not just `$1, $2`)
- [ ] DDL changes (ALTER TABLE, DROP TABLE) produce audit entries

---

## 5. Railway-Specific Limitations

### pgaudit May Not Be Available

Railway's managed PostgreSQL uses a standard Docker image. As of 2026-03, **pgaudit is NOT included by default** in Railway's PostgreSQL image. Options:

1. **Request from Railway support:** Open a support ticket asking for pgaudit to be added to the image. Railway has done this for other extensions on request.

2. **Use a custom Dockerfile:** Deploy PostgreSQL via a custom Dockerfile that installs pgaudit:
   ```dockerfile
   FROM postgres:15
   RUN apt-get update && apt-get install -y postgresql-15-pgaudit
   ```
   This means moving from Railway's managed Postgres to a Dockerized service — increases operational burden.

3. **Application-level audit logging (fallback):** If pgaudit cannot be enabled, implement audit logging in the FastAPI application layer:
   - Log all DB write operations with timestamp, user, operation, table, and values
   - Use Python's `logging` module with a dedicated `audit` logger
   - Ship logs to an external service (e.g., Railway log drain to Datadog/Papertrail)

### No ALTER SYSTEM Access

Railway may not grant `ALTER SYSTEM` permissions to the default database user. In that case:
- Configuration must be set via Railway's environment variables or PostgreSQL config settings in the Railway dashboard
- Ask Luca to check if `ALTER SYSTEM` is permitted on the Railway instance

### Log Retention

Railway retains service logs for a limited window (typically 7 days on the Pro plan). For HIPAA compliance:
- **Set up a log drain** to forward PostgreSQL logs to a long-term storage service
- HIPAA requires audit logs to be retained for a minimum of 6 years
- Recommended: Papertrail, Datadog, or AWS CloudWatch via Railway log drain

### Connection Pooling

If using PgBouncer or Railway's built-in connection pooling, audit logs will show the pooler's IP address as the client, not the end user's IP. The application must include user identity in the SQL comments or use `SET application_name` for traceability.

---

## Next Steps

1. **Luca:** Check if pgaudit is available on the Railway PostgreSQL instance (`SELECT * FROM pg_available_extensions WHERE name = 'pgaudit'`)
2. **Luca:** Verify if `ALTER SYSTEM` is permitted on the Railway database user
3. **Gay Mark:** If pgaudit is available, apply the configuration above
4. **Gay Mark:** If pgaudit is NOT available, implement application-level audit logging as fallback (Task 4.3 blocking finding)
5. **Yuri:** Run the verification checklist once pgaudit is configured
6. **Luca:** Set up Railway log drain for HIPAA-compliant log retention
