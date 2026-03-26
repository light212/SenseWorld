"""
Redis cache utilities for configuration hot-reload.
"""

import logging
from typing import Optional

import redis.asyncio as redis

from app.config import settings

logger = logging.getLogger(__name__)

_redis: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    """Get Redis connection."""
    global _redis
    
    if _redis is None:
        _redis = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    
    return _redis


async def close_redis():
    """Close Redis connection."""
    global _redis
    
    if _redis:
        await _redis.close()
        _redis = None