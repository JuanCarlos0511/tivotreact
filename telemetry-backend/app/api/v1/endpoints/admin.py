from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct, case, and_
from app.api.deps import get_db, verify_admin_key
from app.schemas.analytics import MetricsSummary
from app.services.export import stream_csv, stream_jsonl
from app.models.session import Session
from app.models.event import TelemetryEvent

router = APIRouter(dependencies=[Depends(verify_admin_key)])

@router.get("/metrics", response_model=MetricsSummary)
async def get_metrics(db: AsyncSession = Depends(get_db)):
    """Obtiene un resumen estadístico de la muestra para el investigador."""

    # Total de participantes únicos (con asentimiento)
    total_q = await db.execute(
        select(func.count(distinct(Session.participant_id))).where(Session.has_assent.is_(True))
    )
    total_participants = total_q.scalar_one() or 0

    # Participantes que completaron la sesión
    completed_q = await db.execute(
        select(func.count(distinct(Session.participant_id))).where(
            and_(Session.completed_at.is_not(None), Session.has_assent.is_(True))
        )
    )
    completed_participants = completed_q.scalar_one() or 0

    # Sesiones activas (sin completar)
    active_q = await db.execute(
        select(func.count(Session.id)).where(
            and_(Session.completed_at.is_(None), Session.has_assent.is_(True))
        )
    )
    active_sessions = active_q.scalar_one() or 0

    # Tiempo promedio activo por nivel (milisegundos → segundos)
    avg_time_q = await db.execute(
        select(
            TelemetryEvent.level_id,
            func.avg(TelemetryEvent.active_time_ms),
        )
        .where(
            and_(
                TelemetryEvent.event_type == "CODE_EXECUTION_ATTEMPT",
                TelemetryEvent.active_time_ms.is_not(None),
            )
        )
        .group_by(TelemetryEvent.level_id)
    )
    avg_time_by_level = {
        int(row[0]): round(float(row[1]) / 1000, 2) for row in avg_time_q.all()
    }

    # Tasa de efectividad de pistas de IA
    hint_total_q = await db.execute(
        select(func.count(TelemetryEvent.id)).where(
            TelemetryEvent.ai_hint_effective.is_not(None)
        )
    )
    hint_total = hint_total_q.scalar_one() or 0

    hint_effective_q = await db.execute(
        select(func.count(TelemetryEvent.id)).where(
            TelemetryEvent.ai_hint_effective.is_(True)
        )
    )
    hint_effective = hint_effective_q.scalar_one() or 0

    ai_hint_effectiveness_rate = round(hint_effective / hint_total, 4) if hint_total > 0 else 0.0

    # Tasa de abandono por nivel: participantes que empezaron el nivel pero no lo completaron
    started_q = await db.execute(
        select(
            TelemetryEvent.level_id,
            func.count(distinct(TelemetryEvent.participant_id)),
        )
        .where(TelemetryEvent.event_type == "LEVEL_START")
        .group_by(TelemetryEvent.level_id)
    )
    started_by_level = {int(r[0]): int(r[1]) for r in started_q.all()}

    completed_level_q = await db.execute(
        select(
            TelemetryEvent.level_id,
            func.count(distinct(TelemetryEvent.participant_id)),
        )
        .where(TelemetryEvent.event_type == "LEVEL_COMPLETE")
        .group_by(TelemetryEvent.level_id)
    )
    completed_by_level = {int(r[0]): int(r[1]) for r in completed_level_q.all()}

    dropout_rate_by_level = {}
    for level_id, started in started_by_level.items():
        completed_count = completed_by_level.get(level_id, 0)
        dropout_rate_by_level[level_id] = round(1 - (completed_count / started), 4) if started > 0 else 0.0

    return MetricsSummary(
        total_participants=total_participants,
        completed_participants=completed_participants,
        active_sessions=active_sessions,
        avg_time_by_level=avg_time_by_level,
        ai_hint_effectiveness_rate=ai_hint_effectiveness_rate,
        dropout_rate_by_level=dropout_rate_by_level,
    )

@router.get("/export/csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    """Exporta los datos de telemetría en formato CSV."""
    return StreamingResponse(
        stream_csv(db),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=telemetry_events.csv"}
    )

@router.get("/export/jsonl")
async def export_jsonl(db: AsyncSession = Depends(get_db)):
    """Exporta los datos de telemetría en formato JSON Lines."""
    return StreamingResponse(
        stream_jsonl(db),
        media_type="application/x-ndjson",
        headers={"Content-Disposition": "attachment; filename=telemetry_events.jsonl"}
    )
