"""
Scheduled cleanup jobs.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.core.database import async_session_maker
from app.core.logging import get_logger

logger = get_logger(__name__)


async def cleanup_old_logs(retention_days: int = 90) -> None:
    """Delete logs older than retention_days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

    async with async_session_maker() as session:
        await session.execute(
            text("DELETE FROM usage_logs WHERE created_at < :cutoff"),
            {"cutoff": cutoff},
        )
        await session.execute(
            text("DELETE FROM request_logs WHERE created_at < :cutoff"),
            {"cutoff": cutoff},
        )
        await session.commit()

    logger.info("Cleaned up logs before %s", cutoff.isoformat())
