# Gay Mark — Database Engineer
## Discovery Phase: Pre-Meeting 1 Notes (Revised Post-Meeting 1)

---

## Meeting 1 Decisions

All 14 decisions below are **binding** per Luca (Orchestrator).

| # | Decision | DB Impact | Status |
|---|----------|-----------|--------|
| 1 | Magic link auth only — no passwords | REMOVE `password_hash` from `users`. ADD `magic_link_tokens` table. | **RESOLVED** — schema updated below |
| 2 | MVP scope: PDF deferred | No `predictions` table needed for MVP | **RESOLVED** — Decision 4 confirmed |
| 3 | Sex field required | `CHECK (sex IN ('male', 'female', 'unknown'))` — already in draft | **RESOLVED** — no change needed |
| 4 | Guest data: server-side, 24hr TTL, full HIPAA | `guest_sessions` table with JSONB + `expires_at` approved. Purge cron required. | **RESOLVED** — schema updated below |
| 5 | X-axis: true linear time scale | No DB impact | N/A |
| 6 | Charting library: Visx | No DB impact | N/A |
| 7 | Frontend stack approved | No DB impact | N/A |
| 8 | Separate concerns: POST /lab-entries stores data | `lab_entries` table is the storage foundation | **RESOLVED** — schema confirmed |
| 9 | Error response contract approved | CHECK constraints mirror API validation ranges | **RESOLVED** — no change needed |
| 10 | No prediction result storage in MVP | No `predictions` table. Recompute on demand. | **RESOLVED** — Decision 4 confirmed |
| 11 | Disclaimer mobile approved | No DB impact | N/A |
| 12 | Tier transitions: both hemoglobin AND glucose for Tier 2 | No schema change needed — both fields already exist in `lab_entries` | **RESOLVED** |
| 13 | Test vectors from Lee | Yuri needs seed data based on my schema | **ACTION ITEM** |
| 14 | Audit log: ON DELETE SET NULL on user_id | My recommendation accepted | **RESOLVED** — schema confirmed |

---

## 1. Role and Deliverables

I am the Database Engineer on the KidneyHood team. My primary deliverable is `artifacts/db_schema.sql` — the complete PostgreSQL schema that underpins every data operation in this application.

