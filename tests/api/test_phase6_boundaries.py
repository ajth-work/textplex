from __future__ import annotations

import hashlib
import hmac
import json
from pathlib import Path

from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.auth import AuthMeResponse
from app.schemas.themes import ThemeCheckoutRequest
from app.services import learning_sync
from app.services.auth import AuthenticatedUserContext, get_optional_user_context
from app.services.book_registry import import_book_from_path
from app.services.commerce import (
    apply_sandbox_event,
    create_checkout_session,
    get_local_owned_theme_ids,
)


SOURCE_FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "books" / "alice-mini"


def _context(user_id: str) -> AuthenticatedUserContext:
    return AuthenticatedUserContext(
        user=AuthMeResponse(id=user_id, email=f"{user_id}@example.com", role="authenticated"),
        access_token="valid-token",
    )


def test_private_books_are_visible_only_to_owner(tmp_path: Path) -> None:
    record = import_book_from_path(
        SOURCE_FIXTURE,
        language_code="en",
        page_count=1,
        data_root=tmp_path / "books",
        owner_id="user-a",
    )
    assert record.owner_id == "user-a"

    original_root = app.state.data_root
    app.state.data_root = tmp_path
    app.dependency_overrides[get_optional_user_context] = lambda: _context("user-b")
    try:
        client = TestClient(app)
        assert client.get("/books").json() == []
        assert client.get(f"/books/{record.id}").status_code == 404
        assert client.get(f"/books/{record.id}/pages/1").status_code == 404
    finally:
        app.dependency_overrides.pop(get_optional_user_context, None)
        app.state.data_root = original_root


def test_sandbox_commerce_is_idempotent_and_revocable(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("TEXTPLEX_COMMERCE_PROVIDER", "sandbox")
    user_id = "user-commerce"
    request = ThemeCheckoutRequest(product_type="theme", product_id="jade", idempotency_key="checkout-jade-001")

    first = create_checkout_session(tmp_path, user_id, request)
    repeated = create_checkout_session(tmp_path, user_id, request)
    assert first.session_id == repeated.session_id
    assert first.payment_status == "pending"

    event = {
        "event_id": "evt-jade-paid",
        "session_id": first.session_id,
        "user_id": user_id,
        "event_type": "payment_succeeded",
    }
    paid = apply_sandbox_event(tmp_path, event)
    replayed = apply_sandbox_event(tmp_path, event)
    assert paid.payment_status == "succeeded"
    assert replayed.payment_status == "succeeded"
    assert "jade" in get_local_owned_theme_ids(tmp_path, user_id)

    refunded = apply_sandbox_event(tmp_path, {
        "event_id": "evt-jade-refunded",
        "session_id": first.session_id,
        "user_id": user_id,
        "event_type": "payment_refunded",
    })
    assert refunded.payment_status == "refunded"
    assert "jade" not in get_local_owned_theme_ids(tmp_path, user_id)


def test_sandbox_webhook_requires_valid_signature(monkeypatch) -> None:
    monkeypatch.setenv("TEXTPLEX_COMMERCE_PROVIDER", "sandbox")
    monkeypatch.setenv("TEXTPLEX_SANDBOX_WEBHOOK_SECRET", "test-secret")
    body = json.dumps({"event_id": "evt", "session_id": "missing", "user_id": "user", "event_type": "payment_succeeded"}).encode()
    signature = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    response = TestClient(app).post(
        "/themes/webhooks/sandbox",
        content=body,
        headers={"X-TextPlex-Sandbox-Signature": f"sha256={signature}"},
    )
    assert response.status_code == 404

    invalid = TestClient(app).post(
        "/themes/webhooks/sandbox",
        content=body,
        headers={"X-TextPlex-Sandbox-Signature": "sha256=invalid"},
    )
    assert invalid.status_code == 401


def test_sync_failure_reports_retry_state(tmp_path: Path, monkeypatch) -> None:
    def unavailable(*args, **kwargs):
        raise HTTPException(status_code=503, detail="provider unavailable")

    monkeypatch.setattr(learning_sync, "supabase_rest_request", unavailable)
    result = learning_sync.sync_learning_events(tmp_path, _context("user-sync"))
    assert result.status == "pending"
    assert result.retry_after_seconds >= 2
    assert result.last_error == "provider unavailable"
