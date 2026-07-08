from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app.services.book_registry import import_book_from_path


SOURCE_PDF = Path(
    r"Z:\FastFoto\Personal\Finished Book Scans\Chinese Books\Three-Body Problem (ZH) (ClearScan).pdf"
)


def test_import_book_from_path_registers_real_pdf(tmp_path: Path) -> None:
    if not SOURCE_PDF.exists():
        pytest.skip(f"Missing source fixture: {SOURCE_PDF}")

    record = import_book_from_path(
        SOURCE_PDF,
        language_code="zh",
        title="三体",
        author="刘慈欣",
        data_root=tmp_path / "books",
    )

    assert record.language_code == "zh"
    assert record.title == "三体"
    assert record.author == "刘慈欣"
    assert record.total_pages == 312
    assert record.source_filename == "Three-Body Problem (ZH) (ClearScan).pdf"
    assert (tmp_path / "books" / record.id / "book.json").exists()


def test_import_book_endpoint_registers_real_pdf(tmp_path: Path) -> None:
    if not SOURCE_PDF.exists():
        pytest.skip(f"Missing source fixture: {SOURCE_PDF}")

    app.state.data_root = tmp_path
    client = TestClient(app)

    response = client.post(
        "/books/import",
        json={
            "source_path": str(SOURCE_PDF),
            "language_code": "zh",
            "title": "三体",
            "author": "刘慈欣",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["language_code"] == "zh"
    assert data["title"] == "三体"
    assert data["total_pages"] == 312
    assert (tmp_path / "books" / data["id"] / "book.json").exists()
