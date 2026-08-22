from __future__ import annotations

import sqlite3
from pathlib import Path

from app.main import app
from app.schemas.learning import StudyVocabularyItemCreateRequest
from app.services import learning_profile as learning_profile_service
from app.services import surfaces as surfaces_service
from app.services.learning_profile import (
    ensure_profile_database,
    record_study_vocabulary_item,
)
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
                "הדוגמאות",
                "הדוגמאות",
                "book-he-001",
                12,
                3,
                4,
                "הדוגמאות",
                "הדוגמאות מופיעות כאן.",
                "hdogmaot",
                "hdogmaot",
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
        def __init__(self) -> None:
            self.entries = [FakeEntry()]

    monkeypatch.setattr(surfaces_service, "lookup_lexicon_entry", lambda **_kwargs: FakeLookup())

    app.state.data_root = data_root
    client = TestClient(app)
    response = client.get("/study", params={"language_code": "he"})

    assert response.status_code == 200
    study = response.json()
    hebrew_group = next(group for group in study["study_groups"] if group["language_code"] == "he")
    assert hebrew_group["items"][0]["definition_short"] == "to return"
    assert hebrew_group["items"][0]["pronunciation"] == "hadugmaot"
    assert hebrew_group["items"][0]["romanization"] == "hadugmaot"

    with sqlite3.connect(db_path) as connection:
        stored_definition, stored_pronunciation, stored_romanization = connection.execute(
            "SELECT definition_short, pronunciation, romanization FROM study_vocabulary_items WHERE language_code = ? AND lemma = ?",
            ("he", "הדוגמאות"),
        ).fetchone()
    assert stored_definition == "to return"
    assert stored_pronunciation == "hadugmaot"
    assert stored_romanization == "hadugmaot"


def test_study_save_prefers_visible_source_word_when_fallback_meaning_is_needed(tmp_path: Path, monkeypatch) -> None:
    class FakeEntry:
        def __init__(self, definition: str) -> None:
            self.definition = definition

    def fake_lookup(**kwargs):
        definitions = {
            "visible-word": "meaning for visible word",
            "lemma-word": "meaning for a different lemma",
        }
        entry = FakeEntry(definitions[kwargs["term"]]) if kwargs["term"] in definitions else None

        class FakeLookup:
            entries = [entry] if entry else []

        return FakeLookup()

    monkeypatch.setattr(learning_profile_service, "lookup_lexicon_entry", fake_lookup)
    payload = StudyVocabularyItemCreateRequest(
        book_id="book-001",
        language_code="zh",
        lemma="lemma-word",
        display_form="visible-word",
        page_number=1,
        sentence_order=1,
        token_order=1,
        source_surface_form="visible-word",
        source_sentence_text="visible-word",
    )

    record = record_study_vocabulary_item(tmp_path / "data", payload)

    assert record.definition_short == "meaning for visible word"


def test_study_save_repairs_reviewed_hebrew_reading(tmp_path: Path) -> None:
    payload = StudyVocabularyItemCreateRequest(
        book_id="book-he-001",
        language_code="he",
        lemma="הדוגמאות",
        display_form="הדוגמאות",
        page_number=1,
        sentence_order=1,
        token_order=1,
        source_surface_form="הדוגמאות",
        source_sentence_text="הדוגמאות מופיעות כאן.",
        pronunciation="hdogmaot",
        romanization="hdogmaot",
        definition_short="the examples",
    )

    record = record_study_vocabulary_item(tmp_path / "data", payload)

    assert record.pronunciation == "hadugmaot"
    assert record.romanization == "hadugmaot"


def test_study_save_does_not_erase_existing_meaning_on_later_empty_save(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(
        learning_profile_service,
        "lookup_lexicon_entry",
        lambda **_kwargs: type("FakeLookup", (), {"entries": []})(),
    )
    data_root = tmp_path / "data"
    first_payload = StudyVocabularyItemCreateRequest(
        book_id="book-001",
        language_code="zh",
        lemma="visible-word",
        display_form="visible-word",
        page_number=1,
        sentence_order=1,
        token_order=1,
        source_surface_form="visible-word",
        source_sentence_text="visible-word",
        definition_short="meaning saved from reader lookup",
    )
    second_payload = first_payload.model_copy(update={"definition_short": None, "page_number": 2})

    record_study_vocabulary_item(data_root, first_payload)
    record = record_study_vocabulary_item(data_root, second_payload)

    assert record.definition_short == "meaning saved from reader lookup"
