from pathlib import Path

from app.main import app
from app.schemas.books import BookRecord
from fastapi.testclient import TestClient


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
    assert summary["glossed_vocabulary_items"] >= 0
    assert summary["average_seconds_per_session"] is not None


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
    assert summary["glossed_vocabulary_items"] >= 0
    assert summary["average_seconds_per_session"] is not None

    study_response = client.get("/study")
    assert study_response.status_code == 200
    assert study_response.json()["queue_size"] >= 3


def test_learning_profile_records_pronunciation_playback(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    response = client.post(
        "/learning/word-interactions",
        json={
            "book_id": record.id,
            "language_code": record.language_code,
            "target_text": "ä½ å¥½ï¼ä¸ç•Œã€‚",
            "page_number": 1,
            "interaction_type": "pronunciation_playback",
            "occurred_at": "2026-07-30T12:00:00Z",
        },
    )
    assert response.status_code == 200
    interaction = response.json()
    assert interaction["interaction_type"] == "pronunciation_playback"
    assert interaction["target_text"] == "ä½ å¥½ï¼ä¸ç•Œã€‚"

    activity_response = client.get("/activity", params={"limit": 10})
    assert activity_response.status_code == 200
    activity = activity_response.json()
    assert any(event["kind"] == "pronunciation_playback" for event in activity["events"])


def test_learning_profile_records_definition_feedback(imported_real_scan: tuple[Path, BookRecord]) -> None:
    data_root, record = imported_real_scan

    app.state.data_root = data_root
    client = TestClient(app)

    remembered_response = client.post(
        "/learning/word-interactions",
        json={
            "book_id": record.id,
            "language_code": record.language_code,
            "target_text": "ä¾‹å­",
            "page_number": 1,
            "interaction_type": "definition_lookup_remembered",
            "occurred_at": "2026-07-30T13:00:00Z",
        },
    )
    missed_response = client.post(
        "/learning/word-interactions",
        json={
            "book_id": record.id,
            "language_code": record.language_code,
            "target_text": "å¤ä¹ ",
            "page_number": 1,
            "interaction_type": "definition_lookup_missed",
            "occurred_at": "2026-07-30T13:05:00Z",
        },
    )
    assert remembered_response.status_code == 200
    assert missed_response.status_code == 200

    summary_response = client.get("/learning/profile")
    assert summary_response.status_code == 200
    summary = summary_response.json()
    assert summary["remembered_word_interactions"] == 1
    assert summary["missed_word_interactions"] == 1

    activity_response = client.get("/activity", params={"limit": 10})
    assert activity_response.status_code == 200
    activity = activity_response.json()
    assert any(event["kind"] == "definition_lookup_remembered" for event in activity["events"])
    assert any(event["kind"] == "definition_lookup_missed" for event in activity["events"])
    assert any("Remembered:" in event["detail"] for event in activity["events"])
    assert any("Missed:" in event["detail"] for event in activity["events"])


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
    assert profile["glossed_vocabulary_items"] >= 0
    assert profile["average_seconds_per_session"] is not None

    progress_response = client.get("/progress")
    assert progress_response.status_code == 200
    progress_book = next(item for item in progress_response.json()["books"] if item["book_id"] == book["id"])
    assert progress_book["progress_unit"] == "sentences"
    assert progress_book["sentences_read"] == 1
    assert progress_book["resume_page"] == 1
    assert progress_book["resume_sentence_order"] == sentence["order"]
    assert progress_book["total_sentences"] >= 2
    assert progress_book["progress_percent"] > 0
    assert progress_book["last_read_at"]

    study_response = client.get("/study")
    assert study_response.status_code == 200
    assert study_response.json()["queue_size"] > 0


def test_russian_books_map_to_the_trki_learning_track(tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    client = TestClient(app)

    import_response = client.post(
        "/texts/import",
        json={
            "title": "Russian Sample",
            "author": "Local import",
            "language_code": "ru",
            "text": "Привет мир. Это тест.",
        },
    )
    assert import_response.status_code == 200
    book = import_response.json()
    assert book["language_code"] == "ru"

    summary_response = client.get("/learning/profile")
    assert summary_response.status_code == 200
    summary = summary_response.json()

    trki_track = next(track for track in summary["learning_tracks"] if track["code"] == "trki")
    assert trki_track["language_code"] == "ru"
    assert trki_track["books"] == 1
    assert summary["selected_track_code"] == "trki"


def test_russian_sentence_reads_keep_lemma_identity_in_the_study_queue(tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    client = TestClient(app)

    import_response = client.post(
        "/texts/import",
        json={
            "title": "Russian Lemma Slice",
            "author": "Local import",
            "language_code": "ru",
            "text": "В конце сентября.",
        },
    )
    assert import_response.status_code == 200
    book = import_response.json()

    session_response = client.post("/learning/sessions", json={"book_id": book["id"]})
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]

    sentence_response = client.post(
        "/learning/sentence-reads",
        json={
            "session_id": session_id,
            "book_id": book["id"],
            "page_number": 1,
            "sentence_order": 1,
            "sentence_text": "В конце сентября.",
            "token_count": 1,
            "character_count": 17,
            "active_seconds": 12,
            "tokens": [
                {
                    "surface_form": "сентября",
                    "lemma": "сентябрь",
                    "token_kind": "word",
                }
            ],
        },
    )
    assert sentence_response.status_code == 200

    study_response = client.get("/study?language_code=ru")
    assert study_response.status_code == 200
    study = study_response.json()
    assert study["queue_size"] == 1
    assert study["queued_items"][0]["language_code"] == "ru"
    assert study["queued_items"][0]["lemma"] == "сентябрь"
def test_vocabulary_assessment_axes_advance_independently_after_stage_zero(tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    client = TestClient(app)

    import_response = client.post(
        "/texts/import",
        json={
            "title": "Assessment Sample",
            "author": "Local import",
            "language_code": "en",
            "text": "Hello world.",
        },
    )
    assert import_response.status_code == 200
    book = import_response.json()

    save_response = client.post(
        "/learning/study-items",
        json={
            "book_id": book["id"],
            "language_code": "ru",
            "lemma": "привет",
            "display_form": "привет",
            "page_number": 1,
            "sentence_order": 1,
            "token_order": 1,
            "source_surface_form": "привет",
            "source_sentence_text": "Hello world.",
            "pronunciation": "privet",
            "romanization": "privet",
            "definition_short": "hello",
            "proficiency_level": "A1",
        },
    )
    assert save_response.status_code == 200

    axis_correct_response = client.post(
        "/learning/vocabulary-reviews",
        json={
            "language_code": "ru",
            "lemma": "привет",
            "axis_key": "form_to_meaning",
            "result": "correct",
        },
    )
    assert axis_correct_response.status_code == 200
    first_state = axis_correct_response.json()
    assert first_state["stage_zero_complete"] is False
    assert first_state["srs_stage"] == 0
    assert first_state["axes"][0]["stage"] == 1
    assert all(axis["stage"] == 0 for axis in first_state["axes"][1:])

    axis_incorrect_response = client.post(
        "/learning/vocabulary-reviews",
        json={
            "language_code": "ru",
            "lemma": "привет",
            "axis_key": "form_to_reading",
            "result": "incorrect",
        },
    )
    assert axis_incorrect_response.status_code == 200
    second_state = axis_incorrect_response.json()
    assert second_state["axes"][1]["stage"] == 0

    wrong_axis_response = client.post(
        "/learning/vocabulary-reviews",
        json={
            "language_code": "ru",
            "lemma": "Ð¿Ñ€Ð¸Ð²ÐµÑ‚",
            "axis_key": "reading_to_form",
            "result": "wrong_axis",
        },
    )
    assert wrong_axis_response.status_code == 200
    wrong_axis_state = wrong_axis_response.json()
    assert wrong_axis_state["axes"][3]["stage"] == 0
    assert wrong_axis_state["axes"][3]["last_result"] == "wrong_axis"
    assert wrong_axis_state["axes"][3]["pass_count"] == 0
    assert wrong_axis_state["axes"][3]["fail_count"] == 0

    retry_response = client.post(
        "/learning/vocabulary-reviews",
        json={
            "language_code": "ru",
            "lemma": "привет",
            "axis_key": "reading_to_form",
            "result": "retry",
        },
    )
    assert retry_response.status_code == 200
    retry_state = retry_response.json()
    assert retry_state["axes"][3]["stage"] == 0
    assert retry_state["axes"][3]["last_result"] == "retry"
    assert retry_state["axes"][3]["pass_count"] == 0
    assert retry_state["axes"][3]["fail_count"] == 0

    for axis_key in ("form_to_reading", "meaning_to_form", "reading_to_form"):
        review_response = client.post(
            "/learning/vocabulary-reviews",
            json={
                "language_code": "ru",
                "lemma": "привет",
                "axis_key": axis_key,
                "result": "correct",
            },
        )
        assert review_response.status_code == 200

    final_response = client.post(
        "/learning/vocabulary-reviews",
        json={
            "language_code": "ru",
            "lemma": "привет",
            "axis_key": "form_to_meaning",
            "result": "correct",
        },
    )
    assert final_response.status_code == 200
    final_state = final_response.json()
    assert final_state["stage_zero_complete"] is True
    assert final_state["srs_stage"] >= 1
    assert all(axis["stage"] >= 1 for axis in final_state["axes"])

    floor_response = client.post(
        "/learning/vocabulary-reviews",
        json={
            "language_code": "ru",
            "lemma": "привет",
            "axis_key": "form_to_meaning",
            "result": "incorrect",
        },
    )
    assert floor_response.status_code == 200
    floor_state = floor_response.json()
    assert floor_state["axes"][0]["stage"] == 1
