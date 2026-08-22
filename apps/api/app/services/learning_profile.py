from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from app.core.paths import resolve_books_root, resolve_user_data_root
from app.schemas.learning import (
    LearningProfileSummary,
    LearningTrackJourneyStep,
    LearningTrackSummary,
    PageReadCreateRequest,
    PageReadRecord,
    ReadingSessionCreateRequest,
    ReadingSessionRecord,
    SentenceReadCreateRequest,
    SentenceReadRecord,
    StudyVocabularyItemCreateRequest,
    StudyVocabularyItemRecord,
    VocabularyAssessmentReviewRequest,
    VocabularyAssessmentStateRecord,
    WordInteractionCreateRequest,
    WordInteractionRecord,
)
from app.services.book_registry import load_registry
from app.services.hebrew_transliteration import get_hebrew_pronunciation_override
from app.services.lexicon import lookup_lexicon_entry

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
    "trki": {
        "label": "TRKI",
        "language_code": "ru",
        "level": "Russian",
        "subtitle": "Russian reading track",
        "note": "Built from Russian books and learner activity in the local library.",
    },
    "cefr": {
        "label": "CEFR",
        "language_code": "fr",
        "level": "European",
        "subtitle": "European language reading track",
        "note": "Built from European-language books in the local library.",
    },
    "local": {
        "label": "General reading",
        "language_code": "local",
        "level": "Self-directed",
        "subtitle": "General reading and self-directed progress",
        "note": "Mixed or unsupported language reading without a formal exam syllabus.",
    },
}

VOCABULARY_ASSESSMENT_AXIS_ORDER: tuple[str, ...] = (
    "form_to_meaning",
    "form_to_reading",
    "meaning_to_form",
    "reading_to_form",
)

VOCABULARY_ASSESSMENT_AXIS_DEFINITIONS: dict[str, tuple[str, str]] = {
    "form_to_meaning": ("source_form", "meaning"),
    "form_to_reading": ("source_form", "reading"),
    "meaning_to_form": ("meaning", "source_form"),
    "reading_to_form": ("reading", "source_form"),
}

VOCABULARY_ASSESSMENT_STAGE_INTERVALS: dict[int, timedelta] = {
    0: timedelta(0),
    1: timedelta(hours=3),
    2: timedelta(hours=6),
    3: timedelta(hours=12),
    4: timedelta(days=1),
    5: timedelta(days=2),
    6: timedelta(days=4),
    7: timedelta(days=7),
    8: timedelta(days=14),
    9: timedelta(days=30),
    10: timedelta(days=90),
    11: timedelta(days=180),
    12: timedelta(days=365),
}


def _normalize_track_code(language_code: str | None) -> str:
    normalized = (language_code or "").strip().lower()
    if normalized.startswith("zh"):
        return "hsk"
    if normalized.startswith("ja"):
        return "jlpt"
    if normalized.startswith("ko"):
        return "topik"
    if normalized.startswith("ru"):
        return "trki"
    if normalized.startswith(("fr", "en")):
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


def _resolve_study_definition_short(
    data_root: Path,
    *,
    language_code: str,
    candidates: tuple[str, ...],
    owner_id: str | None = None,
) -> str | None:
    normalized_language_code = language_code.strip().lower()
    for candidate in candidates:
        term = candidate.strip()
        if not term:
          continue
        lookup = lookup_lexicon_entry(
            data_root=data_root,
            language_code=normalized_language_code,
            term=term,
            allow_google_fallback=True,
            owner_id=owner_id,
        )
        entry = lookup.entries[0] if lookup.entries else None
        definition = entry.definition.strip() if entry and entry.definition else None
        if definition:
            return definition
    return None


