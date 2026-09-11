from pydantic import BaseModel

class LoginRequest(BaseModel):
    """Esquema para autenticación de investigador."""
    password: str

class TokenResponse(BaseModel):
    """Respuesta con token JWT para el dashboard de analíticas."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class ResearcherProfile(BaseModel):
    """Perfil del usuario autenticado."""
    role: str = "researcher"
    authenticated: bool = True
