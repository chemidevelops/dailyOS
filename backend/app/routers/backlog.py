from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.backlog import BacklogItem, BacklogItemStatus, Category
from app.schemas.backlog import (
    BacklogItemCreate, BacklogItemRead, BacklogItemUpdate,
    BacklogItemWithCategory, ProgressUpdate,
)

router = APIRouter(prefix="/backlog", tags=["backlog"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[BacklogItemWithCategory])
async def list_backlog(
    db: DB,
    category_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
):
    q = select(BacklogItem).options(selectinload(BacklogItem.category))
    if category_id is not None:
        q = q.where(BacklogItem.category_id == category_id)
    if status is not None:
        q = q.where(BacklogItem.status == status)
    q = q.order_by(BacklogItem.sort_order, BacklogItem.created_at)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=BacklogItemWithCategory, status_code=status.HTTP_201_CREATED)
async def create_backlog_item(data: BacklogItemCreate, db: DB):
    # Verify category exists
    cat_result = await db.execute(select(Category).where(Category.id == data.category_id))
    if not cat_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Category not found")
    item = BacklogItem(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    # Load with category
    result = await db.execute(
        select(BacklogItem).options(selectinload(BacklogItem.category)).where(BacklogItem.id == item.id)
    )
    return result.scalar_one()


@router.get("/{item_id}", response_model=BacklogItemWithCategory)
async def get_backlog_item(item_id: int, db: DB):
    result = await db.execute(
        select(BacklogItem).options(selectinload(BacklogItem.category)).where(BacklogItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/{item_id}", response_model=BacklogItemWithCategory)
async def update_backlog_item(item_id: int, data: BacklogItemUpdate, db: DB):
    result = await db.execute(
        select(BacklogItem).options(selectinload(BacklogItem.category)).where(BacklogItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(item, key, val)
    await db.flush()
    await db.refresh(item)
    result = await db.execute(
        select(BacklogItem).options(selectinload(BacklogItem.category)).where(BacklogItem.id == item_id)
    )
    return result.scalar_one()


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_backlog_item(item_id: int, db: DB):
    result = await db.execute(select(BacklogItem).where(BacklogItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)


@router.put("/{item_id}/progress", response_model=BacklogItemRead)
async def update_progress(item_id: int, data: ProgressUpdate, db: DB):
    result = await db.execute(select(BacklogItem).where(BacklogItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.current_unit = data.current_unit
    # Auto-mark done if reached total
    if item.total_units and item.current_unit >= item.total_units:
        item.status = BacklogItemStatus.done
    await db.flush()
    await db.refresh(item)
    return item
