from __future__ import annotations

from pathlib import Path
from urllib.parse import quote

from app.schemas.surfaces import SettingsUpdateRequest
from app.schemas.themes import (
    ThemeBundleCatalogItem,
    ThemeCatalogItem,
    ThemeCatalogResponse,
)
from app.services.auth import (
    AuthenticatedUserContext,
    _supabase_publishable_key,
    _supabase_rest_request,
    supabase_is_configured,
)
from fastapi import HTTPException

STATIC_THEMES = [
    {"id": "neutral", "title": "Neutral", "description": "White and cool-grey surfaces with crisp black typography.", "price_cents": 0, "is_free": True},
    {"id": "sepia", "title": "Warm Sepia", "description": "Parchment cream, tea-brown contrast, and editorial warmth.", "price_cents": 0, "is_free": True},
    {"id": "ink", "title": "Dark Ink", "description": "Soft charcoal surfaces with warm gold highlights.", "price_cents": 0, "is_free": True},
    {"id": "black", "title": "Pitch Black", "description": "Near-black canvas with a quiet cool-gold accent.", "price_cents": 0, "is_free": True},
    {"id": "jade", "title": "Jade", "description": "Deep green surfaces with gold-flecked contrast.", "price_cents": 199, "is_free": False},
    {"id": "ceramic", "title": "Ceramic", "description": "Cool porcelain tones with slate and mist accents.", "price_cents": 199, "is_free": False},
    {"id": "crimson", "title": "Crimson Gold", "description": "Lacquer red depth with luminous gold detail.", "price_cents": 199, "is_free": False},
    {"id": "nes", "title": "NES", "description": "Console gray canvas, black cards, and signal-red actions.", "price_cents": 199, "is_free": False},
    {"id": "famicom", "title": "Famicom", "description": "Cream plastic, oxblood red, and soft charcoal detail.", "price_cents": 199, "is_free": False},
    {"id": "snes", "title": "SNES", "description": "Cool lavender, graphite, and playful purple accents.", "price_cents": 199, "is_free": False},
    {"id": "super-famicom", "title": "Super Famicom", "description": "Charcoal hardware, muted teal, and coral control accents.", "price_cents": 199, "is_free": False},
    {"id": "fruit-strawberry", "title": "Strawberry", "description": "Pale blush, warm cream, and a restrained berry-red accent.", "price_cents": 199, "is_free": False},
    {"id": "fruit-blueberry", "title": "Blueberry", "description": "Mist blue surfaces with cool white cards and indigo focus.", "price_cents": 199, "is_free": False},
    {"id": "fruit-citrus", "title": "Citrus", "description": "Lemon cream, warm white cards, and a tangerine-coral accent.", "price_cents": 199, "is_free": False},
    {"id": "fruit-mango", "title": "Mango", "description": "Golden apricot atmosphere with parchment cards and burnt orange.", "price_cents": 199, "is_free": False},
    {"id": "fruit-watermelon", "title": "Watermelon", "description": "Pale rind green, cool blush, and a separate coral-pink accent.", "price_cents": 199, "is_free": False},
    {"id": "fruit-grape", "title": "Grape", "description": "Muted lavender, pale lilac cards, and deep plum detail.", "price_cents": 199, "is_free": False},
    {"id": "vegetable-avocado", "title": "Avocado", "description": "Soft sage, avocado cream, and forest-green reading surfaces.", "price_cents": 199, "is_free": False},
    {"id": "vegetable-carrot", "title": "Carrot", "description": "Warm sand, cream cards, and a muted carrot-orange accent.", "price_cents": 199, "is_free": False},
    {"id": "vegetable-tomato", "title": "Tomato", "description": "Dusty tomato blush, warm ivory cards, and restrained basil support.", "price_cents": 199, "is_free": False},
    {"id": "vegetable-corn", "title": "Corn", "description": "Butter yellow softened by oat, olive, and warm cream surfaces.", "price_cents": 199, "is_free": False},
    {"id": "vegetable-cucumber", "title": "Cucumber", "description": "Cool mint, porcelain cards, and a fresh cucumber-green accent.", "price_cents": 199, "is_free": False},
    {"id": "vegetable-eggplant", "title": "Eggplant", "description": "Aubergine atmosphere, pale lavender cards, and deep plum detail.", "price_cents": 199, "is_free": False},
    {"id": "season-summer-citrus", "title": "Citrus Grove", "description": "Warm cream, citrus color, blossom white, and botanical green.", "price_cents": 199, "is_free": False},
    {"id": "season-summer-meadow", "title": "Sunlit Meadow", "description": "Pale sky, wildflower color, cream, and soft meadow green.", "price_cents": 199, "is_free": False},
    {"id": "season-summer-seaside", "title": "Seaside Garden", "description": "Aqua, sand, coral, sea grass, and deep teal in a coastal garden mood.", "price_cents": 199, "is_free": False},
    {"id": "season-summer-citrus-night", "title": "Citrus Grove — Night", "description": "Deep botanical green, citrus amber, and blossom light for a quiet evening orchard mood.", "price_cents": 199, "is_free": False},
    {"id": "season-summer-meadow-night", "title": "Sunlit Meadow — Night", "description": "Midnight blue, dusk wildflowers, soft gold, and drifting meadow detail for evening reading.", "price_cents": 199, "is_free": False},
    {"id": "season-summer-seaside-night", "title": "Seaside Garden — Night", "description": "Deep ocean blue, moonlit shells, cool botanicals, and restrained star-like light.", "price_cents": 199, "is_free": False},
    {"id": "city-moscow-daylight", "title": "Moscow — Daylight", "description": "Pale birch, red-brick geometry, and cool river-city light inspired by Moscow.", "price_cents": 199, "is_free": False},
    {"id": "city-moscow-night", "title": "Moscow — Night", "description": "Deep navy, cool birch branches, and warm architectural light inspired by Moscow after dark.", "price_cents": 199, "is_free": False},
    {"id": "city-st-petersburg-daylight", "title": "St. Petersburg — Daylight", "description": "Canal water, pale façades, blue flowers, and northern daylight inspired by St. Petersburg.", "price_cents": 199, "is_free": False},
    {"id": "city-st-petersburg-night", "title": "St. Petersburg — Night", "description": "Deep canal blue, bridge lights, and floral reflections inspired by St. Petersburg after dark.", "price_cents": 199, "is_free": False},
    {"id": "city-kazan-daylight", "title": "Kazan — Daylight", "description": "Cream stone, terracotta towers, botanical branches, and ornamental detail inspired by Kazan.", "price_cents": 199, "is_free": False},
    {"id": "city-kazan-night", "title": "Kazan — Night", "description": "Deep blue, illuminated domes, stars, and quiet floral ornament inspired by Kazan after dark.", "price_cents": 199, "is_free": False},
    {"id": "season-fall-maple-daylight", "title": "Maple Walk — Daylight", "description": "Parchment, rust, amber, and olive leaves in an illustrated fall reading atmosphere.", "price_cents": 199, "is_free": False},
    {"id": "season-fall-maple-night", "title": "Maple Walk — Night", "description": "Charcoal, ember, and muted leaf tones for a quiet illustrated fall reading atmosphere.", "price_cents": 199, "is_free": False},
    {"id": "season-fall-pumpkin-daylight", "title": "Pumpkin Patch — Daylight", "description": "Oat cream, pumpkin orange, sage, and deep brown in an illustrated harvest reading atmosphere.", "price_cents": 199, "is_free": False},
    {"id": "season-fall-pumpkin-night", "title": "Pumpkin Patch — Night", "description": "Charcoal, pumpkin ember, muted vine green, and warm lantern light for evening reading.", "price_cents": 199, "is_free": False},
    {"id": "season-fall-harvest-daylight", "title": "Harvest Orchard — Daylight", "description": "Warm ivory, cranberry, golden wheat, and orchard green in an illustrated fall reading atmosphere.", "price_cents": 199, "is_free": False},
    {"id": "season-fall-harvest-night", "title": "Harvest Orchard — Night", "description": "Midnight navy, cranberry fruit, amber leaves, and soft orchard light for evening reading.", "price_cents": 199, "is_free": False},
]

