# -*- coding: utf-8 -*-
"""
Chat API routes for message handling and AI responses.
支持流式 LLM + WebSocket 流式 TTS。
"""

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db, async_session_maker
from app.core.security import get_current_user_id
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.usage_log import UsageLog
from app.services.llm_service import get_llm_service, get_llm_service_from_db
from app.services.tts_service import get_tts_service, get_tts_service_from_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    conversation_id: str
    content: str
    input_type: str = "text"  # "text" or "voice"
    message_id: str | None = None  # 前端生成的消息 ID（可选）
    audio_duration: int | None = None  # 语音时长（毫秒）


class ChatResponse(BaseModel):
    id: str
    role: str
    content: str
    has_audio: bool
    created_at: str


@router.post("", response_model=ChatResponse)
async def send_message(
    data: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """
    Send a message and get AI response (non-streaming, for compatibility).
    """
    # Get or create conversation
    result = await db.execute(
        select(Conversation).where(Conversation.id == data.conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(
            id=data.conversation_id,
            user_id=user_id,
            title="新对话",
        )
        db.add(conversation)
        await db.flush()
    elif conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此对话",
        )

    # Save user message
    user_message = Message(
        conversation_id=data.conversation_id,
        role="user",
        content=data.content,
        has_audio=False,
        extra_data={"input_type": "text"},
    )
    db.add(user_message)
    await db.flush()

    # Get recent messages for context
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == data.conversation_id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    recent_messages = list(reversed(msg_result.scalars().all()))

    # Build messages for LLM
    llm_messages = [
        {"role": m.role, "content": m.content}
        for m in recent_messages
    ]

    # Call LLM
    llm_service = get_llm_service()
    ai_response, input_tokens, output_tokens = await llm_service.chat(llm_messages)

    # Save AI message
    ai_message = Message(
        conversation_id=data.conversation_id,
        role="assistant",
        content=ai_response,
        has_audio=True,
        extra_data={},
    )
    db.add(ai_message)

    # Update conversation
    conversation.message_count += 2
    conversation.last_message_at = datetime.now(timezone.utc)
    if not conversation.title:
        conversation.title = data.content[:50] + ("..." if len(data.content) > 50 else "")

    # Write usage log
    db.add(UsageLog(
        model_type="llm",
        model_name=llm_service.model,
        user_id=user_id,
        conversation_id=data.conversation_id,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost=0,
    ))

    await db.commit()
    await db.refresh(ai_message)

    return ChatResponse(
        id=str(ai_message.id),
        role=ai_message.role,
        content=ai_message.content,
        has_audio=ai_message.has_audio,
        created_at=ai_message.created_at.isoformat(),
    )


@router.post("/stream")
async def send_message_stream(
    data: ChatRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Send a message and get streaming AI response with TTS audio.
    
    流式响应格式（SSE）:
    - event: text, data: {"content": "..."} - 文本片段
    - event: audio, data: {"audio_base64": "..."} - 音频片段
    - event: done, data: {"message_id": "..."} - 完成
    - event: error, data: {"message": "..."} - 错误
    """
    # Get or create conversation
    result = await db.execute(
        select(Conversation).where(Conversation.id == data.conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(
            id=data.conversation_id,
            user_id=user_id,
            title="新对话",
        )
        db.add(conversation)
        await db.flush()
    elif conversation.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此对话",
        )

    # Save user message (流式接口需要显式提交，因为 StreamingResponse 返回后 session 会关闭)
    user_message = Message(
        id=data.message_id or str(uuid.uuid4()),  # 使用前端传入的 ID 或生成新的
        conversation_id=data.conversation_id,
        role="user",
        content=data.content,
        has_audio=data.input_type == "voice",
        audio_duration=data.audio_duration,
        extra_data={"input_type": data.input_type},
    )
    db.add(user_message)
    await db.commit()
    logger.info(f"Saved user message ({data.input_type}) id={user_message.id} to conversation {data.conversation_id}")

    # Get recent messages for context
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == data.conversation_id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    recent_messages = list(reversed(msg_result.scalars().all()))

    # Build messages for LLM
    llm_messages = [
        {"role": m.role, "content": m.content}
        for m in recent_messages
    ]

    # 在 generator 外面获取 LLM 和 TTS 服务（因为 db session 会在返回后关闭）
    llm_service = await get_llm_service_from_db(db)
    tts_service = await get_tts_service_from_db(db)

    async def generate_stream():
        full_response = ""
        sentence_buffer = ""
        message_id = str(uuid.uuid4())
        conversation_id = data.conversation_id
        _usage = [0, 0]  # [input_tokens, output_tokens]
        _tts_chars = [0]  # cumulative TTS character count

        def _on_usage(inp: int, out: int) -> None:
            _usage[0] = inp
            _usage[1] = out

        try:
            # 流式获取 LLM 响应
            async for chunk in llm_service.chat_stream(llm_messages, on_usage=_on_usage):
                full_response += chunk
                sentence_buffer += chunk

                # 发送文本片段
                yield f"event: text\ndata: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

                # 优化的流式 TTS：平衡响应速度和音频质量
                sentence_enders = ['。', '？', '！', '；', '.', '?', '!', ';']
                pause_enders = ['，', ',', '、']  # 逗号类，优先级较低
                should_synthesize = False
                sentence_to_synthesize = ""

                # 优先查找句子结束符
                for ender in sentence_enders:
                    if ender in sentence_buffer:
                        idx = sentence_buffer.index(ender) + 1
                        sentence_to_synthesize = sentence_buffer[:idx]
                        sentence_buffer = sentence_buffer[idx:]
                        should_synthesize = True
                        break

                # 其次查找逗号类（需要更长长度才触发）
                if not should_synthesize:
                    for ender in pause_enders:
                        if ender in sentence_buffer and len(sentence_buffer) >= 25:
                            idx = sentence_buffer.index(ender) + 1
                            sentence_to_synthesize = sentence_buffer[:idx]
                            sentence_buffer = sentence_buffer[idx:]
                            should_synthesize = True
                            break

                # 最后是长度触发（更保守的切分）
                if not should_synthesize and len(sentence_buffer) >= 30:
                    # 寻找最近的合适切分点
                    punct_idx = -1
                    for i in range(len(sentence_buffer)-1, max(0, len(sentence_buffer)-10), -1):
                        if sentence_buffer[i] in ['，', ',', ' ', '、', '：', ':']:
                            punct_idx = i+1
                            break
                    if punct_idx > 0:
                        sentence_to_synthesize = sentence_buffer[:punct_idx]
                        sentence_buffer = sentence_buffer[punct_idx:]
                        should_synthesize = True
                    elif len(sentence_buffer) >= 35:  # 强制切分，但保留更多上下文
                        sentence_to_synthesize = sentence_buffer[:18]
                        sentence_buffer = sentence_buffer[18:]
                        should_synthesize = True

                if should_synthesize and sentence_to_synthesize.strip():
                    # 合成音频
                    try:
                        logger.info(f"TTS: synthesizing chunk: {sentence_to_synthesize[:30]}...")
                        audio_data = await tts_service.synthesize(sentence_to_synthesize)
                        _tts_chars[0] += len(sentence_to_synthesize)
                        logger.info(f"TTS: got audio data, length: {len(audio_data)}")
                        import base64
                        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                        yield f"event: audio\ndata: {json.dumps({'audio_base64': audio_base64, 'text': sentence_to_synthesize}, ensure_ascii=False)}\n\n"
                    except Exception as e:
                        logger.warning(f"TTS synthesis failed for chunk: {e}", exc_info=True)

            # 处理剩余的文本
            if sentence_buffer.strip():
                try:
                    audio_data = await tts_service.synthesize(sentence_buffer)
                    _tts_chars[0] += len(sentence_buffer)
                    import base64
                    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                    yield f"event: audio\ndata: {json.dumps({'audio_base64': audio_base64, 'text': sentence_buffer}, ensure_ascii=False)}\n\n"
                except Exception as e:
                    logger.warning(f"TTS synthesis failed for remaining text: {e}")

            # 使用独立的 session 保存 AI 消息（原 session 已在 StreamingResponse 返回后关闭）
            logger.info(f"Attempting to save AI message, full_response length: {len(full_response)}")
            if not full_response.strip():
                logger.warning("LLM returned empty response, skipping save")
                return
            try:
                async with async_session_maker() as save_db:
                    ai_message = Message(
                        id=message_id,
                        conversation_id=conversation_id,
                        role="assistant",
                        content=full_response,
                        has_audio=True,
                        extra_data={},
                    )
                    save_db.add(ai_message)

                    # 更新会话
                    result = await save_db.execute(
                        select(Conversation).where(Conversation.id == conversation_id)
                    )
                    conv = result.scalar_one_or_none()
                    if conv:
                        conv.message_count = (conv.message_count or 0) + 2
                        conv.last_message_at = datetime.now(timezone.utc)
                        
                        # 如果是新对话，让 LLM 生成标题
                        if not conv.title or conv.title == "新对话":
                            try:
                                title_prompt = f"根据以下对话生成一个简短的标题（不超过20字，不要引号）：\n用户：{data.content}\nAI：{full_response[:200]}"
                                title_response, _, _ = await llm_service.chat([{"role": "user", "content": title_prompt}], max_tokens=30)
                                conv.title = title_response.strip()[:30]
                            except Exception as e:
                                logger.warning(f"Failed to generate title: {e}")
                                conv.title = data.content[:30] + ("..." if len(data.content) > 30 else "")

                    save_db.add(UsageLog(
                        model_type="llm",
                        model_name=llm_service.model,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        input_tokens=_usage[0],
                        output_tokens=_usage[1],
                        cost=0,
                    ))
                    if _tts_chars[0] > 0:
                        save_db.add(UsageLog(
                            model_type="tts",
                            model_name=tts_service.model,
                            user_id=user_id,
                            conversation_id=conversation_id,
                            input_tokens=_tts_chars[0],
                            output_tokens=0,
                            cost=0,
                        ))

                    await save_db.commit()
                    logger.info(f"Saved AI message {message_id} to conversation {conversation_id}")
            except Exception as save_error:
                logger.error(f"Failed to save AI message: {save_error}", exc_info=True)

            # 发送完成事件
            yield f"event: done\ndata: {json.dumps({'message_id': message_id}, ensure_ascii=False)}\n\n"

        except Exception as e:
            logger.error(f"Stream generation failed: {e}")
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
