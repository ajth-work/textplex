from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Header, HTTPException

from app.schemas.auth import AuthMeResponse


def _supabase_url() -> str:
    return os.getenv("SUPABASE_URL", "").strip().rstrip("/")


def _supabase_publishable_key() -> str:
    return (
        os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
        or os.getenv("SUPABASE_ANON_KEY", "").strip()
    )


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        raise HTTPException(
            status_code=401,
            detail="A Bearer access token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token.strip()


def _load_auth_user(token: str) -> dict[str, Any]:
    project_url = _supabase_url()
    publishable_key = _supabase_publishable_key()
    if not project_url or not publishable_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase authentication is not configured on the API.",
        )

    request = Request(
        f"{project_url}/auth/v1/user",
        headers={
            "Accept": "application/json",
            "apikey": publishable_key,
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if exc.code in {401, 403}:
            raise HTTPException(
                status_code=401,
                detail="The access token is invalid or expired.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc
        raise HTTPException(status_code=502, detail="Supabase authentication failed.") from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="Supabase authentication is unavailable.") from exc

    if not isinstance(payload, dict) or not isinstance(payload.get("id"), str):
        raise HTTPException(status_code=502, detail="Supabase returned an invalid user record.")
    return payload


def get_current_user(authorization: str | None = Header(default=None)) -> AuthMeResponse:
    payload = _load_auth_user(_bearer_token(authorization))
    metadata = payload.get("user_metadata")
    display_name = metadata.get("display_name") if isinstance(metadata, dict) else None
    return AuthMeResponse(
        id=payload["id"],
        email=payload.get("email") if isinstance(payload.get("email"), str) else None,
        role=payload.get("role") if isinstance(payload.get("role"), str) else "authenticated",
        display_name=display_name if isinstance(display_name, str) else None,
    )
