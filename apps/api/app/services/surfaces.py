from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.books import BookRecord
from app.schemas.surfaces import (
    ActivityEvent,
    ActivitySurfaceResponse,
    AnalysisLexicalEntrySummary,
    BookAnalysisSurfaceResponse,
    ImportRecentBook,
    ImportSurfaceResponse,
    ProgressBookSummary,
    ProgressSurfaceResponse,
    SearchResult,
    SearchSurfaceResponse,
    SettingEntry,
    SettingsSurfaceResponse,
    SettingsUpdateRequest,
    StudyQueueItem,
    StudySurfaceResponse,
)
from app.services.book_registry import load_registry
from app.services.learning_profile import ensure_profile_database, get_learning_profile_summary
from processor.contracts import BookExtractionResult


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _books_root(data_root: Path) -> Path:
    return data_root / "books"


def _book_artifact_path(data_root: Path, book_id: str) -> Path:
    return _books_root(data_root) / book_id / "extractions" / "book-extraction.json"


def _load_book_extraction(data_root: Path, book_id: str) -> BookExtractionResult | None:
    artifact_path = _book_artifact_path(data_root, book_id)
    if not artifact_path.exists():
        return None
    return BookExtractionResult.model_validate_json(artifact_path.read_text(encoding="utf-8"))


