"""
Usage statistics service.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usage_log import UsageLog


class UsageService:
    """Aggregate usage stats for admin dashboard."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_range_start(self, date_range: str) -> datetime:
        now = datetime.now(timezone.utc)
        if date_range == "today":
            return now.replace(hour=0, minute=0, second=0, microsecond=0)
        if date_range == "month":
            return now - timedelta(days=30)
        return now - timedelta(days=7)

    async def get_summary(
        self,
        date_range: str = "week",
        model_type: Optional[str] = None,
        terminal_type: Optional[str] = None,
    ) -> dict:
        start_time = self._get_range_start(date_range)
        query = select(
            func.count(UsageLog.id),
            func.sum(UsageLog.input_tokens),
            func.sum(UsageLog.output_tokens),
            func.sum(UsageLog.cost),
        ).where(UsageLog.created_at >= start_time)

        if model_type:
            query = query.where(UsageLog.model_type == model_type)
        if terminal_type:
            query = query.where(UsageLog.terminal_type == terminal_type)

        result = await self.db.execute(query)
        total_calls, total_input, total_output, total_cost = result.one()

        by_model_query = select(
            UsageLog.model_type,
            func.count(UsageLog.id),
            func.sum(UsageLog.cost),
        ).where(UsageLog.created_at >= start_time)

        if model_type:
            by_model_query = by_model_query.where(UsageLog.model_type == model_type)
        if terminal_type:
            by_model_query = by_model_query.where(UsageLog.terminal_type == terminal_type)

        by_model_query = by_model_query.group_by(UsageLog.model_type)
        by_model_result = await self.db.execute(by_model_query)

        by_model_type = {
            row[0]: {"calls": int(row[1] or 0), "cost": float(row[2] or 0)}
            for row in by_model_result.all()
        }

        return {
            "total_calls": int(total_calls or 0),
            "total_input_tokens": int(total_input or 0),
            "total_output_tokens": int(total_output or 0),
            "total_cost": float(total_cost or 0),
            "by_model_type": by_model_type,
        }

    async def get_trends(
        self,
        date_range: str = "week",
        granularity: str = "day",
        model_type: Optional[str] = None,
    ) -> list[dict]:
        start_time = self._get_range_start(date_range)

        if granularity == "hour":
            bucket = func.date_format(UsageLog.created_at, "%Y-%m-%d %H:00:00")
        elif granularity == "week":
            bucket = func.date_format(UsageLog.created_at, "%x-%v")
        else:
            bucket = func.date(UsageLog.created_at)

        query = select(
            bucket.label("bucket"),
            func.count(UsageLog.id),
            func.sum(UsageLog.input_tokens),
            func.sum(UsageLog.output_tokens),
            func.sum(UsageLog.cost),
        ).where(UsageLog.created_at >= start_time)

        if model_type:
            query = query.where(UsageLog.model_type == model_type)

        query = query.group_by(bucket).order_by(bucket)
        result = await self.db.execute(query)

        return [
            {
                "timestamp": str(row.bucket),
                "calls": int(row[1] or 0),
                "input_tokens": int(row[2] or 0),
                "output_tokens": int(row[3] or 0),
                "cost": float(row[4] or 0),
            }
            for row in result.all()
        ]

    async def get_usage_by_model(self, date_range: str = "week") -> list[dict]:
        start_time = self._get_range_start(date_range)
        query = select(
            UsageLog.model_type,
            UsageLog.model_name,
            func.count(UsageLog.id),
            func.sum(UsageLog.input_tokens),
            func.sum(UsageLog.output_tokens),
            func.sum(UsageLog.cost),
        ).where(UsageLog.created_at >= start_time)

        query = query.group_by(UsageLog.model_type, UsageLog.model_name)
        result = await self.db.execute(query)

        rows = result.all()
        total_cost = sum(float(row[5] or 0) for row in rows) or 0

        return [
            {
                "model_type": row[0],
                "model_name": row[1],
                "calls": int(row[2] or 0),
                "input_tokens": int(row[3] or 0),
                "output_tokens": int(row[4] or 0),
                "cost": float(row[5] or 0),
                "percentage": (float(row[5] or 0) / total_cost * 100) if total_cost else 0,
            }
            for row in rows
        ]
