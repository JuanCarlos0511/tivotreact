from typing import Any
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

class Base(DeclarativeBase):
    """Clase base para todos los modelos de SQLAlchemy."""
    
    type_annotation_map = {
        dict[str, Any]: JSON().with_variant(JSONB(), "postgresql"),
        dict: JSON().with_variant(JSONB(), "postgresql")
    }

# Import all models here so Alembic can see them when scanning Base.metadata
from app.models.participant import Participant
from app.models.session import Session
from app.models.event import TelemetryEvent
from app.models.survey import SurveyResponse
