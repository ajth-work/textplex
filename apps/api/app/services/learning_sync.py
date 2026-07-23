from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import HTTPException

from app.schemas.learning import LearningSyncResponse
from app.services import learning_profile
from app.services.auth import AuthenticatedUserContext, supabase_rest_request


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _mark_outbox_rows(connection: sqlite3.Connection, event_ids: list[str], synced_at: str) -> None:
    if not event_ids:
        return
    connection.executemany(
        "UPDATE learning_event_outbox SET synced_at = ?, attempts = attempts + 1, last_error = NULL WHERE event_id = ?",
        [(synced_at, event_id) for event_id in event_ids],
    )


def _sync_state(connection: sqlite3.Connection) -> sqlite3.Row:
    row = connection.execute("SELECT * FROM learning_sync_state WHERE id = 1").fetchone()
    if row is None:
        connection.execute("INSERT INTO learning_sync_state (id) VALUES (1)")
        row = connection.execute("SELECT * FROM learning_sync_state WHERE id = 1").fetchone()
    assert row is not None
    return row


def _record_failure(connection: sqlite3.Connection, *, now: str, error: str) -> sqlite3.Row:
    state = _sync_state(connection)
    failures = int(state["consecutive_failures"]) + 1
    connection.execute(
        "UPDATE learning_sync_state SET last_attempt_at = ?, consecutive_failures = ?, last_error = ? WHERE id = 1",
        (now, failures, error[:500]),
    )
    connection.commit()
    return _sync_state(connection)


def _record_success(connection: sqlite3.Connection, *, now: str, conflict_count: int) -> sqlite3.Row:
    _sync_state(connection)
    connection.execute(
        """
        UPDATE learning_sync_state
        SET last_attempt_at = ?, last_success_at = ?, consecutive_failures = 0,
            last_error = NULL, conflict_count = conflict_count + ?
        WHERE id = 1
        """,
        (now, now, conflict_count),
    )
    connection.commit()
    return _sync_state(connection)


def _pending_response(
    connection: sqlite3.Connection,
    *,
    uploaded: int = 0,
    hydrated: int = 0,
    remote: int = 0,
) -> LearningSyncResponse:
    state = _sync_state(connection)
    failures = int(state["consecutive_failures"])
    pending = int(connection.execute("SELECT COUNT(*) FROM learning_event_outbox WHERE synced_at IS NULL").fetchone()[0])
    return LearningSyncResponse(
        status="pending",
        uploaded_event_count=uploaded,
        hydrated_event_count=hydrated,
        remote_event_count=remote,
        pending_event_count=pending,
        last_synced_at=state["last_success_at"],
        retry_after_seconds=min(300, 2 ** min(failures, 8)),
        conflict_count=int(state["conflict_count"]),
        last_error=state["last_error"],
    )


def _materialize_remote_event(connection: sqlite3.Connection, event: dict[str, object]) -> bool:
    event_id = str(event.get("event_id") or "").strip()
    event_type = str(event.get("event_type") or "").strip()
    payload = event.get("payload")
    if not event_id or not isinstance(payload, dict):
        return False

    if connection.execute("SELECT 1 FROM learning_event_receipts WHERE event_id = ?", (event_id,)).fetchone():
        return False

    try:
        if event_type == "reading_session":
            connection.execute(
                """
                INSERT OR IGNORE INTO reading_sessions (id, book_id, started_at, ended_at, active_seconds)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    payload.get("session_id"), payload.get("book_id"),
                    payload.get("started_at") or event.get("occurred_at"), payload.get("ended_at"),
                    int(payload.get("active_seconds") or 0),
                ),
            )
        elif event_type == "page_read":
            connection.execute(
                """
                INSERT INTO page_reads (
                    session_id, book_id, page_number, active_seconds, estimated_seconds,
                    completion_ratio, counted_as_read, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.get("session_id"), payload.get("book_id"), int(payload.get("page_number") or 1),
                    int(payload.get("active_seconds") or 0), int(payload.get("estimated_seconds") or 30),
                    float(payload.get("completion_ratio") or 0), int(bool(payload.get("counted_as_read"))),
                    payload.get("completed_at") or event.get("occurred_at") or _utc_now(),
                ),
            )
            connection.execute(
                "UPDATE reading_sessions SET active_seconds = active_seconds + ? WHERE id = ?",
                (int(payload.get("active_seconds") or 0), payload.get("session_id")),
            )
        elif event_type == "sentence_read":
            connection.execute(
                """
                INSERT INTO sentence_reads (
                    session_id, book_id, page_number, sentence_order, sentence_text,
                    token_count, character_count, active_seconds, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.get("session_id"), payload.get("book_id"), int(payload.get("page_number") or 1),
                    int(payload.get("sentence_order") or 1), str(payload.get("sentence_text") or ""),
                    int(payload.get("token_count") or 0), int(payload.get("character_count") or 0),
                    int(payload.get("active_seconds") or 0), payload.get("completed_at") or event.get("occurred_at") or _utc_now(),
                ),
            )
            language_code = str(payload.get("language_code") or "local")
            for token in payload.get("tokens", []):
                if not isinstance(token, dict):
                    continue
                surface_form = str(token.get("surface_form") or "").strip()
                token_kind = str(token.get("token_kind") or "word")
                if not surface_form or token_kind not in {"word", "character"}:
                    continue
                normalized_form = str(token.get("lemma") or surface_form).strip() or surface_form
                connection.execute(
                    """
                    INSERT INTO token_exposures (
                        session_id, book_id, page_number, sentence_order, token_kind,
                        surface_form, normalized_form, character_count, active_seconds, occurred_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload.get("session_id"), payload.get("book_id"), int(payload.get("page_number") or 1),
                        int(payload.get("sentence_order") or 1), token_kind, surface_form, normalized_form,
                        len(surface_form), int(payload.get("active_seconds") or 0),
                        payload.get("completed_at") or event.get("occurred_at") or _utc_now(),
                    ),
                )
                learning_profile._record_exposure(
                    connection,
                    language_code=language_code,
                    lemma=normalized_form,
                    book_id=str(payload.get("book_id") or ""),
                    page_number=int(payload.get("page_number") or 1),
                    exposure_type="word_read" if token_kind == "word" else "character_read",
                    weight=1.0 if token_kind == "word" else 0.5,
                    occurred_at=str(payload.get("completed_at") or event.get("occurred_at") or _utc_now()),
                )
        else:
            return False
    except (TypeError, ValueError, sqlite3.IntegrityError):
        return False

    connection.execute(
        "INSERT INTO learning_event_receipts (event_id, received_at) VALUES (?, ?)",
        (event_id, str(event.get("occurred_at") or _utc_now())),
    )
    return True


