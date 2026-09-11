from fastapi import APIRouter, HTTPException, Depends
from starlette.status import HTTP_401_UNAUTHORIZED
from app.schemas.auth import LoginRequest, TokenResponse, ResearcherProfile
from app.core.security import verify_researcher_password, create_access_token, verify_admin_key
from app.core.config import settings

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """Autenticación de investigadores para el dashboard web."""
    if not verify_researcher_password(data.password):
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Contraseña de investigador incorrecta",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": "researcher", "role": "admin"}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

@router.get("/me", response_model=ResearcherProfile, dependencies=[Depends(verify_admin_key)])
async def get_current_user():
    """Valida la sesión del investigador."""
    return ResearcherProfile(role="researcher", authenticated=True)
