from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.leisure import LeisureItem
from app.schemas.leisure import LeisureCreate, LeisureProgressUpdate, LeisureUpdate


async def get_leisure_items(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[LeisureItem]:
    result = await db.execute(
        select(LeisureItem).offset(skip).limit(limit).order_by(LeisureItem.created_at.desc())
    )
    return list(result.scalars().all())


async def get_leisure_item(db: AsyncSession, item_id: int) -> LeisureItem | None:
    result = await db.execute(select(LeisureItem).where(LeisureItem.id == item_id))
    return result.scalar_one_or_none()


async def create_leisure_item(db: AsyncSession, item_in: LeisureCreate) -> LeisureItem:
    item = LeisureItem(**item_in.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def update_leisure_item(
    db: AsyncSession, item: LeisureItem, item_in: LeisureUpdate
) -> LeisureItem:
    data = item_in.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
    await db.flush()
    await db.refresh(item)
    return item


async def update_leisure_progress(
    db: AsyncSession, item: LeisureItem, progress_in: LeisureProgressUpdate
) -> LeisureItem:
    item.progress = progress_in.progress
    if progress_in.progress_label is not None:
        item.progress_label = progress_in.progress_label
    if progress_in.status is not None:
        item.status = progress_in.status
    await db.flush()
    await db.refresh(item)
    return item


async def delete_leisure_item(db: AsyncSession, item: LeisureItem) -> None:
    await db.delete(item)
    await db.flush()
