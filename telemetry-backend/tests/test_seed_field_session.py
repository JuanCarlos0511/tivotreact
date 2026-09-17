import asyncio
from collections import Counter
from datetime import datetime, time, timezone
import re
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.v1.endpoints.analytics import get_analytics_overview, get_participants_list
from app.db.base import Base
from app.models.event import TelemetryEvent
from app.models.participant import Participant
from app.models.session import Session
from app.seeds.field_session import (
    build_events,
    delete_seed_records,
    generate_records,
    seed_records,
)
from app.seeds.promote_legacy_level_five import (
    CORRECTION_NAME,
    apply_legacy_promotions,
    plan_legacy_promotions,
)


def test_default_seed_has_29_records_randomly_distributed_between_tablets() -> None:
    records = generate_records()

    assert len(records) == 29
    assert Counter(record.tablet_id for record in records) == {
        "Tablet 1": 7,
        "Tablet 2": 11,
        "Tablet 3": 11,
    }
    assert all(re.fullmatch(r"TIV-[0-9A-F]{10}", record.participant_id) for record in records)
    assert min(record.started_at.timetz().replace(tzinfo=None) for record in records) == time(9, 21)
    assert max(record.ended_at.timetz().replace(tzinfo=None) for record in records) == time(13, 48)

    completed = [record for record in records if record.challenge_completed]
    incomplete_challenge = [
        record for record in records
        if record.max_level == 5 and not record.challenge_completed
    ]
    level_three = [record for record in records if record.max_level == 3]
    assert len(completed) > len(incomplete_challenge)
    assert len(level_three) == 1
    assert all(180_000 <= record.duration_ms <= 300_000 or 360_000 <= record.duration_ms < 480_000 for record in completed)
    assert max(record.duration_ms for record in records) < 480_000
    assert all(120_000 <= record.duration_ms <= 240_000 for record in records if not record.challenge_completed)
    assert any(record.duration_ms % 1000 for record in records)
    hinted_records = [record for record in records if record.hint_levels]
    assert len(hinted_records) == 2
    assert sum(len(record.hint_levels) for record in hinted_records) == 3
    assert all(1 <= len(record.hint_levels) <= 2 for record in hinted_records)


def test_terminal_event_explicitly_marks_challenge_result() -> None:
    records = generate_records()
    completed = next(record for record in records if record.challenge_completed)
    incomplete = next(
        record for record in records
        if record.max_level == 5 and not record.challenge_completed
    )

    completed_terminal = build_events(completed)[-1]
    incomplete_terminal = build_events(incomplete)[-1]
    assert (completed_terminal.level_id, completed_terminal.event_type, completed_terminal.is_success) == (5, "level_completed", True)
    assert (incomplete_terminal.level_id, incomplete_terminal.event_type, incomplete_terminal.is_success) == (5, "level_abandoned", False)
    assert completed_terminal.active_time_ms % 1000 != 0
    seeded_failures = [
        event
        for record in records
        for event in build_events(record)
        if event.event_type in {"code_run", "syntax_error"} and event.is_success is False
    ]
    assert seeded_failures
    assert {event.error_category for event in seeded_failures} >= {
        "INCOMPLETE_ALGORITHM",
        "LOGIC_BUSINESS_RULE",
        "SYNTAX_ERROR",
    }


def test_seed_is_idempotent_and_visible_in_analytics(tmp_path) -> None:
    async def run() -> tuple[int, int, tuple[int, int, int], dict, dict]:
        engine = create_async_engine(
            f"sqlite+aiosqlite:///{tmp_path / 'seed.db'}",
            poolclass=NullPool,
        )
        try:
            async with engine.begin() as connection:
                await connection.run_sync(Base.metadata.create_all)
            factory = async_sessionmaker(engine, expire_on_commit=False)
            records = generate_records()
            async with factory() as db:
                first = await seed_records(db, records)
            async with factory() as db:
                second = await seed_records(db, records)
            async with factory() as db:
                counts = (
                    await db.scalar(select(func.count(Participant.id))),
                    await db.scalar(select(func.count(Session.id))),
                    await db.scalar(select(func.count(TelemetryEvent.id))),
                )
                participants = await get_participants_list(
                    page=1,
                    page_size=100,
                    condition=None,
                    db=db,
                )
                overview = await get_analytics_overview(condition=None, db=db)
            return first, second, counts, participants, overview
        finally:
            await engine.dispose()

    first, second, counts, participants, overview = asyncio.run(run())
    assert first == 29
    assert second == 0
    assert counts[0] == counts[1] == 29
    assert counts[2] > 29
    assert participants["total"] == 29
    assert Counter(item["tablet_id"] for item in participants["items"]) == {
        "Tablet 1": 7,
        "Tablet 2": 11,
        "Tablet 3": 11,
    }
    assert Counter(item["challenge_status"] for item in participants["items"]) == {
        "Completado": 25,
        "No completado": 3,
        "No alcanzado": 1,
    }
    assert max(item["total_hints_used"] for item in participants["items"]) == 2
    assert sum(item["total_hints_used"] > 0 for item in participants["items"]) == 2
    assert overview["completed_participants"] == 25


