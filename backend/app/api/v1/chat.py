"""
Chat API routes for message handling and AI responses.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.conversation import Conversation
from app.models.message import Message
from app.services.llm_service import get_llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    conversation_id: str
    content: str


class ChatResponse(BaseModel):
    id: str
    role: str
    content: str
    has_audio: bool
    created_at: str


@router.post("", response_model=ChatResponse)
async def send_message(
    data: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """
    Send a message and get AI response.
    """
    # Get or create conversation
    result = await db.execute(
        select(Conversation).where(Conversation.id == data.conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        # Create a new conversation
        conversation = Conversation(
            id=data.conversation_id,
            user_id=user_id,
            title="新对话",
        )
        db.add(conversation)
        await db.flush()
    elif conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此对话",
        )

    # Save user message
    user_message = Message(
        conversation_id=data.conversation_id,
        role="user",
        content=data.content,
        has_audio=False,
        extra_data={"input_type": "text"},
    )
    db.add(user_message)
    await db.flush()

    # Get recent messages for context
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == data.conversation_id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    recent_messages = list(reversed(msg_result.scalars().all()))

    # Build messages for LLM
    llm_messages = [
        {"role": m.role, "content": m.content}
        for m in recent_messages
    ]

    # Call LLM
    llm_service = get_llm_service()
    ai_response = await llm_service.chat(llm_messages)

    # Save AI message with hasAudio=True
    ai_message = Message(
        conversation_id=data.conversation_id,
        role="assistant",
        content=ai_response,
        has_audio=True,  # Enable audio playback
        extra_data={},
    )
    db.add(ai_message)

    # Update conversation
    conversation.message_count += 2
    conversation.last_message_at = datetime.now(timezone.utc)
    if not conversation.title:
        conversation.title = data.content[:50] + ("..." if len(data.content) > 50 else "")

    await db.commit()
    await db.refresh(ai_message)

    return ChatResponse(
        id=str(ai_message.id),
        role=ai_message.role,
        content=ai_message.content,
        has_audio=ai_message.has_audio,
        created_at=ai_message.created_at.isoformat(),
    )
