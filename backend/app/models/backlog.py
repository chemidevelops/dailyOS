import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CategoryType(str, enum.Enum):
    series   = "series"
    anime    = "anime"
    manga    = "manga"
    book     = "book"
    game     = "game"
    podcast  = "podcast"
    magazine = "magazine"
    other    = "other"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#6366f1")
    icon: Mapped[str] = mapped_column(String(10), nullable=False, default="📺")
    type: Mapped[CategoryType] = mapped_column(String(20), nullable=False, default=CategoryType.other)
    weekly_goal_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items: Mapped[list["BacklogItem"]] = relationship("BacklogItem", back_populates="category", cascade="all, delete-orphan")
    day_entries: Mapped[list["DayEntry"]] = relationship("DayEntry", back_populates="category")


class BacklogItemStatus(str, enum.Enum):
    active = "active"
    queued = "queued"
    done   = "done"


class BacklogItem(Base):
    __tablename__ = "backlog_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    synopsis: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[BacklogItemStatus] = mapped_column(String(20), nullable=False, default=BacklogItemStatus.queued)
    total_units: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_unit: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_label: Mapped[str | None] = mapped_column(String(50), nullable=True)
    session_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category: Mapped[Category] = relationship("Category", back_populates="items")
    day_entries: Mapped[list["DayEntry"]] = relationship("DayEntry", back_populates="item")


class DayEntryStatus(str, enum.Enum):
    pending = "pending"
    done    = "done"
    skipped = "skipped"


class DayEntry(Base):
    __tablename__ = "day_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(Integer, ForeignKey("backlog_items.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str] = mapped_column(String(5), nullable=False, default="18:00")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    status: Mapped[DayEntryStatus] = mapped_column(String(20), nullable=False, default=DayEntryStatus.pending)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    item: Mapped[BacklogItem] = relationship("BacklogItem", back_populates="day_entries")
    category: Mapped[Category] = relationship("Category", back_populates="day_entries")
