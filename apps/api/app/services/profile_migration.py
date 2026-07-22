from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.migration import ProfileMigrationRequest, ProfileMigrationResponse
from app.services.learning_profile import ensure_profile_database, get_profile_db_path


MIGRATABLE_COLUMNS: dict[str, tuple[str, ...]] = {
    "reading_sessions": ("id", "book_id", "started_at", "ended_at", "active_seconds"),
    "page_reads": (
        "id",
        "session_id",
        "book_id",
        "page_number",
        "active_seconds",
        "estimated_seconds",
        "completion_ratio",
        "counted_as_read",
        "completed_at",
    ),
    "sentence_reads": (
        "id",
        "session_id",
        "book_id",
        "page_number",
        "sentence_order",
        "sentence_text",
        "token_count",
        "character_count",
        "active_seconds",
        "completed_at",
    ),
    "token_exposures": (
        "id",
        "session_id",
        "book_id",
        "page_number",
        "sentence_order",
        "token_kind",
        "surface_form",
        "normalized_form",
        "character_count",
        "active_seconds",
        "occurred_at",
    ),
    "word_interactions": (
        "id",
        "book_id",
        "page_number",
        "language_code",
        "lemma",
        "interaction_type",
        "occurred_at",
    ),
    "exposure_ledger": (
        "id",
        "language_code",
        "lemma",
        "book_id",
        "page_number",
        "exposure_type",
        "weight",
        "occurred_at",
    ),
    "vocabulary_progress": (
        "language_code",
        "lemma",
        "raw_exposures",
        "weighted_exposure",
        "unique_pages",
        "unique_books",
        "help_requests",
        "first_seen_at",
        "last_seen_at",
        "state",
        "confidence_score",
        "manual_override",
    ),
    "settings": ("key", "value", "updated_at"),
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _counts(connection: sqlite3.Connection, schema: str = "main") -> dict[str, int]:
    return {
        table: int(connection.execute(f"SELECT COUNT(*) FROM {schema}.{table}").fetchone()[0])
        for table in MIGRATABLE_COLUMNS
    }


def _fingerprint(counts: dict[str, int], settings: list[tuple[str, str]]) -> str:
    payload = json.dumps({"counts": counts, "settings": settings}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _open_source(data_root: Path) -> sqlite3.Connection:
    source_path = get_profile_db_path(data_root)
    source_path.parent.mkdir(parents=True, exist_ok=True)
    ensure_profile_database(data_root)
    connection = sqlite3.connect(source_path)
    connection.row_factory = sqlite3.Row
    return connection


def _open_target(data_root: Path, owner_id: str) -> sqlite3.Connection:
    target_path = get_profile_db_path(data_root, owner_id)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    ensure_profile_database(data_root, owner_id)
    connection = sqlite3.connect(target_path)
    connection.row_factory = sqlite3.Row
    return connection


def _preview_values(data_root: Path, owner_id: str) -> tuple[dict[str, int], dict[str, int], str, bool]:
    with _open_source(data_root) as source, _open_target(data_root, owner_id) as target:
        source_counts = _counts(source)
        target_counts = _counts(target)
        settings = source.execute("SELECT key, value FROM settings ORDER BY key ASC").fetchall()
        fingerprint = _fingerprint(source_counts, [(row["key"], row["value"]) for row in settings])
        marker = target.execute(
            "SELECT 1 FROM profile_migrations WHERE source_profile_key = ?",
            ("anonymous-local-profile",),
        ).fetchone()
    return source_counts, target_counts, fingerprint, marker is not None


def preview_profile_migration(data_root: Path, owner_id: str) -> ProfileMigrationResponse:
    source_counts, target_counts, fingerprint, already_migrated = _preview_values(data_root, owner_id)
    total_rows = sum(source_counts.values())
    if already_migrated:
        status = "already_migrated"
        message = "The anonymous profile has already been merged for this account. No rows will be overwritten."
    elif total_rows == 0:
        status = "empty"
        message = "No anonymous profile data is available to migrate."
    else:
        status = "ready"
        message = "Ready to merge anonymous profile rows without overwriting existing account rows."
    return ProfileMigrationResponse(
        status=status,
        conflict_policy="merge_non_destructive",
        source_fingerprint=fingerprint,
        source_counts=source_counts,
        target_counts=target_counts,
        message=message,
    )


def apply_profile_migration(
    data_root: Path,
    owner_id: str,
    payload: ProfileMigrationRequest,
) -> ProfileMigrationResponse:
    if payload.conflict_policy != "merge_non_destructive":
        raise ValueError("Only the non-destructive merge policy is supported.")

    source_counts, target_counts, fingerprint, already_migrated = _preview_values(data_root, owner_id)
    if already_migrated:
        return ProfileMigrationResponse(
            status="already_migrated",
            conflict_policy=payload.conflict_policy,
            source_fingerprint=fingerprint,
            source_counts=source_counts,
            target_counts=target_counts,
            message="The anonymous profile has already been merged for this account.",
        )
    if sum(source_counts.values()) == 0:
        return ProfileMigrationResponse(
            status="empty",
            conflict_policy=payload.conflict_policy,
            source_fingerprint=fingerprint,
            source_counts=source_counts,
            target_counts=target_counts,
            message="No anonymous profile data is available to migrate.",
        )

    source_path = get_profile_db_path(data_root)
    with _open_target(data_root, owner_id) as target:
        target.execute("ATTACH DATABASE ? AS source_profile", (str(source_path),))
        imported_rows: dict[str, int] = {}
        try:
            target.execute("BEGIN")
            for table, columns in MIGRATABLE_COLUMNS.items():
                column_list = ", ".join(columns)
                before = int(target.execute(f"SELECT COUNT(*) FROM main.{table}").fetchone()[0])
                target.execute(
                    f"INSERT OR IGNORE INTO main.{table} ({column_list}) SELECT {column_list} FROM source_profile.{table}"
                )
                after = int(target.execute(f"SELECT COUNT(*) FROM main.{table}").fetchone()[0])
                imported_rows[table] = max(0, after - before)
            target.execute(
                "INSERT INTO profile_migrations (source_profile_key, source_fingerprint, status, imported_at) VALUES (?, ?, ?, ?)",
                ("anonymous-local-profile", fingerprint, "completed", _utc_now()),
            )
            target.commit()
        except Exception:
            target.rollback()
            raise
        finally:
            target.execute("DETACH DATABASE source_profile")

    with _open_target(data_root, owner_id) as merged_target:
        merged_counts = _counts(merged_target)
    return ProfileMigrationResponse(
        status="completed",
        conflict_policy=payload.conflict_policy,
        source_fingerprint=fingerprint,
        source_counts=source_counts,
        target_counts=merged_counts,
        imported_rows=imported_rows,
        message="Anonymous profile rows merged without overwriting existing account rows.",
    )
