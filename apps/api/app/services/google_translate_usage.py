from __future__ import annotations

import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from app.core.paths import resolve_user_data_root
from app.schemas.google_translate import GoogleTranslateUsageSummary

GOOGLE_TRANSLATE_MONTHLY_FREE_LIMIT = 500_000
GOOGLE_TRANSLATE_BASIC_RATE_PER_MILLION_USD = 20.0
GOOGLE_TRANSLATE_USAGE_DB_NAME = "google_translate_usage.sqlite3"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _current_month_key() -> str:
    return datetime.now().astimezone().strftime("%Y-%m")


def get_google_translate_usage_db_path(data_root: Path) -> Path:
    return resolve_user_data_root(data_root) / GOOGLE_TRANSLATE_USAGE_DB_NAME


def _migration_root() -> Path:
    return Path(__file__).resolve().parents[1] / "db" / "migrations" / "google_translate"


def _ensure_schema(connection: sqlite3.Connection) -> None:
    for migration_file in sorted(_migration_root().glob("*.sql")):
        connection.executescript(migration_file.read_text(encoding="utf-8"))
    connection.commit()


def ensure_google_translate_usage_database(data_root: Path) -> Path:
    db_path = get_google_translate_usage_db_path(data_root)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    if db_path.exists() and db_path.stat().st_size > 0:
        with closing(sqlite3.connect(db_path)) as connection:
            _ensure_schema(connection)
        return db_path

    with closing(sqlite3.connect(db_path)) as connection:
        for migration_file in sorted(_migration_root().glob("*.sql")):
            connection.executescript(migration_file.read_text(encoding="utf-8"))
        connection.commit()

    return db_path


def record_google_translate_usage(
    *,
    data_root: Path,
    characters: int,
    request_count: int = 1,
    owner_id: str | None = None,
) -> None:
    normalized_characters = max(0, int(characters))
    normalized_requests = max(0, int(request_count))
    if normalized_characters <= 0 and normalized_requests <= 0:
        return

    db_path = ensure_google_translate_usage_database(data_root)
    month_key = _current_month_key()
    now = _utc_now()

    with closing(sqlite3.connect(db_path)) as connection:
        connection.execute(
            """
            INSERT INTO google_translate_monthly_usage (
                month_key,
                request_count,
                character_count,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(month_key) DO UPDATE SET
                request_count = request_count + excluded.request_count,
                character_count = character_count + excluded.character_count,
                updated_at = excluded.updated_at
            """,
            (month_key, normalized_requests, normalized_characters, now, now),
        )
        if owner_id:
            connection.execute(
                """
                INSERT INTO google_translate_account_monthly_usage (
                    owner_id,
                    month_key,
                    request_count,
                    character_count,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(owner_id, month_key) DO UPDATE SET
                    request_count = request_count + excluded.request_count,
                    character_count = character_count + excluded.character_count,
                    updated_at = excluded.updated_at
                """,
                (owner_id, month_key, normalized_requests, normalized_characters, now, now),
            )
        connection.commit()


def get_google_translate_usage_summary(data_root: Path, *, owner_id: str | None = None) -> GoogleTranslateUsageSummary:
    db_path = ensure_google_translate_usage_database(data_root)
    month_key = _current_month_key()

    request_count = 0
    character_count = 0
    updated_at: str | None = None

    with closing(sqlite3.connect(db_path)) as connection:
        connection.row_factory = sqlite3.Row
        row = connection.execute(
            """
            SELECT month_key, request_count, character_count, updated_at
            FROM google_translate_account_monthly_usage
            WHERE owner_id = ? AND month_key = ?
            """,
            (owner_id, month_key),
        ).fetchone()
        scope = "account"
        if owner_id is None:
            row = connection.execute(
                """
                SELECT month_key, request_count, character_count, updated_at
                FROM google_translate_monthly_usage
                WHERE month_key = ?
                """,
                (month_key,),
            ).fetchone()
            scope = "service"
        if row is not None:
            request_count = int(row["request_count"] or 0)
            character_count = int(row["character_count"] or 0)
            updated_at = row["updated_at"]

    free_remaining_characters = max(0, GOOGLE_TRANSLATE_MONTHLY_FREE_LIMIT - character_count)
    billable_characters = max(0, character_count - GOOGLE_TRANSLATE_MONTHLY_FREE_LIMIT)
    estimated_cost_usd = round((billable_characters / 1_000_000) * GOOGLE_TRANSLATE_BASIC_RATE_PER_MILLION_USD, 2)

    return GoogleTranslateUsageSummary(
        scope=scope,
        month_key=month_key,
        request_count=request_count,
        character_count=character_count,
        free_tier_limit=GOOGLE_TRANSLATE_MONTHLY_FREE_LIMIT,
        free_remaining_characters=free_remaining_characters,
        billable_characters=billable_characters,
        billing_rate_per_million_usd=GOOGLE_TRANSLATE_BASIC_RATE_PER_MILLION_USD,
        estimated_cost_usd=estimated_cost_usd,
        updated_at=updated_at,
    )
