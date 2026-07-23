import json
from pathlib import Path

import fitz
from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.schemas.books import BookRecord
from app.services.book_registry import import_book_from_path
from app.services import book_extraction as book_extraction_service
from app.services.ocr import OcrPageResult
from processor.contracts import BookExtractionResult


def build_safe_sample_pdf(tmp_path: Path, *, page_count: int) -> Path:
    pdf_path = tmp_path / f"safe-sample-{page_count}.pdf"
    document = fitz.open()
    sample_pages = [
        "第一页：这是一个安全的测试页。",
        "第二页：我们只需要稳定的中文文本用于提取。",
        "第三页：内容不依赖任何受版权保护的原文。",
        "第四页：用来验证分页和缓存刷新。",
    ]
    for index in range(page_count):
        page = document.new_page(width=595, height=842)
        page.insert_text((72, 96), sample_pages[index % len(sample_pages)], fontsize=18)
        page.insert_text((72, 140), f"测试页 {index + 1}", fontsize=12)
    document.save(pdf_path)
    document.close()
    return pdf_path


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
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=4)
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
            sentence_translations=["This is the first sentence."],
            page_translation="This is page one.",
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
    assert page_json["page"]["page_translation"] == "This is page one."
    assert page_json["page"]["sentences"][0]["translation"] == "This is the first sentence."


