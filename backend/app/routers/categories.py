from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.backlog import Category
from app.schemas.backlog import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[CategoryRead])
async def list_categories(db: DB):
    result = await db.execute(select(Category).order_by(Category.title))
    return result.scalars().all()


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(data: CategoryCreate, db: DB):
    cat = Category(**data.model_dump())
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat


@router.get("/{cat_id}", response_model=CategoryRead)
async def get_category(cat_id: int, db: DB):
    result = await db.execute(select(Category).where(Category.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.put("/{cat_id}", response_model=CategoryRead)
async def update_category(cat_id: int, data: CategoryUpdate, db: DB):
    result = await db.execute(select(Category).where(Category.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(cat, key, val)
    await db.flush()
    await db.refresh(cat)
    return cat


@router.delete("/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(cat_id: int, db: DB):
    result = await db.execute(select(Category).where(Category.id == cat_id))
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(cat)