def _parse_utc(value: str | None) -> datetime:
    text = (value or "").strip()
    if not text:
        return datetime.now(timezone.utc)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(timezone.utc)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _utc_from_datetime(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _assessment_axis_definition(axis_key: str) -> tuple[str, str]:
    try:
        return VOCABULARY_ASSESSMENT_AXIS_DEFINITIONS[axis_key]
    except KeyError as exc:
        raise ValueError(f"Unsupported assessment axis: {axis_key}") from exc


def _assessment_stage_interval(stage: int) -> timedelta:
    normalized_stage = max(0, min(12, int(stage)))
    return VOCABULARY_ASSESSMENT_STAGE_INTERVALS[normalized_stage]


def _language_label(language_code: str) -> str:
    normalized = (language_code or "").strip().lower()
    if normalized.startswith("zh"):
        return "Chinese"
    if normalized.startswith("ja"):
        return "Japanese"
    if normalized.startswith("ko"):
        return "Korean"
    if normalized.startswith("ru"):
        return "Russian"
    if normalized.startswith("fr"):
        return "French"
    if normalized.startswith("en"):
        return "English"
    if normalized == "local":
        return "Local"
    return language_code.upper() if language_code else "Unknown"


def get_profile_db_path(data_root: Path, owner_id: str | None = None) -> Path:
    user_root = resolve_user_data_root(data_root)
    if not owner_id:
        return user_root / "profile.sqlite3"
    owner_key = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()[:32]
    return user_root / "accounts" / owner_key / "profile.sqlite3"


def _migration_root() -> Path:
    return Path(__file__).resolve().parents[1] / "db" / "migrations" / "user"


def ensure_profile_database(data_root: Path, owner_id: str | None = None) -> Path:
    db_path = get_profile_db_path(data_root, owner_id)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    migration_root = _migration_root()
    migration_files = sorted(migration_root.glob("*.sql"))
    with sqlite3.connect(db_path) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        for migration_file in migration_files:
            connection.executescript(migration_file.read_text(encoding="utf-8"))
        _ensure_profile_columns(connection)
        connection.commit()

    return db_path


def _ensure_profile_columns(connection: sqlite3.Connection) -> None:
    table_exists = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'vocabulary_progress'",
    ).fetchone()
    if table_exists is None:
        return

    connection.row_factory = sqlite3.Row
    book_progress_table_exists = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'book_progress'",
    ).fetchone()
    if book_progress_table_exists is not None:
        book_progress_columns = {str(row["name"]) for row in connection.execute("PRAGMA table_info(book_progress)").fetchall()}
        if "completion_override" not in book_progress_columns:
            connection.execute("ALTER TABLE book_progress ADD COLUMN completion_override INTEGER NOT NULL DEFAULT 0")
    column_names = {str(row["name"]) for row in connection.execute("PRAGMA table_info(vocabulary_progress)").fetchall()}
    if "mastery_level" not in column_names:
        connection.execute("ALTER TABLE vocabulary_progress ADD COLUMN mastery_level TEXT")
    if "mastery_score" not in column_names:
        connection.execute("ALTER TABLE vocabulary_progress ADD COLUMN mastery_score REAL")
    if "srs_stage" not in column_names:
        connection.execute("ALTER TABLE vocabulary_progress ADD COLUMN srs_stage INTEGER")
    if "next_due_at" not in column_names:
        connection.execute("ALTER TABLE vocabulary_progress ADD COLUMN next_due_at TEXT")


