from app.services.book_extraction import recover_book_extraction_result
from processor import build_book_extraction_result, build_page_extraction_result
from processor.contracts import CURRENT_PIPELINE_VERSION


def test_recovery_upgrades_stale_japanese_tokens_to_the_current_pipeline() -> None:
    page = build_page_extraction_result(
        book_id="japanese-reader",
        page_number=1,
        language_code="ja",
        raw_text="正しい。完全な強固さとしなやかさが、間違ってはいなくても。",
    ).model_copy(update={"pipeline_version": "textplex-2"})
    extraction = build_book_extraction_result(
        book_id="japanese-reader",
        source_path="/tmp/japanese-reader.txt",
        language_code="ja",
        page_start=1,
        page_end=1,
        pages=[page],
    )

    recovered = recover_book_extraction_result(extraction)

    assert recovered.pages[0].pipeline_version == CURRENT_PIPELINE_VERSION
    assert [token.surface_form for token in recovered.pages[0].sentences[0].tokens] == ["正しい"]
    assert [token.surface_form for token in recovered.pages[0].sentences[1].tokens] == [
        "完全な",
        "強固さ",
        "と",
        "しなやかさ",
        "が",
        "間違ってはいなくても",
    ]
