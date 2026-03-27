"""
Audio API routes for fetching synthesized audio.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.message import Message
from app.services.tts_service import get_tts_service_from_db

router = APIRouter(prefix="/audio", tags=["audio"])


@router.get("/{message_id}")
async def get_message_audio(
    message_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Get synthesized audio for a message.
    
    Generates TTS audio on-the-fly for assistant messages.
    Note: No auth required - audio is generated from message content.
    """
    # Get the message
    result = await db.execute(
        select(Message).where(Message.id == message_id)
    )
    message = result.scalar_one_or_none()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Only allow audio for assistant messages
    if message.role != "assistant":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio only available for assistant messages",
        )

    # Generate audio (从数据库获取 TTS 配置)
    tts_service = await get_tts_service_from_db(db)
    audio_data = await tts_service.synthesize(text=message.content)

    return Response(
        content=audio_data,
        media_type="audio/wav",
        headers={
            "Content-Disposition": f"attachment; filename={message_id}.wav",
            "Content-Length": str(len(audio_data)),
        },
    )