def _connect(data_root: Path, owner_id: str | None = None) -> sqlite3.Connection:
    db_path = ensure_profile_database(data_root, owner_id)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _ensure_vocabulary_progress_row(connection: sqlite3.Connection, language_code: str, lemma: str) -> None:
    existing = connection.execute(
        "SELECT 1 FROM vocabulary_progress WHERE language_code = ? AND lemma = ?",
        (language_code, lemma),
    ).fetchone()
    if existing is not None:
        return
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
            manual_override,
            mastery_level,
            mastery_score,
            srs_stage,
            next_due_at
        )
        VALUES (?, ?, 0, 0, 0, 0, 0, NULL, NULL, 'new', 0, NULL, 'new', 0, 0, NULL)
        """,
        (language_code, lemma),
    )


def _ensure_book_progress_row(connection: sqlite3.Connection, book_id: str) -> None:
    existing = connection.execute(
        "SELECT 1 FROM book_progress WHERE book_id = ?",
        (book_id,),
    ).fetchone()
    if existing is not None:
        return
    connection.execute(
        """
        INSERT INTO book_progress (
            book_id,
            reading_sessions,
            page_reads,
            sentence_reads,
            active_seconds,
            furthest_page,
            resume_page,
            resume_sentence_order,
            total_pages,
            total_sentences,
            progress_percent,
            progress_unit,
            reading_state,
            last_read_at,
            completed_at,
            completion_override
        )
        VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'pages', 'not_read', NULL, NULL, 0)
        """,
        (book_id,),
    )


def _refresh_book_progress(
    connection: sqlite3.Connection,
    *,
    book_id: str,
    total_pages: int,
    total_sentences: int,
    page_by_page: bool,
    reading_sessions: int,
    page_reads: int,
    sentence_reads: int,
    active_seconds: int,
    furthest_page: int,
    resume_page: int,
    resume_sentence_order: int,
    last_read_at: str | None = None,
    completed_at: str | None = None,
) -> None:
    _ensure_book_progress_row(connection, book_id)
    row = connection.execute(
        """
        SELECT reading_sessions, page_reads, sentence_reads, active_seconds, furthest_page,
               resume_page, resume_sentence_order, total_pages, total_sentences,
               progress_percent, progress_unit, reading_state, last_read_at, completed_at,
               completion_override
        FROM book_progress
        WHERE book_id = ?
        """,
        (book_id,),
    ).fetchone()
    if row is None:
        raise RuntimeError(f"Failed to load book progress row for {book_id}.")

    total_pages_value = max(0, int(total_pages))
    total_sentences_value = max(0, int(total_sentences))
    reading_sessions_value = max(0, int(reading_sessions))
    page_reads_value = max(0, int(page_reads))
    sentence_reads_value = max(0, int(sentence_reads))
    active_seconds_value = max(0, int(active_seconds))
    furthest_page_value = max(0, int(furthest_page))
    resume_page_value = max(0, int(resume_page))
    resume_sentence_order_value = max(0, int(resume_sentence_order))
    progress_unit = "pages" if total_pages_value > 1 else "sentences"
    if progress_unit == "pages":
        numerator = furthest_page_value
        denominator = total_pages_value
    else:
        numerator = sentence_reads_value
        denominator = total_sentences_value
    progress_percent = min(100, round((numerator / denominator) * 100)) if denominator > 0 else 0
    completion_override_value = int(row["completion_override"] or 0) if page_by_page else 0
    if page_reads_value <= 0 and sentence_reads_value <= 0 and not completion_override_value:
        reading_state = "not_read"
    elif completion_override_value or (progress_percent >= 100 and not page_by_page):
        reading_state = "finished"
    else:
        reading_state = "in_progress"
    existing_completed_at = str(row["completed_at"]) if row["completed_at"] else None
    existing_last_read_at = str(row["last_read_at"]) if row["last_read_at"] else None
    latest_read_at = last_read_at or existing_last_read_at
    completed_value = existing_completed_at if (not page_by_page or completion_override_value) else None
    if reading_state == "finished":
        completed_value = completed_value or last_read_at or existing_last_read_at

    connection.execute(
        """
        INSERT INTO book_progress (
            book_id,
            reading_sessions,
            page_reads,
            sentence_reads,
            active_seconds,
            furthest_page,
            resume_page,
            resume_sentence_order,
            total_pages,
            total_sentences,
            progress_percent,
            progress_unit,
            reading_state,
            last_read_at,
            completed_at,
            completion_override
        )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(book_id) DO UPDATE SET
            reading_sessions = excluded.reading_sessions,
            page_reads = excluded.page_reads,
            sentence_reads = excluded.sentence_reads,
            active_seconds = excluded.active_seconds,
            furthest_page = excluded.furthest_page,
            resume_page = excluded.resume_page,
            resume_sentence_order = excluded.resume_sentence_order,
            total_pages = excluded.total_pages,
            total_sentences = excluded.total_sentences,
            progress_percent = excluded.progress_percent,
            progress_unit = excluded.progress_unit,
            reading_state = excluded.reading_state,
            last_read_at = excluded.last_read_at,
            completed_at = excluded.completed_at,
            completion_override = excluded.completion_override
        """,
        (
            book_id,
            reading_sessions_value,
            page_reads_value,
            sentence_reads_value,
            active_seconds_value,
            furthest_page_value,
            resume_page_value,
            resume_sentence_order_value,
            total_pages_value,
            total_sentences_value,
            progress_percent,
            progress_unit,
            reading_state,
            latest_read_at,
            completed_value,
            completion_override_value,
        ),
    )


def set_page_by_page_completion(
    data_root: Path,
    book_id: str,
    *,
    finished: bool,
    owner_id: str | None = None,
) -> None:
    registry = load_registry(resolve_books_root(data_root) / "registry.json")
    book = registry.get(book_id)
    if book is None:
        raise KeyError(f"Book not found: {book_id}")
    if getattr(book, "source_type", "static") != "page-by-page":
        raise ValueError("Only page-by-page books support explicit completion.")

    with _connect(data_root, owner_id) as connection:
        _ensure_book_progress_row(connection, book_id)
        row = connection.execute(
            "SELECT page_reads, sentence_reads FROM book_progress WHERE book_id = ?",
            (book_id,),
        ).fetchone()
        if row is None:
            raise RuntimeError(f"Failed to load book progress row for {book_id}.")

        if finished:
            connection.execute(
                """
                UPDATE book_progress
                SET reading_state = 'finished', completion_override = 1, completed_at = ?
                WHERE book_id = ?
                """,
                (_utc_now(), book_id),
            )
        else:
            reading_state = "in_progress" if int(row["page_reads"] or 0) > 0 or int(row["sentence_reads"] or 0) > 0 else "not_read"
            connection.execute(
                """
                UPDATE book_progress
                SET reading_state = ?, completion_override = 0, completed_at = NULL
                WHERE book_id = ?
                """,
                (reading_state, book_id),
            )
        connection.commit()


def _book_progress_totals(data_root: Path, book_id: str) -> tuple[int, int, bool]:
    registry = load_registry(resolve_books_root(data_root) / "registry.json")
    record = registry.get(book_id)
    if record is None:
        return 0, 0, False
    return (
        max(0, int(getattr(record, "total_pages", 0) or 0)),
        max(0, int(getattr(record, "total_sentences", 0) or 0)),
        getattr(record, "source_type", "static") == "page-by-page",
    )


def _ensure_vocabulary_assessment_axes(connection: sqlite3.Connection, language_code: str, lemma: str) -> None:
    table_exists = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'vocabulary_assessment_axes'",
    ).fetchone()
    if table_exists is None:
        return

    _ensure_vocabulary_progress_row(connection, language_code, lemma)
    existing_rows = connection.execute(
        """
        SELECT axis_key
        FROM vocabulary_assessment_axes
        WHERE language_code = ? AND lemma = ?
        """,
        (language_code, lemma),
    ).fetchall()
    existing_keys = {str(row["axis_key"]) for row in existing_rows if row["axis_key"]}
    now = _utc_now()
    for axis_key in VOCABULARY_ASSESSMENT_AXIS_ORDER:
        if axis_key in existing_keys:
            continue
        prompt_type, response_type = _assessment_axis_definition(axis_key)
        connection.execute(
            """
            INSERT INTO vocabulary_assessment_axes (
                language_code,
                lemma,
                axis_key,
                prompt_type,
                response_type,
                stage,
                due_at,
                last_seen_at,
                last_result,
                pass_count,
                fail_count
            )
            VALUES (?, ?, ?, ?, ?, 0, ?, NULL, NULL, 0, 0)
            """,
            (language_code, lemma, axis_key, prompt_type, response_type, now),
        )


def _assessment_axis_rows(connection: sqlite3.Connection, language_code: str, lemma: str) -> list[sqlite3.Row]:
    table_exists = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'vocabulary_assessment_axes'",
    ).fetchone()
    if table_exists is None:
        return []

    return connection.execute(
        """
        SELECT language_code, lemma, axis_key, prompt_type, response_type, stage, due_at,
               last_seen_at, last_result, pass_count, fail_count
        FROM vocabulary_assessment_axes
        WHERE language_code = ? AND lemma = ?
        ORDER BY CASE axis_key
            WHEN 'form_to_meaning' THEN 0
            WHEN 'form_to_reading' THEN 1
            WHEN 'meaning_to_form' THEN 2
            WHEN 'reading_to_form' THEN 3
            ELSE 4
        END
        """,
        (language_code, lemma),
    ).fetchall()


def _refresh_assessment_progress(connection: sqlite3.Connection, language_code: str, lemma: str) -> None:
    rows = _assessment_axis_rows(connection, language_code, lemma)
    if not rows:
        return

    _ensure_vocabulary_progress_row(connection, language_code, lemma)
    stages = [max(0, min(12, int(row["stage"] or 0))) for row in rows]
    weakest_stage = min(stages)
    strongest_stage = max(stages)
    average_stage = sum(stages) / max(1, len(stages))
    due_dates = [
        _parse_utc(str(row["due_at"]))
        for row in rows
        if row["due_at"]
    ]
    next_due_at = _utc_from_datetime(min(due_dates)) if due_dates else None
    if weakest_stage == 0 and strongest_stage == 0:
        mastery_level = "new"
    elif weakest_stage < 3:
        mastery_level = "learning"
    elif weakest_stage < 9:
        mastery_level = "review"
    else:
        mastery_level = "mastered"

    connection.execute(
        """
        UPDATE vocabulary_progress
        SET mastery_level = ?,
            mastery_score = ?,
            srs_stage = ?,
            next_due_at = ?
        WHERE language_code = ? AND lemma = ?
        """,
        (mastery_level, round(average_stage / 12.0, 3), weakest_stage, next_due_at, language_code, lemma),
    )


def _summarize_assessment_state(
    connection: sqlite3.Connection,
    language_code: str,
    lemma: str,
) -> dict[str, object]:
    rows = _assessment_axis_rows(connection, language_code, lemma)
    if not rows:
        return {
            "language_code": language_code,
            "lemma": lemma,
            "mastery_level": "new",
            "mastery_score": 0.0,
            "srs_stage": 0,
            "next_due_at": None,
            "stage_zero_complete": False,
            "axes": [],
        }

    axes = [
        {
            "language_code": str(row["language_code"]),
            "lemma": str(row["lemma"]),
            "axis_key": str(row["axis_key"]),
            "prompt_type": str(row["prompt_type"]),
            "response_type": str(row["response_type"]),
            "stage": int(row["stage"] or 0),
            "due_at": str(row["due_at"]) if row["due_at"] else None,
            "last_seen_at": str(row["last_seen_at"]) if row["last_seen_at"] else None,
            "last_result": str(row["last_result"]) if row["last_result"] else None,
            "pass_count": int(row["pass_count"] or 0),
            "fail_count": int(row["fail_count"] or 0),
        }
        for row in rows
    ]
    stages = [axis["stage"] for axis in axes]
    weakest_stage = min(stages)
    strongest_stage = max(stages)
    average_stage = sum(stages) / max(1, len(stages))
    due_dates = [_parse_utc(axis["due_at"]) for axis in axes if axis["due_at"]]
    next_due_at = _utc_from_datetime(min(due_dates)) if due_dates else None
    if weakest_stage == 0 and strongest_stage == 0:
        mastery_level = "new"
    elif weakest_stage < 3:
        mastery_level = "learning"
    elif weakest_stage < 9:
        mastery_level = "review"
    else:
        mastery_level = "mastered"

    return {
        "language_code": language_code,
        "lemma": lemma,
        "mastery_level": mastery_level,
        "mastery_score": round(average_stage / 12.0, 3),
        "srs_stage": weakest_stage,
        "next_due_at": next_due_at,
        "stage_zero_complete": weakest_stage >= 1,
        "axes": axes,
    }


def _apply_assessment_review(
    connection: sqlite3.Connection,
    *,
    language_code: str,
    lemma: str,
    axis_key: str,
    result: str,
    occurred_at: str,
) -> dict[str, object]:
    _ensure_vocabulary_assessment_axes(connection, language_code, lemma)
    prompt_type, response_type = _assessment_axis_definition(axis_key)
    row = connection.execute(
        """
        SELECT stage, due_at, pass_count, fail_count
        FROM vocabulary_assessment_axes
        WHERE language_code = ? AND lemma = ? AND axis_key = ?
        """,
        (language_code, lemma, axis_key),
    ).fetchone()
    if row is None:
        raise KeyError(f"Assessment axis not found: {axis_key}")

    stage = max(0, min(12, int(row["stage"] or 0)))
    pass_count = int(row["pass_count"] or 0)
    fail_count = int(row["fail_count"] or 0)
    normalized_result = result.strip().lower()
    review_time = _parse_utc(occurred_at)
    if normalized_result == "correct":
        pass_count += 1
        stage = min(12, stage + 1)
        due_at = _utc_from_datetime(review_time + _assessment_stage_interval(stage))
    elif normalized_result == "incorrect":
        fail_count += 1
        stage = max(1, stage - 1) if stage > 0 else 0
        due_at = _utc_from_datetime(review_time + _assessment_stage_interval(stage))
    elif normalized_result in {"wrong_axis", "retry"}:
        due_at = str(row["due_at"]) if row["due_at"] else None
    else:
        raise ValueError(f"Unsupported assessment result: {result}")

    connection.execute(
        """
        UPDATE vocabulary_assessment_axes
        SET prompt_type = ?,
            response_type = ?,
            stage = ?,
            due_at = ?,
            last_seen_at = ?,
            last_result = ?,
            pass_count = ?,
            fail_count = ?
        WHERE language_code = ? AND lemma = ? AND axis_key = ?
        """,
        (
            prompt_type,
            response_type,
            stage,
            due_at,
            occurred_at,
            normalized_result,
            pass_count,
            fail_count,
            language_code,
            lemma,
            axis_key,
        ),
    )
    _refresh_assessment_progress(connection, language_code, lemma)
    return _summarize_assessment_state(connection, language_code, lemma)


def _queue_learning_event(
    connection: sqlite3.Connection,
    *,
    event_id: str,
    event_type: str,
    book_id: str,
    occurred_at: str,
    payload: dict[str, object],
) -> None:
    connection.execute(
        """
        INSERT OR IGNORE INTO learning_event_outbox (
            event_id, idempotency_key, event_type, book_id, occurred_at, payload
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (event_id, event_id, event_type, book_id, occurred_at, json.dumps(payload, ensure_ascii=False, sort_keys=True)),
    )
    connection.execute(
        """
        INSERT OR IGNORE INTO learning_event_receipts (event_id, received_at)
        VALUES (?, ?)
        """,
        (event_id, occurred_at),
    )
    connection.execute(
        """
        INSERT OR IGNORE INTO learning_event_reconciliation (
            event_id, status, last_checked_at
        ) VALUES (?, 'queued', ?)
        """,
        (event_id, occurred_at),
    )


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


