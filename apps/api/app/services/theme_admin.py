from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.schemas.theme_admin import (
    ThemeAdminRecord,
    ThemeAdminResponse,
    ThemeAdminUpsertRequest,
    ThemeAiSuggestRequest,
    ThemeAiSuggestResponse,
)
from app.services.auth import (
    AuthenticatedUserContext,
    _supabase_rest_request,
    require_permission,
    supabase_is_configured,
)
from app.services.openai_config import get_openai_api_key, get_openai_api_key_env
from fastapi import HTTPException

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_THEME_MODEL = "gpt-5.6-luna"
MAX_THEME_IMAGE_BYTES = 6 * 1024 * 1024

THEME_TOKEN_KEYS = (
    "bg", "bg-soft", "panel", "panel-strong", "ink", "ink-soft", "line",
    "accent", "accent-strong", "accent-soft", "shadow", "app-page-bg",
    "app-glow-a", "app-glow-b", "app-glow-c", "app-grid-line", "app-body-color",
    "hero-meta-bg", "hero-meta-color", "surface-soft", "surface-strong",
    "surface-border", "button-secondary-bg", "button-secondary-border",
    "button-secondary-color", "input-bg", "input-color", "text", "card-text",
    "muted", "card-muted", "border", "focus", "positive", "warning", "danger",
    "reader-text", "reader-selected", "app-pattern-image", "app-pattern-wash",
)


def _require_theme_admin(context: AuthenticatedUserContext) -> None:
    require_permission(context, "entitlements.manage")


def _theme_rows(context: AuthenticatedUserContext) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    if not supabase_is_configured():
        raise HTTPException(status_code=503, detail="Supabase is not configured for theme administration.")
    catalog = _supabase_rest_request(
        "theme_catalog?select=id,title,description,price_cents,is_free,preview_available,sort_order&order=sort_order.asc,id.asc",
        context.access_token,
    )
    visual_tokens = _supabase_rest_request(
        "theme_visual_tokens?select=theme_id,color_scheme,tokens,pattern_image",
        context.access_token,
    )
    bundles = _supabase_rest_request(
        "theme_bundles?select=id,theme_ids&order=id.asc",
        context.access_token,
    )
    if not all(isinstance(value, list) for value in (catalog, visual_tokens, bundles)):
        raise HTTPException(status_code=502, detail="Supabase returned invalid theme administration data.")
    return catalog, visual_tokens, bundles


def get_admin_themes(context: AuthenticatedUserContext) -> ThemeAdminResponse:
    _require_theme_admin(context)
    catalog, visual_tokens, bundles = _theme_rows(context)
    visual_by_id = {str(row.get("theme_id")): row for row in visual_tokens if isinstance(row, dict)}
    bundle_ids_by_theme: dict[str, list[str]] = {}
    for bundle in bundles:
        if not isinstance(bundle, dict) or not isinstance(bundle.get("id"), str):
            continue
        for theme_id in bundle.get("theme_ids", []):
            if isinstance(theme_id, str):
                bundle_ids_by_theme.setdefault(theme_id, []).append(bundle["id"])

    records: list[ThemeAdminRecord] = []
    for row in catalog:
        if not isinstance(row, dict) or not isinstance(row.get("id"), str):
            continue
        visual = visual_by_id.get(row["id"], {})
        records.append(
            ThemeAdminRecord(
                id=row["id"],
                title=str(row.get("title") or ""),
                description=str(row.get("description") or ""),
                price_cents=int(row.get("price_cents") or 0),
                is_free=bool(row.get("is_free")),
                preview_available=bool(row.get("preview_available", True)),
                sort_order=int(row.get("sort_order") or 0),
                color_scheme=visual.get("color_scheme") if visual.get("color_scheme") in {"light", "dark"} else None,
                tokens=visual.get("tokens") if isinstance(visual.get("tokens"), dict) else {},
                pattern_image=visual.get("pattern_image") if isinstance(visual.get("pattern_image"), str) else None,
                bundle_ids=bundle_ids_by_theme.get(row["id"], []),
            )
        )
    return ThemeAdminResponse(themes=records)


