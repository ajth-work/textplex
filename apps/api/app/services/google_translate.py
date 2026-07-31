from __future__ import annotations

import html
import json
import os
import urllib.error
import urllib.request
from functools import lru_cache
from pathlib import Path
from typing import Any

try:
    from google.auth import default as google_auth_default
except ImportError:  # pragma: no cover - exercised only when the dependency is missing locally.
    google_auth_default = None

GOOGLE_APPLICATION_CREDENTIALS_ENV = "GOOGLE_APPLICATION_CREDENTIALS"
GOOGLE_TRANSLATE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2"
GOOGLE_TRANSLATE_ROMANIZE_ENDPOINT = "https://translation.googleapis.com/v3/projects/{project_id}/locations/global:romanizeText"
GOOGLE_TRANSLATE_SCOPE = "https://www.googleapis.com/auth/cloud-translation"
GOOGLE_TRANSLATE_TARGET_LANGUAGE = "en"


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


def _google_credentials_path() -> Path | None:
    raw_path = os.getenv(GOOGLE_APPLICATION_CREDENTIALS_ENV, "").strip()
    if not raw_path:
        return None
    path = Path(raw_path).expanduser()
    return path if path.is_file() else None


@lru_cache(maxsize=1)
def _load_google_credentials() -> Any | None:
    credentials_path = _google_credentials_path()
    if credentials_path is None or google_auth_default is None:
        return None

    try:
        credentials, _ = google_auth_default(scopes=[GOOGLE_TRANSLATE_SCOPE])
    except Exception:
        return None
    return credentials


@lru_cache(maxsize=1)
def _load_google_project_id() -> str | None:
    credentials_path = _google_credentials_path()
    if credentials_path is not None:
        try:
            payload = json.loads(credentials_path.read_text(encoding="utf-8"))
        except Exception:
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
    except Exception:
        return None
    return project_id.strip() if isinstance(project_id, str) and project_id.strip() else None


def is_google_translate_configured() -> bool:
    return _google_credentials_path() is not None


def translate_text(
    source_text: str,
    *,
    source_language_code: str,
    target_language_code: str = GOOGLE_TRANSLATE_TARGET_LANGUAGE,
) -> str | None:
    source_text = source_text.strip()
    if not source_text:
        return None

    credentials = _load_google_credentials()
    if credentials is None:
        return None

    try:
        if not getattr(credentials, "valid", False):
            credentials.refresh(_UrlLibRequest())
    except Exception:
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
    except Exception:
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

    credentials = _load_google_credentials()
    project_id = _load_google_project_id()
    if credentials is None or project_id is None:
        return [None] * len(normalized_texts)

    try:
        if not getattr(credentials, "valid", False):
            credentials.refresh(_UrlLibRequest())
    except Exception:
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
    except Exception:
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