def record_study_vocabulary_item(
    data_root: Path,
    payload: StudyVocabularyItemCreateRequest,
    *,
    owner_id: str | None = None,
) -> StudyVocabularyItemRecord:
    saved_at = payload.first_seen_at or _utc_now()
    language_code = payload.language_code.strip().lower() or "local"
    lemma = payload.lemma.strip()
    display_form = payload.display_form.strip() or lemma
    source_surface_form = payload.source_surface_form.strip() or display_form
    source_sentence_text = payload.source_sentence_text.strip()
    pronunciation = payload.pronunciation
    romanization = payload.romanization
    if language_code.split("-", 1)[0] == "he":
        reviewed_reading = get_hebrew_pronunciation_override(source_surface_form)
        if reviewed_reading:
            pronunciation = reviewed_reading
            romanization = reviewed_reading
    definition_short = (
        payload.definition_short.strip()
        if payload.definition_short and payload.definition_short.strip()
        else _resolve_study_definition_short(
            data_root,
            language_code=language_code,
            candidates=(source_surface_form, display_form, lemma),
            owner_id=owner_id,
        )
    )

    with _connect(data_root, owner_id) as connection:
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
                definition_short = COALESCE(excluded.definition_short, study_vocabulary_items.definition_short),
                proficiency_level = excluded.proficiency_level,
                click_count = study_vocabulary_items.click_count + 1,
                first_seen_at = COALESCE(study_vocabulary_items.first_seen_at, excluded.first_seen_at),
                last_seen_at = excluded.last_seen_at
            """,
            (
                language_code,
                lemma,
                display_form,
                payload.book_id,
                payload.page_number,
                payload.sentence_order,
                payload.token_order,
                source_surface_form,
                source_sentence_text,
                pronunciation,
                romanization,
                definition_short,
                payload.proficiency_level,
                saved_at,
                saved_at,
            ),
        )
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
                payload.book_id,
                payload.page_number,
                language_code,
                lemma,
                "study_saved",
                saved_at,
            ),
        )
        _queue_learning_event(
            connection,
            event_id=f"study-vocabulary-item:{uuid4().hex}",
            event_type="study_vocabulary_item",
            book_id=payload.book_id,
            occurred_at=saved_at,
            payload={
                "book_id": payload.book_id,
                "language_code": language_code,
                "lemma": lemma,
                "display_form": display_form,
                "page_number": payload.page_number,
                "sentence_order": payload.sentence_order,
                "token_order": payload.token_order,
                "source_surface_form": source_surface_form,
                "source_sentence_text": source_sentence_text,
                "pronunciation": pronunciation,
                "romanization": romanization,
                "definition_short": definition_short,
                "proficiency_level": payload.proficiency_level,
                "first_seen_at": saved_at,
                "last_seen_at": saved_at,
            },
        )
        _ensure_vocabulary_assessment_axes(connection, language_code, lemma)
        _refresh_assessment_progress(connection, language_code, lemma)
        connection.commit()
        row = connection.execute(
            """
            SELECT language_code, lemma, display_form, source_book_id, source_page_number, source_sentence_order,
                   source_token_order, source_surface_form, source_sentence_text, pronunciation, romanization,
                   definition_short, proficiency_level, click_count, first_seen_at, last_seen_at
            FROM study_vocabulary_items
            WHERE language_code = ? AND lemma = ?
            """,
            (language_code, lemma),
        ).fetchone()
        if row is None:
            raise RuntimeError("Failed to record study vocabulary item.")
        row_data = dict(row)

    return StudyVocabularyItemRecord(
        language_code=row_data["language_code"],
        lemma=row_data["lemma"],
        display_form=row_data["display_form"],
        source_book_id=row_data["source_book_id"],
        source_page_number=row_data["source_page_number"],
        source_sentence_order=row_data["source_sentence_order"],
        source_token_order=row_data["source_token_order"],
        source_surface_form=row_data["source_surface_form"],
        source_sentence_text=row_data["source_sentence_text"],
        pronunciation=row_data["pronunciation"],
        romanization=row_data["romanization"],
        definition_short=row_data["definition_short"],
        proficiency_level=row_data["proficiency_level"],
        click_count=row_data["click_count"],
        first_seen_at=row_data["first_seen_at"],
        last_seen_at=row_data["last_seen_at"],
    )


def record_word_interaction(
    data_root: Path,
    payload: WordInteractionCreateRequest,
    *,
    owner_id: str | None = None,
) -> WordInteractionRecord:
    occurred_at = payload.occurred_at or _utc_now()
    language_code = payload.language_code.strip().lower() or "local"
    target_text = payload.target_text.strip()
    if not target_text:
        raise ValueError("Target text is required.")

    with _connect(data_root, owner_id) as connection:
        cursor = connection.execute(
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
                payload.book_id,
                payload.page_number,
                language_code,
                target_text,
                payload.interaction_type,
                occurred_at,
            ),
        )
        _queue_learning_event(
            connection,
            event_id=f"word-interaction:{uuid4().hex}",
            event_type="word_interaction",
            book_id=payload.book_id,
            occurred_at=occurred_at,
            payload={
                "book_id": payload.book_id,
                "page_number": payload.page_number,
                "language_code": language_code,
                "target_text": target_text,
                "interaction_type": payload.interaction_type,
                "occurred_at": occurred_at,
            },
        )
        connection.commit()
        row = connection.execute(
            """
            SELECT id, book_id, page_number, language_code, lemma, interaction_type, occurred_at
            FROM word_interactions
            WHERE id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()
        if row is None:
            raise RuntimeError("Failed to record word interaction.")

    return WordInteractionRecord(
        id=row["id"],
        book_id=row["book_id"],
        page_number=row["page_number"],
        language_code=row["language_code"],
        target_text=row["lemma"],
        interaction_type=row["interaction_type"],
        occurred_at=row["occurred_at"],
    )


