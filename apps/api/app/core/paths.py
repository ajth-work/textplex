from __future__ import annotations

from pathlib import Path
import os


def get_repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def get_data_root() -> Path:
    return get_repo_root() / "data"


def get_books_root() -> Path:
    return _configured_path("BOOK_DATA_DIR", get_data_root() / "books")


def get_user_data_root() -> Path:
    return _configured_path("USER_DATA_DIR", get_data_root() / "user")


def resolve_books_root(data_root: Path) -> Path:
    """Resolve book storage while preserving temporary test roots."""
    if data_root.resolve() == get_data_root().resolve():
        return get_books_root()
    return data_root / "books"


def resolve_user_data_root(data_root: Path) -> Path:
    """Resolve profile storage while preserving temporary test roots."""
    if data_root.resolve() == get_data_root().resolve():
        return get_user_data_root()
    return data_root / "user"


def _configured_path(environment_name: str, fallback: Path) -> Path:
    configured = os.getenv(environment_name, "").strip()
    return Path(configured).expanduser().resolve() if configured else fallback


def _language_key(language_code: str) -> str:
    return language_code.split("-", 1)[0].strip().lower()


def get_lexicon_source_root(language_code: str = "zh") -> Path:
    language_key = _language_key(language_code)
    source_roots = {
        "zh": get_repo_root() / "resources" / "lexicon" / "chinese-character-recognition",
        "ja": get_repo_root() / "resources" / "lexicon" / "japanese",
        "ko": get_repo_root() / "resources" / "lexicon" / "korean",
        "ru": get_repo_root() / "resources" / "lexicon" / "russian",
        "he": get_repo_root() / "resources" / "lexicon" / "hebrew",
        "ar": get_repo_root() / "resources" / "lexicon" / "arabic",
    }
    return source_roots.get(language_key, get_repo_root() / "resources" / "lexicon" / language_key)
