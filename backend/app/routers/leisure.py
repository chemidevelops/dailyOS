from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import leisure as crud
from app.database import get_db
from app.schemas.leisure import LeisureCreate, LeisureProgressUpdate, LeisureRead, LeisureUpdate

router = APIRouter(prefix="/leisure", tags=["leisure"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[LeisureRead])
async def list_leisure(db: DB, skip: int = 0, limit: int = 100):
    return await crud.get_leisure_items(db, skip=skip, limit=limit)


@router.post("", response_model=LeisureRead, status_code=status.HTTP_201_CREATED)
async def create_leisure(item_in: LeisureCreate, db: DB):
    return await crud.create_leisure_item(db, item_in)


@router.get("/{item_id}", response_model=LeisureRead)
async def get_leisure(item_id: int, db: DB):
    item = await crud.get_leisure_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Leisure item not found")
    return item


@router.put("/{item_id}", response_model=LeisureRead)
async def update_leisure(item_id: int, item_in: LeisureUpdate, db: DB):
    item = await crud.get_leisure_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Leisure item not found")
    return await crud.update_leisure_item(db, item, item_in)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_leisure(item_id: int, db: DB):
    item = await crud.get_leisure_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Leisure item not found")
    await crud.delete_leisure_item(db, item)


@router.patch("/{item_id}/progress", response_model=LeisureRead)
async def update_progress(item_id: int, progress_in: LeisureProgressUpdate, db: DB):
    item = await crud.get_leisure_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Leisure item not found")
    return await crud.update_leisure_progress(db, item, progress_in)
