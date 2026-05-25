import datetime as dt
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.backlog import Category, DayEntry, DayEntryStatus
from app.schemas.backlog import CategoryWeeklyStats

router = APIRouter(prefix="/stats", tags=["stats"])

DB = Annotated[AsyncSession, Depends(get_db)]


def _get_week_dates() -> list[dt.date]:
    today = dt.date.today()
    monday = today - dt.timedelta(days=today.weekday())
    return [monday + dt.timedelta(days=i) for i in range(7)]


@router.get("/weekly", response_model=list[CategoryWeeklyStats])
async def weekly_stats(db: DB):
    week = _get_week_dates()
    week_start = week[0]
    week_end = week[-1]

    cats_result = await db.execute(
        select(Category).where(Category.is_active == True).order_by(Category.title)
    )
    categories = cats_result.scalars().all()

    entries_result = await db.execute(
        select(DayEntry)
        .where(DayEntry.date >= week_start, DayEntry.date <= week_end)
    )
    entries = entries_result.scalars().all()

    stats = []
    from app.schemas.backlog import CategoryRead
    for cat in categories:
        cat_entries = [e for e in entries if e.category_id == cat.id]
        done_entries = [e for e in cat_entries if e.status == DayEntryStatus.done]
        skipped_entries = [e for e in cat_entries if e.status == DayEntryStatus.skipped]
        done_minutes = sum(e.duration_minutes for e in done_entries)
        stats.append(CategoryWeeklyStats(
            category=CategoryRead.model_validate(cat),
            goal_minutes=cat.weekly_goal_minutes,
            done_minutes=done_minutes,
            done_count=len(done_entries),
            skipped_count=len(skipped_entries),
        ))
    return stats
