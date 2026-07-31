from app.services.reader_capabilities import get_reader_capabilities


def test_reader_capabilities_enable_character_display_for_cjk_readers() -> None:
    assert get_reader_capabilities("zh-Hans").model_dump() == {
        "token_display_modes": ["word", "character"],
        "default_token_display_mode": "word",
    }
    assert get_reader_capabilities("ko-KR").model_dump() == {
        "token_display_modes": ["word", "character"],
        "default_token_display_mode": "word",
    }
    assert get_reader_capabilities("ja").model_dump() == {
        "token_display_modes": ["word", "character"],
        "default_token_display_mode": "word",
    }


def test_reader_capabilities_keep_word_only_display_for_other_languages() -> None:
    for language_code in ("ru", "he", "ar", "fr", "en", "unknown"):
        assert get_reader_capabilities(language_code).model_dump() == {
            "token_display_modes": ["word"],
            "default_token_display_mode": "word",
        }
