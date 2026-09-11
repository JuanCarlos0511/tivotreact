from app.core.config import Settings


def test_cors_origins_are_trimmed_and_have_no_trailing_slash() -> None:
    settings = Settings(
        _env_file=None,
        CORS_ORIGINS=" https://frontend.example/ ,https://dashboard.example/// ",
    )

    assert settings.cors_origins_list == [
        "https://frontend.example",
        "https://dashboard.example",
    ]
