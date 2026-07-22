from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import sqlite3
from fastapi import HTTPException

from app.schemas.themes import ThemeCheckoutRequest, ThemeCheckoutResponse, ThemeEntitlementResponse


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _provider() -> str:
    return os.getenv("TEXTPLEX_COMMERCE_PROVIDER", "sandbox").strip().lower()


def _product(payload: ThemeCheckoutRequest) -> tuple[list[str], int]:
    # Import locally to keep the catalog as the single source of product truth.
    from app.services.themes import STATIC_BUNDLES, STATIC_THEMES

    if payload.product_type == "theme":
        product = next((item for item in STATIC_THEMES if item["id"] == payload.product_id), None)
        if not product:
            raise HTTPException(status_code=404, detail="Theme product not found.")
        if bool(product["is_free"]):
            raise HTTPException(status_code=400, detail="Free themes do not require checkout.")
        return [payload.product_id], int(product["price_cents"])

    product = next((item for item in STATIC_BUNDLES if item["id"] == payload.product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Theme bundle product not found.")
    return [str(theme_id) for theme_id in product["theme_ids"]], int(product["price_cents"])


def _db(data_root: Path, user_id: str) -> Path:
    from app.services.learning_profile import ensure_profile_database

    return ensure_profile_database(data_root, user_id)


def create_checkout_session(data_root: Path, user_id: str, payload: ThemeCheckoutRequest) -> ThemeCheckoutResponse:
    if _provider() != "sandbox":
        raise HTTPException(status_code=503, detail="The configured commerce provider is not available in this environment.")
    theme_ids, amount_cents = _product(payload)
    now = _utc_now()
    db_path = _db(data_root, user_id)
    with sqlite3.connect(db_path) as connection:
        row = connection.execute(
            "SELECT session_id, status, payment_status, product_type, product_id, theme_ids, amount_cents, currency FROM commerce_checkout_sessions WHERE user_id = ? AND idempotency_key = ?",
            (user_id, payload.idempotency_key),
        ).fetchone()
        if row:
            return ThemeCheckoutResponse(
                session_id=row[0], status=row[1], payment_status=row[2], product_type=row[3], product_id=row[4],
                theme_ids=json.loads(row[5]), amount_cents=row[6], currency=row[7],
            )
        session_id = f"sandbox_{uuid4().hex}"
        connection.execute(
            """
            INSERT INTO commerce_checkout_sessions (
                session_id, user_id, product_type, product_id, theme_ids, amount_cents,
                currency, status, payment_status, idempotency_key, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'USD', 'created', 'pending', ?, ?, ?)
            """,
            (session_id, user_id, payload.product_type, payload.product_id, json.dumps(theme_ids), amount_cents, payload.idempotency_key, now, now),
        )
        connection.commit()
    return ThemeCheckoutResponse(
        session_id=session_id, status="created", payment_status="pending", product_type=payload.product_type,
        product_id=payload.product_id, theme_ids=theme_ids, amount_cents=amount_cents,
    )


def verify_sandbox_signature(raw_body: bytes, signature: str | None) -> None:
    secret = os.getenv("TEXTPLEX_SANDBOX_WEBHOOK_SECRET", "").strip()
    if _provider() != "sandbox" or not secret:
        raise HTTPException(status_code=503, detail="Sandbox commerce webhooks are not configured.")
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    provided = (signature or "").removeprefix("sha256=")
    if not hmac.compare_digest(expected, provided):
        raise HTTPException(status_code=401, detail="Invalid sandbox webhook signature.")


def apply_sandbox_event(data_root: Path, payload: dict[str, object]) -> ThemeCheckoutResponse:
    event_id = str(payload.get("event_id") or "").strip()
    session_id = str(payload.get("session_id") or "").strip()
    event_type = str(payload.get("event_type") or "").strip()
    if not event_id or not session_id or event_type not in {"payment_succeeded", "payment_refunded"}:
        raise HTTPException(status_code=400, detail="Invalid sandbox commerce event.")
    now = str(payload.get("occurred_at") or _utc_now())
    with sqlite3.connect(_db(data_root, str(payload.get("user_id") or "system"))) as connection:
        session = connection.execute(
            "SELECT user_id, product_type, product_id, theme_ids, amount_cents, currency, status, payment_status FROM commerce_checkout_sessions WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Checkout session not found.")
        if connection.execute("SELECT 1 FROM commerce_events WHERE event_id = ?", (event_id,)).fetchone():
            return ThemeCheckoutResponse(
                session_id=session_id, status=session[6], payment_status=session[7], product_type=session[1], product_id=session[2],
                theme_ids=json.loads(session[3]), amount_cents=session[4], currency=session[5],
            )
        if event_type == "payment_succeeded":
            connection.execute(
                "UPDATE commerce_checkout_sessions SET status = 'paid', payment_status = 'succeeded', updated_at = ? WHERE session_id = ?",
                (now, session_id),
            )
            for theme_id in json.loads(session[3]):
                connection.execute(
                    "INSERT OR REPLACE INTO commerce_theme_grants (session_id, theme_id, status, granted_at, revoked_at) VALUES (?, ?, 'active', ?, NULL)",
                    (session_id, theme_id, now),
                )
        else:
            connection.execute(
                "UPDATE commerce_checkout_sessions SET status = 'refunded', payment_status = 'refunded', updated_at = ? WHERE session_id = ?",
                (now, session_id),
            )
            connection.execute(
                "UPDATE commerce_theme_grants SET status = 'revoked', revoked_at = ? WHERE session_id = ?",
                (now, session_id),
            )
        connection.execute(
            "INSERT INTO commerce_events (event_id, session_id, event_type, payload, occurred_at) VALUES (?, ?, ?, ?, ?)",
            (event_id, session_id, event_type, json.dumps(payload, sort_keys=True), now),
        )
        connection.commit()
        status = "paid" if event_type == "payment_succeeded" else "refunded"
        payment_status = "succeeded" if event_type == "payment_succeeded" else "refunded"
        return ThemeCheckoutResponse(
            session_id=session_id, status=status, payment_status=payment_status, product_type=session[1], product_id=session[2],
            theme_ids=json.loads(session[3]), amount_cents=session[4], currency=session[5],
        )


def get_local_owned_theme_ids(data_root: Path, user_id: str) -> set[str]:
    db_path = _db(data_root, user_id)
    with sqlite3.connect(db_path) as connection:
        rows = connection.execute("SELECT DISTINCT theme_id FROM commerce_theme_grants WHERE status = 'active'").fetchall()
    return {str(row[0]) for row in rows}


def get_entitlements(data_root: Path, user_id: str) -> ThemeEntitlementResponse:
    return ThemeEntitlementResponse(theme_ids=sorted(get_local_owned_theme_ids(data_root, user_id)), source="local")
