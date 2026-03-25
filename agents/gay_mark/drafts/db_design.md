# KidneyHood Database Design Documentation

**Author:** Gay Mark (Database Engineer)
**Version:** 1.0.0 (MVP)
**Date:** 2026-03-25
**Schema File:** `db_schema.sql` (same directory)

---

## 1. Schema Overview and Table Relationships

### Entity-Relationship Diagram (Text)

```
                    ┌─────────────────────┐
                    │       users         │
                    │─────────────────────│
                    │ PK  id          UUID│
                    │     email           │
                    │     name            │
                    │     date_of_birth   │
                    │     sex (CHECK)     │
                    │     height_cm       │
                    │     weight_kg       │
                    │     created_at      │
                    │     updated_at      │
                    └────┬──────┬─────────┘
                         │      │
              CASCADE    │      │  CASCADE
                         │      │
      ┌──────────────────┘      └──────────────────┐
      │                                            │
      ▼                                            ▼
┌─────────────────────┐              ┌─────────────────────────┐
│   lab_entries        │              │   magic_link_tokens     │
│─────────────────────│              │─────────────────────────│
│ PK  id          UUID│              │ PK  id              UUID│
│ FK  user_id     UUID│              │ FK  user_id          UUID│
│     visit_date      │              │     token_hash           │
│     age_at_visit    │              │     expires_at           │
│     bun (CHECK)     │              │     used_at              │
│     creatinine (CHK)│              │     created_at           │
│     potassium (CHK) │              └─────────────────────────┘
│     hemoglobin (CHK)│
│     glucose (CHECK) │
│     egfr_override   │
│     systolic_bp(CHK)│
│     sglt2_inhibitor │
│     upcr            │
│     upcr_unit (CHK) │
│     ckd_diagnosis   │
│     created_at      │
│     updated_at      │
└─────────────────────┘

      users.id ──(SET NULL)──▶ audit_log.user_id

┌─────────────────────┐         ┌─────────────────────┐
│   guest_sessions    │         │     audit_log       │
│─────────────────────│         │─────────────────────│
│ PK  id          UUID│         │ PK  id      BIGSERIAL│
│     session_token   │         │ FK  user_id     UUID │
│     lab_data  JSONB │         │     session_token    │
│     created_at      │         │     action           │
│     expires_at      │         │     resource_type    │
└─────────────────────┘         │     resource_id      │
                                │     details    JSONB │
                                │     ip_address  INET │
                                │     timestamp        │
                                └─────────────────────┘
```

### Relationships Summary

| Parent | Child | FK Column | On Delete |
|--------|-------|-----------|-----------|
| users | lab_entries | user_id | CASCADE |
| users | magic_link_tokens | user_id | CASCADE |
| users | audit_log | user_id | SET NULL |

