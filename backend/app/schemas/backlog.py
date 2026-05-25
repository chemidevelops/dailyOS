from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.backlog import BacklogItemStatus, CategoryType


# ─── Category ─────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    title: str = Field(..., max_length=255)
    color: str = Field(default="#6366f1", max_length=20)
    icon: str = Field(default="⭐", max_length=10)
    type: CategoryType = CategoryType.other
    weekly_goal_minutes: int = Field(default=0, ge=0)
    is_active: bool = True


class CategoryUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    color: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=10)
    type: CategoryType | None = None
    weekly_goal_minutes: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    color: str
    icon: str
    type: CategoryType
    weekly_goal_minutes: int
    is_active: bool
    created_at: datetime


# ─── BacklogItem ──────────────────────────────────────────────────────────────

class BacklogItemCreate(BaseModel):
    category_id: int
    title: str = Field(..., max_length=255)
    synopsis: str | None = None
    image_url: str | None = None
    external_id: str | None = None
    status: BacklogItemStatus = BacklogItemStatus.queued
    total_units: int | None = None
    current_unit: int = 0
    unit_label: str | None = None
    session_duration_minutes: int = Field(default=30, ge=1)
    sort_order: int = 0


class BacklogItemUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    synopsis: str | None = None
    image_url: str | None = None
    status: BacklogItemStatus | None = None
    total_units: int | None = None
    current_unit: int | None = None
    unit_label: str | None = None
    session_duration_minutes: int | None = Field(default=None, ge=1)
    sort_order: int | None = None


class BacklogItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_id: int
    title: str
    synopsis: str | None
    image_url: str | None
    external_id: str | None
    status: BacklogItemStatus
    total_units: int | None
    current_unit: int
    unit_label: str | None
    session_duration_minutes: int
    sort_order: int
    created_at: datetime


class BacklogItemWithCategory(BacklogItemRead):
    category: CategoryRead


class ProgressUpdate(BaseModel):
    current_unit: int = Field(..., ge=0)


# ─── DayEntry ─────────────────────────────────────────────────────────────────

class DayEntryCreate(BaseModel):
    item_id: int
    date: date
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    duration_minutes: int = Field(default=30, ge=1)
    status: str = "pending"


class DayEntryUpdate(BaseModel):
    start_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    duration_minutes: int | None = Field(default=None, ge=1)
    status: str | None = None


class DayEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    item_id: int
    category_id: int
    date: date
    start_time: str
    duration_minutes: int
    status: str
    created_at: datetime


class DayEntryWithDetails(DayEntryRead):
    item: BacklogItemRead
    category: CategoryRead


# ─── Search ───────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    external_id: str
    title: str
    synopsis: str | None = None
    image_url: str | None = None
    total_units: int | None = None
    source: str


# ─── Stats ────────────────────────────────────────────────────────────────────

class CategoryWeeklyStats(BaseModel):
    category: CategoryRead
    goal_minutes: int
    done_minutes: int
    done_count: int
    skipped_count: int
