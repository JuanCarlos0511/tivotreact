import uuid
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, ForeignKey, func, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from app.db.base import Base

class SurveyResponse(Base):
    """Modelo para respuestas de la encuesta final."""
    __tablename__ = "survey_responses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), unique=True)
    participant_id: Mapped[str] = mapped_column(String(64), index=True)
    
    sus_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tam_perceived_usefulness: Mapped[float] = mapped_column(Float)
    tam_perceived_ease_of_use: Mapped[float] = mapped_column(Float)
    tam_ai_scaffolding: Mapped[float] = mapped_column(Float)
    tam_ai_trust: Mapped[float] = mapped_column(Float)
    tam_intention_to_use: Mapped[float] = mapped_column(Float)
    
    raw_answers: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON().with_variant(JSONB(), "postgresql"), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(server_default=func.now())

    session: Mapped["Session"] = relationship("Session", back_populates="survey")
