"""Seeder reproducible de una jornada de uso en tres tablets.

Uso local, desde ``telemetry-backend``::

    python -m app.seeds.field_session --dry-run
    python -m app.seeds.field_session

En Docker, después de reconstruir el backend::

    docker compose exec backend python -m app.seeds.field_session
"""

from __future__ import annotations

import argparse
import asyncio
import random
import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.models.event import TelemetryEvent
from app.models.participant import Participant
from app.models.session import Session
from app.models.survey import SurveyResponse


SEED_NAME = "field-session-2026-09-14"
LEGACY_SEED_PREFIX = "TIV-S0914-"
UUID_NAMESPACE = uuid.UUID("b7b88725-f7cd-4dcf-a64d-9ff43b7baed4")
TABLETS = ("Tablet 1", "Tablet 2", "Tablet 3")
CHALLENGE_LEVEL = 5


@dataclass(frozen=True)
class SeedRecord:
    participant_id: str
    session_id: uuid.UUID
    tablet_id: str
    started_at: datetime
    duration_ms: int
    max_level: int
    challenge_completed: bool
    attempts_by_level: tuple[int, ...]
    hint_levels: tuple[int, ...]

    @property
    def ended_at(self) -> datetime:
        return self.started_at + timedelta(milliseconds=self.duration_ms)


def _sample_outcome(rng: random.Random) -> tuple[int, bool]:
    roll = rng.random()
    if roll < 0.02:
        return 3, False
    if roll < 0.22:
        return CHALLENGE_LEVEL, False
    return CHALLENGE_LEVEL, True


def _sample_duration_ms(rng: random.Random, challenge_completed: bool) -> int:
    if not challenge_completed:
        return rng.randint(2 * 60_000, 4 * 60_000)
    if rng.random() < 0.08:
        return rng.randint(6 * 60_000, 8 * 60_000 - 1)
    return round(rng.triangular(3 * 60_000, 5 * 60_000, 4 * 60_000))


