"""Widen creatinine CHECK constraint max from 15.0 to 20.0

Revision ID: 003
Revises: 001
Create Date: 2026-03-27

Pending Lee confirmation (Q6 on LKID-14) before prod deploy
"""
from alembic import op


revision = "003"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_leads_creatinine_range", "leads", type_="check")
    op.create_check_constraint(
        "ck_leads_creatinine_range",
        "leads",
        "creatinine >= 0.3 AND creatinine <= 20.0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_leads_creatinine_range", "leads", type_="check")
    op.create_check_constraint(
        "ck_leads_creatinine_range",
        "leads",
        "creatinine >= 0.3 AND creatinine <= 15.0",
    )
