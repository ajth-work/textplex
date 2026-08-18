from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.main import app
from app.schemas.auth import AuthMeResponse
from app.schemas.feedback import FeedbackContext
from app.services import auth as auth_service
from app.services.admin_usage import get_admin_usage_summary
from app.services.feedback import create_feedback
from app.services.learning_profile import ensure_profile_database, get_profile_db_path
from fastapi.testclient import TestClient


def _context(role: str) -> auth_service.AuthenticatedUserContext:
    return auth_service.AuthenticatedUserContext(
        user=AuthMeResponse(
            id="admin-1",
            email="admin@example.com",
            account_role=role,  # type: ignore[arg-type]
            permissions=["account.read", "usage.global.read"] if role == "admin" else ["account.read"],
        ),
        access_token="test-token",
    )


def test_admin_usage_aggregates_profile_activity_and_feedback(tmp_path: Path) -> None:
    ensure_profile_database(tmp_path, "user-a")
    activity_time = (datetime.now(timezone.utc) - timedelta(days=1)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    with sqlite3.connect(get_profile_db_path(tmp_path, "user-a")) as connection:
        connection.execute(
            "INSERT INTO reading_sessions (id, book_id, started_at, ended_at, active_seconds) VALUES (?, ?, ?, ?, ?)",
            ("session-1", "book-1", activity_time, activity_time, 600),
        )
        connection.execute(
            "INSERT INTO page_reads (session_id, book_id, page_number, active_seconds, estimated_seconds, completion_ratio, counted_as_read, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("session-1", "book-1", 1, 60, 60, 1.0, 1, activity_time),
        )
        connection.execute(
            "INSERT INTO sentence_reads (session_id, book_id, page_number, sentence_order, sentence_text, token_count, character_count, active_seconds, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("session-1", "book-1", 1, 1, "A sentence.", 2, 10, 30, activity_time),
        )
        connection.execute(
            "INSERT INTO token_exposures (session_id, book_id, page_number, sentence_order, token_kind, surface_form, normalized_form, character_count, active_seconds, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("session-1", "book-1", 1, 1, "word", "sentence", "sentence", 8, 5, activity_time),
        )
        connection.commit()

    create_feedback(
        tmp_path,
        "The reader is difficult to navigate.",
        FeedbackContext(route="/reader/book-1/1", app_version="test"),
        user_id="user-a",
    )

    summary = get_admin_usage_summary(tmp_path)

    assert summary.profile_count == 1
    assert summary.active_profiles_7d == 1
    assert summary.reading_sessions == 1
    assert summary.page_reads == 1
    assert summary.sentence_reads == 1
    assert summary.active_seconds == 600
    assert summary.unique_words_exposed == 1
    assert summary.feedback_count == 1
    assert summary.open_feedback_count == 1
    assert summary.activity[0].page_reads == 1


def test_admin_usage_endpoint_requires_global_usage_permission(tmp_path: Path) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    app.dependency_overrides[auth_service.get_authenticated_user_context] = lambda: _context("member")
    try:
        response = TestClient(app).get("/admin/usage")
    finally:
        app.dependency_overrides.clear()
        app.state.data_root = original_data_root

    assert response.status_code == 403


def test_admin_usage_endpoint_returns_aggregate_snapshot_for_admin(tmp_path: Path) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    app.dependency_overrides[auth_service.get_authenticated_user_context] = lambda: _context("admin")
    try:
        response = TestClient(app).get("/admin/usage")
    finally:
        app.dependency_overrides.clear()
        app.state.data_root = original_data_root

    assert response.status_code == 200
    assert response.json()["data_scope"] == "local_data"
