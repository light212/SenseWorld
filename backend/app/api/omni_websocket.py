"""
Omni Realtime WebSocket endpoint - bridges frontend to Aliyun DashScope Omni API.

Provides real-time multimodal conversation:
- Audio input (from user mic)
- Audio output (AI voice response)
- Image input (from user camera - future)
"""

import asyncio
import base64
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from queue import Queue
from threading import Thread

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.core.database import async_session_maker
from app.core.security import decode_access_token
from app.services.omni_realtime_service import create_omni_service, OmniRealtimeService
from sqlalchemy import select
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


async def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return user ID."""
    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    async with async_session_maker() as db:
        result = await db.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        if not user:
            return None

    return user_id


class OmniSession:
    """
    Manages a single Omni realtime session.
    
    Bridges:
    - Frontend WebSocket ↔ Backend
    - Backend ↔ DashScope Omni WebSocket
    """

    def __init__(self, websocket: WebSocket, user_id: str):
        self.websocket = websocket
        self.user_id = user_id
        self.omni_service: Optional[OmniRealtimeService] = None
        self.event_queue: Queue = Queue()
        self.is_running = False

    async def start(self) -> bool:
        """Initialize and connect to Omni service."""
        try:
            self.omni_service = create_omni_service()
            
            # Register callbacks
            self.omni_service.on("on_open", self._on_omni_open)
            self.omni_service.on("on_event", self._on_omni_event)
            self.omni_service.on("on_close", self._on_omni_close)
            self.omni_service.on("on_error", self._on_omni_error)
            
            # Connect in background thread (dashscope SDK uses sync WebSocket)
            self.is_running = True
            connect_thread = Thread(target=self._connect_omni, daemon=True)
            connect_thread.start()
            
            # Start event forwarding loop
            asyncio.create_task(self._forward_events())
            
            return True
        except Exception as e:
            logger.error(f"Failed to start Omni session: {e}")
            return False

    def _connect_omni(self):
        """Connect to Omni service (runs in thread)."""
        try:
            self.omni_service.connect()
        except Exception as e:
            logger.error(f"Omni connect error: {e}")
            self.event_queue.put({
                "type": "error",
                "payload": {"message": str(e)},
            })

    def _on_omni_open(self):
        """Called when Omni WebSocket opens."""
        self.event_queue.put({
            "type": "omni_connected",
            "payload": {"status": "ready"},
        })

    def _on_omni_event(self, response: dict):
        """Called when Omni sends an event."""
        # Forward to frontend
        self.event_queue.put({
            "type": "omni_event",
            "payload": response,
        })

    def _on_omni_close(self, code: int, msg: str):
        """Called when Omni WebSocket closes."""
        self.event_queue.put({
            "type": "omni_closed",
            "payload": {"code": code, "message": msg},
        })
        self.is_running = False

    def _on_omni_error(self, error: Exception):
        """Called when Omni encounters an error."""
        self.event_queue.put({
            "type": "omni_error",
            "payload": {"message": str(error)},
        })

    async def _forward_events(self):
        """Forward events from Omni to frontend WebSocket."""
        while self.is_running:
            try:
                # Non-blocking check for events
                while not self.event_queue.empty():
                    event = self.event_queue.get_nowait()
                    event["timestamp"] = datetime.now(timezone.utc).isoformat()
                    await self.websocket.send_json(event)
                
                await asyncio.sleep(0.01)  # 10ms poll interval
            except Exception as e:
                logger.error(f"Event forward error: {e}")
                break

    async def handle_message(self, message: dict):
        """Handle message from frontend."""
        msg_type = message.get("type")
        payload = message.get("payload", {})

        if msg_type == "audio_chunk":
            # Forward audio to Omni
            audio_base64 = payload.get("audio")
            if audio_base64 and self.omni_service and self.omni_service.is_connected:
                audio_data = base64.b64decode(audio_base64)
                try:
                    self.omni_service.send_audio(audio_data)
                except Exception as e:
                    logger.error(f"Failed to send audio: {e}")

        elif msg_type == "image_frame":
            # Forward image to Omni
            image_base64 = payload.get("image")
            mime_type = payload.get("mimeType", "image/jpeg")
            if image_base64 and self.omni_service and self.omni_service.is_connected:
                image_data = base64.b64decode(image_base64)
                try:
                    self.omni_service.send_image(image_data, mime_type)
                except Exception as e:
                    logger.error(f"Failed to send image: {e}")

        elif msg_type == "text":
            # Forward text to Omni
            text = payload.get("text")
            if text and self.omni_service and self.omni_service.is_connected:
                try:
                    self.omni_service.send_text(text)
                except Exception as e:
                    logger.error(f"Failed to send text: {e}")

        elif msg_type == "ping":
            await self.websocket.send_json({
                "type": "pong",
                "payload": {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    def close(self):
        """Close the session."""
        self.is_running = False
        if self.omni_service:
            self.omni_service.close()
            self.omni_service = None


@router.websocket("/ws/omni")
async def omni_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    WebSocket endpoint for real-time multimodal conversation.
    
    Message types from client:
    - audio_chunk: {audio: base64, sampleRate: 16000}
    - image_frame: {image: base64, mimeType: "image/jpeg"}
    - text: {text: "hello"}
    - ping: {}
    
    Message types to client:
    - omni_connected: {status: "ready"}
    - omni_event: {<dashscope event>}
    - omni_closed: {code: int, message: str}
    - omni_error: {message: str}
    - pong: {}
    """
    await websocket.accept()

    # Verify token
    user_id = await verify_token(token)
    if not user_id:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "code": "AUTH_FAILED",
                "message": "Invalid or expired token",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    # Create session
    session = OmniSession(websocket, user_id)
    
    # Start Omni connection
    if not await session.start():
        await websocket.send_json({
            "type": "error",
            "payload": {
                "code": "OMNI_CONNECT_FAILED",
                "message": "Failed to connect to Omni service",
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await websocket.close(code=1011, reason="Omni connection failed")
        return

    logger.info(f"User {user_id} connected to Omni realtime")

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await session.handle_message(message)

    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected from Omni")
    except Exception as e:
        logger.error(f"Omni WebSocket error: {e}")
    finally:
        session.close()
