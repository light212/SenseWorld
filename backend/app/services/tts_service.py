# -*- coding: utf-8 -*-
"""
TTS (Text-to-Speech) service using Aliyun DashScope API.
使用 qwen3-tts-instruct-flash 模型。
"""

import logging
import os
from typing import Optional

import dashscope
from dashscope import MultiModalConversation
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)


class TTSService:
    """Service for text-to-speech using Aliyun DashScope API."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        voice: Optional[str] = None,
    ):
        self.api_key = api_key or settings.tts_api_key or os.getenv("DASHSCOPE_API_KEY")
        self.model = model or settings.tts_model or "qwen3-tts-instruct-flash"
        self.default_voice = voice or settings.tts_voice or "Cherry"

        # 设置 DashScope API URL
        dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

    async def synthesize(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
    ) -> bytes:
        """
        Convert text to speech using DashScope API.

        Args:
            text: Text to convert
            voice: Voice to use (Cherry, Ethan, etc.)
            speed: Speech speed (not supported in this model)

        Returns:
            Audio bytes in WAV format
        """
        if not self.api_key:
            raise ValueError("TTS API Key not configured")

        voice = voice or self.default_voice

        try:
            # 调用 DashScope TTS API
            response = MultiModalConversation.call(
                model=self.model,
                api_key=self.api_key,
                text=text,
                voice=voice,
            )

            if response.status_code != 200:
                error_msg = response.message or "Unknown error"
                logger.error(f"TTS API error: {error_msg}")
                raise Exception(f"TTS API error: {error_msg}")

            # 获取音频数据
            audio_info = response.output.audio

            if audio_info and audio_info.url:
                # 下载音频
                import httpx
                async with httpx.AsyncClient() as client:
                    audio_response = await client.get(audio_info.url)
                    if audio_response.status_code == 200:
                        return audio_response.content
                    else:
                        raise Exception(f"Failed to download audio: {audio_response.status_code}")

            logger.error(f"No audio URL in response: {response.output}")
            raise ValueError("No audio URL in TTS response")

        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            raise

    async def synthesize_stream(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
    ):
        """
        Stream text-to-speech synthesis.
        
        Note: This model doesn't support streaming output,
        so we just yield the complete audio.
        """
        audio_data = await self.synthesize(text, voice, speed)
        yield audio_data


async def get_tts_service_from_db(db: AsyncSession) -> TTSService:
    """从数据库获取默认 TTS 配置并创建服务实例"""
    from app.services.config_service import ConfigService
    
    config_service = ConfigService(db)
    config = await config_service.get_default_model_config("tts")
    
    if config and config.get("api_key"):
        logger.info(f"Using TTS config from database: {config.get('provider')}/{config.get('model_name')}")
        return TTSService(
            api_key=config.get("api_key"),
            model=config.get("model_name"),
            voice=config.get("config", {}).get("voice"),
        )
    else:
        logger.info("No TTS config in database, using environment variables")
        return TTSService()


# Singleton instance (for backward compatibility, uses env vars)
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """Get TTS service singleton (uses environment variables)."""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
