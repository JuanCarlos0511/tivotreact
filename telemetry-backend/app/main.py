import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.middleware import ZeroPIIMiddleware, setup_cors
from app.db.session import init_db

# Configurar logging estructurado
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager para la aplicación FastAPI."""
    logger.info("Inicializando la base de datos...")
    await init_db()
    logger.info("Base de datos inicializada correctamente.")
    yield
    logger.info("Apagando la aplicación...")

app = FastAPI(
    title="Telemetry Microservice",
    description="Backend para recolección de telemetría y analíticas de aprendizaje",
    version="1.0.0",
    lifespan=lifespan,
)

# Configurar Middlewares
app.add_middleware(ZeroPIIMiddleware)
setup_cors(app, settings.cors_origins_list)

# Incluir rutas
app.include_router(api_router, prefix="/api/v1")
