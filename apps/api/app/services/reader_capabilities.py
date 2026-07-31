from __future__ import annotations

from app.schemas.books import ReaderCapabilities


_CHARACTER_DISPLAY_LANGUAGES = frozenset({"ja", "ko", "zh"})


def get_reader_capabilities(language_code: str) -> ReaderCapabilities:
    language_root = (language_code or "").strip().lower().split("-", 1)[0]
    if language_root in _CHARACTER_DISPLAY_LANGUAGES:
        return ReaderCapabilities(token_display_modes=["word", "character"], default_token_display_mode="word")
    return ReaderCapabilities(token_display_modes=["word"], default_token_display_mode="word")
