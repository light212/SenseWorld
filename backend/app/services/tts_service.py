"""
TTS (Text-to-Speech) service using Aliyun DashScope.
"""

import logging
import io
from typing import AsyncGenerator, Optional

import dashscope
import aiohttp

from app.config import settings

logger = logging.getLogger(__name__)


class TTSService:
    """Service for text-to-speech using Aliyun DashScope."""

    def __init__(self):
        # Configure DashScope
        dashscope.base_http_api_url = settings.tts_base_url or 'https://dashscope.aliyuncs.com/api/v1'
        self.api_key = settings.tts_api_key
        self.model = settings.tts_model
        self.default_voice = settings.tts_voice

    async def synthesize(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
    ) -> bytes:
        """
        Convert text to speech.

        Args:
            text: Text to convert
            voice: Voice to use (Cherry, Ethan, etc.)
            speed: Speech speed (not used in DashScope, kept for interface compatibility)

        Returns:
            Audio bytes in WAV format
        """
        try:
            import asyncio
            
            # Run sync call in thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: dashscope.MultiModalConversation.call(
                    model=self.model,
                    api_key=self.api_key,
                    text=text,
                    voice=voice or self.default_voice,
                )
            )

            if response.status_code == 200:
                # Get audio URL from response
                output = response.get('output', {})
                audio_info = output.get('audio', {}) if isinstance(output, dict) else getattr(output, 'audio', None)
                
                if audio_info:
                    audio_url = audio_info.get('url') if isinstance(audio_info, dict) else getattr(audio_info, 'url', None)
                    if audio_url:
                        # Download audio from URL
                        async with aiohttp.ClientSession() as session:
                            async with session.get(audio_url) as resp:
                                if resp.status == 200:
                                    return await resp.read()
                                else:
                                    logger.error(f"Failed to download audio: {resp.status}")
                                    raise Exception(f"Failed to download audio: {resp.status}")
                
                logger.error(f"TTS response has no audio URL: {response}")
                raise Exception("TTS response has no audio URL")
            else:
                logger.error(f"TTS failed: {response.get('code')} - {response.get('message')}")
                raise Exception(f"TTS failed: {response.get('message')}")

        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            raise

    async def synthesize_stream(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
        chunk_size: int = 4096,
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream text-to-speech synthesis.

        Args:
            text: Text to convert
            voice: Voice to use
            speed: Speech speed
            chunk_size: Size of each audio chunk

        Yields:
            Audio chunks
        """
        try:
            # For DashScope, we get the full audio then stream it
            audio_data = await self.synthesize(text, voice, speed)
            
            # Stream the audio in chunks
            buffer = io.BytesIO(audio_data)
            while True:
                chunk = buffer.read(chunk_size)
                if not chunk:
                    break
                yield chunk

        except Exception as e:
            logger.error(f"TTS streaming failed: {e}")
            raise


# Singleton instance
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """Get TTS service singleton."""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