STATIC_BUNDLES = [
    {
        "id": "classic-consoles",
        "title": "Classic Consoles",
        "description": "Four hardware-inspired reading atmospheres from the NES through the Super Famicom.",
        "theme_ids": ["nes", "famicom", "snes", "super-famicom"],
        "price_cents": 649,
    },
    {
        "id": "fruit-stand",
        "title": "Fruit Stand",
        "description": "Six bright, fresh market-inspired reading atmospheres with calm editorial surfaces.",
        "theme_ids": ["fruit-strawberry", "fruit-blueberry", "fruit-citrus", "fruit-mango", "fruit-watermelon", "fruit-grape"],
        "price_cents": 899,
    },
    {
        "id": "garden-harvest",
        "title": "Garden Harvest",
        "description": "Six grounded botanical palettes with muted warmth and comfortable reading contrast.",
        "theme_ids": ["vegetable-avocado", "vegetable-carrot", "vegetable-tomato", "vegetable-corn", "vegetable-cucumber", "vegetable-eggplant"],
        "price_cents": 899,
    },
    {
        "id": "summer-editions",
        "title": "Summer Editions",
        "description": "Six illustrated summer atmospheres spanning citrus, meadow, and seaside color by day and night.",
        "theme_ids": ["season-summer-citrus", "season-summer-citrus-night", "season-summer-meadow", "season-summer-meadow-night", "season-summer-seaside", "season-summer-seaside-night"],
        "price_cents": 899,
    },
    {
        "id": "fall-editions",
        "title": "Fall Editions",
        "description": "Six illustrated fall atmospheres spanning maple walks, pumpkin patches, and harvest orchards.",
        "theme_ids": ["season-fall-maple-daylight", "season-fall-maple-night", "season-fall-pumpkin-daylight", "season-fall-pumpkin-night", "season-fall-harvest-daylight", "season-fall-harvest-night"],
        "price_cents": 899,
    },
]


def _server_catalog() -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    if not supabase_is_configured():
        return STATIC_THEMES, STATIC_BUNDLES
    themes = _supabase_rest_request(
        "theme_catalog?select=id,title,description,price_cents,is_free,preview_available&order=sort_order.asc",
        _supabase_publishable_key(),
    )
    bundles = _supabase_rest_request(
        "theme_bundles?select=id,title,description,theme_ids,price_cents&order=id.asc",
        _supabase_publishable_key(),
    )
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
