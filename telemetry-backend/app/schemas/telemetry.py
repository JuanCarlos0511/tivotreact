from datetime import datetime
from typing import Any, Literal
import uuid

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from typing_extensions import Annotated

ParticipantId = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9_-]{3,32}$")]
EventType = Literal[
    "session_started",
    "level_started",
    "code_run",
    "syntax_error",
    "ai_hint_requested",
    "level_completed",
    "idle_detected",
    "survey_submitted",
]
Likert = Annotated[int, Field(ge=1, le=5)]


class SessionCreate(BaseModel):
    """Sesión anónima generada por el cliente; no admite campos de PII."""

    session_id: uuid.UUID
    participant_id: ParticipantId
    entry_timestamp: datetime
    condition: str = Field(default="standard", min_length=1, max_length=64)
    has_assent: bool


class SessionResponse(BaseModel):
    session_id: uuid.UUID = Field(validation_alias="id")
    participant_id: str
    entry_timestamp: datetime = Field(validation_alias="started_at")
    condition: str
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TelemetryEventCreate(BaseModel):
    event_id: uuid.UUID
    session_id: uuid.UUID
    participant_id: ParticipantId
    level_id: int = Field(ge=0, le=99)
    event_type: EventType
    payload: dict[str, Any] | None = None
    timestamp: datetime
    step_index: int | None = None
    is_success: bool | None = None
    attempt_number: int | None = Field(default=None, ge=1)
    active_time_ms: int | None = Field(default=None, ge=0)
    idle_time_ms: int | None = Field(default=None, ge=0)
    error_category: str | None = Field(default=None, max_length=64)
    error_message_snippet: str | None = Field(default=None, max_length=250)
    ai_hint_type: str | None = Field(default=None, max_length=64)
    ai_hint_effective: bool | None = None
    autonomy_score: float | None = None


class TelemetryBatchRequest(BaseModel):
    events: list[TelemetryEventCreate] = Field(min_length=1, max_length=100)


class TelemetryBatchResponse(BaseModel):
    received: int
    stored: int


class SurveyCreate(BaseModel):
    session_id: uuid.UUID
    participant_id: ParticipantId | None = None
    tam_perceived_usefulness: Likert
    tam_perceived_ease_of_use: Likert
    tam_ai_scaffolding: Likert
    tam_ai_trust: Likert
    tam_intention_to_use: Likert
    sus: list[Likert] = Field(min_length=10, max_length=10)
    raw_answers: dict[str, Any] | None = None


class SurveyResponse_(BaseModel):
    id: uuid.UUID
    sus_score: float | None
    submitted_at: datetime
    model_config = ConfigDict(from_attributes=True)
