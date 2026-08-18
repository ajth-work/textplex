from pathlib import Path

from app.services import google_translate


def test_google_features_use_independent_credential_paths(tmp_path: Path, monkeypatch) -> None:
    translation_path = tmp_path / "translation.json"
    romanization_path = tmp_path / "romanization.json"
    translation_path.write_text("{}", encoding="utf-8")
    romanization_path.write_text("{}", encoding="utf-8")

    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    monkeypatch.setenv("GOOGLE_TEXTPLEX_PROD_TRANSLATION", str(translation_path))
    monkeypatch.setenv("GOOGLE_TEXTPLEX_PROD_ROMANIZATION", str(romanization_path))

    assert google_translate.is_google_translate_configured("translation") is True
    assert google_translate.is_google_translate_configured("romanization") is True
    assert google_translate._google_credentials_path("translation") == translation_path
    assert google_translate._google_credentials_path("romanization") == romanization_path


def test_google_credential_loader_receives_the_matching_feature_file(tmp_path: Path, monkeypatch) -> None:
    translation_path = tmp_path / "translation.json"
    romanization_path = tmp_path / "romanization.json"
    translation_path.write_text("{}", encoding="utf-8")
    romanization_path.write_text("{}", encoding="utf-8")

    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    monkeypatch.setenv("GOOGLE_TEXTPLEX_PROD_TRANSLATION", str(translation_path))
    monkeypatch.setenv("GOOGLE_TEXTPLEX_PROD_ROMANIZATION", str(romanization_path))
    google_translate._load_google_credentials.cache_clear()

    loaded_paths: list[str] = []

    def fake_load_credentials(path: str, *, scopes: list[str]):
        loaded_paths.append(path)
        return object(), None

    monkeypatch.setattr(google_translate, "google_auth_load_credentials_from_file", fake_load_credentials)

    assert google_translate._load_google_credentials("translation") is not None
    assert google_translate._load_google_credentials("romanization") is not None
    assert loaded_paths == [str(translation_path), str(romanization_path)]


def test_google_features_fall_back_to_the_legacy_shared_path(tmp_path: Path, monkeypatch) -> None:
    shared_path = tmp_path / "shared.json"
    shared_path.write_text("{}", encoding="utf-8")

    monkeypatch.delenv("GOOGLE_TEXTPLEX_PROD_TRANSLATION", raising=False)
    monkeypatch.delenv("GOOGLE_TEXTPLEX_PROD_ROMANIZATION", raising=False)
    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", str(shared_path))

    assert google_translate.is_google_translate_configured("translation") is True
    assert google_translate.is_google_translate_configured("romanization") is True
