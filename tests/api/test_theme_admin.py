from __future__ import annotations

import pytest
from app.schemas.auth import AuthMeResponse
from app.schemas.theme_admin import ThemeAdminUpsertRequest, ThemeAiSuggestRequest
from app.services import theme_admin
from app.services.auth import AuthenticatedUserContext


def _admin_context() -> AuthenticatedUserContext:
    return AuthenticatedUserContext(
        user=AuthMeResponse(
            id="admin-user",
            account_role="admin",
            permissions=["entitlements.manage"],
        ),
        access_token="admin-token",
    )


def _theme_payload() -> ThemeAdminUpsertRequest:
    return ThemeAdminUpsertRequest(
        id="city-hong-kong-daylight",
        title="Hong Kong Daylight",
        description="Harbor light and calm reading contrast.",
        price_cents=199,
        is_free=False,
        preview_available=True,
        sort_order=390,
        color_scheme="light",
        tokens={"bg": "#eef0f2", "accent": "#b56a42"},
        pattern_image="/themes/city-hong-kong-daylight-v1.jpg",
    )


def test_theme_payload_normalizes_id_and_token_values() -> None:
    payload = ThemeAdminUpsertRequest(
        **{
            **_theme_payload().model_dump(),
            "id": " City-Hong-Kong-Daylight ",
            "tokens": {" accent ": " #b56a42 "},
        }
    )

    assert payload.id == "city-hong-kong-daylight"
    assert payload.tokens == {"accent": "#b56a42"}


def test_theme_payload_rejects_unsafe_id() -> None:
    with pytest.raises(ValueError, match="Theme IDs"):
        ThemeAdminUpsertRequest(**{**_theme_payload().model_dump(), "id": "theme/drop-table"})


def test_theme_admin_merges_catalog_visual_tokens_and_bundle_membership(monkeypatch) -> None:
    monkeypatch.setattr(theme_admin, "supabase_is_configured", lambda: True)

    def fake_rest(path: str, token: str, **kwargs):
        assert token == "admin-token"
        if path.startswith("theme_catalog?"):
            return [{
                "id": "city-hong-kong-daylight",
                "title": "Hong Kong Daylight",
                "description": "Harbor light.",
                "price_cents": 199,
                "is_free": False,
                "preview_available": True,
                "sort_order": 390,
            }]
        if path.startswith("theme_visual_tokens?"):
            return [{
                "theme_id": "city-hong-kong-daylight",
                "color_scheme": "light",
                "tokens": {"bg": "#eef0f2", "accent": "#b56a42"},
                "pattern_image": "/themes/hong-kong.jpg",
            }]
        if path.startswith("theme_bundles?"):
            return [{"id": "international-cities", "theme_ids": ["city-hong-kong-daylight"]}]
        raise AssertionError(path)

    monkeypatch.setattr(theme_admin, "_supabase_rest_request", fake_rest)

    response = theme_admin.get_admin_themes(_admin_context())

    assert response.themes[0].color_scheme == "light"
    assert response.themes[0].tokens["accent"] == "#b56a42"
    assert response.themes[0].bundle_ids == ["international-cities"]


def test_ai_request_rejects_non_image_data_urls() -> None:
    with pytest.raises(ValueError, match="PNG, JPEG, or WebP"):
        ThemeAiSuggestRequest(prompt="Hong Kong daylight", image_data_url="data:text/plain;base64,abc")
