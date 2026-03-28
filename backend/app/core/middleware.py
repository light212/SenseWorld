"""
请求处理中间件 - MVP 简化版

保留：
- 请求日志（控制台输出，不入库）
- 性能监控（请求耗时）
- trace_id 传递（响应头）

删除：
- 请求日志数据库持久化
- ContextVars 上下文追踪
"""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger

logger = get_logger(__name__)


class RequestTraceMiddleware(BaseHTTPMiddleware):
    """请求追踪中间件"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 生成 trace_id
        import uuid
        trace_id = str(uuid.uuid4())[:8]

        # 记录请求开始
        start_time = time.perf_counter()
        method = request.method
        path = request.url.path

        # 获取客户端 IP
        client_ip = request.client.host if request.client else "unknown"

        logger.info(f"[{trace_id}] Request started: {method} {path} from {client_ip}")

        try:
            response = await call_next(request)

            # 计算耗时
            elapsed_ms = (time.perf_counter() - start_time) * 1000

            # 添加 trace_id 到响应头（便于前端追踪）
            response.headers["X-Trace-ID"] = trace_id

            # 记录请求完成
            log_method = logger.info if response.status_code < 400 else logger.warning
            log_method(
                f"[{trace_id}] {method} {path} - {response.status_code} ({elapsed_ms:.2f}ms)"
            )

            return response

        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"[{trace_id}] {method} {path} failed after {elapsed_ms:.2f}ms: {e}",
                exc_info=True,
            )
            raise
