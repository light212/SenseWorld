"""
自定义异常类与错误码定义
"""

from enum import Enum
from typing import Any, Optional


class ErrorCode(str, Enum):
    """统一错误码枚举"""
    
    # 认证相关 (1xxx)
    UNAUTHORIZED = "AUTH_001"
    INVALID_TOKEN = "AUTH_002"
    TOKEN_EXPIRED = "AUTH_003"
    INVALID_CREDENTIALS = "AUTH_004"
    USER_DISABLED = "AUTH_005"
    
    # 用户相关 (2xxx)
    USER_NOT_FOUND = "USER_001"
    USER_ALREADY_EXISTS = "USER_002"
    INVALID_EMAIL = "USER_003"
    WEAK_PASSWORD = "USER_004"
    
    # 对话相关 (3xxx)
    CONVERSATION_NOT_FOUND = "CONV_001"
    CONVERSATION_ACCESS_DENIED = "CONV_002"
    MESSAGE_NOT_FOUND = "CONV_003"
    
    # 服务相关 (4xxx)
    ASR_FAILED = "SVC_001"
    TTS_FAILED = "SVC_002"
    LLM_FAILED = "SVC_003"
    SERVICE_UNAVAILABLE = "SVC_004"
    RATE_LIMITED = "SVC_005"
    
    # 验证相关 (5xxx)
    VALIDATION_ERROR = "VAL_001"
    INVALID_FILE_TYPE = "VAL_002"
    FILE_TOO_LARGE = "VAL_003"
    MISSING_REQUIRED_FIELD = "VAL_004"
    
    # 系统相关 (9xxx)
    INTERNAL_ERROR = "SYS_001"
    DATABASE_ERROR = "SYS_002"
    REDIS_ERROR = "SYS_003"
    EXTERNAL_SERVICE_ERROR = "SYS_004"


class AppException(Exception):
    """应用基础异常类"""
    
    def __init__(
        self,
        message: str,
        code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        status_code: int = 500,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
    
    def to_dict(self) -> dict[str, Any]:
        """转换为响应字典"""
        return {
            "error": {
                "code": self.code.value,
                "message": self.message,
                "details": self.details,
            }
        }


class AuthenticationError(AppException):
    """认证异常"""
    
    def __init__(
        self,
        message: str = "认证失败",
        code: ErrorCode = ErrorCode.UNAUTHORIZED,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code, 401, details)


class AuthorizationError(AppException):
    """授权异常"""
    
    def __init__(
        self,
        message: str = "无权限访问",
        code: ErrorCode = ErrorCode.CONVERSATION_ACCESS_DENIED,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code, 403, details)


class NotFoundError(AppException):
    """资源不存在异常"""
    
    def __init__(
        self,
        message: str = "资源不存在",
        code: ErrorCode = ErrorCode.USER_NOT_FOUND,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code, 404, details)


class ValidationError(AppException):
    """验证异常"""
    
    def __init__(
        self,
        message: str = "验证失败",
        code: ErrorCode = ErrorCode.VALIDATION_ERROR,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code, 400, details)


class ConflictError(AppException):
    """冲突异常（如重复数据）"""
    
    def __init__(
        self,
        message: str = "资源已存在",
        code: ErrorCode = ErrorCode.USER_ALREADY_EXISTS,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code, 409, details)


class ServiceError(AppException):
    """外部服务异常"""
    
    def __init__(
        self,
        message: str = "服务暂时不可用",
        code: ErrorCode = ErrorCode.SERVICE_UNAVAILABLE,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code, 503, details)


class RateLimitError(AppException):
    """限流异常"""
    
    def __init__(
        self,
        message: str = "请求过于频繁，请稍后再试",
        code: ErrorCode = ErrorCode.RATE_LIMITED,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message, code, 429, details)
