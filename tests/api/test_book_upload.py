from pathlib import Path
import time

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.books import BookRecord


SOURCE_PDF = Path(
    r"Z:\FastFoto\Personal\Finished Book Scans\Chinese Books\Three-Body Problem (ZH) (ClearScan).pdf"
)


def test_upload_book_endpoint_registers_uploaded_pdf(tmp_path_factory) -> None:
    if not SOURCE_PDF.exists():
        pytest.skip(f"Optional local upload fixture is unavailable: {SOURCE_PDF}")

    data_root = tmp_path_factory.mktemp("textplex-upload-books")
    app.state.data_root = data_root
    client = TestClient(app)

    with SOURCE_PDF.open("rb") as file_handle:
        response = client.post(
            "/books/upload",
            data={
                "language_code": "zh",
                "title": "三体",
                "author": "刘慈欣",
                "page_start": "8",
                "page_count": "4",
            },
            files={"file": ("Three-Body Problem (ZH) (ClearScan).pdf", file_handle, "application/pdf")},
        )

    assert response.status_code == 200
    record = BookRecord.model_validate(response.json())
    assert record.language_code == "zh"
    assert record.title == "三体"
    assert record.author == "刘慈欣"
    assert record.source_filename == "Three-Body Problem (ZH) (ClearScan).pdf"
    assert record.page_image_count == 4
    assert record.status in {"processing", "pages_split", "extracted"}
    assert record.extraction_status in {"processing", "complete"}
    assert record.extraction_total_pages == 4
    assert record.extraction_pages_processed <= 4
    assert record.source_path.endswith(".pdf")
    assert (data_root / "books" / record.id / "book.json").exists()

    for _ in range(60):
        current = BookRecord.model_validate(client.get(f"/books/{record.id}").json())
        if current.extraction_status == "complete":
            record = current
            break
        time.sleep(0.25)

    assert record.extraction_status == "complete"
    assert record.extracted_page_count == 4
    assert record.status == "extracted"
    assert record.extraction_path is not None
    assert (data_root / "books" / record.id / "extractions" / "book-extraction.json").exists()


def test_upload_book_endpoint_defaults_to_openai_provider_from_env(monkeypatch, tmp_path_factory) -> None:
    if not SOURCE_PDF.exists():
        pytest.skip(f"Optional local upload fixture is unavailable: {SOURCE_PDF}")

    data_root = tmp_path_factory.mktemp("textplex-upload-books-openai-default")
    app.state.data_root = data_root
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr("app.main._start_background_extraction", lambda *_args, **_kwargs: None)

    client = TestClient(app)

    with SOURCE_PDF.open("rb") as file_handle:
        response = client.post(
            "/books/upload",
            data={
                "language_code": "zh",
                "title": "三体",
                "author": "刘慈欣",
                "page_start": "8",
                "page_count": "4",
            },
            files={"file": ("Three-Body Problem (ZH) (ClearScan).pdf", file_handle, "application/pdf")},
        )

    assert response.status_code == 200
    record = BookRecord.model_validate(response.json())
    assert record.ocr_provider == "openai"


def test_upload_book_endpoint_rejects_non_pdf(tmp_path_factory) -> None:
    data_root = tmp_path_factory.mktemp("textplex-upload-books-invalid")
    app.state.data_root = data_root
    client = TestClient(app)

    response = client.post(
        "/books/upload",
        data={"language_code": "zh"},
        files={"file": ("notes.txt", b"plain text", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "TextPlex import currently accepts PDF files only."
