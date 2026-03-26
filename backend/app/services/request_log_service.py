"""
Request log service.
"""

import re

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.request_log import RequestLog


MAX_BODY_LENGTH = 2000
SENSITIVE_PATTERN = re.compile(
    r'("?(api_key|password|token)"?\s*[:=]\s*")([^"\n]+)(")',
    re.IGNORECASE,
)


class RequestLogService:
    """Persist and query request logs."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_request(
        self,
        trace_id: str,
        request_type: str,
        status_code: int,
        latency_ms: int,
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None,
        request_body: Optional[str] = None,
        response_body: Optional[str] = None,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        asr_latency_ms: Optional[int] = None,
        llm_latency_ms: Optional[int] = None,
        tts_latency_ms: Optional[int] = None,
        extra_data: Optional[dict] = None,
    ) -> RequestLog:
        sanitized_request = self._sanitize_text(request_body)
        sanitized_response = self._sanitize_text(response_body)

        log = RequestLog(
            trace_id=trace_id,
            request_type=request_type,
            status_code=status_code,
            latency_ms=latency_ms,
            conversation_id=conversation_id,
            user_id=user_id,
            request_body=sanitized_request,
            response_body=sanitized_response,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            asr_latency_ms=asr_latency_ms,
            llm_latency_ms=llm_latency_ms,
            tts_latency_ms=tts_latency_ms,
            extra_data=extra_data or {},
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    def _sanitize_text(self, value: Optional[str]) -> Optional[str]:
        if not value:
            return value

        masked = SENSITIVE_PATTERN.sub(r"\1****\4", value)
        if len(masked) <= MAX_BODY_LENGTH:
            return masked
        return masked[:MAX_BODY_LENGTH] + "...<truncated>"

    async def list_logs(
        self,
        date_range_start,
        conversation_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict:
        query = select(RequestLog).where(RequestLog.created_at >= date_range_start)
        count_query = select(func.count(RequestLog.id)).where(RequestLog.created_at >= date_range_start)

        if conversation_id:
            query = query.where(RequestLog.conversation_id == conversation_id)
            count_query = count_query.where(RequestLog.conversation_id == conversation_id)
        if trace_id:
            query = query.where(RequestLog.trace_id == trace_id)
            count_query = count_query.where(RequestLog.trace_id == trace_id)
        if user_id:
            query = query.where(RequestLog.user_id == user_id)
            count_query = count_query.where(RequestLog.user_id == user_id)
        if status:
            if status == "error":
                query = query.where(RequestLog.status_code >= 400)
                count_query = count_query.where(RequestLog.status_code >= 400)
            if status == "success":
                query = query.where(RequestLog.status_code < 400)
                count_query = count_query.where(RequestLog.status_code < 400)

        total_result = await self.db.execute(count_query)
        total = int(total_result.scalar() or 0)

        query = query.order_by(RequestLog.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        pages = (total + page_size - 1) // page_size if page_size else 1
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
        }

    async def get_log(self, log_id: str) -> Optional[RequestLog]:
        result = await self.db.execute(
            select(RequestLog).where(RequestLog.id == log_id)
        )
        return result.scalar_one_or_none()

    async def get_latency_stats(self, date_range_start, request_type: Optional[str] = None) -> dict:
        """Calculate latency percentiles. MySQL doesn't support percentile_cont, so we fetch data and compute in Python."""
        query = select(RequestLog.latency_ms).where(RequestLog.created_at >= date_range_start)

        if request_type:
            query = query.where(RequestLog.request_type == request_type)

        query = query.order_by(RequestLog.latency_ms)
        result = await self.db.execute(query)
        latencies = [row[0] for row in result.all()]

        if not latencies:
            return {
                "p50": 0,
                "p95": 0,
                "p99": 0,
                "avg": 0.0,
                "min": 0,
                "max": 0,
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
