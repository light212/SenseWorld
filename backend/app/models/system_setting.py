"""
SystemSetting ORM model.
"""
import uuid
from datetime import datetime, timezone

from typing import Optional

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SystemSetting(Base):
    """System-level settings."""

    __tablename__ = "system_settings"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )
    value: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    value_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="string",
        server_default="string",
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_by: Mapped[Optional[str]] = mapped_column(
        CHAR(36),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<SystemSetting {self.key}>"
