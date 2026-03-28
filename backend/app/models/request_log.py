"""
RequestLog ORM model.
"""
import uuid
from datetime import datetime, timezone

from typing import Optional

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RequestLog(Base):
    """API request log for observability."""

    __tablename__ = "request_logs"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    trace_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    conversation_id: Mapped[Optional[str]] = mapped_column(
        CHAR(36),
        nullable=True,
        index=True,
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        CHAR(36),
        nullable=True,
        index=True,
    )
    request_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    status_code: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    latency_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    asr_latency_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    llm_latency_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    tts_latency_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    request_body: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    response_body: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
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
        return f"<RequestLog {self.request_type} {self.status_code}>"
