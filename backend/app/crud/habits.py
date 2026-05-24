from datetime import date, timedelta

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.habit import Habit, HabitLog, HabitLogStatus
from app.schemas.habit import HabitCreate, HabitLogCreate, HabitUpdate


async def get_habits(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Habit]:
    result = await db.execute(
        select(Habit).options(selectinload(Habit.logs)).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def get_habit(db: AsyncSession, habit_id: int) -> Habit | None:
    result = await db.execute(
        select(Habit).options(selectinload(Habit.logs)).where(Habit.id == habit_id)
    )
    return result.scalar_one_or_none()


async def create_habit(db: AsyncSession, habit_in: HabitCreate) -> Habit:
    habit = Habit(**habit_in.model_dump())
    db.add(habit)
    await db.flush()
    await db.refresh(habit)
    return habit


async def update_habit(db: AsyncSession, habit: Habit, habit_in: HabitUpdate) -> Habit:
    data = habit_in.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(habit, key, value)
    await db.flush()
    await db.refresh(habit)
    return habit


async def delete_habit(db: AsyncSession, habit: Habit) -> None:
    await db.delete(habit)
    await db.flush()


async def log_habit(
    db: AsyncSession, habit_id: int, log_in: HabitLogCreate
) -> HabitLog:
    # Upsert: update existing log for this date if present
    result = await db.execute(
        select(HabitLog).where(
            and_(HabitLog.habit_id == habit_id, HabitLog.date == log_in.date)
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.status = log_in.status
        await db.flush()
        await db.refresh(existing)
        return existing

    log = HabitLog(habit_id=habit_id, date=log_in.date, status=log_in.status)
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


async def get_week_logs(db: AsyncSession, habit_id: int) -> tuple[date, date, list[HabitLog], int]:
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    result = await db.execute(
        select(HabitLog).where(
            and_(
                HabitLog.habit_id == habit_id,
                HabitLog.date >= week_start,
                HabitLog.date <= week_end,
            )
        ).order_by(HabitLog.date)
    )
    logs = list(result.scalars().all())
    completed = sum(1 for log in logs if log.status == HabitLogStatus.done)
    return week_start, week_end, logs, completed