def generate_records(
    *,
    study_date: date = date(2026, 9, 14),
    start_time: time = time(9, 21),
    end_time: time = time(13, 48),
    timezone_name: str = "America/Mexico_City",
    random_seed: int = 20260914,
    total_records: int = 29,
) -> list[SeedRecord]:
    """Genera sesiones y las reparte aleatoriamente entre las tres tablets."""
    timezone = ZoneInfo(timezone_name)
    window_start = datetime.combine(study_date, start_time, timezone)
    window_end = datetime.combine(study_date, end_time, timezone)
    if window_end <= window_start:
        raise ValueError("La hora final debe ser posterior a la hora inicial")
    if total_records < len(TABLETS):
        raise ValueError("total_records debe permitir al menos un registro por tablet")

    allocation_rng = random.Random(random_seed ^ 0x7AB1E7)
    tablet_counts = [1] * len(TABLETS)
    for _ in range(total_records - len(TABLETS)):
        tablet_counts[allocation_rng.randrange(len(TABLETS))] += 1

    rng = random.Random(random_seed)
    pending: list[tuple[str, datetime, int, int, bool, tuple[int, ...]]] = []

    for tablet_index, (tablet_id, record_count) in enumerate(zip(TABLETS, tablet_counts)):
        tablet_records: list[tuple[int, int, bool, tuple[int, ...]]] = []
        for _ in range(record_count):
            max_level, challenge_completed = _sample_outcome(rng)
            duration_ms = _sample_duration_ms(rng, challenge_completed)
            attempts = tuple(rng.choices((1, 2, 3), weights=(72, 23, 5), k=max_level))
            tablet_records.append(
                (duration_ms, max_level, challenge_completed, attempts)
            )

        initial_offset_ms = tablet_index * 17_000
        available_ms = round((window_end - window_start).total_seconds() * 1000) - initial_offset_ms
        active_ms = sum(item[0] for item in tablet_records)
        gap_ms = available_ms - active_ms
        if gap_ms < 0:
            raise ValueError("La ventana es demasiado corta para la cantidad de registros")

        gap_count = max(record_count - 1, 1)
        gap_weights = [rng.uniform(0.65, 1.35) for _ in range(gap_count)]
        weight_total = sum(gap_weights)
        gaps = [int(gap_ms * weight / weight_total) for weight in gap_weights]
        gaps[-1] += gap_ms - sum(gaps)

        cursor = window_start + timedelta(milliseconds=initial_offset_ms)
        for record_index, (duration_ms, max_level, challenge_completed, attempts) in enumerate(tablet_records):
            pending.append(
                (tablet_id, cursor, duration_ms, max_level, challenge_completed, attempts)
            )
            cursor += timedelta(milliseconds=duration_ms)
            if record_index < record_count - 1:
                cursor += timedelta(milliseconds=gaps[record_index])

    # Con muestras pequeñas un evento del 2% puede no aparecer. Conservamos la
    # probabilidad durante la generación, pero garantizamos un único caso raro
    # para que el dashboard de demostración siempre represente ese escenario.
    if not any(item[3] == 3 for item in pending):
        fallback_index = next(
            (index for index, item in enumerate(pending) if not item[4]),
            len(pending) - 1,
        )
        tablet_id, started_at, duration, _, _, attempts = pending[fallback_index]
        pending[fallback_index] = (
            tablet_id,
            started_at,
            duration,
            3,
            False,
            attempts[:3],
        )

    pending.sort(key=lambda item: (item[1], item[0]))
    hint_rng = random.Random(random_seed ^ 0x71A17)
    records: list[SeedRecord] = []
    for index, (tablet_id, started_at, duration, max_level, completed, attempts) in enumerate(pending, 1):
        participant_key = uuid.uuid5(
            UUID_NAMESPACE,
            f"{SEED_NAME}:{random_seed}:{study_date.isoformat()}:{index}",
        )
        participant_id = f"TIV-{participant_key.hex[:10].upper()}"
        session_id = uuid.uuid5(UUID_NAMESPACE, f"{SEED_NAME}:{random_seed}:{participant_id}")
        hint_roll = hint_rng.random()
        hint_count = 2 if hint_roll < 0.03 else 1 if hint_roll < 0.13 else 0
        hint_levels = tuple(
            max_level if hint_rng.random() < 0.65 else hint_rng.randint(1, max_level)
            for _ in range(hint_count)
        )
        records.append(
            SeedRecord(
                participant_id=participant_id,
                session_id=session_id,
                tablet_id=tablet_id,
                started_at=started_at,
                duration_ms=duration,
                max_level=max_level,
                challenge_completed=completed,
                attempts_by_level=attempts,
                hint_levels=hint_levels,
            )
        )
    return records


def _split_duration(total_ms: int, level_count: int) -> list[int]:
    weights = [18, 17, 17, 18, 30][:level_count]
    weight_total = sum(weights)
    durations = [max(1, round(total_ms * weight / weight_total)) for weight in weights]
    durations[-1] += total_ms - sum(durations)
    return durations


def _seeded_error(record: SeedRecord, level_id: int, attempt_number: int) -> tuple[str, str]:
    selector = uuid.uuid5(
        record.session_id,
        f"error:{level_id}:{attempt_number}",
    ).int % 100
    if selector < 35:
        return "INCOMPLETE_ALGORITHM", "El programa terminó antes de cumplir el objetivo del nivel."
    if selector < 65:
        return "LOGIC_BUSINESS_RULE", "La ejecución terminó, pero la ruta no alcanzó la meta esperada."
    if selector < 85:
        return "SYNTAX_ERROR", "La estructura del programa necesita una corrección de sintaxis."
    return "RUNTIME_EXCEPTION", "La ejecución se detuvo al intentar realizar un movimiento no válido."


