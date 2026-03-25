"""
Conversation schemas.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ConversationBase(BaseModel):
    """Base conversation schema."""

    title: Optional[str] = Field(None, max_length=200)


class ConversationCreate(ConversationBase):
    """Schema for creating a conversation."""

    pass


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation."""

    title: Optional[str] = Field(None, max_length=200)


class ConversationExtraData(BaseModel):
    """Conversation extra data schema."""

    summary: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    model_version: Optional[str] = None


class ConversationResponse(ConversationBase):
    """Conversation response schema."""

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    last_message_at: Optional[datetime] = None
    message_count: int = 0
    extra_data: ConversationExtraData = Field(default_factory=ConversationExtraData)

    model_config = {"from_attributes": True}


class ConversationListResponse(BaseModel):
    """Paginated conversation list response."""

    items: list[ConversationResponse]
    total: int
    limit: int
    offset: int
