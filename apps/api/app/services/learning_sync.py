from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

from app.schemas.learning import LearningSyncResponse
from app.services import learning_profile
from app.services.auth import AuthenticatedUserContext, supabase_rest_request
from fastapi import HTTPException

RETRY_BASE_SECONDS = 2
RETRY_MAX_SECONDS = 300


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _retry_delay_seconds(attempts: int) -> int:
    return min(RETRY_MAX_SECONDS, RETRY_BASE_SECONDS ** min(max(attempts, 1), 8))


def _retry_at(now: str, attempts: int) -> str:
    try:
        timestamp = datetime.fromisoformat(now.replace("Z", "+00:00"))
    except ValueError:
        return now
    return (timestamp + timedelta(seconds=_retry_delay_seconds(attempts))).isoformat().replace("+00:00", "Z")


def _scheduled_retry_seconds(connection: sqlite3.Connection, now: str, default_attempts: int) -> int:
    retry_row = connection.execute(
        """
        SELECT next_attempt_at
        FROM learning_event_reconciliation
        WHERE status = 'retry_scheduled' AND next_attempt_at > ?
        ORDER BY next_attempt_at ASC
        LIMIT 1
        """,
        (now,),
    ).fetchone()
    if retry_row and retry_row[0]:
        try:
            return max(
                1,
                int(
                    (
                        datetime.fromisoformat(str(retry_row[0]).replace("Z", "+00:00"))
                        - datetime.fromisoformat(now.replace("Z", "+00:00"))
                    ).total_seconds()
                ),
            )
        except ValueError:
            pass
    return _retry_delay_seconds(default_attempts)


def _ensure_reconciliation_rows(connection: sqlite3.Connection, event_ids: list[str], checked_at: str) -> None:
    if not event_ids:
        return
    connection.executemany(
        """
        INSERT OR IGNORE INTO learning_event_reconciliation (
            event_id, status, last_checked_at
        ) VALUES (?, 'queued', ?)
        """,
        [(event_id, checked_at) for event_id in event_ids],
    )


def _mark_upload_attempt(connection: sqlite3.Connection, event_ids: list[str], attempted_at: str) -> None:
    if not event_ids:
        return
    _ensure_reconciliation_rows(connection, event_ids, attempted_at)
    for event_id in event_ids:
        connection.execute(
            "UPDATE learning_event_outbox SET attempts = attempts + 1, last_error = NULL WHERE event_id = ?",
            (event_id,),
        )
        attempts = int(
            connection.execute(
                "SELECT attempts FROM learning_event_outbox WHERE event_id = ?",
                (event_id,),
            ).fetchone()[0]
        )
        connection.execute(
            """
            UPDATE learning_event_reconciliation
            SET status = 'uploading', attempts = ?, last_attempt_at = ?,
                next_attempt_at = NULL, last_checked_at = ?, last_error = NULL
            WHERE event_id = ?
            """,
            (attempts, attempted_at, attempted_at, event_id),
        )


def _mark_upload_failure(
    connection: sqlite3.Connection,
    event_ids: list[str],
    failed_at: str,
    error: str,
) -> None:
    if not event_ids:
        return
    _ensure_reconciliation_rows(connection, event_ids, failed_at)
    for event_id in event_ids:
        row = connection.execute(
            "SELECT attempts FROM learning_event_outbox WHERE event_id = ?",
            (event_id,),
        ).fetchone()
        attempts = int(row[0]) if row else 1
        next_attempt_at = _retry_at(failed_at, attempts)
        connection.execute(
            "UPDATE learning_event_outbox SET last_error = ? WHERE event_id = ?",
            (error[:500], event_id),
        )
        connection.execute(
            """
            UPDATE learning_event_reconciliation
            SET status = 'retry_scheduled', attempts = ?, last_attempt_at = ?,
                next_attempt_at = ?, last_checked_at = ?, last_error = ?, detail = ?
            WHERE event_id = ?
            """,
            (attempts, failed_at, next_attempt_at, failed_at, error[:500], "Supabase upload failed.", event_id),
        )


