import json
from datetime import datetime, timedelta
from pathlib import Path

from app.main import app
from app.schemas.auth import AuthMeResponse
from app.schemas.feedback import FeedbackContext, FeedbackRecord
from app.services import auth as auth_service
from app.services.feedback import (
    create_feedback,
    list_testers,
    list_user_notifications,
    mark_user_notifications_read,
    update_feedback_status,
    update_tester_nickname,
)
from app.services.feedback_digest import send_feedback_digest
from fastapi.testclient import TestClient


def _context(user_id: str, role: str) -> auth_service.AuthenticatedUserContext:
    permissions = ["account.read"]
    if role == "admin":
        permissions.append("accounts.manage")
    return auth_service.AuthenticatedUserContext(
        user=AuthMeResponse(
            id=user_id,
            email=f"{user_id}@example.com",
            account_role=role,  # type: ignore[arg-type]
            permissions=permissions,
        ),
        access_token="test-token",
    )


def test_feedback_persists_original_text_and_fallback_triage(tmp_path: Path, monkeypatch) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    try:
        response = TestClient(app).post(
            "/feedback",
            json={
                "original_text": "The next page button is broken and I cannot use the reader.",
                "context": {
                    "route": "/reader/book-1/3",
                    "language_code": "ko",
                    "book_id": "book-1",
                    "page_number": 3,
                    "app_version": "0.1.0",
                },
            },
        )
    finally:
        app.state.data_root = original_data_root

    assert response.status_code == 200
    payload = response.json()
    assert payload["original_text"].startswith("The next page button")
    assert payload["context"]["language_code"] == "ko"
    assert payload["triage_source"] == "fallback"
    assert payload["triage"]["severity"] == "high"
    assert payload["triage"]["plan"]["implementation_tasks"]
    saved_files = list((tmp_path / "feedback").glob("**/*.json"))
    assert len(saved_files) == 1
    assert json.loads(saved_files[0].read_text(encoding="utf-8"))["id"] == payload["id"]


def test_feedback_is_partitioned_by_user_and_status_and_keeps_history(tmp_path: Path, monkeypatch) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    try:
        created = create_feedback(
            tmp_path,
            "The meaning line is hard to discover.",
            FeedbackContext(route="/reader/book-1/3", app_version="0.1.0"),
            user_id="tester-123",
        )
        moved = update_feedback_status(
            tmp_path,
            created.id,
            "acknowledged",
            note="Recognized, but not planned for the current reader design.",
            changed_by="admin-1",
        )
    finally:
        app.state.data_root = original_data_root

    assert not (tmp_path / "feedback" / "tester-123" / "needs_review" / f"{created.id}.json").exists()
    acknowledged_path = tmp_path / "feedback" / "tester-123" / "acknowledged" / f"{created.id}.json"
    assert acknowledged_path.exists()
    assert moved.status == "acknowledged"
    assert moved.status_history[-1].note == "Recognized, but not planned for the current reader design."