def record_vocabulary_assessment_review(
    data_root: Path,
    payload: VocabularyAssessmentReviewRequest,
    *,
    owner_id: str | None = None,
) -> VocabularyAssessmentStateRecord:
    occurred_at = payload.occurred_at or _utc_now()
    language_code = payload.language_code.strip().lower() or "local"
    lemma = payload.lemma.strip()
    if not lemma:
        raise ValueError("Lemma is required.")

    with _connect(data_root, owner_id) as connection:
        state = _apply_assessment_review(
            connection,
            language_code=language_code,
            lemma=lemma,
            axis_key=payload.axis_key,
            result=payload.result,
            occurred_at=occurred_at,
        )
        connection.commit()

    return VocabularyAssessmentStateRecord.model_validate(state)


def create_reading_session(
    data_root: Path,
    payload: ReadingSessionCreateRequest,
    *,
    owner_id: str | None = None,
) -> ReadingSessionRecord:
    started_at = payload.started_at or _utc_now()
    session_id = f"session-{uuid4().hex}"
    total_pages, total_sentences, page_by_page = _book_progress_totals(data_root, payload.book_id)
    with _connect(data_root, owner_id) as connection:
        connection.execute(
            """
            INSERT INTO reading_sessions (id, book_id, started_at, ended_at, active_seconds)
            VALUES (?, ?, ?, NULL, 0)
            """,
            (session_id, payload.book_id, started_at),
        )
        _queue_learning_event(
            connection,
            event_id=f"reading-session:{session_id}",
            event_type="reading_session",
            book_id=payload.book_id,
            occurred_at=started_at,
            payload={
                "session_id": session_id,
                "book_id": payload.book_id,
                "started_at": started_at,
                "ended_at": None,
                "active_seconds": 0,
            },
        )
        reading_sessions = connection.execute(
            "SELECT COUNT(*) AS count FROM reading_sessions WHERE book_id = ?",
            (payload.book_id,),
        ).fetchone()["count"]
        _refresh_book_progress(
            connection,
            book_id=payload.book_id,
            total_pages=total_pages,
            total_sentences=total_sentences,
            page_by_page=page_by_page,
            reading_sessions=int(reading_sessions or 0),
            page_reads=0,
            sentence_reads=0,
            active_seconds=0,
            furthest_page=0,
            resume_page=0,
            resume_sentence_order=0,
        )
        connection.commit()
    return ReadingSessionRecord(
        id=session_id,
        book_id=payload.book_id,
        started_at=started_at,
        ended_at=None,
        active_seconds=0,
    )


