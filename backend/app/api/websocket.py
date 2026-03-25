"""
WebSocket handling for real-time chat communication.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker, get_redis
from app.core.security import decode_access_token
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        """Accept and register a connection."""
        await websocket.accept()
        self.active_connections[user_id] = websocket

        # Store connection in Redis
        redis = await get_redis()
        await redis.set(f"ws:user:{user_id}", "connected", ex=3600)

    def disconnect(self, user_id: str):
        """Remove a connection."""
        self.active_connections.pop(user_id, None)

    async def send_message(self, user_id: str, message: dict):
        """Send a message to a specific user."""
        websocket = self.active_connections.get(user_id)
        if websocket:
            await websocket.send_json(message)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected users."""
        for websocket in self.active_connections.values():
            await websocket.send_json(message)


manager = ConnectionManager()


async def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return user ID."""
    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    # Verify user exists
    # 注意：User.id 是 UUID 类型，直接用字符串比较可能导致类型不一致
    # 使用 text() 或让 SQLAlchemy 自动处理类型转换
    async with async_session_maker() as db:
        result = await db.execute(
            select(User).where(User.id == user_id, User.is_active == True)  # noqa: E712
        )
        user = result.scalar_one_or_none()
        if not user:
            return None

    return user_id


@router.websocket("/ws/chat")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """WebSocket endpoint for real-time chat."""
    # Verify token
    user_id = await verify_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    await manager.connect(user_id, websocket)

    # Send connected message
    await websocket.send_json({
        "type": "connected",
        "payload": {
            "userId": user_id,
            "sessionId": str(UUID(int=0)),  # Placeholder session ID
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")

            if msg_type == "ping":
                # Respond to ping
                await websocket.send_json({
                    "type": "pong",
                    "payload": {},
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

            elif msg_type == "session_start":
                # Handle session start
                conversation_id = message.get("payload", {}).get("conversationId")
                logger.info(f"Session started for conversation {conversation_id}")
                # TODO: Initialize conversation context

            elif msg_type == "audio_chunk":
                # Handle audio chunk
                # TODO: Buffer and process audio
                pass

            elif msg_type == "audio_end":
                # Handle end of audio
                # TODO: Process complete audio with ASR
                # For now, send placeholder
                await websocket.send_json({
                    "type": "asr_result",
                    "payload": {
                        "text": "[语音转文字处理中...]",
                        "confidence": 0.0,
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "requestId": message.get("requestId"),
                })

            elif msg_type == "conversation_select":
                # Handle conversation selection
                conversation_id = message.get("payload", {}).get("conversationId")
                logger.info(f"User {user_id} selected conversation {conversation_id}")

    except WebSocketDisconnect:
        manager.disconnect(user_id)
        logger.info(f"User {user_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(user_id)
        await websocket.close(code=1011, reason="Internal error")
