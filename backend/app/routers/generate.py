"""
Simple daily plan generator.

Free time = after work until sleep (e.g. 17:30 → 23:00).
Fills slots with: pending habits first, then active leisure items.
Activities marked as can_overlap run "during work" (e.g. podcasts).
"""
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.settings import UserSettings
from app.models.habit import HabitLogStatus
from app.crud import habits as habit_crud
from app.crud import leisure as leisure_crud
from app.crud import tasks as task_crud
from pydantic import BaseModel

router = APIRouter(prefix="/generate", tags=["generate"])

DB = Annotated[AsyncSession, Depends(get_db)]


def _hhmm_to_minutes(hhmm: str) -> int:
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def _minutes_to_hhmm(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


class GeneratedItem(BaseModel):
    id: int
    kind: str          # "habit" | "task" | "leisure"
    title: str
    color: str
    duration_minutes: int
    start_time: str | None  # "HH:MM"
    end_time: str | None
    during_work: bool = False


class GeneratedPlan(BaseModel):
    date: str
    free_minutes: int
    planned_minutes: int
    work_start: str
    work_end: str
    items: list[GeneratedItem]


@router.get("", response_model=GeneratedPlan)
async def generate_plan(db: DB):
    today     = date.today()
    today_iso = today.isoformat()
    weekday   = today.isoweekday()  # Mon=1, Sun=7

    # Load settings
    result = await db.execute(select(UserSettings).where(UserSettings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(id=1)

    work_days = [int(d) for d in settings.work_days.split(",") if d.strip()]
    is_workday = weekday in work_days

    work_start_min = _hhmm_to_minutes(settings.work_start)
    work_end_min   = _hhmm_to_minutes(settings.work_end)
    sleep_start_min = _hhmm_to_minutes(settings.sleep_start)

    # Free window: after work (or all day if weekend), until sleep
    if is_workday:
        free_start = work_end_min
    else:
        free_start = _hhmm_to_minutes("09:00")
    free_end = sleep_start_min
    free_minutes = max(0, free_end - free_start)

    # Load pending habits for today
    habits  = await habit_crud.get_habits(db)
    pending_habits = []
    for h in habits:
        if not h.is_active:
            continue
        log = next((l for l in h.logs if l.date.isoformat() == today_iso), None)
        if log is None or log.status == HabitLogStatus.pending:
            pending_habits.append(h)

    # Load pending tasks
    tasks = await task_crud.get_tasks(db)
    pending_tasks = [t for t in tasks if t.status.value == "pending"]

    # Load active leisure items
    leisure_items = await leisure_crud.get_leisure_items(db)
    active_leisure = [l for l in leisure_items if l.status.value == "playing"]

    # Build schedule — fill free window
    cursor = free_start
    items: list[GeneratedItem] = []
    planned_minutes = 0

    def add_item(kind: str, obj, duration: int):
        nonlocal cursor, planned_minutes
        if cursor + duration > free_end:
            return False
        items.append(GeneratedItem(
            id=obj.id,
            kind=kind,
            title=obj.title,
            color=obj.color,
            duration_minutes=duration,
            start_time=_minutes_to_hhmm(cursor),
            end_time=_minutes_to_hhmm(cursor + duration),
        ))
        cursor += duration
        planned_minutes += duration
        return True

    # Habits first (sorted by duration ascending — quick wins first)
    for h in sorted(pending_habits, key=lambda x: x.duration_minutes):
        add_item("habit", h, h.duration_minutes)

    # Tasks
    for t in sorted(pending_tasks, key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(x.priority.value, 1)):
        add_item("task", t, t.duration_minutes)

    # Active leisure last
    for l in active_leisure:
        add_item("leisure", l, 60)  # default 1h session

    return GeneratedPlan(
        date=today_iso,
        free_minutes=free_minutes,
        planned_minutes=planned_minutes,
        work_start=settings.work_start if is_workday else "",
        work_end=settings.work_end if is_workday else "",
        items=items,
    )
