from pathlib import Path

import pytest
from app.main import app
from app.services.book_extraction import extract_book_pages
from app.services.book_registry import import_book_from_path
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def restore_app_data_root():
    original_data_root = app.state.data_root
    yield
    app.state.data_root = original_data_root


def test_import_txt_preserves_form_feed_pages_and_extracts_text(tmp_path: Path) -> None:
    txt_path = tmp_path / "reading-sample.txt"
    txt_path.write_text("First page.\r\nKeep this paragraph.\fSecond page.\n", encoding="utf-8")
    data_root = tmp_path / "books"

    book = import_book_from_path(txt_path, language_code="en", data_root=data_root)
    artifacts = extract_book_pages(book=book, data_root=data_root, force=True)

    assert book.title == "reading-sample"
    assert book.source_filename == "reading-sample.txt"
    assert book.total_pages == 2
    assert book.page_image_count == 2
    assert [artifact.text_source for artifact in artifacts] == ["txt", "txt"]
    assert artifacts[0].page.raw_text == "First page.\n\nKeep this paragraph."
    assert artifacts[1].page.raw_text == "Second page."
    assert (data_root / book.id / "pages" / "page-0001.png").exists()
    assert (data_root / book.id / "pages" / "page-0002.png").exists()


def test_upload_txt_endpoint_registers_and_starts_extraction(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    app.state.data_root = tmp_path / "data"
    monkeypatch.setattr("app.main._start_background_extraction", lambda *_args, **_kwargs: None)

    response = TestClient(app).post(
        "/books/upload",
        data={"language_code": "en", "title": "Uploaded Notes", "author": "Example Author"},
        files={"file": ("uploaded.txt", "First sentence.\fSecond sentence.", "text/plain")},
    )

    assert response.status_code == 200
    record = response.json()
    assert record["title"] == "Uploaded Notes"
    assert record["author"] == "Example Author"
    assert record["source_filename"] == "uploaded.txt"
    assert record["total_pages"] == 2
    assert record["page_image_count"] == 2
    assert record["source_path"].endswith(".txt")
    assert TestClient(app).get("/import").json()["can_upload_txt"] is True
