"""Add clerk_user_id, updated_at; make lab columns nullable for webhook leads

Revision ID: 002
Revises: 001
Create Date: 2026-03-27

The Clerk user.created webhook only provides email + name. Lab values
(age, bun, creatinine) arrive later via POST /predict. This migration:

1. Adds clerk_user_id (TEXT, nullable) for Clerk cross-reference.
2. Adds updated_at (TIMESTAMPTZ, nullable) for upsert tracking.
3. Makes age, bun, creatinine nullable so webhook-sourced leads can be
   inserted without lab values.
4. Drops NOT NULL check constraints that block nullable columns, then
   re-adds them as CHECK (col IS NULL OR col BETWEEN ...).
5. Adds a UNIQUE constraint on email for ON CONFLICT upsert.
"""
from alembic import op
import sqlalchemy as sa


revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. New columns
    op.add_column("leads", sa.Column("clerk_user_id", sa.Text(), nullable=True))
    op.add_column(
        "leads",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # 2. Make lab columns nullable
    op.alter_column("leads", "age", existing_type=sa.Integer(), nullable=True)
    op.alter_column("leads", "bun", existing_type=sa.Numeric(), nullable=True)
    op.alter_column("leads", "creatinine", existing_type=sa.Numeric(), nullable=True)

    # 3. Replace CHECK constraints to allow NULL
    op.drop_constraint("ck_leads_age_range", "leads", type_="check")
    op.drop_constraint("ck_leads_bun_range", "leads", type_="check")
    op.drop_constraint("ck_leads_creatinine_range", "leads", type_="check")
    op.create_check_constraint(
        "ck_leads_age_range", "leads", "age IS NULL OR (age >= 18 AND age <= 120)"
    )
    op.create_check_constraint(
        "ck_leads_bun_range", "leads", "bun IS NULL OR (bun >= 5 AND bun <= 150)"
    )
    op.create_check_constraint(
        "ck_leads_creatinine_range",
        "leads",
        "creatinine IS NULL OR (creatinine >= 0.3 AND creatinine <= 15.0)",
    )

    # 4. Unique constraint on email (replaces plain index for ON CONFLICT)
    op.drop_index("idx_leads_email", table_name="leads")
    op.create_unique_constraint("uq_leads_email", "leads", ["email"])
    op.create_index("idx_leads_email", "leads", ["email"])

    # 5. Index on clerk_user_id for lookups
    op.create_index("idx_leads_clerk_user_id", "leads", ["clerk_user_id"])


def downgrade() -> None:
    op.drop_index("idx_leads_clerk_user_id", table_name="leads")
    op.drop_index("idx_leads_email", table_name="leads")
    op.drop_constraint("uq_leads_email", "leads", type_="unique")
    op.create_index("idx_leads_email", "leads", ["email"])

    # Restore original CHECK constraints
    op.drop_constraint("ck_leads_creatinine_range", "leads", type_="check")
    op.drop_constraint("ck_leads_bun_range", "leads", type_="check")
    op.drop_constraint("ck_leads_age_range", "leads", type_="check")
    op.create_check_constraint(
        "ck_leads_age_range", "leads", "age >= 18 AND age <= 120"
    )
    op.create_check_constraint(
        "ck_leads_bun_range", "leads", "bun >= 5 AND bun <= 150"
    )
    op.create_check_constraint(
        "ck_leads_creatinine_range",
        "leads",
        "creatinine >= 0.3 AND creatinine <= 15.0",
    )

    # Restore NOT NULL
    op.alter_column("leads", "creatinine", existing_type=sa.Numeric(), nullable=False)
    op.alter_column("leads", "bun", existing_type=sa.Numeric(), nullable=False)
    op.alter_column("leads", "age", existing_type=sa.Integer(), nullable=False)

    op.drop_column("leads", "updated_at")
    op.drop_column("leads", "clerk_user_id")
