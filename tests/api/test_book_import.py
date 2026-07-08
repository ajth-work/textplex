from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.books import BookRecord


def test_import_book_from_path_registers_real_pdf(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    assert record.language_code == "zh"
    assert record.title == "三体"
    assert record.author == "刘慈欣"
    assert record.total_pages == 312
    assert record.page_split_status == "complete"
    assert record.page_image_count == 4
    assert record.status == "pages_split"
    assert record.source_filename == "Three-Body Problem (ZH) (ClearScan).pdf"
    assert (data_root / "books" / record.id / "book.json").exists()
    assert (data_root / "books" / record.id / "pages" / "page-0008.png").exists()
    assert (data_root / "books" / record.id / "pages" / "page-0011.png").exists()
    assert (data_root / "books" / record.id / "pages" / "manifest.json").exists()


def test_import_book_endpoint_registers_real_pdf(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, _record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.post(
        "/books/import",
        json={
            "source_path": r"Z:\FastFoto\Personal\Finished Book Scans\Chinese Books\Three-Body Problem (ZH) (ClearScan).pdf",
            "language_code": "zh",
            "title": "三体",
            "author": "刘慈欣",
            "page_start": 8,
            "page_count": 4,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["language_code"] == "zh"
    assert data["title"] == "三体"
    assert data["total_pages"] == 312
    assert data["page_split_status"] == "complete"
    assert data["page_image_count"] == 4
    assert (data_root / "books" / data["id"] / "book.json").exists()


def test_get_book_pages_returns_manifest_after_import(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.get(f"/books/{record.id}/pages")

    assert response.status_code == 200
    data = response.json()
    assert data["book_id"] == record.id
    assert data["page_count"] == 4
    assert [page["page_number"] for page in data["pages"]] == [8, 9, 10, 11]
    assert data["pages"][0]["image_filename"] == "page-0008.png"
    assert data["pages"][-1]["image_filename"] == "page-0011.png"
