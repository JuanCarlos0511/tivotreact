from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Configuración principal de la aplicación.
    """
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./telemetry.db"
    ADMIN_API_KEY: str = "change-me-in-production"
    CORS_ORIGINS: str = "http://localhost:3000"
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_sqlite(self) -> bool:
        """Verifica si la base de datos es SQLite."""
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def cors_origins_list(self) -> List[str]:
        """Obtiene la lista de orígenes CORS."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
