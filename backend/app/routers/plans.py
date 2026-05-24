from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.plan import DailyPlan, PlannedItem
from app.schemas.plan import (
    DailyPlanCreate,
    DailyPlanRead,
    DailyPlanUpdate,
    PlannedItemCreate,
    PlannedItemRead,
    PlannedItemUpdate,
)

router = APIRouter(prefix="/plans", tags=["plans"])

DB = Annotated[AsyncSession, Depends(get_db)]


async def _get_plan_with_items(db: AsyncSession, plan_id: int) -> DailyPlan | None:
    result = await db.execute(
        select(DailyPlan)
        .options(selectinload(DailyPlan.items))
        .where(DailyPlan.id == plan_id)
    )
    return result.scalar_one_or_none()


@router.get("", response_model=list[DailyPlanRead])
async def list_plans(db: DB, skip: int = 0, limit: int = 30):
    result = await db.execute(
        select(DailyPlan)
        .options(selectinload(DailyPlan.items))
        .order_by(DailyPlan.date.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


@router.post("", response_model=DailyPlanRead, status_code=status.HTTP_201_CREATED)
async def create_plan(plan_in: DailyPlanCreate, db: DB):
    # Check for duplicate date
    existing = await db.execute(
        select(DailyPlan).where(DailyPlan.date == plan_in.date)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A plan for {plan_in.date} already exists",
        )
    plan = DailyPlan(**plan_in.model_dump())
    db.add(plan)
    await db.flush()
    await db.refresh(plan, ["items"])
    return plan


@router.get("/today", response_model=DailyPlanRead)
async def get_today_plan(db: DB):
    today = date.today()
    result = await db.execute(
        select(DailyPlan)
        .options(selectinload(DailyPlan.items))
        .where(DailyPlan.date == today)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="No plan found for today")
    return plan


@router.get("/{plan_id}", response_model=DailyPlanRead)
async def get_plan(plan_id: int, db: DB):
    plan = await _get_plan_with_items(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.put("/{plan_id}", response_model=DailyPlanRead)
async def update_plan(plan_id: int, plan_in: DailyPlanUpdate, db: DB):
    plan = await _get_plan_with_items(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    data = plan_in.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(plan, key, value)
    await db.flush()
    await db.refresh(plan, ["items"])
    return plan


@router.post("/{plan_id}/items", response_model=PlannedItemRead, status_code=status.HTTP_201_CREATED)
async def add_plan_item(plan_id: int, item_in: PlannedItemCreate, db: DB):
    plan = await _get_plan_with_items(db, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    item = PlannedItem(plan_id=plan_id, **item_in.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.put("/{plan_id}/items/{item_id}", response_model=PlannedItemRead)
async def update_plan_item(plan_id: int, item_id: int, item_in: PlannedItemUpdate, db: DB):
    result = await db.execute(
        select(PlannedItem).where(
            PlannedItem.id == item_id, PlannedItem.plan_id == plan_id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Planned item not found")
    data = item_in.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
    await db.flush()
    await db.refresh(item)
    return item
