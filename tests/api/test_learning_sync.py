from __future__ import annotations

import sqlite3
from pathlib import Path

from app.schemas.auth import AuthMeResponse
from app.schemas.learning import ReadingSessionCreateRequest
from app.services import learning_sync
from app.services.auth import AuthenticatedUserContext
from app.services.learning_profile import (
    _queue_learning_event,
    create_reading_session,
    ensure_profile_database,
    get_learning_profile_summary,
)


def _context() -> AuthenticatedUserContext:
    return AuthenticatedUserContext(
        user=AuthMeResponse(id="user-123", email="reader@example.com", role="authenticated", display_name="Reader"),
        access_token="valid-token",
    )


def test_learning_events_queue_and_sync_idempotently(tmp_path: Path, monkeypatch) -> None:
    create_reading_session(tmp_path, ReadingSessionCreateRequest(book_id="book-1"), owner_id="user-123")
    remote_events: list[dict[str, object]] = []

    def fake_rest_request(path: str, token: str, *, method: str = "GET", payload=None, prefer=None):
        assert token == "valid-token"
        if method == "POST":
            assert path.startswith("learning_events?")
            remote_events.extend(payload)
            return None
        assert "user_id=eq.user-123" in path
        return remote_events

    monkeypatch.setattr(learning_sync, "supabase_rest_request", fake_rest_request)

    first = learning_sync.sync_learning_events(tmp_path, _context())
    second = learning_sync.sync_learning_events(tmp_path, _context())

    assert first.status == "synced"
    assert first.uploaded_event_count == 1
    assert first.remote_event_count == 1
    assert second.uploaded_event_count == 0
    assert second.hydrated_event_count == 0
    assert get_learning_profile_summary(tmp_path, owner_id="user-123").reading_sessions == 1

    db_path = learning_sync.learning_profile.get_profile_db_path(tmp_path, "user-123")
    with sqlite3.connect(db_path) as connection:
        pending = connection.execute(
            "SELECT COUNT(*) FROM learning_event_outbox WHERE synced_at IS NULL"
        ).fetchone()[0]
    assert pending == 0


def test_learning_sync_hydrates_remote_session(tmp_path: Path, monkeypatch) -> None:
    remote_events = [
        {
            "event_id": "reading-session:remote",
            "event_type": "reading_session",
            "book_id": "book-remote",
            "occurred_at": "2026-07-23T10:00:00Z",
            "payload": {
                "session_id": "session-remote",
                "book_id": "book-remote",
                "started_at": "2026-07-23T10:00:00Z",
                "ended_at": None,
                "active_seconds": 12,
            },
        }
    ]

    def fake_rest_request(path: str, token: str, *, method: str = "GET", payload=None, prefer=None):
        assert method == "GET"
        return remote_events

    monkeypatch.setattr(learning_sync, "supabase_rest_request", fake_rest_request)

    result = learning_sync.sync_learning_events(tmp_path, _context())

    assert result.hydrated_event_count == 1
    assert get_learning_profile_summary(tmp_path, owner_id="user-123").reading_sessions == 1

    db_path = learning_sync.learning_profile.get_profile_db_path(tmp_path, "user-123")
    with sqlite3.connect(db_path) as connection:
        receipt = connection.execute(
            "SELECT event_id FROM learning_event_receipts WHERE event_id = ?",
            ("reading-session:remote",),
        ).fetchone()
    assert receipt == ("reading-session:remote",)


def test_learning_sync_accepts_all_local_event_types_and_preserves_event_ids(tmp_path: Path, monkeypatch) -> None:
    db_path = ensure_profile_database(tmp_path, "user-123")
    event_types = ("study_vocabulary_item", "word_interaction")
    with sqlite3.connect(db_path) as connection:
        for event_type in event_types:
            _queue_learning_event(
                connection,
                event_id=f"{event_type}:stable",
                event_type=event_type,
                book_id="book-1",
                occurred_at="2026-08-10T12:00:00Z",
                payload={
                    "book_id": "book-1",
                    "language_code": "ja",
                    "lemma": "読む",
                    "target_text": "読む",
                    "source_sentence_text": "本を読む。",
                    "page_number": 1,
                    "interaction_type": "definition_lookup",
                },
            )
        connection.commit()

    uploaded: list[dict[str, object]] = []

    def fake_rest_request(path: str, token: str, *, method: str = "GET", payload=None, prefer=None):
        if method == "POST":
            uploaded.extend(payload)
            return None
        return uploaded

    monkeypatch.setattr(learning_sync, "supabase_rest_request", fake_rest_request)

    result = learning_sync.sync_learning_events(tmp_path, _context())

    assert result.status == "synced"
    assert result.uploaded_event_count == 2
    assert {row["event_id"] for row in uploaded} == {"study_vocabulary_item:stable", "word_interaction:stable"}
    assert all(row["event_id"] == row["idempotency_key"] for row in uploaded)


def test_learning_sync_records_retry_schedule_and_reconciliation_status(tmp_path: Path, monkeypatch) -> None:
    create_reading_session(tmp_path, ReadingSessionCreateRequest(book_id="book-1"), owner_id="user-123")
    calls = 0

    def unavailable(path: str, token: str, *, method: str = "GET", payload=None, prefer=None):
        nonlocal calls
        if method == "POST":
            calls += 1
            from fastapi import HTTPException

            raise HTTPException(status_code=503, detail="provider unavailable")
        return []

    monkeypatch.setattr(learning_sync, "supabase_rest_request", unavailable)

    first = learning_sync.sync_learning_events(tmp_path, _context())
    second = learning_sync.sync_learning_events(tmp_path, _context())

    assert first.status == "pending"
    assert first.uploaded_event_count == 0
    assert first.retry_after_seconds >= 2
    assert first.last_reconciliation_status == "retry_scheduled"
    assert second.uploaded_event_count == 0
    assert second.last_error == "provider unavailable"
    assert calls == 1

    db_path = learning_sync.learning_profile.get_profile_db_path(tmp_path, "user-123")
    with sqlite3.connect(db_path) as connection:
        outbox = connection.execute(
            "SELECT attempts, last_error FROM learning_event_outbox"
        ).fetchone()
        reconciliation = connection.execute(
            "SELECT status, attempts, next_attempt_at, last_error FROM learning_event_reconciliation"
        ).fetchone()
    assert outbox == (1, "provider unavailable")
    assert reconciliation[0] == "retry_scheduled"
    assert reconciliation[1] == 1
    assert reconciliation[2]
    assert reconciliation[3] == "provider unavailable"


def test_learning_sync_blocks_malformed_local_events_for_manual_reconciliation(tmp_path: Path, monkeypatch) -> None:
    create_reading_session(tmp_path, ReadingSessionCreateRequest(book_id="book-1"), owner_id="user-123")
    db_path = learning_sync.learning_profile.get_profile_db_path(tmp_path, "user-123")
    with sqlite3.connect(db_path) as connection:
        connection.execute(
            "UPDATE learning_event_outbox SET payload = ?",
            ("{malformed",),
        )
        connection.commit()

    post_calls = 0

    def fake_rest_request(path: str, token: str, *, method: str = "GET", payload=None, prefer=None):
        nonlocal post_calls
        if method == "POST":
            post_calls += 1
        return []

    monkeypatch.setattr(learning_sync, "supabase_rest_request", fake_rest_request)

    first = learning_sync.sync_learning_events(tmp_path, _context())
    second = learning_sync.sync_learning_events(tmp_path, _context())

    assert first.conflict_count == 1
    assert first.last_reconciliation_status == "conflict"
    assert second.conflict_count == 1
    assert post_calls == 0
