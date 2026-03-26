"""
Admin API routes for model configuration management.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User
from app.models.model_config import ModelConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# Pydantic schemas
class ModelConfigCreate(BaseModel):
    model_type: str
    model_name: str
    provider: str
    config: dict = {}
    is_active: bool = True


class ModelConfigUpdate(BaseModel):
    model_name: Optional[str] = None
    provider: Optional[str] = None
    config: Optional[dict] = None
    is_active: Optional[bool] = None


class ModelConfigResponse(BaseModel):
    id: str
    model_type: str
    model_name: str
    provider: str
    config: dict
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# Admin authentication dependency
async def get_admin_user(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Verify user is admin."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    
    return user


# Model Configuration endpoints
@router.get("/models", response_model=List[ModelConfigResponse])
async def list_model_configs(
    model_type: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[ModelConfigResponse]:
    """List all model configurations."""
    query = select(ModelConfig)
    
    if model_type:
        query = query.where(ModelConfig.model_type == model_type)
    
    result = await db.execute(query)
    configs = result.scalars().all()
    
    return [
        ModelConfigResponse(
            id=str(c.id),
            model_type=c.model_type,
            model_name=c.model_name,
            provider=c.provider,
            config=c.config,
            is_active=c.is_active,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )
        for c in configs
    ]


@router.post("/models", response_model=ModelConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_model_config(
    data: ModelConfigCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> ModelConfigResponse:
    """Create a new model configuration."""
    config = ModelConfig(
        model_type=data.model_type,
        model_name=data.model_name,
        provider=data.provider,
        config=data.config,
        is_active=data.is_active,
    )
    
    db.add(config)
    await db.commit()
    await db.refresh(config)
    
    logger.info(f"Admin {admin.email} created model config: {config.model_type}:{config.model_name}")
    
    return ModelConfigResponse(
        id=str(config.id),
        model_type=config.model_type,
        model_name=config.model_name,
        provider=config.provider,
        config=config.config,
        is_active=config.is_active,
        created_at=config.created_at.isoformat(),
        updated_at=config.updated_at.isoformat(),
    )


@router.get("/models/{config_id}", response_model=ModelConfigResponse)
async def get_model_config(
    config_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> ModelConfigResponse:
    """Get a specific model configuration."""
    result = await db.execute(
        select(ModelConfig).where(ModelConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model configuration not found",
        )
    
    return ModelConfigResponse(
        id=str(config.id),
        model_type=config.model_type,
        model_name=config.model_name,
        provider=config.provider,
        config=config.config,
        is_active=config.is_active,
        created_at=config.created_at.isoformat(),
        updated_at=config.updated_at.isoformat(),
    )


@router.patch("/models/{config_id}", response_model=ModelConfigResponse)
async def update_model_config(
    config_id: str,
    data: ModelConfigUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> ModelConfigResponse:
    """Update a model configuration."""
    result = await db.execute(
        select(ModelConfig).where(ModelConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model configuration not found",
        )
    
    if data.model_name is not None:
        config.model_name = data.model_name
    if data.provider is not None:
        config.provider = data.provider
    if data.config is not None:
        config.config = data.config
    if data.is_active is not None:
        config.is_active = data.is_active
    
    await db.commit()
    await db.refresh(config)
    
    logger.info(f"Admin {admin.email} updated model config: {config.model_type}:{config.model_name}")
    
    return ModelConfigResponse(
        id=str(config.id),
        model_type=config.model_type,
        model_name=config.model_name,
        provider=config.provider,
        config=config.config,
        is_active=config.is_active,
        created_at=config.created_at.isoformat(),
        updated_at=config.updated_at.isoformat(),
    )


@router.delete("/models/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model_config(
    config_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a model configuration."""
    result = await db.execute(
        select(ModelConfig).where(ModelConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model configuration not found",
        )
    
    await db.delete(config)
    await db.commit()
    
    logger.info(f"Admin {admin.email} deleted model config: {config.model_type}:{config.model_name}")


# Dashboard stats
@router.get("/stats")
async def get_dashboard_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get dashboard statistics."""
    from app.models.conversation import Conversation
    from app.models.message import Message
    from sqlalchemy import func
    
    # Total users
    users_result = await db.execute(select(func.count(User.id)))
    total_users = users_result.scalar() or 0
    
    # Total conversations
    convs_result = await db.execute(select(func.count(Conversation.id)))
    total_conversations = convs_result.scalar() or 0
    
    # Total messages
    msgs_result = await db.execute(select(func.count(Message.id)))
    total_messages = msgs_result.scalar() or 0
    
    return {
        "total_users": total_users,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
    }