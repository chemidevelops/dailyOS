from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.leisure import LeisureStatus, LeisureType


class LeisureBase(BaseModel):
    title: str = Field(..., max_length=255)
    type: LeisureType
    color: str = Field(default="#10b981", max_length=20)
    status: LeisureStatus = LeisureStatus.pending
    progress: int = Field(default=0, ge=0, le=100)
    progress_label: str | None = Field(default=None, max_length=100)
    total_hours: float | None = Field(default=None, ge=0)
    rating: int | None = Field(default=None, ge=1, le=5)
    subtitle: str | None = Field(default=None, max_length=255)


class LeisureCreate(LeisureBase):
    pass


class LeisureUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    type: LeisureType | None = None
    color: str | None = Field(default=None, max_length=20)
    status: LeisureStatus | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    progress_label: str | None = Field(default=None, max_length=100)
    total_hours: float | None = Field(default=None, ge=0)
    rating: int | None = Field(default=None, ge=1, le=5)
    subtitle: str | None = Field(default=None, max_length=255)


class LeisureProgressUpdate(BaseModel):
    progress: int = Field(..., ge=0, le=100)
    progress_label: str | None = Field(default=None, max_length=100)
    status: LeisureStatus | None = None


class LeisureRead(LeisureBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
