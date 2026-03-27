"""
Conversation ORM model.
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.message import Message
    from app.models.user import User


class Conversation(Base):
    """Conversation model representing a chat session."""

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        CHAR(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    message_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
    )
    extra_data: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        server_default="{}",
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="conversations",
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:
        return f"<Conversation {self.id}>"