def test_load_page_artifact_recovers_malformed_jsonish_transcription(tmp_path: Path) -> None:
    data_root = tmp_path / "books"
    book_id = "book-recovery-malformed"
    artifact_path = data_root / book_id / "extractions" / "pages" / "page-0001.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(
            {
                "source_page_sha256": "sha",
                "text_source": "openai",
                "text_source_signature": "openai:gpt-5.4-mini:ocr-v2",
                "processor_version": "0.1.0",
                "pipeline_version": "textplex-1",
                "page": {
                    "book_id": book_id,
                    "page_number": 1,
                    "language_code": "zh",
                    "source_page_sha256": "sha",
                    "processor_version": "0.1.0",
                    "pipeline_version": "textplex-1",
                    "raw_text": '{"transcription":"\\u79d1\\u5b66\\u8fb9\\u754c\\u3002","page_translation":"Science frontier.","page_ends_with_sentence_terminator":true,"token_hints":[{"surface_form":"\\u79d1\\u5b66\\u8fb9\\u754c","romanization":"k\\u0113xu\\xe9 bi\\u0101nji\\xe8","definition":"Science Boundary"}',
                    "clean_text": '{"transcription":"\\u79d1\\u5b66\\u8fb9\\u754c\\u3002","page_translation":"Science frontier.","page_ends_with_sentence_terminator":true,"token_hints":[{"surface_form":"\\u79d1\\u5b66\\u8fb9\\u754c","romanization":"k\\u0113xu\\xe9 bi\\u0101nji\\xe8","definition":"Science Boundary"}',
                    "page_translation": None,
                    "sentences": [
                        {
                            "order": 1,
                            "text": '{"transcription":"\\u79d1\\u5b66\\u8fb9\\u754c\\u3002","page_translation":"Science frontier.","page_ends_with_sentence_terminator":true,"token_hints":[{"surface_form":"\\u79d1\\u5b66\\u8fb9\\u754c","romanization":"k\\u0113xu\\xe9 bi\\u0101nji\\xe8","definition":"Science Boundary"}',
                            "translation": None,
                            "tokens": [],
                            "grammar_patterns": [],
                            "ends_with_sentence_terminator": False,
                        }
                    ],
                    "page_ends_with_sentence_terminator": False,
                    "token_occurrences": [],
                    "lexical_entries": [],
                },
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    recovered = book_extraction_service.load_page_artifact(book_id=book_id, page_number=1, data_root=data_root)

    assert recovered is not None
    assert recovered.page.raw_text == "科学边界。"
    assert recovered.page.clean_text == "科学边界。"
    assert recovered.page.page_translation == "Science frontier."
    assert recovered.page.page_ends_with_sentence_terminator is True
    assert recovered.page.sentences[0].text == "科学边界。"
    assert any(token.romanization for token in recovered.page.sentences[0].tokens)


def test_load_page_artifact_recovers_jsonish_transcription(tmp_path: Path) -> None:
    data_root = tmp_path / "books"
    book_id = "book-recovery"
    artifact_path = data_root / book_id / "extractions" / "pages" / "page-0001.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(
            {
                "source_page_sha256": "sha",
                "text_source": "openai",
                "text_source_signature": "openai:gpt-5.4-mini:ocr-v2",
                "processor_version": "0.1.0",
                "pipeline_version": "textplex-1",
                "page": {
                    "book_id": book_id,
                    "page_number": 1,
                    "language_code": "zh",
                    "source_page_sha256": "sha",
                    "processor_version": "0.1.0",
                    "pipeline_version": "textplex-1",
                    "raw_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                    "clean_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                    "page_translation": None,
                    "sentences": [
                        {
                            "order": 1,
                            "text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                            "translation": None,
                            "tokens": [],
                            "grammar_patterns": [],
                            "ends_with_sentence_terminator": False,
                        }
                    ],
                    "page_ends_with_sentence_terminator": False,
                    "token_occurrences": [],
                    "lexical_entries": [],
                },
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    recovered = book_extraction_service.load_page_artifact(book_id=book_id, page_number=1, data_root=data_root)

    assert recovered is not None
    assert recovered.page.raw_text == "科学边界。"
    assert recovered.page.clean_text == "科学边界。"
    assert recovered.page.page_translation == "Science frontier."
    assert recovered.page.sentences[0].text == "科学边界。"
    assert recovered.page.sentences[0].translation == "Science frontier."
    assert any(token.romanization for token in recovered.page.sentences[0].tokens)


def test_extract_book_text_uses_book_level_ocr_provider(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=1)
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
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=1)
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
def test_load_book_extraction_recovers_jsonish_transcription(tmp_path: Path) -> None:
    data_root = tmp_path / "books"
    book_id = "book-recovery-summary"
    artifact_path = data_root / book_id / "extractions" / "book-extraction.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(
            {
                "book_id": book_id,
                "source_path": "/workspace/data/uploads/example.pdf",
                "page_start": 1,
                "page_end": 1,
                "language_code": "zh",
                "pages": [
                    {
                        "book_id": book_id,
                        "page_number": 1,
                        "language_code": "zh",
                        "source_page_sha256": "sha",
                        "processor_version": "0.1.0",
                        "pipeline_version": "textplex-1",
                        "raw_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                        "clean_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                        "page_translation": None,
                        "sentences": [
                            {
                                "order": 1,
                                "text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                                "translation": None,
                                "tokens": [],
                                "grammar_patterns": [],
                                "ends_with_sentence_terminator": False,
                            }
                        ],
                        "page_ends_with_sentence_terminator": False,
                        "token_occurrences": [],
                        "lexical_entries": [],
                    }
                ],
                "lexical_entries": [],
                "token_occurrences": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    recovered = book_extraction_service.recover_book_extraction_result(
        BookExtractionResult.model_validate_json(artifact_path.read_text(encoding="utf-8")),
        data_root=data_root,
    )

    assert recovered.pages[0].raw_text == "科学边界。"
    assert recovered.pages[0].clean_text == "科学边界。"
    assert recovered.pages[0].page_translation == "Science frontier."
    assert recovered.pages[0].sentences[0].text == "科学边界。"
    assert recovered.pages[0].sentences[0].translation == "Science frontier."
    assert any(token.romanization for token in recovered.pages[0].sentences[0].tokens)


def test_get_book_extraction_route_recovers_jsonish_transcription(tmp_path: Path) -> None:
    source_pdf = build_safe_sample_pdf(tmp_path, page_count=1)
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

    artifact_path = data_root / "books" / record.id / "extractions" / "book-extraction.json"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(
            {
                "book_id": record.id,
                "source_path": record.source_path,
                "page_start": 1,
                "page_end": 1,
                "language_code": "zh",
                "pages": [
                    {
                        "book_id": record.id,
                        "page_number": 1,
                        "language_code": "zh",
                        "source_page_sha256": "sha",
                        "processor_version": "0.1.0",
                        "pipeline_version": "textplex-1",
                        "raw_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                        "clean_text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                        "page_translation": None,
                        "sentences": [
                            {
                                "order": 1,
                                "text": '{"transcription":"科学边界。","sentence_texts":["科学边界。"],"sentence_translations":["Science frontier."],"page_translation":"Science frontier.","page_ends_with_sentence_terminator":true}',
                                "translation": None,
                                "tokens": [],
                                "grammar_patterns": [],
                                "ends_with_sentence_terminator": False,
                            }
                        ],
                        "page_ends_with_sentence_terminator": False,
                        "token_occurrences": [],
                        "lexical_entries": [],
                    }
                ],
                "lexical_entries": [],
                "token_occurrences": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    app.state.data_root = data_root
    client = TestClient(app)
    response = client.get(f"/books/{record.id}/extractions")

    assert response.status_code == 200
    payload = response.json()
    assert payload["pages"][0]["raw_text"] == "科学边界。"
    assert payload["pages"][0]["clean_text"] == "科学边界。"
    assert payload["pages"][0]["page_translation"] == "Science frontier."
