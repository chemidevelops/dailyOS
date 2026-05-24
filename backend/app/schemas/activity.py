from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.activity import ItemStatus


# ─── Activity Log ─────────────────────────────────────────────────────────────

class ActivityLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activity_id: int
    item_id: int | None
    date: date
    status: str


# ─── Item ─────────────────────────────────────────────────────────────────────

class ItemCreate(BaseModel):
    activity_id: int
    title: str = Field(..., max_length=255)
    status: ItemStatus = ItemStatus.pending
    progress: int = Field(default=0, ge=0, le=100)
    progress_label: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=500)


class ItemUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    status: ItemStatus | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    progress_label: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=500)
    rating: int | None = Field(default=None, ge=1, le=5)


class ItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activity_id: int
    title: str
    status: ItemStatus
    progress: int
    progress_label: str | None
    notes: str | None
    rating: int | None
    created_at: datetime


# ─── Activity ─────────────────────────────────────────────────────────────────

class ActivityCreate(BaseModel):
    title: str = Field(..., max_length=255)
    color: str = Field(default="#6366f1", max_length=20)
    target_per_week: int = Field(default=3, ge=1, le=7)
    duration_minutes: int = Field(default=30, ge=1)


class ActivityUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    color: str | None = Field(default=None, max_length=20)
    target_per_week: int | None = Field(default=None, ge=1, le=7)
    duration_minutes: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    color: str
    target_per_week: int
    duration_minutes: int
    is_active: bool
    created_at: datetime
    logs: list[ActivityLogRead] = []
    items: list[ItemRead] = []


class ActivityLogCreate(BaseModel):
    date: date
    status: str = "done"
    item_id: int | None = None
