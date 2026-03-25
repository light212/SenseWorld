"""
Message schemas.
"""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


MessageRole = Literal["user", "assistant", "system"]


class MessageExtraData(BaseModel):
    """Message extra data schema."""

    input_type: Optional[Literal["voice", "text"]] = None
    asr_confidence: Optional[float] = None
    tokens_used: Optional[int] = None
    model: Optional[str] = None


class MessageBase(BaseModel):
    """Base message schema."""

    content: str = Field(min_length=1, max_length=10000)


class MessageCreate(MessageBase):
    """Schema for creating a message."""

    role: MessageRole = "user"
    has_audio: bool = False
    audio_duration: Optional[int] = None
    extra_data: MessageExtraData = Field(default_factory=MessageExtraData)


class SendMessageRequest(BaseModel):
    """Request to send a text message."""

    content: str = Field(min_length=1, max_length=10000)


class MessageResponse(MessageBase):
    """Message response schema."""

    id: str
    conversation_id: str
    role: MessageRole
    created_at: datetime
    has_audio: bool = False
    audio_duration: Optional[int] = None
    extra_data: MessageExtraData = Field(default_factory=MessageExtraData)

    model_config = {"from_attributes": True}


class MessageListResponse(BaseModel):
    """Paginated message list response."""

    items: list[MessageResponse]
    total: int
    limit: int
    before: Optional[str] = None


class TranscriptionResult(BaseModel):
    """ASR transcription result."""

    text: str
    confidence: Optional[float] = None
    language: str = "zh"
    duration_ms: Optional[int] = None


class SynthesizeRequest(BaseModel):
    """TTS synthesis request."""

    text: str = Field(min_length=1, max_length=5000)
    voice: str = "alloy"
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


class ErrorResponse(BaseModel):
    """Standard error response."""

    detail: str
    code: Optional[str] = None
