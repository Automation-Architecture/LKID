"""Add predictions table (LKID-61)

Revision ID: 004
Revises: 003
Create Date: 2026-04-19

LKID-61 + techspec §4.1 — Add the `predictions` table for the no-auth
tokenized patient funnel (`/labs` -> `/gate/[token]` -> `/results/[token]`).

The table stores the full PredictResponse payload keyed by an opaque 32-byte
URL-safe report_token generated in the API handler (secrets.token_urlsafe(32)).
Rows are inserted pre-consent with anonymous lab values only; `lead_id` is
NULL until the email gate (POST /leads) is passed, at which point the row
becomes linkable to an individual.

Design notes:
- `inputs` JSONB stores the validated POST /predict request body.
- `result` JSONB stores the full PredictResponse payload (trajectories,
  stat_cards, dial_ages, egfr_baseline, confidence_tier, etc.).
- `revoked_at` is reserved but unused in MVP (§13 OQ-3: no expiry enforced).
- `token_created_at` and `created_at` both exist per techspec §4.1.
  `token_created_at` tracks when the token was issued; `created_at` is the
  row-creation audit timestamp. They will typically hold the same value in
  MVP but are kept distinct to support future token rotation.
- FK `predictions.lead_id -> leads.id ON DELETE SET NULL` preserves the
  prediction row if the lead is deleted (audit/analytics retention).

Idempotency: uses `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`
so re-running the migration against a DB that already has the table is a
no-op (per Jira AC).
"""
from alembic import op


revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # `gen_random_uuid()` is provided by pgcrypto, already enabled in 001.
    # Guard the extension again in case this migration is ever applied out of
    # order on a DB where 001 didn't run (belt and suspenders).
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # Create predictions table. Raw SQL with IF NOT EXISTS satisfies the
    # idempotency AC; `op.create_table()` would raise on a pre-existing table.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS predictions (
            id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            report_token     TEXT        NOT NULL UNIQUE,
            token_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            revoked_at       TIMESTAMPTZ,
            inputs           JSONB       NOT NULL,
            result           JSONB       NOT NULL,
            lead_id          UUID        REFERENCES leads(id) ON DELETE SET NULL,
            email_sent_at    TIMESTAMPTZ,
            created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    # Column comments — mirrors the COMMENT ON COLUMN pattern used in
    # db_schema.sql for the leads table.
    op.execute("COMMENT ON TABLE predictions IS 'Stores prediction results keyed by an opaque report_token. Rows created pre-consent (anonymous lab values); lead_id populated after email gate. LKID-61 / techspec §4.1.'")
    op.execute("COMMENT ON COLUMN predictions.id IS 'UUID v4 primary key.'")
    op.execute("COMMENT ON COLUMN predictions.report_token IS '43-char URL-safe base64 token from secrets.token_urlsafe(32). 256 bits of entropy. Opaque; no JWT/HMAC. Acts as bearer credential for GET /results/[token] and GET /reports/[token]/pdf.'")
    op.execute("COMMENT ON COLUMN predictions.token_created_at IS 'When the report_token was issued. Defaults to row insert time.'")
    op.execute("COMMENT ON COLUMN predictions.revoked_at IS 'NULL = active. Reserved for future use; not enforced in MVP (techspec §13 OQ-3).'")
    op.execute("COMMENT ON COLUMN predictions.inputs IS 'Validated POST /predict request body (bun, creatinine, potassium, age, optional hemoglobin/glucose).'")
    op.execute("COMMENT ON COLUMN predictions.result IS 'Full PredictResponse payload: trajectories, stat_cards, dial_ages, egfr_baseline, confidence_tier, etc.'")
    op.execute("COMMENT ON COLUMN predictions.lead_id IS 'FK to leads.id. NULL until POST /leads (email gate) completes. ON DELETE SET NULL preserves prediction if lead is deleted.'")
    op.execute("COMMENT ON COLUMN predictions.email_sent_at IS 'Set by the fire-and-forget _send_report_email() async task after Resend delivery.'")
    op.execute("COMMENT ON COLUMN predictions.created_at IS 'Row-creation audit timestamp (UTC).'")

    # Indexes — idempotent via IF NOT EXISTS.
    # report_token: token lookup on every GET /results and GET /reports/pdf.
    #   (The UNIQUE constraint already creates a btree index, so this is
    #    belt-and-suspenders; keep it to match the techspec §4.1 DDL exactly.)
    # lead_id: analytics queries join predictions to leads.
    # created_at: future cleanup / analytics queries (range filter).
    op.execute("CREATE INDEX IF NOT EXISTS idx_predictions_report_token ON predictions(report_token)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_predictions_lead_id      ON predictions(lead_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_predictions_created_at   ON predictions(created_at)")


def downgrade() -> None:
    # Drop indexes first, then the table. Using IF EXISTS so downgrade is
    # safe to re-run (symmetric with idempotent upgrade).
    op.execute("DROP INDEX IF EXISTS idx_predictions_created_at")
    op.execute("DROP INDEX IF EXISTS idx_predictions_lead_id")
    op.execute("DROP INDEX IF EXISTS idx_predictions_report_token")
    op.execute("DROP TABLE IF EXISTS predictions")
