from __future__ import annotations

import json
import logging
from io import BytesIO
from pathlib import Path
from urllib.error import HTTPError

from app.main import app
from app.services import auth as auth_service
from fastapi.testclient import TestClient
from typing_extensions import Self


def test_auth_me_requires_a_bearer_token() -> None:
    client = TestClient(app)

    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication is required."


def test_auth_me_validates_token_with_supabase(monkeypatch, tmp_path: Path) -> None:
    app.state.data_root = tmp_path
    monkeypatch.setenv("SUPABASE_URL", "https://project.example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")

    class FakeResponse:
        def __enter__(self) -> Self:
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def read(self) -> bytes:
            return json.dumps(
                {
                    "id": "user-123",
                    "email": "reader@example.com",
                    "role": "authenticated",
                    "user_metadata": {"display_name": "Reader"},
                }
            ).encode("utf-8")

    def fake_urlopen(request: object, timeout: int) -> FakeResponse:
        assert request.full_url == "https://project.example.supabase.co/auth/v1/user"
        assert request.headers["Authorization"] == "Bearer valid-token"
        assert timeout == 5
        return FakeResponse()

    monkeypatch.setattr(auth_service, "urlopen", fake_urlopen)

    response = TestClient(app).get("/auth/me", headers={"Authorization": "Bearer valid-token"})

    assert response.status_code == 200
    assert response.json() == {
        "id": "user-123",
        "email": "reader@example.com",
        "role": "authenticated",
        "account_role": "member",
        "permissions": ["account.read"],
        "display_name": "Reader",
    }


def test_auth_me_maps_trusted_textplex_tester_role_to_permissions() -> None:
    response = auth_service._auth_me_response(
        {
            "id": "user-tester",
            "email": "tester@textplex.co",
            "role": "authenticated",
            "app_metadata": {"textplex_role": "tester"},
        }
    )

    assert response.account_role == "tester"
    assert "themes.preview_all" in response.permissions
    assert "usage.global.read" not in response.permissions


def test_auth_me_rejects_removed_qa_role() -> None:
    response = auth_service._auth_me_response(
        {
            "id": "legacy-qa-user",
            "email": "legacy-qa@textplex.co",
            "role": "authenticated",
            "app_metadata": {"textplex_role": "qa"},
        }
    )

    assert response.account_role == "member"
    assert response.permissions == ["account.read"]


def test_onboarding_can_set_only_a_non_privileged_account_role(monkeypatch) -> None:
    calls: list[tuple[str, str, object]] = []
    context = auth_service.AuthenticatedUserContext(
        user=auth_service.AuthMeResponse(
            id="user-123",
            email="reader@example.com",
            account_role="member",
            permissions=["account.read"],
        ),
        access_token="valid-token",
    )

    def fake_admin_request(path: str, *, method: str = "GET", payload=None):
        calls.append((path, method, payload))
        if method == "GET":
            return {"app_metadata": {"existing_flag": True}}
        return {"app_metadata": payload["app_metadata"]}

    monkeypatch.setattr(auth_service, "_supabase_admin_request", fake_admin_request)

    response = auth_service.set_hosted_account_role(context, "tester")

    assert response.account_role == "tester"
    assert "themes.preview_all" in response.permissions
    assert calls == [
        ("auth/v1/admin/users/user-123", "GET", None),
        ("auth/v1/admin/users/user-123", "PUT", {"app_metadata": {"existing_flag": True, "textplex_role": "tester"}}),
    ]


def test_hosted_profile_reads_user_owned_supabase_rows(monkeypatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")

    class FakeResponse:
        def __init__(self, payload: object) -> None:
            self.payload = payload

        def __enter__(self) -> Self:
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def read(self) -> bytes:
            return json.dumps(self.payload).encode("utf-8")

    def fake_urlopen(request: object, timeout: int) -> FakeResponse:
        assert timeout == 5
        url = request.full_url
        assert request.headers["Authorization"] == "Bearer valid-token"
        if url.endswith("/auth/v1/user"):
            return FakeResponse({"id": "user-123", "email": "reader@example.com"})
        if "/rest/v1/profiles?" in url:
            assert "id=eq.user-123" in url
            return FakeResponse(
                [{
                    "id": "user-123",
                    "display_name": "Reader",
                    "target_language": "zh",
                    "learning_track": "hsk",
                    "proficiency_level": "HSK 3",
                    "created_at": "2026-07-22T00:00:00Z",
                    "updated_at": "2026-07-22T00:00:00Z",
                }]
            )
        if "/rest/v1/user_settings?" in url:
            assert "user_id=eq.user-123" in url
            return FakeResponse([{"key": "theme", "value": "neutral", "updated_at": "2026-07-22T00:00:00Z"}])
        raise AssertionError(f"Unexpected Supabase URL: {url}")

    monkeypatch.setattr(auth_service, "urlopen", fake_urlopen)

    response = TestClient(app).get("/profile/hosted", headers={"Authorization": "Bearer valid-token"})

    assert response.status_code == 200
    assert response.json()["user"]["id"] == "user-123"
    assert response.json()["profile"]["target_language"] == "zh"
    assert response.json()["settings"] == [
        {"key": "theme", "value": "neutral", "updated_at": "2026-07-22T00:00:00Z"}
    ]


def test_hosted_profile_reports_retryable_storage_failure_with_diagnostics(monkeypatch, caplog) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")

    class FakeResponse:
        def __enter__(self) -> Self:
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def read(self) -> bytes:
            return json.dumps({"id": "user-123", "email": "reader@example.com"}).encode("utf-8")

    def fake_urlopen(request: object, timeout: int) -> FakeResponse:
        if request.full_url.endswith("/auth/v1/user"):
            return FakeResponse()
        raise HTTPError(request.full_url, 502, "Bad Gateway", {}, BytesIO(b"upstream unavailable"))

    monkeypatch.setattr(auth_service, "urlopen", fake_urlopen)

    with caplog.at_level(logging.WARNING, logger=auth_service.logger.name):
        response = TestClient(app).get("/profile/hosted", headers={"Authorization": "Bearer valid-token"})

    assert response.status_code == 503
    assert response.headers["retry-after"] == "5"
    assert response.json()["detail"] == "Hosted account storage is temporarily unavailable. Please try again shortly."
    assert '"event": "supabase_request_unavailable"' in caplog.text
    assert '"operation": "hosted_profile:get"' in caplog.text
    assert '"upstream_status": 502' in caplog.text