def sync_learning_events(
    data_root: Path,
    context: AuthenticatedUserContext,
    *,
    max_events: int = 100,
) -> LearningSyncResponse:
    db_path = learning_profile.ensure_profile_database(data_root, context.user.id)
    now = _utc_now()
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        pending = connection.execute(
            "SELECT event_id, idempotency_key, event_type, book_id, occurred_at, payload FROM learning_event_outbox WHERE synced_at IS NULL ORDER BY occurred_at ASC LIMIT ?",
            (max_events,),
        ).fetchall()
        rows: list[dict[str, object]] = []
        event_ids: list[str] = []
        for row in pending:
            try:
                event_payload = json.loads(row["payload"])
            except json.JSONDecodeError:
                continue
            rows.append({
                "event_id": row["event_id"], "user_id": context.user.id, "idempotency_key": row["idempotency_key"],
                "event_type": row["event_type"], "book_id": row["book_id"], "occurred_at": row["occurred_at"],
                "payload": event_payload,
            })
            event_ids.append(row["event_id"])

    if rows:
        try:
            supabase_rest_request(
                "learning_events?on_conflict=user_id,idempotency_key", context.access_token,
                method="POST", payload=rows, prefer="resolution=ignore-duplicates,return=minimal",
            )
        except HTTPException as exc:
            if exc.status_code in {401, 403}:
                raise
            with sqlite3.connect(db_path) as connection:
                connection.row_factory = sqlite3.Row
                _record_failure(connection, now=now, error=str(exc.detail))
                return _pending_response(connection)
        with sqlite3.connect(db_path) as connection:
            _mark_outbox_rows(connection, event_ids, now)
            connection.commit()

    user_id = quote(context.user.id, safe="")
    try:
        remote_payload = supabase_rest_request(
            f"learning_events?select=event_id,event_type,book_id,occurred_at,payload&user_id=eq.{user_id}&order=occurred_at.asc,event_id.asc&limit={max_events}",
            context.access_token,
        )
    except HTTPException as exc:
        if exc.status_code in {401, 403}:
            raise
        with sqlite3.connect(db_path) as connection:
            connection.row_factory = sqlite3.Row
            _record_failure(connection, now=now, error=str(exc.detail))
            return _pending_response(connection, uploaded=len(event_ids))

    remote_events = remote_payload if isinstance(remote_payload, list) else []
    hydrated = 0
    conflicts = 0
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        for event in remote_events:
            if not isinstance(event, dict):
                conflicts += 1
                continue
            event_id = str(event.get("event_id") or "").strip()
            if event_id and connection.execute("SELECT 1 FROM learning_event_receipts WHERE event_id = ?", (event_id,)).fetchone():
                continue
            if _materialize_remote_event(connection, event):
                hydrated += 1
            else:
                conflicts += 1
        pending_count = int(connection.execute("SELECT COUNT(*) FROM learning_event_outbox WHERE synced_at IS NULL").fetchone()[0])
        state = _record_success(connection, now=now, conflict_count=conflicts)
        return LearningSyncResponse(
            status="pending" if pending_count else "synced",
            uploaded_event_count=len(event_ids),
            hydrated_event_count=hydrated,
            remote_event_count=len(remote_events),
            pending_event_count=pending_count,
            last_synced_at=state["last_success_at"],
            retry_after_seconds=0,
            conflict_count=int(state["conflict_count"]),
            last_error=None,
        )
