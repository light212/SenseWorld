"""
System setting service.
"""

import json
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_setting import SystemSetting


class SystemSettingService:
    """CRUD for system settings."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_settings(self) -> list[SystemSetting]:
        result = await self.db.execute(select(SystemSetting).order_by(SystemSetting.key))
        return list(result.scalars().all())

    async def get_setting(self, key: str) -> Optional[SystemSetting]:
        result = await self.db.execute(
            select(SystemSetting).where(SystemSetting.key == key)
        )
        return result.scalar_one_or_none()

    async def upsert_setting(
        self,
        key: str,
        value: str,
        value_type: Optional[str] = None,
        description: Optional[str] = None,
        updated_by: Optional[str] = None,
    ) -> SystemSetting:
        setting = await self.get_setting(key)
        if setting:
            setting.value = value
            if value_type:
                setting.value_type = value_type
            if description is not None:
                setting.description = description
            setting.updated_by = updated_by
        else:
            setting = SystemSetting(
                key=key,
                value=value,
                value_type=value_type or "string",
                description=description,
                updated_by=updated_by,
            )
            self.db.add(setting)

        self._validate_value(setting.value_type, setting.value)

        await self.db.commit()
        await self.db.refresh(setting)
        return setting

    def _validate_value(self, value_type: str, value: str) -> None:
        if value_type == "number":
            float(value)
        elif value_type == "boolean":
            if value.lower() not in {"true", "false", "1", "0"}:
                raise ValueError("Invalid boolean value")
        elif value_type == "json":
            json.loads(value)
