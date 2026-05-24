import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HabitCategory(str, enum.Enum):
    health = "health"
    learning = "learning"
    mindfulness = "mindfulness"
    productivity = "productivity"


class HabitLogStatus(str, enum.Enum):
    done = "done"
    skipped = "skipped"
    pending = "pending"


class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#6366f1")
    target_per_week: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    category: Mapped[HabitCategory] = mapped_column(
        Enum(HabitCategory), nullable=False, default=HabitCategory.productivity
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    logs: Mapped[list["HabitLog"]] = relationship(
        "HabitLog", back_populates="habit", cascade="all, delete-orphan"
    )


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    habit_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[HabitLogStatus] = mapped_column(
        Enum(HabitLogStatus), nullable=False, default=HabitLogStatus.pending
    )

    habit: Mapped["Habit"] = relationship("Habit", back_populates="logs")
