import csv
import json
from io import StringIO
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.event import TelemetryEvent
from app.models.session import Session
from app.models.survey import SurveyResponse

def format_csv_row(row: list) -> str:
    """Formatea una fila para CSV."""
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(row)
    return si.getvalue()

async def get_export_query(db: AsyncSession):
    """Ejecuta y retorna el iterador de la consulta."""
    stmt = (
        select(TelemetryEvent, Session, SurveyResponse)
        .join(Session, TelemetryEvent.session_id == Session.id)
        .outerjoin(SurveyResponse, Session.id == SurveyResponse.session_id)
        .order_by(TelemetryEvent.created_at.asc())
    )
    return await db.stream(stmt)

async def stream_csv(db: AsyncSession) -> AsyncGenerator[str, None]:
    """Flujo asíncrono para exportar datos en formato CSV."""
    headers = [
        "participant_id", "condition", "session_id", "event_id", "level_id", "event_type",
        "step_index", "is_success", "attempt_number", "active_time_ms", "idle_time_ms", 
        "error_category", "error_message_snippet", "ai_hint_type", "ai_hint_effective", 
        "autonomy_score", "timestamp", "has_assent", "sus_score",
        "tam_perceived_usefulness", "tam_perceived_ease_of_use", "tam_ai_scaffolding", "tam_ai_trust", "tam_intention_to_use"
    ]
    yield format_csv_row(headers)
    
    stream = await get_export_query(db)
    async for event, session, survey in stream:
        row = [
            session.participant_id,
            session.condition,
            str(session.id),
            str(event.id),
            event.level_id,
            event.event_type,
            event.step_index,
            event.is_success,
            event.attempt_number,
            event.active_time_ms,
            event.idle_time_ms,
            event.error_category,
            event.error_message_snippet,
            event.ai_hint_type,
            event.ai_hint_effective,
            event.autonomy_score,
            event.created_at.isoformat(),
            session.has_assent,
            survey.sus_score if survey else None,
            survey.tam_perceived_usefulness if survey else None,
            survey.tam_perceived_ease_of_use if survey else None,
            survey.tam_ai_scaffolding if survey else None,
            survey.tam_ai_trust if survey else None,
            survey.tam_intention_to_use if survey else None
        ]
        yield format_csv_row(row)

async def stream_jsonl(db: AsyncSession) -> AsyncGenerator[str, None]:
    """Flujo asíncrono para exportar datos en formato JSON Lines."""
    stream = await get_export_query(db)
    async for event, session, survey in stream:
        data = {
            "participant_id": session.participant_id,
            "condition": session.condition,
            "session_id": str(session.id),
            "event_id": str(event.id),
            "level_id": event.level_id,
            "event_type": event.event_type,
            "step_index": event.step_index,
            "is_success": event.is_success,
            "attempt_number": event.attempt_number,
            "active_time_ms": event.active_time_ms,
            "idle_time_ms": event.idle_time_ms,
            "error_category": event.error_category,
            "error_message_snippet": event.error_message_snippet,
            "ai_hint_type": event.ai_hint_type,
            "ai_hint_effective": event.ai_hint_effective,
            "autonomy_score": event.autonomy_score,
            "timestamp": event.created_at.isoformat(),
            "has_assent": session.has_assent,
            "sus_score": survey.sus_score if survey else None,
            "tam_perceived_usefulness": survey.tam_perceived_usefulness if survey else None,
            "tam_perceived_ease_of_use": survey.tam_perceived_ease_of_use if survey else None,
            "tam_ai_scaffolding": survey.tam_ai_scaffolding if survey else None,
            "tam_ai_trust": survey.tam_ai_trust if survey else None,
            "tam_intention_to_use": survey.tam_intention_to_use if survey else None
        }
        yield json.dumps(data) + "\n"
