from __future__ import annotations

import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.paths import resolve_books_root, resolve_user_data_root
from app.schemas.admin_usage import AdminUsageActivityPoint, AdminUsageSummary
from app.services.book_registry import load_registry
from app.services.feedback import list_feedback
from app.services.google_translate_usage import get_google_translate_usage_summary


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_timestamp(value: object) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def _profile_database_paths(data_root: Path) -> list[Path]:
    user_root = resolve_user_data_root(data_root)
    paths: list[Path] = []
    legacy_path = user_root / "profile.sqlite3"
    if legacy_path.exists():
        paths.append(legacy_path)
    accounts_root = user_root / "accounts"
    if accounts_root.exists():
        paths.extend(sorted(accounts_root.glob("*/profile.sqlite3")))
    return paths


def _query_count(connection: sqlite3.Connection, query: str, params: tuple[object, ...] = ()) -> int:
    try:
        row = connection.execute(query, params).fetchone()
    except sqlite3.Error:
        return 0
    return int(row[0] or 0) if row else 0


def _query_sum(connection: sqlite3.Connection, query: str) -> int:
    try:
        row = connection.execute(query).fetchone()
    except sqlite3.Error:
        return 0
    return int(row[0] or 0) if row else 0


def _activity_rows(connection: sqlite3.Connection) -> list[tuple[str, int, int, int, int]]:
    try:
        rows = connection.execute(
            """
            SELECT date, COUNT(DISTINCT activity_kind), SUM(sessions), SUM(page_reads), SUM(sentence_reads)
            FROM (
                SELECT date(started_at) AS date, 'session' AS activity_kind, 1 AS sessions, 0 AS page_reads, 0 AS sentence_reads
                FROM reading_sessions
                UNION ALL
                SELECT date(completed_at), 'page', 0, 1, 0 FROM page_reads
                UNION ALL
                SELECT date(completed_at), 'sentence', 0, 0, 1 FROM sentence_reads
            )
            WHERE date IS NOT NULL
            GROUP BY date
            """
        ).fetchall()
    except sqlite3.Error:
        return []
    return [(str(row[0]), int(row[1] or 0), int(row[2] or 0), int(row[3] or 0), int(row[4] or 0)) for row in rows]


def get_admin_usage_summary(data_root: Path) -> AdminUsageSummary:
    now = _utc_now()
    activity_by_date: dict[str, dict[str, int]] = defaultdict(lambda: {"active_profiles": 0, "sessions": 0, "page_reads": 0, "sentence_reads": 0})
    profile_count = 0
    active_profiles_7d = 0
    active_profiles_30d = 0
    reading_sessions = 0
    page_reads = 0
    sentence_reads = 0
    active_seconds = 0
    unique_words_exposed = 0

    for db_path in _profile_database_paths(data_root):
        profile_count += 1
        profile_dates: set[str] = set()
        try:
            with sqlite3.connect(db_path) as connection:
                reading_sessions += _query_count(connection, "SELECT COUNT(*) FROM reading_sessions")
                page_reads += _query_count(connection, "SELECT COUNT(*) FROM page_reads")
                sentence_reads += _query_count(connection, "SELECT COUNT(*) FROM sentence_reads")
                active_seconds += _query_sum(connection, "SELECT COALESCE(SUM(active_seconds), 0) FROM reading_sessions")
                unique_words_exposed += _query_count(
                    connection,
                    "SELECT COUNT(DISTINCT normalized_form) FROM token_exposures WHERE token_kind = 'word'",
                )
                rows = _activity_rows(connection)
        except sqlite3.Error:
            continue

        for date_value, _activity_kinds, sessions, profile_page_reads, profile_sentence_reads in rows:
            activity_by_date[date_value]["sessions"] += sessions
            activity_by_date[date_value]["page_reads"] += profile_page_reads
            activity_by_date[date_value]["sentence_reads"] += profile_sentence_reads
            profile_dates.add(date_value)

        for date_value in profile_dates:
            parsed = _parse_timestamp(f"{date_value}T00:00:00Z")
            if parsed is None:
                continue
            age = now - parsed
            if age <= timedelta(days=7):
                active_profiles_7d += 1
            if age <= timedelta(days=30):
                active_profiles_30d += 1
            activity_by_date[date_value]["active_profiles"] += 1

    registry = load_registry(resolve_books_root(data_root) / "registry.json")
    feedback_records = list_feedback(data_root, limit=10000)
    open_statuses = {"needs_review", "in_progress"}
    activity = [
        AdminUsageActivityPoint(date=date_value, **values)
        for date_value, values in sorted(activity_by_date.items())
        if now - _parse_timestamp(f"{date_value}T00:00:00Z") <= timedelta(days=30)
    ]

    return AdminUsageSummary(
        generated_at=now.isoformat().replace("+00:00", "Z"),
        profile_count=profile_count,
        active_profiles_7d=active_profiles_7d,
        active_profiles_30d=active_profiles_30d,
        book_count=len(registry),
        processed_book_count=sum(1 for book in registry.values() if book.processed_at is not None),
        reading_sessions=reading_sessions,
        page_reads=page_reads,
        sentence_reads=sentence_reads,
        active_seconds=active_seconds,
        unique_words_exposed=unique_words_exposed,
        feedback_count=len(feedback_records),
        open_feedback_count=sum(1 for record in feedback_records if record.status in open_statuses),
        google_translate=get_google_translate_usage_summary(data_root),
        activity=activity,
    )
