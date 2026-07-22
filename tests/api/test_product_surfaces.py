from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.books import BookRecord
from app.services.lexicon import ensure_lexicon_database
from processor.contracts import BookExtractionResult, PageExtractionResult, SentenceResult, TokenResult


def test_analysis_search_import_and_settings_surfaces(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    extract_response = client.post(
        f"/books/{record.id}/extract",
        json={"page_start": 1, "page_count": 4, "force": True},
    )
    assert extract_response.status_code == 200

    analysis_response = client.get(f"/analysis/{record.id}")
    assert analysis_response.status_code == 200
    analysis = analysis_response.json()
    assert analysis["book_id"] == record.id
    assert analysis["has_extraction"] is True
    assert analysis["sentence_count"] > 0
    assert analysis["metrics"]["metric_status"] == "unsupported"
    assert analysis["extraction_progress_percent"] == 100

    search_response = client.get("/search", params={"query": record.title})
    assert search_response.status_code == 200
    search = search_response.json()
    assert search["result_count"] >= 1
    assert any(result["kind"] == "book" and result["book_id"] == record.id for result in search["results"])

    import_response = client.get("/import")
    assert import_response.status_code == 200
    import_surface = import_response.json()
    assert import_surface["recent_books"][0]["book_id"] == record.id

    settings_update = client.put(
        "/settings",
        json={"entries": [{"key": "theme", "value": "night"}, {"key": "readerMode", "value": "sentence"}]},
    )
    assert settings_update.status_code == 200
    settings = settings_update.json()
    assert {entry["key"] for entry in settings["entries"]} >= {"theme", "readerMode"}

    settings_response = client.get("/settings")
    assert settings_response.status_code == 200
    assert {entry["key"] for entry in settings_response.json()["entries"]} >= {"theme", "readerMode"}


def test_analysis_surface_exposes_chinese_hsk_metrics(tmp_path: Path) -> None:
    from app.main import app
    from app.services.book_registry import import_book_from_path

    data_root = tmp_path / "data"
    record = import_book_from_path(
        Path(__file__).resolve().parents[1] / "fixtures" / "books" / "alice-mini",
        language_code="zh",
        data_root=data_root / "books",
    )
    extraction = BookExtractionResult(
        book_id=record.id,
        source_path=record.source_path,
        page_start=1,
        page_end=1,
        language_code="zh",
        pages=[
            PageExtractionResult(
                book_id=record.id,
                page_number=1,
                language_code="zh",
                raw_text="你好。",
                clean_text="你好。",
                sentences=[
                    SentenceResult(
                        order=1,
                        text="你好。",
                        tokens=[TokenResult(order=1, surface_form="你好")],
                    )
                ],
            )
        ],
    )
    extraction_path = data_root / "books" / record.id / "extractions" / "book-extraction.json"
    extraction_path.parent.mkdir(parents=True, exist_ok=True)
    extraction_path.write_text(extraction.model_dump_json(), encoding="utf-8")

    lexicon_db = ensure_lexicon_database(data_root)
    import sqlite3

    with sqlite3.connect(lexicon_db) as connection:
        connection.executemany(
            "INSERT INTO lexicon_entries (language_code, entry_type, surface_form, hsk_level) VALUES (?, ?, ?, ?)",
            [("zh", "character", "你", "HSK 1"), ("zh", "character", "好", "HSK 1")],
        )
        connection.commit()

    app.state.data_root = data_root
    response = TestClient(app).get(f"/analysis/{record.id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["metrics"]["text_expected_level_label"] == "HSK 1"
    assert payload["metrics"]["character_weighted_average_level"] == 1
    assert payload["metrics"]["comprehension_status"] == "not_available"


def test_progress_study_and_activity_surfaces_record_learning_events(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    session_response = client.post("/learning/sessions", json={"book_id": record.id})
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    page_response = client.post(
        "/learning/page-reads",
        json={
            "session_id": session_id,
            "book_id": record.id,
            "page_number": 1,
            "active_seconds": 35,
        },
    )
    assert page_response.status_code == 200

    sentence_response = client.post(
        "/learning/sentence-reads",
        json={
            "session_id": session_id,
            "book_id": record.id,
            "page_number": 1,
            "sentence_order": 1,
            "sentence_text": "测试 句子。",
            "token_count": 2,
            "character_count": 4,
            "active_seconds": 19,
            "tokens": [
                {"surface_form": "测试", "lemma": "测试", "token_kind": "word"},
                {"surface_form": "句子", "lemma": "句子", "token_kind": "word"},
            ],
        },
    )
    assert sentence_response.status_code == 200

    study_response = client.get("/study")
    assert study_response.status_code == 200
    study = study_response.json()
    assert "queue_size" in study

    progress_response = client.get("/progress")
    assert progress_response.status_code == 200
    progress = progress_response.json()
    assert progress["profile"]["reading_sessions"] >= 1
    assert any(book["book_id"] == record.id for book in progress["books"])

    activity_response = client.get("/activity", params={"limit": 10})
    assert activity_response.status_code == 200
    activity = activity_response.json()
    assert activity["event_count"] >= 2
    assert any(event["kind"] == "page_read" for event in activity["events"])
    assert any(event["kind"] == "sentence_read" for event in activity["events"])
