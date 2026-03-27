"""
Message API routes.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.message import (
    MessageListResponse,
    MessageResponse,
    SendMessageRequest,
)

router = APIRouter(tags=["messages"])


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
)
async def list_messages(
    conversation_id: str,
    limit: int = Query(default=50, le=200),
    before: str | None = Query(default=None),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> MessageListResponse:
    """List messages in a conversation."""
    # Check if conversation exists and belongs to user
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    conversation = conv_result.scalar_one_or_none()

    # 对话不存在时返回空列表（允许新对话）
    if not conversation:
        return MessageListResponse(
            items=[],
            total=0,
            limit=limit,
            before=before,
        )

    # Get total count
    count_query = select(func.count(Message.id)).where(
        Message.conversation_id == conversation_id,
    )
    total = (await db.execute(count_query)).scalar() or 0

    # Build query
    query = select(Message).where(Message.conversation_id == conversation_id)

    if before:
        # Get the 'before' message's created_at
        before_msg = await db.execute(
            select(Message.created_at).where(Message.id == before)
        )
        before_time = before_msg.scalar_one_or_none()
        if before_time:
            query = query.where(Message.created_at < before_time)

    query = query.order_by(Message.created_at.desc()).limit(limit)

    result = await db.execute(query)
    messages = list(reversed(result.scalars().all()))

    return MessageListResponse(
        items=[MessageResponse.model_validate(m) for m in messages],
        total=total,
        limit=limit,
        before=before,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: UUID,
    data: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Send a text message. AI response will be sent via WebSocket."""
    # Verify conversation ownership
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == UUID(user_id),
            Conversation.is_deleted == False,  # noqa: E712
        )
    )
    conversation = conv_result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Create user message
    message = Message(
        conversation_id=conversation_id,
        role="user",
        content=data.content,
        extra_data={"input_type": "text"},
    )
    db.add(message)

    # Update conversation
    conversation.message_count += 1
    conversation.last_message_at = datetime.now(timezone.utc)

    # Auto-generate title if not set
    if not conversation.title and len(data.content) > 0:
        conversation.title = data.content[:50] + ("..." if len(data.content) > 50 else "")

    await db.flush()
    await db.refresh(message)

    # TODO: Trigger AI response via background task or WebSocket

    return MessageResponse.model_validate(message)