def _mark_outbox_rows(connection: sqlite3.Connection, event_ids: list[str], synced_at: str) -> None:
    if not event_ids:
        return
    _ensure_reconciliation_rows(connection, event_ids, synced_at)
    connection.executemany(
        "UPDATE learning_event_outbox SET synced_at = ?, last_error = NULL WHERE event_id = ?",
        [(synced_at, event_id) for event_id in event_ids],
    )
    connection.executemany(
        """
        UPDATE learning_event_reconciliation
        SET status = 'synced', next_attempt_at = NULL, last_checked_at = ?,
            last_error = NULL, detail = 'Uploaded or already present in Supabase.'
        WHERE event_id = ?
        """,
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
    pending_error_row = connection.execute(
        """
        SELECT last_error
        FROM learning_event_outbox
        WHERE synced_at IS NULL AND last_error IS NOT NULL
        ORDER BY occurred_at ASC
        LIMIT 1
        """
    ).fetchone()
    pending_error = pending_error_row[0] if pending_error_row else None
    connection.execute(
        """
        UPDATE learning_sync_state
        SET last_attempt_at = ?, last_success_at = ?, consecutive_failures = 0,
            last_error = ?, conflict_count = conflict_count + ?
        WHERE id = 1
        """,
        (now, now, pending_error, conflict_count),
    )
    connection.commit()
    return _sync_state(connection)


def _pending_response(
    connection: sqlite3.Connection,
    *,
    now: str,
    uploaded: int = 0,
    hydrated: int = 0,
    remote: int = 0,
) -> LearningSyncResponse:
    state = _sync_state(connection)
    failures = int(state["consecutive_failures"])
    pending = int(connection.execute("SELECT COUNT(*) FROM learning_event_outbox WHERE synced_at IS NULL").fetchone()[0])
    retry_after_seconds = _scheduled_retry_seconds(connection, now, failures)
    latest = connection.execute(
        """
        SELECT event_id, status
        FROM learning_event_reconciliation
        ORDER BY last_checked_at DESC, event_id DESC
        LIMIT 1
        """
    ).fetchone()
    return LearningSyncResponse(
        status="pending",
        uploaded_event_count=uploaded,
        hydrated_event_count=hydrated,
        remote_event_count=remote,
        pending_event_count=pending,
        last_synced_at=state["last_success_at"],
        retry_after_seconds=retry_after_seconds,
        conflict_count=int(state["conflict_count"]),
        last_error=state["last_error"],
        last_reconciliation_event_id=latest["event_id"] if latest else None,
        last_reconciliation_status=latest["status"] if latest else None,
    )


def _mark_reconciliation_conflict(
    connection: sqlite3.Connection,
    event_id: str | None,
    checked_at: str,
    detail: str,
) -> None:
    if not event_id:
        return
    _ensure_reconciliation_rows(connection, [event_id], checked_at)
    connection.execute(
        """
        UPDATE learning_event_reconciliation
        SET status = 'conflict', next_attempt_at = NULL, last_checked_at = ?,
            last_error = ?, detail = ?
        WHERE event_id = ?
        """,
        (checked_at, detail[:500], "Remote event could not be reconciled.", event_id),
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
        elif event_type == "study_vocabulary_item":
            source_book_id = str(payload.get("book_id") or "").strip()
            language_code = str(payload.get("language_code") or "local").strip().lower() or "local"
            lemma = str(payload.get("lemma") or "").strip()
            display_form = str(payload.get("display_form") or lemma).strip() or lemma
            source_surface_form = str(payload.get("source_surface_form") or display_form).strip() or display_form
            source_sentence_text = str(payload.get("source_sentence_text") or "").strip()
            if not source_book_id or not lemma or not source_sentence_text:
                return False
            occurred_at = str(payload.get("last_seen_at") or event.get("occurred_at") or _utc_now())
            first_seen_at = str(payload.get("first_seen_at") or occurred_at)
            connection.execute(
                """
                INSERT INTO study_vocabulary_items (
                    language_code,
                    lemma,
                    display_form,
                    source_book_id,
                    source_page_number,
                    source_sentence_order,
                    source_token_order,
                    source_surface_form,
                    source_sentence_text,
                    pronunciation,
                    romanization,
                    definition_short,
                    proficiency_level,
                    click_count,
                    first_seen_at,
                    last_seen_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                ON CONFLICT(language_code, lemma) DO UPDATE SET
                    display_form = excluded.display_form,
                    source_book_id = excluded.source_book_id,
                    source_page_number = excluded.source_page_number,
                    source_sentence_order = excluded.source_sentence_order,
                    source_token_order = excluded.source_token_order,
                    source_surface_form = excluded.source_surface_form,
                    source_sentence_text = excluded.source_sentence_text,
                    pronunciation = excluded.pronunciation,
                    romanization = excluded.romanization,
                    definition_short = excluded.definition_short,
                    proficiency_level = excluded.proficiency_level,
                    click_count = study_vocabulary_items.click_count + 1,
                    first_seen_at = COALESCE(study_vocabulary_items.first_seen_at, excluded.first_seen_at),
                    last_seen_at = excluded.last_seen_at
                """,
                (
                    language_code,
                    lemma,
                    display_form,
                    source_book_id,
                    int(payload.get("page_number") or 1),
                    int(payload.get("sentence_order") or 1),
                    int(payload.get("token_order") or 1),
                    source_surface_form,
                    source_sentence_text,
                    payload.get("pronunciation"),
                    payload.get("romanization"),
                    payload.get("definition_short"),
                    payload.get("proficiency_level"),
                    first_seen_at,
                    occurred_at,
                ),
            )
        elif event_type == "word_interaction":
            book_id = str(payload.get("book_id") or "").strip()
            language_code = str(payload.get("language_code") or "local").strip().lower() or "local"
            target_text = str(payload.get("target_text") or payload.get("lemma") or "").strip()
            interaction_type = str(payload.get("interaction_type") or "definition_lookup").strip() or "definition_lookup"
            if not book_id or not target_text:
                return False
            connection.execute(
                """
                INSERT INTO word_interactions (
                    book_id,
                    page_number,
                    language_code,
                    lemma,
                    interaction_type,
                    occurred_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    book_id,
                    int(payload.get("page_number") or 1),
                    language_code,
                    target_text,
                    interaction_type,
                    payload.get("occurred_at") or event.get("occurred_at") or _utc_now(),
                ),
            )
        else:
            return False
    except (TypeError, ValueError, sqlite3.IntegrityError):
        return False

    connection.execute(
        "INSERT INTO learning_event_receipts (event_id, received_at) VALUES (?, ?)",
        (event_id, str(event.get("occurred_at") or _utc_now())),
    )
    _ensure_reconciliation_rows(connection, [event_id], str(event.get("occurred_at") or _utc_now()))
    connection.execute(
        """
        UPDATE learning_event_reconciliation
        SET status = 'hydrated', next_attempt_at = NULL, last_checked_at = ?,
            last_error = NULL, detail = 'Hydrated from Supabase into the local learner profile.'
        WHERE event_id = ?
        """,
        (str(event.get("occurred_at") or _utc_now()), event_id),
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
            """
            SELECT o.event_id, o.idempotency_key, o.event_type, o.book_id, o.occurred_at, o.payload
            FROM learning_event_outbox AS o
            LEFT JOIN learning_event_reconciliation AS r ON r.event_id = o.event_id
            WHERE o.synced_at IS NULL
              AND (
                    r.event_id IS NULL
                    OR (
                        r.status IN ('queued', 'uploading', 'retry_scheduled')
                        AND (r.next_attempt_at IS NULL OR r.next_attempt_at <= ?)
                    )
              )
            ORDER BY o.occurred_at ASC
            LIMIT ?
            """,
            (now, max_events),
        ).fetchall()
        rows: list[dict[str, object]] = []
        event_ids: list[str] = []
        malformed_event_ids: list[str] = []
        for row in pending:
            try:
                event_payload = json.loads(row["payload"])
            except json.JSONDecodeError:
                malformed_event_ids.append(str(row["event_id"]))
                continue
            rows.append({
                "event_id": row["event_id"], "user_id": context.user.id, "idempotency_key": row["idempotency_key"],
                "event_type": row["event_type"], "book_id": row["book_id"], "occurred_at": row["occurred_at"],
                "payload": event_payload,
            })
            event_ids.append(row["event_id"])

        for event_id in malformed_event_ids:
            _mark_reconciliation_conflict(connection, event_id, now, "Local event payload is not valid JSON.")
        if malformed_event_ids:
            connection.commit()

    if rows:
        with sqlite3.connect(db_path) as connection:
            _mark_upload_attempt(connection, event_ids, now)
            connection.commit()
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
                _mark_upload_failure(connection, event_ids, now, str(exc.detail))
                _record_failure(connection, now=now, error=str(exc.detail))
                return _pending_response(connection, now=now)
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
            return _pending_response(connection, now=now, uploaded=len(event_ids))

    remote_events = remote_payload if isinstance(remote_payload, list) else []
    hydrated = 0
    conflicts = len(malformed_event_ids)
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
                _mark_reconciliation_conflict(connection, event_id or None, now, "Remote learning event payload was invalid or unsupported.")
        pending_count = int(connection.execute("SELECT COUNT(*) FROM learning_event_outbox WHERE synced_at IS NULL").fetchone()[0])
        state = _record_success(connection, now=now, conflict_count=conflicts)
        latest = connection.execute(
            """
            SELECT event_id, status
            FROM learning_event_reconciliation
            ORDER BY last_checked_at DESC, event_id DESC
            LIMIT 1
            """
        ).fetchone()
        return LearningSyncResponse(
            status="pending" if pending_count else "synced",
            uploaded_event_count=len(event_ids),
            hydrated_event_count=hydrated,
            remote_event_count=len(remote_events),
            pending_event_count=pending_count,
            last_synced_at=state["last_success_at"],
            retry_after_seconds=_scheduled_retry_seconds(connection, now, int(state["consecutive_failures"])) if pending_count else 0,
            conflict_count=int(state["conflict_count"]),
            last_error=state["last_error"],
            last_reconciliation_event_id=latest["event_id"] if latest else None,
            last_reconciliation_status=latest["status"] if latest else None,
        )
