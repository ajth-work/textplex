from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.books import BookRecord


SOURCE_PDF = Path(
    r"Z:\FastFoto\Personal\Finished Book Scans\Chinese Books\Three-Body Problem (ZH) (ClearScan).pdf"
)


def test_upload_book_endpoint_registers_uploaded_pdf(tmp_path_factory) -> None:
    if not SOURCE_PDF.exists():
        raise AssertionError(f"Missing source fixture: {SOURCE_PDF}")

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
    assert record.status == "extracted"
    assert record.extraction_status == "complete"
    assert record.extracted_page_count == 4
    assert record.extraction_path is not None
    assert (data_root / "books" / record.id / "extractions" / "book-extraction.json").exists()
    assert record.source_path.endswith(".pdf")
    assert (data_root / "books" / record.id / "book.json").exists()


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
