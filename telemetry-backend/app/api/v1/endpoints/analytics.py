from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct, and_, case
from typing import Literal, Optional, List
import numpy as np

from app.api.deps import get_db, verify_admin_key
from app.models.session import Session
from app.models.event import TelemetryEvent
from app.models.survey import SurveyResponse
from app.services.export import stream_csv, stream_json, stream_jsonl

router = APIRouter(dependencies=[Depends(verify_admin_key)])

@router.get("/overview")
async def get_analytics_overview(
    condition: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Resumen general de KPIs para el Dashboard del Investigador."""
    base_session_filter = [Session.has_assent.is_(True)]
    if condition and condition != "Todos":
        base_session_filter.append(Session.condition == condition)

    # Total participantes
    total_q = await db.execute(
        select(func.count(distinct(Session.participant_id))).where(and_(*base_session_filter))
    )
    total_participants = total_q.scalar_one() or 0

    # Finalizados
    completed_q = await db.execute(
        select(func.count(distinct(Session.participant_id))).where(
            and_(*base_session_filter, Session.completed_at.is_not(None))
        )
    )
    completed_participants = completed_q.scalar_one() or 0

    # Activos
    active_sessions = total_participants - completed_participants
    completion_rate = round((completed_participants / total_participants * 100), 1) if total_participants > 0 else 0.0

    # Tiempo N1 vs N4
    time_lvl1_q = await db.execute(
        select(func.avg(TelemetryEvent.active_time_ms))
        .join(Session, TelemetryEvent.session_id == Session.id)
        .where(and_(*base_session_filter, TelemetryEvent.level_id == 1, TelemetryEvent.event_type == "level_completed"))
    )
    avg_t1 = (time_lvl1_q.scalar_one() or 0) / 1000

    time_lvl4_q = await db.execute(
        select(func.avg(TelemetryEvent.active_time_ms))
        .join(Session, TelemetryEvent.session_id == Session.id)
        .where(and_(*base_session_filter, TelemetryEvent.level_id == 4, TelemetryEvent.event_type == "level_completed"))
    )
    avg_t4 = (time_lvl4_q.scalar_one() or 0) / 1000

    time_reduction_pct = round(((avg_t1 - avg_t4) / avg_t1 * 100), 1) if avg_t1 > 0 else 0.0

    # Puntuación SUS promedio
    sus_q = await db.execute(
        select(func.avg(SurveyResponse.sus_score))
        .join(Session, SurveyResponse.session_id == Session.id)
        .where(and_(*base_session_filter, SurveyResponse.sus_score.is_not(None)))
    )
    avg_sus = round(float(sus_q.scalar_one() or 0.0), 1)

    # Abandono por nivel
    dropout_by_level = {}
    for lvl in range(1, 5):
        started_q = await db.execute(
            select(func.count(distinct(TelemetryEvent.participant_id)))
            .join(Session, TelemetryEvent.session_id == Session.id)
            .where(and_(*base_session_filter, TelemetryEvent.level_id == lvl, TelemetryEvent.event_type == "level_started"))
        )
        started = started_q.scalar_one() or 0

        done_q = await db.execute(
            select(func.count(distinct(TelemetryEvent.participant_id)))
            .join(Session, TelemetryEvent.session_id == Session.id)
            .where(and_(*base_session_filter, TelemetryEvent.level_id == lvl, TelemetryEvent.event_type == "level_completed"))
        )
        done = done_q.scalar_one() or 0
        dropout_by_level[lvl] = round((1 - (done / started)) * 100, 1) if started > 0 else 0.0

    return {
        "total_participants": total_participants,
        "completed_participants": completed_participants,
        "active_sessions": active_sessions,
        "completion_rate": completion_rate,
        "avg_time_level_1_s": round(avg_t1, 1),
        "avg_time_level_4_s": round(avg_t4, 1),
        "time_reduction_pct": time_reduction_pct,
        "avg_sus_score": avg_sus,
        "sus_acceptable_threshold": 68.0,
        "dropout_rate_by_level": dropout_by_level,
    }

@router.get("/learning-curve")
async def get_learning_curve(
    condition: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Datos para la gráfica de curva de aprendizaje (tiempos e intentos por nivel)."""
    base_filter = [Session.has_assent.is_(True)]
    if condition and condition != "Todos":
        base_filter.append(Session.condition == condition)

    levels_data = []
    for lvl in range(1, 5):
        # Intentos por participante en este nivel
        attempts_q = await db.execute(
            select(func.max(TelemetryEvent.attempt_number))
            .join(Session, TelemetryEvent.session_id == Session.id)
            .where(and_(*base_filter, TelemetryEvent.level_id == lvl, TelemetryEvent.attempt_number.is_not(None)))
            .group_by(TelemetryEvent.participant_id)
        )
        attempts_list = [r[0] for r in attempts_q.all() if r[0] is not None]

        # Tiempos activos en LEVEL_COMPLETE
        times_q = await db.execute(
            select(TelemetryEvent.active_time_ms)
            .join(Session, TelemetryEvent.session_id == Session.id)
            .where(and_(*base_filter, TelemetryEvent.level_id == lvl, TelemetryEvent.event_type == "level_completed", TelemetryEvent.active_time_ms.is_not(None)))
        )
        times_list = [(r[0] / 1000) for r in times_q.all() if r[0] is not None]

        # First-try success
        first_try_q = await db.execute(
            select(func.count(distinct(TelemetryEvent.participant_id)))
            .join(Session, TelemetryEvent.session_id == Session.id)
            .where(and_(*base_filter, TelemetryEvent.level_id == lvl, TelemetryEvent.event_type == "level_completed", TelemetryEvent.attempt_number == 1))
        )
        first_try_count = first_try_q.scalar_one() or 0
        total_finished = len(times_list)
        first_try_pct = round((first_try_count / total_finished * 100), 1) if total_finished > 0 else 0.0

        levels_data.append({
            "level_id": lvl,
            "level_name": f"Nivel {lvl}",
            "median_attempts": float(np.median(attempts_list)) if attempts_list else 1.0,
            "mean_attempts": round(float(np.mean(attempts_list)), 2) if attempts_list else 1.0,
            "median_time_s": round(float(np.median(times_list)), 1) if times_list else 0.0,
            "mean_time_s": round(float(np.mean(times_list)), 1) if times_list else 0.0,
            "first_try_success_pct": first_try_pct,
            "sample_size": len(attempts_list),
        })

    return levels_data

@router.get("/scaffolding")
@router.get("/scaffolding-efficacy")
async def get_scaffolding_efficacy(
    condition: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Eficacia de las pistas del tutor IA por tipo de asistencia."""
    base_filter = [Session.has_assent.is_(True), TelemetryEvent.ai_hint_type.is_not(None)]
    if condition and condition != "Todos":
        base_filter.append(Session.condition == condition)

    hint_types = ["Conceptual", "Corrección de Sintaxis", "Solución Directa"]
    results = []

    for ht in hint_types:
        total_q = await db.execute(
            select(func.count(TelemetryEvent.id))
            .join(Session, TelemetryEvent.session_id == Session.id)
            .where(and_(*base_filter, TelemetryEvent.ai_hint_type == ht, TelemetryEvent.ai_hint_effective.is_not(None)))
        )
        total = total_q.scalar_one() or 0

        effective_q = await db.execute(
            select(func.count(TelemetryEvent.id))
            .join(Session, TelemetryEvent.session_id == Session.id)
            .where(and_(*base_filter, TelemetryEvent.ai_hint_type == ht, TelemetryEvent.ai_hint_effective.is_(True)))
        )
        effective = effective_q.scalar_one() or 0

        efficacy_rate = round((effective / total * 100), 1) if total > 0 else 0.0

        results.append({
            "hint_type": ht,
            "total_requested": total,
            "effective_count": effective,
            "ineffective_count": total - effective,
            "efficacy_pct": efficacy_rate,
        })

    return results

@router.get("/errors")
@router.get("/error-taxonomy")
async def get_error_taxonomy(
    condition: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Frecuencias acumuladas de taxonomía de errores en Tivot."""
    base_filter = [Session.has_assent.is_(True), TelemetryEvent.error_category.is_not(None)]
    if condition and condition != "Todos":
        base_filter.append(Session.condition == condition)

    q = await db.execute(
        select(TelemetryEvent.error_category, func.count(TelemetryEvent.id))
        .join(Session, TelemetryEvent.session_id == Session.id)
        .where(and_(*base_filter))
        .group_by(TelemetryEvent.error_category)
    )
    rows = q.all()
    total_errors = sum(r[1] for r in rows)

    taxonomy = [
        {
            "category": r[0],
            "label": {
                "SYNTAX_ERROR": "Error de Sintaxis",
                "LOGIC_BUSINESS_RULE": "Lógica / Regla POS",
                "INCOMPLETE_ALGORITHM": "Algoritmo Incompleto",
                "RUNTIME_EXCEPTION": "Excepción de Ejecución",
            }.get(r[0], r[0]),
            "count": r[1],
            "percentage": round((r[1] / total_errors * 100), 1) if total_errors > 0 else 0.0,
        }
        for r in rows
    ]

    return {"total_errors": total_errors, "categories": taxonomy}

@router.get("/surveys")
@router.get("/survey-summary")
async def get_survey_summary(
    condition: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Estadísticos descriptivos y frecuencias de la encuesta TAM y escala SUS."""
    base_filter = [Session.has_assent.is_(True)]
    if condition and condition != "Todos":
        base_filter.append(Session.condition == condition)

    q = await db.execute(
        select(SurveyResponse)
        .join(Session, SurveyResponse.session_id == Session.id)
        .where(and_(*base_filter))
    )
    surveys = q.scalars().all()

    if not surveys:
        return {
            "sample_size": 0,
            "tam": {},
            "sus": {"mean": 0.0, "distribution": []},
        }

    pu_vals = [s.tam_perceived_usefulness for s in surveys if s.tam_perceived_usefulness]
    peou_vals = [s.tam_perceived_ease_of_use for s in surveys if s.tam_perceived_ease_of_use]
    scaffolding_vals = [s.tam_ai_scaffolding for s in surveys if s.tam_ai_scaffolding]
    trust_vals = [s.tam_ai_trust for s in surveys if s.tam_ai_trust]
    intention_vals = [s.tam_intention_to_use for s in surveys if s.tam_intention_to_use]
    sus_vals = [s.sus_score for s in surveys if s.sus_score is not None]

    def summarize_metric(vals, label):
        arr = np.array(vals) if vals else np.array([0])
        dist = {i: sum(1 for v in vals if round(v) == i) for i in range(1, 6)}
        return {
            "label": label,
            "mean": round(float(np.mean(arr)), 2),
            "std": round(float(np.std(arr)), 2),
            "distribution": dist,
        }

    return {
        "sample_size": len(surveys),
        "tam": {
            "perceived_usefulness": summarize_metric(pu_vals, "Utilidad Percibida (TAM-PU)"),
            "perceived_ease_of_use": summarize_metric(peou_vals, "Facilidad de Uso (TAM-PEOU)"),
            "ai_scaffolding": summarize_metric(scaffolding_vals, "Apoyo Percibido del Tutor IA"),
            "ai_trust": summarize_metric(trust_vals, "Confianza en el Tutor IA"),
            "intention_to_use": summarize_metric(intention_vals, "Intención de Uso"),
        },
        "sus": {
            "mean": round(float(np.mean(sus_vals)), 1) if sus_vals else 0.0,
            "acceptable_pct": round(sum(1 for v in sus_vals if v >= 68) / len(sus_vals) * 100, 1) if sus_vals else 0.0,
            "distribution": [round(v, 1) for v in sus_vals],
        },
    }

@router.get("/participants")
async def get_participants_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    condition: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Lista paginada de participantes anonimizados para el panel de investigación."""
    base_filter = []
    if condition and condition != "Todos":
        base_filter.append(Session.condition == condition)

    total_q = await db.execute(
        select(func.count(distinct(Session.participant_id))).where(and_(*base_filter) if base_filter else True)
    )
    total = total_q.scalar_one() or 0

    sessions_q = await db.execute(
        select(Session)
        .where(and_(*base_filter) if base_filter else True)
        .order_by(Session.started_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    sessions = sessions_q.scalars().all()

    items = []
    for s in sessions:
        # Max level reached
        max_lvl_q = await db.execute(
            select(func.max(TelemetryEvent.level_id)).where(TelemetryEvent.session_id == s.id)
        )
        max_lvl = max_lvl_q.scalar_one() or 1

        # Total active time
        time_q = await db.execute(
            select(func.sum(TelemetryEvent.active_time_ms)).where(
                and_(TelemetryEvent.session_id == s.id, TelemetryEvent.event_type == "level_completed")
            )
        )
        total_time_ms = time_q.scalar_one() or 0

        # Total hints requested
        hints_q = await db.execute(
            select(func.count(TelemetryEvent.id)).where(
                and_(TelemetryEvent.session_id == s.id, TelemetryEvent.event_type == "ai_hint_requested")
            )
        )
        hints_count = hints_q.scalar_one() or 0

        items.append({
            "id": str(s.id),
            "participant_id": s.participant_id,
            "condition": s.condition,
            "has_assent": s.has_assent,
            "max_level": max_lvl,
            "total_active_time_s": round(total_time_ms / 1000, 1),
            "total_hints_used": hints_count,
            "status": "Finalizado" if s.completed_at else "En progreso",
            "started_at": s.started_at.isoformat() if s.started_at else None,
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": int(np.ceil(total / page_size)) if total > 0 else 1,
        "items": items,
    }


@router.get("/export")
async def export_analytics_dataset(
    format: Literal["csv", "json", "jsonl"] = Query("csv"),
    db: AsyncSession = Depends(get_db),
):
    """Punto único de exportación CSV/JSON para integraciones externas."""
    if format == "json":
        return StreamingResponse(
            stream_json(db),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=telemetry_data.json"},
        )
    if format == "jsonl":
        return StreamingResponse(
            stream_jsonl(db),
            media_type="application/x-ndjson",
            headers={"Content-Disposition": "attachment; filename=telemetry_data.jsonl"},
        )
    return StreamingResponse(
        stream_csv(db),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=telemetry_events.csv"},
    )
