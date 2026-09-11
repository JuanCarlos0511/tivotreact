import asyncio
from unittest.mock import AsyncMock, patch

import httpx

from app.core.config import settings
from app.main import app
from app.schemas.ai import ChatMessage
from app.services.qwen import QwenConfigurationError, complete_chat


def test_ai_endpoint_returns_proxied_content() -> None:
    async def request_chat() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/api/v1/ai/chat/completions",
                json={"messages": [{"role": "user", "content": "Ayúdame"}]},
            )

    async def run_test() -> httpx.Response:
        with patch(
            "app.api.v1.endpoints.ai.complete_chat",
            new=AsyncMock(return_value='{"mensaje":"Pista segura"}'),
        ):
            return await request_chat()

    response = asyncio.run(run_test())

    assert response.status_code == 200
    assert response.json() == {"content": '{"mensaje":"Pista segura"}'}


def test_qwen_service_sanitizes_pii_before_upstream() -> None:
    original_api_key = settings.QWEN_API_KEY
    settings.QWEN_API_KEY = "server-only-secret"
    upstream_response = httpx.Response(
        200,
        request=httpx.Request("POST", "https://qwen.test/chat/completions"),
        json={"choices": [{"message": {"content": "Respuesta segura"}}]},
    )

    try:
        with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=upstream_response)) as post:
            result = asyncio.run(
                complete_chat(
                    [ChatMessage(role="user", content="correo alumno@example.com matrícula 12345678")]
                )
            )

        assert result == "Respuesta segura"
        assert post.await_args.args[0] == f"{settings.QWEN_API_URL.rstrip('/')}/chat/completions"
        assert post.await_args.kwargs["json"]["model"] == settings.QWEN_MODEL
        sent = post.await_args.kwargs["json"]["messages"][0]["content"]
        assert sent == "correo [CORREO_ANÓNIMO] matrícula [MATRÍCULA_ANÓNIMA]"
        assert post.await_args.kwargs["headers"]["Authorization"] == "Bearer server-only-secret"
    finally:
        settings.QWEN_API_KEY = original_api_key


def test_qwen_requires_server_side_key() -> None:
    original_api_key = settings.QWEN_API_KEY
    settings.QWEN_API_KEY = ""
    try:
        try:
            asyncio.run(complete_chat([ChatMessage(role="user", content="Hola")]))
            raise AssertionError("complete_chat debía rechazar una configuración sin clave")
        except QwenConfigurationError:
            pass
    finally:
        settings.QWEN_API_KEY = original_api_key
