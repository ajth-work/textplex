import json
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.schemas.books import BookRecord
from app.services.book_registry import import_book_from_path
from app.services import book_extraction as book_extraction_service
from app.services.ocr import OcrPageResult


def test_extract_book_text_persists_structured_page_artifacts(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 4,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "complete"
    assert Path(payload["extraction_path"]).exists()

    book_path = data_root / "books" / record.id / "book.json"
    updated_book = BookRecord.model_validate_json(book_path.read_text(encoding="utf-8"))
    assert updated_book.extraction_status == "complete"
    assert updated_book.extracted_page_count == 3
    assert updated_book.status == "extracted"

    summary_response = client.get(f"/books/{record.id}/extractions")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["page_start"] == 1
    assert summary["page_end"] == 3
    assert len(summary["lexical_entries"]) > 0
    assert len(summary["token_occurrences"]) > 0
    assert len(summary["pages"]) == 3

    page_artifact = data_root / "books" / record.id / "extractions" / "pages" / "page-0001.json"
    assert page_artifact.exists()
    page_json = json.loads(page_artifact.read_text(encoding="utf-8"))
    assert page_json["page"]["page_number"] == 1
    assert len(page_json["page"]["sentences"]) > 0
    assert len(page_json["page"]["token_occurrences"]) > 0


def test_extract_book_endpoint_is_idempotent_for_same_sample(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    first = client.post(
        f"/books/{record.id}/extract",
        json={"page_start": 1, "page_count": 4},
    )
    second = client.post(
        f"/books/{record.id}/extract",
        json={"page_start": 1, "page_count": 4},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["status"] == "complete"
    assert second.json()["status"] == "complete"


def test_extract_book_text_records_openai_ocr_metadata(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    source_pdf = Path(__file__).resolve().parents[1] / "fixtures" / "books" / "three-body-mini" / "three-body-mini-slice.pdf"
    data_root = tmp_path
    record = import_book_from_path(
        source_pdf,
        language_code="zh",
        title="三体",
        author="刘慈欣",
        page_start=1,
        page_count=4,
        data_root=data_root / "books",
    )

    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_OCR_MODEL", "gpt-5.4-mini")
    monkeypatch.setattr(
        book_extraction_service,
        "resolve_page_ocr",
        lambda **_: OcrPageResult(
            transcription="这是第一句。",
            sentence_texts=["这是第一句。"],
            page_ends_with_sentence_terminator=True,
            token_hints=[],
            text_source="openai",
            text_source_signature="openai:gpt-5.4-mini:ocr-v2",
        ),
    )

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 1,
        },
    )

    assert response.status_code == 200
    page_artifact = data_root / "books" / record.id / "extractions" / "pages" / "page-0001.json"
    assert page_artifact.exists()
    page_json = json.loads(page_artifact.read_text(encoding="utf-8"))
    assert page_json["text_source"] == "openai"
    assert page_json["text_source_signature"] == "openai:gpt-5.4-mini:ocr-v2"
    assert page_json["page"]["raw_text"] == "这是第一句。"
    assert page_json["page"]["sentences"][0]["text"] == "这是第一句。"


def test_extract_book_text_uses_book_level_ocr_provider(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    source_pdf = Path(__file__).resolve().parents[1] / "fixtures" / "books" / "three-body-mini" / "three-body-mini-slice.pdf"
    data_root = tmp_path
    record = import_book_from_path(
        source_pdf,
        language_code="zh",
        title="三体",
        author="刘慈欣",
        page_start=1,
        page_count=1,
        ocr_provider="openai",
        data_root=data_root / "books",
    )

    assert record.ocr_provider == "openai"

    app.state.data_root = data_root
    client = TestClient(app)

    captured = {}

    def fake_resolve_page_ocr(**kwargs):
        captured.update(kwargs)
        return OcrPageResult(
            transcription="通过设置继续使用 OpenAI。",
            sentence_texts=["通过设置继续使用 OpenAI。"],
            page_ends_with_sentence_terminator=True,
            token_hints=[],
            text_source="openai",
            text_source_signature="openai:gpt-5.4-mini:ocr-v2",
        )

    monkeypatch.setattr(book_extraction_service, "resolve_page_ocr", fake_resolve_page_ocr)
    monkeypatch.setenv("AI_PROVIDER", "local")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    response = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 1,
        },
    )

    assert response.status_code == 200
    assert captured["ocr_provider"] == "openai"
    page_artifact = data_root / "books" / record.id / "extractions" / "pages" / "page-0001.json"
    page_json = json.loads(page_artifact.read_text(encoding="utf-8"))
    assert page_json["text_source"] == "openai"
    assert page_json["text_source_signature"] == "openai:gpt-5.4-mini:ocr-v2"


def test_force_extraction_refreshes_cached_artifacts(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    source_pdf = Path(__file__).resolve().parents[1] / "fixtures" / "books" / "three-body-mini" / "three-body-mini-slice.pdf"
    data_root = tmp_path
    record = import_book_from_path(
        source_pdf,
        language_code="zh",
        title="三体",
        author="刘慈欣",
        page_start=1,
        page_count=1,
        data_root=data_root / "books",
    )

    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("OPENAI_OCR_MODEL", "gpt-5.4-mini")

    app.state.data_root = data_root
    client = TestClient(app)

    monkeypatch.setattr(
        book_extraction_service,
        "resolve_page_ocr",
        lambda **_: OcrPageResult(
            transcription="旧句子。",
            sentence_texts=["旧句子。"],
            page_ends_with_sentence_terminator=True,
            token_hints=[],
            text_source="openai",
            text_source_signature="openai:gpt-5.4-mini:ocr-v2",
        ),
    )
    first = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 1,
        },
    )
    assert first.status_code == 200

    monkeypatch.setattr(
        book_extraction_service,
        "resolve_page_ocr",
        lambda **_: OcrPageResult(
            transcription="新句子。",
            sentence_texts=["新句子。"],
            page_ends_with_sentence_terminator=True,
            token_hints=[],
            text_source="openai",
            text_source_signature="openai:gpt-5.4-mini:ocr-v2",
        ),
    )
    second = client.post(
        f"/books/{record.id}/extract",
        json={
            "page_start": 1,
            "page_count": 1,
            "force": True,
        },
    )

    assert second.status_code == 200
    page_artifact = data_root / "books" / record.id / "extractions" / "pages" / "page-0001.json"
    page_json = json.loads(page_artifact.read_text(encoding="utf-8"))
    assert page_json["page"]["raw_text"] == "新句子。"
