"""
Speech API routes (ASR and TTS) and Vision API.
"""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

from app.schemas.message import SynthesizeRequest, TranscriptionResult
from app.services.asr_service import get_asr_service
from app.services.tts_service import get_tts_service
from app.services.vision_service import get_vision_service

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


# ============ Vision API ============

class VisionRequest(BaseModel):
    """Request for vision understanding with base64 image."""
    image_base64: str
    prompt: str = "请描述这张图片的内容"
    mime_type: str = "image/jpeg"


class VisionResponse(BaseModel):
    """Response from vision understanding."""
    text: str
    model: str
    latency_ms: Optional[int] = None


@router.post("/vision/understand", response_model=VisionResponse)
async def understand_image(
    image: UploadFile = File(...),
    prompt: str = Form(default="请描述这张图片的内容"),
) -> VisionResponse:
    """
    Understand an image using vision AI model.
    
    Accepts: JPEG, PNG, GIF, WebP images up to 10MB.
    Returns: AI's description/understanding of the image.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Vision request: filename={image.filename}, content_type={image.content_type}")

    # Read image data
    content = await image.read()

    # Validate file size (10MB max)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file too large (max 10MB)",
        )

    # Validate content type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type. Allowed: {', '.join(allowed_types)}",
        )

    # Call vision service
    vision_service = get_vision_service()
    result = await vision_service.understand_image(
        image_data=content,
        prompt=prompt,
        filename=image.filename or "image.jpg",
    )

    return VisionResponse(
        text=result.text,
        model=result.model,
        latency_ms=result.latency_ms,
    )


@router.post("/vision/understand-base64", response_model=VisionResponse)
async def understand_image_base64(
    data: VisionRequest,
) -> VisionResponse:
    """
    Understand an image from base64 string.
    
    Accepts: Base64 encoded image data.
    Returns: AI's description/understanding of the image.
    """
    # Call vision service
    vision_service = get_vision_service()
    result = await vision_service.understand_image_base64(
        image_base64=data.image_base64,
        prompt=data.prompt,
        mime_type=data.mime_type,
    )

    return VisionResponse(
        text=result.text,
        model=result.model,
        latency_ms=result.latency_ms,
    )
