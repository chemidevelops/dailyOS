from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.settings import UserSettings
from app.schemas.settings import UserSettingsRead, UserSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

DB = Annotated[AsyncSession, Depends(get_db)]


async def _get_or_create(db: AsyncSession) -> UserSettings:
    result = await db.execute(select(UserSettings).where(UserSettings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(id=1)
        db.add(settings)
        await db.flush()
        await db.refresh(settings)
    return settings


@router.get("", response_model=UserSettingsRead)
async def get_settings(db: DB):
    return await _get_or_create(db)


@router.put("", response_model=UserSettingsRead)
async def update_settings(body: UserSettingsUpdate, db: DB):
    settings = await _get_or_create(db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    await db.flush()
    await db.refresh(settings)
    return settings
