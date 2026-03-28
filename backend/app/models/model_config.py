"""
ModelConfig ORM model for storing LLM/AI model configurations.
"""
import uuid
from datetime import datetime, timezone

from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Numeric, String, Text
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
    api_key_encrypted: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Encrypted API key",
    )
    config: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Model-specific config",
    )
    price_per_1k_input_tokens: Mapped[float] = mapped_column(
        Numeric(10, 6),
        default=0,
        server_default="0",
        comment="Price per 1K input tokens",
    )
    price_per_1k_output_tokens: Mapped[float] = mapped_column(
        Numeric(10, 6),
        default=0,
        server_default="0",
        comment="Price per 1K output tokens",
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
        comment="Default model for type and terminal",
    )
    terminal_type: Mapped[str] = mapped_column(
        String(20),
        default="all",
        server_default="all",
        comment="Terminal: all, web, ios, android, miniprogram",
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