def record_page_read(
    data_root: Path,
    payload: PageReadCreateRequest,
    *,
    owner_id: str | None = None,
) -> PageReadRecord:
    completed_at = _utc_now()
    estimated_seconds = max(payload.active_seconds, 30)
    completion_ratio = 0.0 if estimated_seconds <= 0 else min(payload.active_seconds / estimated_seconds, 1.0)
    counted_as_read = int(payload.active_seconds >= 15 or completion_ratio >= 0.75)
    total_pages, total_sentences, page_by_page = _book_progress_totals(data_root, payload.book_id)

    with _connect(data_root, owner_id) as connection:
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
        reading_sessions = connection.execute(
            "SELECT COUNT(*) AS count FROM reading_sessions WHERE book_id = ?",
            (payload.book_id,),
        ).fetchone()["count"]
        page_row = connection.execute(
            """
            SELECT COUNT(*) AS page_reads,
                   COALESCE(SUM(active_seconds), 0) AS active_seconds,
                   MAX(page_number) AS furthest_page,
                   MAX(completed_at) AS last_read_at
            FROM page_reads
            WHERE book_id = ?
            """,
            (payload.book_id,),
        ).fetchone()
        sentence_row = connection.execute(
            """
            SELECT COUNT(*) AS sentence_reads,
                   COALESCE(SUM(active_seconds), 0) AS active_seconds
            FROM sentence_reads
            WHERE book_id = ?
            """,
            (payload.book_id,),
        ).fetchone()
        _refresh_book_progress(
            connection,
            book_id=payload.book_id,
            total_pages=total_pages,
            total_sentences=total_sentences,
            page_by_page=page_by_page,
            reading_sessions=int(reading_sessions or 0),
            page_reads=int(page_row["page_reads"] or 0),
            sentence_reads=int(sentence_row["sentence_reads"] or 0),
            active_seconds=int(page_row["active_seconds"] or 0) + int(sentence_row["active_seconds"] or 0),
            furthest_page=int(page_row["furthest_page"] or 0),
            resume_page=payload.page_number,
            resume_sentence_order=1,
            last_read_at=str(row["completed_at"]),
        )
        _queue_learning_event(
            connection,
            event_id=f"page-read:{uuid4().hex}",
            event_type="page_read",
            book_id=payload.book_id,
            occurred_at=row["completed_at"],
            payload={
                "session_id": row["session_id"],
                "book_id": row["book_id"],
                "page_number": row["page_number"],
                "active_seconds": row["active_seconds"],
                "estimated_seconds": row["estimated_seconds"],
                "completion_ratio": row["completion_ratio"],
                "counted_as_read": bool(row["counted_as_read"]),
                "completed_at": row["completed_at"],
            },
        )
        connection.commit()
    return _page_read_from_row(row)