- `guest_sessions` is standalone (no FK). Guest data is ephemeral.
- `audit_log` references `users` with SET NULL to preserve audit records after user deletion (Decision #14).

---

## 2. Normalization Strategy

The schema follows **Third Normal Form (3NF)** as a baseline:

- **1NF:** All columns hold atomic values. No repeating groups. JSONB columns (`lab_data`, `details`) are intentionally semi-structured for flexibility, not to avoid normalization.
- **2NF:** Every non-key column depends on the entire primary key (all PKs are single-column UUIDs or BIGSERIAL).
- **3NF:** No transitive dependencies. User demographics live in `users`; lab values live in `lab_entries`; session data lives in `guest_sessions`.

**No denormalization in MVP.** Query patterns are simple (filter by user_id, order by visit_date) and do not warrant materialized views or redundant columns. If prediction response times degrade with large visit histories (unlikely in MVP with <100 users), consider denormalization in a future phase.

---

## 3. Indexing Plan with Rationale

### Principles
1. **Index every foreign key** -- PostgreSQL does not auto-index FK columns.
2. **Index every API lookup path** -- if an endpoint filters or joins on a column, it gets an index.
3. **Index cron job predicates** -- the purge job filters on `expires_at`.
4. **Rely on UNIQUE constraints** where they exist -- `users.email` and `guest_sessions.session_token` already have unique indexes from the UNIQUE constraint.

### Index Inventory

| Index | Table | Columns | Access Pattern |
|-------|-------|---------|----------------|
| `idx_lab_entries_user_id` | lab_entries | user_id | FK lookup; GET /lab-entries, POST /predict |
| `idx_lab_entries_user_visit` | lab_entries | (user_id, visit_date) | Multi-visit queries ordered by date |
| `idx_magic_link_tokens_user_id` | magic_link_tokens | user_id | Cleanup/revocation of user's tokens |
| `idx_magic_link_tokens_hash` | magic_link_tokens | token_hash | POST /auth/verify token lookup |
| `idx_guest_sessions_expires_at` | guest_sessions | expires_at | Purge cron: `DELETE WHERE expires_at < NOW()` |
| `idx_audit_log_user_ts` | audit_log | (user_id, timestamp) | Audit queries by user + time range |
| `idx_audit_log_resource` | audit_log | (resource_type, resource_id) | "Show all access to this lab entry" |
| `idx_audit_log_action` | audit_log | action | Filter by action type across all users |
| (auto) `users_email_key` | users | email | Login/registration lookup |
| (auto) `guest_sessions_session_token_key` | guest_sessions | session_token | Guest session lookup |

### Future Considerations
- **Partial index** on `lab_entries` where `hemoglobin IS NOT NULL AND glucose IS NOT NULL` -- if Tier 2 queries become a hot path.
- **Partitioning** on `audit_log` by `timestamp` (monthly or quarterly) -- if the audit table exceeds 10M rows.

---

## 4. Constraint Philosophy

### NOT NULL by Default
Every column is `NOT NULL` unless the field is explicitly optional in the product spec. Nullable columns: `name`, `date_of_birth`, `height_cm`, `weight_kg` (user profile optional fields), `bun`, `creatinine`, `potassium`, `hemoglobin`, `glucose`, `egfr_override`, `systolic_bp`, `sglt2_inhibitor`, `upcr`, `upcr_unit`, `ckd_diagnosis` (optional lab fields), `used_at` (magic link lifecycle), and audit_log columns (`user_id`, `session_token`, `resource_id`, `details`, `ip_address`).

### CHECK Constraints as Defense-in-Depth (Decision #9)
API validation (Pydantic models in FastAPI) is the first line of defense. Database CHECK constraints are the last line. If a bug in the API layer allows invalid data through, the DB rejects it with a constraint violation. This prevents corrupt clinical data from ever being stored.

The CHECK ranges match the API validation ranges exactly (Decision #9). If John updates a range in the API contract, I update the corresponding CHECK constraint in a migration.

### Foreign Key Discipline
- **ON DELETE CASCADE** for user-owned data (`lab_entries`, `magic_link_tokens`). Deleting a user deletes their clinical data, satisfying HIPAA right-to-delete.
- **ON DELETE SET NULL** for `audit_log.user_id` (Decision #14). Audit records must outlive the user they reference.

### UUID Primary Keys
All application tables use UUID v4 (via `gen_random_uuid()`). Benefits:
- Prevents sequential ID enumeration attacks (OWASP A01:2021).
- Safe for distributed generation (no sequence contention).
- Consistent type across all entity references.

Exception: `audit_log` uses BIGSERIAL for write performance. Audit log rows are never exposed via API by primary key.

---

## 5. HIPAA Compliance Measures

### 5a. Encryption at Rest
All tables contain PHI (including `guest_sessions` per Decision #4). AWS RDS must be configured with:
- **AES-256 encryption** via AWS KMS customer-managed key.
- Encryption covers data files, automated backups, read replicas, and snapshots.
- The KMS key must be rotated annually per HIPAA Security Rule (164.312(a)(2)(iv)).

### 5b. Encryption in Transit (TLS)
- **TLS 1.2+** enforced on all database connections. The RDS parameter group must set `rds.force_ssl = 1`.
- Application connection strings must include `sslmode=verify-full` with the RDS CA certificate.
- No plaintext connections, even from the API server within the same VPC.

### 5c. Role-Based Access Control (RBAC)
Two database roles enforce least-privilege access:

| Role | Privileges | Purpose |
|------|-----------|---------|
| `app_service` | SELECT, INSERT, UPDATE, DELETE on data tables; INSERT-only on audit_log | FastAPI application runtime |
| `app_admin` | ALL on all tables and sequences | Alembic migrations, DDL, operational tasks |

**Critical:** `app_service` has INSERT-only access to `audit_log` -- it cannot UPDATE or DELETE audit records. This preserves the integrity of the audit trail even if the application is compromised.

### 5d. Audit Logging
The `audit_log` table records every create, read, update, and delete operation on PHI tables. The application layer (FastAPI middleware) is responsible for writing audit entries. The schema supports:
- **User attribution** via `user_id` (or `session_token` for guests).
- **Resource tracking** via `resource_type` + `resource_id`.
- **Context capture** via `details` JSONB (changed fields, error details, etc.).
- **IP logging** via `ip_address` INET.
- **Tamper resistance** -- `app_service` cannot UPDATE or DELETE audit_log rows.

### 5e. Backup Strategy
- AWS RDS automated backups with 35-day retention window.
- Point-in-time recovery enabled.
- All backups encrypted with the same KMS key as the live database.
- Restore procedures must be tested quarterly (recommend adding to operational runbook).

### 5f. Breach Notification Support
The audit_log table provides the forensic data needed for HIPAA breach notifications:
- **What was accessed:** `resource_type`, `resource_id`, `action`
- **Who accessed it:** `user_id`, `ip_address`
- **When:** `timestamp`
- **Context:** `details` JSONB

---

## 6. Guest Session Purge Cron Job Design

### Requirement
Decision #4 mandates 24-hour TTL on guest session data. Because guest data is PHI, stale data persisting beyond 24 hours is a HIPAA violation risk.

### Query
```sql
DELETE FROM guest_sessions WHERE expires_at < NOW();
```

### Schedule
Every 15 minutes (`*/15 * * * *`). This balances timely cleanup (sessions are purged within ~15 minutes of expiry) against database load.

### Implementation Options (in order of recommendation)

1. **pg_cron (recommended for MVP)** -- Runs inside PostgreSQL. No application dependency. Simple, reliable.
   ```sql
   SELECT cron.schedule(
       'purge_expired_guest_sessions',
       '*/15 * * * *',
       $$DELETE FROM guest_sessions WHERE expires_at < NOW()$$
   );
   ```
   Requires `pg_cron` extension to be enabled on RDS. Available on RDS PostgreSQL 12.5+.

2. **APScheduler (fallback)** -- Lightweight Python scheduler running in-process with FastAPI. No extra infrastructure. Risk: does not survive process restarts without persistence backend.

3. **Celery beat (production-grade)** -- Application-level scheduler. More testable, integrates with monitoring. Adds infrastructure (Redis/RabbitMQ broker). Recommended if the project grows beyond MVP.

### Audit Integration
Each purge run should log to `audit_log`:
```sql
INSERT INTO audit_log (action, resource_type, details)
VALUES ('guest_session_purge', 'guest_session', '{"deleted_count": 42}'::jsonb);
```

### Monitoring
Alert if the purge job has not run in 30 minutes (2x the scheduled interval). Stale PHI is a compliance risk.

---

## 7. Data Retention Policy

| Data Type | Retention Policy | Mechanism |
|-----------|-----------------|-----------|
| Guest sessions | 24 hours (Decision #4) | Purge cron every 15 minutes |
| User account + lab data | Until user requests deletion | `DELETE FROM users WHERE id = ?` (CASCADE removes lab_entries, magic_link_tokens) |
| Audit log | Indefinite (HIPAA minimum: 6 years) | ON DELETE SET NULL preserves records after user deletion |
| Backups | Per AWS RDS automated backup retention (recommend 35 days) | AWS manages; encrypted with same KMS key |

Account data retention policy to be finalized with legal counsel before production launch.

---

## 8. Migration Strategy (Alembic)

### Tooling
- **Alembic** with SQLAlchemy ORM models -- the standard for FastAPI + PostgreSQL projects.
- Migrations run under the `app_admin` role (has DDL privileges).
- The `app_service` role never runs migrations.

### Workflow
1. **Initial migration:** `db_schema.sql` is the source of truth. The first Alembic migration creates all tables, indexes, constraints, triggers, and grants exactly as specified in the DDL.
2. **Subsequent migrations:** Generated via `alembic revision --autogenerate` from SQLAlchemy model changes. Always reviewed manually before committing.
3. **Rollback:** Every migration includes a `downgrade()` function. Tested in dev/staging before production deployment.
4. **CI integration:** Migrations run as part of the test pipeline. The test database is created from migrations alone (no seed data in the migration itself).

### Environment Parity
All environments (local dev, CI, staging, production) use the same migration chain. No environment-specific DDL.

### Migration File Location
```
backend/
  alembic/
    versions/
      001_initial_schema.py
      ...
    env.py
    alembic.ini
```

---

## 9. PostgreSQL-Specific Features

| Feature | Usage | Why |
|---------|-------|-----|
| `gen_random_uuid()` | All UUID primary keys | Native UUID generation via pgcrypto. No application-side UUID libraries needed. |
| `TIMESTAMPTZ` | All timestamp columns | Stores timestamps with timezone awareness. Avoids ambiguity across time zones. Always UTC internally. |
| `JSONB` | `guest_sessions.lab_data`, `audit_log.details` | Binary JSON with indexing support. Flexible schema for semi-structured data. More efficient than TEXT+parsing. |
| `INET` | `audit_log.ip_address` | Native IP address type. Supports both IPv4 and IPv6. Validates format at insertion. |
| `pg_cron` | Guest session purge | In-database job scheduling. No external infrastructure. |
| `pgcrypto` | `gen_random_uuid()`, token hashing | Cryptographic functions for UUID generation and SHA-256 hashing. |
| `NUMERIC(p,s)` | All lab value columns | Exact decimal arithmetic. Avoids floating-point rounding errors in clinical data. |
| CHECK constraints | Lab value ranges, sex, upcr_unit, ckd_diagnosis | Declarative validation at the storage layer. |

---

## 10. Seed/Test Data Strategy (for Yuri)

### Principles
- **Synthetic data only.** No real patient data in any environment.
- **Deterministic.** Seed data uses fixed UUIDs and values so tests produce repeatable results.
- **Comprehensive.** Covers all confidence tiers, edge cases, and boundary values.

### Seed Data Categories

#### Users
| ID (fixed UUID) | Email | Sex | Purpose |
|-----------------|-------|-----|---------|
| `11111111-...-0001` | `tier1@test.kidney.local` | male | Tier 1 test user (required fields only) |
| `11111111-...-0002` | `tier2@test.kidney.local` | female | Tier 2 test user (hemoglobin + glucose) |
| `11111111-...-0003` | `tier3@test.kidney.local` | male | Tier 3 test user (3+ visits) |
| `11111111-...-0004` | `unknown@test.kidney.local` | unknown | Lower confidence tier (sex = unknown) |
| `11111111-...-0005` | `delete-me@test.kidney.local` | female | User deletion + audit trail test |

#### Lab Entries
- **Tier 1:** Single visit with BUN=20, creatinine=1.2, potassium=4.5, age=65. No hemoglobin/glucose.
- **Tier 2:** Single visit with Tier 1 fields + hemoglobin=13.5, glucose=100.
- **Tier 3:** Three visits (2025-01-15, 2025-06-15, 2025-12-15) with Tier 2 fields. Creatinine values show declining trend (1.2, 1.5, 1.8).
- **Boundary values:** BUN=5 (min), BUN=150 (max), creatinine=0.3 (min), creatinine=15.0 (max), potassium=2.0 (min), potassium=8.0 (max), age=18 (min), age=120 (max).
- **All optional fields populated:** One entry with every optional field filled in.

#### Guest Sessions
- **Active session:** `expires_at` = NOW() + 12 hours. Lab data JSONB matches Tier 1 shape.
- **Expired session:** `expires_at` = NOW() - 1 hour. For purge cron testing.
- **About-to-expire session:** `expires_at` = NOW() + 1 minute. For edge-case testing.

#### Audit Log
- Pre-populated entries for the delete-me test user to verify ON DELETE SET NULL behavior.

### Seed Script Delivery
The seed script will be a standalone SQL file (`seed_test_data.sql`) and/or a pytest fixture module. It will NOT be part of the Alembic migration chain -- seed data is test infrastructure only.

---

## 11. Alignment Notes

### Alignment with John Donaldson (API Contract)
- Column names in `lab_entries` match John's request schema field names exactly: `bun`, `creatinine`, `potassium`, `age_at_visit`, `hemoglobin`, `glucose`, `egfr_override`, `systolic_bp`, `sglt2_inhibitor`, `upcr`, `upcr_unit`, `ckd_diagnosis`.
- Note: John's draft uses `age` in the API request; the DB column is `age_at_visit` to distinguish from the user's current age. The API layer performs the mapping.
- John's `sex` field is on the API request but not duplicated in `lab_entries` -- it comes from the `users` table via join. For guest predictions with inline data, sex is in the JSONB payload.
- The two-endpoint pattern (Decision #8) maps cleanly: `POST /lab-entries` writes to `lab_entries`; `POST /predict` reads from `lab_entries` (auth) or `guest_sessions.lab_data` (guest).

### Alignment with Yuri (Test Requirements)
- CHECK constraint ranges match Yuri's boundary-value test expectations.
- Seed data categories align with Yuri's tier transition test cases (TC-TIER-01 through TC-TIER-08).
- ON DELETE SET NULL behavior on audit_log is testable via the `delete-me` seed user.
- Guest session purge is testable via the expired/about-to-expire seed sessions.
- Migration-only database setup supports Yuri's CI requirement for clean test databases.

### Alignment with Husser (Product/Compliance)
- Guest data retention: 24-hour TTL with purge cron (Decision #4).
- Account data retention: indefinite until user-initiated deletion. HIPAA right-to-delete satisfied via `ON DELETE CASCADE` on user-owned tables.
- Audit log retention: indefinite (HIPAA minimum 6 years). `ON DELETE SET NULL` preserves audit trail after user deletion (Decision #14).
