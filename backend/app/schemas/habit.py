from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.habit import HabitCategory, HabitLogStatus


class HabitBase(BaseModel):
    title: str = Field(..., max_length=255)
    color: str = Field(default="#6366f1", max_length=20)
    target_per_week: int = Field(default=7, ge=1, le=7)
    duration_minutes: int = Field(default=30, ge=1)
    category: HabitCategory = HabitCategory.productivity
    is_active: bool = True


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    color: str | None = Field(default=None, max_length=20)
    target_per_week: int | None = Field(default=None, ge=1, le=7)
    duration_minutes: int | None = Field(default=None, ge=1)
    category: HabitCategory | None = None
    is_active: bool | None = None


class HabitLogBase(BaseModel):
    date: date
    status: HabitLogStatus = HabitLogStatus.pending


class HabitLogCreate(HabitLogBase):
    pass


class HabitLogRead(HabitLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    habit_id: int


class HabitRead(HabitBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    logs: list[HabitLogRead] = []


class WeekLogsResponse(BaseModel):
    habit_id: int
    week_start: date
    week_end: date
    logs: list[HabitLogRead]
    completed_count: int
    target_per_week: int