def record_sentence_read(
    data_root: Path,
    payload: SentenceReadCreateRequest,
    *,
    owner_id: str | None = None,
) -> SentenceReadRecord:
    completed_at = payload.completed_at or _utc_now()
    registry = load_registry(resolve_books_root(data_root) / "registry.json")
    book = registry.get(payload.book_id)
    if book is None:
        raise KeyError(f"Book not found: {payload.book_id}")
    language_code = str(getattr(book, "language_code", None) or "local")
    total_pages, total_sentences, page_by_page = _book_progress_totals(data_root, payload.book_id)

    with _connect(data_root, owner_id) as connection:
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
        reading_sessions = connection.execute(
            "SELECT COUNT(*) AS count FROM reading_sessions WHERE book_id = ?",
            (payload.book_id,),
        ).fetchone()["count"]
        page_row = connection.execute(
            """
            SELECT COUNT(*) AS page_reads,
                   COALESCE(SUM(active_seconds), 0) AS active_seconds,
                   MAX(page_number) AS furthest_page,
                   MAX(completed_at) AS last_read_at
            FROM page_reads
            WHERE book_id = ?
            """,
            (payload.book_id,),
        ).fetchone()
        sentence_row = connection.execute(
            """
            SELECT COUNT(*) AS sentence_reads,
                   COUNT(DISTINCT CAST(page_number AS TEXT) || ':' || CAST(sentence_order AS TEXT)) AS distinct_sentence_reads,
                   COALESCE(SUM(active_seconds), 0) AS active_seconds
            FROM sentence_reads
            WHERE book_id = ?
            """,
            (payload.book_id,),
        ).fetchone()
        _refresh_book_progress(
            connection,
            book_id=payload.book_id,
            total_pages=total_pages,
            total_sentences=total_sentences,
            page_by_page=page_by_page,
            reading_sessions=int(reading_sessions or 0),
            page_reads=int(page_row["page_reads"] or 0),
            sentence_reads=int(sentence_row["distinct_sentence_reads"] or 0),
            active_seconds=int(page_row["active_seconds"] or 0) + int(sentence_row["active_seconds"] or 0),
            furthest_page=int(page_row["furthest_page"] or 0),
            resume_page=payload.page_number,
            resume_sentence_order=payload.sentence_order,
            last_read_at=completed_at,
        )
        _queue_learning_event(
            connection,
            event_id=f"sentence-read:{uuid4().hex}",
            event_type="sentence_read",
            book_id=payload.book_id,
            occurred_at=row["completed_at"],
            payload={
                "session_id": row["session_id"],
                "book_id": row["book_id"],
                "page_number": row["page_number"],
                "sentence_order": row["sentence_order"],
                "sentence_text": row["sentence_text"],
                "token_count": row["token_count"],
                "character_count": row["character_count"],
                "active_seconds": row["active_seconds"],
                "completed_at": row["completed_at"],
                "language_code": language_code,
                "tokens": [token.model_dump() for token in payload.tokens],
            },
        )
        connection.commit()

    return _sentence_read_from_row(row)


