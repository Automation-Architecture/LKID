# KidneyHood Database Deployment Runbook

**Author:** Gay Mark (Database Engineer)
**Version:** 1.0.0
**Date:** 2026-03-26
**Target:** Sprint 2, Day 1 (April 6, 2026)
**Schema File:** `db_schema.sql` (same directory)

---

## 1. Railway Postgres Setup Checklist

### 1.1 Create the Database Instance

1. Open the [Railway Dashboard](https://railway.app/dashboard).
2. Select the KidneyHood project (or create one).
3. Click **+ New** > **Database** > **PostgreSQL**.
4. Railway provisions a managed Postgres 15+ instance automatically.
5. Wait for the instance status to show **Available** (usually under 30 seconds).

### 1.2 Retrieve the Connection String

Railway exposes connection details under the **Variables** tab of the Postgres service. The connection string format is:

```
postgresql://<user>:<password>@<host>:<port>/<dbname>
```

Example:

```
postgresql://postgres:abc123xyz@roundhouse.proxy.rlwy.net:54321/railway
```

Copy the full `DATABASE_URL` value from Railway's Variables tab.

### 1.3 SSL Configuration

Railway requires SSL for all external connections. The FastAPI service running on the same Railway project connects over the internal network, but SSL is still enforced.

For SQLAlchemy / asyncpg, append the SSL parameter to the connection string:

```
postgresql+asyncpg://postgres:abc123xyz@roundhouse.proxy.rlwy.net:54321/railway?ssl=require
```

If using raw `psql` from a local machine:

```bash
psql "postgresql://postgres:abc123xyz@roundhouse.proxy.rlwy.net:54321/railway?sslmode=require"
```

### 1.4 Set the Environment Variable

On the FastAPI service in Railway:

1. Go to the FastAPI service > **Variables** tab.
2. Add a new variable:
   - **Key:** `DATABASE_URL`
   - **Value:** the full connection string from step 1.2 (with `postgresql+asyncpg://` scheme and `?ssl=require` suffix)
3. Railway automatically redeploys the service when variables change.

Alternatively, use Railway's built-in variable reference to link directly:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

This keeps credentials in sync if Railway rotates them.

---

## 2. Migration Strategy

### 2.1 Initial Migration (Manual)

The first deployment runs `db_schema.sql` directly. This creates the `leads` table and both indexes.

Connect to the Railway Postgres instance and execute:

```bash
psql "$DATABASE_URL" -f db_schema.sql
```

Verify the table was created:

```sql
\dt leads
\di idx_leads_email
\di idx_leads_created_at
```

### 2.2 Alembic Setup for Future Migrations

After the initial manual migration, all subsequent schema changes go through Alembic.

#### Initialize Alembic

From the backend project root:

```bash
pip install alembic asyncpg sqlalchemy
alembic init alembic
```

#### Directory Structure

```
backend/
├── alembic/
│   ├── versions/
│   │   └── 001_create_leads_table.py
│   ├── env.py
│   └── script.py.mako
├── alembic.ini
├── app/
│   └── models.py          # SQLAlchemy model for leads
└── requirements.txt
```

#### Configure `alembic.ini`

Set the database URL (override from environment in production):

```ini
sqlalchemy.url = postgresql+asyncpg://localhost:5432/kidneyhood_dev
```

#### Configure `env.py`

Update `env.py` to read `DATABASE_URL` from the environment and import the models metadata:

```python
import os
from app.models import Base

config.set_main_option(
    "sqlalchemy.url",
    os.environ.get("DATABASE_URL", config.get_main_option("sqlalchemy.url"))
)
target_metadata = Base.metadata
```

### 2.3 First Migration File

Create the initial migration that represents the current schema state. Since the table already exists from the manual `db_schema.sql` run, this migration serves as the Alembic baseline.

**File:** `alembic/versions/001_create_leads_table.py`

```python
"""Create leads table

Revision ID: 001
Revises:
Create Date: 2026-04-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("bun", sa.Numeric(), nullable=False),
        sa.Column("creatinine", sa.Numeric(), nullable=False),
        sa.Column("egfr_baseline", sa.Numeric(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.CheckConstraint("age BETWEEN 18 AND 120", name="ck_leads_age"),
        sa.CheckConstraint("bun BETWEEN 5 AND 150", name="ck_leads_bun"),
        sa.CheckConstraint("creatinine BETWEEN 0.3 AND 15.0",
                           name="ck_leads_creatinine"),
    )
    op.create_index("idx_leads_email", "leads", ["email"])
    op.create_index("idx_leads_created_at", "leads", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_leads_created_at", table_name="leads")
    op.drop_index("idx_leads_email", table_name="leads")
    op.drop_table("leads")
```

#### Stamp the Baseline

Since the table already exists from the manual SQL run, stamp Alembic to recognize the current state without re-running the migration:

```bash
alembic stamp 001
```

#### Future Migrations

Generate new migrations with:

```bash
alembic revision --autogenerate -m "description of change"
alembic upgrade head
```

Every migration must include a working `downgrade()` function.

---

## 3. Seed Data for Development

These INSERT statements use Lee's three test vectors plus two boundary-value rows. Run against the development database only -- never in production.

**File:** `seed_test_data.sql`

```sql
-- =============================================================================
-- KidneyHood Seed Data — Development / Testing Only
-- Matches Lee's calc spec test vectors + boundary values
-- =============================================================================

-- Vector 1: Stage 3b — BUN 35, Creatinine 2.1, Age 58, eGFR ~33
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES (
    '00000000-0000-4000-a000-000000000001',
    'vector1@test.kidney.local',
    'Test Patient 1',
    58, 35, 2.1, 33
);

-- Vector 2: Stage 5 — BUN 53, Creatinine 5.0, Age 65, eGFR ~10
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES (
    '00000000-0000-4000-a000-000000000002',
    'vector2@test.kidney.local',
    'Test Patient 2',
    65, 53, 5.0, 10
);

-- Vector 3: Stage 3a — BUN 22, Creatinine 1.5, Age 52, eGFR ~48
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES (
    '00000000-0000-4000-a000-000000000003',
    'vector3@test.kidney.local',
    'Test Patient 3',
    52, 22, 1.5, 48
);

-- Boundary: all minimum values
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES (
    '00000000-0000-4000-a000-000000000004',
    'min@test.kidney.local',
    'Min Values',
    18, 5, 0.3, NULL
);

-- Boundary: all maximum values
INSERT INTO leads (id, email, name, age, bun, creatinine, egfr_baseline)
VALUES (
    '00000000-0000-4000-a000-000000000005',
    'max@test.kidney.local',
    'Max Values',
    120, 150, 15.0, NULL
);
```

Run with:

```bash
psql "$DATABASE_URL" -f seed_test_data.sql
```

Verify:

```sql
SELECT email, age, bun, creatinine, egfr_baseline FROM leads ORDER BY id;
```

---

## 4. Backup and Monitoring

### 4.1 Railway Automatic Backups

Railway managed Postgres includes:

- **Daily automatic backups** with point-in-time recovery.
- **Retention:** 7 days on the Pro plan.
- **Restore:** Available via the Railway dashboard under the Postgres service > **Backups** tab.

No manual cron or `pg_dump` setup is needed for the MVP. For additional safety before destructive migrations, run a manual backup:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup_$(date +%Y%m%d).dump
```

### 4.2 Connection Pooling for FastAPI

FastAPI with asyncpg should use a bounded connection pool. Recommended settings for the Railway starter tier:

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    DATABASE_URL,
    pool_size=5,          # steady-state connections
    max_overflow=5,       # burst capacity (total max: 10)
    pool_timeout=30,      # seconds to wait for a connection
    pool_recycle=1800,    # recycle connections every 30 minutes
    pool_pre_ping=True,   # verify connection health before use
)
```

Railway starter Postgres supports ~20 concurrent connections. With `pool_size=5` and `max_overflow=5`, the FastAPI service uses at most 10, leaving headroom for `psql` sessions and Alembic migrations.

### 4.3 Monitor Leads Table Growth

Run periodically (or add to an admin endpoint) to track table size:

```sql
-- Total lead count
SELECT count(*) AS total_leads FROM leads;

-- Leads per day (last 14 days)
SELECT
    date_trunc('day', created_at) AS day,
    count(*)                      AS leads
FROM leads
WHERE created_at >= now() - INTERVAL '14 days'
GROUP BY 1
ORDER BY 1;

-- Table size on disk
SELECT
    pg_size_pretty(pg_total_relation_size('leads')) AS total_size,
    pg_size_pretty(pg_relation_size('leads'))       AS table_size,
    pg_size_pretty(pg_indexes_size('leads'))        AS index_size;
```

At 1 KB per row, the table can hold ~1 million leads before reaching 1 GB. This is well within Railway's storage limits for the MVP.

---

## 5. Security Considerations

### 5.1 Data Classification

The `leads` table stores **marketing lead data**, not medical records:

| Column | Classification | Notes |
|--------|---------------|-------|
| `email` | PII (low sensitivity) | Business email for campaign |
| `name` | PII (low sensitivity) | First/last name from form |
| `age` | Demographic | Not PHI without a medical context |
| `bun`, `creatinine` | Lab inputs | Self-reported, not from EHR |
| `egfr_baseline` | Derived value | Calculated, not clinical |

This is a lead-gen app, not a patient portal. No HIPAA compliance is required. No SSN, DOB, insurance, or clinical records are stored.

### 5.2 CHECK Constraints as Defense-in-Depth

The database enforces range constraints independently of the API layer:

| Constraint | Protects Against |
|------------|-----------------|
| `age BETWEEN 18 AND 120` | API bypass inserting invalid age |
| `bun BETWEEN 5 AND 150` | API bypass inserting out-of-range BUN |
| `creatinine BETWEEN 0.3 AND 15.0` | API bypass inserting out-of-range creatinine |
| `NOT NULL` on all required columns | Incomplete records from malformed requests |

If the FastAPI Pydantic validation layer has a bug, the database rejects invalid data at the constraint level.

### 5.3 Access Architecture

```
Browser  -->  Next.js (Vercel)  -->  FastAPI (Railway)  -->  PostgreSQL (Railway)
                                         ^                        ^
                                    API only               No direct access
                                    Pydantic validation    CHECK constraints
```

- **No direct database access from the frontend.** All writes go through the FastAPI `/predict` endpoint.
- **No public-facing database port.** Railway Postgres is only accessible via the internal network or authenticated connection string.
- **No admin panel at launch.** CSV export is manual via `psql`.
- **Connection string stored as Railway environment variable.** Never committed to source control.

### 5.4 Credential Hygiene

- `DATABASE_URL` is set via Railway's environment variable system, never hardcoded.
- `.env` files containing `DATABASE_URL` must be in `.gitignore`.
- The connection string is never logged. FastAPI's SQLAlchemy engine should use `echo=False` (the default).

---

## 6. Pre-Flight Checklist

Use this checklist on Sprint 2 day 1 before writing any API code.

```
[ ] Railway project created
[ ] Postgres service provisioned and status is Available
[ ] DATABASE_URL copied and verified with psql connection test
[ ] SSL connection confirmed (psql with ?sslmode=require)
[ ] db_schema.sql executed — leads table and indexes created
[ ] seed_test_data.sql executed — 5 seed rows inserted
[ ] SELECT count(*) FROM leads returns 5
[ ] DATABASE_URL set on FastAPI service in Railway
[ ] .env added to .gitignore (if using local .env)
[ ] Alembic initialized and baseline stamped (alembic stamp 001)
[ ] FastAPI can connect (test endpoint or startup log confirms pool creation)
```

---

## 7. Troubleshooting

### Connection Refused

Railway Postgres may not be reachable from outside the project network without the proxy URL. Use the **Public Networking** toggle on the Postgres service if you need external `psql` access during development.

### SSL Error: `SSL connection is required`

Ensure the connection string includes `?sslmode=require` (for psql) or `?ssl=require` (for asyncpg). Railway terminates non-SSL connections.

### CHECK Constraint Violation on Seed Data

If seed inserts fail with a CHECK constraint error, verify the values fall within the defined ranges:
- `age`: 18--120
- `bun`: 5--150
- `creatinine`: 0.3--15.0

### Alembic "Target database is not up to date"

This means Alembic's version table is behind. Run:

```bash
alembic upgrade head
```

If the table already exists and you just need to mark it as current:

```bash
alembic stamp head
```
