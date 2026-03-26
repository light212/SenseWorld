"""add admin tables

Revision ID: c4a8b9c0e2d1
Revises: 9d2c1f0c9d2b
Create Date: 2026-03-26 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


# revision identifiers, used by Alembic.
revision: str = "c4a8b9c0e2d1"
down_revision: Union[str, None] = "9d2c1f0c9d2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usage_logs",
        sa.Column("id", mysql.CHAR(length=36), nullable=False),
        sa.Column("model_type", sa.String(length=50), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("user_id", mysql.CHAR(length=36), nullable=True),
        sa.Column("conversation_id", mysql.CHAR(length=36), nullable=True),
        sa.Column("input_tokens", sa.Integer(), server_default="0", nullable=False),
        sa.Column("output_tokens", sa.Integer(), server_default="0", nullable=False),
        sa.Column("cost", sa.Numeric(10, 6), server_default="0", nullable=False),
        sa.Column("terminal_type", sa.String(length=20), server_default="web", nullable=False),
        sa.Column("extra_data", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usage_logs_created_at", "usage_logs", ["created_at"], unique=False)
    op.create_index("ix_usage_logs_model_type", "usage_logs", ["model_type"], unique=False)
    op.create_index("ix_usage_logs_user_id", "usage_logs", ["user_id"], unique=False)
    op.create_index("ix_usage_logs_conversation_id", "usage_logs", ["conversation_id"], unique=False)

    op.create_table(
        "request_logs",
        sa.Column("id", mysql.CHAR(length=36), nullable=False),
        sa.Column("trace_id", sa.String(length=64), nullable=False),
        sa.Column("conversation_id", mysql.CHAR(length=36), nullable=True),
        sa.Column("user_id", mysql.CHAR(length=36), nullable=True),
        sa.Column("request_type", sa.String(length=50), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("asr_latency_ms", sa.Integer(), nullable=True),
        sa.Column("llm_latency_ms", sa.Integer(), nullable=True),
        sa.Column("tts_latency_ms", sa.Integer(), nullable=True),
        sa.Column("request_body", sa.Text(), nullable=True),
        sa.Column("response_body", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("extra_data", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_request_logs_created_at", "request_logs", ["created_at"], unique=False)
    op.create_index("ix_request_logs_trace_id", "request_logs", ["trace_id"], unique=False)
    op.create_index("ix_request_logs_conversation_id", "request_logs", ["conversation_id"], unique=False)
    op.create_index("ix_request_logs_status_code", "request_logs", ["status_code"], unique=False)

    op.create_table(
        "alerts",
        sa.Column("id", mysql.CHAR(length=36), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("level", sa.String(length=20), server_default="warning", nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.String(length=1000), nullable=False),
        sa.Column("metadata", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_created_at", "alerts", ["created_at"], unique=False)
    op.create_index("ix_alerts_is_read", "alerts", ["is_read"], unique=False)
    op.create_index("ix_alerts_type", "alerts", ["type"], unique=False)

    op.create_table(
        "system_settings",
        sa.Column("id", mysql.CHAR(length=36), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("value_type", sa.String(length=20), server_default="string", nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_by", mysql.CHAR(length=36), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index("ix_system_settings_key", "system_settings", ["key"], unique=False)

    op.create_table(
        "terminals",
        sa.Column("id", mysql.CHAR(length=36), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("config_overrides", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("feature_flags", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("type"),
    )
    op.create_index("ix_terminals_type", "terminals", ["type"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_terminals_type", table_name="terminals")
    op.drop_table("terminals")
    op.drop_index("ix_system_settings_key", table_name="system_settings")
    op.drop_table("system_settings")
    op.drop_index("ix_alerts_type", table_name="alerts")
    op.drop_index("ix_alerts_is_read", table_name="alerts")
    op.drop_index("ix_alerts_created_at", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("ix_request_logs_status_code", table_name="request_logs")
    op.drop_index("ix_request_logs_conversation_id", table_name="request_logs")
    op.drop_index("ix_request_logs_trace_id", table_name="request_logs")
    op.drop_index("ix_request_logs_created_at", table_name="request_logs")
    op.drop_table("request_logs")
    op.drop_index("ix_usage_logs_conversation_id", table_name="usage_logs")
    op.drop_index("ix_usage_logs_user_id", table_name="usage_logs")
    op.drop_index("ix_usage_logs_model_type", table_name="usage_logs")
    op.drop_index("ix_usage_logs_created_at", table_name="usage_logs")
    op.drop_table("usage_logs")
