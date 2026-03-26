"""
SenseWorld Backend Configuration
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "mysql+aiomysql://user:password@localhost:3306/senseworld"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Security
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    encryption_key: Optional[str] = None

    # LLM (OpenAI-compatible API)
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    llm_model: str = "gpt-4-turbo-preview"

    # TTS (Text-to-Speech)
    tts_api_key: Optional[str] = None
    tts_base_url: Optional[str] = None
    tts_model: str = "tts-1"
    tts_voice: str = "Cherry"  # 阿里云 DashScope 支持的 voice

    # Application
    debug: bool = False
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # System settings defaults
    default_llm_model: str = "qwen-turbo"
    default_asr_model: str = "paraformer-v2"
    default_tts_model: str = "cosyvoice-v1"
    rate_limit_rpm: int = 60
    request_timeout_ms: int = 30000
    cost_alert_threshold: float = 100
    log_retention_days: int = 90

    # Logging
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
