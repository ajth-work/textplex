from __future__ import annotations

import json
from pathlib import Path

from app.main import app
from app.schemas.auth import AuthMeResponse
from app.schemas.learning import ReadingSessionCreateRequest
from app.schemas.migration import ProfileMigrationRequest
from app.schemas.surfaces import SettingsUpdateRequest
from app.services import auth as auth_service
from app.services.auth import AuthenticatedUserContext
from app.services.learning_profile import (
    create_reading_session,
    get_learning_profile_summary,
    get_profile_db_path,
)
from app.services.profile_migration import (
    apply_profile_migration,
    preview_profile_migration,
)
from app.services.themes import get_theme_catalog, validate_theme_settings
from fastapi.testclient import TestClient
from typing_extensions import Self


def _configure_supabase(monkeypatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://project.example.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")


def test_configured_auth_rejects_missing_profile_and_learning_credentials(monkeypatch) -> None:
    _configure_supabase(monkeypatch)
    client = TestClient(app)

    response = client.get("/profile")
    assert response.status_code == 401

    response = client.post("/learning/sessions", json={"book_id": "book-1"})
    assert response.status_code == 401

    response = client.put("/settings", json={"entries": []})
    assert response.status_code == 401


def test_authenticated_local_learner_stores_are_partitioned(tmp_path: Path) -> None:
    payload = ReadingSessionCreateRequest(book_id="book-1")
    create_reading_session(tmp_path, payload, owner_id="user-a")
    create_reading_session(tmp_path, payload, owner_id="user-b")

    first = get_learning_profile_summary(tmp_path, owner_id="user-a")
    second = get_learning_profile_summary(tmp_path, owner_id="user-b")

    assert first.reading_sessions == 1
    assert second.reading_sessions == 1
    assert get_profile_db_path(tmp_path, "user-a") != get_profile_db_path(tmp_path, "user-b")


def test_profile_migration_is_non_destructive_and_idempotent(tmp_path: Path) -> None:
    create_reading_session(tmp_path, ReadingSessionCreateRequest(book_id="book-1"))
    preview = preview_profile_migration(tmp_path, "user-123")
    assert preview.status == "ready"

    applied = apply_profile_migration(
        tmp_path,
        "user-123",
        ProfileMigrationRequest(conflict_policy="merge_non_destructive"),
    )
    assert applied.status == "completed"
    assert applied.imported_rows["reading_sessions"] == 1

    repeated = apply_profile_migration(
        tmp_path,
        "user-123",
        ProfileMigrationRequest(conflict_policy="merge_non_destructive"),
    )
    assert repeated.status == "already_migrated"
    assert get_learning_profile_summary(tmp_path, owner_id="user-123").reading_sessions == 1


def test_unconfigured_theme_catalog_is_server_defined(monkeypatch) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)

    response = TestClient(app).get("/themes/catalog")

    assert response.status_code == 200
    themes = {item["id"]: item for item in response.json()["themes"]}
    assert themes["neutral"]["price_cents"] == 0
    assert themes["neutral"]["is_owned"] is True
    assert themes["jade"]["price_cents"] == 199
    assert themes["jade"]["is_owned"] is False
    assert themes["fruit-strawberry"]["price_cents"] == 199
    assert themes["fruit-strawberry-night"]["price_cents"] == 199
    assert themes["fruit-strawberry-night"]["is_owned"] is False
    assert themes["vegetable-eggplant"]["is_owned"] is False
    assert themes["season-summer-citrus"]["price_cents"] == 199
    assert themes["season-summer-citrus-night"]["price_cents"] == 199
    assert themes["season-summer-meadow-night"]["is_owned"] is False
    assert themes["season-summer-seaside-night"]["is_owned"] is False
    assert themes["city-moscow-daylight"]["price_cents"] == 199
    assert themes["city-moscow-night"]["is_owned"] is False
    assert themes["city-st-petersburg-daylight"]["price_cents"] == 199
    assert themes["city-st-petersburg-night"]["is_owned"] is False
    assert themes["city-kazan-daylight"]["price_cents"] == 199
    assert themes["city-kazan-night"]["is_owned"] is False
    assert themes["city-hong-kong-daylight"]["price_cents"] == 199
    assert themes["city-hong-kong-night"]["is_owned"] is False
    assert themes["season-fall-maple-daylight"]["price_cents"] == 199
    assert themes["season-fall-maple-night"]["is_owned"] is False
    assert themes["season-fall-pumpkin-daylight"]["price_cents"] == 199
    assert themes["season-fall-pumpkin-night"]["is_owned"] is False
    assert themes["season-fall-harvest-daylight"]["price_cents"] == 199
    assert themes["season-fall-harvest-night"]["is_owned"] is False
    bundles = {item["id"]: item for item in response.json()["bundles"]}
    assert bundles["fruit-stand"]["theme_ids"] == [
        "fruit-strawberry",
        "fruit-blueberry",
        "fruit-citrus",
        "fruit-mango",
        "fruit-watermelon",
        "fruit-grape",
    ]
    assert bundles["fruit-stand"]["price_cents"] == 899
    assert bundles["garden-harvest"]["price_cents"] == 899
    assert bundles["summer-editions"]["theme_ids"] == [
        "season-summer-citrus",
        "season-summer-citrus-night",
        "season-summer-meadow",
        "season-summer-meadow-night",
        "season-summer-seaside",
        "season-summer-seaside-night",
    ]
    assert bundles["summer-editions"]["price_cents"] == 899
    assert bundles["fall-editions"]["theme_ids"] == [
        "season-fall-maple-daylight",
        "season-fall-maple-night",
        "season-fall-pumpkin-daylight",
        "season-fall-pumpkin-night",
        "season-fall-harvest-daylight",
        "season-fall-harvest-night",
    ]
    assert bundles["fall-editions"]["price_cents"] == 899


