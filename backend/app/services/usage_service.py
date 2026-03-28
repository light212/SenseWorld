"""
Usage statistics service - 计量统计（不含计费）

提供：
- Token 用量统计
- 延迟统计
- 流量统计
- 错误率统计
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usage_log import UsageLog


class UsageService:
    """大模型调用计量统计服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_range_start(self, date_range: str) -> datetime:
        """获取时间范围起始点"""
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
        """
        获取用量摘要
        
        返回：
        - 总调用次数
        - 总 Token 用量（input/output/total）
        - 平均延迟
        - 成功率
        """
        start_time = self._get_range_start(date_range)
        
        # 基础统计
        query = select(
            func.count(UsageLog.id),
            func.sum(UsageLog.input_tokens),
            func.sum(UsageLog.output_tokens),
            func.sum(UsageLog.total_tokens),
            func.avg(UsageLog.latency_ms),
            func.sum(func.case((UsageLog.success == True, 1), else_=0)),
        ).where(UsageLog.created_at >= start_time)

        if model_type:
            query = query.where(UsageLog.model_type == model_type)
        if terminal_type:
            query = query.where(UsageLog.terminal_type == terminal_type)

        result = await self.db.execute(query)
        row = result.one()
        
        total_calls = int(row[0] or 0)
        success_calls = int(row[5] or 0)
        
        # 按模型类型分组
        by_model_query = select(
            UsageLog.model_type,
            func.count(UsageLog.id),
            func.sum(UsageLog.total_tokens),
            func.avg(UsageLog.latency_ms),
        ).where(UsageLog.created_at >= start_time)

        if model_type:
            by_model_query = by_model_query.where(UsageLog.model_type == model_type)
        if terminal_type:
            by_model_query = by_model_query.where(UsageLog.terminal_type == terminal_type)

        by_model_query = by_model_query.group_by(UsageLog.model_type)
        by_model_result = await self.db.execute(by_model_query)

        by_model_type = {
            row[0]: {
                "calls": int(row[1] or 0),
                "total_tokens": int(row[2] or 0),
                "avg_latency_ms": round(float(row[3] or 0), 2),
            }
            for row in by_model_result.all()
        }

        return {
            "total_calls": total_calls,
            "total_input_tokens": int(row[1] or 0),
            "total_output_tokens": int(row[2] or 0),
            "total_tokens": int(row[3] or 0),
            "avg_latency_ms": round(float(row[4] or 0), 2),
            "success_rate": round(success_calls / total_calls * 100, 2) if total_calls else 100.0,
            "by_model_type": by_model_type,
        }

    async def get_trends(
        self,
        date_range: str = "week",
        granularity: str = "day",
        model_type: Optional[str] = None,
    ) -> list[dict]:
        """
        获取用量趋势（按时间分桶）
        
        支持粒度：hour, day, week
        """
        start_time = self._get_range_start(date_range)

        # 时间分桶
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
            func.sum(UsageLog.total_tokens),
            func.avg(UsageLog.latency_ms),
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
                "total_tokens": int(row[4] or 0),
                "avg_latency_ms": round(float(row[5] or 0), 2),
            }
            for row in result.all()
        ]

    async def get_usage_by_model(self, date_range: str = "week") -> list[dict]:
        """
        获取按模型分组的用量统计
        """
        start_time = self._get_range_start(date_range)
        
        query = select(
            UsageLog.model_type,
            UsageLog.model_name,
            UsageLog.provider,
            func.count(UsageLog.id),
            func.sum(UsageLog.input_tokens),
            func.sum(UsageLog.output_tokens),
            func.sum(UsageLog.total_tokens),
            func.avg(UsageLog.latency_ms),
        ).where(UsageLog.created_at >= start_time)

        query = query.group_by(UsageLog.model_type, UsageLog.model_name, UsageLog.provider)
        result = await self.db.execute(query)

        rows = result.all()
        total_calls = sum(int(row[3] or 0) for row in rows) or 1

        return [
            {
                "model_type": row[0],
                "model_name": row[1],
                "provider": row[2],
                "calls": int(row[3] or 0),
                "input_tokens": int(row[4] or 0),
                "output_tokens": int(row[5] or 0),
                "total_tokens": int(row[6] or 0),
                "avg_latency_ms": round(float(row[7] or 0), 2),
                "percentage": round(int(row[3] or 0) / total_calls * 100, 2),
            }
            for row in rows
        ]

    async def get_latency_stats(
        self,
        date_range: str = "week",
        model_type: Optional[str] = None,
    ) -> dict:
        """
        获取延迟统计（P50/P95/P99）
        
        MySQL 不支持 percentile，用子查询模拟
        """
        start_time = self._get_range_start(date_range)
        
        # 获取所有延迟数据（限制 10000 条）
        query = select(UsageLog.latency_ms).where(
            UsageLog.created_at >= start_time,
            UsageLog.latency_ms > 0,
        )
        
        if model_type:
            query = query.where(UsageLog.model_type == model_type)
        
        query = query.order_by(UsageLog.latency_ms).limit(10000)
        result = await self.db.execute(query)
        latencies = [row[0] for row in result.all()]

        if not latencies:
            return {
                "p50": 0, "p95": 0, "p99": 0,
                "avg": 0.0, "min": 0, "max": 0,
            }

        n = len(latencies)
        
        def percentile(data: list, p: float) -> int:
            idx = int(p * (len(data) - 1))
            return int(data[idx])

        return {
            "p50": percentile(latencies, 0.5),
            "p95": percentile(latencies, 0.95),
            "p99": percentile(latencies, 0.99),
            "avg": round(sum(latencies) / n, 2),
            "min": int(latencies[0]),
            "max": int(latencies[-1]),
        }

    async def get_error_stats(
        self,
        date_range: str = "week",
        model_type: Optional[str] = None,
    ) -> dict:
        """
        获取错误统计
        """
        start_time = self._get_range_start(date_range)
        
        # 总调用数
        total_query = select(func.count(UsageLog.id)).where(
            UsageLog.created_at >= start_time
        )
        if model_type:
            total_query = total_query.where(UsageLog.model_type == model_type)
        
        total_result = await self.db.execute(total_query)
        total_calls = int(total_result.scalar() or 0)
        
        # 错误调用数
        error_query = select(
            UsageLog.error_code,
            func.count(UsageLog.id),
        ).where(
            UsageLog.created_at >= start_time,
            UsageLog.success == False,
        )
        
        if model_type:
            error_query = error_query.where(UsageLog.model_type == model_type)
        
        error_query = error_query.group_by(UsageLog.error_code)
        error_result = await self.db.execute(error_query)
        
        errors_by_code = {
            row[0]: int(row[1] or 0)
            for row in error_result.all()
        }
        
        total_errors = sum(errors_by_code.values())
        
        return {
            "total_calls": total_calls,
            "total_errors": total_errors,
            "error_rate": round(total_errors / total_calls * 100, 2) if total_calls else 0.0,
            "errors_by_code": errors_by_code,
        }

    async def get_traffic_stats(
        self,
        date_range: str = "week",
    ) -> dict:
        """
        获取流量统计（字节）
        """
        start_time = self._get_range_start(date_range)
        
        query = select(
            func.sum(UsageLog.request_size_bytes),
            func.sum(UsageLog.response_size_bytes),
        ).where(UsageLog.created_at >= start_time)
        
        result = await self.db.execute(query)
        row = result.one()
        
        request_bytes = int(row[0] or 0)
        response_bytes = int(row[1] or 0)
        
        return {
            "total_request_bytes": request_bytes,
            "total_response_bytes": response_bytes,
            "total_bytes": request_bytes + response_bytes,
            "avg_request_bytes": round(request_bytes / max(1, query.column_descriptions[0]["name"]), 2),
        }
