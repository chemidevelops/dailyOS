"""
Daily plan generator.
Free time = after work until sleep.
For each pending activity, picks the active item (if any) as the concrete task.
"""
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import activities as activity_crud
from app.crud import tasks as task_crud
from app.database import get_db
from app.models.activity import ItemStatus
from app.models.settings import UserSettings
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
    kind: str                    # "activity" | "task"
    title: str                   # item title if linked, else activity title
    activity_title: str | None   # activity title when showing a concrete item
    item_id: int | None          # the concrete item id if applicable
    color: str
    duration_minutes: int
    start_time: str | None
    end_time: str | None


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
    weekday   = today.isoweekday()

    result   = await db.execute(select(UserSettings).where(UserSettings.id == 1))
    settings = result.scalar_one_or_none() or UserSettings(id=1)

    work_days  = [int(d) for d in settings.work_days.split(",") if d.strip()]
    is_workday = weekday in work_days

    work_end_min    = _hhmm_to_minutes(settings.work_end)
    sleep_start_min = _hhmm_to_minutes(settings.sleep_start)
    free_start      = work_end_min if is_workday else _hhmm_to_minutes("09:00")
    free_end        = sleep_start_min
    free_minutes    = max(0, free_end - free_start)

    # Pending activities today
    all_activities = await activity_crud.get_activities(db)
    pending = [
        a for a in all_activities
        if a.is_active and not any(
            l.date.isoformat() == today_iso and l.status == "done"
            for l in a.logs
        )
    ]

    # Pending tasks
    tasks = await task_crud.get_tasks(db)
    pending_tasks = [t for t in tasks if t.status.value == "pending"]

    cursor          = free_start
    items: list[GeneratedItem] = []
    planned_minutes = 0

    def schedule(kind: str, obj_id: int, title: str, color: str, duration: int,
                 activity_title: str | None = None, item_id: int | None = None) -> bool:
        nonlocal cursor, planned_minutes
        if cursor + duration > free_end:
            return False
        items.append(GeneratedItem(
            id=obj_id,
            kind=kind,
            title=title,
            activity_title=activity_title,
            item_id=item_id,
            color=color,
            duration_minutes=duration,
            start_time=_minutes_to_hhmm(cursor),
            end_time=_minutes_to_hhmm(cursor + duration),
        ))
        cursor += duration
        planned_minutes += duration
        return True

    # Activities sorted by duration ascending
    for a in sorted(pending, key=lambda x: x.duration_minutes):
        active_item = next((i for i in a.items if i.status == ItemStatus.active), None)
        if active_item:
            schedule("activity", a.id, active_item.title, a.color,
                     a.duration_minutes, activity_title=a.title, item_id=active_item.id)
        else:
            schedule("activity", a.id, a.title, a.color, a.duration_minutes)

    # Tasks by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    for t in sorted(pending_tasks, key=lambda x: priority_order.get(x.priority.value, 1)):
        schedule("task", t.id, t.title, t.color, t.duration_minutes)

    return GeneratedPlan(
        date=today_iso,
        free_minutes=free_minutes,
        planned_minutes=planned_minutes,
        work_start=settings.work_start if is_workday else "",
        work_end=settings.work_end if is_workday else "",
        items=items,
    )
