"""add timesheet overtime

Revision ID: 20260318_0003
Revises: 20260318_0002
Create Date: 2026-03-18 13:20:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260318_0003"
down_revision = "20260318_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "timesheets",
        sa.Column("overtime", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("timesheets", "overtime")
