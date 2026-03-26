"""
TTS (Text-to-Speech) service using Aliyun DashScope WebSocket API.
支持 qwen3-tts-flash-realtime 模型的流式调用。
"""

import json
import logging
import asyncio
import struct
from typing import AsyncGenerator, Optional

import websockets

from app.config import settings

logger = logging.getLogger(__name__)


class TTSService:
    """Service for text-to-speech using Aliyun DashScope WebSocket API."""

    def __init__(self):
        self.api_key = settings.tts_api_key
        self.model = settings.tts_model
        self.default_voice = settings.tts_voice
        self.ws_url = "wss://dashscope.aliyuncs.com/api-ws/v1/inference/"

    async def synthesize(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
    ) -> bytes:
        """
        Convert text to speech using WebSocket.

        Args:
            text: Text to convert
            voice: Voice to use (Cherry, Ethan, etc.)
            speed: Speech speed

        Returns:
            Audio bytes in WAV/PCM format
        """
        audio_chunks = []
        
        async for chunk in self.synthesize_stream(text, voice, speed):
            audio_chunks.append(chunk)
        
        return b"".join(audio_chunks)

    async def synthesize_stream(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream text-to-speech synthesis via WebSocket.

        Args:
            text: Text to convert
            voice: Voice to use
            speed: Speech speed

        Yields:
            Audio chunks (PCM format)
        """
        if not self.api_key:
            raise ValueError("TTS_API_KEY not configured")

        voice = voice or self.default_voice
        
        # 构建请求
        request_payload = {
            "header": {
                "action": "run-task",
                "streaming": "duplex",
                "task_id": f"tts-{id(self)}",
            },
            "payload": {
                "task": "tts",
                "function": "speech_synthesis",
                "model": self.model,
                "parameters": {
                    "voice": voice,
                    "text_type": "PlainText",
                    "format": "pcm",
                    "sample_rate": 16000,
                    "volume": 50,
                    "speech_rate": int(speed * 100),
                },
                "input": {
                    "text": text,
                },
            },
        }

        try:
            # 建立 WebSocket 连接
            headers = {
                "Authorization": f"bearer {self.api_key}",
            }
            
            async with websockets.connect(
                self.ws_url,
                extra_headers=headers,
                ping_interval=30,
                ping_timeout=10,
            ) as ws:
                # 发送请求
                await ws.send(json.dumps(request_payload))
                
                # 接收流式音频数据
                while True:
                    try:
                        message = await asyncio.wait_for(
                            ws.recv(),
                            timeout=30.0,
                        )
                        
                        # 检查消息类型
                        if isinstance(message, bytes):
                            # 二进制音频数据
                            yield message
                        elif isinstance(message, str):
                            # JSON 控制消息
                            data = json.loads(message)
                            header = data.get("header", {})
                            
                            # 检查是否完成
                            if header.get("task_status") == "SUCCEEDED":
                                logger.info("TTS synthesis completed")
                                break
                            elif header.get("task_status") == "FAILED":
                                error_msg = data.get("payload", {}).get("message", "Unknown error")
                                logger.error(f"TTS failed: {error_msg}")
                                raise Exception(f"TTS synthesis failed: {error_msg}")
                            
                            # 忽略其他控制消息
                            continue
                            
                    except asyncio.TimeoutError:
                        logger.error("WebSocket receive timeout")
                        raise TimeoutError("TTS synthesis timeout")
                    except websockets.exceptions.ConnectionClosed:
                        logger.info("WebSocket connection closed")
                        break

        except Exception as e:
            logger.error(f"TTS WebSocket error: {e}")
            raise

    async def synthesize_stream_with_header(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
    ) -> AsyncGenerator[bytes, None]:
        """
        流式合成音频，带 WAV 文件头。
        
        Yields:
            首次返回 WAV 头，后续返回 PCM 音频块
        """
        # 先生成 WAV 头（16kHz, 16bit, mono）
        wav_header = self._generate_wav_header(sample_rate=16000, bits=16, channels=1)
        yield wav_header
        
        # 然后流式返回音频数据
        async for chunk in self.synthesize_stream(text, voice, speed):
            yield chunk

    def _generate_wav_header(
        self,
        sample_rate: int = 16000,
        bits: int = 16,
        channels: int = 1,
    ) -> bytes:
        """
        生成 WAV 文件头。
        
        由于不知道总大小，使用最大值。
        """
        byte_rate = sample_rate * channels * bits // 8
        block_align = channels * bits // 8
        
        # 使用最大值（4GB）
        data_size = 0xFFFFFFFF - 36
        
        header = struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF",           # ChunkID
            data_size,         # ChunkSize (unknown, use max)
            b"WAVE",           # Format
            b"fmt ",           # Subchunk1ID
            16,                # Subchunk1Size (PCM)
            1,                 # AudioFormat (PCM)
            channels,          # NumChannels
            sample_rate,       # SampleRate
            byte_rate,         # ByteRate
            block_align,       # BlockAlign
            bits,              # BitsPerSample
            b"data",           # Subchunk2ID
            data_size,         # Subchunk2Size (unknown)
        )
        
        return header


# Singleton instance
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """Get TTS service singleton."""
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service