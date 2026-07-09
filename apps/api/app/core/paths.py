from __future__ import annotations

from pathlib import Path


def get_repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def get_data_root() -> Path:
    return get_repo_root() / "data"


def get_books_root() -> Path:
    return get_data_root() / "books"


def get_lexicon_source_root() -> Path:
    return get_repo_root() / "resources" / "lexicon" / "chinese-character-recognition"
