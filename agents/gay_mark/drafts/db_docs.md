# KidneyHood Database Design Documentation

**Author:** Gay Mark (Database Engineer)
**Version:** 2.0.0 (Lean Launch MVP)
**Date:** 2026-03-26
**Schema File:** `db_schema.sql` (same directory)

---

## 1. Design Rationale

### What Changed (v1.0 to v2.0)

The v1.0 schema had 5 tables (`users`, `magic_link_tokens`, `lab_entries`, `guest_sessions`, `audit_log`) with full HIPAA/RBAC infrastructure. The CEO Test and Lean Launch MVP PRD cut scope dramatically:

| v1.0 (Original PRD) | v2.0 (Lean Launch) | Why |
|---|---|---|
| 5 tables | 1 table (`leads`) | Lead-gen app, not a patient portal |
| `users` table with demographics | Clerk manages auth externally | No local user accounts |
| `magic_link_tokens` with SHA-256 hashing | Clerk handles magic links | No custom token infrastructure |
| `lab_entries` with 15+ columns, potassium | `leads` with 3 required inputs (age, BUN, creatinine) | Potassium removed per Lee's calc spec v2.0; optional fields deferred |
| `guest_sessions` with 24hr TTL + purge cron | No sessions table | Stateless; return visitors start fresh |
| `audit_log` with RBAC grants | No audit table | HIPAA deferred; no long-term PHI storage |
| RBAC roles (`app_service`, `app_admin`) | Railway default role | No least-privilege separation needed for MVP |
| AWS RDS + KMS encryption | Railway managed Postgres | Simpler hosting, no KMS |
| `pgcrypto` extension | Not needed | `gen_random_uuid()` is built into PostgreSQL 13+ |

### The `leads` Table

The single table captures every prediction submission. One row per `POST /predict` call. Fields:

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `id` | UUID | No (PK) | Primary key via `gen_random_uuid()` |
| `email` | TEXT | No | Patient email from Clerk. Feeds email campaign. |
| `name` | TEXT | No | Patient name from prediction form. |
| `age` | INTEGER | No | Patient age (18-120). Required for CKD-EPI eGFR. |
| `bun` | NUMERIC | No | Blood Urea Nitrogen (5-150 mg/dL). Required engine input. |
| `creatinine` | NUMERIC | No | Serum Creatinine (0.3-15.0 mg/dL). Required for CKD-EPI eGFR. |
| `egfr_baseline` | NUMERIC | Yes | Calculated baseline eGFR. Stored for reference; computed server-side. |
| `created_at` | TIMESTAMPTZ | No | Submission timestamp (UTC). |

**Fields NOT included:**
- **potassium** — removed per Lee's calc spec v2.0, Correction 2.
- **sex** — marketing app uses population-average CKD-EPI coefficients (kappa=0.9, alpha=-0.302). No sex input on the form.
- **hemoglobin, CO2, albumin** — optional Tier 2 modifiers, deferred to Phase 2.
- **visit_date** — no multi-visit tracking in MVP.
- **user_id** — no local user accounts; Clerk manages identity.

---

## 2. Indexing Strategy

Two indexes support the primary access patterns:

| Index | Column | Access Pattern |
|-------|--------|----------------|
| `idx_leads_email` | `email` | CSV export filtering, duplicate lookups |
| `idx_leads_created_at` | `created_at` | CSV export date-range filtering, analytics |

No foreign key indexes needed — there are no foreign keys.

---

## 3. Constraint Philosophy

### CHECK Constraints as Defense-in-Depth

The `leads` table has CHECK constraints on `age`, `bun`, and `creatinine` that mirror the API validation ranges. If a bug in the FastAPI Pydantic layer allows invalid data through, the database rejects it.

| Column | CHECK | Matches |
|--------|-------|---------|
| `age` | `BETWEEN 18 AND 120` | Form validation range |
| `bun` | `BETWEEN 5 AND 150` | Form validation range |
| `creatinine` | `BETWEEN 0.3 AND 15.0` | Form validation range |

### NOT NULL by Default

Every column is `NOT NULL` except `egfr_baseline` (computed server-side, may be omitted if the patient provides their own eGFR).

### UUID Primary Key

Uses `gen_random_uuid()` (built into PostgreSQL 13+). Prevents sequential ID enumeration. No `pgcrypto` extension required.

---

## 4. Infrastructure

### Railway Managed Postgres

