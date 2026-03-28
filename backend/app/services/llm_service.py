"""
LLM (Large Language Model) service using OpenAI API.
"""

import logging
from typing import AsyncGenerator, Callable, Optional

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """Service for LLM interactions using OpenAI."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or settings.openai_api_key
        self.base_url = base_url or settings.openai_base_url
        self.model = model or settings.llm_model
        
        self.client = AsyncOpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
        )
        
        self.system_prompt = """你是 SenseWorld 的 AI 助手，一个友好、智能的对话伙伴。

你的特点：
- 用自然、亲切的语气交流
- 回答简洁明了，避免过长的回复
- 支持中文对话，也能处理英文
- 当用户使用语音时，回复适合朗读的内容

请注意：
- 保持对话的连贯性，记住上下文
- 如果不确定用户的意图，适当询问澄清
- 避免生成不适合语音播放的内容（如复杂的代码块或长表格）"""

    async def chat(
        self,
        messages: list[dict],
        max_tokens: int = 1000,
    ) -> tuple[str, int, int]:
        """
        Generate a chat completion.

        Args:
            messages: List of message dicts with 'role' and 'content'
            max_tokens: Maximum tokens in response

        Returns:
            Tuple of (response text, input_tokens, output_tokens)
        """
        try:
            # Prepend system message
            all_messages = [
                {"role": "system", "content": self.system_prompt},
                *messages,
            ]

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=all_messages,
                max_tokens=max_tokens,
            )

            input_tokens = response.usage.prompt_tokens if response.usage else 0
            output_tokens = response.usage.completion_tokens if response.usage else 0
            return response.choices[0].message.content or "", input_tokens, output_tokens

        except Exception as e:
            logger.error(f"LLM chat failed: {e}")
            raise

    async def chat_stream(
        self,
        messages: list[dict],
        max_tokens: int = 1000,
        on_usage: Optional[Callable[[int, int], None]] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a chat completion.

        Args:
            messages: List of message dicts with 'role' and 'content'
            max_tokens: Maximum tokens in response

        Yields:
            Text chunks as they are generated
        """
        try:
            # Prepend system message
            all_messages = [
                {"role": "system", "content": self.system_prompt},
                *messages,
            ]

            logger.info(f"LLM stream request: model={self.model}, base_url={self.base_url}, messages={len(all_messages)}")

            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=all_messages,
                max_tokens=max_tokens,
                stream=True,
                stream_options={"include_usage": True},
            )

            logger.info("LLM stream started")

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    logger.debug(f"LLM chunk: {content[:50]}...")
                    yield content
                if chunk.usage and on_usage:
                    on_usage(chunk.usage.prompt_tokens, chunk.usage.completion_tokens)

            logger.info("LLM stream completed")

        except Exception as e:
            logger.error(f"LLM streaming failed: {e}", exc_info=True)
            raise


async def get_llm_service_from_db(db: AsyncSession) -> LLMService:
    """从数据库获取默认 LLM 配置并创建服务实例"""
    from app.services.config_service import ConfigService
    
    config_service = ConfigService(db)
    config = await config_service.get_default_model_config("llm")
    
    if config and config.get("api_key"):
        logger.info(f"Using LLM config from database: {config.get('provider')}/{config.get('model_name')}")
        return LLMService(
            api_key=config.get("api_key"),
            base_url=config.get("base_url"),
            model=config.get("model_name"),
        )
    else:
        logger.info("No LLM config in database, using environment variables")
        return LLMService()


# Singleton instance (for backward compatibility, uses env vars)
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get LLM service singleton (uses environment variables)."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
