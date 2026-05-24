from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import tasks as crud
from app.database import get_db
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])

DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[TaskRead])
async def list_tasks(db: DB, skip: int = 0, limit: int = 100):
    return await crud.get_tasks(db, skip=skip, limit=limit)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(task_in: TaskCreate, db: DB):
    return await crud.create_task(db, task_in)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(task_id: int, db: DB):
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskRead)
async def update_task(task_id: int, task_in: TaskUpdate, db: DB):
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return await crud.update_task(db, task, task_in)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, db: DB):
    task = await crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await crud.delete_task(db, task)
