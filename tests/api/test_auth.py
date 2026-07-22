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
