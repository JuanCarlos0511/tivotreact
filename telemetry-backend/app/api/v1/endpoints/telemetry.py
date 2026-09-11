from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, verify_telemetry_client_key
from app.schemas.telemetry import (
    SessionCreate, SessionResponse, 
    TelemetryBatchRequest, TelemetryBatchResponse, TelemetryEventCreate,
    TelemetryEventsRequest,
    SurveyCreate, SurveyResponse_
)
from app.services import ingestion

router = APIRouter(dependencies=[Depends(verify_telemetry_client_key)])

@router.post("/session", response_model=SessionResponse)
async def create_session_endpoint(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Crea una nueva sesión para el participante."""
    return await ingestion.create_session(db, data)

@router.post("/batch", response_model=TelemetryBatchResponse)
async def ingest_batch_endpoint(
    data: TelemetryBatchRequest,
    db: AsyncSession = Depends(get_db)
):
    """Ingesta un lote de eventos de telemetría."""
    received, stored = await ingestion.ingest_batch(db, data.events)
    return TelemetryBatchResponse(received=received, stored=stored)


@router.post("/events", response_model=TelemetryBatchResponse)
async def ingest_events_endpoint(
    data: TelemetryEventsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Acepta un evento, una lista directa o el sobre canónico ``{"events": [...]}``."""
    if isinstance(data, TelemetryBatchRequest):
        events = data.events
    elif isinstance(data, TelemetryEventCreate):
        events = [data]
    else:
        events = data
    received, stored = await ingestion.ingest_batch(db, events)
    return TelemetryBatchResponse(received=received, stored=stored)

@router.post("/survey", response_model=SurveyResponse_)
async def create_survey_endpoint(
    data: SurveyCreate,
    db: AsyncSession = Depends(get_db)
):
    """Recibe la encuesta final del participante."""
    try:
        return await ingestion.create_survey(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