- **Encryption at rest:** Railway encrypts all data at rest by default.
- **Encryption in transit:** TLS enforced on all connections.
- **Backups:** Railway provides automatic daily backups with point-in-time recovery.
- **No RBAC roles:** Railway provisions a single connection string. The `app_service`/`app_admin` role separation from v1.0 is removed.

### No Purge Cron

No ephemeral data requiring scheduled cleanup. The `leads` table is append-only with indefinite retention (leads are business assets, not PHI).

---

## 5. Migration Strategy (Alembic)

### Initial Migration

The `db_schema.sql` file is the source of truth. The first Alembic migration creates the `leads` table and its two indexes.

### Workflow

1. Alembic with SQLAlchemy ORM models.
2. Migrations run via Railway's default database role.
3. Every migration includes a `downgrade()` function.
4. CI runs migrations against a clean test database.

### Migration File Location

```
backend/
  alembic/
    versions/
      001_initial_schema.py
    env.py
    alembic.ini
```

---

## 6. Seed Data (for Yuri's Testing)

### Principles

- Synthetic data only. No real patient data.
- Deterministic. Fixed UUIDs for repeatable tests.
- Covers boundary values for all CHECK constraints.

### Seed Leads

| Email | Name | Age | BUN | Creatinine | Purpose |
|-------|------|-----|-----|------------|---------|
| `vector1@test.kidney.local` | Test Patient 1 | 58 | 35 | 2.1 | Calc spec test vector 1 (Stage 3b) |
| `vector2@test.kidney.local` | Test Patient 2 | 65 | 53 | 5.0 | Calc spec test vector 2 (Stage 5) |
| `vector3@test.kidney.local` | Test Patient 3 | 52 | 22 | 1.5 | Calc spec test vector 3 (Stage 3a) |
| `min@test.kidney.local` | Min Values | 18 | 5 | 0.3 | Boundary: all minimums |
| `max@test.kidney.local` | Max Values | 120 | 150 | 15.0 | Boundary: all maximums |

Seed script will be a standalone SQL file (`seed_test_data.sql`) and/or a pytest fixture. Not part of the Alembic migration chain.

---

## 7. Email Campaign Integration

**Launch workflow:** Manual CSV export from the `leads` table weekly.

```sql
-- Weekly CSV export query
COPY (
    SELECT email, name, age, bun, creatinine, egfr_baseline, created_at
    FROM leads
    WHERE created_at >= now() - INTERVAL '7 days'
    ORDER BY created_at
) TO STDOUT WITH CSV HEADER;
```

**Phase 2:** Direct API integration with the chosen email provider once the funnel is validated.

---

## 8. Alignment Notes

### Alignment with John Donaldson (API Contract)

- `POST /predict` request body fields (`email`, `name`, `age`, `bun`, `creatinine`) map 1:1 to `leads` table columns.
- Lead capture happens inside the `/predict` handler — no separate endpoint.
- `egfr_baseline` is computed server-side and stored alongside the lead.
- No `sex` field in the API request or database — population-average CKD-EPI coefficients used.

### Alignment with Yuri (Test Requirements)

- CHECK constraint ranges match boundary-value test expectations.
- Seed data covers all 3 calc spec test vectors.
- Boundary min/max seed rows test constraint enforcement.
- No cascade/purge/audit behavior to test (removed in v2.0).

### Alignment with Husser (Product/Compliance)

- Leads table supports weekly CSV export for email campaign (no automation at launch).
- No HIPAA infrastructure — this is a marketing lead-gen app, not a patient portal.
- Data retention: indefinite. Leads are business assets.

---

## 9. Deferred to Phase 2

| Feature | v1.0 Table/Component | Phase 2 Trigger |
|---------|----------------------|-----------------|
| User accounts | `users` table | If product pivots to patient portal |
| Custom auth tokens | `magic_link_tokens` table | If Clerk is replaced |
| Multi-visit lab history | `lab_entries` table | If multi-visit tracking is added |
| Guest session persistence | `guest_sessions` table | If return-visitor data is needed |
| HIPAA audit trail | `audit_log` table | If PHI is stored long-term |
| RBAC database roles | `app_service`, `app_admin` | If least-privilege separation is required |
| Optional lab fields (hemoglobin, CO2, albumin) | Additional columns | If Tier 2 confidence is implemented |
| Potassium | Column in `lab_entries` | Removed from engine entirely per Lee's v2.0 spec |
