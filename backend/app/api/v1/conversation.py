"""
Conversation API routes.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.conversation import Conversation
from app.schemas.conversation import (
    ConversationCreate,
    ConversationListResponse,
    ConversationResponse,
    ConversationUpdate,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    """List user's conversations."""
    # 直接用字符串比较，避免 UUID() 转换导致格式不一致

    # Get total count
    count_query = select(func.count(Conversation.id)).where(
        Conversation.user_id == user_id,
        Conversation.is_deleted == False,  # noqa: E712
    )
    total = (await db.execute(count_query)).scalar() or 0

    # Get conversations
    # MySQL 不支持 nullslast()，使用 coalesce 替代
    query = (
        select(Conversation)
        .where(
            Conversation.user_id == user_id,
            Conversation.is_deleted == False,  # noqa: E712
        )
        .order_by(func.coalesce(Conversation.last_message_at, datetime.min).desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    conversations = result.scalars().all()

    return ConversationListResponse(
        items=[ConversationResponse.model_validate(c) for c in conversations],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: ConversationCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Create a new conversation."""
    conversation = Conversation(
        user_id=user_id,
        title=data.title,
    )
    db.add(conversation)
    await db.flush()
    await db.refresh(conversation)

    return ConversationResponse.model_validate(conversation)


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Get a specific conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
            Conversation.is_deleted == False,  # noqa: E712
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return ConversationResponse.model_validate(conversation)


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    data: ConversationUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Update a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
            Conversation.is_deleted == False,  # noqa: E712
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    if data.title is not None:
        conversation.title = data.title

    await db.flush()
    await db.refresh(conversation)

    return ConversationResponse.model_validate(conversation)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft delete a conversation."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
            Conversation.is_deleted == False,  # noqa: E712
        )
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    conversation.is_deleted = True
    await db.flush()
