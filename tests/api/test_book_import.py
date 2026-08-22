from pathlib import Path

import fitz
import pytest
from app.main import app
from app.schemas.books import BookRecord
from fastapi.testclient import TestClient
from pypdf.errors import PdfReadError


def test_import_book_from_path_registers_alice_mini_fixture(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    assert record.language_code == "en"
    assert record.title == "Alice Mini Fixture"
    assert record.author == "Lewis Carroll"
    assert record.total_pages == 3
    assert record.total_sentences == 0
    assert record.page_split_status == "complete"
    assert record.page_image_count == 3
    assert record.status == "pages_split"
    assert record.source_filename == "alice-mini"
    assert (data_root / "books" / record.id / "book.json").exists()
    assert (data_root / "books" / record.id / "pages" / "page-0001.png").exists()
    assert (data_root / "books" / record.id / "pages" / "page-0003.png").exists()
    assert (data_root / "books" / record.id / "pages" / "manifest.json").exists()


def test_import_book_endpoint_registers_alice_mini_fixture(
    imported_real_scan: tuple[Path, BookRecord],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data_root, _record = imported_real_scan
    fixture_root = Path(__file__).resolve().parents[1] / "fixtures" / "books"

    app.state.data_root = data_root
    monkeypatch.setenv("TEXTPLEX_IMPORT_ROOTS", str(fixture_root.resolve()))
    client = TestClient(app)

    response = client.post(
        "/books/import",
        json={
            "source_path": str(fixture_root / "alice-mini"),
            "language_code": "en",
            "page_start": 1,
            "page_count": 4,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["language_code"] == "en"
    assert data["title"] == "Alice Mini Fixture"
    assert data["total_pages"] == 3
    assert data["total_sentences"] > 0
    assert data["page_split_status"] == "complete"
    assert data["page_image_count"] == 3
    assert data["status"] == "extracted"
    assert data["extraction_status"] == "complete"
    assert data["extracted_page_count"] == 3
    assert (data_root / "books" / data["id"] / "book.json").exists()
    assert (data_root / "books" / data["id"] / "extractions" / "book-extraction.json").exists()


def test_import_book_endpoint_extracts_only_the_first_page_before_background_work(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source_pdf = tmp_path / "progressive-reader.pdf"
    document = fitz.open()
    for page_number in range(1, 6):
        page = document.new_page()
        page.insert_text((72, 72), f"Page {page_number}. A readable sentence.")
    document.save(source_pdf)
    document.close()
    app.state.data_root = tmp_path
    monkeypatch.setenv("TEXTPLEX_IMPORT_ROOTS", str(tmp_path))
    scheduled_windows: list[tuple[int, int | None]] = []

    def schedule_window(*_args, page_start: int, page_count: int | None) -> None:
        scheduled_windows.append((page_start, page_count))

    monkeypatch.setattr("app.main._start_background_extraction", schedule_window)
    client = TestClient(app)

    response = client.post(
        "/books/import",
        json={"source_path": str(source_pdf), "language_code": "en"},
    )

    assert response.status_code == 200
    book = response.json()
    assert book["total_pages"] == 5
    assert book["page_image_count"] == 1
    assert book["extracted_page_count"] == 1
    assert book["extraction_status"] == "processing"
    assert scheduled_windows == [(2, 2)]

    scheduled_windows.clear()
    page_response = client.get(f"/books/{book['id']}/pages/3")
    assert page_response.status_code == 200
    assert page_response.json()["extraction"]["page"]["page_number"] == 3
    assert scheduled_windows == [(2, 1), (4, 1)]


def test_get_book_pages_returns_manifest_after_import(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.get(f"/books/{record.id}/pages")

    assert response.status_code == 200
    data = response.json()
    assert data["book_id"] == record.id
    assert data["page_count"] == 3
    assert [page["page_number"] for page in data["pages"]] == [1, 2, 3]
    assert data["pages"][0]["image_filename"] == "page-0001.png"
    assert data["pages"][-1]["image_filename"] == "page-0003.png"


def test_upload_image_pages_creates_ordered_book(
    imported_real_scan: tuple[Path, BookRecord],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data_root, _record = imported_real_scan
    app.state.data_root = data_root
    extraction_calls: list[dict[str, object]] = []

    def capture_extraction_call(*_args: object, **kwargs: object) -> None:
        extraction_calls.append(kwargs)

    monkeypatch.setattr("app.main._start_background_extraction", capture_extraction_call)
    page_root = data_root / "books" / _record.id / "pages"
    client = TestClient(app)

    response = client.post(
        "/books/upload-images",
        data={"language_code": "en", "title": "Photographed handout"},
        files=[
            ("images", ("page-1.png", (page_root / "page-0002.png").read_bytes(), "image/png")),
            ("images", ("page-2.png", (page_root / "page-0001.png").read_bytes(), "image/png")),
        ],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Photographed handout"
    assert data["source_type"] == "page-by-page"
    assert data["source_filename"] == "photo-import.pdf"
    assert data["total_pages"] == 2
    assert extraction_calls[0].get("force", True) is True
    source_path = Path(data["source_path"])
    original_source_bytes = source_path.read_bytes()
    original_source_hash = data["source_sha256"]
    manifest = client.get(f"/books/{data['id']}/pages").json()
    assert [page["page_number"] for page in manifest["pages"]] == [1, 2]

    session_response = client.post("/learning/sessions", json={"book_id": data["id"]})
    assert session_response.status_code == 200
    finish_response = client.post(
        f"/learning/books/{data['id']}/completion",
        json={"finished": True},
    )
    assert finish_response.status_code == 200
    assert finish_response.json()["reading_state"] == "finished"

    append_response = client.post(
        f"/books/{data['id']}/append-images",
        files=[
            ("images", ("page-3.png", (page_root / "page-0003.png").read_bytes(), "image/png")),
        ],
    )

    assert append_response.status_code == 200
    appended = append_response.json()
    assert extraction_calls[1]["force"] is False
    assert appended["source_type"] == "page-by-page"
    assert appended["total_pages"] == 3
    assert appended["source_sha256"] == original_source_hash
    assert source_path.read_bytes() == original_source_bytes
    progress = client.get("/progress").json()
    appended_progress = next(item for item in progress["books"] if item["book_id"] == data["id"])
    assert appended_progress["reading_state"] == "not_read"
    appended_manifest = client.get(f"/books/{data['id']}/pages").json()
    assert [page["page_number"] for page in appended_manifest["pages"]] == [1, 2, 3]
    assert (data_root / "books" / data["id"] / "pages" / "page-0003.png").exists()


def test_append_image_pages_rejects_static_books(
    imported_real_scan: tuple[Path, BookRecord],
) -> None:
    data_root, record = imported_real_scan
    app.state.data_root = data_root
    page_root = data_root / "books" / record.id / "pages"
    client = TestClient(app)

    response = client.post(
        f"/books/{record.id}/append-images",
        files=[
            ("images", ("page-next.png", (page_root / "page-0001.png").read_bytes(), "image/png")),
        ],
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only page-by-page books can receive more photo pages."


def test_upload_image_pages_returns_client_error_when_generated_pdf_is_unreadable(
    imported_real_scan: tuple[Path, BookRecord],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data_root, record = imported_real_scan
    app.state.data_root = data_root
    page_root = data_root / "books" / record.id / "pages"

    def reject_generated_pdf(*_args: object, **_kwargs: object) -> BookRecord:
        raise PdfReadError("generated PDF is unreadable")

    monkeypatch.setattr("app.main.import_book_from_path", reject_generated_pdf)
    client = TestClient(app)

    response = client.post(
        "/books/upload-images",
        data={"language_code": "en"},
        files=[
            ("images", ("page.png", (page_root / "page-0001.png").read_bytes(), "image/png")),
        ],
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "The uploaded page photos could not be assembled into a readable document. "
        "Please use clear JPG or PNG images."
    )
    uploads_root = data_root / "uploads"
    assert not any(uploads_root.iterdir()) if uploads_root.exists() else True


def test_upload_image_pages_returns_useful_errors_for_invalid_and_oversized_files(
    imported_real_scan: tuple[Path, BookRecord],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    data_root, record = imported_real_scan
    app.state.data_root = data_root
    page_root = data_root / "books" / record.id / "pages"
    client = TestClient(app)

    invalid_response = client.post(
        "/books/upload-images",
        data={"language_code": "en"},
        files=[("images", ("page.png", b"not an image", "image/png"))],
    )

    assert invalid_response.status_code == 400
    assert invalid_response.json()["detail"] == "Page 1 is not a readable JPG or PNG image."

    monkeypatch.setenv("TEXTPLEX_MAX_UPLOAD_BYTES", "3")
    oversized_response = client.post(
        "/books/upload-images",
        data={"language_code": "en"},
        files=[("images", ("page.png", (page_root / "page-0001.png").read_bytes(), "image/png"))],
    )

    assert oversized_response.status_code == 413
    assert oversized_response.json()["detail"] == "The photo batch exceeds the configured upload size limit."
