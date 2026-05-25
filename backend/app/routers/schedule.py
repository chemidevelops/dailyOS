import datetime as dt
import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.backlog import BacklogItem, BacklogItemStatus, DayEntry, DayEntryStatus
from app.models.settings import UserSettings
from app.schemas.backlog import DayEntryCreate, DayEntryRead, DayEntryUpdate, DayEntryWithDetails

router = APIRouter(prefix="/schedule", tags=["schedule"])

DB = Annotated[AsyncSession, Depends(get_db)]


def _hhmm_to_min(hhmm: str) -> int:
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def _min_to_hhmm(minutes: int) -> str:
    minutes = minutes % 1440
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


@router.get("/today", response_model=list[DayEntryWithDetails])
async def get_today(db: DB):
    today = dt.date.today()
    result = await db.execute(
        select(DayEntry)
        .options(selectinload(DayEntry.item), selectinload(DayEntry.category))
        .where(DayEntry.date == today)
        .order_by(DayEntry.start_time)
    )
    return result.scalars().all()


@router.get("", response_model=list[DayEntryWithDetails])
async def list_schedule(date: str | None = None, db: AsyncSession = Depends(get_db)):
    target = dt.date.fromisoformat(date) if date else dt.date.today()
    result = await db.execute(
        select(DayEntry)
        .options(selectinload(DayEntry.item), selectinload(DayEntry.category))
        .where(DayEntry.date == target)
        .order_by(DayEntry.start_time)
    )
    return result.scalars().all()


@router.post("", response_model=DayEntryWithDetails, status_code=status.HTTP_201_CREATED)
async def create_entry(data: DayEntryCreate, db: DB):
    # Fetch item to get category_id
    item_result = await db.execute(select(BacklogItem).where(BacklogItem.id == data.item_id))
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="BacklogItem not found")

    entry = DayEntry(
        item_id=data.item_id,
        category_id=item.category_id,
        date=data.date,
        start_time=data.start_time,
        duration_minutes=data.duration_minutes,
        status=data.status,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    result = await db.execute(
        select(DayEntry)
        .options(selectinload(DayEntry.item), selectinload(DayEntry.category))
        .where(DayEntry.id == entry.id)
    )
    return result.scalar_one()


@router.put("/{entry_id}", response_model=DayEntryWithDetails)
async def update_entry(entry_id: int, data: DayEntryUpdate, db: DB):
    result = await db.execute(
        select(DayEntry)
        .options(selectinload(DayEntry.item), selectinload(DayEntry.category))
        .where(DayEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, val)
    await db.flush()
    await db.refresh(entry)
    result = await db.execute(
        select(DayEntry)
        .options(selectinload(DayEntry.item), selectinload(DayEntry.category))
        .where(DayEntry.id == entry_id)
    )
    return result.scalar_one()


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(entry_id: int, db: DB):
    result = await db.execute(select(DayEntry).where(DayEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.delete(entry)


@router.post("/auto", response_model=list[DayEntryWithDetails])
async def auto_schedule(db: DB):
    """Auto-fill today with active backlog items respecting work hours and max_fill_pct."""
    today = dt.date.today()

    # Get settings
    s_result = await db.execute(select(UserSettings).where(UserSettings.id == 1))
    settings = s_result.scalar_one_or_none() or UserSettings(id=1)

    # Check vacation
    vacation_dates: list[str] = []
    if settings.vacation_dates:
        try:
            vacation_dates = json.loads(settings.vacation_dates)
        except Exception:
            pass
    if today.isoformat() in vacation_dates:
        return []

    # Determine free window
    weekday = today.isoweekday()
    work_days = [int(d) for d in settings.work_days.split(",") if d.strip()]
    is_workday = weekday in work_days

    work_end_min = _hhmm_to_min(settings.work_end)
    sleep_start_min = _hhmm_to_min(settings.sleep_start)
    if sleep_start_min == 0:
        sleep_start_min = 1440

    free_start = work_end_min if is_workday else _hhmm_to_min("09:00")
    free_end = sleep_start_min

    # Existing entries today
    existing_result = await db.execute(
        select(DayEntry).where(DayEntry.date == today).order_by(DayEntry.start_time)
    )
    existing = existing_result.scalars().all()

    # Build occupied slots
    occupied: list[tuple[int, int]] = []
    for e in existing:
        s = _hhmm_to_min(e.start_time)
        occupied.append((s, s + e.duration_minutes))

    free_minutes = max(0, free_end - free_start)
    max_fill = int(free_minutes * settings.max_fill_pct / 100)

    # Active backlog items
    items_result = await db.execute(
        select(BacklogItem)
        .options(selectinload(BacklogItem.category))
        .where(BacklogItem.status == BacklogItemStatus.active)
        .order_by(BacklogItem.sort_order, BacklogItem.created_at)
    )
    active_items = items_result.scalars().all()

    def find_slot(duration: int) -> int | None:
        """Find earliest start time that doesn't overlap and fits before free_end."""
        cursor = free_start
        for occ_start, occ_end in sorted(occupied):
            if cursor + duration <= occ_start:
                return cursor
            cursor = max(cursor, occ_end)
        if cursor + duration <= free_end:
            return cursor
        return None

    planned = 0
    new_entries: list[DayEntry] = []

    for item in active_items:
        if planned >= max_fill:
            break
        dur = item.session_duration_minutes
        slot = find_slot(dur)
        if slot is None:
            continue
        if planned + dur > max_fill:
            continue

        entry = DayEntry(
            item_id=item.id,
            category_id=item.category_id,
            date=today,
            start_time=_min_to_hhmm(slot),
            duration_minutes=dur,
            status=DayEntryStatus.pending,
        )
        db.add(entry)
        occupied.append((slot, slot + dur))
        occupied.sort()
        planned += dur
        new_entries.append(entry)

    await db.flush()

    # Reload with relationships
    result_entries = []
    for e in new_entries:
        await db.refresh(e)
        r = await db.execute(
            select(DayEntry)
            .options(selectinload(DayEntry.item), selectinload(DayEntry.category))
            .where(DayEntry.id == e.id)
        )
        result_entries.append(r.scalar_one())

    return result_entries