### What I Own
- **PostgreSQL schema design** — all tables, columns, types, defaults, and comments
- **Relationships and foreign keys** — referential integrity across the data model
- **Indexes** — performance indexes for every query pattern implied by the API contract and UX flows
- **Constraints** — CHECK constraints for lab value validation ranges, NOT NULL policies, UNIQUE constraints
- **Migration strategy** — versioned, repeatable migrations (Alembic with FastAPI)
- **HIPAA-compliant storage configuration** — encryption at rest (RDS/KMS), RBAC for DB access, audit-friendly schema design
- **Data retention and purge logic** — guest session TTL (24hr, Decision #4), purge cron job
- **Seed/test data schema** — structures that Yuri can use for QA without touching real patient data

### What I Do NOT Own
- API endpoint design or implementation (John Donaldson)
- Frontend data fetching or state management (Harshit)
- UX flows or form field ordering (Inga)
- Product scope or acceptance criteria (Husser)
- Infrastructure provisioning (shared concern, but I advise on RDS configuration)

---

## 2. Role Boundaries

I design and own the database schema. I do not:
- Write FastAPI route handlers or Pydantic models (that is John's domain, though my schema informs his models)
- Build or modify React components
- Make product scope decisions
- Modify any other agent's artifacts

I will publish my schema to `artifacts/db_schema.sql` and draft iteratively in `agents/gay_mark/drafts/`. Other agents read my published schema but do not modify it.

---

## 3. Dependencies I Have on Other Agents

### From Husser (Product Manager)
- ~~**Finalized field list and data types**~~ — **RESOLVED at Meeting 1.** Sex is required (Decision #3). Field list confirmed via lab_entries schema approval (Decision #8).
- ~~**Data retention policy decision**~~ — **RESOLVED.** Guest sessions: 24-hour TTL, server-side, full HIPAA (Decision #4).
- ~~**Multi-visit data model confirmation**~~ — **RESOLVED.** POST /lab-entries stores to `lab_entries` table. Server stores visits persistently (Decision #8).
- **HIPAA compliance section** — Co-author with Husser during parallel drafting (new action item).

### From John Donaldson (API Designer)
- **Finalized API contract** — My schema must align 1:1 with John's request/response models. POST /lab-entries stores to `lab_entries` (Decision #8). Predict is separate (Decision #8). Need final endpoint specs to confirm column mapping.
- ~~**Error response contract**~~ — **RESOLVED.** Approved at Meeting 1 (Decision #9). CHECK constraints mirror API validation ranges.

### From Inga (UX/UI Designer)
- **Guest-to-account migration flow** — I need to understand how guest data migrates to an account. This affects whether `guest_sessions` JSONB is parsed and inserted into `lab_entries` on account creation.

---

## 4. Dependencies Other Agents Have on Me

### John Donaldson Needs
- **Table definitions and column types** — His Pydantic models must mirror my PostgreSQL types exactly. Schema is stabilized post-Meeting 1.
- **Relationship cardinality** — One user to many lab_entries. Each lab_entry has exactly one visit_date. Guest sessions are separate (JSONB, 24hr TTL).

### Harshit Needs
- **Data shape for frontend state** — The shape of the API response (which mirrors the DB schema) determines how Harshit models frontend state.

### Yuri Needs
- **Schema for test data generation** — Yuri needs the exact table definitions, constraints, and relationships to write seed scripts. **ACTION ITEM: provide seed data schema (Decision #13).**
- **Migration scripts** — Yuri needs to be able to stand up a clean test database from migrations alone.

---

## 5. Risks and Concerns

### 5a. HIPAA Compliance — HIGH RISK
This application stores Protected Health Information (PHI): lab values (BUN, creatinine, potassium, hemoglobin, glucose, eGFR, blood pressure, UPCR), CKD diagnosis, date of birth, and identifiers (name, email). HIPAA compliance is not optional.

**DB-level requirements:**
- **Encryption at rest** — AWS RDS with KMS-managed keys. SPEC-68 covers this.
- **Encryption in transit** — TLS for all DB connections. No plaintext connections, even from the API server.
- **RBAC** — Separate DB roles for the application service account (read/write `lab_entries`, `users`) vs. admin (DDL, migrations). No shared credentials. SPEC-72 covers this.
- **Audit logging** — Every read/write to `users` and `lab_entries` must be logged. Audit log uses ON DELETE SET NULL for user_id (Decision #14). SPEC-76/79 cover this.
- **Data backup** — Encrypted backups with tested restore procedures. SPEC-70.
- **Data retention** — Guest sessions: 24hr TTL with purge cron (Decision #4). Account data retention policy still needs documentation with Husser.
- **Guest data is PHI** — Confirmed at Meeting 1. `guest_sessions` requires full HIPAA treatment (Decision #4).

**Risk:** If we get HIPAA wrong, the entire project is legally non-viable. I recommend we engage legal counsel to review the data model before implementation begins.

**Action:** Co-author HIPAA compliance section with Husser during parallel drafting.

### 5b. Guest Session Data — ~~MEDIUM RISK~~ RESOLVED
~~The spec says guest data is "purged on close" (Section 5.1), but the Jira backlog (SPEC-64) describes a "24-hour guest data purge" background task. These contradict each other.~~

**RESOLVED (Decision #4):** Guest data is stored server-side in `guest_sessions` table with JSONB. 24-hour TTL. Full HIPAA protections apply. Purge cron job required.

### 5c. eGFR Formula Data Requirements — ~~MEDIUM RISK~~ RESOLVED
~~The CKD-EPI equation for eGFR requires age, sex, and serum creatinine. The spec review (Issue #1) flagged that sex was missing from the form spec.~~

**RESOLVED (Decision #3):** Sex field is required. CHECK (sex IN ('male', 'female', 'unknown')). For guest mode, sex is included in the guest session JSONB payload.

### 5d. Multi-Visit Schema Complexity — RESOLVED
The confidence tier system (1 = 3 required fields, 2 = hemoglobin AND glucose, 3 = slope from 3+ visits) implies that lab entries must be stored individually with visit dates. **Decision #12 confirmed** that Tier 2 requires both hemoglobin AND glucose.

Schema is confirmed: `lab_entries` is a separate table from `users`, with a foreign key. Each row has a `visit_date` and all lab values for that visit.

### 5e. Proprietary Calculation Logic — LOW RISK for DB
The spec is emphatic that calculation logic never leaves the server. From a DB perspective, this means:
- No stored procedures that encode proprietary coefficients
- No views that expose calculation internals
- The prediction engine reads raw lab values from the DB and returns computed trajectories — the DB stores inputs only (Decision #10: no prediction result storage in MVP)

### 5f. Migration Strategy — LOW RISK (if addressed early)
We need versioned migrations from day one. Alembic is the standard for FastAPI + SQLAlchemy. I will produce migration files alongside the schema so the team can spin up identical databases in dev, staging, and production.

---

## 6. Key DB Design Decisions (Updated Post-Meeting 1)

### Decision 1: Users Table — FINALIZED
```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255),
  date_of_birth   DATE,
  sex             VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female', 'unknown')),
  height_cm       NUMERIC(5,1),
  weight_kg       NUMERIC(5,1),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Changes from pre-meeting draft:**
- **REMOVED** `password_hash` column (Decision #1: magic link only)
- **Changed** `sex` to `NOT NULL` (Decision #3: sex is required)

### Decision 2: Lab Entries Table — FINALIZED
```sql
CREATE TABLE lab_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visit_date      DATE NOT NULL,
  bun             NUMERIC(5,1) CHECK (bun BETWEEN 5 AND 150),
  creatinine      NUMERIC(4,2) CHECK (creatinine BETWEEN 0.3 AND 15.0),
  potassium       NUMERIC(3,1) CHECK (potassium BETWEEN 2.0 AND 8.0),
  age_at_visit    INTEGER NOT NULL CHECK (age_at_visit BETWEEN 18 AND 120),
  hemoglobin      NUMERIC(4,1) CHECK (hemoglobin BETWEEN 4.0 AND 20.0),
  glucose         NUMERIC(5,1) CHECK (glucose BETWEEN 40 AND 500),
  egfr_override   NUMERIC(5,1),
  systolic_bp     INTEGER CHECK (systolic_bp BETWEEN 60 AND 300),
  sglt2_inhibitor BOOLEAN,
  upcr            NUMERIC(8,2),
  upcr_unit       VARCHAR(10) CHECK (upcr_unit IN ('mg_per_g', 'mg_per_mg')),
  ckd_diagnosis   VARCHAR(30) CHECK (ckd_diagnosis IN (
                    'diabetic_nephropathy', 'hypertensive',
                    'iga', 'polycystic', 'unknown')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**No changes from pre-meeting draft.** Decision #8 confirmed this table as the storage foundation for POST /lab-entries. Decision #9 confirmed CHECK constraints mirror API validation ranges. Decision #12 confirmed hemoglobin and glucose are both needed for Tier 2 (both already present).

### Decision 3: Guest Sessions Table — FINALIZED
```sql
CREATE TABLE guest_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token   VARCHAR(255) UNIQUE NOT NULL,
  lab_data        JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);
```

**Changes from pre-meeting draft:**
- **Added** default value for `expires_at`: `NOW() + INTERVAL '24 hours'` (Decision #4: 24hr TTL confirmed)

**Design rationale:** Guest data is ephemeral but is PHI (Decision #4). Stored as JSONB to avoid schema coupling. Full HIPAA protections apply. When a guest creates an account, the application code parses the JSONB and inserts proper `lab_entries` rows. A purge cron job deletes rows where `expires_at < NOW()`.

### Decision 4: Prediction Results — FINALIZED: NO STORAGE IN MVP
~~Do we store computed trajectories, or recompute on demand?~~

**RESOLVED (Decisions #2 and #10):** No `predictions` table in MVP. No prediction result storage. Recompute on demand. Revisit in Phase 3 when FDA audit requirements are clearer.

### Decision 5: Audit Log Table — FINALIZED
```sql
CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  session_token   VARCHAR(255),
  action          VARCHAR(50) NOT NULL,
  resource_type   VARCHAR(50) NOT NULL,
  resource_id     UUID,
  details         JSONB,
  ip_address      INET,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Changes from pre-meeting draft:**
- **Added** `ON DELETE SET NULL` to `user_id` FK (Decision #14: Luca approved my recommendation). Audit records are retained after user deletion for HIPAA compliance; the user reference becomes NULL.

### Decision 6: Magic Link Tokens Table — FINALIZED
```sql
CREATE TABLE magic_link_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      VARCHAR(255) NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RESOLVED (Decision #1):** Magic link auth is the only auth mechanism. This table is required. No password-based auth.

---

## 7. Schema Design Approach

### Normalization Strategy
- **3NF (Third Normal Form)** as the baseline. User demographics in `users`, lab values in `lab_entries`, sessions in `guest_sessions`. No repeating groups, no transitive dependencies.
- **Selective denormalization** only where query performance demands it and the access pattern is well-understood. Currently I see no need for denormalization in MVP.

### Indexing Plan
| Index | Table | Columns | Rationale |
|-------|-------|---------|-----------|
| `idx_lab_entries_user_id` | lab_entries | user_id | FK lookup; every prediction query filters by user |
| `idx_lab_entries_user_visit` | lab_entries | (user_id, visit_date) | Multi-visit queries need entries ordered by date |
| `idx_users_email` | users | email | Login/registration lookup; UNIQUE already creates this |
| `idx_guest_sessions_token` | guest_sessions | session_token | Session lookup; UNIQUE already creates this |
| `idx_guest_sessions_expires` | guest_sessions | expires_at | Purge cron job needs to find expired sessions efficiently |
| `idx_magic_link_tokens_user` | magic_link_tokens | user_id | Lookup tokens by user for cleanup/revocation |
| `idx_magic_link_tokens_hash` | magic_link_tokens | token_hash | Token verification lookup |
| `idx_audit_log_user_ts` | audit_log | (user_id, timestamp) | Audit queries filter by user and time range |
| `idx_audit_log_resource` | audit_log | (resource_type, resource_id) | "Show me all access to this lab entry" |

### Constraint Philosophy
- **CHECK constraints encode business rules at the DB level.** If the spec says BUN must be 5-150 mg/dL, the database enforces it. This is defense-in-depth — even if the API validation has a bug, invalid data cannot reach the database.
- **NOT NULL by default.** Every column is NOT NULL unless there is an explicit reason for it to be nullable (e.g., optional fields like hemoglobin, glucose).
- **Foreign keys with ON DELETE CASCADE** for user-owned data. If a user is deleted, their lab entries and magic link tokens are cleaned up.
- **Audit log exception:** `audit_log.user_id` uses ON DELETE SET NULL (Decision #14). We retain audit records after user deletion for HIPAA compliance.
- **UUIDs for primary keys** on all application tables. Prevents enumeration attacks. Exception: audit_log uses BIGSERIAL for write performance.

### PostgreSQL-Specific Features I Plan to Use
- **`gen_random_uuid()`** — native UUID generation (requires `pgcrypto` extension)
- **`TIMESTAMPTZ`** — all timestamps are timezone-aware (UTC storage, application-level display)
- **`JSONB`** — for guest session lab data and audit log details
- **`INET`** — for IP address storage in audit logs
- **Partial indexes** — if query patterns warrant them (e.g., index on `lab_entries` where `hemoglobin IS NOT NULL` for tier-2 queries)

---

## 8. Questions Raised at Meeting 1

All questions from my pre-meeting list have been resolved:

| # | Question | Resolution |
|---|----------|------------|
| 1 | Magic link vs. password auth? | **Magic link only.** Decision #1. |
| 2 | Guest data storage location? | **Server-side, 24hr TTL, full HIPAA.** Decision #4. |
| 3 | Data retention policy? | **Guest: 24hr purge cron. Account/audit: co-author with Husser.** Decision #4. |
| 4 | Audit log retention after user deletion? | **ON DELETE SET NULL.** Decision #14. |
| 5 | Prediction result storage? | **No storage in MVP.** Decisions #2, #10. |
| 6 | Database hosting decision? | Not explicitly resolved. AWS RDS assumed per proposal. |
| 7 | Do we need a predictions table for FDA study? | **Not for MVP.** Decision #2. Revisit Phase 3. |
| 8 | Guest session contradiction (purge on close vs 24hr)? | **24-hour TTL.** Decision #4. |

---

## 9. Guest Session Purge Cron Job Design

**Requirement (Decision #4):** Purge expired guest sessions automatically.

### Design
- **Mechanism:** PostgreSQL-level cron via `pg_cron` extension, or application-level scheduled task (Celery beat / APScheduler with FastAPI).
- **Query:** `DELETE FROM guest_sessions WHERE expires_at < NOW();`
- **Frequency:** Every 15 minutes (catches sessions within ~15 min of expiry, avoids excessive load).
- **Audit:** Each purge run logs the count of deleted sessions to `audit_log` with action = `'guest_session_purge'`.
- **HIPAA note:** Because guest data is PHI (Decision #4), the purge must be reliable. If the cron fails, stale PHI persists beyond the documented 24hr retention window. Recommend monitoring/alerting on purge job failures.

### Implementation Options (recommend discussing with John)
1. **pg_cron** — runs inside PostgreSQL, no application dependency. Simple but requires the extension to be enabled on RDS.
2. **Celery beat** — application-level, more testable, integrates with existing FastAPI stack. Adds infrastructure (Redis/RabbitMQ for Celery broker).
3. **APScheduler** — lightweight, runs in-process with FastAPI. No extra infrastructure but does not survive process restarts without persistence.

I recommend **Option 1 (pg_cron)** for MVP simplicity, with fallback to **Option 3 (APScheduler)** if pg_cron is not available on our RDS configuration.

---

## 10. Proposed Timeline (Updated)

| Phase | Deliverable | Depends On | Status |
|-------|-------------|------------|--------|
| Discovery (complete) | Draft schema in `agents/gay_mark/drafts/` | ~~Spec clarifications from Husser, API contract draft from John~~ | **DONE** |
| Post-Meeting 1 (now) | Revised schema incorporating all 14 decisions | Meeting 1 decisions | **IN PROGRESS** |
| Parallel Drafting | Final `artifacts/db_schema.sql` + Alembic migration files | Approved API contract from John | UPCOMING |
| Parallel Drafting | HIPAA compliance section (co-author with Husser) | Husser availability | UPCOMING |
| Parallel Drafting | Seed data schema for Yuri | Schema finalization | UPCOMING |
| Meeting 2 | Schema validated by full team | All agent artifacts aligned | UPCOMING |

---

## 11. Summary of Jira Cards Directly Relevant to My Work

| Key | Summary | My Role |
|-----|---------|---------|
| SPEC-25 | HIPAA-compliant Data Storage | Primary owner — schema design, encryption config, RBAC, retention policy |
| SPEC-68 | Configure RDS with encryption at rest | I specify requirements; infra implements |
| SPEC-70 | Define/implement data backup strategy | I design backup-friendly schema; infra implements backups |
| SPEC-72 | Implement RBAC for DB access | I define DB roles and permissions |
| SPEC-73 | Document data retention/deletion policies | I draft DB-level policy; Husser approves product-level policy |
| SPEC-62 | Create `guest_sessions` table in DB | Primary owner — **RESOLVED: 24hr TTL, JSONB, purge cron** |
| SPEC-69 | Store multiple lab entries for an account | Primary owner — `lab_entries` table design **CONFIRMED** |
| SPEC-30 | Audit Logging for Data Access | I design audit_log table (**ON DELETE SET NULL confirmed**); John implements application-level logging |
| SPEC-77 | Review code for cleartext PHI handling | I review DB connections and storage for cleartext exposure |

---

## Post-Meeting Action Items

| # | Action | Depends On | Priority |
|---|--------|------------|----------|
| 1 | Finalize `artifacts/db_schema.sql` with all 6 tables (users, lab_entries, guest_sessions, magic_link_tokens, audit_log, indexes) | John's API contract draft | HIGH |
| 2 | Co-author HIPAA compliance section with Husser | Husser availability during parallel drafting | HIGH |
| 3 | Design and document guest session purge cron job (see Section 9) | RDS configuration confirmation | HIGH |
| 4 | Provide Yuri with seed data schema and example test vectors | Schema finalization | MEDIUM |
| 5 | Write Alembic migration files for initial schema | After schema is published to artifacts | MEDIUM |
| 6 | Add indexes for magic_link_tokens (user_id, token_hash) | Schema finalization | LOW |
