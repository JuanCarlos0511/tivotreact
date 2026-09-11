from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.schemas.telemetry import (
    SessionCreate, SessionResponse, 
    TelemetryBatchRequest, TelemetryBatchResponse, 
    SurveyCreate, SurveyResponse_
)
from app.services import ingestion

router = APIRouter()

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

@router.post("/survey", response_model=SurveyResponse_)
async def create_survey_endpoint(
    data: SurveyCreate,
    db: AsyncSession = Depends(get_db)
):
    """Recibe la encuesta final del participante."""
    return await ingestion.create_survey(db, data)