def test_tester_account_can_preview_all_themes(monkeypatch) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    context = AuthenticatedUserContext(
        user=AuthMeResponse(
            id="tester-user",
            email="tester@textplex.co",
            account_role="tester",
            permissions=["account.read", "themes.preview_all"],
        ),
        access_token="tester-token",
    )

    catalog = get_theme_catalog(context)

    assert all(theme.is_owned for theme in catalog.themes)


def test_tester_can_save_a_premium_theme_setting(monkeypatch) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    context = AuthenticatedUserContext(
        user=AuthMeResponse(
            id="tester-user",
            email="tester@textplex.co",
            account_role="tester",
            permissions=["account.read", "themes.preview_all"],
        ),
        access_token="tester-token",
    )

    validate_theme_settings(
        SettingsUpdateRequest(entries=[{"key": "theme", "value": "city-hong-kong-daylight"}]),
        context,
    )


def test_admin_account_can_preview_all_themes_even_without_explicit_preview_permission(monkeypatch) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_PUBLISHABLE_KEY", raising=False)
    context = AuthenticatedUserContext(
        user=AuthMeResponse(
            id="admin-user",
            email="admin@textplex.co",
            account_role="admin",
            permissions=["account.read"],
        ),
        access_token="admin-token",
    )

    catalog = get_theme_catalog(context)

    assert all(theme.is_owned for theme in catalog.themes)


def test_hosted_settings_use_token_and_server_entitlements(monkeypatch) -> None:
    _configure_supabase(monkeypatch)
    settings = [{"key": "theme", "value": "neutral", "updated_at": "2026-07-22T00:00:00Z"}]

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
        headers = request.headers
        if url.endswith("/auth/v1/user"):
            assert headers["Authorization"] == "Bearer valid-token"
            return FakeResponse({"id": "user-123", "email": "reader@example.com"})
        if "/rest/v1/theme_catalog?" in url:
            return FakeResponse([
                {
                    "id": "neutral",
                    "title": "Neutral",
                    "description": "Free",
                    "price_cents": 0,
                    "is_free": True,
                    "preview_available": True,
                },
                {
                    "id": "jade",
                    "title": "Jade",
                    "description": "Premium",
                    "price_cents": 199,
                    "is_free": False,
                    "preview_available": True,
                },
            ])
        if "/rest/v1/theme_bundles?" in url:
            return FakeResponse([])
        if "/rest/v1/theme_entitlements?" in url:
            assert "user_id=eq.user-123" in url
            return FakeResponse([{"theme_id": "jade"}])
        if "/rest/v1/user_settings?" in url:
            return FakeResponse(settings)
        raise AssertionError(f"Unexpected Supabase URL: {url}")

    monkeypatch.setattr(auth_service, "urlopen", fake_urlopen)
    client = TestClient(app)
    headers = {"Authorization": "Bearer valid-token"}

    response = client.get("/settings", headers=headers)
    assert response.status_code == 200
    assert response.json()["entries"] == [{"key": "theme", "value": "neutral"}]

    response = client.put(
        "/settings",
        headers=headers,
        json={"entries": [{"key": "theme", "value": "jade"}]},
    )
    assert response.status_code == 200

    response = client.put(
        "/settings",
        headers=headers,
        json={"entries": [{"key": "theme", "value": "ceramic"}]},
    )
    assert response.status_code == 400
