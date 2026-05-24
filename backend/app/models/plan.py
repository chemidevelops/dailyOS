import enum
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PlannedItemType(str, enum.Enum):
    habit = "habit"
    task = "task"
    leisure = "leisure"


class DailyPlan(Base):
    __tablename__ = "daily_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)
    energy_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    total_free_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    items: Mapped[list["PlannedItem"]] = relationship(
        "PlannedItem", back_populates="plan", cascade="all, delete-orphan", order_by="PlannedItem.order"
    )


class PlannedItem(Base):
    __tablename__ = "planned_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("daily_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item_type: Mapped[PlannedItemType] = mapped_column(Enum(PlannedItemType), nullable=False)
    item_id: Mapped[int] = mapped_column(Integer, nullable=False)
    suggested_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    suggested_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    plan: Mapped["DailyPlan"] = relationship("DailyPlan", back_populates="items")
