from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskPriority, TaskStatus


class TaskBase(BaseModel):
    title: str = Field(..., max_length=255)
    color: str = Field(default="#f59e0b", max_length=20)
    duration_minutes: int = Field(default=30, ge=1)
    priority: TaskPriority = TaskPriority.medium
    status: TaskStatus = TaskStatus.pending
    due_date: date | None = None
    notes: str | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    color: str | None = Field(default=None, max_length=20)
    duration_minutes: int | None = Field(default=None, ge=1)
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    due_date: date | None = None
    notes: str | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
