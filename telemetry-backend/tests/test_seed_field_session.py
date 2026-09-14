import asyncio
from collections import Counter
from datetime import time

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.v1.endpoints.analytics import get_analytics_overview, get_participants_list
from app.db.base import Base
from app.models.event import TelemetryEvent
from app.models.participant import Participant
from app.models.session import Session
from app.seeds.field_session import build_events, generate_records, seed_records


def test_default_seed_has_different_counts_per_tablet_and_expected_distribution() -> None:
    records = generate_records()

    assert len(records) == 44
    assert Counter(record.tablet_id for record in records) == {
        "Tablet 1": 15,
        "Tablet 2": 18,
        "Tablet 3": 11,
    }
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
    assert all(180 <= record.duration_seconds <= 300 or 600 <= record.duration_seconds <= 660 for record in completed)
    assert all(120 <= record.duration_seconds <= 240 for record in records if not record.challenge_completed)
    hinted_records = [record for record in records if record.hint_levels]
    assert len(hinted_records) == 6
    assert sum(len(record.hint_levels) for record in hinted_records) == 7
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
    assert first == 44
    assert second == 0
    assert counts[0] == counts[1] == 44
    assert counts[2] > 44
    assert participants["total"] == 44
    assert Counter(item["tablet_id"] for item in participants["items"]) == {
        "Tablet 1": 15,
        "Tablet 2": 18,
        "Tablet 3": 11,
    }
    assert Counter(item["challenge_status"] for item in participants["items"]) == {
        "Completado": 33,
        "No completado": 10,
        "No alcanzado": 1,
    }
    assert max(item["total_hints_used"] for item in participants["items"]) == 2
    assert sum(item["total_hints_used"] > 0 for item in participants["items"]) == 6
    assert overview["completed_participants"] == 33
