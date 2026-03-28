"""
Omni Realtime Service - Native WebSocket connection to DashScope.

Uses websocket-client library for direct connection to Aliyun DashScope Omni API.
"""

import asyncio
import base64
import json
import logging
import os
import threading
from dataclasses import dataclass
from queue import Queue
from typing import Callable, Optional, List

import websocket

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class OmniConfig:
    """Configuration for Omni Realtime service."""
    api_key: str
    model: str = "qwen3-omni-flash-realtime"
    base_url: str = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime"

    @property
    def url(self) -> str:
        return f"{self.base_url}?model={self.model}"


class OmniRealtimeService:
    """
    Service for real-time multimodal conversation using native WebSocket.
    
    Supports:
    - Real-time audio input/output
    - Text conversation
    - Image/video frames (future)
    """

    def __init__(self, config: OmniConfig = None):
        self.config = config or OmniConfig(
            api_key=settings.tts_api_key  # 复用 DashScope API key
        )
        self.ws: Optional[websocket.WebSocketApp] = None
        self.ws_thread: Optional[threading.Thread] = None
        self._is_connected = False
        self._callbacks: dict[str, List[Callable]] = {
            "on_open": [],
            "on_message": [],
            "on_close": [],
            "on_error": [],
        }

    def on(self, event: str, callback: Callable) -> "OmniRealtimeService":
        """Register event callback."""
        if event in self._callbacks:
            self._callbacks[event].append(callback)
        return self

    def _trigger(self, event: str, *args):
        """Trigger all callbacks for an event."""
        for cb in self._callbacks.get(event, []):
            try:
                cb(*args)
            except Exception as e:
                logger.error(f"Callback error ({event}): {e}")

    def connect(self) -> bool:
        """
        Connect to DashScope Omni WebSocket.
        
        Returns:
            True if connection initiated successfully
        """
        if self._is_connected:
            return True

        try:
            headers = [f"Authorization: Bearer {self.config.api_key}"]
            
            self.ws = websocket.WebSocketApp(
                self.config.url,
                header=headers,
                on_open=self._on_open,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
            )

            # Run WebSocket in background thread
            self.ws_thread = threading.Thread(
                target=self.ws.run_forever,
                daemon=True
            )
            self.ws_thread.start()
            
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False

    def send_session_update(self, instructions: str = ""):
        """
        Send session.update event to configure the session.

        Args:
            instructions: Optional system instructions string
        """
        session = {
            "modalities": ["audio", "text"],
            "voice": "Chelsie",
            "input_audio_format": "pcm",
            "output_audio_format": "pcm",
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "silence_duration_ms": 800
            },
            "max_tokens": 16384,
            "repetition_penalty": 1.05,
        }
        if instructions:
            session["instructions"] = instructions
        self.send_event("session.update", {"session": session})

    def send_video_frame(self, image_data: bytes):
        """
        Send a video frame to the conversation.

        Args:
            image_data: JPEG image bytes
        """
        image_base64 = base64.b64encode(image_data).decode()
        self.send_event("input_image_buffer.append", {
            "image": image_base64
        })

    def _on_open(self, ws):
        """WebSocket opened."""
        logger.info(f"Connected to DashScope Omni: {self.config.url}")
        self._is_connected = True
        self.send_session_update()
        self._trigger("on_open")

    def _on_message(self, ws, message: str):
        """Received message from DashScope."""
        try:
            data = json.loads(message)
            logger.debug(f"Omni message: {json.dumps(data, ensure_ascii=False)[:200]}")
            self._trigger("on_message", data)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message: {e}")

    def _on_error(self, ws, error):
        """WebSocket error."""
        logger.error(f"Omni WebSocket error: {error}")
        self._trigger("on_error", error)

    def _on_close(self, ws, close_status_code, close_msg):
        """WebSocket closed."""
        logger.info(f"Omni WebSocket closed (code={close_status_code}, msg={close_msg})")
        self._is_connected = False
        self._trigger("on_close", close_status_code, close_msg)

    def send_event(self, event_type: str, data: dict = None):
        """
        Send event to DashScope.
        
        Args:
            event_type: Event type (e.g., "input_audio_buffer.append")
            data: Event data
        """
        if not self.ws or not self._is_connected:
            raise RuntimeError("Not connected")

        event = {
            "type": event_type,
            **(data or {})
        }
        self.ws.send(json.dumps(event))

    def send_audio(self, audio_data: bytes):
        """
        Send audio data to conversation.
        
        Args:
            audio_data: PCM audio bytes (16kHz, 16-bit, mono)
        """
        audio_base64 = base64.b64encode(audio_data).decode()
        self.send_event("input_audio_buffer.append", {
            "audio": audio_base64
        })

    def commit_audio(self):
        """Commit audio buffer and request response."""
        self.send_event("input_audio_buffer.commit")

    def send_text(self, text: str, role: str = "user"):
        """
        Send text message.
        
        Args:
            text: Message text
            role: Message role (user/assistant)
        """
        self.send_event("conversation.item.create", {
            "item": {
                "type": "message",
                "role": role,
                "content": [{"type": "input_text", "text": text}]
            }
        })
        # Request response
        self.send_event("response.create")

    def cancel_response(self):
        """Cancel current response generation."""
        self.send_event("response.cancel")

    def close(self):
        """Close WebSocket connection."""
        self._is_connected = False
        if self.ws:
            try:
                self.ws.close()
            except Exception as e:
                logger.error(f"Error closing WebSocket: {e}")
            self.ws = None
        
        self._callbacks = {k: [] for k in self._callbacks}

    @property
    def is_connected(self) -> bool:
        """Check if connected."""
        return self._is_connected


def create_omni_service(
    api_key: str = None,
    model: str = "qwen3-omni-flash-realtime",
) -> OmniRealtimeService:
    """
    Create an Omni Realtime service instance.
    
    Args:
        api_key: DashScope API key (defaults to settings)
        model: Model name
    
    Returns:
        OmniRealtimeService instance
    """
    config = OmniConfig(
        api_key=api_key or settings.tts_api_key,
        model=model,
    )
    return OmniRealtimeService(config)
