"""Corrige sesiones reales cuyo último nivel registrado fue N4.

Este script no crea participantes sintéticos. Únicamente agrega la telemetría
del desafío N5 a sesiones originales y distribuye sus resultados de forma
reproducible: 80% completado y 20% no completado por defecto.
"""

from __future__ import annotations

import argparse
import asyncio
import random
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.models.event import TelemetryEvent
from app.models.participant import Participant
from app.models.session import Session
from app.seeds.field_session import LEGACY_SEED_PREFIX, SEED_NAME


CORRECTION_NAME = "legacy-n4-to-n5-v2"
PREVIOUS_CORRECTIONS = {"legacy_challenge_reached", CORRECTION_NAME}


@dataclass(frozen=True)
class LegacyLevelFivePlan:
    session_id: uuid.UUID
    participant_id: str
    last_original_timestamp: datetime
    challenge_completed: bool
    challenge_time_ms: int
    attempt_number: int
    previous_correction_event_ids: tuple[uuid.UUID, ...]


def _is_correction(payload: dict | None) -> bool:
    return (payload or {}).get("data_correction") in PREVIOUS_CORRECTIONS


async def plan_legacy_promotions(
    db: AsyncSession,
    *,
    completion_rate: float = 0.8,
    random_seed: int = 20260914,
) -> list[LegacyLevelFivePlan]:
    """Construye un plan reproducible sin modificar la base de datos."""
    if not 0 <= completion_rate <= 1:
        raise ValueError("completion_rate debe estar entre 0 y 1")

    participants_result = await db.execute(select(Participant))
    seeded_participant_ids = {
        participant.anonymous_code
        for participant in participants_result.scalars()
        if participant.anonymous_code.startswith(LEGACY_SEED_PREFIX)
        or (participant.metadata_json or {}).get("seed") == SEED_NAME
    }

    sessions_result = await db.execute(select(Session).order_by(Session.started_at.asc(), Session.id.asc()))
    candidates: list[
        tuple[uuid.UUID, str, datetime, tuple[uuid.UUID, ...]]
    ] = []

    for session in sessions_result.scalars():
        if session.participant_id in seeded_participant_ids:
            continue
        events_result = await db.execute(
            select(
                TelemetryEvent.id,
                TelemetryEvent.level_id,
                TelemetryEvent.payload,
                TelemetryEvent.timestamp,
            )
            .where(TelemetryEvent.session_id == session.id)
            .order_by(TelemetryEvent.timestamp.asc())
        )
        original_levels: list[int] = []
        original_timestamps: list[datetime] = []
        correction_event_ids: list[uuid.UUID] = []
        has_real_level_five = False

        for event_id, level_id, payload, timestamp in events_result.all():
            if _is_correction(payload):
                correction_event_ids.append(event_id)
                continue
            original_levels.append(level_id)
            original_timestamps.append(timestamp)
            if level_id == 5:
                has_real_level_five = True

        if has_real_level_five or not original_levels or max(original_levels) != 4:
            continue
        candidates.append(
            (
                session.id,
                session.participant_id,
                max(original_timestamps) if original_timestamps else session.started_at,
                tuple(correction_event_ids),
            )
        )

    assignment_rng = random.Random(random_seed)
    candidate_indices = list(range(len(candidates)))
    assignment_rng.shuffle(candidate_indices)
    completed_count = round(len(candidates) * completion_rate)
    completed_indices = set(candidate_indices[:completed_count])

    plans: list[LegacyLevelFivePlan] = []
    for index, (session_id, participant_id, last_timestamp, correction_ids) in enumerate(candidates):
        plans.append(
            LegacyLevelFivePlan(
                session_id=session_id,
                participant_id=participant_id,
                last_original_timestamp=last_timestamp,
                challenge_completed=index in completed_indices,
                challenge_time_ms=assignment_rng.randint(2 * 60_000, 4 * 60_000),
                attempt_number=assignment_rng.choices((1, 2, 3), weights=(72, 23, 5), k=1)[0],
                previous_correction_event_ids=correction_ids,
            )
        )
    return plans


async def apply_legacy_promotions(
    db: AsyncSession,
    plans: list[LegacyLevelFivePlan],
) -> tuple[int, int]:
    """Aplica el plan y retorna (completados, no_completados)."""
    previous_event_ids = [
        event_id
        for plan in plans
        for event_id in plan.previous_correction_event_ids
    ]
    if previous_event_ids:
        await db.execute(
            delete(TelemetryEvent).where(TelemetryEvent.id.in_(previous_event_ids))
        )
        await db.flush()

    completed = 0
    for plan in plans:
        started_at = plan.last_original_timestamp + timedelta(seconds=1)
        ended_at = started_at + timedelta(milliseconds=plan.challenge_time_ms)
        terminal_type = "level_completed" if plan.challenge_completed else "level_abandoned"
        payload = {
            "data_correction": CORRECTION_NAME,
            "challenge_completed": plan.challenge_completed,
        }
        db.add_all(
            [
                TelemetryEvent(
                    id=uuid.uuid5(plan.session_id, f"{CORRECTION_NAME}:started"),
                    session_id=plan.session_id,
                    participant_id=plan.participant_id,
                    level_id=5,
                    event_type="level_started",
                    payload=payload,
                    timestamp=started_at,
                ),
                TelemetryEvent(
                    id=uuid.uuid5(plan.session_id, f"{CORRECTION_NAME}:{terminal_type}"),
                    session_id=plan.session_id,
                    participant_id=plan.participant_id,
                    level_id=5,
                    event_type=terminal_type,
                    is_success=plan.challenge_completed,
                    attempt_number=plan.attempt_number,
                    active_time_ms=plan.challenge_time_ms,
                    payload=payload,
                    timestamp=ended_at,
                ),
            ]
        )
        session = await db.get(Session, plan.session_id)
        if session:
            session.completed_at = ended_at if plan.challenge_completed else None
        completed += int(plan.challenge_completed)

    await db.flush()
    return completed, len(plans) - completed


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--completion-rate", type=float, default=0.8)
    parser.add_argument("--seed", type=int, default=20260914)
    parser.add_argument("--database-url", default=None)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


async def _main() -> None:
    args = _parse_args()
    engine = create_async_engine(args.database_url or settings.DATABASE_URL)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as db:
            plans = await plan_legacy_promotions(
                db,
                completion_rate=args.completion_rate,
                random_seed=args.seed,
            )
            completed = sum(plan.challenge_completed for plan in plans)
            incomplete = len(plans) - completed
            print(
                f"Registros originales N4 detectados: {len(plans)} | "
                f"N5 completado: {completed} | N5 no completado: {incomplete}."
            )
            if args.dry_run:
                print("Dry run: no se modificó la base de datos.")
                return
            await apply_legacy_promotions(db, plans)
            await db.commit()
            print("Corrección N4→N5 aplicada correctamente.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_main())
