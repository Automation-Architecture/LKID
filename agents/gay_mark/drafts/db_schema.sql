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
-- End of schema
-- ---------------------------------------------------------------------------
