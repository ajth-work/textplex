from __future__ import annotations

import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from app.schemas.books import BookRecord
from app.schemas.surfaces import (
    ActivityEvent,
    ActivitySurfaceResponse,
    ReadingHistoryPoint,
    AnalysisSeriesPoint,
    AnalysisLexicalEntrySummary,
    BookAnalysisSurfaceResponse,
    ImportRecentBook,
    ImportSurfaceResponse,
    ProgressBookSummary,
    ProgressSurfaceResponse,
    ProfileSurfaceResponse,
    SearchResult,
    SearchSurfaceResponse,
    SettingEntry,
    SettingsSurfaceResponse,
    SettingsUpdateRequest,
    StudyQueueItem,
    StudySurfaceResponse,
    StudyVocabularyGroup,
    StudyVocabularyItem,
)
from app.services.book_registry import load_registry
from app.services.book_extraction import recover_book_extraction_result
from app.services.learning_profile import ensure_profile_database, get_learning_profile_summary
from app.services.lexicon import lookup_lexicon_hsk_levels_map
from app.services.study_programs import build_study_program_groups
from app.core.paths import resolve_books_root
from processor import calculate_book_hsk_metrics, calculate_hsk_series, is_hanzi
from processor.contracts import BookExtractionResult


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _books_root(data_root: Path) -> Path:
    return resolve_books_root(data_root)


def _book_artifact_path(data_root: Path, book_id: str) -> Path:
    return _books_root(data_root) / book_id / "extractions" / "book-extraction.json"


def _load_book_extraction(data_root: Path, book_id: str) -> BookExtractionResult | None:
    artifact_path = _book_artifact_path(data_root, book_id)
    if not artifact_path.exists():
        return None
    raw_extraction = artifact_path.read_text(encoding="utf-8")
    if not raw_extraction.strip():
        return None
    try:
        extraction = BookExtractionResult.model_validate_json(raw_extraction)
    except ValueError:
        return None
    recovered = recover_book_extraction_result(extraction, data_root=_books_root(data_root))
    if recovered is not extraction:
        artifact_path.write_text(recovered.model_dump_json(indent=2), encoding="utf-8")
        return recovered
    return extraction


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


def _language_label(language_code: str) -> str:
    normalized = (language_code or "").strip().lower()
    if normalized.startswith("zh"):
        return "Chinese"
    if normalized.startswith("ja"):
        return "Japanese"
    if normalized.startswith("ko"):
        return "Korean"
    if normalized.startswith("fr"):
        return "French"
    if normalized.startswith("en"):
        return "English"
    if normalized == "local":
        return "Local"
    return language_code.upper() if language_code else "Unknown"


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
            extraction_progress_percent=round(book.extracted_page_count / book.total_pages * 100) if book.total_pages else 0,
            metrics={
                "metric_status": "pending",
                "recommendation": "Analysis metrics will appear after extraction completes.",
            },
            sentence_hsk_series=[],
            page_hsk_series=[],
            top_lexical_entries=[],
        )

    characters = {
        character
        for page in extraction.pages
        for sentence in page.sentences
        for token in sentence.tokens
        for character in token.surface_form
        if is_hanzi(character)
    }
    character_levels = lookup_lexicon_hsk_levels_map(
        data_root=data_root,
        language_code=book.language_code,
        characters=characters,
    )
    metrics = calculate_book_hsk_metrics(extraction, character_levels)
    hsk_series = calculate_hsk_series(extraction, character_levels)
    extracted_page_count = len(extraction.pages)
    extraction_progress_percent = round(extracted_page_count / book.total_pages * 100) if book.total_pages else 0

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
        extraction_progress_percent=extraction_progress_percent,
        metrics=metrics,
        sentence_hsk_series=[AnalysisSeriesPoint.model_validate(point) for point in hsk_series["sentence_series"]],
        page_hsk_series=[AnalysisSeriesPoint.model_validate(point) for point in hsk_series["page_series"]],
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


