"""
增强的日志配置模块

支持:
- 结构化日志输出 (JSON 格式，便于日志聚合)
- 请求追踪 (trace_id)
- 性能监控 (请求耗时)
- 敏感信息脱敏
"""

import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from datetime import datetime
from functools import wraps
from typing import Any, Optional

from app.config import settings

# 请求追踪上下文
trace_id_var: ContextVar[str] = ContextVar("trace_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")


def get_trace_id() -> str:
    """获取当前请求的 trace_id"""
    return trace_id_var.get() or "-"


def get_user_id() -> str:
    """获取当前用户 ID"""
    return user_id_var.get() or "-"


def set_trace_id(trace_id: str) -> None:
    """设置当前请求的 trace_id"""
    trace_id_var.set(trace_id)


def set_user_id(user_id: str) -> None:
    """设置当前用户 ID"""
    user_id_var.set(user_id)


def generate_trace_id() -> str:
    """生成新的 trace_id"""
    return str(uuid.uuid4())[:8]


# 敏感字段列表（需要脱敏）
SENSITIVE_FIELDS = {
    "password", "password_hash", "token", "access_token", "refresh_token",
    "api_key", "secret", "authorization", "cookie", "jwt_secret",
}


def mask_sensitive(data: Any, depth: int = 0) -> Any:
    """递归脱敏敏感字段"""
    if depth > 10:  # 防止无限递归
        return data

    if isinstance(data, dict):
        return {
            k: "***MASKED***" if k.lower() in SENSITIVE_FIELDS else mask_sensitive(v, depth + 1)
            for k, v in data.items()
        }
    elif isinstance(data, list):
        return [mask_sensitive(item, depth + 1) for item in data]
    return data


class StructuredFormatter(logging.Formatter):
    """结构化 JSON 日志格式化器"""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "trace_id": get_trace_id(),
            "user_id": get_user_id(),
        }

        # 添加位置信息（仅在 DEBUG 模式）
        if settings.debug:
            log_data["location"] = {
                "file": record.filename,
                "line": record.lineno,
                "function": record.funcName,
            }

        # 添加异常信息
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # 添加额外数据（脱敏处理）
        if hasattr(record, "extra_data"):
            log_data["data"] = mask_sensitive(record.extra_data)

        return json.dumps(log_data, ensure_ascii=False, default=str)


class ReadableFormatter(logging.Formatter):
    """可读的控制台日志格式化器"""

    COLORS = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, "")
        trace = get_trace_id()
        trace_part = f"[{trace}] " if trace and trace != "-" else ""

        base_msg = f"{color}{record.levelname:8}{self.RESET} {trace_part}{record.name} - {record.getMessage()}"

        if record.exc_info:
            base_msg += f"\n{self.formatException(record.exc_info)}"

        return base_msg


class AppLogger(logging.Logger):
    """增强的应用日志器"""

    def _log_with_data(
        self,
        level: int,
        msg: str,
        data: Optional[dict] = None,
        *args,
        **kwargs
    ):
        """带额外数据的日志记录"""
        extra = kwargs.pop("extra", {})
        if data:
            extra["extra_data"] = data
        kwargs["extra"] = extra
        super()._log(level, msg, args, **kwargs)

    def info_with_data(self, msg: str, data: Optional[dict] = None, **kwargs):
        """带数据的 INFO 日志"""
        self._log_with_data(logging.INFO, msg, data, **kwargs)

    def error_with_data(self, msg: str, data: Optional[dict] = None, **kwargs):
        """带数据的 ERROR 日志"""
        self._log_with_data(logging.ERROR, msg, data, **kwargs)

    def warning_with_data(self, msg: str, data: Optional[dict] = None, **kwargs):
        """带数据的 WARNING 日志"""
        self._log_with_data(logging.WARNING, msg, data, **kwargs)


def setup_logging() -> None:
    """配置应用日志"""
    # 设置日志类
    logging.setLoggerClass(AppLogger)

    # 获取根日志器
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.upper()))

    # 清除现有处理器
    root_logger.handlers.clear()

    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)

    # 根据环境选择格式化器
    if settings.debug:
        # 开发环境：可读格式
        console_handler.setFormatter(ReadableFormatter())
    else:
        # 生产环境：JSON 格式
        console_handler.setFormatter(StructuredFormatter())

    root_logger.addHandler(console_handler)

    # 降低第三方库的日志级别
    for logger_name in ["uvicorn", "uvicorn.access", "sqlalchemy", "httpx", "httpcore"]:
        logging.getLogger(logger_name).setLevel(logging.WARNING)


def get_logger(name: str) -> AppLogger:
    """获取应用日志器"""
    return logging.getLogger(name)  # type: ignore


def log_execution_time(logger: Optional[logging.Logger] = None):
    """装饰器：记录函数执行时间"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            _logger = logger or get_logger(func.__module__)
            start_time = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                elapsed = (time.perf_counter() - start_time) * 1000
                _logger.debug(f"{func.__name__} completed in {elapsed:.2f}ms")
                return result
            except Exception as e:
                elapsed = (time.perf_counter() - start_time) * 1000
                _logger.error(f"{func.__name__} failed after {elapsed:.2f}ms: {e}")
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            _logger = logger or get_logger(func.__module__)
            start_time = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                elapsed = (time.perf_counter() - start_time) * 1000
                _logger.debug(f"{func.__name__} completed in {elapsed:.2f}ms")
                return result
            except Exception as e:
                elapsed = (time.perf_counter() - start_time) * 1000
                _logger.error(f"{func.__name__} failed after {elapsed:.2f}ms: {e}")
                raise

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
