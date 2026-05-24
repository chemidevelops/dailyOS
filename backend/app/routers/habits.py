from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import habits as crud
from app.database import get_db
from app.schemas.habit import (
    HabitCreate,
    HabitLogCreate,
    HabitLogRead,
    HabitRead,
    HabitUpdate,
    WeekLogsResponse,
)

router = APIRouter(prefix="/habits", tags=["habits"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[HabitRead])
async def list_habits(db: DB, skip: int = 0, limit: int = 100):
    return await crud.get_habits(db, skip=skip, limit=limit)


@router.post("", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
async def create_habit(habit_in: HabitCreate, db: DB):
    return await crud.create_habit(db, habit_in)


@router.get("/{habit_id}", response_model=HabitRead)
async def get_habit(habit_id: int, db: DB):
    habit = await crud.get_habit(db, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit


@router.put("/{habit_id}", response_model=HabitRead)
async def update_habit(habit_id: int, habit_in: HabitUpdate, db: DB):
    habit = await crud.get_habit(db, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return await crud.update_habit(db, habit, habit_in)


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(habit_id: int, db: DB):
    habit = await crud.get_habit(db, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    await crud.delete_habit(db, habit)


@router.post("/{habit_id}/log", response_model=HabitLogRead, status_code=status.HTTP_200_OK)
async def log_habit(habit_id: int, log_in: HabitLogCreate, db: DB):
    habit = await crud.get_habit(db, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return await crud.log_habit(db, habit_id, log_in)


@router.get("/{habit_id}/week", response_model=WeekLogsResponse)
async def get_week_logs(habit_id: int, db: DB):
    habit = await crud.get_habit(db, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    week_start, week_end, logs, completed = await crud.get_week_logs(db, habit_id)
    return WeekLogsResponse(
        habit_id=habit_id,
        week_start=week_start,
        week_end=week_end,
        logs=logs,
        completed_count=completed,
        target_per_week=habit.target_per_week,
    )
