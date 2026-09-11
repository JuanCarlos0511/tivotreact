from datetime import datetime, timezone
from typing import Any
import uuid

from sqlalchemy import insert, select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import TelemetryEvent
from app.models.session import Session
from app.models.survey import SurveyResponse
from app.schemas.telemetry import SessionCreate, SurveyCreate, TelemetryEventCreate


def calculate_sus(answers: list[int]) -> float:
    """Calcula SUS en escala 0..100 (ítems pares invertidos)."""
    contribution = sum((answer - 1) if index % 2 == 0 else (5 - answer) for index, answer in enumerate(answers))
    return contribution * 2.5


async def create_session(db: AsyncSession, data: SessionCreate) -> Session:
    """Crea la sesión usando el UUID del cliente; repetir la petición es seguro."""
    existing = await db.get(Session, data.session_id)
    if existing:
        return existing
    session = Session(
        id=data.session_id,
        participant_id=data.participant_id,
        condition=data.condition,
        has_assent=data.has_assent,
        started_at=data.entry_timestamp,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def _recover_session(db: AsyncSession, session_id: uuid.UUID, events: list[TelemetryEventCreate]) -> Session | None:
    session = await db.get(Session, session_id)
    if session:
        return session
    start = next((event for event in events if event.session_id == session_id and event.event_type == "session_started"), None)
    if not start:
        return None
    payload = start.payload or {}
    session = Session(
        id=session_id,
        participant_id=start.participant_id,
        condition=str(payload.get("condition") or "standard")[:64],
        has_assent=True,
        started_at=start.timestamp,
    )
    db.add(session)
    await db.flush()
    return session


def _survey_from_event(event: TelemetryEventCreate) -> SurveyCreate | None:
    payload = event.payload or {}
    raw = payload.get("answers")
    if not isinstance(raw, dict):
        return None
    try:
        return SurveyCreate(session_id=event.session_id, participant_id=event.participant_id, raw_answers=raw, **raw)
    except (TypeError, ValueError):
        return None


async def ingest_batch(db: AsyncSession, events: list[TelemetryEventCreate]) -> tuple[int, int]:
    """Ingesta idempotente; eventos repetidos conservan el mismo event_id."""
    if not events:
        return 0, 0

    sessions: dict[uuid.UUID, Session] = {}
    for session_id in {event.session_id for event in events}:
        session = await _recover_session(db, session_id, events)
        if session:
            sessions[session_id] = session

    existing_result = await db.execute(
        select(TelemetryEvent.id).where(TelemetryEvent.id.in_([event.event_id for event in events]))
    )
    existing_ids = set(existing_result.scalars().all())
    event_rows: list[dict[str, Any]] = []
    surveys: list[SurveyCreate] = []

    for event in events:
        session = sessions.get(event.session_id)
        if not session or not session.has_assent or session.participant_id != event.participant_id:
            continue
        if event.event_id not in existing_ids:
            values = event.model_dump(exclude={"event_id", "timestamp"})
            event_rows.append({"id": event.event_id, "created_at": event.timestamp, **values})
        if event.event_type == "level_completed" and event.level_id == 4:
            session.completed_at = event.timestamp
        if event.event_type == "survey_submitted":
            survey = _survey_from_event(event)
            if survey:
                surveys.append(survey)

    await db.flush()
    stored = 0
    if event_rows:
        dialect = db.get_bind().dialect.name
        if dialect == "postgresql":
            statement = postgresql_insert(TelemetryEvent).values(event_rows).on_conflict_do_nothing(index_elements=["id"])
        elif dialect == "sqlite":
            statement = sqlite_insert(TelemetryEvent).values(event_rows).on_conflict_do_nothing(index_elements=["id"])
        else:
            statement = insert(TelemetryEvent).values(event_rows)
        result = await db.execute(statement)
        stored = max(result.rowcount or 0, 0)
    for survey in surveys:
        await _upsert_survey(db, survey)
    await db.commit()
    return len(events), stored


async def _upsert_survey(db: AsyncSession, data: SurveyCreate) -> SurveyResponse:
    participant_id = data.participant_id
    if not participant_id:
        participant_id = await db.scalar(select(Session.participant_id).where(Session.id == data.session_id))
    participant_id = participant_id or "ANONYMOUS"
    raw = data.raw_answers or data.model_dump(exclude={"session_id", "participant_id", "raw_answers"})
    survey = await db.scalar(select(SurveyResponse).where(SurveyResponse.session_id == data.session_id))
    values: dict[str, Any] = {
        "participant_id": participant_id,
        "tam_perceived_usefulness": data.tam_perceived_usefulness,
        "tam_perceived_ease_of_use": data.tam_perceived_ease_of_use,
        "tam_ai_scaffolding": data.tam_ai_scaffolding,
        "tam_ai_trust": data.tam_ai_trust,
        "tam_intention_to_use": data.tam_intention_to_use,
        "sus_score": calculate_sus(data.sus),
        "raw_answers": raw,
        "submitted_at": datetime.now(timezone.utc),
    }
    if survey:
        for key, value in values.items():
            setattr(survey, key, value)
    else:
        survey = SurveyResponse(session_id=data.session_id, **values)
        db.add(survey)
    await db.flush()
    return survey


async def create_survey(db: AsyncSession, data: SurveyCreate) -> SurveyResponse:
    survey = await _upsert_survey(db, data)
    await db.commit()
    await db.refresh(survey)
    return survey
