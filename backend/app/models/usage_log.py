"""
UsageLog ORM model - 计量系统（不含计费）
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Index, Integer, String, Text
from sqlalchemy.dialects.mysql import CHAR, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UsageLog(Base):
    """
    大模型调用计量日志
    
    记录：
    - Token 用量（input/output）
    - 延迟统计（ASR/LLM/TTS）
    - 流量统计（请求/响应大小）
    - 错误统计
    
    不包含：
    - 费用计算（cost）
    - 价格配置
    """

    __tablename__ = "usage_logs"

    id: Mapped[str] = mapped_column(
        CHAR(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    
    # 模型信息
    model_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="模型类型：llm/asr/tts/vision",
    )
    model_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="模型名称",
    )
    provider: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="供应商：aliyun/openai/anthropic",
    )
    
    # 用户/会话
    user_id: Mapped[Optional[str]] = mapped_column(
        CHAR(36),
        nullable=True,
        index=True,
    )
    conversation_id: Mapped[Optional[str]] = mapped_column(
        CHAR(36),
        nullable=True,
        index=True,
    )
    
    # Token 计量
    input_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="输入 Token 数",
    )
    output_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="输出 Token 数",
    )
    total_tokens: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="总 Token 数",
    )
    
    # 延迟计量（毫秒）
    latency_ms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="总延迟",
    )
    asr_latency_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="ASR 延迟",
    )
    llm_latency_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="LLM 延迟",
    )
    tts_latency_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="TTS 延迟",
    )
    
    # 流量统计（字节）
    request_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="请求大小",
    )
    response_size_bytes: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="响应大小",
    )
    
    # 错误统计
    success: Mapped[bool] = mapped_column(
        default=True,
        comment="是否成功",
    )
    error_code: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="错误代码",
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="错误信息",
    )
    
    # 终端类型
    terminal_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="web",
        server_default="web",
        comment="终端类型：web/ios/android",
    )
    
    # 额外数据
    extra_data: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        server_default="{}",
        comment="额外数据（JSON）",
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    # 复合索引（用于按时间范围查询）
    __table_args__ = (
        Index("idx_model_type_created", "model_type", "created_at"),
        Index("idx_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<UsageLog {self.model_type}:{self.model_name} {self.total_tokens} tokens>"
