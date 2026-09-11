from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

class ZeroPIIMiddleware(BaseHTTPMiddleware):
    """
    Middleware que enmascara las IPs y elimina headers identificables 
    para garantizar una recolección de datos sin PII (Zero PII).
    """
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Enmascarar la IP del cliente
        request.scope["client"] = ("0.0.0.0", 0)
        
        # Lista de headers a eliminar para proteger la privacidad
        headers_to_strip = [
            b"x-forwarded-for",
            b"x-real-ip",
            b"cf-connecting-ip",
            b"true-client-ip",
            b"client-ip"
        ]
        
        # Filtrar los headers de la petición
        request.scope["headers"] = [
            (k, v) for k, v in request.scope["headers"]
            if k.lower() not in headers_to_strip
        ]
        
        response = await call_next(request)
        return response

def setup_cors(app: FastAPI, origins: list[str]) -> None:
    """
    Configura el middleware CORS para la aplicación.
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
