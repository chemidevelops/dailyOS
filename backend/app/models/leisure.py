import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LeisureType(str, enum.Enum):
    game = "game"
    anime = "anime"
    book = "book"
    series = "series"


class LeisureStatus(str, enum.Enum):
    playing = "playing"
    pending = "pending"
    done = "done"
    dropped = "dropped"


class LeisureItem(Base):
    __tablename__ = "leisure_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[LeisureType] = mapped_column(Enum(LeisureType), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#10b981")
    status: Mapped[LeisureStatus] = mapped_column(
        Enum(LeisureStatus), nullable=False, default=LeisureStatus.pending
    )
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    progress_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    total_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    subtitle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
