import pytest

from processor.contracts import BookExtractionResult, PageExtractionResult, SentenceResult, TokenResult
from processor.difficulty import calculate_book_hsk_metrics, calculate_hsk_series, parse_hsk_level


def _extraction(language_code: str = "zh") -> BookExtractionResult:
    return BookExtractionResult(
        book_id="book-1",
        source_path="fixture.txt",
        page_start=1,
        page_end=1,
        language_code=language_code,
        pages=[
            PageExtractionResult(
                book_id="book-1",
                page_number=1,
                language_code=language_code,
                raw_text="你好，未知。学习。",
                clean_text="你好，未知。学习。",
                sentences=[
                    SentenceResult(
                        order=1,
                        text="你好，未知。",
                        tokens=[
                            TokenResult(order=1, surface_form="你好"),
                            TokenResult(order=2, surface_form="未知"),
                        ],
                    ),
                    SentenceResult(
                        order=2,
                        text="学习。",
                        tokens=[TokenResult(order=1, surface_form="学习")],
                    ),
                ],
            )
        ],
    )


def test_parse_hsk_level_supports_single_values_and_newer_bands() -> None:
    assert parse_hsk_level("HSK 4") == 4
    assert parse_hsk_level("7-9") == 8
    assert parse_hsk_level("not ranked") is None


def test_hsk_metrics_are_character_weighted_and_report_unknown_coverage() -> None:
    metrics = calculate_book_hsk_metrics(
        _extraction(),
        {
            "你": ["HSK 1"],
            "好": ["HSK 1"],
            "未": ["HSK 3"],
            "学": ["HSK 2"],
            "习": ["HSK 1"],
        },
    )

    assert metrics["metric_status"] == "ready"
    assert metrics["text_expected_level"] == pytest.approx(19 / 12)
    assert metrics["character_weighted_average_level"] == 1.6
    assert metrics["eligible_character_count"] == 6
    assert metrics["known_character_count"] == 5
    assert metrics["unknown_character_count"] == 1
    assert metrics["unknown_word_occurrences"] == 0
    assert metrics["partial_word_occurrences"] == 1
    assert metrics["sentence_count_with_level"] == 2
    assert {bucket["label"] for bucket in metrics["distribution"]} == {"HSK 1", "HSK 2", "HSK 3"}


def test_hsk_metrics_do_not_claim_support_for_non_chinese_text() -> None:
    metrics = calculate_book_hsk_metrics(_extraction("ja"), {"学": ["HSK 2"]})

    assert metrics["metric_status"] == "unsupported"
    assert metrics["text_expected_level"] is None
    assert metrics["recommendation"]


def test_hsk_series_preserves_sentence_and_page_order() -> None:
    extraction = _extraction()
    characters = {
        character
        for page in extraction.pages
        for sentence in page.sentences
        for token in sentence.tokens
        for character in token.surface_form
    }
    series = calculate_hsk_series(
        extraction,
        {character: ["HSK 1"] for character in characters},
    )

    assert [point["label"] for point in series["sentence_series"]] == ["S1", "S2"]
    assert [point["page_number"] for point in series["sentence_series"]] == [1, 1]
    assert [point["label"] for point in series["page_series"]] == ["P1"]
    assert series["page_series"][0]["value"] == pytest.approx(1.0)
