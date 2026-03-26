"""
Alert ORM model for admin notifications.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy import JSON
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Alert(Base):
    """Alert notification for admin dashboard."""

    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="warning",
        server_default="warning",
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    message: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
    )
    metadata_payload: Mapped[dict] = mapped_column(
        "metadata",
        JSON,
        default=dict,
        server_default="{}",
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<Alert {self.type} {self.title}>"
