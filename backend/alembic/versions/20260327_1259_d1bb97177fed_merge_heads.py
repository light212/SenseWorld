"""merge heads

Revision ID: d1bb97177fed
Revises: 001_admin, 54cb82f10440
Create Date: 2026-03-27 12:59:06.975262

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1bb97177fed'
down_revision: Union[str, None] = ('001_admin', '54cb82f10440')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
