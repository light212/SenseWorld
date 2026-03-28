"""
Alert service for admin notifications.
"""

from typing import Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert


class AlertService:
    """Manage admin alerts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_alerts(
        self,
        is_read: Optional[bool] = None,
        alert_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        query = select(Alert)
        count_query = select(func.count(Alert.id))

        if is_read is not None:
            query = query.where(Alert.is_read == is_read)
            count_query = count_query.where(Alert.is_read == is_read)
        if alert_type:
            query = query.where(Alert.type == alert_type)
            count_query = count_query.where(Alert.type == alert_type)

        total_result = await self.db.execute(count_query)
        total = int(total_result.scalar() or 0)

        query = query.order_by(Alert.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        alerts = list(result.scalars().all())

        return {
            "items": alerts,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_unread_count(self) -> int:
        result = await self.db.execute(
            select(func.count(Alert.id)).where(Alert.is_read == False)  # noqa: E712
        )
        return int(result.scalar() or 0)

    async def mark_read(self, alert_id: str) -> None:
        await self.db.execute(
            update(Alert).where(Alert.id == alert_id).values(is_read=True)
        )
        await self.db.commit()

    async def mark_all_read(self) -> None:
        await self.db.execute(update(Alert).values(is_read=True))
        await self.db.commit()

    async def create_alert(
        self,
        alert_type: str,
        title: str,
        message: str,
        level: str = "warning",
        metadata: Optional[dict] = None,
    ) -> Alert:
        alert = Alert(
            type=alert_type,
            title=title,
            message=message,
            level=level,
            metadata_payload=metadata or {},
            is_read=False,
        )
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert
