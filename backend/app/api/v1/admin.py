"""
Admin API routes for model configuration management.
"""

import ipaddress
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_admin_user
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.model_config import ModelConfig
from app.models.user import User
from app.services.alert_service import AlertService
from app.services.config_service import ConfigService
from app.services.system_setting_service import SystemSettingService
from app.services.terminal_service import TerminalService
from app.services.usage_service import UsageService
from app.schemas.auth import AuthResponse, UserLogin, UserResponse

logger = logging.getLogger(__name__)


def _validate_external_url(url: str) -> None:
    """Reject private/loopback IPs to prevent SSRF."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Invalid URL scheme: {parsed.scheme}")
    hostname = parsed.hostname or ""
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            raise ValueError(f"Private/loopback IP not allowed: {hostname}")
    except ValueError as e:
        if "not allowed" in str(e) or "Invalid URL" in str(e):
            raise
        # hostname is a domain name, not an IP — allow it


router = APIRouter(prefix="/admin", tags=["admin"])


# ============ Admin Login ============

@router.post("/login", response_model=AuthResponse)
async def admin_login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """Admin login - only allows admin users."""
    # Find user by email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    # Check admin role
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无管理员权限",
        )

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


# ============ Pydantic schemas ============
class ModelConfigCreate(BaseModel):
    model_type: str
    model_name: str
    provider: str
    api_key: Optional[str] = None
    config: dict = Field(default_factory=dict)
    price_per_1k_input_tokens: float = 0
    price_per_1k_output_tokens: float = 0
    is_default: bool = False
    terminal_type: str = "all"
    is_active: bool = True


class ModelConfigUpdate(BaseModel):
    model_name: Optional[str] = None
    provider: Optional[str] = None
    api_key: Optional[str] = None
    config: Optional[dict] = None
    price_per_1k_input_tokens: Optional[float] = None
    price_per_1k_output_tokens: Optional[float] = None
    is_default: Optional[bool] = None
    terminal_type: Optional[str] = None
    is_active: Optional[bool] = None


class ModelConfigResponse(BaseModel):
    id: str
    model_type: str
    model_name: str
    provider: str
    api_key_masked: Optional[str] = None
    config: dict
    price_per_1k_input_tokens: float
    price_per_1k_output_tokens: float
    is_default: bool
    terminal_type: str
    is_active: bool
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class UsageSummaryResponse(BaseModel):
    total_calls: int
    total_input_tokens: int
    total_output_tokens: int
    total_cost: float
    by_model_type: dict


class UsageTrendPoint(BaseModel):
    timestamp: str
    calls: int
    input_tokens: int
    output_tokens: int
    cost: float


class ModelUsageStats(BaseModel):
    model_type: str
    model_name: str
    calls: int
    input_tokens: int
    output_tokens: int
    cost: float
    percentage: float


class AlertResponse(BaseModel):
    id: str
    type: str
    level: str
    title: str
    message: str
    metadata: dict
    is_read: bool
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class AlertPageResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    page_size: int


# RequestLog 相关 Schema 已删除（日志不再入库）


class SystemSettingResponse(BaseModel):
    id: str
    key: str
    value: str
    value_type: str
    description: Optional[str] = None
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


class SystemSettingUpdateRequest(BaseModel):
    value: str


class TerminalCreate(BaseModel):
    type: str
    name: str
    config_overrides: dict = Field(default_factory=dict)
    feature_flags: dict = Field(default_factory=dict)
    is_active: bool = True


class TerminalUpdate(BaseModel):
    name: Optional[str] = None
    config_overrides: Optional[dict] = None
    feature_flags: Optional[dict] = None
    is_active: Optional[bool] = None


class TerminalResponse(BaseModel):
    id: str
    type: str
    name: str
    config_overrides: dict
    feature_flags: dict
    is_active: bool
    created_at: str
    updated_at: str


def _date_range_start(date_range: str) -> datetime:
    now = datetime.now(timezone.utc)
    if date_range == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if date_range == "month":
        return now - timedelta(days=30)
    return now - timedelta(days=7)


# Model Configuration endpoints
@router.get("/models", response_model=List[ModelConfigResponse])
async def list_model_configs(
    model_type: Optional[str] = None,
    terminal_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[ModelConfigResponse]:
    """List all model configurations."""
    query = select(ModelConfig)

    if model_type:
        query = query.where(ModelConfig.model_type == model_type)
    if terminal_type:
        query = query.where(ModelConfig.terminal_type == terminal_type)
    if is_active is not None:
        query = query.where(ModelConfig.is_active == is_active)

    result = await db.execute(query)
    configs = result.scalars().all()

    service = ConfigService(db)
    responses = []
    for config in configs:
        responses.append(ModelConfigResponse(**await service.to_response(config)))
    return responses


@router.post("/models", response_model=ModelConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_model_config(
    data: ModelConfigCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> ModelConfigResponse:
    """Create a new model configuration."""
    service = ConfigService(db)
    config = await service.create_config(data.model_dump())

    logger.info(f"Admin {admin.email} created model config: {config.model_type}:{config.model_name}")

    return ModelConfigResponse(**await service.to_response(config))


class ModelTestRequest(BaseModel):
    model_type: str
    provider: str
    model_name: str
    config: dict = Field(default_factory=dict)


class ModelTestResponse(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[int] = None


@router.post("/models/test", response_model=ModelTestResponse)
async def test_model_connection(
    data: ModelTestRequest,
    admin: User = Depends(get_admin_user),
) -> ModelTestResponse:
    """Test model connection by making a real API call."""
    import time
    import httpx

    start = time.time()

    try:
        protocol = data.config.get("protocol", "openai_compatible")
        api_key = data.config.get("api_key")

        if not api_key:
            return ModelTestResponse(
                success=False,
                message="API Key 未配置",
            )

        # 真实测试连接
        if protocol == "websocket":
            # WebSocket 模型（如 Omni）：验证 API Key 格式即可，无法简单测试 WebSocket
            if not api_key.startswith("sk-"):
                return ModelTestResponse(
                    success=False,
                    message="API Key 格式不正确",
                )
            latency = int((time.time() - start) * 1000)
            return ModelTestResponse(
                success=True,
                message=f"配置验证通过 ({data.provider}/{data.model_name})",
                latency_ms=latency,
            )

        elif protocol == "dashscope_sdk":
            # DashScope：调用模型列表接口验证 API Key
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://dashscope.aliyuncs.com/api/v1/models",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                latency = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    return ModelTestResponse(
                        success=True,
                        message=f"连接成功 ({data.provider}/{data.model_name})",
                        latency_ms=latency,
                    )
                elif response.status_code == 401:
                    return ModelTestResponse(
                        success=False,
                        message="API Key 无效或已过期",
                        latency_ms=latency,
                    )
                else:
                    return ModelTestResponse(
                        success=False,
                        message=f"连接失败: HTTP {response.status_code}",
                        latency_ms=latency,
                    )

        elif protocol == "openai_compatible":
            # OpenAI 兼容：调用 /chat/completions 接口验证
            base_url = data.config.get("base_url", "https://api.openai.com/v1")
            # 移除尾部斜杠
            base_url = base_url.rstrip("/")

            try:
                _validate_external_url(base_url)
            except ValueError as e:
                return ModelTestResponse(success=False, message=f"URL 不合法: {e}")

            full_url = f"{base_url}/chat/completions"
            logger.info(f"Testing OpenAI compatible endpoint: {full_url}")

            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    full_url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": data.model_name,
                        "messages": [{"role": "user", "content": "hi"}],
                        "max_tokens": 5,
                    },
                )
                logger.info(f"Response status: {response.status_code}, body: {response.text[:500]}")
                latency = int((time.time() - start) * 1000)
                
                if response.status_code == 200:
                    return ModelTestResponse(
                        success=True,
                        message=f"连接成功 ({data.provider}/{data.model_name})",
                        latency_ms=latency,
                    )
                elif response.status_code == 401:
                    return ModelTestResponse(
                        success=False,
                        message="API Key 无效或已过期",
                        latency_ms=latency,
                    )
                else:
                    error_detail = ""
                    try:
                        error_detail = response.json().get("error", {}).get("message", "")
                    except:
                        pass
                    return ModelTestResponse(
                        success=False,
                        message=f"连接失败: HTTP {response.status_code}" + (f" - {error_detail}" if error_detail else ""),
                        latency_ms=latency,
                    )

        else:
            return ModelTestResponse(
                success=False,
                message=f"不支持的协议: {protocol}",
            )

    except httpx.TimeoutException:
        return ModelTestResponse(
            success=False,
            message="连接超时，请检查网络",
            latency_ms=int((time.time() - start) * 1000),
        )
    except Exception as e:
        logger.error(f"Model test failed: {e}")
        return ModelTestResponse(
            success=False,
            message=f"测试失败: {str(e)}",
        )


@router.get("/models/{config_id}", response_model=ModelConfigResponse)
async def get_model_config(
    config_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> ModelConfigResponse:
    """Get a specific model configuration."""
    service = ConfigService(db)
    config = await service.get_config(config_id)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model configuration not found",
        )

    return ModelConfigResponse(**await service.to_response(config))


@router.patch("/models/{config_id}", response_model=ModelConfigResponse)
async def update_model_config(
    config_id: str,
    data: ModelConfigUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> ModelConfigResponse:
    """Update a model configuration."""
    service = ConfigService(db)
    config = await service.get_config(config_id)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model configuration not found",
        )

    config = await service.update_config(config, data.model_dump(exclude_unset=True))

    logger.info(f"Admin {admin.email} updated model config: {config.model_type}:{config.model_name}")

    return ModelConfigResponse(**await service.to_response(config))


@router.delete("/models/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model_config(
    config_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a model configuration."""
    service = ConfigService(db)
    config = await service.get_config(config_id)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model configuration not found",
        )

    await service.delete_config(config)

    logger.info(f"Admin {admin.email} deleted model config: {config.model_type}:{config.model_name}")


