"""
Service for managing model configurations with cache.
"""

import json
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_redis
from app.core.encryption import decrypt_text, encrypt_text, mask_secret
from app.models.model_config import ModelConfig
from app.models.system_setting import SystemSetting


class ConfigService:
    """Manage model configs and cache."""

    CACHE_TTL = 5
    CACHE_PREFIX = "model_config:{model_type}:{terminal_type}"

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_configs(self, model_type: Optional[str] = None) -> list[ModelConfig]:
        query = select(ModelConfig)
        if model_type:
            query = query.where(ModelConfig.model_type == model_type)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_config(self, config_id: str) -> Optional[ModelConfig]:
        result = await self.db.execute(
            select(ModelConfig).where(ModelConfig.id == config_id)
        )
        return result.scalar_one_or_none()

    async def create_config(self, data: dict) -> ModelConfig:
        payload = {**data}
        api_key = payload.pop("api_key", None)
        if api_key:
            try:
                payload["api_key_encrypted"] = encrypt_text(api_key)
            except ValueError as e:
                raise ValueError(f"Cannot encrypt API key: {e}") from e

        config = ModelConfig(**payload)
        self.db.add(config)
        await self.db.flush()

        if config.is_default:
            await self._unset_other_defaults(config)

        await self.db.commit()
        await self.db.refresh(config)
        await self._invalidate_cache(config.model_type, config.terminal_type)
        return config

    async def update_config(self, config: ModelConfig, data: dict) -> ModelConfig:
        api_key = data.pop("api_key", None)
        if api_key:
            try:
                config.api_key_encrypted = encrypt_text(api_key)
            except ValueError as e:
                raise ValueError(f"Cannot encrypt API key: {e}") from e

        for key, value in data.items():
            setattr(config, key, value)

        if config.is_default:
            await self._unset_other_defaults(config)

        await self.db.commit()
        await self.db.refresh(config)
        await self._invalidate_cache(config.model_type, config.terminal_type)
        return config

    async def delete_config(self, config: ModelConfig) -> None:
        await self.db.delete(config)
        await self.db.commit()
        await self._invalidate_cache(config.model_type, config.terminal_type)

    async def set_default(self, config: ModelConfig) -> ModelConfig:
        config.is_default = True
        await self._unset_other_defaults(config)
        await self.db.commit()
        await self.db.refresh(config)
        await self._invalidate_cache(config.model_type, config.terminal_type)
        return config

    async def to_response(self, config: ModelConfig) -> dict:
        api_key_masked = None
        if config.api_key_encrypted:
            try:
                decrypted = decrypt_text(config.api_key_encrypted)
                api_key_masked = mask_secret(decrypted)
            except Exception:
                api_key_masked = "****"

        return {
            "id": str(config.id),
            "model_type": config.model_type,
            "model_name": config.model_name,
            "provider": config.provider,
            "api_key_masked": api_key_masked,
            "config": config.config or {},
            "price_per_1k_input_tokens": float(config.price_per_1k_input_tokens),
            "price_per_1k_output_tokens": float(config.price_per_1k_output_tokens),
            "is_default": config.is_default,
            "terminal_type": config.terminal_type,
            "is_active": config.is_active,
            "created_at": config.created_at.isoformat(),
            "updated_at": config.updated_at.isoformat(),
        }

    async def _unset_other_defaults(self, config: ModelConfig) -> None:
        await self.db.execute(
            update(ModelConfig)
            .where(
                ModelConfig.model_type == config.model_type,
                ModelConfig.terminal_type == config.terminal_type,
                ModelConfig.id != config.id,
            )
            .values(is_default=False)
        )

    async def _invalidate_cache(self, model_type: str, terminal_type: str) -> None:
        redis = await get_redis()
        keys = [
            self.CACHE_PREFIX.format(model_type=model_type, terminal_type=terminal_type),
        ]
        if terminal_type != "all":
            keys.append(self.CACHE_PREFIX.format(model_type=model_type, terminal_type="all"))
        if keys:
            await redis.delete(*keys)

    async def get_cached_default(self, model_type: str, terminal_type: str = "all") -> Optional[dict]:
        redis = await get_redis()
        cache_key = self.CACHE_PREFIX.format(model_type=model_type, terminal_type=terminal_type)
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)

        result = await self.db.execute(
            select(ModelConfig)
            .where(
                ModelConfig.model_type == model_type,
                ModelConfig.terminal_type == terminal_type,
                ModelConfig.is_default == True,  # noqa: E712
                ModelConfig.is_active == True,  # noqa: E712
            )
            .limit(1)
        )
        config = result.scalar_one_or_none()
        if not config:
            override_name = await self.get_default_model_name(model_type)
            if override_name:
                result = await self.db.execute(
                    select(ModelConfig)
                    .where(
                        ModelConfig.model_type == model_type,
                        ModelConfig.model_name == override_name,
                        ModelConfig.terminal_type == terminal_type,
                        ModelConfig.is_active == True,  # noqa: E712
                    )
                    .limit(1)
                )
                config = result.scalar_one_or_none()
        if not config:
            return None

        data = {
            "model_type": config.model_type,
            "model_name": config.model_name,
            "provider": config.provider,
            "config": config.config or {},
            "api_key_encrypted": config.api_key_encrypted,
            "price_per_1k_input_tokens": float(config.price_per_1k_input_tokens),
            "price_per_1k_output_tokens": float(config.price_per_1k_output_tokens),
            "terminal_type": config.terminal_type,
        }
        await redis.set(cache_key, json.dumps(data), ex=self.CACHE_TTL)
        return data

    async def get_default_model_name(self, model_type: str) -> Optional[str]:
        key_map = {
            "llm": "default_llm_model",
            "asr": "default_asr_model",
            "tts": "default_tts_model",
        }
        key = key_map.get(model_type)
        if not key:
            return None

        default_value = getattr(settings, key, None)
        result = await self.db.execute(
            select(SystemSetting).where(SystemSetting.key == key)
        )
        setting = result.scalar_one_or_none()
        return setting.value if setting else default_value
