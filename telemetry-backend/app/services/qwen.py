import logging

import httpx

from app.core.config import settings
from app.core.privacy import sanitize_input
from app.schemas.ai import ChatMessage


logger = logging.getLogger(__name__)


class QwenConfigurationError(RuntimeError):
    pass


class QwenUpstreamError(RuntimeError):
    pass


async def complete_chat(messages: list[ChatMessage]) -> str:
    """Envía una conversación sanitizada a Qwen sin exponer la credencial al cliente."""
    if not settings.QWEN_API_KEY:
        raise QwenConfigurationError("Qwen no está configurado en el backend")

    request_body = {
        "model": settings.QWEN_MODEL,
        "temperature": 0.5,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": message.role, "content": sanitize_input(message.content)}
            for message in messages
        ],
    }
    url = f"{settings.QWEN_API_URL.rstrip('/')}/chat/completions"

    try:
        logger.info("Enviando solicitud a Qwen con el modelo %s", settings.QWEN_MODEL)
        async with httpx.AsyncClient(timeout=settings.QWEN_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.QWEN_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=request_body,
            )
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        logger.warning("Qwen excedió el tiempo de espera configurado")
        raise TimeoutError("Qwen excedió el tiempo de respuesta") from exc
    except httpx.HTTPError as exc:
        status_code = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
        logger.warning("Qwen rechazó o no pudo procesar la solicitud (status=%s)", status_code)
        raise QwenUpstreamError("Qwen rechazó o no pudo procesar la solicitud") from exc

    try:
        content = response.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError, AttributeError, ValueError) as exc:
        raise QwenUpstreamError("Qwen devolvió una respuesta inválida") from exc

    if not content:
        raise QwenUpstreamError("Qwen devolvió una respuesta vacía")
    logger.info("Qwen devolvió una respuesta válida")
    return sanitize_input(content)
