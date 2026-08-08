import sqlite3
from pathlib import Path
from types import SimpleNamespace

from app.main import app
from app.schemas.books import BookRecord
from app.services.lexicon import ensure_lexicon_database
from fastapi.testclient import TestClient
from processor.contracts import (
    BookExtractionResult,
    PageExtractionResult,
    SentenceResult,
    TokenResult,
)


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


def test_generated_article_endpoint_uses_template_fallback_when_openai_is_unavailable(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    app.state.data_root = tmp_path
    client = TestClient(app)

    response = client.post(
        "/articles/generate",
        json={
            "language_code": "zh",
            "topic": "travel planning",
            "genre": "travel",
            "tone": "narrative",
            "curriculum_mode": "exam",
            "curriculum_level": "HSK 3",
            "sentence_count": 8,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["language_code"] == "zh"
    assert payload["title"].startswith("Chinese HSK 3 practice article:")
    assert payload["sentence_count"] == 8
    assert payload["article_text"]
    assert payload["generation_source"] == "template"
    assert payload["book"]["language_code"] == "zh"
    assert payload["book"]["title"] == payload["title"]

    generation_response = client.get(f"/books/{payload['book']['id']}/generation")
    assert generation_response.status_code == 200
    generation = generation_response.json()
    assert generation["book_id"] == payload["book"]["id"]
    assert generation["title"] == payload["title"]
    assert generation["language_code"] == "zh"
    assert generation["prompt_version"] == "reader-article-v1"
    assert generation["model"] == "gpt-5.4-mini"
    assert generation["requested_sentence_count"] == 8
    assert generation["actual_sentence_count"] == 8
    assert "Request payload:" in generation["prompt_text"]
    assert generation["known_terms"] == payload["known_terms"]


def test_generated_article_endpoint_survives_older_study_schema(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    from app.services import generated_articles as generated_articles_service

    monkeypatch.setattr(generated_articles_service, "_table_columns", lambda *_args, **_kwargs: set())
    app.state.data_root = tmp_path
    client = TestClient(app)

    response = client.post(
        "/articles/generate",
        json={
            "language_code": "ru",
            "topic": "neighborhood life",
            "genre": "mystery",
            "tone": "narrative",
            "curriculum_mode": "study_program",
            "curriculum_level": "level-1",
            "sentence_count": 8,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["language_code"] == "ru"
    assert payload["generation_source"] == "template"
    assert payload["book"]["title"] == payload["title"]


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

    playback_response = client.post(
        "/learning/word-interactions",
        json={
            "book_id": record.id,
            "language_code": record.language_code,
            "target_text": "æµ‹è¯• å¥å­ã€‚",
            "page_number": 1,
            "interaction_type": "pronunciation_playback",
            "occurred_at": "2026-07-30T12:00:00Z",
        },
    )
    assert playback_response.status_code == 200

    study_response = client.get("/study")
    assert study_response.status_code == 200
    study = study_response.json()
    assert "queue_size" in study

    progress_response = client.get("/progress")
    assert progress_response.status_code == 200
    progress = progress_response.json()
    assert progress["profile"]["reading_sessions"] >= 1
    assert any(book["book_id"] == record.id for book in progress["books"])
    assert any(book["book_id"] == record.id and book["reading_sessions"] >= 1 for book in progress["books"])

    activity_response = client.get("/activity", params={"limit": 10})
    assert activity_response.status_code == 200
    activity = activity_response.json()
    assert activity["event_count"] >= 2
    assert any(event["kind"] == "page_read" for event in activity["events"])
    assert any(event["kind"] == "sentence_read" for event in activity["events"])
    assert any(event["kind"] == "pronunciation_playback" for event in activity["events"])
    assert activity["reading_history"]
    assert activity["reading_history"][-1]["day_index"] == len(activity["reading_history"])


def test_progress_surface_only_loads_extractions_when_sentence_totals_are_needed(
    imported_real_scan: tuple[Path, BookRecord],
    monkeypatch,
) -> None:
    data_root, record = imported_real_scan
    app.state.data_root = data_root
    client = TestClient(app)

    from app.services import surfaces as surfaces_module

    def fake_load_book_extraction(*_args, **_kwargs) -> SimpleNamespace:
        raise AssertionError("progress should use cached sentence totals")

    monkeypatch.setattr(surfaces_module, "_load_book_extraction", fake_load_book_extraction)

    extract_response = client.post(
        f"/books/{record.id}/extract",
        json={"page_start": 1, "page_count": 4},
    )
    assert extract_response.status_code == 200
    updated_book = BookRecord.model_validate_json((data_root / "books" / record.id / "book.json").read_text(encoding="utf-8"))
    assert updated_book.total_sentences > 0

    response = client.get("/progress")
    assert response.status_code == 200
    progress = response.json()
    assert any(book["book_id"] == record.id for book in progress["books"])


def test_progress_surface_tracks_unread_in_progress_and_finished_states(tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    client = TestClient(app)

    import_response = client.post(
        "/texts/import",
        json={
            "title": "Progress State Sample",
            "author": "Local import",
            "language_code": "en",
            "text": "Hello world. Read books.",
        },
    )
    assert import_response.status_code == 200
    book = import_response.json()

    initial_progress_response = client.get("/progress")
    assert initial_progress_response.status_code == 200
    initial_progress = next(item for item in initial_progress_response.json()["books"] if item["book_id"] == book["id"])
    assert initial_progress["reading_state"] == "not_read"
    assert initial_progress["progress_percent"] == 0

    reader_response = client.get(f"/books/{book['id']}/pages/1")
    assert reader_response.status_code == 200
    reader_page = reader_response.json()
    sentences = reader_page["extraction"]["page"]["sentences"]
    assert len(sentences) >= 2

    session_response = client.post("/learning/sessions", json={"book_id": book["id"]})
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    def read_sentence(sentence: dict[str, object]) -> None:
        response = client.post(
            "/learning/sentence-reads",
            json={
                "session_id": session_id,
                "book_id": book["id"],
                "page_number": 1,
                "sentence_order": sentence["order"],
                "sentence_text": sentence["text"],
                "token_count": len(sentence["tokens"]),
                "character_count": len(sentence["text"]),
                "active_seconds": 18,
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
        assert response.status_code == 200

    read_sentence(sentences[0])

    in_progress_response = client.get("/progress")
    assert in_progress_response.status_code == 200
    in_progress = next(item for item in in_progress_response.json()["books"] if item["book_id"] == book["id"])
    assert in_progress["reading_state"] == "in_progress"
    assert in_progress["progress_percent"] > 0

    read_sentence(sentences[1])

    finished_response = client.get("/progress")
    assert finished_response.status_code == 200
    finished = next(item for item in finished_response.json()["books"] if item["book_id"] == book["id"])
    assert finished["reading_state"] == "finished"
    assert finished["progress_percent"] == 100
