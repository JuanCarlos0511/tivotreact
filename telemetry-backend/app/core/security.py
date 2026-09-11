from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from starlette.status import HTTP_401_UNAUTHORIZED
from .config import settings

api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)
telemetry_key_header = APIKeyHeader(name="X-Telemetry-Client-Key", auto_error=False)
security_bearer = HTTPBearer(auto_error=False)


async def verify_telemetry_client_key(
    client_key: str | None = Security(telemetry_key_header),
) -> None:
    """Valida la clave de ingesta cuando el despliegue decide configurarla."""
    expected = settings.TELEMETRY_CLIENT_KEY
    if not expected:
        return
    if not client_key or not secrets.compare_digest(client_key, expected):
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Clave de telemetría inválida o ausente",
        )

def verify_researcher_password(password: str) -> bool:
    """Valida la contraseña contra la clave de investigador o la API key de admin."""
    return password == settings.RESEARCHER_PASSWORD or password == settings.ADMIN_API_KEY

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Genera un token JWT firmado para la sesión de investigador."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decodifica y valida el token JWT."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def verify_admin_key(
    header_key: str = Security(api_key_header),
    bearer: HTTPAuthorizationCredentials = Security(security_bearer),
) -> str:
    """
    Verifica acceso administrativo vía X-Admin-Key o Bearer Token (API Key directa o JWT).
    """
    if header_key and (header_key == settings.ADMIN_API_KEY or header_key == settings.RESEARCHER_PASSWORD):
        return header_key

    if bearer and bearer.credentials:
        # Check if direct key
        if bearer.credentials == settings.ADMIN_API_KEY or bearer.credentials == settings.RESEARCHER_PASSWORD:
            return bearer.credentials
        # Otherwise attempt decoding as JWT
        try:
            decode_access_token(bearer.credentials)
            return bearer.credentials
        except HTTPException:
            pass

    raise HTTPException(
        status_code=HTTP_401_UNAUTHORIZED,
        detail="Credenciales de administrador inválidas o ausentes",
        headers={"WWW-Authenticate": "Bearer"},
    )
