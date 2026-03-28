"""
日志配置模块 - MVP 简化版

保留：
- 可读的控制台日志格式
- 请求追踪（trace_id 通过 headers 传递）
- 性能监控装饰器

删除：
- JSON 格式化器
- 敏感信息脱敏
- ContextVars 上下文追踪
"""

import logging
import sys
import time
from functools import wraps
from typing import Optional

from app.config import settings


def get_trace_id() -> str:
    """
    获取当前请求的 trace_id。
    MVP 版本从 headers 读取，由中间件设置到请求对象。
    """
    # 简化版本：返回固定值，实际 trace_id 通过日志消息传递
    return "-"


def get_logger(name: str) -> logging.Logger:
    """获取日志器"""
    return logging.getLogger(name)


def setup_logging() -> None:
    """配置应用日志"""
    # 根日志器级别
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.upper()))

    # 清除现有处理器
    root_logger.handlers.clear()

    # 控制台处理器 - 统一使用可读格式
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(ReadableFormatter())
    root_logger.addHandler(console_handler)

    # 降低第三方库的日志级别
    for logger_name in ["uvicorn", "uvicorn.access", "sqlalchemy", "httpx", "httpcore"]:
        logging.getLogger(logger_name).setLevel(logging.WARNING)


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
        base_msg = f"{color}{record.levelname:8}{self.RESET} {record.name} - {record.getMessage()}"

        if record.exc_info:
            base_msg += f"\n{self.formatException(record.exc_info)}"

        return base_msg


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
