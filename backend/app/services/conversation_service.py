"""
Conversation service for managing chat sessions and messages.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_redis
from app.models.conversation import Conversation
from app.models.message import Message

logger = logging.getLogger(__name__)

# Redis key prefix for conversation context
CONTEXT_KEY_PREFIX = "conversation:{conversation_id}:context"
CONTEXT_TTL = 3600  # 1 hour


class ConversationService:
    """Service for managing conversations and messages."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_conversation(
        self,
        user_id: UUID,
        conversation_id: Optional[UUID] = None,
    ) -> Conversation:
        """Get existing conversation or create a new one."""
        if conversation_id:
            result = await self.db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id,
                    Conversation.is_deleted == False,  # noqa: E712
                )
            )
            conversation = result.scalar_one_or_none()
            if conversation:
                return conversation

        # Create new conversation
        conversation = Conversation(user_id=user_id)
        self.db.add(conversation)
        await self.db.flush()
        await self.db.refresh(conversation)
        return conversation

    async def add_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
        has_audio: bool = False,
        audio_duration: Optional[int] = None,
        extra_data: Optional[dict] = None,
    ) -> Message:
        """Add a message to a conversation."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            has_audio=has_audio,
            audio_duration=audio_duration,
            extra_data=extra_data or {},
        )
        self.db.add(message)

        # Update conversation
        result = await self.db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = result.scalar_one()
        conversation.message_count += 1
        conversation.last_message_at = datetime.now(timezone.utc)

        # Auto-generate title if not set
        if not conversation.title and role == "user":
            conversation.title = content[:50] + ("..." if len(content) > 50 else "")

        await self.db.flush()
        await self.db.refresh(message)
        return message

    async def get_conversation_context(
        self,
        conversation_id: UUID,
        max_messages: int = 20,
    ) -> list[dict]:
        """
        Get conversation context for LLM.

        Retrieves messages from cache or database, limited to recent messages.
        """
        redis = await get_redis()
        cache_key = CONTEXT_KEY_PREFIX.format(conversation_id=conversation_id)

        # Try cache first
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Load from database
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(max_messages)
        )
        messages = list(reversed(result.scalars().all()))

        context = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

        # Cache context
        if context:
            await redis.set(cache_key, json.dumps(context), ex=CONTEXT_TTL)

        return context

    async def update_context_cache(
        self,
        conversation_id: UUID,
        context: list[dict],
    ) -> None:
        """Update the cached conversation context."""
        redis = await get_redis()
        cache_key = CONTEXT_KEY_PREFIX.format(conversation_id=conversation_id)
        await redis.set(cache_key, json.dumps(context), ex=CONTEXT_TTL)

    async def clear_context_cache(self, conversation_id: UUID) -> None:
        """Clear the cached conversation context."""
        redis = await get_redis()
        cache_key = CONTEXT_KEY_PREFIX.format(conversation_id=conversation_id)
        await redis.delete(cache_key)
