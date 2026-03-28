"""
Scheduled cleanup jobs - MVP 简化版

只清理 usage_logs，request_logs 已不再使用但保留表结构。
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.core.database import async_session_maker
from app.core.logging import get_logger

logger = get_logger(__name__)


async def cleanup_old_logs(retention_days: int = 90) -> None:
    """Delete usage_logs older than retention_days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    async with async_session_maker() as session:
        await session.execute(
            text("DELETE FROM usage_logs WHERE created_at < :cutoff"),
            {"cutoff": cutoff},
        )
        # request_logs 已不再写入，但保留表结构以备将来使用
        await session.commit()

    logger.info(f"Cleaned up usage_logs before {cutoff.isoformat()}")
