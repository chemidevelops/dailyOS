"""
Daily plan generator.

Free time = after work until sleep (e.g. 17:30 → 23:00).
For each pending habit, if there's an active leisure item linked to it,
the plan shows that item's title instead of the habit name.
"""
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.settings import UserSettings
from app.models.habit import HabitLogStatus
from app.models.leisure import LeisureItem, LeisureStatus
from app.crud import habits as habit_crud
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
    kind: str           # "habit" | "task" | "leisure"
    title: str          # leisure item title if linked, else habit title
    habit_title: str | None = None  # original habit title when showing a leisure item
    color: str
    duration_minutes: int
    start_time: str | None
    end_time: str | None
    leisure_item_id: int | None = None


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

    # Settings
    result   = await db.execute(select(UserSettings).where(UserSettings.id == 1))
    settings = result.scalar_one_or_none() or UserSettings(id=1)

    work_days = [int(d) for d in settings.work_days.split(",") if d.strip()]
    is_workday = weekday in work_days

    work_end_min    = _hhmm_to_minutes(settings.work_end)
    sleep_start_min = _hhmm_to_minutes(settings.sleep_start)

    free_start   = work_end_min if is_workday else _hhmm_to_minutes("09:00")
    free_end     = sleep_start_min
    free_minutes = max(0, free_end - free_start)

    # Load pending habits for today
    habits = await habit_crud.get_habits(db)
    pending_habits = [
        h for h in habits
        if h.is_active and not any(
            l.date.isoformat() == today_iso and l.status == HabitLogStatus.done
            for l in h.logs
        )
    ]

    # Load active leisure items indexed by habit_id
    leisure_result = await db.execute(
        select(LeisureItem).where(LeisureItem.status == LeisureStatus.playing)
    )
    active_leisure: list[LeisureItem] = list(leisure_result.scalars().all())
    leisure_by_habit: dict[int, LeisureItem] = {
        l.habit_id: l for l in active_leisure if l.habit_id is not None
    }

    # Load pending tasks
    tasks = await task_crud.get_tasks(db)
    pending_tasks = [t for t in tasks if t.status.value == "pending"]

    # Build schedule
    cursor          = free_start
    items: list[GeneratedItem] = []
    planned_minutes = 0

    def schedule(kind: str, obj_id: int, title: str, color: str, duration: int,
                 habit_title: str | None = None, leisure_item_id: int | None = None) -> bool:
        nonlocal cursor, planned_minutes
        if cursor + duration > free_end:
            return False
        items.append(GeneratedItem(
            id=obj_id,
            kind=kind,
            title=title,
            habit_title=habit_title,
            color=color,
            duration_minutes=duration,
            start_time=_minutes_to_hhmm(cursor),
            end_time=_minutes_to_hhmm(cursor + duration),
            leisure_item_id=leisure_item_id,
        ))
        cursor += duration
        planned_minutes += duration
        return True

    # Habits (sorted by duration ascending — quick wins first)
    for h in sorted(pending_habits, key=lambda x: x.duration_minutes):
        linked = leisure_by_habit.get(h.id)
        if linked:
            schedule("leisure", h.id, linked.title, linked.color,
                     h.duration_minutes, habit_title=h.title, leisure_item_id=linked.id)
        else:
            schedule("habit", h.id, h.title, h.color, h.duration_minutes)

    # Tasks by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    for t in sorted(pending_tasks, key=lambda x: priority_order.get(x.priority.value, 1)):
        schedule("task", t.id, t.title, t.color, t.duration_minutes)

    # Unlinked active leisure items (not already shown via a habit)
    used_leisure_ids = {i.leisure_item_id for i in items if i.leisure_item_id}
    for l in active_leisure:
        if l.id not in used_leisure_ids and l.habit_id is None:
            schedule("leisure", l.id, l.title, l.color, 60)

    return GeneratedPlan(
        date=today_iso,
        free_minutes=free_minutes,
        planned_minutes=planned_minutes,
        work_start=settings.work_start if is_workday else "",
        work_end=settings.work_end if is_workday else "",
        items=items,
    )