def get_learning_profile_summary(
    data_root: Path,
    *,
    owner_id: str | None = None,
) -> LearningProfileSummary:
    db_path = ensure_profile_database(data_root, owner_id)
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
        session_seconds = connection.execute(
            "SELECT COALESCE(SUM(active_seconds), 0) AS value FROM reading_sessions"
        ).fetchone()["value"]
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
        glossed_vocabulary_items = connection.execute("SELECT COUNT(*) AS count FROM study_vocabulary_items").fetchone()["count"]
        remembered_word_interactions = connection.execute(
            "SELECT COUNT(*) AS count FROM word_interactions WHERE interaction_type = 'definition_lookup_remembered'"
        ).fetchone()["count"]
        missed_word_interactions = connection.execute(
            "SELECT COUNT(*) AS count FROM word_interactions WHERE interaction_type = 'definition_lookup_missed'"
        ).fetchone()["count"]
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
        glossed_vocabulary_items=glossed_vocabulary_items,
        remembered_word_interactions=remembered_word_interactions,
        missed_word_interactions=missed_word_interactions,
        today_sentence_reads=today_sentence_reads,
        today_token_exposures=today_token_exposures,
        average_seconds_per_session=_average(int(session_seconds), int(reading_sessions)),
        average_seconds_per_sentence=_average(int(sentence_seconds), int(sentence_reads)),
        average_seconds_per_word=_average(int(word_seconds), int(word_exposures)),
        average_seconds_per_character=_average(int(character_seconds), int(character_exposures)),
        selected_track_code=selected_track_code,
        learning_tracks=learning_tracks,
    )
