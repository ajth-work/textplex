from __future__ import annotations

import sqlite3
from pathlib import Path

from app.schemas.auth import AuthMeResponse
from app.schemas.learning import ReadingSessionCreateRequest
from app.services import learning_sync
from app.services.auth import AuthenticatedUserContext
from app.services.learning_profile import create_reading_session, get_learning_profile_summary


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
