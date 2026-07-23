from __future__ import annotations

from urllib.parse import quote
from pathlib import Path

from fastapi import HTTPException

from app.schemas.surfaces import SettingsUpdateRequest
from app.schemas.themes import ThemeBundleCatalogItem, ThemeCatalogItem, ThemeCatalogResponse
from app.services.auth import (
    AuthenticatedUserContext,
    _supabase_publishable_key,
    _supabase_rest_request,
    supabase_is_configured,
)


STATIC_THEMES = [
    {"id": "neutral", "title": "Neutral", "description": "Bright ivory surfaces with a restrained amber accent.", "price_cents": 0, "is_free": True},
    {"id": "sepia", "title": "Warm Sepia", "description": "Parchment cream, tea-brown contrast, and editorial warmth.", "price_cents": 0, "is_free": True},
    {"id": "ink", "title": "Dark Ink", "description": "Soft charcoal surfaces with warm gold highlights.", "price_cents": 0, "is_free": True},
    {"id": "black", "title": "Pitch Black", "description": "Near-black canvas with a quiet cool-gold accent.", "price_cents": 0, "is_free": True},
    {"id": "jade", "title": "Jade", "description": "Deep green surfaces with gold-flecked contrast.", "price_cents": 199, "is_free": False},
    {"id": "ceramic", "title": "Ceramic", "description": "Cool porcelain tones with slate and mist accents.", "price_cents": 199, "is_free": False},
    {"id": "crimson", "title": "Crimson Gold", "description": "Lacquer red depth with luminous gold detail.", "price_cents": 199, "is_free": False},
    {"id": "nes", "title": "NES", "description": "Warm cartridge gray, deep navy, and signal red.", "price_cents": 199, "is_free": False},
    {"id": "famicom", "title": "Famicom", "description": "Cream plastic, oxblood red, and soft charcoal detail.", "price_cents": 199, "is_free": False},
    {"id": "snes", "title": "SNES", "description": "Cool lavender, graphite, and playful purple accents.", "price_cents": 199, "is_free": False},
    {"id": "super-famicom", "title": "Super Famicom", "description": "Charcoal hardware, muted teal, and coral control accents.", "price_cents": 199, "is_free": False},
]

STATIC_BUNDLES = [
    {
        "id": "classic-consoles",
        "title": "Classic Consoles",
        "description": "Four hardware-inspired reading atmospheres from the NES through the Super Famicom.",
        "theme_ids": ["nes", "famicom", "snes", "super-famicom"],
        "price_cents": 649,
    }
]


def _server_catalog() -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    if not supabase_is_configured():
        return STATIC_THEMES, STATIC_BUNDLES
    try:
        themes = _supabase_rest_request(
            "theme_catalog?select=id,title,description,price_cents,is_free,preview_available&order=sort_order.asc",
            _supabase_publishable_key(),
        )
        bundles = _supabase_rest_request(
            "theme_bundles?select=id,title,description,theme_ids,price_cents&order=id.asc",
            _supabase_publishable_key(),
        )
    except HTTPException:
        raise
    if not isinstance(themes, list) or not isinstance(bundles, list):
        raise HTTPException(status_code=502, detail="Supabase returned an invalid theme catalog.")
    return themes, bundles


def _owned_theme_ids(
    context: AuthenticatedUserContext | None,
    *,
    data_root: Path | None = None,
) -> set[str]:
    if context is None:
        return set()
    owned_ids: set[str] = set()
    if data_root is not None:
        from app.services.commerce import get_local_owned_theme_ids

        owned_ids.update(get_local_owned_theme_ids(data_root, context.user.id))
    if not supabase_is_configured():
        return owned_ids
    payload = _supabase_rest_request(
        f"theme_entitlements?select=theme_id&user_id=eq.{quote(context.user.id, safe='')}",
        context.access_token,
    )
    if not isinstance(payload, list):
        raise HTTPException(status_code=502, detail="Supabase returned invalid theme entitlements.")
    owned_ids.update(str(row["theme_id"]) for row in payload if isinstance(row, dict) and isinstance(row.get("theme_id"), str))
    return owned_ids


def get_theme_catalog(
    context: AuthenticatedUserContext | None = None,
    *,
    data_root: Path | None = None,
) -> ThemeCatalogResponse:
    themes, bundles = _server_catalog()
    owned_ids = _owned_theme_ids(context, data_root=data_root)
    catalog_items = [
        ThemeCatalogItem(
            id=str(theme["id"]),
            title=str(theme["title"]),
            description=str(theme["description"]),
            price_cents=int(theme.get("price_cents") or 0),
            is_free=bool(theme.get("is_free")),
            is_owned=bool(theme.get("is_free")) or str(theme["id"]) in owned_ids,
            preview_available=bool(theme.get("preview_available", True)),
        )
        for theme in themes
        if isinstance(theme, dict) and theme.get("id")
    ]
    owned = {item.id for item in catalog_items if item.is_owned}
    bundle_items = [
        ThemeBundleCatalogItem(
            id=str(bundle["id"]),
            title=str(bundle["title"]),
            description=str(bundle["description"]),
            theme_ids=[str(theme_id) for theme_id in bundle.get("theme_ids", [])],
            price_cents=int(bundle.get("price_cents") or 0),
            is_owned=all(theme_id in owned for theme_id in bundle.get("theme_ids", [])),
        )
        for bundle in bundles
        if isinstance(bundle, dict) and bundle.get("id")
    ]
    return ThemeCatalogResponse(mode="hosted" if supabase_is_configured() else "local", themes=catalog_items, bundles=bundle_items)


def validate_theme_settings(
    payload: SettingsUpdateRequest,
    context: AuthenticatedUserContext,
    *,
    data_root: Path | None = None,
) -> None:
    requested = next((entry.value for entry in payload.entries if entry.key.strip() == "theme"), None)
    if requested is None:
        return
    catalog = get_theme_catalog(context, data_root=data_root)
    selected = next((theme for theme in catalog.themes if theme.id == requested), None)
    if selected is None:
        raise HTTPException(status_code=400, detail="The requested theme is not in the server catalog.")
    if not selected.is_owned:
        raise HTTPException(status_code=403, detail="This theme is preview-only until it is entitled to the account.")
