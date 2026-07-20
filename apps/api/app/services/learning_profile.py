from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.core.paths import resolve_books_root, resolve_user_data_root

from app.schemas.learning import (
    LearningProfileSummary,
    LearningTrackJourneyStep,
    LearningTrackSummary,
    PageReadCreateRequest,
    PageReadRecord,
    SentenceReadCreateRequest,
    SentenceReadRecord,
    ReadingSessionCreateRequest,
    ReadingSessionRecord,
)
from app.services.book_registry import load_registry

TRACK_DEFINITIONS: dict[str, dict[str, str]] = {
    "hsk": {
        "label": "HSK",
        "language_code": "zh",
        "level": "Chinese",
        "subtitle": "Chinese reading track",
        "note": "Built from Chinese books and page reads in the local library.",
    },
    "jlpt": {
        "label": "JLPT",
        "language_code": "ja",
        "level": "Japanese",
        "subtitle": "Japanese reading track",
        "note": "Built from Japanese books and learner activity in the local library.",
    },
    "topik": {
        "label": "TOPIK",
        "language_code": "ko",
        "level": "Korean",
        "subtitle": "Korean reading track",
        "note": "Built from Korean books and learner activity in the local library.",
    },
    "cefr": {
        "label": "CEFR",
        "language_code": "fr",
        "level": "European",
        "subtitle": "European language reading track",
        "note": "Built from European-language books in the local library.",
    },
    "local": {
        "label": "Local",
        "language_code": "local",
        "level": "Custom",
        "subtitle": "Mixed local reading track",
        "note": "Books that do not match a formal exam track stay here.",
    },
}


def _normalize_track_code(language_code: str | None) -> str:
    normalized = (language_code or "").strip().lower()
    if normalized.startswith("zh"):
        return "hsk"
    if normalized.startswith("ja"):
        return "jlpt"
    if normalized.startswith("ko"):
        return "topik"
    if normalized.startswith("fr") or normalized.startswith("en"):
        return "cefr"
    return "local"


def _track_definition(track_code: str) -> dict[str, str]:
    return TRACK_DEFINITIONS.get(track_code, TRACK_DEFINITIONS["local"])


def _track_journey(track: dict[str, object]) -> list[LearningTrackJourneyStep]:
    progress = float(track.get("progress") or 0.0)
    word_exposures = int(track.get("word_exposures") or 0)
    sentence_reads = int(track.get("sentence_reads") or 0)
    average_sentence = track.get("average_seconds_per_sentence")
    average_word = track.get("average_seconds_per_word")

    if progress >= 70:
        statuses = ("complete", "complete", "current")
    elif progress >= 35:
        statuses = ("complete", "current", "next")
    else:
        statuses = ("current", "next", "next")

    return [
        LearningTrackJourneyStep(
            label="Reading flow",
            detail=f"{track.get('page_reads', 0)} page reads across {track.get('books', 0)} books",
            progress=min(progress, 100.0),
            status=statuses[0],
        ),
        LearningTrackJourneyStep(
            label="Vocabulary exposure",
            detail=f"{word_exposures} word exposures and {track.get('unique_words_seen', 0)} unique words",
            progress=min(100.0, float(word_exposures)),
            status=statuses[1],
        ),
        LearningTrackJourneyStep(
            label="Reading pace",
            detail=(
                f"{sentence_reads} sentence reads"
                + (
                    f" at {float(average_sentence):.2f} sec/sentence"
                    if isinstance(average_sentence, (int, float))
                    else ""
                )
                + (
                    f" and {float(average_word):.2f} sec/word"
                    if isinstance(average_word, (int, float))
                    else ""
                )
            ),
            progress=min(100.0, max(0.0, progress * 0.9 + 10.0)),
            status=statuses[2],
        ),
    ]


def _track_progress(track: dict[str, object]) -> float:
    total_pages = int(track.get("total_pages") or 0)
    completed_pages = int(track.get("completed_pages") or 0)
    if total_pages <= 0:
        return 0.0 if completed_pages <= 0 else 100.0
    return round(min(completed_pages / total_pages, 1.0) * 100.0, 2)


def _average(total_seconds: int, count: int) -> float | None:
    if count <= 0:
        return None
    return round(total_seconds / count, 2)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_profile_db_path(data_root: Path) -> Path:
    return resolve_user_data_root(data_root) / "profile.sqlite3"


