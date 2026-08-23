from __future__ import annotations

import html
import json
import os
import urllib.error
import urllib.request
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

try:
    from google.auth import default as google_auth_default
    from google.auth import exceptions as google_auth_exceptions
    from google.auth import (
        load_credentials_from_file as google_auth_load_credentials_from_file,
    )
except ImportError:  # pragma: no cover - exercised only when the dependency is missing locally.
    google_auth_default = None
    google_auth_load_credentials_from_file = None
    class _GoogleAuthExceptions:
        class GoogleAuthError(Exception):
            pass

    google_auth_exceptions = _GoogleAuthExceptions()

GOOGLE_TRANSLATION_CREDENTIALS_ENV = "GOOGLE_TEXTPLEX_PROD_TRANSLATION"
GOOGLE_ROMANIZATION_CREDENTIALS_ENV = "GOOGLE_TEXTPLEX_PROD_ROMANIZATION"
GOOGLE_APPLICATION_CREDENTIALS_ENV = "GOOGLE_APPLICATION_CREDENTIALS"
GOOGLE_TRANSLATE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2"
GOOGLE_TRANSLATE_ROMANIZE_ENDPOINT = "https://translation.googleapis.com/v3/projects/{project_id}/locations/global:romanizeText"
GOOGLE_TRANSLATE_SCOPE = "https://www.googleapis.com/auth/cloud-translation"
GOOGLE_TRANSLATE_TARGET_LANGUAGE = "en"
GoogleTranslateFeature = Literal["translation", "romanization"]

# Cloud Translation Advanced currently exposes romanization only for this
# subset of non-Latin languages. Hebrew remains translation-supported but is
# not supported by romanizeText.
GOOGLE_ROMANIZATION_SUPPORTED_LANGUAGES = frozenset(
    {"ar", "am", "bn", "be", "gu", "hi", "ja", "kn", "my", "ru", "sr", "ta", "te", "uk"}
)


class _UrlLibResponse:
    def __init__(self, *, status: int, data: bytes, headers: dict[str, str]) -> None:
        self.status = status
        self.data = data
        self.headers = headers


class _UrlLibRequest:
    def __call__(
        self,
        method: str,
        url: str,
        headers: dict[str, str] | None = None,
        body: bytes | None = None,
        timeout: float | None = None,
        **_: Any,
    ) -> _UrlLibResponse:
        request = urllib.request.Request(url, data=body, headers=headers or {}, method=method)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return _UrlLibResponse(
                    status=getattr(response, "status", 200),
                    data=response.read(),
                    headers=dict(response.headers.items()),
                )
        except urllib.error.HTTPError as error:
            return _UrlLibResponse(
                status=error.code,
                data=error.read(),
                headers=dict(error.headers.items()),
            )


def _google_feature_credentials_env(feature: GoogleTranslateFeature) -> str:
    return (
        GOOGLE_TRANSLATION_CREDENTIALS_ENV
        if feature == "translation"
        else GOOGLE_ROMANIZATION_CREDENTIALS_ENV
    )


def _google_credentials_path(feature: GoogleTranslateFeature = "translation") -> Path | None:
    for env_name in (_google_feature_credentials_env(feature), GOOGLE_APPLICATION_CREDENTIALS_ENV):
        raw_path = os.getenv(env_name, "").strip()
        if not raw_path:
            continue
        path = Path(raw_path).expanduser()
        if path.is_file():
            return path
    return None


def _google_feature_credentials_path(feature: GoogleTranslateFeature) -> Path | None:
    raw_path = os.getenv(_google_feature_credentials_env(feature), "").strip()
    if not raw_path:
        return None
    path = Path(raw_path).expanduser()
    return path if path.is_file() else None


@lru_cache(maxsize=2)
def _load_google_credentials(feature: GoogleTranslateFeature = "translation") -> Any | None:
    credentials_path = _google_credentials_path(feature)
    if credentials_path is None:
        return None

    feature_credentials_path = _google_feature_credentials_path(feature)
    if feature_credentials_path is not None:
        if google_auth_load_credentials_from_file is None:
            return None
        try:
            credentials, _ = google_auth_load_credentials_from_file(
                str(feature_credentials_path),
                scopes=[GOOGLE_TRANSLATE_SCOPE],
            )
        except (google_auth_exceptions.GoogleAuthError, OSError, ValueError):
            return None
        return credentials

    if google_auth_default is None:
        return None

    try:
        credentials, _ = google_auth_default(scopes=[GOOGLE_TRANSLATE_SCOPE])
    except google_auth_exceptions.GoogleAuthError:
        return None
    return credentials