def get_study_surface(
    data_root: Path,
    *,
    language_code: str | None = None,
    limit: int = 50,
    owner_id: str | None = None,
) -> StudySurfaceResponse:
    limit = max(0, limit)
    registry = load_registry(_books_root(data_root) / "registry.json")
    title_map = _book_title_map(registry)
    db_path = ensure_profile_database(data_root, owner_id)
    study_programs = build_study_program_groups(data_root, language_code=language_code)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT language_code, lemma, raw_exposures, weighted_exposure, unique_pages, unique_books,
                   help_requests, state, confidence_score, next_due_at, manual_override, first_seen_at, last_seen_at
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
        study_rows = connection.execute(
            """
            SELECT language_code, lemma, display_form, source_book_id, source_page_number, source_sentence_order,
                   source_token_order, source_surface_form, source_sentence_text, pronunciation, romanization,
                   definition_short, proficiency_level, click_count, first_seen_at, last_seen_at
            FROM study_vocabulary_items
            WHERE (? IS NULL OR language_code = ?)
            ORDER BY language_code ASC, last_seen_at DESC, click_count DESC, lemma ASC
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
            next_due_at=row["next_due_at"],
            manual_override=row["manual_override"],
            first_seen_at=row["first_seen_at"],
            last_seen_at=row["last_seen_at"],
        )
        for row in rows
    ]

    grouped_items: dict[str, list[StudyVocabularyItem]] = {}
    group_order: list[str] = []
    for row in study_rows:
        row_language_code = row["language_code"]
        if row_language_code not in grouped_items:
            grouped_items[row_language_code] = []
            group_order.append(row_language_code)
        grouped_items[row_language_code].append(
            StudyVocabularyItem(
                language_code=row_language_code,
                language_label=_language_label(row_language_code),
                lemma=row["lemma"],
                display_form=row["display_form"],
                source_book_id=row["source_book_id"],
                source_book_title=title_map.get(row["source_book_id"], row["source_book_id"]),
                source_page_number=row["source_page_number"],
                source_sentence_order=row["source_sentence_order"],
                source_token_order=row["source_token_order"],
                source_surface_form=row["source_surface_form"],
                source_sentence_text=row["source_sentence_text"],
                pronunciation=row["pronunciation"],
                romanization=row["romanization"],
                definition_short=row["definition_short"],
                proficiency_level=row["proficiency_level"],
                click_count=row["click_count"],
                first_seen_at=row["first_seen_at"],
                last_seen_at=row["last_seen_at"],
            )
        )

    study_groups = [
        StudyVocabularyGroup(
            language_code=language_code_value,
            language_label=_language_label(language_code_value),
            item_count=len(grouped_items[language_code_value]),
            items=grouped_items[language_code_value],
        )
        for language_code_value in group_order
    ]

    return StudySurfaceResponse(
        queue_size=len(items),
        queued_items=items,
        study_programs=study_programs,
        study_item_count=sum(group.item_count for group in study_groups),
        study_groups=study_groups,
    )


def get_progress_surface(data_root: Path, *, owner_id: str | None = None) -> ProgressSurfaceResponse:
    profile = get_learning_profile_summary(data_root, owner_id=owner_id)
    registry = load_registry(_books_root(data_root) / "registry.json")
    title_map = _book_title_map(registry)
    db_path = ensure_profile_database(data_root, owner_id)
    aggregate: dict[str, ProgressBookSummary] = {}

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        page_rows = connection.execute(
            """
            SELECT book_id,
                   COUNT(*) AS page_reads,
                   COALESCE(SUM(active_seconds), 0) AS active_seconds,
                   MAX(page_number) AS furthest_page,
                   MAX(completed_at) AS last_read_at
            FROM page_reads
            GROUP BY book_id
            """
        ).fetchall()
        sentence_rows = connection.execute(
            """
            SELECT book_id,
                   COUNT(*) AS sentence_reads,
                   COUNT(DISTINCT CAST(page_number AS TEXT) || ':' || CAST(sentence_order AS TEXT)) AS sentences_read,
                   COALESCE(SUM(active_seconds), 0) AS active_seconds,
                   MAX(completed_at) AS last_read_at
            FROM sentence_reads
            GROUP BY book_id
            """
        ).fetchall()
        latest_sentence_rows = connection.execute(
            """
            SELECT current.book_id, current.page_number, current.sentence_order
            FROM sentence_reads AS current
            WHERE NOT EXISTS (
                SELECT 1
                FROM sentence_reads AS newer
                WHERE newer.book_id = current.book_id
                  AND (
                    newer.completed_at > current.completed_at
                    OR (newer.completed_at = current.completed_at AND newer.id > current.id)
                  )
            )
            """
        ).fetchall()

    latest_sentence_by_book = {
        row["book_id"]: (int(row["page_number"]), int(row["sentence_order"]))
        for row in latest_sentence_rows
    }

    for row in page_rows:
        book_id = row["book_id"]
        aggregate[book_id] = ProgressBookSummary(
            book_id=book_id,
            title=title_map.get(book_id, registry[book_id].title if book_id in registry else book_id),
            page_reads=int(row["page_reads"]),
            sentence_reads=0,
            active_seconds=int(row["active_seconds"]),
            furthest_page=int(row["furthest_page"] or 0),
            resume_page=int(row["furthest_page"] or 0),
            resume_sentence_order=1,
            last_read_at=str(row["last_read_at"]) if row["last_read_at"] else None,
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
                resume_page=0,
                resume_sentence_order=0,
            ),
        )
        entry.sentence_reads += int(row["sentence_reads"])
        entry.active_seconds += int(row["active_seconds"])
        entry.sentences_read += int(row["sentences_read"] or 0)
        sentence_last_read_at = str(row["last_read_at"]) if row["last_read_at"] else None
        if sentence_last_read_at and (not entry.last_read_at or sentence_last_read_at > entry.last_read_at):
            entry.last_read_at = sentence_last_read_at

    for book_id, (resume_page, resume_sentence_order) in latest_sentence_by_book.items():
        entry = aggregate.get(book_id)
        if entry is not None:
            entry.resume_page = resume_page
            entry.resume_sentence_order = resume_sentence_order

    for book_id, entry in aggregate.items():
        record = registry.get(book_id)
        entry.total_pages = max(0, int(record.total_pages or 0)) if record else 0
        extraction = _load_book_extraction(data_root, book_id)
        entry.total_sentences = sum(len(page.sentences) for page in extraction.pages) if extraction else 0
        entry.progress_unit = "pages" if entry.total_pages > 1 else "sentences"
        numerator = entry.furthest_page if entry.progress_unit == "pages" else entry.sentences_read
        denominator = entry.total_pages if entry.progress_unit == "pages" else entry.total_sentences
        entry.progress_percent = min(100, round((numerator / denominator) * 100)) if denominator > 0 else 0

    books = sorted(aggregate.values(), key=lambda item: item.title)
    books = sorted(books, key=lambda item: item.last_read_at or "", reverse=True)
    return ProgressSurfaceResponse(profile=profile, books=books)


def get_profile_surface(data_root: Path, *, owner_id: str | None = None) -> ProfileSurfaceResponse:
    progress = get_progress_surface(data_root, owner_id=owner_id)
    settings = load_settings_surface(data_root, owner_id=owner_id)
    return ProfileSurfaceResponse(
        profile=progress.profile,
        books=progress.books,
        settings=settings,
    )


def _reading_history(connection: sqlite3.Connection, registry: dict[str, BookRecord]) -> list[ReadingHistoryPoint]:
    paginated_book_ids = {book_id for book_id, record in registry.items() if int(record.total_pages or 0) > 1}
    page_first_days: dict[tuple[str, int], str] = {}
    sentence_first_days: dict[tuple[str, int, int], str] = {}
    reading_days: set[str] = set()

    page_rows = connection.execute(
        """
        SELECT book_id, page_number, completed_at, date(completed_at) AS day
        FROM page_reads
        WHERE counted_as_read = 1
        ORDER BY completed_at ASC, id ASC
        """
    ).fetchall()
    for row in page_rows:
        if row["book_id"] not in paginated_book_ids:
            continue
        day = str(row["day"])
        reading_days.add(day)
        page_first_days.setdefault((row["book_id"], int(row["page_number"])), day)

    sentence_rows = connection.execute(
        """
        SELECT book_id, page_number, sentence_order, completed_at, date(completed_at) AS day
        FROM sentence_reads
        ORDER BY completed_at ASC, id ASC
        """
    ).fetchall()
    for row in sentence_rows:
        day = str(row["day"])
        reading_days.add(day)
        sentence_first_days.setdefault(
            (row["book_id"], int(row["page_number"]), int(row["sentence_order"])),
            day,
        )

    page_completions_by_day = Counter(page_first_days.values())
    sentence_completions_by_day = Counter(sentence_first_days.values())
    cumulative_pages = 0
    cumulative_sentences = 0
    history: list[ReadingHistoryPoint] = []
    for day_index, day in enumerate(sorted(reading_days), start=1):
        pages_read = page_completions_by_day[day]
        sentences_read = sentence_completions_by_day[day]
        cumulative_pages += pages_read
        cumulative_sentences += sentences_read
        history.append(
            ReadingHistoryPoint(
                day_index=day_index,
                day=day,
                pages_read=pages_read,
                cumulative_pages=cumulative_pages,
                sentences_read=sentences_read,
                cumulative_sentences=cumulative_sentences,
            )
        )
    return history


def get_activity_surface(
    data_root: Path,
    *,
    limit: int = 50,
    owner_id: str | None = None,
) -> ActivitySurfaceResponse:
    limit = max(0, limit)
    registry = load_registry(_books_root(data_root) / "registry.json")
    title_map = _book_title_map(registry)
    db_path = ensure_profile_database(data_root, owner_id)
    events: list[ActivityEvent] = []
    reading_history: list[ReadingHistoryPoint] = []

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
            interaction_type = str(row["interaction_type"] or "")
            event_kind = "study_vocabulary_item" if interaction_type == "study_saved" else "pronunciation_playback" if interaction_type == "pronunciation_playback" else "definition_lookup"
            if interaction_type == "pronunciation_playback":
                detail = f"Audio played: {_snippet(str(row['lemma'] or ''), str(row['lemma'] or ''), width=72)}"
            elif interaction_type == "study_saved":
                detail = f"Saved: {_snippet(str(row['lemma'] or ''), str(row['lemma'] or ''), width=72)}"
            else:
                detail = f"Lookup: {_snippet(str(row['lemma'] or ''), str(row['lemma'] or ''), width=72)}"
            events.append(
                ActivityEvent(
                    kind=event_kind,
                    occurred_at=row["occurred_at"],
                    book_id=row["book_id"],
                    page_number=row["page_number"],
                    title=book_title,
                    detail=detail,
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
        reading_history = _reading_history(connection, registry)

    events.sort(key=lambda event: event.occurred_at, reverse=True)
    limited_events = events[:limit]
    return ActivitySurfaceResponse(
        event_count=len(limited_events),
        events=limited_events,
        reading_history=reading_history,
    )


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


def load_settings_surface(data_root: Path, *, owner_id: str | None = None) -> SettingsSurfaceResponse:
    db_path = ensure_profile_database(data_root, owner_id)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute("SELECT key, value FROM settings ORDER BY key ASC").fetchall()
    return SettingsSurfaceResponse(entries=[SettingEntry(key=row["key"], value=row["value"]) for row in rows])


def update_settings_surface(
    data_root: Path,
    payload: SettingsUpdateRequest,
    *,
    owner_id: str | None = None,
) -> SettingsSurfaceResponse:
    db_path = ensure_profile_database(data_root, owner_id)
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
    return load_settings_surface(data_root, owner_id=owner_id)
