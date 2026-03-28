"""
Terminal configuration service.
"""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.terminal import Terminal


class TerminalService:
    """CRUD for terminal configs."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_terminals(self) -> list[Terminal]:
        result = await self.db.execute(select(Terminal).order_by(Terminal.type))
        return list(result.scalars().all())

    async def get_terminal(self, terminal_id: str) -> Optional[Terminal]:
        result = await self.db.execute(
            select(Terminal).where(Terminal.id == terminal_id)
        )
        return result.scalar_one_or_none()

    async def create_terminal(self, data: dict) -> Terminal:
        terminal = Terminal(**data)
        self.db.add(terminal)
        await self.db.commit()
        await self.db.refresh(terminal)
        return terminal

    async def update_terminal(self, terminal: Terminal, data: dict) -> Terminal:
        for key, value in data.items():
            setattr(terminal, key, value)
        await self.db.commit()
        await self.db.refresh(terminal)
        return terminal

    async def delete_terminal(self, terminal: Terminal) -> None:
        await self.db.delete(terminal)
        await self.db.commit()