def test_feedback_notifications_follow_status_and_read_state(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    created = create_feedback(
        tmp_path,
        "The reader control is hard to find.",
        FeedbackContext(route="/reader/book-1/3", app_version="0.1.0"),
        user_id="tester-456",
    )
    update_feedback_status(tmp_path, created.id, "completed", note="Added a clearer control label.", changed_by="admin-1")

    notifications = list_user_notifications(tmp_path, "tester-456")
    assert len(notifications) == 1
    assert notifications[0].status == "completed"
    assert "Added a clearer control label." in notifications[0].message
    assert notifications[0].read is False

    mark_user_notifications_read(tmp_path, "tester-456", [notifications[0].id])
    assert list_user_notifications(tmp_path, "tester-456")[0].read is True


def test_feedback_rejects_empty_or_oversized_original_text() -> None:
    client = TestClient(app)
    context = {"route": "/home", "app_version": "0.1.0"}

    assert client.post("/feedback", json={"original_text": "", "context": context}).status_code == 422
    assert client.post("/feedback", json={"original_text": "x" * 5001, "context": context}).status_code == 422


def test_authenticated_tester_feedback_reaches_admin_queue_and_returns_updates(tmp_path: Path, monkeypatch) -> None:
    original_data_root = app.state.data_root
    app.state.data_root = tmp_path
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    client = TestClient(app)
    try:
        app.dependency_overrides[auth_service.get_public_user_context] = lambda: _context("tester-789", "tester")
        submitted = client.post(
            "/feedback",
            json={
                "original_text": "The reader control is confusing on mobile.",
                "context": {"route": "/reader/book-1/3", "language_code": "ja", "app_version": "beta-test"},
            },
        )
        assert submitted.status_code == 200
        assert submitted.json()["user_id"] == "tester-789"
        assert (tmp_path / "feedback" / "tester-789" / "needs_review" / f"{submitted.json()['id']}.json").exists()

        app.dependency_overrides[auth_service.get_authenticated_user_context] = lambda: _context("member-1", "member")
        assert client.get("/feedback").status_code == 403

        app.dependency_overrides[auth_service.get_authenticated_user_context] = lambda: _context("admin-1", "admin")
        reviewed = client.get("/feedback")
        assert reviewed.status_code == 200
        assert reviewed.json()["records"][0]["user_id"] == "tester-789"

        updated = client.patch(
            f"/feedback/{submitted.json()['id']}/status",
            json={"status": "completed", "note": "Added a clearer mobile control label."},
        )
        assert updated.status_code == 200
        assert updated.json()["status"] == "completed"

        app.dependency_overrides[auth_service.get_authenticated_user_context] = lambda: _context("tester-789", "tester")
        notifications = client.get("/feedback/notifications")
        assert notifications.status_code == 200
        assert notifications.json()["notifications"][0]["status"] == "completed"
    finally:
        app.dependency_overrides.clear()
        app.state.data_root = original_data_root


def test_tester_directory_counts_feedback_and_persists_nickname(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    first = create_feedback(
        tmp_path,
        "The reader control is hard to find.",
        FeedbackContext(route="/reader/book-1/3", app_version="0.1.0"),
        user_id="tester-456",
    )
    create_feedback(
        tmp_path,
        "The page image is difficult to read.",
        FeedbackContext(route="/reader/book-1/4", app_version="0.1.0"),
        user_id="tester-456",
    )

    testers = list_testers(tmp_path)
    assert [tester.tester_id for tester in testers] == ["tester-456"]
    assert testers[0].feedback_count == 2
    assert testers[0].nickname is None

    updated = update_tester_nickname(tmp_path, "tester-456", "Maya")
    assert updated.nickname == "Maya"
    assert list_testers(tmp_path)[0].nickname == "Maya"
    assert json.loads((tmp_path / "feedback" / "testers.json").read_text(encoding="utf-8")) == {"nicknames": {"tester-456": "Maya"}}
    assert first.user_id == "tester-456"


def test_feedback_auto_routes_after_persisting_when_configured(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("TEXTPLEX_GITHUB_AUTO_ROUTE_FEEDBACK", "true")
    monkeypatch.setenv("GITHUB_TOKEN", "test-token")
    monkeypatch.setenv("TEXTPLEX_GITHUB_REPOSITORY", "TextPlex/textplex")
    monkeypatch.setenv("TEXTPLEX_GITHUB_PROJECT_ID", "project-id")
    routed: dict[str, str | None] = {}

    def fake_route(data_root: Path, feedback_id: str, *, changed_by: str, title: str | None = None):
        routed.update(feedback_id=feedback_id, changed_by=changed_by, title=title)
        return FeedbackRecord.model_validate_json(next(data_root.glob("feedback/**/*.json")).read_text(encoding="utf-8"))

    monkeypatch.setattr("app.services.feedback.create_github_issue", fake_route)
    record = create_feedback(
        tmp_path,
        "The reader control is hard to find.",
        FeedbackContext(route="/reader/book-1/3", app_version="0.1.0"),
        user_id="tester-auto",
    )

    assert routed["feedback_id"] == record.id
    assert routed["changed_by"] == "system:feedback-auto-route"
    assert routed["title"].startswith("[Feedback]") if routed["title"] else False


def test_feedback_digest_sends_new_updates_once(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("FEEDBACK_DIGEST_TO", "owner@example.com")
    monkeypatch.setenv("FEEDBACK_DIGEST_FROM", "textplex@example.com")
    monkeypatch.setenv("FEEDBACK_DIGEST_SMTP_HOST", "smtp.example.com")
    sent_messages = []

    class FakeSMTP:
        def __init__(self, host: str, port: int, timeout: int):
            assert host == "smtp.example.com"
            assert port == 587
            assert timeout == 30

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def starttls(self):
            return None

        def send_message(self, message):
            sent_messages.append(message)

    monkeypatch.setattr("app.services.feedback_digest.smtplib.SMTP", FakeSMTP)
    record = create_feedback(
        tmp_path,
        "The reader control is hard to find.",
        FeedbackContext(route="/reader/book-1/3", app_version="0.1.0"),
        user_id="tester-digest",
    )

    created_at = datetime.fromisoformat(record.submitted_at.replace("Z", "+00:00"))
    generated_at = created_at + timedelta(hours=1)
    first = send_feedback_digest(tmp_path, now=generated_at)
    second = send_feedback_digest(tmp_path, now=generated_at + timedelta(hours=1))

    assert first.sent is True
    assert first.record_count == 1
    assert second.sent is False
    assert len(sent_messages) == 1
    assert "owner@example.com" in sent_messages[0]["To"]
    assert "tester-digest" in sent_messages[0].get_content()
