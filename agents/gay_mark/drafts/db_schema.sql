-- =============================================================================
-- KidneyHood Database Schema
-- Version: 1.0.0 (MVP)
-- Author: Gay Mark (Database Engineer)
-- Date: 2026-03-25
-- PostgreSQL 15+
--
-- This schema stores Protected Health Information (PHI) under HIPAA.
-- Encryption at rest (AWS RDS + KMS) and in transit (TLS 1.2+) are REQUIRED.
-- See db_design.md for full compliance documentation.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 1. RBAC Role Definitions
--
-- app_service: used by the FastAPI application. Read/write on data tables.
-- app_admin:   used for migrations, DDL, and operational tasks.
--
-- IMPORTANT: These roles must NOT share credentials. Connection strings are
-- managed via environment variables with secrets manager (AWS Secrets Manager
-- or SSM Parameter Store). Never commit credentials to source control.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
    CREATE ROLE app_service WITH LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin WITH LOGIN CREATEROLE;
  END IF;
END
$$;

COMMENT ON ROLE app_service IS 'Application service account — read/write on data tables only. No DDL.';
COMMENT ON ROLE app_admin   IS 'Admin account — DDL, migrations, RBAC management. Used by Alembic.';

-- ---------------------------------------------------------------------------
-- 2. Users Table
--
-- Stores patient identity and demographics. No password_hash column —
-- authentication is magic-link only (Decision #1).
--
-- HIPAA note: email, name, date_of_birth, sex, height, weight are all PHI
-- or PII. Encryption at rest is mandatory.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255),
    date_of_birth   DATE,
    sex             VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female', 'unknown')),
    height_cm       NUMERIC(5,1),
    weight_kg       NUMERIC(5,1),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users IS 'Patient accounts. PHI — encryption at rest required (SPEC-68).';
COMMENT ON COLUMN users.id IS 'UUID primary key. Prevents enumeration attacks.';
COMMENT ON COLUMN users.email IS 'Unique email address. Used for magic link delivery.';
COMMENT ON COLUMN users.sex IS 'Required for CKD-EPI eGFR calculation. CHECK: male, female, unknown.';
COMMENT ON COLUMN users.height_cm IS 'Optional. Used for supplementary analysis.';
COMMENT ON COLUMN users.weight_kg IS 'Optional. Used for supplementary analysis.';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp (UTC).';
COMMENT ON COLUMN users.updated_at IS 'Last profile update timestamp (UTC).';