@router.post("/models/{config_id}/set-default", response_model=ModelConfigResponse)
async def set_default_model_config(
    config_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> ModelConfigResponse:
    """Set model config as default for its type and terminal."""
    service = ConfigService(db)
    config = await service.get_config(config_id)

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model configuration not found",
        )

    config = await service.set_default(config)
    logger.info(f"Admin {admin.email} set default model: {config.model_type}:{config.model_name}")
    return ModelConfigResponse(**await service.to_response(config))


@router.get("/usage/summary", response_model=UsageSummaryResponse)
async def get_usage_summary(
    date_range: str = "week",
    model_type: Optional[str] = None,
    terminal_type: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> UsageSummaryResponse:
    """Get usage summary metrics."""
    service = UsageService(db)
    data = await service.get_summary(date_range, model_type, terminal_type)
    return UsageSummaryResponse(**data)


@router.get("/usage/trends", response_model=List[UsageTrendPoint])
async def get_usage_trends(
    date_range: str = "week",
    granularity: str = "day",
    model_type: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[UsageTrendPoint]:
    """Get usage trend points."""
    service = UsageService(db)
    data = await service.get_trends(date_range, granularity, model_type)
    return [UsageTrendPoint(**item) for item in data]


@router.get("/usage/by-model", response_model=List[ModelUsageStats])
async def get_usage_by_model(
    date_range: str = "week",
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[ModelUsageStats]:
    """Get usage stats grouped by model."""
    service = UsageService(db)
    data = await service.get_usage_by_model(date_range)
    return [ModelUsageStats(**item) for item in data]


# 日志查询 API 已删除（RequestLog 不再写入）
# - GET /logs
# - GET /logs/latency-stats
# - GET /logs/{log_id}


@router.get("/settings", response_model=List[SystemSettingResponse])
async def list_system_settings(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[SystemSettingResponse]:
    """List all system settings."""
    service = SystemSettingService(db)
    settings_list = await service.list_settings()
    return [
        SystemSettingResponse(
            id=str(item.id),
            key=item.key,
            value=item.value,
            value_type=item.value_type,
            description=item.description,
            updated_at=item.updated_at.isoformat(),
        )
        for item in settings_list
    ]


@router.get("/settings/{key}", response_model=SystemSettingResponse)
async def get_system_setting(
    key: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> SystemSettingResponse:
    """Get a single system setting."""
    service = SystemSettingService(db)
    setting = await service.get_setting(key)

    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System setting not found",
        )

    return SystemSettingResponse(
        id=str(setting.id),
        key=setting.key,
        value=setting.value,
        value_type=setting.value_type,
        description=setting.description,
        updated_at=setting.updated_at.isoformat(),
    )


@router.put("/settings/{key}", response_model=SystemSettingResponse)
async def update_system_setting(
    key: str,
    payload: SystemSettingUpdateRequest,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> SystemSettingResponse:
    """Update a system setting value."""
    service = SystemSettingService(db)
    setting = await service.upsert_setting(
        key=key,
        value=payload.value,
        updated_by=str(admin.id),
    )
    return SystemSettingResponse(
        id=str(setting.id),
        key=setting.key,
        value=setting.value,
        value_type=setting.value_type,
        description=setting.description,
        updated_at=setting.updated_at.isoformat(),
    )


@router.get("/terminals", response_model=List[TerminalResponse])
async def list_terminals(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> List[TerminalResponse]:
    """List all terminal configs."""
    service = TerminalService(db)
    terminals = await service.list_terminals()
    return [
        TerminalResponse(
            id=str(item.id),
            type=item.type,
            name=item.name,
            config_overrides=item.config_overrides or {},
            feature_flags=item.feature_flags or {},
            is_active=item.is_active,
            created_at=item.created_at.isoformat(),
            updated_at=item.updated_at.isoformat(),
        )
        for item in terminals
    ]


@router.post("/terminals", response_model=TerminalResponse, status_code=status.HTTP_201_CREATED)
async def create_terminal(
    payload: TerminalCreate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> TerminalResponse:
    """Create terminal config."""
    service = TerminalService(db)
    terminal = await service.create_terminal(payload.model_dump())
    return TerminalResponse(
        id=str(terminal.id),
        type=terminal.type,
        name=terminal.name,
        config_overrides=terminal.config_overrides or {},
        feature_flags=terminal.feature_flags or {},
        is_active=terminal.is_active,
        created_at=terminal.created_at.isoformat(),
        updated_at=terminal.updated_at.isoformat(),
    )


@router.patch("/terminals/{terminal_id}", response_model=TerminalResponse)
async def update_terminal(
    terminal_id: str,
    payload: TerminalUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> TerminalResponse:
    """Update terminal config."""
    service = TerminalService(db)
    terminal = await service.get_terminal(terminal_id)
    if not terminal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Terminal not found",
        )

    terminal = await service.update_terminal(
        terminal,
        payload.model_dump(exclude_unset=True),
    )
    return TerminalResponse(
        id=str(terminal.id),
        type=terminal.type,
        name=terminal.name,
        config_overrides=terminal.config_overrides or {},
        feature_flags=terminal.feature_flags or {},
        is_active=terminal.is_active,
        created_at=terminal.created_at.isoformat(),
        updated_at=terminal.updated_at.isoformat(),
    )


@router.delete("/terminals/{terminal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_terminal(
    terminal_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete terminal config."""
    service = TerminalService(db)
    terminal = await service.get_terminal(terminal_id)
    if not terminal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Terminal not found",
        )
    await service.delete_terminal(terminal)


@router.get("/alerts", response_model=AlertPageResponse)
async def list_alerts(
    is_read: Optional[bool] = None,
    type: Optional[str] = None,
    page: int = 1,
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AlertPageResponse:
    """List alerts."""
    service = AlertService(db)
    result = await service.list_alerts(is_read, type, page, page_size)
    items = [
        AlertResponse(
            id=str(alert.id),
            type=alert.type,
            level=alert.level,
            title=alert.title,
            message=alert.message,
            metadata=alert.metadata_payload or {},
            is_read=alert.is_read,
            created_at=alert.created_at.isoformat(),
        )
        for alert in result["items"]
    ]
    return AlertPageResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
    )


@router.get("/alerts/unread-count")
async def get_unread_alert_count(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get unread alert count."""
    service = AlertService(db)
    return {"count": await service.get_unread_count()}


@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark a single alert as read."""
    service = AlertService(db)
    await service.mark_read(alert_id)
    return {"status": "ok"}


@router.post("/alerts/read-all")
async def mark_all_alerts_read(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark all alerts as read."""
    service = AlertService(db)
    await service.mark_all_read()
    return {"status": "ok"}


# Dashboard stats
@router.get("/stats")
async def get_dashboard_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get dashboard statistics."""
    from sqlalchemy import func

    from app.models.conversation import Conversation
    from app.models.message import Message

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
