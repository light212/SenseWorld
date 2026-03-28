"""
UsageLog ORM model.
"""
import uuid
from datetime import datetime, timezone

from typing import Optional

from sqlalchemy import JSON, DateTime, Numeric, String
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UsageLog(Base):
    """Usage log for model calls."""

    __tablename__ = "usage_logs"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    model_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        CHAR(36),
        nullable=True,
        index=True,
    )
    conversation_id: Mapped[Optional[str]] = mapped_column(
        CHAR(36),
        nullable=True,
        index=True,
    )
    input_tokens: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        server_default="0",
    )
    output_tokens: Mapped[int] = mapped_column(
        nullable=False,
        default=0,
        server_default="0",
    )
    cost: Mapped[float] = mapped_column(
        Numeric(10, 6),
        nullable=False,
        default=0,
        server_default="0",
    )
    terminal_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="web",
        server_default="web",
    )
    extra_data: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        server_default="{}",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<UsageLog {self.model_type}:{self.model_name}>"