def save_admin_theme(context: AuthenticatedUserContext, payload: ThemeAdminUpsertRequest) -> ThemeAdminRecord:
    _require_theme_admin(context)
    catalog_payload = payload.model_dump(exclude={"color_scheme", "tokens", "pattern_image"})
    _supabase_rest_request(
        "theme_catalog?on_conflict=id",
        context.access_token,
        method="POST",
        payload=catalog_payload,
        prefer="resolution=merge-duplicates,return=minimal",
    )
    _supabase_rest_request(
        "theme_visual_tokens?on_conflict=theme_id",
        context.access_token,
        method="POST",
        payload={
            "theme_id": payload.id,
            "color_scheme": payload.color_scheme,
            "tokens": payload.tokens,
            "pattern_image": payload.pattern_image,
        },
        prefer="resolution=merge-duplicates,return=minimal",
    )
    response = get_admin_themes(context)
    match = next((theme for theme in response.themes if theme.id == payload.id), None)
    if match is None:
        raise HTTPException(status_code=502, detail="Theme saved but could not be read back from Supabase.")
    return match


def _response_text(payload: dict[str, Any]) -> str:
    direct_text = payload.get("output_text")
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()
    chunks: list[str] = []
    for item in payload.get("output", []):
        if not isinstance(item, dict) or item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if isinstance(content, dict) and content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str):
                    chunks.append(text)
    return "".join(chunks).strip()


def _theme_json_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "color_scheme": {"type": "string", "enum": ["light", "dark"]},
            "design_notes": {"type": "string"},
            "token_values": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {"key": {"type": "string"}, "value": {"type": "string"}},
                    "required": ["key", "value"],
                },
            },
        },
        "required": ["title", "description", "color_scheme", "design_notes", "token_values"],
    }


def suggest_theme_with_ai(context: AuthenticatedUserContext, payload: ThemeAiSuggestRequest) -> ThemeAiSuggestResponse:
    _require_theme_admin(context)
    api_key = get_openai_api_key("theme_generation")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=f"{get_openai_api_key_env('theme_generation')} is not configured on the API.",
        )
    if payload.image_data_url and len(payload.image_data_url.encode("utf-8")) > MAX_THEME_IMAGE_BYTES * 4 / 3:
        raise HTTPException(status_code=413, detail="The reference image is too large.")

    current = payload.current_theme.model_dump(exclude_none=True) if payload.current_theme else None
    prompt = (
        "You are the TextPlex theme design assistant. Create a restrained, readable theme for a serious language-learning reader. "
        "Return visual token values only; do not return CSS, JavaScript, SQL, or executable code. "
        "Every token value must be a CSS color, gradient, shadow, or safe image URL string. "
        f"Use these canonical token keys when they help: {', '.join(THEME_TOKEN_KEYS)}. "
        "Keep text/background contrast readable and preserve clear focus, positive, warning, and danger states. "
        f"Theme request: {payload.prompt}. "
        f"Current draft, if any: {json.dumps(current, ensure_ascii=False, sort_keys=True)}"
    )
    content: list[dict[str, str]] = [{"type": "input_text", "text": prompt}]
    if payload.image_data_url:
        content.append({"type": "input_image", "image_url": payload.image_data_url, "detail": "high"})
    request_payload = {
        "model": os.getenv("OPENAI_THEME_MODEL", DEFAULT_THEME_MODEL).strip() or DEFAULT_THEME_MODEL,
        "max_output_tokens": 2600,
        "input": [{"role": "user", "content": content}],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "textplex_theme_suggestion",
                "strict": True,
                "schema": _theme_json_schema(),
            }
        },
    }
    request = Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(request_payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=f"OpenAI theme suggestion failed: {detail[:500]}") from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="OpenAI theme suggestion was unavailable.") from exc

    try:
        result = json.loads(_response_text(response_payload))
        token_values = result.get("token_values", [])
        tokens = {
            str(item["key"]): str(item["value"])
            for item in token_values
            if isinstance(item, dict) and item.get("key") and item.get("value")
        }
        return ThemeAiSuggestResponse(
            title=str(result["title"]).strip(),
            description=str(result["description"]).strip(),
            color_scheme=result["color_scheme"],
            tokens=tokens,
            design_notes=str(result["design_notes"]).strip(),
        )
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="OpenAI returned an invalid theme suggestion.") from exc
