"""
SenseWorld Backend Application
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.database import close_redis
from app.core.logging import setup_logging, get_logger, get_trace_id
from app.core.exceptions import AppException, ErrorCode
from app.core.middleware import RequestTraceMiddleware

# 初始化日志系统
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    logger.info("Starting SenseWorld Backend...")
    yield
    logger.info("Shutting down SenseWorld Backend...")
    await close_redis()


app = FastAPI(
    title="SenseWorld API",
    description="多模态 AI 对话平台 API",
    version="1.0.0",
    lifespan=lifespan,
)

# 请求追踪中间件（最先添加，最后执行）
app.add_middleware(RequestTraceMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 自定义应用异常处理器
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """处理应用自定义异常"""
    logger.warning(
        f"Application error: {exc.code.value} - {exc.message}",
        extra={"extra_data": {"code": exc.code.value, "details": exc.details}}
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code.value,
                "message": exc.message,
                "details": exc.details,
                "trace_id": get_trace_id(),
            }
        },
    )


# 全局异常处理器（兜底）
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions."""
    trace_id = get_trace_id()
    logger.error(
        f"Unhandled exception: {exc}",
        exc_info=True,
        extra={"extra_data": {"trace_id": trace_id}}
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": ErrorCode.INTERNAL_ERROR.value,
                "message": "服务器内部错误，请稍后重试",
                "trace_id": trace_id,
            }
        },
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "SenseWorld API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# Include routers
from app.api.v1.auth import router as auth_router
from app.api.v1.conversation import router as conversation_router
from app.api.v1.message import router as message_router
from app.api.v1.speech import router as speech_router
from app.api.v1.audio import router as audio_router
from app.api.v1.chat import router as chat_router
from app.api.v1.admin import router as admin_router
from app.api.websocket import router as websocket_router

app.include_router(auth_router, prefix="/v1")
app.include_router(conversation_router, prefix="/v1")
app.include_router(message_router, prefix="/v1")
app.include_router(speech_router, prefix="/v1")
app.include_router(audio_router, prefix="/v1")
app.include_router(chat_router, prefix="/v1")
app.include_router(admin_router, prefix="/v1")
app.include_router(websocket_router)
