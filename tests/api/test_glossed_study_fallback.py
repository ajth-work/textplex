from __future__ import annotations

import sqlite3
from pathlib import Path

from app.main import app
from app.services import surfaces as surfaces_service
from app.services.learning_profile import ensure_profile_database
from fastapi.testclient import TestClient


def test_study_surface_backfills_missing_glossed_meaning_from_lexicon_fallback(tmp_path: Path, monkeypatch) -> None:
    data_root = tmp_path / "data"
    db_path = ensure_profile_database(data_root)
    now = "2026-08-02T12:00:00Z"

    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            INSERT INTO study_vocabulary_items (
                language_code,
                lemma,
                display_form,
                source_book_id,
                source_page_number,
                source_sentence_order,
                source_token_order,
                source_surface_form,
                source_sentence_text,
                pronunciation,
                romanization,
                definition_short,
                proficiency_level,
                click_count,
                first_seen_at,
                last_seen_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "he",
                "חזרו",
                "חזרו",
                "book-he-001",
                12,
                3,
                4,
                "חזרו",
                "חזרו אל הבית.",
                "khazru",
                "khazru",
                None,
                "new",
                1,
                now,
                now,
            ),
        )
        connection.commit()

    class FakeEntry:
        definition = "to return"

    class FakeLookup:
        entries = [FakeEntry()]

    monkeypatch.setattr(surfaces_service, "lookup_lexicon_entry", lambda **_kwargs: FakeLookup())

    app.state.data_root = data_root
    client = TestClient(app)
    response = client.get("/study", params={"language_code": "he"})

    assert response.status_code == 200
    study = response.json()
    hebrew_group = next(group for group in study["study_groups"] if group["language_code"] == "he")
    assert hebrew_group["items"][0]["definition_short"] == "to return"

    with sqlite3.connect(db_path) as connection:
        stored_definition = connection.execute(
            "SELECT definition_short FROM study_vocabulary_items WHERE language_code = ? AND lemma = ?",
            ("he", "חזרו"),
        ).fetchone()[0]
    assert stored_definition == "to return"
