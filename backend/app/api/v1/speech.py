"""
Speech API routes (ASR and TTS).
"""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.schemas.message import SynthesizeRequest, TranscriptionResult
from app.services.asr_service import get_asr_service
from app.services.tts_service import get_tts_service

router = APIRouter(prefix="/speech", tags=["speech"])


@router.post("/transcribe", response_model=TranscriptionResult)
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form(default="zh"),
) -> TranscriptionResult:
    """
    Transcribe audio to text using ASR service.
    
    Accepts: WebM, MP3, WAV audio files up to 25MB.
    Note: Auth temporarily disabled for testing.
    """
    # Log for debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Audio upload: filename={audio.filename}, content_type={audio.content_type}, size will be checked after read")

    # Read audio data
    content = await audio.read()
    
    # Validate file size (25MB max)
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file too large (max 25MB)",
        )

    # Call ASR service
    asr_service = get_asr_service()
    result = await asr_service.transcribe(
        audio_data=content,
        language=language,
        filename=audio.filename or "audio.webm",
    )

    return TranscriptionResult(
        text=result.text,
        confidence=result.confidence,
        language=result.language,
        duration_ms=result.duration_ms,
    )


@router.post("/synthesize")
async def synthesize_speech(
    data: SynthesizeRequest,
) -> Response:
    """
    Convert text to speech using TTS service.
    
    Returns: WAV audio data.
    Note: Auth temporarily disabled for testing.
    """
    tts_service = get_tts_service()
    
    # 使用完整音频响应，避免流式响应空数据问题
    audio_data = await tts_service.synthesize(
        text=data.text,
        voice=data.voice,
        speed=data.speed,
    )

    return Response(
        content=audio_data,
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=speech.wav"},
    )
