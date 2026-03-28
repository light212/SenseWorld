"""
Vision (Video/Image Understanding) service using Aliyun DashScope Omni models.

Supports WebSocket-based real-time multimodal understanding.
"""

import asyncio
import base64
import json
import logging
import os
import tempfile
from dataclasses import dataclass
from typing import Optional

import dashscope
from dashscope import MultiModalConversation

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class VisionResult:
    """Result from vision understanding."""
    
    text: str
    model: str
    usage: Optional[dict] = None
    latency_ms: Optional[int] = None


class VisionService:
    """Service for video/image understanding using Aliyun DashScope Omni models."""

    def __init__(self, api_key: str = None, model: str = "qwen-omni-turbo"):
        self.api_key = api_key or settings.tts_api_key  # 复用 DashScope API key
        self.model = model
        dashscope.api_key = self.api_key

    async def understand_image(
        self,
        image_data: bytes,
        prompt: str = "请描述这张图片的内容",
        filename: str = "image.jpg",
    ) -> VisionResult:
        """
        Understand an image and respond to a prompt.

        Args:
            image_data: Raw image bytes (JPEG, PNG, etc.)
            prompt: User's question about the image
            filename: Filename with extension for format detection

        Returns:
            VisionResult with AI's understanding
        """
        import time
        start_time = time.time()

        try:
            # 保存到临时文件
            suffix = os.path.splitext(filename)[1] or ".jpg"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
                f.write(image_data)
                temp_path = f.name

            try:
                # 构建多模态消息
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"image": f"file://{temp_path}"},
                            {"text": prompt}
                        ]
                    }
                ]

                # 在线程池中运行同步调用
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: MultiModalConversation.call(
                        model=self.model,
                        messages=messages,
                        result_format="message",
                    )
                )

                logger.info(f"Vision response status: {response.status_code}")

                if response.status_code == 200:
                    # 提取回复文本
                    output = response.output
                    text = ""
                    
                    if hasattr(output, 'choices') and output.choices:
                        choice = output.choices[0]
                        if hasattr(choice, 'message') and choice.message:
                            content = choice.message.content
                            if isinstance(content, list):
                                for item in content:
                                    if isinstance(item, dict) and 'text' in item:
                                        text = item['text']
                                        break
                            elif isinstance(content, str):
                                text = content

                    latency_ms = int((time.time() - start_time) * 1000)
                    
                    return VisionResult(
                        text=text or "无法理解图片内容",
                        model=self.model,
                        usage=response.usage if hasattr(response, 'usage') else None,
                        latency_ms=latency_ms,
                    )
                else:
                    error_msg = getattr(response, 'message', str(response))
                    logger.error(f"Vision failed: {response.status_code} - {error_msg}")
                    raise Exception(f"Vision failed: {error_msg}")

            finally:
                # 清理临时文件
                os.unlink(temp_path)

        except Exception as e:
            logger.error(f"Vision understanding failed: {e}")
            raise

    async def understand_image_base64(
        self,
        image_base64: str,
        prompt: str = "请描述这张图片的内容",
        mime_type: str = "image/jpeg",
    ) -> VisionResult:
        """
        Understand an image from base64 string.

        Args:
            image_base64: Base64 encoded image data
            prompt: User's question about the image
            mime_type: MIME type of the image

        Returns:
            VisionResult with AI's understanding
        """
        # 解码 base64
        image_data = base64.b64decode(image_base64)
        
        # 根据 MIME 类型确定扩展名
        ext_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/webp": ".webp",
        }
        ext = ext_map.get(mime_type, ".jpg")
        
        return await self.understand_image(image_data, prompt, f"image{ext}")

    async def understand_video_frame(
        self,
        frame_data: bytes,
        prompt: str = "请描述这个视频画面的内容",
    ) -> VisionResult:
        """
        Understand a single video frame.

        For full video understanding, extract key frames and analyze each.

        Args:
            frame_data: Raw frame bytes (usually JPEG)
            prompt: User's question about the frame

        Returns:
            VisionResult with AI's understanding
        """
        return await self.understand_image(frame_data, prompt, "frame.jpg")


# Singleton instance
_vision_service: Optional[VisionService] = None


def get_vision_service(api_key: str = None, model: str = None) -> VisionService:
    """Get Vision service instance."""
    global _vision_service
    
    # 如果指定了参数，创建新实例
    if api_key or model:
        return VisionService(api_key=api_key, model=model or "qwen-omni-turbo")
    
    # 否则使用单例
    if _vision_service is None:
        _vision_service = VisionService()
    return _vision_service
