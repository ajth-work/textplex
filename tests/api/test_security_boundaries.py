from pathlib import Path

from fastapi.testclient import TestClient

from app.core.paths import get_data_root, resolve_books_root, resolve_user_data_root
from app.main import app


def test_configured_storage_roots_are_honored(monkeypatch, tmp_path: Path) -> None:
    books_root = tmp_path / "library"
    user_root = tmp_path / "learner"
    monkeypatch.setenv("BOOK_DATA_DIR", str(books_root))
    monkeypatch.setenv("USER_DATA_DIR", str(user_root))

    assert resolve_books_root(get_data_root()) == books_root.resolve()
    assert resolve_user_data_root(get_data_root()) == user_root.resolve()


def test_book_import_rejects_source_outside_configured_roots(tmp_path: Path) -> None:
    app.state.data_root = tmp_path / "data"
    client = TestClient(app)

    response = client.post(
        "/books/import",
        json={
            "source_path": str(tmp_path / "outside" / "book.pdf"),
            "language_code": "en",
        },
    )

    assert response.status_code == 403


def test_upload_size_limit_cleans_partial_upload(tmp_path: Path, monkeypatch) -> None:
    data_root = tmp_path / "data"
    app.state.data_root = data_root
    monkeypatch.setenv("TEXTPLEX_MAX_UPLOAD_BYTES", "3")
    client = TestClient(app)

    response = client.post(
        "/books/upload",
        data={"language_code": "en"},
        files={"file": ("too-large.pdf", b"1234", "application/pdf")},
    )

    assert response.status_code == 413
    uploads_root = data_root / "uploads"
    assert not any(uploads_root.iterdir()) if uploads_root.exists() else True
