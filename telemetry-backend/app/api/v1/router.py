from fastapi import APIRouter
from app.api.v1.endpoints import telemetry, admin, health

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
