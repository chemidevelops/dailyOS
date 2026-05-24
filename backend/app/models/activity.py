import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    activity_id: Mapped[int] = mapped_column(Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    item_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("items.id", ondelete="SET NULL"), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="done")  # done | skipped

    activity: Mapped["Activity"] = relationship("Activity", back_populates="logs")


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#6366f1")
    target_per_week: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    logs: Mapped[list[ActivityLog]] = relationship("ActivityLog", back_populates="activity", cascade="all, delete-orphan")
    items: Mapped[list["Item"]] = relationship("Item", back_populates="activity", cascade="all, delete-orphan")


class ItemStatus(str, enum.Enum):
    active  = "active"    # currently consuming
    pending = "pending"   # in the backlog
    done    = "done"      # finished
    dropped = "dropped"   # abandoned


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    activity_id: Mapped[int] = mapped_column(Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ItemStatus] = mapped_column(Enum(ItemStatus), nullable=False, default=ItemStatus.pending)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)   # 0–100
    progress_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)          # 1–5
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    activity: Mapped[Activity] = relationship("Activity", back_populates="items")