def _migration_root() -> Path:
    return Path(__file__).resolve().parents[1] / "db" / "migrations" / "user"


def ensure_profile_database(data_root: Path) -> Path:
    db_path = get_profile_db_path(data_root)
    db_path.parent.mkdir(parents=True, exist_ok=True)

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


def _sentence_read_from_row(row: sqlite3.Row) -> SentenceReadRecord:
    return SentenceReadRecord(
        id=row["id"],
        session_id=row["session_id"],
        book_id=row["book_id"],
        page_number=row["page_number"],
        sentence_order=row["sentence_order"],
        sentence_text=row["sentence_text"],
        token_count=row["token_count"],
        character_count=row["character_count"],
        active_seconds=row["active_seconds"],
        completed_at=row["completed_at"],
    )


def _refresh_vocabulary_progress(connection: sqlite3.Connection, language_code: str, lemma: str) -> None:
    exposure_summary = connection.execute(
        """
        SELECT
            COUNT(*) AS raw_exposures,
            COALESCE(SUM(weight), 0) AS weighted_exposure,
            COUNT(DISTINCT book_id || ':' || page_number) AS unique_pages,
            COUNT(DISTINCT book_id) AS unique_books,
            MIN(occurred_at) AS first_seen_at,
            MAX(occurred_at) AS last_seen_at
        FROM exposure_ledger
        WHERE language_code = ? AND lemma = ?
        """,
        (language_code, lemma),
    ).fetchone()
    if exposure_summary is None or int(exposure_summary["raw_exposures"] or 0) <= 0:
        return

    existing = connection.execute(
        "SELECT manual_override FROM vocabulary_progress WHERE language_code = ? AND lemma = ?",
        (language_code, lemma),
    ).fetchone()
    manual_override = existing["manual_override"] if existing is not None else None
    raw_exposures = int(exposure_summary["raw_exposures"] or 0)
    weighted_exposure = float(exposure_summary["weighted_exposure"] or 0.0)
    state = str(manual_override) if manual_override else (
        "review" if raw_exposures >= 5 else "learning" if raw_exposures >= 2 else "new"
    )
    confidence_score = min(1.0, round(weighted_exposure / 10.0, 3))

    connection.execute(
        """
        INSERT INTO vocabulary_progress (
            language_code,
            lemma,
            raw_exposures,
            weighted_exposure,
            unique_pages,
            unique_books,
            help_requests,
            first_seen_at,
            last_seen_at,
            state,
            confidence_score,
            manual_override
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
        ON CONFLICT(language_code, lemma) DO UPDATE SET
            raw_exposures = excluded.raw_exposures,
            weighted_exposure = excluded.weighted_exposure,
            unique_pages = excluded.unique_pages,
            unique_books = excluded.unique_books,
            first_seen_at = excluded.first_seen_at,
            last_seen_at = excluded.last_seen_at,
            state = excluded.state,
            confidence_score = excluded.confidence_score,
            manual_override = excluded.manual_override
        """,
        (
            language_code,
            lemma,
            raw_exposures,
            weighted_exposure,
            int(exposure_summary["unique_pages"] or 0),
            int(exposure_summary["unique_books"] or 0),
            exposure_summary["first_seen_at"],
            exposure_summary["last_seen_at"],
            state,
            confidence_score,
            manual_override,
        ),
    )


