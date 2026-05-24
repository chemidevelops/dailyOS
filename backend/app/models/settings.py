import enum
from datetime import datetime, time

from sqlalchemy import Boolean, DateTime, Integer, String, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    work_start: Mapped[str] = mapped_column(String(5), default="09:00")   # "HH:MM"
    work_end: Mapped[str] = mapped_column(String(5), default="17:30")
    work_days: Mapped[str] = mapped_column(String(20), default="1,2,3,4,5")  # Mon=1..Sun=7
    sleep_start: Mapped[str] = mapped_column(String(5), default="23:00")
    sleep_end: Mapped[str] = mapped_column(String(5), default="07:30")
    onboarding_done: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
