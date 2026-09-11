import logging

from fastapi import APIRouter, HTTPException, status

from app.schemas.ai import ChatCompletionRequest, ChatCompletionResponse
from app.services.qwen import (
    QwenConfigurationError,
    QwenUpstreamError,
    complete_chat,
)


router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/chat/completions", response_model=ChatCompletionResponse)
async def chat_completion(body: ChatCompletionRequest) -> ChatCompletionResponse:
    logger.info("Solicitud de chat IA recibida: %d mensajes", len(body.messages))
    try:
        content = await complete_chat(body.messages)
        logger.info("Solicitud de chat IA completada correctamente")
        return ChatCompletionResponse(content=content)
    except QwenConfigurationError as exc:
        logger.error("Solicitud de chat IA rechazada: Qwen no está configurado")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except TimeoutError as exc:
        logger.warning("Solicitud de chat IA agotó el tiempo de espera")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
        ) from exc
    except QwenUpstreamError as exc:
        logger.warning("Solicitud de chat IA falló en el proveedor upstream")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
