"""
请求处理中间件

包含:
- 请求追踪 (trace_id)
- 请求日志
- 性能监控
"""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.database import async_session_maker
from app.core.logging import (
    generate_trace_id,
    get_logger,
    set_trace_id,
    set_user_id,
)
from app.services.request_log_service import RequestLogService

logger = get_logger(__name__)


class RequestTraceMiddleware(BaseHTTPMiddleware):
    """请求追踪中间件"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 生成或获取 trace_id
        trace_id = request.headers.get("X-Trace-ID") or generate_trace_id()
        set_trace_id(trace_id)

        # 记录请求开始
        start_time = time.perf_counter()
        method = request.method
        path = request.url.path

        # 获取客户端 IP
        client_ip = request.client.host if request.client else "unknown"

        logger.info(f"Request started: {method} {path}", extra={
            "extra_data": {
                "method": method,
                "path": path,
                "client_ip": client_ip,
                "query_params": dict(request.query_params),
            }
        })

        try:
            response = await call_next(request)

            # 计算耗时
            elapsed_ms = (time.perf_counter() - start_time) * 1000

            # 添加 trace_id 到响应头
            response.headers["X-Trace-ID"] = trace_id

            # 记录请求完成
            log_method = logger.info if response.status_code < 400 else logger.warning
            log_method(
                f"Request completed: {method} {path} - {response.status_code} ({elapsed_ms:.2f}ms)",
                extra={
                    "extra_data": {
                        "method": method,
                        "path": path,
                        "status_code": response.status_code,
                        "elapsed_ms": round(elapsed_ms, 2),
                    }
                }
            )

            # 写入请求日志（跳过健康检查与文档）
            if path not in {"/health", "/docs", "/openapi.json", "/redoc"}:
                try:
                    # 存储完整的请求类型：方法 + 路径
                    request_type = f"{method} {path}"
                    conversation_id = request.query_params.get("conversation_id")
                    user_agent = request.headers.get("user-agent")
                    async with async_session_maker() as session:
                        service = RequestLogService(session)
                        await service.record_request(
                            trace_id=trace_id,
                            request_type=request_type,
                            status_code=response.status_code,
                            latency_ms=int(elapsed_ms),
                            conversation_id=conversation_id,
                            user_id=None,
                            ip_address=client_ip,
                            user_agent=user_agent,
                            error_message=None if response.status_code < 400 else f"HTTP {response.status_code}",
                        )
                except Exception as log_error:
                    logger.warning(
                        "Failed to persist request log",
                        extra={"extra_data": {"error": str(log_error)}},
                    )

            return response

        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"Request failed: {method} {path} ({elapsed_ms:.2f}ms)",
                exc_info=True,
                extra={
                    "extra_data": {
                        "method": method,
                        "path": path,
                        "elapsed_ms": round(elapsed_ms, 2),
                        "error": str(e),
                    }
                }
            )
            raise


class UserContextMiddleware(BaseHTTPMiddleware):
    """用户上下文中间件（在认证后设置用户 ID）"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 如果请求中已有用户信息，设置到上下文
        if hasattr(request.state, "user") and request.state.user:
            set_user_id(str(request.state.user.id))

        return await call_next(request)
