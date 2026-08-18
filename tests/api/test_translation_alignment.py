from app.schemas.books import SentenceTranslationAlignment
from app.services.translation_alignment import translation_alignment_matches_text


def test_translation_alignment_must_match_current_translation_text() -> None:
    alignment = SentenceTranslationAlignment.model_validate(
        {
            "source_language_code": "zh",
            "target_language_code": "en",
            "target_tokens": [
                {"token_id": 1, "text": "His", "token_kind": "word"},
                {"token_id": 2, "text": " ", "token_kind": "space"},
                {"token_id": 3, "text": "mother", "token_kind": "word"},
                {"token_id": 4, "text": " remained", "token_kind": "word"},
                {"token_id": 5, "text": " silent.", "token_kind": "word"},
            ],
        }
    )

    assert translation_alignment_matches_text(alignment, "His mother remained silent.") is True
    assert translation_alignment_matches_text(alignment, "Or perhaps they drowned in the well?") is False
