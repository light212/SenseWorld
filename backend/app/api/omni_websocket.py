"""
Omni Realtime WebSocket endpoint - bridges frontend to Aliyun DashScope Omni API.

Uses native websocket-client for direct connection to DashScope.
"""

import asyncio
import base64
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from queue import Queue

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import async_session_maker
from app.core.security import decode_access_token
from app.services.omni_realtime_service import create_omni_service, OmniRealtimeService
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
    - Backend ↔ DashScope Omni WebSocket (native)
    """

    def __init__(self, websocket: WebSocket, user_id: str):
        self.websocket = websocket
        self.user_id = user_id
        self.omni_service: Optional[OmniRealtimeService] = None
        self.event_queue: Queue = Queue()
        self.is_running = False
        self._forward_task: Optional[asyncio.Task] = None

    async def start(self) -> bool:
        """Initialize and connect to Omni service."""
        try:
            self.omni_service = create_omni_service()
            
            # Register callbacks
            self.omni_service.on("on_open", self._on_omni_open)
            self.omni_service.on("on_message", self._on_omni_message)
            self.omni_service.on("on_close", self._on_omni_close)
            self.omni_service.on("on_error", self._on_omni_error)
            
            # Connect (starts background thread)
            self.is_running = True
            if not self.omni_service.connect():
                return False
            
            # Start event forwarding loop
            self._forward_task = asyncio.create_task(self._forward_events())
            
            return True
        except Exception as e:
            logger.error(f"Failed to start Omni session: {e}")
            return False

    def _on_omni_open(self):
        """Called when Omni WebSocket opens."""
        self.event_queue.put({
            "type": "omni_connected",
            "payload": {"status": "ready"},
        })

    def _on_omni_message(self, data: dict):
        """Called when Omni sends a message."""
        self.event_queue.put({
            "type": "omni_event",
            "payload": data,
        })

    def _on_omni_close(self, code: int, msg: str):
        """Called when Omni WebSocket closes."""
        self.event_queue.put({
            "type": "omni_closed",
            "payload": {"code": code, "message": msg or "Connection closed"},
        })
        self.is_running = False

    def _on_omni_error(self, error):
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

        if not self.omni_service or not self.omni_service.is_connected:
            return

        try:
            if msg_type == "audio_chunk":
                # Forward audio to Omni
                audio_base64 = payload.get("audio")
                if audio_base64:
                    audio_data = base64.b64decode(audio_base64)
                    self.omni_service.send_audio(audio_data)

            elif msg_type == "audio_commit":
                # Commit audio buffer and request response
                self.omni_service.commit_audio()

            elif msg_type == "text":
                # Send text message
                text = payload.get("text")
                if text:
                    self.omni_service.send_text(text)

            elif msg_type == "image_frame":
                # Forward video frame to Omni
                image_base64 = payload.get("image")
                if image_base64:
                    image_data = base64.b64decode(image_base64)
                    self.omni_service.send_video_frame(image_data)
                    logger.debug(f"Sent video frame, size={len(image_data)} bytes")

            elif msg_type == "cancel":
                # Cancel current response
                self.omni_service.cancel_response()

            elif msg_type == "ping":
                await self.websocket.send_json({
                    "type": "pong",
                    "payload": {},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            elif msg_type == "raw_event":
                # Forward raw event to DashScope (for advanced usage)
                event_type = payload.get("event_type")
                event_data = payload.get("data", {})
                if event_type:
                    self.omni_service.send_event(event_type, event_data)

        except Exception as e:
            logger.error(f"Failed to handle message: {e}")
            await self.websocket.send_json({
                "type": "error",
                "payload": {"message": str(e)},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    def close(self):
        """Close the session."""
        self.is_running = False
        
        if self._forward_task:
            self._forward_task.cancel()
            self._forward_task = None
        
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
    - audio_chunk: {audio: base64} - Send audio data
    - audio_commit: {} - Commit audio buffer and get response
    - text: {text: "hello"} - Send text message
    - cancel: {} - Cancel current response
    - ping: {} - Keep alive
    - raw_event: {event_type: str, data: dict} - Send raw DashScope event
    
    Message types to client:
    - omni_connected: {status: "ready"}
    - omni_event: {<dashscope event>}
    - omni_closed: {code: int, message: str}
    - omni_error: {message: str}
    - pong: {}
    - error: {message: str}
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
