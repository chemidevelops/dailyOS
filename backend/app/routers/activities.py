from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.crud import activities as crud
from app.database import get_db
from app.models.activity import Item, ItemStatus
from app.schemas.activity import (
    ActivityCreate, ActivityLogCreate, ActivityLogRead,
    ActivityRead, ActivityUpdate, ItemCreate, ItemRead, ItemUpdate,
)

router = APIRouter(prefix="/activities", tags=["activities"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[ActivityRead])
async def list_activities(db: DB):
    return await crud.get_activities(db)


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
async def create_activity(data: ActivityCreate, db: DB):
    return await crud.create_activity(db, data)


@router.get("/{activity_id}", response_model=ActivityRead)
async def get_activity(activity_id: int, db: DB):
    a = await crud.get_activity(db, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    return a


@router.put("/{activity_id}", response_model=ActivityRead)
async def update_activity(activity_id: int, data: ActivityUpdate, db: DB):
    a = await crud.get_activity(db, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    return await crud.update_activity(db, a, data)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(activity_id: int, db: DB):
    a = await crud.get_activity(db, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    await crud.delete_activity(db, a)


@router.post("/{activity_id}/log", response_model=ActivityLogRead)
async def log_activity(activity_id: int, data: ActivityLogCreate, db: DB):
    a = await crud.get_activity(db, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    log = await crud.log_activity(db, activity_id, data)

    # When an item is marked done, auto-activate the next pending item
    if data.status == "done" and data.item_id:
        items = sorted(a.items, key=lambda i: i.created_at)
        done_idx = next((i for i, it in enumerate(items) if it.id == data.item_id), None)
        if done_idx is not None:
            # Mark the done item as done
            for it in items:
                if it.id == data.item_id and it.status != ItemStatus.done:
                    it.status = ItemStatus.done
            # Activate next pending item
            next_pending = next(
                (it for it in items[done_idx + 1:] if it.status == ItemStatus.pending),
                None
            )
            if next_pending:
                next_pending.status = ItemStatus.active
            await db.commit()

    return log


# ─── Items ────────────────────────────────────────────────────────────────────

@router.get("/{activity_id}/items", response_model=list[ItemRead])
async def list_items(activity_id: int, db: DB):
    a = await crud.get_activity(db, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    return await crud.get_items(db, activity_id)


@router.post("/{activity_id}/items", response_model=ItemRead, status_code=status.HTTP_201_CREATED)
async def create_item(activity_id: int, data: ItemCreate, db: DB):
    a = await crud.get_activity(db, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    data.activity_id = activity_id
    return await crud.create_item(db, data)


@router.put("/items/{item_id}", response_model=ItemRead)
async def update_item(item_id: int, data: ItemUpdate, db: DB):
    item = await crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return await crud.update_item(db, item, data)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: int, db: DB):
    item = await crud.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await crud.delete_item(db, item)


class ReorderBody(BaseModel):
    order: list[int]


@router.put("/{activity_id}/items/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_items(activity_id: int, body: ReorderBody, db: DB):
    a = await crud.get_activity(db, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="Activity not found")
    result = await db.execute(select(Item).where(Item.activity_id == activity_id))
    items = {i.id: i for i in result.scalars().all()}
    for sort_idx, item_id in enumerate(body.order):
        if item_id in items:
            items[item_id].sort_order = sort_idx
    await db.flush()
