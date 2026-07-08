import pytest
from pydantic import ValidationError

from processor.contracts import PageExtractionResult, SentenceResult, TokenResult


def test_page_extraction_result_accepts_minimal_valid_payload() -> None:
    result = PageExtractionResult(
        book_id="book-alice-mini",
        page_number=1,
        language_code="en",
        raw_text="Alice was beginning to get very tired.",
        clean_text="Alice was beginning to get very tired.",
        sentences=[
            SentenceResult(
                order=1,
                text="Alice was beginning to get very tired.",
                tokens=[
                    TokenResult(order=1, surface_form="Alice", lemma="alice"),
                    TokenResult(order=2, surface_form="was", lemma="be"),
                ],
            )
        ],
    )

    assert result.page_number == 1
    assert result.sentences[0].tokens[0].surface_form == "Alice"


def test_page_extraction_result_rejects_page_number_below_one() -> None:
    with pytest.raises(ValidationError):
        PageExtractionResult(
            book_id="book-alice-mini",
            page_number=0,
            language_code="en",
            raw_text="bad page",
            clean_text="bad page",
            sentences=[],
        )
