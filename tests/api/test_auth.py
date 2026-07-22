from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services import auth as auth_service


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
        def __enter__(self) -> "FakeResponse":
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
        assert getattr(request, "full_url") == "https://project.example.supabase.co/auth/v1/user"
        assert getattr(request, "headers")["Authorization"] == "Bearer valid-token"
        assert timeout == 5
        return FakeResponse()

    monkeypatch.setattr(auth_service, "urlopen", fake_urlopen)

    response = TestClient(app).get("/auth/me", headers={"Authorization": "Bearer valid-token"})

    assert response.status_code == 200
    assert response.json() == {
        "id": "user-123",
        "email": "reader@example.com",
        "role": "authenticated",
        "display_name": "Reader",
    }


def test_hosted_profile_reads_user_owned_supabase_rows(monkeypatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")

    class FakeResponse:
        def __init__(self, payload: object) -> None:
            self.payload = payload

        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def read(self) -> bytes:
            return json.dumps(self.payload).encode("utf-8")

    def fake_urlopen(request: object, timeout: int) -> FakeResponse:
        assert timeout == 5
        url = getattr(request, "full_url")
        assert getattr(request, "headers")["Authorization"] == "Bearer valid-token"
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
