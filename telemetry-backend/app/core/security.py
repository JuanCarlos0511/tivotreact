from fastapi import Request, HTTPException, Security
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from starlette.status import HTTP_401_UNAUTHORIZED
from .config import settings

api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)
security_bearer = HTTPBearer(auto_error=False)

async def verify_admin_key(
    api_key_header: str = Security(api_key_header),
    bearer: HTTPAuthorizationCredentials = Security(security_bearer),
) -> str:
    """
    Verifica que la petición contiene la clave de administrador correcta.
    Se busca en el header 'X-Admin-Key' o en 'Authorization: Bearer <key>'.
    """
    if api_key_header == settings.ADMIN_API_KEY:
        return api_key_header
    
    if bearer and bearer.credentials == settings.ADMIN_API_KEY:
        return bearer.credentials

    raise HTTPException(
        status_code=HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing Admin API Key",
    )
