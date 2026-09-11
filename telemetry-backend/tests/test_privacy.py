from app.core.privacy import (
    ANONYMOUS_EMAIL_TOKEN,
    ANONYMOUS_STUDENT_ID_TOKEN,
    sanitize_input,
    sanitize_payload,
)


def test_sanitize_input_masks_email_and_student_id() -> None:
    sanitized = sanitize_input(
        "Soy alumno@escuela.edu.mx y mi matrícula es 12345678."
    )

    assert sanitized == (
        f"Soy {ANONYMOUS_EMAIL_TOKEN} y mi matrícula es "
        f"{ANONYMOUS_STUDENT_ID_TOKEN}."
    )


def test_sanitize_payload_walks_nested_json_without_changing_numbers() -> None:
    sanitized = sanitize_payload(
        {
            "message": "Escríbeme a tutor@example.com",
            "nested": ["Cuenta 123456", {"attempt": 123456}],
        }
    )

    assert sanitized == {
        "message": f"Escríbeme a {ANONYMOUS_EMAIL_TOKEN}",
        "nested": [f"Cuenta {ANONYMOUS_STUDENT_ID_TOKEN}", {"attempt": 123456}],
    }
