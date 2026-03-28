"""
ASR (Automatic Speech Recognition) service using Aliyun DashScope.
Uses OpenAI-compatible API with base64 audio input.
"""

import base64
import logging
from dataclasses import dataclass
from typing import Optional

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TranscriptionResult:
    """Result from ASR transcription."""

    text: str
    language: str
    confidence: Optional[float] = None
    duration_ms: Optional[int] = None


class ASRService:
    """Service for speech-to-text using Aliyun DashScope (OpenAI-compatible mode)."""

    def __init__(self):
        self.api_key = settings.tts_api_key  # 复用 TTS 的 key
        self.model = "qwen3-asr-flash"
        self._client = OpenAI(
            api_key=self.api_key,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )

    async def transcribe(
        self,
        audio_data: bytes,
        language: str = "zh",
        filename: str = "audio.webm",
    ) -> TranscriptionResult:
        """
        Transcribe audio to text.

        Args:
            audio_data: Raw audio bytes
            language: Language hint for transcription
            filename: Filename with extension for format detection

        Returns:
            TranscriptionResult with text and metadata
        """
        import asyncio

        try:
            # 将音频编码为 base64
            audio_b64 = base64.b64encode(audio_data).decode("utf-8")

            # 在线程池中运行同步调用
            loop = asyncio.get_event_loop()
            completion = await loop.run_in_executor(
                None,
                lambda: self._client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "input_audio",
                                    "input_audio": {
                                        "data": f"data:audio/wav;base64,{audio_b64}"
                                    },
                                }
                            ],
                        }
                    ],
                    extra_body={
                        "asr_options": {
                            "language": language,
                            "enable_itn": False,
                        }
                    },
                ),
            )

            text = completion.choices[0].message.content or ""

            # 提取 usage 中的音频时长
            duration_ms = None
            if completion.usage:
                seconds = getattr(completion.usage, "seconds", None)
                if seconds is None and hasattr(completion.usage, "model_extra"):
                    seconds = (completion.usage.model_extra or {}).get("seconds")
                if seconds is not None:
                    duration_ms = int(seconds * 1000)

            return TranscriptionResult(
                text=text,
                language=language,
                duration_ms=duration_ms,
            )

        except Exception as e:
            logger.error(f"ASR transcription failed: {e}")
            raise


# Singleton instance
_asr_service: Optional[ASRService] = None


def get_asr_service() -> ASRService:
    """Get ASR service singleton."""
    global _asr_service
    if _asr_service is None:
        _asr_service = ASRService()
    return _asr_service
