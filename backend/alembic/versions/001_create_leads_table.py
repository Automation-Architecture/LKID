"""Create leads table

Revision ID: 001
Revises: None
Create Date: 2026-03-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # gen_random_uuid() is built into Postgres 13+, but pgcrypto needed for older versions
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.create_table(
        "leads",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("bun", sa.Numeric(), nullable=False),
        sa.Column("creatinine", sa.Numeric(), nullable=False),
        sa.Column("egfr_baseline", sa.Numeric(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        # Defense-in-depth CHECK constraints
        sa.CheckConstraint("age >= 18 AND age <= 120", name="ck_leads_age_range"),
        sa.CheckConstraint("bun >= 5 AND bun <= 150", name="ck_leads_bun_range"),
        sa.CheckConstraint("creatinine >= 0.3 AND creatinine <= 15.0", name="ck_leads_creatinine_range"),
    )
    op.create_index("idx_leads_email", "leads", ["email"])
    op.create_index("idx_leads_created_at", "leads", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_leads_created_at", table_name="leads")
    op.drop_index("idx_leads_email", table_name="leads")
    op.drop_table("leads")
