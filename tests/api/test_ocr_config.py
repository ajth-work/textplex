from pathlib import Path

from app.services.ocr import OcrPageResult, get_text_source_signature, resolve_page_text, should_use_openai_ocr


def test_openai_ocr_requires_provider_and_key(monkeypatch) -> None:
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    assert should_use_openai_ocr() is False
    assert get_text_source_signature() == ("pypdf", "pypdf-text-v1")

    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    assert should_use_openai_ocr() is False
    assert get_text_source_signature() == ("pypdf", "pypdf-text-v1")
    assert should_use_openai_ocr("local") is False
    assert get_text_source_signature("local") == ("pypdf", "pypdf-text-v1")

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    assert should_use_openai_ocr() is True
    assert get_text_source_signature() == ("openai", "openai:gpt-5.4-mini:ocr-v2")
    assert should_use_openai_ocr("openai") is True
    assert get_text_source_signature("openai") == ("openai", "openai:gpt-5.4-mini:ocr-v2")


def test_resolve_page_text_uses_openai_route_without_network(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    called = {}

    def fake_transcribe_page_image(
        *,
        page_image_path: Path,
        book_title: str | None,
        language_code: str,
        page_number: int,
    ) -> OcrPageResult:
        called["page_image_path"] = page_image_path
        called["book_title"] = book_title
        called["language_code"] = language_code
        called["page_number"] = page_number
        return OcrPageResult(
            transcription="示例句子。",
            sentence_texts=["示例句子。"],
            sentence_translations=["Sample sentence."],
            page_translation="Sample page.",
            page_ends_with_sentence_terminator=True,
            token_hints=[],
            text_source="openai",
            text_source_signature="openai:gpt-5.4-mini:ocr-v2",
        )

    monkeypatch.setattr("app.services.ocr.transcribe_page_image", fake_transcribe_page_image)

    text, source, signature = resolve_page_text(
        fallback_text="fallback text",
        page_image_path=Path("page-0001.png"),
        book_title="Sample Book",
        language_code="zh",
        page_number=1,
        ocr_provider="openai",
    )

    assert text == "示例句子。"
    assert source == "openai"
    assert signature == "openai:gpt-5.4-mini:ocr-v2"
    assert called == {
        "page_image_path": Path("page-0001.png"),
        "book_title": "Sample Book",
        "language_code": "zh",
        "page_number": 1,
    }


def test_resolve_page_text_skips_openai_when_local_mode_is_selected(monkeypatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    def fail_transcribe_page_image(**_: object) -> OcrPageResult:
        raise AssertionError("OpenAI OCR should not have been called for local mode.")

    monkeypatch.setattr("app.services.ocr.transcribe_page_image", fail_transcribe_page_image)

    text, source, signature = resolve_page_text(
        fallback_text="fallback text",
        page_image_path=Path("page-0001.png"),
        book_title="Sample Book",
        language_code="zh",
        page_number=1,
        ocr_provider="local",
    )

    assert text == "fallback text"
    assert source == "pypdf"
    assert signature == "pypdf-text-v1"
