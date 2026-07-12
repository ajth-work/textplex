from pathlib import Path

from app.services.ocr import get_text_source_signature, resolve_page_text, should_use_openai_ocr


def test_openai_ocr_requires_provider_and_key(monkeypatch) -> None:
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    assert should_use_openai_ocr() is False
    assert get_text_source_signature() == ("pypdf", "pypdf-text-v1")

    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    assert should_use_openai_ocr() is False
    assert get_text_source_signature() == ("pypdf", "pypdf-text-v1")

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    assert should_use_openai_ocr() is True
    assert get_text_source_signature() == ("openai", "openai:gpt-5.4-nano:ocr-v1")


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
    ) -> str:
        called["page_image_path"] = page_image_path
        called["book_title"] = book_title
        called["language_code"] = language_code
        called["page_number"] = page_number
        return "示例句子。"

    monkeypatch.setattr("app.services.ocr.transcribe_page_image", fake_transcribe_page_image)

    text, source, signature = resolve_page_text(
        fallback_text="fallback text",
        page_image_path=Path("page-0001.png"),
        book_title="Sample Book",
        language_code="zh",
        page_number=1,
    )

    assert text == "示例句子。"
    assert source == "openai"
    assert signature == "openai:gpt-5.4-nano:ocr-v1"
    assert called == {
        "page_image_path": Path("page-0001.png"),
        "book_title": "Sample Book",
        "language_code": "zh",
        "page_number": 1,
    }
