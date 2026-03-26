"""
ModelConfig ORM model for storing LLM/AI model configurations.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy import JSON
from sqlalchemy.dialects.mysql import CHAR
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ModelConfig(Base):
    """Model configuration for LLM/ASR/TTS services."""

    __tablename__ = "model_configs"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    model_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Type: llm, asr, tts",
    )
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Model name: qwen3-tts-instruct-flash",
    )
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Provider: dashscope, openai",
    )
    config: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        server_default="{}",
        comment="Model-specific config",
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

    def __repr__(self) -> str:
        return f"<ModelConfig {self.model_type}:{self.model_name}>"