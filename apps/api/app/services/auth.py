from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from app.schemas.auth import (
    AccountRole,
    AuthMeResponse,
    HostedProfileRecord,
    HostedProfileSurfaceResponse,
    HostedProfileUpdateRequest,
    HostedSettingEntry,
    SignupAccountRole,
)
from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)

SUPABASE_RETRY_AFTER_SECONDS = "5"

ACCOUNT_ROLES = {"member", "tester", "admin"}
ACCOUNT_ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    "member": ("account.read",),
    "tester": (
        "account.read",
        "themes.preview_all",
        "languages.preview_all",
        "translation.fallback",
    ),
    "admin": (
        "account.read",
        "themes.preview_all",
        "languages.preview_all",
        "translation.fallback",
        "usage.global.read",
        "accounts.manage",
        "entitlements.manage",
    ),
}


@dataclass(frozen=True)
class AuthenticatedUserContext:
    user: AuthMeResponse
    access_token: str


def _supabase_url() -> str:
    return os.getenv("SUPABASE_URL", "").strip().rstrip("/")


def _supabase_publishable_key() -> str:
    return (
        os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
        or os.getenv("SUPABASE_ANON_KEY", "").strip()
    )


def supabase_is_configured() -> bool:
    return bool(_supabase_url() and _supabase_publishable_key())


def supabase_admin_is_configured() -> bool:
    return bool(_supabase_url() and os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip())


def _supabase_unavailable(operation: str, exc: BaseException, *, upstream_status: int | None = None) -> HTTPException:
    """Return a retryable provider error without logging account or token data."""
    logger.warning(
        json.dumps(
            {
                "event": "supabase_request_unavailable",
                "operation": operation,
                "upstream_status": upstream_status,
                "error_type": type(exc).__name__,
            }
        )
    )
    return HTTPException(
        status_code=503,
        detail="Hosted account storage is temporarily unavailable. Please try again shortly.",
        headers={"Retry-After": SUPABASE_RETRY_AFTER_SECONDS},
    )


def _supabase_invalid_response(operation: str, exc: BaseException | None = None) -> HTTPException:
    logger.warning(
        json.dumps(
            {
                "event": "supabase_invalid_response",
                "operation": operation,
                "error_type": type(exc).__name__ if exc else None,
            }
        )
    )
    return HTTPException(status_code=502, detail="Supabase returned an invalid hosted account response.")


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
        raise _supabase_unavailable("auth_user", exc, upstream_status=exc.code) from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise _supabase_unavailable("auth_user", exc) from exc

    if not isinstance(payload, dict) or not isinstance(payload.get("id"), str):
        raise _supabase_invalid_response("auth_user")
    return payload


def _auth_me_response(payload: dict[str, Any]) -> AuthMeResponse:
    metadata = payload.get("user_metadata")
    display_name = metadata.get("display_name") if isinstance(metadata, dict) else None
    app_metadata = payload.get("app_metadata")
    requested_account_role = app_metadata.get("textplex_role") if isinstance(app_metadata, dict) else None
    account_role = requested_account_role if requested_account_role in ACCOUNT_ROLES else "member"
    return AuthMeResponse(
        id=payload["id"],
        email=payload.get("email") if isinstance(payload.get("email"), str) else None,
        role=payload.get("role") if isinstance(payload.get("role"), str) else "authenticated",
        account_role=account_role,
        permissions=list(ACCOUNT_ROLE_PERMISSIONS[account_role]),
        display_name=display_name if isinstance(display_name, str) else None,
    )


def has_permission(context: AuthenticatedUserContext, permission: str) -> bool:
    return permission in context.user.permissions


def require_permission(context: AuthenticatedUserContext, permission: str) -> None:
    if not has_permission(context, permission):
        raise HTTPException(status_code=403, detail="This account does not have permission for that action.")


def get_authenticated_user_context(
    authorization: str | None = Header(default=None),
) -> AuthenticatedUserContext:
    token = _bearer_token(authorization)
    return AuthenticatedUserContext(user=_auth_me_response(_load_auth_user(token)), access_token=token)


def get_optional_user_context(
    authorization: str | None = Header(default=None),
) -> AuthenticatedUserContext | None:
    if not supabase_is_configured():
        return None
    return get_authenticated_user_context(authorization)


def get_public_user_context(
    authorization: str | None = Header(default=None),
) -> AuthenticatedUserContext | None:
    if not authorization:
        return None
    return get_authenticated_user_context(authorization)


def get_current_user(authorization: str | None = Header(default=None)) -> AuthMeResponse:
    return get_authenticated_user_context(authorization).user


def set_hosted_account_role(context: AuthenticatedUserContext, account_role: SignupAccountRole) -> AuthMeResponse:
    """Persist a self-selected non-privileged role through the server-only Auth Admin API."""
    if context.user.account_role == "admin":
        raise HTTPException(status_code=403, detail="Administrator roles cannot be changed through onboarding.")

    user_id = quote(context.user.id, safe="")
    current_payload = _supabase_admin_request(f"auth/v1/admin/users/{user_id}")
    current_metadata = current_payload.get("app_metadata") if isinstance(current_payload, dict) else None
    app_metadata = dict(current_metadata) if isinstance(current_metadata, dict) else {}
    app_metadata["textplex_role"] = account_role
    _supabase_admin_request(
        f"auth/v1/admin/users/{user_id}",
        method="PUT",
        payload={"app_metadata": app_metadata},
    )
    normalized_role: AccountRole = account_role
    return context.user.model_copy(
        update={
            "account_role": normalized_role,
            "permissions": list(ACCOUNT_ROLE_PERMISSIONS[normalized_role]),
        }
    )


