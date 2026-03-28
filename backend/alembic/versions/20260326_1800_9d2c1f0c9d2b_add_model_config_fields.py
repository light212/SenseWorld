"""add model_config fields

Revision ID: 9d2c1f0c9d2b
Revises: 843b7b650a4f
Create Date: 2026-03-26 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9d2c1f0c9d2b"
down_revision: Union[str, None] = "843b7b650a4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("model_configs", sa.Column("api_key_encrypted", sa.Text(), nullable=True))
    op.add_column(
        "model_configs",
        sa.Column(
            "price_per_1k_input_tokens",
            sa.Numeric(10, 6),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "model_configs",
        sa.Column(
            "price_per_1k_output_tokens",
            sa.Numeric(10, 6),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "model_configs",
        sa.Column(
            "is_default",
            sa.Boolean(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "model_configs",
        sa.Column(
            "terminal_type",
            sa.String(length=20),
            server_default="all",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("model_configs", "terminal_type")
    op.drop_column("model_configs", "is_default")
    op.drop_column("model_configs", "price_per_1k_output_tokens")
    op.drop_column("model_configs", "price_per_1k_input_tokens")
    op.drop_column("model_configs", "api_key_encrypted")
