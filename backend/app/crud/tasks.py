from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


async def get_tasks(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Task]:
    result = await db.execute(select(Task).offset(skip).limit(limit).order_by(Task.created_at.desc()))
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: int) -> Task | None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    return result.scalar_one_or_none()


async def create_task(db: AsyncSession, task_in: TaskCreate) -> Task:
    task = Task(**task_in.model_dump())
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


async def update_task(db: AsyncSession, task: Task, task_in: TaskUpdate) -> Task:
    data = task_in.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(task, key, value)
    await db.flush()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, task: Task) -> None:
    await db.delete(task)
    await db.flush()