def _supabase_admin_request(
    path: str,
    *,
    method: str = "GET",
    payload: Any = None,
) -> Any:
    project_url = _supabase_url()
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not project_url or not service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase server-side account administration is not configured on the API.",
        )

    headers = {
        "Accept": "application/json",
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }
    request = Request(
        f"{project_url}/{path.lstrip('/')}",
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=5) as response:
            raw_payload = response.read().decode("utf-8")
            return json.loads(raw_payload) if raw_payload else None
    except HTTPError as exc:
        raise _supabase_unavailable(f"supabase_admin:{method.lower()}", exc, upstream_status=exc.code) from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise _supabase_unavailable(f"supabase_admin:{method.lower()}", exc) from exc


def _supabase_rest_request(
    path: str,
    token: str,
    *,
    method: str = "GET",
    payload: Any = None,
    prefer: str | None = None,
) -> Any:
    project_url = _supabase_url()
    publishable_key = _supabase_publishable_key()
    if not project_url or not publishable_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase hosted profile storage is not configured on the API.",
        )

    headers = {
        "Accept": "application/json",
        "apikey": publishable_key,
        "Authorization": f"Bearer {token}",
    }
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer
    request = Request(
        f"{project_url}/rest/v1/{path}",
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=5) as response:
            raw_payload = response.read().decode("utf-8")
            return json.loads(raw_payload) if raw_payload else None
    except HTTPError as exc:
        if exc.code in {401, 403}:
            raise HTTPException(
                status_code=401,
                detail="The access token is invalid or not authorized for hosted profile storage.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc
        raise _supabase_unavailable(f"hosted_profile:{method.lower()}", exc, upstream_status=exc.code) from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise _supabase_unavailable(f"hosted_profile:{method.lower()}", exc) from exc


def _supabase_rest_get(path: str, token: str) -> Any:
    return _supabase_rest_request(path, token)


def supabase_rest_request(
    path: str,
    token: str,
    *,
    method: str = "GET",
    payload: Any = None,
    prefer: str | None = None,
) -> Any:
    """Use the authenticated user's RLS-scoped Supabase REST connection."""
    return _supabase_rest_request(path, token, method=method, payload=payload, prefer=prefer)


def get_hosted_profile(context: AuthenticatedUserContext) -> HostedProfileSurfaceResponse:
    user_id = quote(context.user.id, safe="")
    profile_payload = _supabase_rest_get(
        "profiles?select=id,display_name,target_language,target_language_other,learning_track,proficiency_level,created_at,updated_at"
        f"&id=eq.{user_id}",
        context.access_token,
    )
    if not isinstance(profile_payload, list) or not profile_payload:
        raise HTTPException(status_code=404, detail="Hosted learner profile was not found.")

    settings_payload = get_hosted_settings(context)
    if not isinstance(settings_payload, list):
        raise _supabase_invalid_response("hosted_settings")

    try:
        profile = HostedProfileRecord.model_validate(profile_payload[0])
        settings = [HostedSettingEntry.model_validate(entry) for entry in settings_payload]
    except (TypeError, ValueError) as exc:
        raise _supabase_invalid_response("hosted_profile", exc) from exc

    return HostedProfileSurfaceResponse(user=context.user, profile=profile, settings=settings)


def get_hosted_settings(context: AuthenticatedUserContext) -> list[dict[str, Any]]:
    user_id = quote(context.user.id, safe="")
    payload = _supabase_rest_get(
        f"user_settings?select=key,value,updated_at&user_id=eq.{user_id}&order=key.asc",
        context.access_token,
    )
    if not isinstance(payload, list):
        raise _supabase_invalid_response("hosted_settings")
    return payload


def update_hosted_settings(
    context: AuthenticatedUserContext,
    entries: list[dict[str, str]],
) -> list[dict[str, Any]]:
    rows = [
        {"user_id": context.user.id, "key": entry["key"].strip(), "value": entry["value"]}
        for entry in entries
        if entry.get("key", "").strip()
    ]
    if rows:
        _supabase_rest_request(
            "user_settings?on_conflict=user_id,key",
            context.access_token,
            method="POST",
            payload=rows,
            prefer="resolution=merge-duplicates,return=minimal",
        )
    return get_hosted_settings(context)


def update_hosted_profile(
    context: AuthenticatedUserContext,
    payload: HostedProfileUpdateRequest,
) -> HostedProfileSurfaceResponse:
    values = payload.model_dump(exclude_unset=True)
    if values.get("display_name") is None:
        values.pop("display_name", None)
    elif isinstance(values.get("display_name"), str) and not values["display_name"].strip():
        values["display_name"] = "Reader"
    if values.get("learning_track") is None:
        values.pop("learning_track", None)
    if values:
        user_id = quote(context.user.id, safe="")
        _supabase_rest_request(
            f"profiles?id=eq.{user_id}",
            context.access_token,
            method="PATCH",
            payload=values,
            prefer="return=minimal",
        )
    return get_hosted_profile(context)