def _snippet(text: str, query: str, *, width: int = 140) -> str:
    normalized_text = text.strip()
    if not normalized_text:
        return ""

    haystack = normalized_text.lower()
    needle = query.lower()
    index = haystack.find(needle)
    if index < 0:
        return normalized_text[:width].strip()

    half_width = max(24, width // 2)
    start = max(0, index - half_width)
    end = min(len(normalized_text), index + len(query) + half_width)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(normalized_text) else ""
    return f"{prefix}{normalized_text[start:end].strip()}{suffix}"


def _book_title_map(registry: dict[str, BookRecord]) -> dict[str, str]:
    return {book_id: record.title for book_id, record in registry.items()}


def get_book_analysis_surface(data_root: Path, book_id: str) -> BookAnalysisSurfaceResponse:
    registry = load_registry(_books_root(data_root) / "registry.json")
    try:
        book = registry[book_id]
    except KeyError as exc:
        raise KeyError(f"Book not found: {book_id}") from exc

    extraction = _load_book_extraction(data_root, book_id)
    if extraction is None:
        return BookAnalysisSurfaceResponse(
            book_id=book.id,
            title=book.title,
            author=book.author,
            language_code=book.language_code,
            total_pages=book.total_pages,
            extracted_page_count=book.extracted_page_count,
            sentence_count=0,
            lexical_entry_count=0,
            token_occurrence_count=0,
            has_extraction=False,
            top_lexical_entries=[],
        )

    lexical_entries = sorted(
        extraction.lexical_entries,
        key=lambda entry: (-entry.frequency_in_book, entry.first_page or 10**9, entry.lemma),
    )
    return BookAnalysisSurfaceResponse(
        book_id=book.id,
        title=book.title,
        author=book.author,
        language_code=book.language_code,
        total_pages=book.total_pages,
        extracted_page_count=len(extraction.pages),
        sentence_count=sum(len(page.sentences) for page in extraction.pages),
        lexical_entry_count=len(extraction.lexical_entries),
        token_occurrence_count=len(extraction.token_occurrences),
        has_extraction=True,
        top_lexical_entries=[
            AnalysisLexicalEntrySummary(
                lemma=entry.lemma,
                display_form=entry.display_form,
                frequency_in_book=entry.frequency_in_book,
                first_page=entry.first_page,
                last_page=entry.last_page,
            )
            for entry in lexical_entries[:10]
        ],
    )


def search_surfaces(data_root: Path, query: str, *, limit: int = 20) -> SearchSurfaceResponse:
    normalized_query = query.strip()
    if not normalized_query:
        return SearchSurfaceResponse(query=query, result_count=0, results=[])
    limit = max(0, limit)

    normalized_lower = normalized_query.lower()
    registry = load_registry(_books_root(data_root) / "registry.json")
    title_map = _book_title_map(registry)
    results: list[SearchResult] = []

    for book in registry.values():
        haystack = " ".join(part for part in (book.title, book.author or "", book.source_filename) if part).lower()
        if normalized_lower in haystack:
            score = 100 if normalized_lower in book.title.lower() else 90
            results.append(
                SearchResult(
                    kind="book",
                    book_id=book.id,
                    book_title=book.title,
                    snippet=f"{book.title} - {book.author or 'Unknown author'}",
                    score=score,
                )
            )

    for book_id, book in registry.items():
        extraction = _load_book_extraction(data_root, book_id)
        if extraction is None:
            continue

        for page in extraction.pages:
            for sentence in page.sentences:
                if normalized_lower not in sentence.text.lower():
                    continue
                results.append(
                    SearchResult(
                        kind="sentence",
                        book_id=book_id,
                        book_title=title_map.get(book_id, book.title),
                        page_number=page.page_number,
                        sentence_order=sentence.order,
                        snippet=_snippet(sentence.text, normalized_query),
                        score=80,
                    )
                )

        for lexical_entry in extraction.lexical_entries:
            if normalized_lower not in lexical_entry.lemma.lower() and normalized_lower not in lexical_entry.display_form.lower():
                continue
            results.append(
                SearchResult(
                    kind="lexical_entry",
                    book_id=book_id,
                    book_title=title_map.get(book_id, book.title),
                    lemma=lexical_entry.lemma,
                    surface_form=lexical_entry.display_form,
                    snippet=f"{lexical_entry.display_form} - {book.title}",
                    score=85 + min(10, lexical_entry.frequency_in_book),
                )
            )

    results.sort(key=lambda result: (-result.score, result.book_title or "", result.page_number or 0, result.kind))
    limited_results = results[:limit] if limit else []
    return SearchSurfaceResponse(query=query, result_count=len(limited_results), results=limited_results)


def get_study_surface(data_root: Path, *, language_code: str | None = None, limit: int = 50) -> StudySurfaceResponse:
    limit = max(0, limit)
    db_path = ensure_profile_database(data_root)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT language_code, lemma, raw_exposures, weighted_exposure, unique_pages, unique_books,
                   help_requests, state, confidence_score, manual_override, first_seen_at, last_seen_at
            FROM vocabulary_progress
            WHERE (? IS NULL OR language_code = ?)
            ORDER BY
                CASE state
                    WHEN 'new' THEN 0
                    WHEN 'learning' THEN 1
                    WHEN 'review' THEN 2
                    WHEN 'mastered' THEN 3
                    ELSE 4
                END,
                confidence_score ASC,
                weighted_exposure DESC,
                lemma ASC
            LIMIT ?
            """,
            (language_code, language_code, limit),
        ).fetchall()

    items = [
        StudyQueueItem(
            language_code=row["language_code"],
            lemma=row["lemma"],
            raw_exposures=row["raw_exposures"],
            weighted_exposure=row["weighted_exposure"],
            unique_pages=row["unique_pages"],
            unique_books=row["unique_books"],
            help_requests=row["help_requests"],
            state=row["state"],
            confidence_score=row["confidence_score"],
            manual_override=row["manual_override"],
            first_seen_at=row["first_seen_at"],
            last_seen_at=row["last_seen_at"],
        )
        for row in rows
    ]
    return StudySurfaceResponse(queue_size=len(items), queued_items=items)


def get_progress_surface(data_root: Path) -> ProgressSurfaceResponse:
    profile = get_learning_profile_summary(data_root)
    registry = load_registry(_books_root(data_root) / "registry.json")
    title_map = _book_title_map(registry)
    db_path = ensure_profile_database(data_root)
    aggregate: dict[str, ProgressBookSummary] = {}

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        page_rows = connection.execute(
            """
            SELECT book_id, COUNT(*) AS page_reads, COALESCE(SUM(active_seconds), 0) AS active_seconds
            FROM page_reads
            GROUP BY book_id
            """
        ).fetchall()
        sentence_rows = connection.execute(
            """
            SELECT book_id, COUNT(*) AS sentence_reads, COALESCE(SUM(active_seconds), 0) AS active_seconds
            FROM sentence_reads
            GROUP BY book_id
            """
        ).fetchall()

    for row in page_rows:
        book_id = row["book_id"]
        aggregate[book_id] = ProgressBookSummary(
            book_id=book_id,
            title=title_map.get(book_id, registry[book_id].title if book_id in registry else book_id),
            page_reads=int(row["page_reads"]),
            sentence_reads=0,
            active_seconds=int(row["active_seconds"]),
        )

    for row in sentence_rows:
        book_id = row["book_id"]
        entry = aggregate.setdefault(
            book_id,
            ProgressBookSummary(
                book_id=book_id,
                title=title_map.get(book_id, registry[book_id].title if book_id in registry else book_id),
                page_reads=0,
                sentence_reads=0,
                active_seconds=0,
            ),
        )
        entry.sentence_reads += int(row["sentence_reads"])
        entry.active_seconds += int(row["active_seconds"])

    books = sorted(aggregate.values(), key=lambda item: (-item.active_seconds, item.title))
    return ProgressSurfaceResponse(profile=profile, books=books)


def get_activity_surface(data_root: Path, *, limit: int = 50) -> ActivitySurfaceResponse:
    limit = max(0, limit)
    registry = load_registry(_books_root(data_root) / "registry.json")
    title_map = _book_title_map(registry)
    db_path = ensure_profile_database(data_root)
    events: list[ActivityEvent] = []

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        page_rows = connection.execute(
            """
            SELECT book_id, page_number, active_seconds, completed_at
            FROM page_reads
            ORDER BY completed_at DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        for row in page_rows:
            book_title = title_map.get(row["book_id"], row["book_id"])
            events.append(
                ActivityEvent(
                    kind="page_read",
                    occurred_at=row["completed_at"],
                    book_id=row["book_id"],
                    page_number=row["page_number"],
                    title=book_title,
                    detail=f"Page {row['page_number']} read for {row['active_seconds']}s",
                )
            )

        sentence_rows = connection.execute(
            """
            SELECT book_id, page_number, sentence_order, sentence_text, active_seconds, completed_at
            FROM sentence_reads
            ORDER BY completed_at DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        for row in sentence_rows:
            book_title = title_map.get(row["book_id"], row["book_id"])
            events.append(
                ActivityEvent(
                    kind="sentence_read",
                    occurred_at=row["completed_at"],
                    book_id=row["book_id"],
                    page_number=row["page_number"],
                    sentence_order=row["sentence_order"],
                    title=book_title,
                    detail=_snippet(row["sentence_text"], row["sentence_text"], width=96),
                )
            )

        interaction_rows = connection.execute(
            """
            SELECT book_id, page_number, lemma, interaction_type, occurred_at
            FROM word_interactions
            ORDER BY occurred_at DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        for row in interaction_rows:
            book_title = title_map.get(row["book_id"], row["book_id"])
            events.append(
                ActivityEvent(
                    kind="definition_lookup",
                    occurred_at=row["occurred_at"],
                    book_id=row["book_id"],
                    page_number=row["page_number"],
                    title=book_title,
                    detail=f"{row['lemma']} - {row['interaction_type']}",
                )
            )

        session_rows = connection.execute(
            """
            SELECT book_id, started_at, active_seconds
            FROM reading_sessions
            ORDER BY started_at DESC, id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        for row in session_rows:
            book_title = title_map.get(row["book_id"], row["book_id"])
            events.append(
                ActivityEvent(
                    kind="reading_session",
                    occurred_at=row["started_at"],
                    book_id=row["book_id"],
                    title=book_title,
                    detail=f"Session active for {row['active_seconds']}s",
                )
            )

    events.sort(key=lambda event: event.occurred_at, reverse=True)
    limited_events = events[:limit]
    return ActivitySurfaceResponse(event_count=len(limited_events), events=limited_events)


def get_import_surface(data_root: Path, *, default_language: str = "zh") -> ImportSurfaceResponse:
    registry = load_registry(_books_root(data_root) / "registry.json")
    recent_books = sorted(
        registry.values(),
        key=lambda record: record.processed_at or record.created_at,
        reverse=True,
    )
    return ImportSurfaceResponse(
        default_language=default_language,
        supported_inputs=["pdf", "paste"],
        can_upload_pdf=True,
        can_paste_text=True,
        recent_books=[
            ImportRecentBook(
                book_id=record.id,
                title=record.title,
                status=record.status,
                language_code=record.language_code,
                created_at=record.created_at,
                processed_at=record.processed_at,
            )
            for record in recent_books[:10]
        ],
    )


def load_settings_surface(data_root: Path) -> SettingsSurfaceResponse:
    db_path = ensure_profile_database(data_root)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute("SELECT key, value FROM settings ORDER BY key ASC").fetchall()
    return SettingsSurfaceResponse(entries=[SettingEntry(key=row["key"], value=row["value"]) for row in rows])


def update_settings_surface(data_root: Path, payload: SettingsUpdateRequest) -> SettingsSurfaceResponse:
    db_path = ensure_profile_database(data_root)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        for entry in payload.entries:
            key = entry.key.strip()
            if not key:
                continue
            connection.execute(
                """
                INSERT INTO settings (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = excluded.updated_at
                """,
                (key, entry.value, _utc_now()),
            )
        connection.commit()
    return load_settings_surface(data_root)
