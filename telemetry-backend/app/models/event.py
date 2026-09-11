import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, ForeignKey, func, Integer, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from app.db.base import Base

class TelemetryEvent(Base):
    """Modelo de evento de telemetría."""
    __tablename__ = "telemetry_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), index=True)
    participant_id: Mapped[str] = mapped_column(String(64), index=True)
    level_id: Mapped[int] = mapped_column(Integer, index=True)
    step_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    
    is_success: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    attempt_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    active_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    idle_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    error_category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    error_message_snippet: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    
    ai_hint_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    ai_hint_effective: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    autonomy_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    session: Mapped["Session"] = relationship("Session", back_populates="events")