@lru_cache(maxsize=2)
def _load_google_project_id(feature: GoogleTranslateFeature = "translation") -> str | None:
    credentials_path = _google_credentials_path(feature)
    if credentials_path is not None:
        try:
            payload = json.loads(credentials_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            payload = None
        if isinstance(payload, dict):
            for key in ("project_id", "quota_project_id"):
                project_id = payload.get(key)
                if isinstance(project_id, str) and project_id.strip():
                    return project_id.strip()

    if google_auth_default is None:
        return None

    try:
        _, project_id = google_auth_default(scopes=[GOOGLE_TRANSLATE_SCOPE])
    except google_auth_exceptions.GoogleAuthError:
        return None
    return project_id.strip() if isinstance(project_id, str) and project_id.strip() else None


def is_google_translate_configured(feature: GoogleTranslateFeature = "translation") -> bool:
    return _google_credentials_path(feature) is not None


def is_google_translate_romanization_supported(language_code: str) -> bool:
    return language_code.strip().lower().split("-", 1)[0] in GOOGLE_ROMANIZATION_SUPPORTED_LANGUAGES


def translate_text(
    source_text: str,
    *,
    source_language_code: str,
    target_language_code: str = GOOGLE_TRANSLATE_TARGET_LANGUAGE,
) -> str | None:
    source_text = source_text.strip()
    if not source_text:
        return None

    credentials = _load_google_credentials("translation")
    if credentials is None:
        return None

    try:
        if not getattr(credentials, "valid", False):
            credentials.refresh(_UrlLibRequest())
    except google_auth_exceptions.GoogleAuthError:
        return None

    token = getattr(credentials, "token", None)
    if not isinstance(token, str) or not token.strip():
        return None

    request_body = json.dumps(
        {
            "q": source_text,
            "source": source_language_code,
            "target": target_language_code,
            "format": "text",
            "model": "nmt",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        GOOGLE_TRANSLATE_ENDPOINT,
        data=request_body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, UnicodeDecodeError, urllib.error.URLError, json.JSONDecodeError):
        return None

    translations = _translation_items(payload)
    translated_text = translations[0].get("translatedText") if translations else None
    if not isinstance(translated_text, str):
        return None

    cleaned = html.unescape(translated_text).strip()
    return cleaned or None


def romanize_text(
    source_text: str,
    *,
    source_language_code: str,
) -> str | None:
    romanized = romanize_texts([source_text], source_language_code=source_language_code)
    return romanized[0] if romanized else None


def romanize_texts(
    source_texts: list[str],
    *,
    source_language_code: str,
) -> list[str | None]:
    normalized_texts = [text.strip() for text in source_texts if isinstance(text, str) and text.strip()]
    if not normalized_texts:
        return []

    credentials = _load_google_credentials("romanization")
    project_id = _load_google_project_id("romanization")
    if credentials is None or project_id is None:
        return [None] * len(normalized_texts)

    try:
        if not getattr(credentials, "valid", False):
            credentials.refresh(_UrlLibRequest())
    except google_auth_exceptions.GoogleAuthError:
        return [None] * len(normalized_texts)

    token = getattr(credentials, "token", None)
    if not isinstance(token, str) or not token.strip():
        return [None] * len(normalized_texts)

    request_body = json.dumps(
        {
            "source_language_code": source_language_code,
            "contents": normalized_texts,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        GOOGLE_TRANSLATE_ROMANIZE_ENDPOINT.format(project_id=project_id),
        data=request_body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
            "x-goog-user-project": project_id,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, UnicodeDecodeError, urllib.error.URLError, json.JSONDecodeError):
        return [None] * len(normalized_texts)

    romanized_items = _romanization_items(payload)
    results: list[str | None] = []
    for index, text in enumerate(normalized_texts):
        item = romanized_items[index] if index < len(romanized_items) else None
        romanized_text = item.get("romanizedText") if isinstance(item, dict) else None
        cleaned = html.unescape(romanized_text).strip() if isinstance(romanized_text, str) else None
        results.append(cleaned or None)

    if len(results) < len(normalized_texts):
        results.extend([None] * (len(normalized_texts) - len(results)))
    return results


def _translation_items(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    data = payload.get("data")
    if not isinstance(data, dict):
        return []
    translations = data.get("translations")
    if not isinstance(translations, list):
        return []
    return [item for item in translations if isinstance(item, dict)]


def _romanization_items(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    romanizations = payload.get("romanizations")
    if not isinstance(romanizations, list):
        return []
    return [item for item in romanizations if isinstance(item, dict)]
