from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.schemas.learning import (
    LearningProfileSummary,
    PageReadCreateRequest,
    PageReadRecord,
    ReadingSessionCreateRequest,
    ReadingSessionRecord,
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_profile_db_path(data_root: Path) -> Path:
    return data_root / "user" / "profile.sqlite3"


def _migration_root() -> Path:
    return Path(__file__).resolve().parents[1] / "db" / "migrations" / "user"


def ensure_profile_database(data_root: Path) -> Path:
    db_path = get_profile_db_path(data_root)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    if db_path.exists() and db_path.stat().st_size > 0:
        return db_path

    migration_root = _migration_root()
    migration_files = sorted(migration_root.glob("*.sql"))
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        for migration_file in migration_files:
            connection.executescript(migration_file.read_text(encoding="utf-8"))
        connection.commit()

    return db_path


def _connect(data_root: Path) -> sqlite3.Connection:
    db_path = ensure_profile_database(data_root)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _page_read_from_row(row: sqlite3.Row) -> PageReadRecord:
    return PageReadRecord(
        id=row["id"],
        session_id=row["session_id"],
        book_id=row["book_id"],
        page_number=row["page_number"],
        active_seconds=row["active_seconds"],
        estimated_seconds=row["estimated_seconds"],
        completion_ratio=row["completion_ratio"],
        counted_as_read=bool(row["counted_as_read"]),
        completed_at=row["completed_at"],
    )


def create_reading_session(data_root: Path, payload: ReadingSessionCreateRequest) -> ReadingSessionRecord:
    started_at = payload.started_at or _utc_now()
    session_id = f"session-{uuid4().hex}"
    with _connect(data_root) as connection:
        connection.execute(
            """
            INSERT INTO reading_sessions (id, book_id, started_at, ended_at, active_seconds)
            VALUES (?, ?, ?, NULL, 0)
            """,
            (session_id, payload.book_id, started_at),
        )
        connection.commit()
    return ReadingSessionRecord(
        id=session_id,
        book_id=payload.book_id,
        started_at=started_at,
        ended_at=None,
        active_seconds=0,
    )


def record_page_read(data_root: Path, payload: PageReadCreateRequest) -> PageReadRecord:
    completed_at = _utc_now()
    estimated_seconds = max(payload.active_seconds, 30)
    completion_ratio = 0.0 if estimated_seconds <= 0 else min(payload.active_seconds / estimated_seconds, 1.0)
    counted_as_read = int(payload.active_seconds >= 15 or completion_ratio >= 0.75)

    with _connect(data_root) as connection:
        session_row = connection.execute(
            "SELECT id FROM reading_sessions WHERE id = ? AND book_id = ?",
            (payload.session_id, payload.book_id),
        ).fetchone()
        if session_row is None:
            raise KeyError(f"Reading session not found: {payload.session_id}")

        cursor = connection.execute(
            """
            INSERT INTO page_reads (
                session_id,
                book_id,
                page_number,
                active_seconds,
                estimated_seconds,
                completion_ratio,
                counted_as_read,
                completed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.session_id,
                payload.book_id,
                payload.page_number,
                payload.active_seconds,
                estimated_seconds,
                completion_ratio,
                counted_as_read,
                payload.completed_at or completed_at,
            ),
        )
        connection.execute(
            "UPDATE reading_sessions SET active_seconds = active_seconds + ? WHERE id = ?",
            (payload.active_seconds, payload.session_id),
        )
        connection.commit()
        row = connection.execute(
            """
            SELECT id, session_id, book_id, page_number, active_seconds, estimated_seconds, completion_ratio, counted_as_read, completed_at
            FROM page_reads
            WHERE id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()
        if row is None:
            raise RuntimeError("Failed to record page read.")
    return _page_read_from_row(row)


def get_learning_profile_summary(data_root: Path) -> LearningProfileSummary:
    db_path = ensure_profile_database(data_root)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        reading_sessions = connection.execute("SELECT COUNT(*) AS count FROM reading_sessions").fetchone()["count"]
        page_reads = connection.execute("SELECT COUNT(*) AS count FROM page_reads").fetchone()["count"]
        active_books = connection.execute("SELECT COUNT(DISTINCT book_id) AS count FROM reading_sessions").fetchone()["count"]
        vocabulary_progress_rows = connection.execute("SELECT COUNT(*) AS count FROM vocabulary_progress").fetchone()["count"]

    return LearningProfileSummary(
        database_path=str(db_path),
        reading_sessions=reading_sessions,
        page_reads=page_reads,
        active_books=active_books,
        vocabulary_progress_rows=vocabulary_progress_rows,
    )
