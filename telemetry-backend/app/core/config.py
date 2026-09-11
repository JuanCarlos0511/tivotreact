from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Configuración principal de la aplicación.
    """
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./telemetry.db"
    ADMIN_API_KEY: str = "change-me-in-production"
    TELEMETRY_CLIENT_KEY: str = ""
    RESEARCHER_PASSWORD: str = "tivot-research-2026"
    JWT_SECRET_KEY: str = "tivot-jwt-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:3001,http://localhost:8080,http://localhost:8081,https://tivot.tudominio.com,https://analytics.tudominio.com"
    LOG_LEVEL: str = "INFO"
    QWEN_API_URL: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    QWEN_API_KEY: str = ""
    QWEN_MODEL: str = "qwen-plus"
    QWEN_TIMEOUT_SECONDS: float = 30.0

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_sqlite(self) -> bool:
        """Verifica si la base de datos es SQLite."""
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def cors_origins_list(self) -> List[str]:
        """Obtiene orígenes CORS canónicos, sin la barra final."""
        return [
            origin.strip().rstrip("/")
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip().rstrip("/")
        ]

settings = Settings()