def _record_exposure(
    connection: sqlite3.Connection,
    *,
    language_code: str,
    lemma: str,
    book_id: str,
    page_number: int,
    exposure_type: str,
    weight: float,
    occurred_at: str,
) -> None:
    cursor = connection.execute(
        """
        INSERT OR IGNORE INTO exposure_ledger (
            language_code,
            lemma,
            book_id,
            page_number,
            exposure_type,
            weight,
            occurred_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (language_code, lemma, book_id, page_number, exposure_type, weight, occurred_at),
    )
    if cursor.rowcount:
        _refresh_vocabulary_progress(connection, language_code, lemma)


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


def record_sentence_read(data_root: Path, payload: SentenceReadCreateRequest) -> SentenceReadRecord:
    completed_at = payload.completed_at or _utc_now()
    registry = load_registry(resolve_books_root(data_root) / "registry.json")
    book = registry.get(payload.book_id)
    if book is None:
        raise KeyError(f"Book not found: {payload.book_id}")
    language_code = str(getattr(book, "language_code", None) or "local")

    with _connect(data_root) as connection:
        session_row = connection.execute(
            "SELECT id FROM reading_sessions WHERE id = ? AND book_id = ?",
            (payload.session_id, payload.book_id),
        ).fetchone()
        if session_row is None:
            raise KeyError(f"Reading session not found: {payload.session_id}")

        cursor = connection.execute(
            """
            INSERT INTO sentence_reads (
                session_id,
                book_id,
                page_number,
                sentence_order,
                sentence_text,
                token_count,
                character_count,
                active_seconds,
                completed_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.session_id,
                payload.book_id,
                payload.page_number,
                payload.sentence_order,
                payload.sentence_text,
                payload.token_count,
                payload.character_count,
                payload.active_seconds,
                completed_at,
            ),
        )

        token_count = 0
        character_count = 0
        for token in payload.tokens:
            surface_form = token.surface_form.strip()
            if not surface_form:
                continue

            normalized_form = (token.lemma or surface_form).strip() or surface_form
            token_kind = token.token_kind
            connection.execute(
                """
                INSERT INTO token_exposures (
                    session_id,
                    book_id,
                    page_number,
                    sentence_order,
                    token_kind,
                    surface_form,
                    normalized_form,
                    character_count,
                    active_seconds,
                    occurred_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.session_id,
                    payload.book_id,
                    payload.page_number,
                    payload.sentence_order,
                    token_kind,
                    surface_form,
                    normalized_form,
                    len(surface_form),
                    payload.active_seconds,
                    completed_at,
                ),
            )
            token_count += 1
            _record_exposure(
                connection,
                language_code=language_code,
                lemma=normalized_form,
                book_id=payload.book_id,
                page_number=payload.page_number,
                exposure_type="word_read" if token_kind == "word" else "character_read",
                weight=1.0 if token_kind == "word" else 0.5,
                occurred_at=completed_at,
            )

            if token_kind == "word" and any("\u4e00" <= character <= "\u9fff" for character in surface_form):
                for character in surface_form:
                    if not ("\u4e00" <= character <= "\u9fff"):
                        continue
                    connection.execute(
                        """
                        INSERT INTO token_exposures (
                            session_id,
                            book_id,
                            page_number,
                            sentence_order,
                            token_kind,
                            surface_form,
                            normalized_form,
                            character_count,
                            active_seconds,
                            occurred_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            payload.session_id,
                            payload.book_id,
                            payload.page_number,
                            payload.sentence_order,
                            "character",
                            character,
                            character,
                            1,
                            payload.active_seconds,
                            completed_at,
                        ),
                    )
                    character_count += 1
                    _record_exposure(
                        connection,
                        language_code=language_code,
                        lemma=character,
                        book_id=payload.book_id,
                        page_number=payload.page_number,
                        exposure_type="character_read",
                        weight=0.5,
                        occurred_at=completed_at,
                    )

        connection.commit()
        row = connection.execute(
            """
            SELECT id, session_id, book_id, page_number, sentence_order, sentence_text, token_count, character_count, active_seconds, completed_at
            FROM sentence_reads
            WHERE id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()
        if row is None:
            raise RuntimeError("Failed to record sentence read.")

    return _sentence_read_from_row(row)


def get_learning_profile_summary(data_root: Path) -> LearningProfileSummary:
    db_path = ensure_profile_database(data_root)
    registry = load_registry(resolve_books_root(data_root) / "registry.json")
    track_stats: dict[str, dict[str, object]] = {}

    def ensure_track(track_code: str, language_code: str | None) -> dict[str, object]:
        if track_code not in track_stats:
            definition = _track_definition(track_code)
            track_stats[track_code] = {
                "code": track_code,
                "label": definition["label"],
                "language_code": language_code or definition["language_code"],
                "level": definition["level"],
                "subtitle": definition["subtitle"],
                "note": definition["note"],
                "progress": 0.0,
                "books": 0,
                "page_reads": 0,
                "sentence_reads": 0,
                "word_exposures": 0,
                "character_exposures": 0,
                "unique_words_seen": set(),
                "unique_characters_seen": set(),
                "average_seconds_per_sentence": None,
                "average_seconds_per_word": None,
                "average_seconds_per_character": None,
                "next_step": "",
                "journey": [],
                "total_pages": 0,
                "completed_pages": 0,
                "sentence_seconds": 0,
                "word_seconds": 0,
                "character_seconds": 0,
                "sentence_count": 0,
                "word_count": 0,
                "character_count": 0,
            }
        return track_stats[track_code]

    book_track_codes: dict[str, str] = {}
    for record in registry.values():
        track_code = _normalize_track_code(getattr(record, "language_code", None))
        book_track_codes[record.id] = track_code
        track = ensure_track(track_code, getattr(record, "language_code", None))
        track["books"] = int(track["books"]) + 1
        track["total_pages"] = int(track["total_pages"]) + max(0, int(getattr(record, "total_pages", 0) or 0))

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        reading_sessions = connection.execute("SELECT COUNT(*) AS count FROM reading_sessions").fetchone()["count"]
        page_reads = connection.execute("SELECT COUNT(*) AS count FROM page_reads").fetchone()["count"]
        sentence_reads = connection.execute("SELECT COUNT(*) AS count FROM sentence_reads").fetchone()["count"]
        token_exposures = connection.execute("SELECT COUNT(*) AS count FROM token_exposures").fetchone()["count"]
        word_exposures = connection.execute("SELECT COUNT(*) AS count FROM token_exposures WHERE token_kind = 'word'").fetchone()["count"]
        character_exposures = connection.execute("SELECT COUNT(*) AS count FROM token_exposures WHERE token_kind = 'character'").fetchone()["count"]
        active_books = connection.execute("SELECT COUNT(DISTINCT book_id) AS count FROM reading_sessions").fetchone()["count"]
        unique_words_seen = connection.execute(
            "SELECT COUNT(DISTINCT normalized_form) AS count FROM token_exposures WHERE token_kind = 'word'"
        ).fetchone()["count"]
        unique_characters_seen = connection.execute(
            "SELECT COUNT(DISTINCT normalized_form) AS count FROM token_exposures WHERE token_kind = 'character'"
        ).fetchone()["count"]
        vocabulary_progress_rows = connection.execute("SELECT COUNT(*) AS count FROM vocabulary_progress").fetchone()["count"]
        page_read_rows = connection.execute(
            """
            SELECT book_id, COUNT(*) AS page_read_count, COUNT(DISTINCT page_number) AS completed_pages, SUM(active_seconds) AS active_seconds
            FROM page_reads
            GROUP BY book_id
            """
        ).fetchall()
        sentence_read_rows = connection.execute(
            """
            SELECT book_id, COUNT(*) AS sentence_read_count, SUM(active_seconds) AS active_seconds
            FROM sentence_reads
            GROUP BY book_id
            """
        ).fetchall()
        token_rows = connection.execute(
            """
            SELECT book_id, token_kind, normalized_form, COUNT(*) AS token_count, SUM(active_seconds) AS active_seconds
            FROM token_exposures
            GROUP BY book_id, token_kind, normalized_form
            """
        ).fetchall()
        today_sentence_reads = connection.execute(
            "SELECT COUNT(*) AS count FROM sentence_reads WHERE date(completed_at) = date('now')"
        ).fetchone()["count"]
        today_token_exposures = connection.execute(
            "SELECT COUNT(*) AS count FROM token_exposures WHERE date(occurred_at) = date('now')"
        ).fetchone()["count"]
        sentence_seconds = connection.execute("SELECT COALESCE(SUM(active_seconds), 0) AS value FROM sentence_reads").fetchone()["value"]
        word_seconds = connection.execute(
            "SELECT COALESCE(SUM(active_seconds), 0) AS value FROM token_exposures WHERE token_kind = 'word'"
        ).fetchone()["value"]
        character_seconds = connection.execute(
            "SELECT COALESCE(SUM(active_seconds), 0) AS value FROM token_exposures WHERE token_kind = 'character'"
        ).fetchone()["value"]

    for row in page_read_rows:
        track_code = book_track_codes.get(row["book_id"], "local")
        track = ensure_track(track_code, None)
        track["page_reads"] = int(track["page_reads"]) + int(row["page_read_count"] or 0)
        track["completed_pages"] = int(track["completed_pages"]) + int(row["completed_pages"] or 0)

    for row in sentence_read_rows:
        track_code = book_track_codes.get(row["book_id"], "local")
        track = ensure_track(track_code, None)
        track["sentence_reads"] = int(track["sentence_reads"]) + int(row["sentence_read_count"] or 0)
        track["sentence_seconds"] = int(track["sentence_seconds"]) + int(row["active_seconds"] or 0)
        track["sentence_count"] = int(track["sentence_count"]) + int(row["sentence_read_count"] or 0)

    for row in token_rows:
        track_code = book_track_codes.get(row["book_id"], "local")
        track = ensure_track(track_code, None)
        token_kind = row["token_kind"]
        normalized_form = row["normalized_form"]
        token_count = int(row["token_count"] or 0)
        active_seconds = int(row["active_seconds"] or 0)
        if token_kind == "word":
            track["word_exposures"] = int(track["word_exposures"]) + token_count
            track["word_seconds"] = int(track["word_seconds"]) + active_seconds
            track["word_count"] = int(track["word_count"]) + token_count
            unique_words = track["unique_words_seen"]
            if isinstance(unique_words, set):
                unique_words.add(normalized_form)
        elif token_kind == "character":
            track["character_exposures"] = int(track["character_exposures"]) + token_count
            track["character_seconds"] = int(track["character_seconds"]) + active_seconds
            track["character_count"] = int(track["character_count"]) + token_count
            unique_characters = track["unique_characters_seen"]
            if isinstance(unique_characters, set):
                unique_characters.add(normalized_form)

    learning_tracks: list[LearningTrackSummary] = []
    selected_track_code = "local"
    selected_track_score = (-1.0, -1, -1)
    for track_code in list(TRACK_DEFINITIONS):
        track = ensure_track(track_code, TRACK_DEFINITIONS[track_code]["language_code"])
        progress = _track_progress(track)
        track["progress"] = progress
        track["average_seconds_per_sentence"] = _average(int(track["sentence_seconds"]), int(track["sentence_count"]))
        track["average_seconds_per_word"] = _average(int(track["word_seconds"]), int(track["word_count"]))
        track["average_seconds_per_character"] = _average(int(track["character_seconds"]), int(track["character_count"]))
        track["next_step"] = (
            f"Keep reading the {track['label']} track to grow {track['books']} books worth of exposure."
            if int(track["books"]) > 0
            else f"Add a {track['label']} book to start this track."
        )
        track["journey"] = _track_journey(track)
        learning_tracks.append(
            LearningTrackSummary(
                code=str(track["code"]),
                label=str(track["label"]),
                language_code=str(track["language_code"]),
                level=str(track["level"]),
                subtitle=str(track["subtitle"]),
                note=str(track["note"]),
                progress=progress,
                books=int(track["books"]),
                page_reads=int(track["page_reads"]),
                sentence_reads=int(track["sentence_reads"]),
                word_exposures=int(track["word_exposures"]),
                character_exposures=int(track["character_exposures"]),
                unique_words_seen=len(track["unique_words_seen"]) if isinstance(track["unique_words_seen"], set) else 0,
                unique_characters_seen=len(track["unique_characters_seen"]) if isinstance(track["unique_characters_seen"], set) else 0,
                average_seconds_per_sentence=track["average_seconds_per_sentence"],
                average_seconds_per_word=track["average_seconds_per_word"],
                average_seconds_per_character=track["average_seconds_per_character"],
                next_step=str(track["next_step"]),
                journey=track["journey"],
            )
        )
        track_score = (
            float(progress),
            int(track["page_reads"]),
            int(track["sentence_reads"]),
        )
        if (int(track["books"]) > 0 or int(track["page_reads"]) > 0 or int(track["sentence_reads"]) > 0) and track_score > selected_track_score:
            selected_track_score = track_score
            selected_track_code = str(track["code"])

    return LearningProfileSummary(
        database_path=str(db_path),
        reading_sessions=reading_sessions,
        page_reads=page_reads,
        sentence_reads=sentence_reads,
        token_exposures=token_exposures,
        word_exposures=word_exposures,
        character_exposures=character_exposures,
        active_books=active_books,
        unique_words_seen=unique_words_seen,
        unique_characters_seen=unique_characters_seen,
        vocabulary_progress_rows=vocabulary_progress_rows,
        today_sentence_reads=today_sentence_reads,
        today_token_exposures=today_token_exposures,
        average_seconds_per_sentence=_average(int(sentence_seconds), int(sentence_reads)),
        average_seconds_per_word=_average(int(word_seconds), int(word_exposures)),
        average_seconds_per_character=_average(int(character_seconds), int(character_exposures)),
        selected_track_code=selected_track_code,
        learning_tracks=learning_tracks,
    )
