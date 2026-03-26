"""
Admin API routes for model configuration management.
支持配置热更新 + 测试连接功能。
"""

import logging
from typing import List, Optional
import json
import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.core.cache import get_redis
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


class TestConnectionRequest(BaseModel):
    model_type: str
    provider: str
    model_name: str
    config: dict


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[int] = None


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


# Clear config cache
async def clear_config_cache(model_type: str):
    """Clear Redis cache for a model type."""
    try:
        redis = await get_redis()
        await redis.delete(f"model_config:{model_type}")
        logger.info(f"Cleared cache for model_type: {model_type}")
    except Exception as e:
        logger.warning(f"Failed to clear cache: {e}")


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
    
    # Clear cache
    await clear_config_cache(data.model_type)
    
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
    
    # Clear cache
    await clear_config_cache(config.model_type)
    
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
    
    model_type = config.model_type
    
    await db.delete(config)
    await db.commit()
    
    # Clear cache
    await clear_config_cache(model_type)
    
    logger.info(f"Admin {admin.email} deleted model config: {config.model_type}:{config.model_name}")


@router.post("/models/test", response_model=TestConnectionResponse)
async def test_model_connection(
    data: TestConnectionRequest,
    admin: User = Depends(get_admin_user),
) -> TestConnectionResponse:
    """Test model API connection."""
    import time
    import httpx
    
    start_time = time.time()
    
    try:
        if data.provider == "dashscope":
            # Test DashScope API
            api_key = data.config.get("api_key")
            if not api_key:
                return TestConnectionResponse(
                    success=False,
                    message="API Key 未配置",
                )
            
            # Test with a simple request
            async with httpx.AsyncClient(timeout=10.0) as client:
                if data.model_type == "llm":
                    response = await client.post(
                        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": data.model_name,
                            "input": {"messages": [{"role": "user", "content": "hi"}]},
                        },
                    )
                elif data.model_type == "tts":
                    # TTS 使用不同的测试方式
                    response = await client.get(
                        "https://dashscope.aliyuncs.com/api/v1/services/audio/tts",
                        headers={"Authorization": f"Bearer {api_key}"},
                    )
                else:
                    response = await client.get(
                        "https://dashscope.aliyuncs.com/api/v1/services/audio/asr",
                        headers={"Authorization": f"Bearer {api_key}"},
                    )
                
                latency_ms = int((time.time() - start_time) * 1000)
                
                if response.status_code in [200, 400, 422]:
                    return TestConnectionResponse(
                        success=True,
                        message="连接成功",
                        latency_ms=latency_ms,
                    )
                elif response.status_code == 401:
                    return TestConnectionResponse(
                        success=False,
                        message="API Key 无效",
                    )
                else:
                    return TestConnectionResponse(
                        success=False,
                        message=f"API 返回错误: {response.status_code}",
                    )
        
        elif data.provider == "openai":
            api_key = data.config.get("api_key")
            if not api_key:
                return TestConnectionResponse(
                    success=False,
                    message="API Key 未配置",
                )
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.openai.com/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                
                latency_ms = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    return TestConnectionResponse(
                        success=True,
                        message="连接成功",
                        latency_ms=latency_ms,
                    )
                elif response.status_code == 401:
                    return TestConnectionResponse(
                        success=False,
                        message="API Key 无效",
                    )
                else:
                    return TestConnectionResponse(
                        success=False,
                        message=f"API 返回错误: {response.status_code}",
                    )
        
        else:
            # 自定义 provider
            base_url = data.config.get("base_url")
            if not base_url:
                return TestConnectionResponse(
                    success=False,
                    message="base_url 未配置",
                )
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{base_url.rstrip('/')}/health")
                
                latency_ms = int((time.time() - start_time) * 1000)
                
                if response.status_code == 200:
                    return TestConnectionResponse(
                        success=True,
                        message="连接成功",
                        latency_ms=latency_ms,
                    )
                else:
                    return TestConnectionResponse(
                        success=False,
                        message=f"API 返回错误: {response.status_code}",
                    )
    
    except httpx.TimeoutException:
        return TestConnectionResponse(
            success=False,
            message="连接超时（10s）",
        )
    except httpx.ConnectError:
        return TestConnectionResponse(
            success=False,
            message="无法连接到服务器",
        )
    except Exception as e:
        logger.error(f"Test connection error: {e}")
        return TestConnectionResponse(
            success=False,
            message=f"测试失败: {str(e)}",
        )


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