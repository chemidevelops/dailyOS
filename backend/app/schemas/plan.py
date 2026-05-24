from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field

from app.models.plan import PlannedItemType


class PlannedItemBase(BaseModel):
    item_type: PlannedItemType
    item_id: int
    suggested_start: time | None = None
    suggested_end: time | None = None
    duration_minutes: int | None = Field(default=None, ge=1)
    order: int = 0
    is_done: bool = False


class PlannedItemCreate(PlannedItemBase):
    pass


class PlannedItemUpdate(BaseModel):
    suggested_start: time | None = None
    suggested_end: time | None = None
    duration_minutes: int | None = Field(default=None, ge=1)
    order: int | None = None
    is_done: bool | None = None


class PlannedItemRead(PlannedItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_id: int


class DailyPlanBase(BaseModel):
    date: date
    energy_level: int | None = Field(default=None, ge=1, le=10)
    user_mode: str | None = Field(default=None, max_length=50)
    total_free_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = None


class DailyPlanCreate(DailyPlanBase):
    pass


class DailyPlanUpdate(BaseModel):
    energy_level: int | None = Field(default=None, ge=1, le=10)
    user_mode: str | None = Field(default=None, max_length=50)
    total_free_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = None


class DailyPlanRead(DailyPlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    items: list[PlannedItemRead] = []
