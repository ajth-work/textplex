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
    assert summary["sentence_reads"] == 0
    assert summary["active_books"] == 1


def test_learning_profile_database_is_idempotent_across_multiple_sessions(
    imported_real_scan: tuple[Path, BookRecord],
) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    baseline_response = client.get("/learning/profile")
    assert baseline_response.status_code == 200
    baseline = baseline_response.json()

    first_session = client.post("/learning/sessions", json={"book_id": record.id})
    second_session = client.post("/learning/sessions", json={"book_id": record.id})

    assert first_session.status_code == 200
    assert second_session.status_code == 200

    summary_response = client.get("/learning/profile")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["reading_sessions"] == baseline["reading_sessions"] + 2


def test_learning_profile_records_sentence_read_and_exposures(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    session_response = client.post("/learning/sessions", json={"book_id": record.id})
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    sentence_response = client.post(
        "/learning/sentence-reads",
        json={
            "session_id": session_id,
            "book_id": record.id,
            "page_number": 1,
            "sentence_order": 2,
            "sentence_text": "这是 词语 练习。",
            "token_count": 3,
            "character_count": 5,
            "active_seconds": 21,
            "tokens": [
                {"surface_form": "这是", "lemma": "这是", "token_kind": "word"},
                {"surface_form": "词语", "lemma": "词语", "token_kind": "word"},
                {"surface_form": "练习", "lemma": "练习", "token_kind": "word"},
            ],
        },
    )
    assert sentence_response.status_code == 200
    sentence = sentence_response.json()
    assert sentence["book_id"] == record.id
    assert sentence["sentence_order"] == 2

    summary_response = client.get("/learning/profile")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["sentence_reads"] == 1
    assert summary["token_exposures"] >= 3
    assert summary["word_exposures"] >= 3
    assert summary["vocabulary_progress_rows"] >= 3

    study_response = client.get("/study")
    assert study_response.status_code == 200
    assert study_response.json()["queue_size"] >= 3


def test_import_to_reader_to_profile_vertical_slice(tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    client = TestClient(app)

    import_response = client.post(
        "/texts/import",
        json={
            "title": "Vertical Slice Sample",
            "author": "Local import",
            "language_code": "en",
            "text": "Hello world. Read books.",
        },
    )
    assert import_response.status_code == 200
    book = import_response.json()

    reader_response = client.get(f"/books/{book['id']}/pages/1")
    assert reader_response.status_code == 200
    reader_page = reader_response.json()
    assert reader_page["book"]["id"] == book["id"]
    assert reader_page["extraction"] is not None

    sentence = reader_page["extraction"]["page"]["sentences"][0]
    session_response = client.post("/learning/sessions", json={"book_id": book["id"]})
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    sentence_response = client.post(
        "/learning/sentence-reads",
        json={
            "session_id": session_id,
            "book_id": book["id"],
            "page_number": 1,
            "sentence_order": sentence["order"],
            "sentence_text": sentence["text"],
            "token_count": len(sentence["tokens"]),
            "character_count": len(sentence["text"]),
            "active_seconds": 20,
            "tokens": [
                {
                    "surface_form": token["surface_form"],
                    "lemma": token.get("lemma") or token["surface_form"],
                    "token_kind": "word",
                }
                for token in sentence["tokens"]
            ],
        },
    )
    assert sentence_response.status_code == 200

    profile_response = client.get("/learning/profile")
    assert profile_response.status_code == 200
    profile = profile_response.json()
    assert profile["reading_sessions"] == 1
    assert profile["sentence_reads"] == 1
    assert profile["vocabulary_progress_rows"] > 0

    progress_response = client.get("/progress")
    assert progress_response.status_code == 200
    assert any(item["book_id"] == book["id"] for item in progress_response.json()["books"])

    study_response = client.get("/study")
    assert study_response.status_code == 200
    assert study_response.json()["queue_size"] > 0
