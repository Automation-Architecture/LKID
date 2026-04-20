-- =============================================================================
-- KidneyHood Database Schema
-- Version: 2.0.0 (Lean Launch MVP)
-- Author: Gay Mark (Database Engineer)
-- Date: 2026-03-26
-- PostgreSQL 15+ (Railway Managed Postgres)
--
-- Single-table lead-gen schema. No HIPAA infrastructure, no user accounts,
-- no audit logging. Clerk handles auth externally. This schema captures
-- email + prediction inputs for the warm email campaign.
--
-- Reference: Lean Launch MVP PRD (artifacts/lean-launch-mvp-prd.md)
-- Reference: Server-Side Calc Spec v1.0 (server_side_calc_spec_v1.md)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Leads Table
--
-- Captures every prediction submission: name, email, and the 3 required
-- lab inputs (age, BUN, creatinine). One row per POST /predict call.
--
-- Lead capture happens inside the /predict handler — no separate endpoint.
-- Clerk webhook on user.created also pipes leads here.
--
-- No potassium column — removed per Lee's calc spec v2.0 (Correction 2).
-- No sex column — marketing app uses population-average CKD-EPI coefficients.
-- egfr_baseline is nullable — calculated server-side from creatinine + age
-- via CKD-EPI 2021 (race-free, sex-free). Stored for reference only.
-- ---------------------------------------------------------------------------
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

COMMENT ON TABLE  leads IS 'Lead capture table. One row per prediction submission. Feeds weekly CSV export for email campaign.';
COMMENT ON COLUMN leads.id IS 'UUID v4 primary key.';
COMMENT ON COLUMN leads.email IS 'Patient email captured via Clerk magic link. Used for warm campaign.';
COMMENT ON COLUMN leads.name IS 'Patient name entered on the prediction form.';
COMMENT ON COLUMN leads.age IS 'Patient age in years. Range: 18-120. Required for CKD-EPI eGFR calculation.';
COMMENT ON COLUMN leads.bun IS 'Blood Urea Nitrogen (mg/dL). Range: 5-150. Required input to prediction engine.';
COMMENT ON COLUMN leads.creatinine IS 'Serum Creatinine (mg/dL). Range: 0.3-15.0. Required for CKD-EPI eGFR calculation.';
COMMENT ON COLUMN leads.egfr_baseline IS 'Calculated baseline eGFR (CKD-EPI 2021). Nullable — computed server-side, stored for reference.';
COMMENT ON COLUMN leads.created_at IS 'Timestamp of prediction submission (UTC).';

-- ---------------------------------------------------------------------------
-- 2. Indexes
--
-- idx_leads_email:      CSV export and duplicate-check queries filter by email.
-- idx_leads_created_at: CSV export and analytics queries order/filter by date.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_leads_email ON leads (email);
CREATE INDEX idx_leads_created_at ON leads (created_at);

-- ---------------------------------------------------------------------------
-- 3. Predictions Table (LKID-61, migration 004)
--
-- Stores every prediction result keyed by an opaque report_token. Supports
-- the no-auth tokenized patient funnel:
--   /labs  ->  POST /predict  ->  /gate/[token]  ->  POST /leads  ->  /results/[token]
--
-- Rows are inserted pre-consent (anonymous lab values + random token only).
-- lead_id is NULL until the email gate completes (POST /leads). See
-- techspec-new-flow.md §4.1 for the authoritative spec.
--
-- Design notes:
--   * report_token = secrets.token_urlsafe(32)  (43 chars, 256 bits entropy).
--     Opaque bearer credential — no JWT, no HMAC.
--   * inputs JSONB: validated POST /predict request body.
--   * result JSONB: full PredictResponse (trajectories, stat_cards, dial_ages,
--     egfr_baseline, confidence_tier, etc.).
--   * revoked_at is reserved but unused in MVP (techspec §13 OQ-3).
--   * token_created_at vs created_at: distinct to support future token
--     rotation without altering row-creation history.
--   * FK predictions.lead_id -> leads.id ON DELETE SET NULL preserves the
--     prediction row for analytics if the lead is later deleted.
-- ---------------------------------------------------------------------------
CREATE TABLE predictions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    report_token     TEXT        NOT NULL UNIQUE,
    token_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at       TIMESTAMPTZ,
    inputs           JSONB       NOT NULL,
    result           JSONB       NOT NULL,
    lead_id          UUID        REFERENCES leads(id) ON DELETE SET NULL,
    email_sent_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  predictions IS 'Stores prediction results keyed by an opaque report_token. Rows created pre-consent (anonymous lab values); lead_id populated after email gate. LKID-61 / techspec §4.1.';
COMMENT ON COLUMN predictions.id IS 'UUID v4 primary key.';
COMMENT ON COLUMN predictions.report_token IS '43-char URL-safe base64 token from secrets.token_urlsafe(32). 256 bits of entropy. Opaque; no JWT/HMAC. Bearer credential for GET /results/[token] and GET /reports/[token]/pdf.';
COMMENT ON COLUMN predictions.token_created_at IS 'When the report_token was issued. Defaults to row insert time.';
COMMENT ON COLUMN predictions.revoked_at IS 'NULL = active. Reserved for future use; not enforced in MVP (techspec §13 OQ-3).';
COMMENT ON COLUMN predictions.inputs IS 'Validated POST /predict request body (bun, creatinine, potassium, age, optional hemoglobin/glucose).';
COMMENT ON COLUMN predictions.result IS 'Full PredictResponse payload: trajectories, stat_cards, dial_ages, egfr_baseline, confidence_tier, etc.';
COMMENT ON COLUMN predictions.lead_id IS 'FK to leads.id. NULL until POST /leads (email gate) completes. ON DELETE SET NULL preserves prediction if lead is deleted.';
COMMENT ON COLUMN predictions.email_sent_at IS 'Set by the fire-and-forget _send_report_email() async task after Resend delivery.';
COMMENT ON COLUMN predictions.created_at IS 'Row-creation audit timestamp (UTC).';

-- ---------------------------------------------------------------------------
-- 4. Predictions Indexes
--
-- idx_predictions_report_token: duplicates the UNIQUE index on report_token
--                               to match the techspec §4.1 DDL exactly. The
--                               UNIQUE constraint already covers token lookup;
--                               this is belt-and-suspenders and can be dropped
--                               in a future cleanup migration without impact.
-- idx_predictions_lead_id:      joins predictions -> leads for analytics.
-- idx_predictions_created_at:   range filter for cleanup / analytics queries.
-- ---------------------------------------------------------------------------
CREATE INDEX idx_predictions_report_token ON predictions(report_token);
CREATE INDEX idx_predictions_lead_id      ON predictions(lead_id);
CREATE INDEX idx_predictions_created_at   ON predictions(created_at);

-- ---------------------------------------------------------------------------
-- End of schema
-- ---------------------------------------------------------------------------
