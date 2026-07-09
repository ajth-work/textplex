from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.books import BookRecord


def test_learning_profile_records_session_and_page_read(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    session_response = client.post("/learning/sessions", json={"book_id": record.id})
    assert session_response.status_code == 200
    session = session_response.json()
    assert session["book_id"] == record.id
    assert session["id"].startswith("session-")

    page_read_response = client.post(
        "/learning/page-reads",
        json={
            "session_id": session["id"],
            "book_id": record.id,
            "page_number": 8,
            "active_seconds": 45,
        },
    )
    assert page_read_response.status_code == 200
    page_read = page_read_response.json()
    assert page_read["book_id"] == record.id
    assert page_read["page_number"] == 8
    assert page_read["counted_as_read"] is True

    summary_response = client.get("/learning/profile")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["reading_sessions"] == 1
    assert summary["page_reads"] == 1
    assert summary["active_books"] == 1
