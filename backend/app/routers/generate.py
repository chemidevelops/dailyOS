"""
Daily plan generator.
Free time = after work until sleep.
For each pending activity, picks the active item (if any) as the concrete task.
Energy level: low = only short activities, high = include all + tasks.
Max fill %: never fill more than settings.max_fill_pct of free time.
Plan order: if settings.plan_order is set, items are sorted by that saved order.
"""
import datetime as dt
import json
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
    minutes = minutes % 1440
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


class GeneratedItem(BaseModel):
    id: int
    kind: str                    # "activity" | "task"
    title: str
    activity_title: str | None
    item_id: int | None
    color: str
    duration_minutes: int
    start_time: str | None
    end_time: str | None
    next_item_title: str | None = None


class GeneratedPlan(BaseModel):
    date: str
    free_minutes: int
    planned_minutes: int
    work_start: str
    work_end: str
    items: list[GeneratedItem]
    is_vacation: bool = False


@router.get("", response_model=GeneratedPlan)
async def generate_plan(
    db: DB,
    date: str | None = None,
    now: str | None = None,
    energy: str | None = None,    # "high" | "normal" | "low"
    fill_pct: int | None = None,  # override settings.max_fill_pct
):
    today     = dt.date.fromisoformat(date) if date else dt.date.today()
    today_iso = today.isoformat()
    weekday   = today.isoweekday()

    result   = await db.execute(select(UserSettings).where(UserSettings.id == 1))
    settings = result.scalar_one_or_none() or UserSettings(id=1)

    # Check vacation
    vacation_dates: list[str] = []
    if settings.vacation_dates:
        try:
            vacation_dates = json.loads(settings.vacation_dates)
        except Exception:
            vacation_dates = []
    if today_iso in vacation_dates:
        return GeneratedPlan(
            date=today_iso, free_minutes=0, planned_minutes=0,
            work_start="", work_end="", items=[], is_vacation=True,
        )

    work_days  = [int(d) for d in settings.work_days.split(",") if d.strip()]
    is_workday = weekday in work_days

    work_end_min    = _hhmm_to_minutes(settings.work_end)
    sleep_start_min = _hhmm_to_minutes(settings.sleep_start)
    if sleep_start_min == 0:
        sleep_start_min = 1440
    free_start = work_end_min if is_workday else _hhmm_to_minutes("09:00")
    free_end   = sleep_start_min

    # For today, skip slots that have already passed
    if today == dt.date.today():
        if now:
            h, m = map(int, now.split(":"))
            now_min = h * 60 + m
        else:
            now_min = dt.datetime.now().hour * 60 + dt.datetime.now().minute
        free_start = max(free_start, now_min)

    free_minutes = max(0, free_end - free_start)

    # Max minutes to fill based on settings
    max_fill_pct = fill_pct if fill_pct is not None else getattr(settings, 'max_fill_pct', 80)
    fill_budget  = int(free_minutes * max_fill_pct / 100)

    # Energy filters
    # low:    only activities ≤ 30min, no tasks
    # normal: all activities, high-priority tasks only
    # high:   everything
    max_activity_duration = 9999 if energy != "low"    else 30
    include_tasks         = energy != "low"
    task_min_priority     = {"high": 0, "medium": 1, "low": 2}.get(
        "low" if energy == "low" else ("medium" if energy == "normal" else "low"), 2
    )

    # Pending activities
    all_activities = await activity_crud.get_activities(db)
    pending = [
        a for a in all_activities
        if a.is_active
        and a.duration_minutes <= max_activity_duration
        and not any(l.date.isoformat() == today_iso and l.status == "done" for l in a.logs)
    ]

    # Pending tasks
    tasks = await task_crud.get_tasks(db)
    priority_order = {"high": 0, "medium": 1, "low": 2}
    pending_tasks = [
        t for t in tasks
        if t.status.value == "pending"
        and include_tasks
        and priority_order.get(t.priority.value, 2) <= task_min_priority
    ] if include_tasks else []

    # Build candidate list: (kind, id, title, color, duration, activity_title, item_id)
    candidates = []
    for a in sorted(pending, key=lambda x: x.duration_minutes):
        sorted_items = sorted(a.items, key=lambda i: (i.sort_order, i.created_at))
        active_item = next((i for i in sorted_items if i.status == ItemStatus.active), None)
        if active_item:
            # Find next pending item after active
            active_idx = next((idx for idx, i in enumerate(sorted_items) if i.id == active_item.id), None)
            next_item = None
            if active_idx is not None:
                next_item = next(
                    (i for i in sorted_items[active_idx + 1:] if i.status == ItemStatus.pending),
                    None
                )
            candidates.append(("activity", a.id, active_item.title, a.color,
                                a.duration_minutes, a.title, active_item.id,
                                next_item.title if next_item else None))
        else:
            candidates.append(("activity", a.id, a.title, a.color, a.duration_minutes, None, None, None))

    for t in sorted(pending_tasks, key=lambda x: priority_order.get(x.priority.value, 1)):
        candidates.append(("task", t.id, t.title, t.color, t.duration_minutes, None, None, None))

    # Apply saved plan_order if set
    saved_order: list[str] = []
    if settings.plan_order:
        try:
            saved_order = json.loads(settings.plan_order)
        except Exception:
            saved_order = []

    if saved_order:
        def order_key(c):
            key = f"{c[0]}-{c[1]}"
            try:
                return saved_order.index(key)
            except ValueError:
                return len(saved_order)
        candidates.sort(key=order_key)

    cursor          = free_start
    items: list[GeneratedItem] = []
    planned_minutes = 0

    def schedule(kind: str, obj_id: int, title: str, color: str, duration: int,
                 activity_title: str | None = None, item_id: int | None = None,
                 next_item_title: str | None = None) -> bool:
        nonlocal cursor, planned_minutes
        if cursor + duration > free_end:
            return False
        if planned_minutes + duration > fill_budget:
            return False
        items.append(GeneratedItem(
            id=obj_id, kind=kind, title=title, activity_title=activity_title,
            item_id=item_id, color=color, duration_minutes=duration,
            start_time=_minutes_to_hhmm(cursor),
            end_time=_minutes_to_hhmm(cursor + duration),
            next_item_title=next_item_title,
        ))
        cursor += duration
        planned_minutes += duration
        return True

    for kind, obj_id, title, color, duration, activity_title, item_id, next_item_title in candidates:
        schedule(kind, obj_id, title, color, duration, activity_title, item_id, next_item_title)

    return GeneratedPlan(
        date=today_iso,
        free_minutes=free_minutes,
        planned_minutes=planned_minutes,
        work_start=settings.work_start if is_workday else "",
        work_end=settings.work_end if is_workday else "",
        items=items,
    )
