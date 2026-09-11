from pydantic import BaseModel, Field, ConfigDict, StringConstraints
from typing import Optional, Any, Literal, List
from datetime import datetime
import uuid
from typing_extensions import Annotated

ParticipantId = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_-]{3,20}$")]

class SessionCreate(BaseModel):
    """Esquema para la creación de una nueva sesión."""
    participant_id: ParticipantId
    group_id: Optional[str] = None
    has_assent: bool
    screen_resolution: Optional[str] = None
    user_agent: Optional[str] = None

class SessionResponse(BaseModel):
    """Respuesta al crear o consultar una sesión."""
    id: uuid.UUID
    participant_id: str
    started_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TelemetryEventCreate(BaseModel):
    """Esquema para un evento individual de telemetría."""
    session_id: uuid.UUID
    participant_id: str
    level_id: int = Field(ge=1, le=99)
    step_index: Optional[int] = None
    event_type: str  # Could be restricted to a Literal union if needed
    is_success: Optional[bool] = None
    attempt_number: Optional[int] = None
    active_time_ms: Optional[int] = None
    idle_time_ms: Optional[int] = None
    error_category: Optional[str] = None
    error_message_snippet: Optional[str] = Field(None, max_length=250)
    ai_hint_type: Optional[str] = None
    ai_hint_effective: Optional[bool] = None
    autonomy_score: Optional[float] = None
    payload: Optional[dict[str, Any]] = None
    created_at: datetime

class TelemetryBatchRequest(BaseModel):
    """Esquema para la ingesta en lote de eventos."""
    events: List[TelemetryEventCreate] = Field(min_length=1, max_length=100)

class TelemetryBatchResponse(BaseModel):
    """Respuesta tras procesar un lote de eventos."""
    received: int
    stored: int

class SurveyCreate(BaseModel):
    """Esquema para la creación de la encuesta final."""
    session_id: uuid.UUID
    participant_id: Optional[str] = None
    tam_perceived_usefulness: float = Field(ge=1.0, le=5.0)
    tam_perceived_ease_of_use: float = Field(ge=1.0, le=5.0)
    tam_ai_trust: float = Field(ge=1.0, le=5.0)
    raw_answers: Optional[dict[str, Any]] = None

class SurveyResponse_(BaseModel):
    """Respuesta al crear una encuesta."""
    id: uuid.UUID
    sus_score: Optional[float]
    submitted_at: datetime
    model_config = ConfigDict(from_attributes=True)
