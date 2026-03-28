"""add role and model_configs (superseded by 843b7b650a4f, kept as no-op for merge head)

Revision ID: 001_admin
Revises:
Create Date: 2026-03-26 18:30:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '001_admin'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: schema changes were applied by 843b7b650a4f in the main chain.
    # This revision exists only so that the merge head (d1bb97177fed) can reference it.
    pass


def downgrade() -> None:
    pass
