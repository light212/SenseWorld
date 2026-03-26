"""
ASR (Automatic Speech Recognition) service using Aliyun DashScope.
"""

import logging
import base64
import tempfile
import os
from dataclasses import dataclass
from typing import Optional

import dashscope

from app.config import settings

logger = logging.getLogger(__name__)

# 配置 DashScope
dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'


@dataclass
class TranscriptionResult:
    """Result from ASR transcription."""

    text: str
    language: str
    confidence: Optional[float] = None
    duration_ms: Optional[int] = None


class ASRService:
    """Service for speech-to-text using Aliyun DashScope."""

    def __init__(self):
        self.api_key = settings.tts_api_key  # 复用 TTS 的 key
        self.model = "qwen3-asr-flash"

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
            # 保存到临时文件
            suffix = os.path.splitext(filename)[1] or ".webm"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
                f.write(audio_data)
                temp_path = f.name
            
            try:
                # 在线程池中运行同步调用
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: dashscope.MultiModalConversation.call(
                        api_key=self.api_key,
                        model=self.model,
                        messages=[
                            {
                                "role": "user",
                                "content": [{"audio": f"file://{temp_path}"}]
                            }
                        ],
                        result_format="message",
                        asr_options={
                            "language": language,
                            "enable_itn": False,
                        }
                    )
                )
                
                logger.info(f"ASR response: {response}")
                
                if response.status_code == 200:
                    # 提取转写文本
                    output = response.output
                    if hasattr(output, 'choices') and output.choices:
                        choice = output.choices[0]
                        if hasattr(choice, 'message') and choice.message:
                            content = choice.message.content
                            if isinstance(content, list):
                                for item in content:
                                    if isinstance(item, dict) and 'text' in item:
                                        return TranscriptionResult(
                                            text=item['text'],
                                            language=language,
                                        )
                            elif isinstance(content, str):
                                return TranscriptionResult(
                                    text=content,
                                    language=language,
                                )
                    
                    # 尝试其他格式
                    if hasattr(output, 'text'):
                        return TranscriptionResult(
                            text=output.text,
                            language=language,
                        )
                    
                    logger.error(f"Cannot parse ASR response: {response}")
                    raise Exception(f"Cannot parse ASR response")
                else:
                    error_msg = getattr(response, 'message', str(response))
                    logger.error(f"ASR failed: {response.status_code} - {error_msg}")
                    raise Exception(f"ASR failed: {error_msg}")
                    
            finally:
                # 清理临时文件
                os.unlink(temp_path)

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
