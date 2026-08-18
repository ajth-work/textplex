import pytest
from app.services.openai_config import (
    OPENAI_DEV_API_KEY_ENV,
    OPENAI_FEATURE_API_KEY_ENVS,
    OPENAI_LEGACY_API_KEY_ENV,
    get_openai_api_key,
    get_openai_api_key_env,
)


@pytest.mark.parametrize("feature, env_name", list(OPENAI_FEATURE_API_KEY_ENVS.items()))
def test_feature_key_names_are_explicit(feature: str, env_name: str, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(env_name, f"{feature}-key")

    assert get_openai_api_key(feature) == f"{feature}-key"
    assert get_openai_api_key_env(feature) == env_name


def test_development_key_is_used_when_feature_key_is_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv(OPENAI_DEV_API_KEY_ENV, "dev-key")

    assert get_openai_api_key("ocr") == "dev-key"


def test_feature_key_wins_over_development_and_legacy_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv(OPENAI_DEV_API_KEY_ENV, "dev-key")
    monkeypatch.setenv(OPENAI_LEGACY_API_KEY_ENV, "legacy-key")
    monkeypatch.setenv("OPENAI_TEXTPLEX_PROD_READER_OCR", "ocr-key")

    assert get_openai_api_key("ocr") == "ocr-key"


def test_legacy_key_remains_a_migration_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv(OPENAI_DEV_API_KEY_ENV, raising=False)
    monkeypatch.setenv(OPENAI_LEGACY_API_KEY_ENV, "legacy-key")

    assert get_openai_api_key("feedback_analysis") == "legacy-key"


def test_unknown_feature_is_rejected() -> None:
    with pytest.raises(ValueError, match="Unknown OpenAI feature"):
        get_openai_api_key("unknown")
