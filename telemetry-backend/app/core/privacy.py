import re
from typing import Any


ANONYMOUS_EMAIL_TOKEN = "[CORREO_ANÓNIMO]"
ANONYMOUS_STUDENT_ID_TOKEN = "[MATRÍCULA_ANÓNIMA]"

EMAIL_PATTERN = re.compile(
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
    re.IGNORECASE,
)
LONG_ACCOUNT_NUMBER_PATTERN = re.compile(r"(?<!\d)\d{6,10}(?!\d)")


def sanitize_input(value: str) -> str:
    """Enmascara PII básica sin conservar ni registrar el valor original."""
    without_emails = EMAIL_PATTERN.sub(ANONYMOUS_EMAIL_TOKEN, value)
    return LONG_ACCOUNT_NUMBER_PATTERN.sub(
        ANONYMOUS_STUDENT_ID_TOKEN,
        without_emails,
    )


def sanitize_payload(value: Any) -> Any:
    """Sanitiza recursivamente valores textuales dentro de estructuras JSON."""
    if isinstance(value, str):
        return sanitize_input(value)
    if isinstance(value, dict):
        return {
            sanitize_input(key) if isinstance(key, str) else key: sanitize_payload(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [sanitize_payload(item) for item in value]
    if isinstance(value, tuple):
        return tuple(sanitize_payload(item) for item in value)
    return value