-- ---------------------------------------------------------------------------
-- 3. Magic Link Tokens Table
--
-- Implements passwordless authentication (Decision #1). Tokens are stored
-- as hashes (SHA-256 via pgcrypto) — the raw token is emailed to the user
-- and never stored in plaintext.
--
-- Lifecycle: created -> used (used_at set) OR expired (expires_at passed).
-- Cleanup: application deletes used/expired tokens periodically.
-- ---------------------------------------------------------------------------
CREATE TABLE magic_link_tokens (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  magic_link_tokens IS 'Passwordless auth tokens. ON DELETE CASCADE — tokens removed when user is deleted.';
COMMENT ON COLUMN magic_link_tokens.token_hash IS 'SHA-256 hash of the magic link token. Raw token is never stored.';
COMMENT ON COLUMN magic_link_tokens.expires_at IS 'Token expiration. Recommended TTL: 15 minutes.';
COMMENT ON COLUMN magic_link_tokens.used_at IS 'Set when token is consumed. NULL = unused. Single-use enforcement.';

-- ---------------------------------------------------------------------------
-- 4. Lab Entries Table
--
-- Stores per-visit lab values for authenticated users. One row per visit date.
-- This is the primary data table for the prediction engine.
--
-- CHECK constraints mirror the API validation ranges (Decision #9) for
-- defense-in-depth. Even if API validation has a bug, invalid data cannot
-- reach the database.
--
-- Required fields (Tier 1): bun, creatinine, potassium, age_at_visit, sex
--   (sex comes from the users table via join — not duplicated here)
-- Optional fields (Tier 2+): hemoglobin, glucose, egfr_override, systolic_bp,
--   sglt2_inhibitor, upcr, upcr_unit, ckd_diagnosis
--
-- Decision #8:  POST /lab-entries stores to this table.
-- Decision #10: No prediction results stored — recompute on demand.
-- Decision #12: Tier 2 requires BOTH hemoglobin AND glucose.
-- ---------------------------------------------------------------------------
CREATE TABLE lab_entries (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visit_date      DATE        NOT NULL,
    -- Tier 1 fields
    bun             NUMERIC(5,1)  CHECK (bun BETWEEN 5 AND 150),
    creatinine      NUMERIC(4,2)  CHECK (creatinine BETWEEN 0.3 AND 15.0),
    potassium       NUMERIC(3,1)  CHECK (potassium BETWEEN 2.0 AND 8.0),
    age_at_visit    INTEGER       NOT NULL CHECK (age_at_visit BETWEEN 18 AND 120),
    -- Tier 2 optional fields (both needed for Tier 2 upgrade)
    hemoglobin      NUMERIC(4,1)  CHECK (hemoglobin BETWEEN 4.0 AND 20.0),
    glucose         NUMERIC(5,1)  CHECK (glucose BETWEEN 40 AND 500),
    -- Additional optional fields
    egfr_override   NUMERIC(5,1),
    systolic_bp     INTEGER       CHECK (systolic_bp BETWEEN 60 AND 300),
    sglt2_inhibitor BOOLEAN,
    upcr            NUMERIC(8,2),
    upcr_unit       VARCHAR(10)   CHECK (upcr_unit IN ('mg_per_g', 'mg_per_mg')),
    ckd_diagnosis   VARCHAR(30)   CHECK (ckd_diagnosis IN (
                        'diabetic_nephropathy', 'hypertensive',
                        'iga', 'polycystic', 'unknown')),
    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  lab_entries IS 'Per-visit kidney lab values. PHI — encryption at rest required (SPEC-68).';
COMMENT ON COLUMN lab_entries.user_id IS 'FK to users. ON DELETE CASCADE — entries removed when user is deleted.';
COMMENT ON COLUMN lab_entries.visit_date IS 'Date of the lab test. Used for multi-visit slope calculation (Tier 3).';
COMMENT ON COLUMN lab_entries.bun IS 'Blood Urea Nitrogen (mg/dL). Range: 5-150. Required.';
COMMENT ON COLUMN lab_entries.creatinine IS 'Serum Creatinine (mg/dL). Range: 0.3-15.0. Required for CKD-EPI eGFR.';
COMMENT ON COLUMN lab_entries.potassium IS 'Serum Potassium (mEq/L). Range: 2.0-8.0. Required.';
COMMENT ON COLUMN lab_entries.age_at_visit IS 'Patient age at time of visit. Range: 18-120. Required for CKD-EPI eGFR.';
COMMENT ON COLUMN lab_entries.hemoglobin IS 'Hemoglobin (g/dL). Range: 4.0-20.0. Optional. Required WITH glucose for Tier 2 (Decision #12).';
COMMENT ON COLUMN lab_entries.glucose IS 'Blood Glucose (mg/dL). Range: 40-500. Optional. Required WITH hemoglobin for Tier 2 (Decision #12).';
COMMENT ON COLUMN lab_entries.egfr_override IS 'Patient-provided eGFR value. Overrides CKD-EPI calculation when present.';
COMMENT ON COLUMN lab_entries.systolic_bp IS 'Systolic blood pressure (mmHg). Range: 60-300. Optional.';
COMMENT ON COLUMN lab_entries.sglt2_inhibitor IS 'Whether patient is on an SGLT2 inhibitor. Optional.';
COMMENT ON COLUMN lab_entries.upcr IS 'Urine Protein-to-Creatinine Ratio. Optional.';
COMMENT ON COLUMN lab_entries.upcr_unit IS 'UPCR unit of measure: mg_per_g or mg_per_mg.';
COMMENT ON COLUMN lab_entries.ckd_diagnosis IS 'CKD etiology/diagnosis category. Optional.';

-- ---------------------------------------------------------------------------
-- 5. Guest Sessions Table
--
-- Stores ephemeral lab data for unauthenticated (guest) users. JSONB format
-- avoids schema coupling — guest data is parsed and inserted into lab_entries
-- if/when the guest creates an account.
--
-- Decision #4: Server-side storage, 24hr TTL, full HIPAA protections.
-- A purge cron job deletes rows where expires_at < NOW() every 15 minutes.
--
-- HIPAA note: Guest data IS PHI (Decision #4). Encryption at rest mandatory.
-- ---------------------------------------------------------------------------
CREATE TABLE guest_sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token   VARCHAR(255) UNIQUE NOT NULL,
    lab_data        JSONB       NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

COMMENT ON TABLE  guest_sessions IS 'Ephemeral guest lab data. PHI — 24hr TTL, purge cron required (Decision #4).';
COMMENT ON COLUMN guest_sessions.session_token IS 'Unique session identifier. Stored in httpOnly cookie on the client.';
COMMENT ON COLUMN guest_sessions.lab_data IS 'JSONB payload containing guest lab values. Parsed on account creation.';
COMMENT ON COLUMN guest_sessions.expires_at IS 'Auto-set to NOW() + 24 hours. Purge cron deletes expired rows.';

-- ---------------------------------------------------------------------------
-- 6. Audit Log Table
--
-- Immutable (append-only from the application''s perspective) log of all
-- data access and mutations on PHI tables (users, lab_entries, guest_sessions).
--
-- Decision #14: user_id uses ON DELETE SET NULL so audit records survive
-- user deletion. This is required for HIPAA compliance — the audit trail
-- must persist even after the subject exercises their right to delete.
--
-- Uses BIGSERIAL PK for write performance (sequential, no UUID generation
-- overhead). This table will grow large; consider partitioning by timestamp
-- if volume exceeds 10M rows.
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
    session_token   VARCHAR(255),
    action          VARCHAR(50) NOT NULL,
    resource_type   VARCHAR(50) NOT NULL,
    resource_id     UUID,
    details         JSONB,
    ip_address      INET,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  audit_log IS 'Append-only audit trail. PHI access log for HIPAA (SPEC-30). ON DELETE SET NULL preserves records after user deletion.';
COMMENT ON COLUMN audit_log.user_id IS 'FK to users. SET NULL on user deletion — audit records retained (Decision #14).';
COMMENT ON COLUMN audit_log.session_token IS 'Guest session token, if action was performed by a guest.';
COMMENT ON COLUMN audit_log.action IS 'Action performed: create, read, update, delete, login, logout, guest_session_purge, etc.';
COMMENT ON COLUMN audit_log.resource_type IS 'Table/entity acted upon: user, lab_entry, guest_session, magic_link_token, etc.';
COMMENT ON COLUMN audit_log.resource_id IS 'UUID of the specific resource acted upon.';
COMMENT ON COLUMN audit_log.details IS 'Additional context. E.g., changed fields, validation errors, purge counts.';
COMMENT ON COLUMN audit_log.ip_address IS 'Client IP address at time of action.';
COMMENT ON COLUMN audit_log.timestamp IS 'Timestamp of the audited action (UTC).';

-- ---------------------------------------------------------------------------
-- 7. Indexes
--
-- Strategy: Index every foreign key, every lookup column used by the API,
-- and every column used by background jobs (purge cron, audit queries).
-- UNIQUE constraints on users.email and guest_sessions.session_token
-- automatically create indexes — no duplicates needed.
-- ---------------------------------------------------------------------------

-- lab_entries: FK lookup — every prediction query filters by user
CREATE INDEX idx_lab_entries_user_id
    ON lab_entries (user_id);

-- lab_entries: Multi-visit queries need entries ordered by date per user
CREATE INDEX idx_lab_entries_user_visit
    ON lab_entries (user_id, visit_date);

-- magic_link_tokens: Lookup tokens by user for cleanup/revocation
CREATE INDEX idx_magic_link_tokens_user_id
    ON magic_link_tokens (user_id);

-- magic_link_tokens: Token verification lookup (hash-based)
CREATE INDEX idx_magic_link_tokens_hash
    ON magic_link_tokens (token_hash);

-- guest_sessions: Purge cron needs to find expired sessions efficiently
CREATE INDEX idx_guest_sessions_expires_at
    ON guest_sessions (expires_at);

-- audit_log: Audit queries filter by user and time range
CREATE INDEX idx_audit_log_user_ts
    ON audit_log (user_id, timestamp);

-- audit_log: "Show me all access to this resource"
CREATE INDEX idx_audit_log_resource
    ON audit_log (resource_type, resource_id);

-- audit_log: Filter by action type (e.g., all 'delete' actions)
CREATE INDEX idx_audit_log_action
    ON audit_log (action);

-- ---------------------------------------------------------------------------
-- 8. RBAC Grants
--
-- app_service gets DML (SELECT, INSERT, UPDATE, DELETE) on data tables.
-- app_service gets USAGE + SELECT on sequences (for BIGSERIAL audit_log PK).
-- app_admin gets ALL on everything (for migrations via Alembic).
-- ---------------------------------------------------------------------------

-- app_service: data tables
GRANT SELECT, INSERT, UPDATE, DELETE ON users           TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON lab_entries      TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON guest_sessions   TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON magic_link_tokens TO app_service;
GRANT SELECT, INSERT                 ON audit_log        TO app_service;
GRANT USAGE, SELECT ON SEQUENCE audit_log_id_seq         TO app_service;

-- app_admin: full access for migrations
GRANT ALL ON ALL TABLES    IN SCHEMA public TO app_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- ---------------------------------------------------------------------------
-- 9. Trigger: updated_at auto-update
--
-- Automatically sets updated_at = NOW() on any UPDATE to users or lab_entries.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_lab_entries_updated_at
    BEFORE UPDATE ON lab_entries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. Guest Session Purge Query
--
-- This query is intended for a scheduled job (pg_cron or APScheduler).
-- Run every 15 minutes. See db_design.md Section 6 for full design.
--
-- Example pg_cron setup (run as superuser on RDS):
--   SELECT cron.schedule(
--       'purge_expired_guest_sessions',
--       '*/15 * * * *',
--       $$DELETE FROM guest_sessions WHERE expires_at < NOW()$$
--   );
-- ---------------------------------------------------------------------------
-- DELETE FROM guest_sessions WHERE expires_at < NOW();

-- ---------------------------------------------------------------------------
-- End of schema
-- ---------------------------------------------------------------------------
