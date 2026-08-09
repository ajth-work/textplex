import json
from pathlib import Path

from app.main import app
from fastapi.testclient import TestClient


def test_feedback_persists_original_text_and_fallback_triage(tmp_path: Path, monkeypatch) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    try:
        response = TestClient(app).post(
            "/feedback",
            json={
                "original_text": "The next page button is broken and I cannot use the reader.",
                "context": {
                    "route": "/reader/book-1/3",
                    "language_code": "ko",
                    "book_id": "book-1",
                    "page_number": 3,
                    "app_version": "0.1.0",
                },
            },
        )
    finally:
        app.state.data_root = original_data_root

    assert response.status_code == 200
    payload = response.json()
    assert payload["original_text"].startswith("The next page button")
    assert payload["context"]["language_code"] == "ko"
    assert payload["triage_source"] == "fallback"
    assert payload["triage"]["severity"] == "high"
    saved_files = list((tmp_path / "feedback").glob("*.json"))
    assert len(saved_files) == 1
    assert json.loads(saved_files[0].read_text(encoding="utf-8"))["id"] == payload["id"]


def test_feedback_rejects_empty_or_oversized_original_text() -> None:
    client = TestClient(app)
    context = {"route": "/home", "app_version": "0.1.0"}

    assert client.post("/feedback", json={"original_text": "", "context": context}).status_code == 422
    assert client.post("/feedback", json={"original_text": "x" * 5001, "context": context}).status_code == 422