def build_events(record: SeedRecord) -> list[TelemetryEvent]:
    """Crea eventos consistentes; el último indica éxito o abandono explícito."""
    events: list[TelemetryEvent] = []
    cursor = record.started_at
    durations = _split_duration(record.duration_ms, record.max_level)
    common_payload = {
        "tablet_id": record.tablet_id,
        "seed": SEED_NAME,
    }

    events.append(
        TelemetryEvent(
            id=uuid.uuid5(record.session_id, "session-started"),
            session_id=record.session_id,
            participant_id=record.participant_id,
            level_id=0,
            event_type="session_started",
            payload=common_payload,
            timestamp=cursor,
        )
    )

    for level_id, (duration_ms, attempts) in enumerate(
        zip(durations, record.attempts_by_level), 1
    ):
        events.append(
            TelemetryEvent(
                id=uuid.uuid5(record.session_id, f"level-{level_id}-started"),
                session_id=record.session_id,
                participant_id=record.participant_id,
                level_id=level_id,
                event_type="level_started",
                payload=common_payload,
                timestamp=cursor,
            )
        )
        level_hints = [
            hint_index
            for hint_index, hint_level in enumerate(record.hint_levels, 1)
            if hint_level == level_id
        ]
        for position, hint_index in enumerate(level_hints, 1):
            hint_timestamp = cursor + timedelta(
                milliseconds=round(duration_ms * position / (len(level_hints) + 1))
            )
            hint_type = "Conceptual" if hint_index % 3 else "Corrección de Sintaxis"
            events.append(
                TelemetryEvent(
                    id=uuid.uuid5(record.session_id, f"hint-{hint_index}-level-{level_id}"),
                    session_id=record.session_id,
                    participant_id=record.participant_id,
                    level_id=level_id,
                    event_type="ai_hint_requested",
                    ai_hint_type=hint_type,
                    ai_hint_effective=hint_index % 4 != 0,
                    payload=common_payload,
                    timestamp=hint_timestamp,
                )
            )
        is_last_level = level_id == record.max_level
        was_completed = not is_last_level or record.challenge_completed
        for attempt_number in range(1, attempts + 1):
            attempt_succeeded = was_completed and attempt_number == attempts
            error_category = None
            error_message = None
            if not attempt_succeeded:
                error_category, error_message = _seeded_error(
                    record,
                    level_id,
                    attempt_number,
                )
            events.append(
                TelemetryEvent(
                    id=uuid.uuid5(
                        record.session_id,
                        f"level-{level_id}-attempt-{attempt_number}",
                    ),
                    session_id=record.session_id,
                    participant_id=record.participant_id,
                    level_id=level_id,
                    event_type="syntax_error" if error_category == "SYNTAX_ERROR" else "code_run",
                    is_success=attempt_succeeded,
                    attempt_number=attempt_number,
                    error_category=error_category,
                    error_message_snippet=error_message,
                    payload=common_payload,
                    timestamp=cursor + timedelta(
                        milliseconds=round(
                            duration_ms * attempt_number / (attempts + 1)
                        )
                    ),
                )
            )
        cursor += timedelta(milliseconds=duration_ms)
        event_type = "level_completed" if was_completed else "level_abandoned"
        events.append(
            TelemetryEvent(
                id=uuid.uuid5(record.session_id, f"level-{level_id}-{event_type}"),
                session_id=record.session_id,
                participant_id=record.participant_id,
                level_id=level_id,
                event_type=event_type,
                is_success=was_completed,
                attempt_number=attempts,
                active_time_ms=duration_ms,
                payload={
                    **common_payload,
                    "challenge_completed": record.challenge_completed,
                },
                timestamp=cursor,
            )
        )
    return events


async def seed_records(
    db: AsyncSession,
    records: list[SeedRecord],
    *,
    condition: str = "standard",
) -> int:
    """Inserta únicamente las sesiones faltantes y retorna cuántas se agregaron."""
    session_ids = [record.session_id for record in records]
    existing_result = await db.execute(select(Session.id).where(Session.id.in_(session_ids)))
    existing_session_ids = set(existing_result.scalars())
    new_records = [record for record in records if record.session_id not in existing_session_ids]
    if not new_records:
        return 0

    participant_ids = [record.participant_id for record in new_records]
    participant_result = await db.execute(
        select(Participant.anonymous_code).where(Participant.anonymous_code.in_(participant_ids))
    )
    existing_participant_ids = set(participant_result.scalars())

    for record in new_records:
        if record.participant_id not in existing_participant_ids:
            db.add(
                Participant(
                    anonymous_code=record.participant_id,
                    created_at=record.started_at,
                    metadata_json={
                        "tablet_id": record.tablet_id,
                        "seed": SEED_NAME,
                    },
                )
            )
    await db.flush()

    for record in new_records:
        db.add(
            Session(
                id=record.session_id,
                participant_id=record.participant_id,
                condition=condition,
                has_assent=True,
                started_at=record.started_at,
                completed_at=record.ended_at if record.challenge_completed else None,
            )
        )
    await db.flush()

    for record in new_records:
        db.add_all(build_events(record))
    await db.commit()
    return len(new_records)


