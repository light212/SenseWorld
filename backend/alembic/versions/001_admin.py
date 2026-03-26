"""add role and model_configs

Revision ID: 001_admin
Revises: 
Create Date: 2026-03-26 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_admin'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add role column to users table
    op.add_column('users', sa.Column('role', sa.String(20), nullable=False, server_default='user'))
    op.create_index('ix_users_role', 'users', ['role'], unique=False)
    
    # Create model_configs table
    op.create_table(
        'model_configs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('model_type', sa.String(50), nullable=False),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_model_configs_model_type', 'model_configs', ['model_type'], unique=False)


def downgrade() -> None:
    # Drop model_configs table
    op.drop_index('ix_model_configs_model_type', table_name='model_configs')
    op.drop_table('model_configs')
    
    # Drop role column from users
    op.drop_index('ix_users_role', table_name='users')
    op.drop_column('users', 'role')