"""
User ORM model.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, String
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    """User model representing registered users."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(20),
        default="user",
        server_default="user",
        nullable=False,
    )
    preferences: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
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

    # Relationships
    conversations: Mapped[list["Conversation"]] = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    @property
    def is_admin(self) -> bool:
        """Check if user is admin."""
        return self.role == "admin"

    def __repr__(self) -> str:
        return f"<User {self.email}>"


# Import at end to avoid circular imports
from app.models.conversation import Conversation  # noqa: E402, F401
