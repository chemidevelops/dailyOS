from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserSettingsBase(BaseModel):
    work_start: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")
    work_end: str = Field(default="17:30", pattern=r"^\d{2}:\d{2}$")
    work_days: str = Field(default="1,2,3,4,5")
    sleep_start: str = Field(default="23:00", pattern=r"^\d{2}:\d{2}$")
    sleep_end: str = Field(default="07:30", pattern=r"^\d{2}:\d{2}$")
    onboarding_done: bool = False
    max_fill_pct: int = Field(default=80, ge=10, le=100)
    plan_order: str | None = None
    vacation_dates: str | None = None


class UserSettingsUpdate(BaseModel):
    work_start: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    work_end: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    work_days: str | None = None
    sleep_start: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    sleep_end: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    onboarding_done: bool | None = None
    max_fill_pct: int | None = Field(default=None, ge=10, le=100)
    plan_order: str | None = None
    vacation_dates: str | None = None


class UserSettingsRead(UserSettingsBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
