from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sqlite3

from app.main import app
from app.schemas.auth import AuthMeResponse
from app.services import auth as auth_service
from app.services.analytics import get_admin_analytics_overview, record_analytics_event
from app.services.learning_profile import ensure_profile_database, get_profile_db_path
from fastapi.testclient import TestClient


def _context(role: str) -> auth_service.AuthenticatedUserContext:
    return auth_service.AuthenticatedUserContext(
        user=AuthMeResponse(
            id="admin-analytics-1",
            email="admin@example.com",
            account_role=role,  # type: ignore[arg-type]
            permissions=["account.read", "usage.global.read"] if role == "admin" else ["account.read"],
        ),
        access_token="test-token",
    )


def _timestamp(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def test_analytics_overview_aggregates_funnel_retention_and_watchlist(tmp_path: Path) -> None:
    now = datetime.now(timezone.utc)
    cohort_start = now - timedelta(days=10)
    record_analytics_event(tmp_path, event_id="book-1", event_name="book_imported", account_id="user-a", account_role="tester", occurred_at=_timestamp(cohort_start), feature_key="book_import")
    record_analytics_event(tmp_path, event_id="value-1", event_name="translation_used", account_id="user-a", account_role="tester", occurred_at=_timestamp(cohort_start + timedelta(days=1)), feature_key="translation")
    record_analytics_event(tmp_path, event_id="value-2", event_name="practice_generated", account_id="user-a", account_role="tester", occurred_at=_timestamp(cohort_start + timedelta(days=8)), feature_key="article_generation")
    record_analytics_event(tmp_path, event_id="paywall-1", event_name="paywall_seen", account_id="user-a", account_role="tester", occurred_at=_timestamp(cohort_start + timedelta(days=8)), feature_key="ai_limit")
    record_analytics_event(tmp_path, event_id="book-2", event_name="book_imported", account_id="user-b", account_role="member", occurred_at=_timestamp(cohort_start + timedelta(days=2)), feature_key="book_import")

    overview = get_admin_analytics_overview(tmp_path)

    assert overview.event_count == 5
    assert overview.sample_size == 2
    assert overview.metrics[2].key == "repeat_value_users"
    assert overview.metrics[2].value == 1
    assert overview.metrics[4].key == "paywall_intent_users"
    assert overview.metrics[4].value == 1
    assert [stage.key for stage in overview.funnel] == ["activation", "first_value", "repeat_value", "paywall_intent", "conversion"]
    assert overview.funnel[0].users == 2
    assert overview.funnel[2].users == 1
    assert overview.features[0].feature_key == "book_import"
    assert [(item.role, item.event_count, item.user_count) for item in overview.features[0].role_breakdown] == [("member", 1, 1), ("tester", 1, 1)]
    assert overview.retention[0].returned_1d == 1
    assert overview.watchlist[0].paywall_intent is True
    assert overview.watchlist[0].pseudonym.startswith("user-")


def test_analytics_event_endpoint_is_idempotent_and_requires_no_admin_role(tmp_path: Path) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    app.dependency_overrides[auth_service.get_public_user_context] = lambda: _context("member")
    try:
        client = TestClient(app)
        payload = {"event_id": "same-event", "event_name": "paywall_seen", "feature_key": "ai_limit"}
        first = client.post("/analytics/events", json=payload)
        second = client.post("/analytics/events", json=payload)
    finally:
        app.dependency_overrides.clear()
        app.state.data_root = original_data_root

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert get_admin_analytics_overview(tmp_path).event_count == 1


def test_analytics_overview_backfills_existing_profile_activity(tmp_path: Path) -> None:
    ensure_profile_database(tmp_path, "legacy-user")
    with sqlite3.connect(get_profile_db_path(tmp_path, "legacy-user")) as connection:
        connection.execute(
            "INSERT INTO reading_sessions (id, book_id, started_at, ended_at, active_seconds) VALUES (?, ?, ?, ?, ?)",
            ("legacy-session", "book-1", "2026-08-10T10:00:00Z", "2026-08-10T10:10:00Z", 600),
        )
        connection.execute(
            "INSERT INTO page_reads (session_id, book_id, page_number, active_seconds, estimated_seconds, completion_ratio, counted_as_read, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("legacy-session", "book-1", 1, 60, 60, 1.0, 1, "2026-08-10T10:05:00Z"),
        )
        connection.commit()

    overview = get_admin_analytics_overview(tmp_path)

    assert overview.event_count == 2
    assert overview.sample_size == 1
    assert overview.funnel[0].users == 1


def test_admin_analytics_endpoint_requires_global_usage_permission(tmp_path: Path) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    app.dependency_overrides[auth_service.get_authenticated_user_context] = lambda: _context("member")
    try:
        response = TestClient(app).get("/admin/analytics/overview")
    finally:
        app.dependency_overrides.clear()
        app.state.data_root = original_data_root

    assert response.status_code == 403
