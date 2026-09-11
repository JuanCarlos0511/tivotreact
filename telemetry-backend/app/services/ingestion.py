from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
from typing import Tuple
from app.models.session import Session
from app.models.event import TelemetryEvent
from app.models.survey import SurveyResponse
from app.schemas.telemetry import SessionCreate, TelemetryEventCreate, SurveyCreate

async def create_session(db: AsyncSession, data: SessionCreate) -> Session:
    """Crea una nueva sesión."""
    new_session = Session(**data.model_dump())
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    return new_session

async def ingest_batch(db: AsyncSession, events: list[TelemetryEventCreate]) -> Tuple[int, int]:
    """Ingesta un lote de eventos, descartándolos si el participante no dio su asentimiento."""
    if not events:
        return 0, 0

    session_id = events[0].session_id
    result = await db.execute(select(Session.has_assent).where(Session.id == session_id))
    has_assent = result.scalar_one_or_none()

    if not has_assent:
        return len(events), 0

    event_dicts = [event.model_dump() for event in events]
    
    await db.execute(insert(TelemetryEvent), event_dicts)
    await db.commit()

    return len(events), len(events)

async def create_survey(db: AsyncSession, data: SurveyCreate) -> SurveyResponse:
    """Crea una encuesta y calcula el SUS score si es posible."""
    participant_id = data.participant_id
    if not participant_id:
        res = await db.execute(select(Session.participant_id).where(Session.id == data.session_id))
        participant_id = res.scalar_one_or_none() or "ANONYMOUS"

    raw = data.raw_answers or {}
    sus_score = None
    
    if raw:
        sus_answers = raw.get("sus", [])
        if isinstance(sus_answers, list) and len(sus_answers) == 10:
            score = 0.0
            for i, ans in enumerate(sus_answers):
                val = float(ans)
                if i % 2 == 0:
                    score += (val - 1)
                else:
                    score += (5 - val)
            sus_score = score * 2.5

    new_survey = SurveyResponse(
        session_id=data.session_id,
        participant_id=participant_id,
        tam_perceived_usefulness=data.tam_perceived_usefulness,
        tam_perceived_ease_of_use=data.tam_perceived_ease_of_use,
        tam_ai_trust=data.tam_ai_trust,
        sus_score=sus_score,
        raw_answers=raw
    )
    db.add(new_survey)
    await db.commit()
    await db.refresh(new_survey)
    return new_survey
