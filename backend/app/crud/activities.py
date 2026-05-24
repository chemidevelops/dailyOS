from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.activity import Activity, ActivityLog, Item, ItemStatus
from app.schemas.activity import ActivityCreate, ActivityLogCreate, ActivityUpdate, ItemCreate, ItemUpdate


# ─── Activities ───────────────────────────────────────────────────────────────

async def get_activities(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Activity]:
    result = await db.execute(
        select(Activity)
        .options(selectinload(Activity.logs), selectinload(Activity.items))
        .where(Activity.is_active == True)
        .order_by(Activity.created_at)
        .offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def get_activity(db: AsyncSession, activity_id: int) -> Activity | None:
    result = await db.execute(
        select(Activity)
        .options(selectinload(Activity.logs), selectinload(Activity.items))
        .where(Activity.id == activity_id)
    )
    return result.scalar_one_or_none()


async def create_activity(db: AsyncSession, data: ActivityCreate) -> Activity:
    activity = Activity(**data.model_dump())
    db.add(activity)
    await db.flush()
    await db.refresh(activity, ["logs", "items"])
    return activity


async def update_activity(db: AsyncSession, activity: Activity, data: ActivityUpdate) -> Activity:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(activity, key, value)
    await db.flush()
    await db.refresh(activity, ["logs", "items"])
    return activity


async def delete_activity(db: AsyncSession, activity: Activity) -> None:
    await db.delete(activity)
    await db.flush()


# ─── Logs ─────────────────────────────────────────────────────────────────────

async def log_activity(db: AsyncSession, activity_id: int, data: ActivityLogCreate) -> ActivityLog:
    # Upsert: one log per activity per day
    result = await db.execute(
        select(ActivityLog).where(
            ActivityLog.activity_id == activity_id,
            ActivityLog.date == data.date,
        )
    )
    log = result.scalar_one_or_none()
    if log:
        log.status   = data.status
        log.item_id  = data.item_id
    else:
        log = ActivityLog(activity_id=activity_id, **data.model_dump())
        db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


# ─── Items ────────────────────────────────────────────────────────────────────

async def get_items(db: AsyncSession, activity_id: int) -> list[Item]:
    result = await db.execute(
        select(Item).where(Item.activity_id == activity_id).order_by(Item.created_at)
    )
    return list(result.scalars().all())


async def create_item(db: AsyncSession, data: ItemCreate) -> Item:
    item = Item(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def update_item(db: AsyncSession, item: Item, data: ItemUpdate) -> Item:
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.flush()
    await db.refresh(item)
    return item


async def delete_item(db: AsyncSession, item: Item) -> None:
    await db.delete(item)
    await db.flush()


async def get_item(db: AsyncSession, item_id: int) -> Item | None:
    result = await db.execute(select(Item).where(Item.id == item_id))
    return result.scalar_one_or_none()
