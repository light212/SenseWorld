"""
TTS (Text-to-Speech) service using Aliyun DashScope API.
使用 qwen3-tts-instruct-flash 模型。
"""

import os
import logging
from typing import Optional

import dashscope
from dashscope import MultiModalConversation

from app.config import settings

logger = logging.getLogger(__name__)


class TTSService:
    """Service for text-to-speech using Aliyun DashScope API."""

    def __init__(self):
        self.api_key = settings.tts_api_key or os.getenv("DASHSCOPE_API_KEY")
        self.model = settings.tts_model or "qwen3-tts-instruct-flash"
        self.default_voice = settings.tts_voice or "Cherry"
        
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
            raise ValueError("DASHSCOPE_API_KEY not configured")

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
            audio_data = response.output
            
            # 如果返回的是 URL，需要下载
            if isinstance(audio_data, dict) and 'audio_url' in audio_data:
                import httpx
                async with httpx.AsyncClient() as client:
                    audio_response = await client.get(audio_data['audio_url'])
                    return audio_response.content
            
            # 如果返回的是直接的音频数据
            if isinstance(audio_data, bytes):
                return audio_data
            
            # 如果返回的是 base64 编码
            if isinstance(audio_data, dict) and 'audio' in audio_data:
                import base64
                return base64.b64decode(audio_data['audio'])
            
            logger.warning(f"Unexpected response format: {type(audio_data)}")
            raise ValueError("Unexpected TTS response format")
            
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

    async def synthesize_stream_with_header(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
    ):
        """
        流式合成音频。
        
        由于模型不支持真正的流式，直接返回完整音频。
        """
        audio_data = await self.synthesize(text, voice, speed)
        yield audio_data


# Singleton instance
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """Get TTS service singleton."""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service