async def delete_seed_records(db: AsyncSession) -> int:
    """Elimina solamente participantes identificados como datos de este seeder."""
    participants_result = await db.execute(
        select(Participant).where(
            or_(
                Participant.anonymous_code.like(f"{LEGACY_SEED_PREFIX}%"),
                Participant.metadata_json.is_not(None),
            )
        )
    )
    candidates = participants_result.scalars().all()
    participant_ids = [
        participant.anonymous_code
        for participant in candidates
        if participant.anonymous_code.startswith(LEGACY_SEED_PREFIX)
        or (participant.metadata_json or {}).get("seed") == SEED_NAME
    ]
    if not participant_ids:
        return 0

    await db.execute(
        delete(SurveyResponse).where(SurveyResponse.participant_id.in_(participant_ids))
    )
    await db.execute(
        delete(TelemetryEvent).where(TelemetryEvent.participant_id.in_(participant_ids))
    )
    await db.execute(delete(Session).where(Session.participant_id.in_(participant_ids)))
    await db.execute(
        delete(Participant).where(Participant.anonymous_code.in_(participant_ids))
    )
    await db.flush()
    return len(participant_ids)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", default="2026-09-14", help="Fecha YYYY-MM-DD")
    parser.add_argument("--start", default="09:21", help="Hora inicial HH:MM")
    parser.add_argument("--end", default="13:48", help="Hora final HH:MM")
    parser.add_argument("--timezone", default="America/Mexico_City")
    parser.add_argument("--seed", type=int, default=20260914)
    parser.add_argument("--count", type=int, default=29, help="Total de registros sintéticos")
    parser.add_argument("--condition", default="standard")
    parser.add_argument("--database-url", default=None)
    parser.add_argument("--dry-run", action="store_true")
    operation = parser.add_mutually_exclusive_group()
    operation.add_argument(
        "--delete-seed",
        action="store_true",
        help="Elimina los registros de este seeder y termina",
    )
    operation.add_argument(
        "--replace",
        action="store_true",
        help="Reemplaza el seed anterior por la versión actual",
    )
    return parser.parse_args()


async def _main() -> None:
    args = _parse_args()
    records = generate_records(
        study_date=date.fromisoformat(args.date),
        start_time=time.fromisoformat(args.start),
        end_time=time.fromisoformat(args.end),
        timezone_name=args.timezone,
        random_seed=args.seed,
        total_records=args.count,
    )
    completed = sum(record.challenge_completed for record in records)
    challenge_incomplete = sum(
        record.max_level == CHALLENGE_LEVEL and not record.challenge_completed
        for record in records
    )
    level_three = sum(record.max_level == 3 for record in records)
    peaks = sum(record.duration_ms > 5 * 60_000 for record in records)
    hinted_records = sum(bool(record.hint_levels) for record in records)
    total_hints = sum(len(record.hint_levels) for record in records)
    print(
        f"Generados: {len(records)} | desafío completo: {completed} | "
        f"desafío no completo: {challenge_incomplete} | nivel 3: {level_three} | "
        f"picos 6-<8 min: {peaks} | participantes con pistas: {hinted_records} "
        f"({total_hints} pistas)"
    )
    if args.dry_run:
        requested_operation = "reemplazar" if args.replace else "eliminar" if args.delete_seed else "insertar"
        print(f"Operación prevista: {requested_operation} seed.")
        print("Dry run: no se modificó la base de datos.")
        return

    engine = create_async_engine(args.database_url or settings.DATABASE_URL)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as db:
            deleted = 0
            if args.delete_seed or args.replace:
                deleted = await delete_seed_records(db)
            if args.delete_seed:
                await db.commit()
                print(f"Participantes sintéticos eliminados: {deleted}.")
                return
            inserted = await seed_records(db, records, condition=args.condition)
        print(
            f"Seed anterior eliminado: {deleted} | sesiones insertadas: {inserted} | "
            f"ya existentes: {len(records) - inserted}."
        )
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_main())
