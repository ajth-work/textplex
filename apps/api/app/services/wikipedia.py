from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SUPPORTED_WIKIPEDIA_LANGUAGE_CODES = frozenset({"zh", "ko", "ja", "ru", "he", "ar", "yo", "no", "sv", "fi"})
NORDIC_WIKIPEDIA_LANGUAGE_CODES = frozenset({"no", "sv", "fi"})
_MAX_ARTICLE_CHARACTERS = 24_000
_DEFAULT_MIN_ARTICLE_CHARACTERS = 1_000
_DEFAULT_NORDIC_MIN_ARTICLE_CHARACTERS = 400
_DEFAULT_MAX_ARTICLE_ATTEMPTS = 5
_USER_AGENT = "TextPlex/0.1 (local reading app; Wikipedia import)"


class WikipediaImportError(RuntimeError):
    """Raised when Wikipedia cannot provide a usable random article."""


@dataclass(frozen=True)
class WikipediaArticle:
    language_code: str
    title: str
    text: str


def _article_api_url(language_code: str) -> str:
    params = {
        "action": "query",
        "generator": "random",
        "grnnamespace": "0",
        "grnfilterredir": "nonredirects",
        "grnlimit": "1",
        "prop": "extracts|info",
        "inprop": "url",
        "explaintext": "1",
        "exchars": str(_MAX_ARTICLE_CHARACTERS),
        "format": "json",
        "formatversion": "2",
    }
    return f"https://{language_code}.wikipedia.org/w/api.php?{urlencode(params)}"


def _clean_article_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    return re.sub(r"\n{3,}", "\n\n", value).strip()


def _positive_int_from_env(name: str, default: int) -> int:
    raw_value = os.getenv(name, str(default)).strip()
    try:
        return max(1, int(raw_value))
    except ValueError:
        return default


def fetch_random_article(language_code: str) -> WikipediaArticle:
    normalized_language = language_code.strip().lower()
    if normalized_language not in SUPPORTED_WIKIPEDIA_LANGUAGE_CODES:
        supported = ", ".join(sorted(SUPPORTED_WIKIPEDIA_LANGUAGE_CODES))
        raise ValueError(f"Wikipedia random import is not available for {normalized_language!r}. Choose one of: {supported}.")

    if normalized_language in NORDIC_WIKIPEDIA_LANGUAGE_CODES:
        minimum_characters = _positive_int_from_env(
            "TEXTPLEX_WIKIPEDIA_NORDIC_MIN_ARTICLE_CHARACTERS",
            _DEFAULT_NORDIC_MIN_ARTICLE_CHARACTERS,
        )
    else:
        minimum_characters = _positive_int_from_env(
            "TEXTPLEX_WIKIPEDIA_MIN_ARTICLE_CHARACTERS",
            _DEFAULT_MIN_ARTICLE_CHARACTERS,
        )
    max_attempts = _positive_int_from_env(
        "TEXTPLEX_WIKIPEDIA_MAX_ARTICLE_ATTEMPTS",
        _DEFAULT_MAX_ARTICLE_ATTEMPTS,
    )
    for _ in range(max_attempts):
        request = Request(
            _article_api_url(normalized_language),
            headers={"Accept": "application/json", "User-Agent": _USER_AGENT},
        )
        try:
            with urlopen(request, timeout=12) as response:
                payload = json.loads(response.read(1_000_000).decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise WikipediaImportError("Wikipedia did not respond with a usable article. Please try again.") from exc

        pages = payload.get("query", {}).get("pages", []) if isinstance(payload, dict) else []
        page = pages[0] if isinstance(pages, list) and pages else None
        title = page.get("title", "") if isinstance(page, dict) else ""
        text = _clean_article_text(page.get("extract")) if isinstance(page, dict) else ""
        if isinstance(title, str) and title.strip() and len(text) >= minimum_characters:
            return WikipediaArticle(language_code=normalized_language, title=title.strip(), text=text)

    raise WikipediaImportError(
        "Wikipedia returned only short articles. Please try importing again."
    )
