import asyncio
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.api.deps import get_db
from app.core.config import settings
from app.db.base import Base
from app.main import app
from app.models.event import TelemetryEvent
from app.models.participant import Participant
from app.models.session import Session
from app.models.survey import SurveyResponse


test_database_path = Path(tempfile.gettempdir()) / f"tivot-telemetry-{uuid.uuid4().hex}.db"
engine = create_async_engine(
    f"sqlite+aiosqlite:///{test_database_path}",
    poolclass=NullPool,
)
session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def override_get_db():
    async with session_factory() as session:
        yield session


async def reset_database() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)


def event_payload(
    event_id: uuid.UUID,
    session_id: uuid.UUID,
    event_type: str,
    **extra,
) -> dict:
    return {
        "event_id": str(event_id),
        "session_id": str(session_id),
        "participant_id": "TIV-TEST001",
        "level_id": 0 if event_type == "session_started" else 1,
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **extra,
    }


async def row_counts() -> tuple[int, int, int, int]:
    async with session_factory() as session:
        return (
            await session.scalar(select(func.count(Participant.id))),
            await session.scalar(select(func.count(Session.id))),
            await session.scalar(select(func.count(TelemetryEvent.id))),
            await session.scalar(select(func.count(SurveyResponse.id))),
        )


async def stored_event(event_id: uuid.UUID) -> TelemetryEvent | None:
    async with session_factory() as session:
        return await session.get(TelemetryEvent, event_id)


def test_ingestion_analytics_exports_cors_and_security() -> None:
    asyncio.run(reset_database())
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    session_id = uuid.uuid4()
    original_client_key = settings.TELEMETRY_CLIENT_KEY

    try:
        start = event_payload(
            uuid.uuid4(),
            session_id,
            "session_started",
            payload={"condition": "standard"},
        )
        response = client.post("/api/v1/telemetry/events", json=start)
        assert response.status_code == 200
        assert response.json() == {"received": 1, "stored": 1}
        assert asyncio.run(row_counts()) == (1, 1, 1, 0)

        duplicate_id = uuid.uuid4()
        duplicate = event_payload(
            duplicate_id,
            session_id,
            "code_run",
            attempt_number=1,
            is_success=False,
            error_category="LOGIC_BUSINESS_RULE",
            error_message_snippet="Cuenta 12345678",
            payload={"student_message": "Escríbeme a alumno@example.edu.mx"},
        )
        response = client.post(
            "/api/v1/telemetry/events",
            json=[duplicate, duplicate],
        )
        assert response.status_code == 200
        assert response.json() == {"received": 2, "stored": 1}
        persisted = asyncio.run(stored_event(duplicate_id))
        assert persisted is not None
        assert persisted.error_message_snippet == "Cuenta [MATRÍCULA_ANÓNIMA]"
        assert persisted.payload == {
            "student_message": "Escríbeme a [CORREO_ANÓNIMO]"
        }

        survey = event_payload(
            uuid.uuid4(),
            session_id,
            "survey_submitted",
            level_id=4,
            payload={
                "answers": {
                    "tam_perceived_usefulness": 5,
                    "tam_perceived_ease_of_use": 4,
                    "tam_ai_scaffolding": 5,
                    "tam_ai_trust": 4,
                    "tam_intention_to_use": 5,
                    "sus": [5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
                }
            },
        )
        response = client.post(
            "/api/v1/telemetry/events",
            json={"events": [survey]},
        )
        assert response.status_code == 200
        assert response.json() == {"received": 1, "stored": 1}
        assert asyncio.run(row_counts()) == (1, 1, 3, 1)

        admin_headers = {"X-Admin-Key": settings.ADMIN_API_KEY}
        for endpoint in (
            "/api/v1/analytics/learning-curve",
            "/api/v1/analytics/scaffolding",
            "/api/v1/analytics/errors",
            "/api/v1/analytics/surveys",
        ):
            assert client.get(endpoint, headers=admin_headers).status_code == 200

        exported = client.get(
            "/api/v1/analytics/export?format=json",
            headers=admin_headers,
        )
        assert exported.status_code == 200
        assert len(exported.json()) == 3

        preflight = client.options(
            "/api/v1/telemetry/events",
            headers={
                "Origin": "http://localhost:8080",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,x-telemetry-client-key",
            },
        )
        assert preflight.status_code == 200
        assert preflight.headers["access-control-allow-origin"] == "http://localhost:8080"

        settings.TELEMETRY_CLIENT_KEY = "test-client-key"
        assert client.post("/api/v1/telemetry/events", json=start).status_code == 401
        authorized = client.post(
            "/api/v1/telemetry/events",
            json=start,
            headers={"X-Telemetry-Client-Key": "test-client-key"},
        )
        assert authorized.status_code == 200
        assert authorized.json() == {"received": 1, "stored": 0}
    finally:
        settings.TELEMETRY_CLIENT_KEY = original_client_key
        app.dependency_overrides.clear()
        client.close()
        asyncio.run(engine.dispose())
        test_database_path.unlink(missing_ok=True)
