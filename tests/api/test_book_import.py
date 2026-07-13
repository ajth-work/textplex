from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.books import BookRecord


def test_import_book_from_path_registers_alice_mini_fixture(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    assert record.language_code == "en"
    assert record.title == "Alice Mini Fixture"
    assert record.author == "Lewis Carroll"
    assert record.total_pages == 3
    assert record.page_split_status == "complete"
    assert record.page_image_count == 3
    assert record.status == "pages_split"
    assert record.source_filename == "alice-mini"
    assert (data_root / "books" / record.id / "book.json").exists()
    assert (data_root / "books" / record.id / "pages" / "page-0001.png").exists()
    assert (data_root / "books" / record.id / "pages" / "page-0003.png").exists()
    assert (data_root / "books" / record.id / "pages" / "manifest.json").exists()


def test_import_book_endpoint_registers_alice_mini_fixture(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, _record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.post(
        "/books/import",
        json={
            "source_path": r"tests\fixtures\books\alice-mini",
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
    assert data["page_split_status"] == "complete"
    assert data["page_image_count"] == 3
    assert data["status"] == "extracted"
    assert data["extraction_status"] == "complete"
    assert data["extracted_page_count"] == 3
    assert (data_root / "books" / data["id"] / "book.json").exists()
    assert (data_root / "books" / data["id"] / "extractions" / "book-extraction.json").exists()


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