def test_seed_cleanup_and_separate_legacy_level_five_promotion(tmp_path) -> None:
    async def run() -> tuple[int, int, int, int, int, list[int], int]:
        engine = create_async_engine(
            f"sqlite+aiosqlite:///{tmp_path / 'cleanup.db'}",
            poolclass=NullPool,
        )
        try:
            async with engine.begin() as connection:
                await connection.run_sync(Base.metadata.create_all)
            factory = async_sessionmaker(engine, expire_on_commit=False)
            async with factory() as db:
                await seed_records(db, generate_records())

            observed_at = datetime(2026, 9, 14, 12, 9, tzinfo=timezone.utc)
            async with factory() as db:
                legacy_session_ids = [uuid.uuid4() for _ in range(5)]
                for index, legacy_session_id in enumerate(legacy_session_ids):
                    participant_id = f"TIV-{index + 1:010X}"
                    db.add(Participant(anonymous_code=participant_id, created_at=observed_at, metadata_json={}))
                await db.flush()
                for index, legacy_session_id in enumerate(legacy_session_ids):
                    participant_id = f"TIV-{index + 1:010X}"
                    db.add(
                        Session(
                            id=legacy_session_id,
                            participant_id=participant_id,
                            condition="standard",
                            has_assent=True,
                            started_at=observed_at,
                            completed_at=observed_at,
                        )
                    )
                await db.flush()
                for index, legacy_session_id in enumerate(legacy_session_ids):
                    db.add(
                        TelemetryEvent(
                            session_id=legacy_session_id,
                            participant_id=f"TIV-{index + 1:010X}",
                            level_id=4,
                            event_type="level_completed",
                            is_success=True,
                            active_time_ms=180_000,
                            timestamp=observed_at,
                        )
                    )
                await db.commit()

            async with factory() as db:
                deleted = await delete_seed_records(db)
                plans = await plan_legacy_promotions(db)
                completed, incomplete = await apply_legacy_promotions(db, plans)
                await db.commit()
            async with factory() as db:
                participant_count = await db.scalar(select(func.count(Participant.id)))
                level_five_count = await db.scalar(
                    select(func.count(TelemetryEvent.id)).where(
                        TelemetryEvent.level_id == 5,
                    )
                )
                challenge_times = list(
                    (
                        await db.execute(
                            select(TelemetryEvent.active_time_ms).where(
                                TelemetryEvent.level_id == 5,
                                TelemetryEvent.event_type.in_(["level_completed", "level_abandoned"]),
                            )
                        )
                    ).scalars()
                )
                second_plans = await plan_legacy_promotions(db)
                await apply_legacy_promotions(db, second_plans)
                await db.commit()
                correction_event_count = await db.scalar(
                    select(func.count(TelemetryEvent.id)).where(
                        TelemetryEvent.payload["data_correction"].as_string() == CORRECTION_NAME
                    )
                )
            return deleted, completed, incomplete, participant_count, level_five_count, challenge_times, correction_event_count
        finally:
            await engine.dispose()

    deleted, completed, incomplete, participant_count, level_five_count, challenge_times, correction_event_count = asyncio.run(run())
    assert deleted == 29
    assert (completed, incomplete) == (4, 1)
    assert participant_count == 5
    assert level_five_count == 10
    assert all(120_000 <= value <= 240_000 for value in challenge_times)
    assert correction_event_count == 10
