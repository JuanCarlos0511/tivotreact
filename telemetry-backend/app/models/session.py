import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Session(Base):
    """Modelo de sesión para participantes."""
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("participants.anonymous_code", ondelete="RESTRICT"),
        index=True,
    )
    condition: Mapped[str] = mapped_column(String(64), index=True, default="standard")
    has_assent: Mapped[bool] = mapped_column(default=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    participant: Mapped["Participant"] = relationship(
        "Participant",
        back_populates="sessions",
    )
    events: Mapped[List["TelemetryEvent"]] = relationship(
        "TelemetryEvent", back_populates="session", cascade="all, delete-orphan"
    )
    survey: Mapped[Optional["SurveyResponse"]] = relationship(
        "SurveyResponse", back_populates="session", uselist=False, cascade="all, delete-orphan"
    )
