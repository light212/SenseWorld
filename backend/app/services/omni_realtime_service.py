"""
Omni Realtime Service - WebSocket-based real-time multimodal conversation.

Uses Aliyun DashScope qwen3-omni-flash-realtime model for real-time
audio/video understanding and response.
"""

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from typing import Callable, Optional

import dashscope
from dashscope.audio.qwen_omni import OmniRealtimeConversation, OmniRealtimeCallback

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class OmniConfig:
    """Configuration for Omni Realtime service."""
    api_key: str
    model: str = "qwen3-omni-flash-realtime"
    url: str = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime"


class OmniRealtimeService:
    """
    Service for real-time multimodal conversation.
    
    Supports:
    - Real-time audio input/output
    - Real-time video (image frames) input
    - Bidirectional streaming conversation
    """

    def __init__(self, config: OmniConfig = None):
        self.config = config or OmniConfig(
            api_key=settings.tts_api_key  # 复用 DashScope API key
        )
        dashscope.api_key = self.config.api_key
        self.conversation: Optional[OmniRealtimeConversation] = None
        self._callbacks = {
            "on_open": [],
            "on_event": [],
            "on_close": [],
            "on_error": [],
        }

    def create_callback(self) -> OmniRealtimeCallback:
        """Create callback handler that forwards events to registered handlers."""
        service = self

        class ServiceCallback(OmniRealtimeCallback):
            def on_open(self) -> None:
                logger.info("Omni WebSocket connected")
                for cb in service._callbacks["on_open"]:
                    try:
                        cb()
                    except Exception as e:
                        logger.error(f"on_open callback error: {e}")

            def on_event(self, response: dict) -> None:
                logger.debug(f"Omni event: {json.dumps(response, ensure_ascii=False)[:200]}")
                for cb in service._callbacks["on_event"]:
                    try:
                        cb(response)
                    except Exception as e:
                        logger.error(f"on_event callback error: {e}")

            def on_close(self, close_status_code: int, close_msg: str) -> None:
                logger.info(f"Omni WebSocket closed (code={close_status_code}, msg={close_msg})")
                for cb in service._callbacks["on_close"]:
                    try:
                        cb(close_status_code, close_msg)
                    except Exception as e:
                        logger.error(f"on_close callback error: {e}")

            def on_error(self, error: Exception) -> None:
                logger.error(f"Omni WebSocket error: {error}")
                for cb in service._callbacks["on_error"]:
                    try:
                        cb(error)
                    except Exception as e:
                        logger.error(f"on_error callback error: {e}")

        return ServiceCallback()

    def on(self, event: str, callback: Callable):
        """Register event callback."""
        if event in self._callbacks:
            self._callbacks[event].append(callback)
        return self

    def connect(self) -> bool:
        """
        Establish WebSocket connection to Omni service.
        
        Returns:
            True if connection successful
        """
        try:
            callback = self.create_callback()
            self.conversation = OmniRealtimeConversation(
                model=self.config.model,
                callback=callback,
                url=self.config.url,
            )
            self.conversation.connect()
            return True
        except Exception as e:
            logger.error(f"Failed to connect Omni service: {e}")
            return False

    def send_audio(self, audio_data: bytes, sample_rate: int = 16000):
        """
        Send audio data to the conversation.
        
        Args:
            audio_data: PCM audio bytes
            sample_rate: Audio sample rate (default 16000 Hz)
        """
        if not self.conversation:
            raise RuntimeError("Not connected. Call connect() first.")
        
        try:
            self.conversation.send_audio(audio_data)
        except Exception as e:
            logger.error(f"Failed to send audio: {e}")
            raise

    def send_image(self, image_data: bytes, mime_type: str = "image/jpeg"):
        """
        Send image frame to the conversation.
        
        Args:
            image_data: Image bytes (JPEG, PNG)
            mime_type: Image MIME type
        """
        if not self.conversation:
            raise RuntimeError("Not connected. Call connect() first.")
        
        try:
            import base64
            image_base64 = base64.b64encode(image_data).decode()
            self.conversation.send_image(image_base64, mime_type)
        except Exception as e:
            logger.error(f"Failed to send image: {e}")
            raise

    def send_text(self, text: str):
        """
        Send text message to the conversation.
        
        Args:
            text: Text message
        """
        if not self.conversation:
            raise RuntimeError("Not connected. Call connect() first.")
        
        try:
            self.conversation.send_text(text)
        except Exception as e:
            logger.error(f"Failed to send text: {e}")
            raise

    def close(self):
        """Close the WebSocket connection."""
        if self.conversation:
            try:
                self.conversation.close()
            except Exception as e:
                logger.error(f"Error closing connection: {e}")
            finally:
                self.conversation = None
                self._callbacks = {k: [] for k in self._callbacks}

    @property
    def is_connected(self) -> bool:
        """Check if WebSocket is connected."""
        return self.conversation is not None


# Factory function
def create_omni_service(
    api_key: str = None,
    model: str = "qwen3-omni-flash-realtime",
) -> OmniRealtimeService:
    """
    Create an Omni Realtime service instance.
    
    Args:
        api_key: DashScope API key (defaults to settings)
        model: Model name (default qwen3-omni-flash-realtime)
    
    Returns:
        OmniRealtimeService instance
    """
    config = OmniConfig(
        api_key=api_key or settings.tts_api_key,
        model=model,
    )
    return OmniRealtimeService(config)
