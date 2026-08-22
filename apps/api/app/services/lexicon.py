from __future__ import annotations

import csv
import re
import sqlite3
import threading
from collections.abc import Iterable
from contextlib import closing, suppress
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.paths import get_lexicon_source_root
from app.schemas.lexicon import (
    LexiconEntryRecord,
    LexiconImportSummary,
    LexiconLookupResponse,
)
from app.services.google_translate import (
    is_google_translate_configured,
    romanize_text,
    translate_text,
)
from app.services.google_translate_usage import record_google_translate_usage

_lexicon_seed_lock = threading.Lock()
_warmed_lexicon_keys: set[tuple[str, str]] = set()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_lexicon_db_path(data_root: Path) -> Path:
    return data_root / "lexicon" / "lexicon.sqlite3"


def _migration_root() -> Path:
    return Path(__file__).resolve().parents[1] / "db" / "migrations" / "lexicon"


def _ensure_google_translate_cache_schema(connection: sqlite3.Connection) -> None:
    row = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        (_cache_table_name(),),
    ).fetchone()
    if not row:
        migration_path = _migration_root() / "0002_google_translate_cache.sql"
        connection.executescript(migration_path.read_text(encoding="utf-8"))
        connection.commit()
        row = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            (_cache_table_name(),),
        ).fetchone()
        if not row:
            return

    columns = _cache_table_columns(connection)
    if "pronunciation" not in columns:
        migration_path = _migration_root() / "0003_google_translate_cache_pronunciation.sql"
        connection.executescript(migration_path.read_text(encoding="utf-8"))
        connection.commit()


def _ensure_jmdict_schema(connection: sqlite3.Connection) -> None:
    columns = {
        str(row[1]).strip()
        for row in connection.execute("PRAGMA table_info(lexicon_entries)").fetchall()
        if len(row) > 1 and row[1]
    }
    for column_name, column_type in (
        ("reading", "TEXT"),
        ("part_of_speech", "TEXT"),
        ("external_id", "TEXT"),
        ("source_id", "INTEGER"),
        ("source_version", "TEXT"),
    ):
        if column_name not in columns:
            connection.execute(f"ALTER TABLE lexicon_entries ADD COLUMN {column_name} {column_type}")
    migration_path = _migration_root() / "0004_jmdict_provenance.sql"
    connection.executescript(migration_path.read_text(encoding="utf-8"))
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_lexicon_entries_external_id ON lexicon_entries(source_id, external_id)"
    )
    connection.commit()


def ensure_lexicon_database(data_root: Path) -> Path:
    db_path = get_lexicon_db_path(data_root)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    if db_path.exists() and db_path.stat().st_size > 0:
        with closing(sqlite3.connect(db_path)) as connection:
            _ensure_google_translate_cache_schema(connection)
            _ensure_jmdict_schema(connection)
        return db_path

    with closing(sqlite3.connect(db_path)) as connection:
        for migration_file in sorted(_migration_root().glob("*.sql")):
            connection.executescript(migration_file.read_text(encoding="utf-8"))
        _ensure_jmdict_schema(connection)
        connection.commit()

    return db_path


def _lexicon_entry_count(data_root: Path, *, language_code: str | None = None) -> int:
    db_path = ensure_lexicon_database(data_root)
    with closing(sqlite3.connect(db_path)) as connection:
        if language_code:
            row = connection.execute(
                "SELECT COUNT(*) FROM lexicon_entries WHERE language_code = ?",
                (language_code,),
            ).fetchone()
        else:
            row = connection.execute("SELECT COUNT(*) FROM lexicon_entries").fetchone()
    return int(row[0] if row else 0)


def _ensure_seeded_lexicon(data_root: Path, *, language_code: str = "zh") -> None:
    normalized_language_code = _normalized_language_code(language_code)
    if _lexicon_entry_count(data_root, language_code=normalized_language_code) > 0:
        return
    import_lexicon_from_source(
        None,
        data_root=data_root,
        language_code=normalized_language_code,
        replace_existing=False,
    )


def _ensure_seeded_lexicon_if_available(data_root: Path, *, language_code: str) -> bool:
    try:
        _ensure_seeded_lexicon(data_root, language_code=language_code)
    except FileNotFoundError:
        return False
    return True


def warm_lexicon(data_root: Path, *, language_code: str) -> bool:
    normalized_language_code = _normalized_language_code(language_code)
    cache_key = (str(data_root.resolve()), normalized_language_code)
    if cache_key in _warmed_lexicon_keys:
        return True

    with _lexicon_seed_lock:
        if cache_key in _warmed_lexicon_keys:
            return True
        available = _ensure_seeded_lexicon_if_available(data_root, language_code=normalized_language_code)
        _warmed_lexicon_keys.add(cache_key)
        return available


def _connect(data_root: Path) -> sqlite3.Connection:
    db_path = ensure_lexicon_database(data_root)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return closing(connection)


def _normalized_header_map(columns: Iterable[str]) -> dict[str, str]:
    return {column.strip().lower(): column for column in columns}


def _safe_int(value: Any) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def _safe_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _upsert_rows(
    *,
    connection: sqlite3.Connection,
    rows: Iterable[dict[str, Any]],
    language_code: str,
    entry_type: str,
    source_name: str,
    source_path: str,
) -> int:
    imported = 0
    for row in rows:
        surface_form = _safe_text(row.get("surface_form")) or _safe_text(row.get("character")) or _safe_text(row.get("term"))
        if not surface_form:
            continue
        resolved_entry_type = _safe_text(row.get("entry_type")) or entry_type

        connection.execute(
            """
            INSERT INTO lexicon_entries (
                language_code,
                entry_type,
                surface_form,
                reading,
                part_of_speech,
                external_id,
                source_id,
                source_version,
                pinyin,
                tone,
                definition,
                radical,
                stroke_count,
                hsk_level,
                frequency_rank,
                note,
                source_name,
                source_path,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(language_code, entry_type, surface_form) DO UPDATE SET
                reading = excluded.reading,
                part_of_speech = excluded.part_of_speech,
                external_id = excluded.external_id,
                source_id = excluded.source_id,
                source_version = excluded.source_version,
                pinyin = excluded.pinyin,
                tone = excluded.tone,
                definition = excluded.definition,
                radical = excluded.radical,
                stroke_count = excluded.stroke_count,
                hsk_level = excluded.hsk_level,
                frequency_rank = excluded.frequency_rank,
                note = excluded.note,
                source_name = excluded.source_name,
                source_path = excluded.source_path
            """,
            (
                language_code,
                resolved_entry_type,
                surface_form,
                _safe_text(row.get("reading")),
                _safe_text(row.get("part_of_speech")),
                _safe_text(row.get("external_id")),
                _safe_int(row.get("source_id")),
                _safe_text(row.get("source_version")),
                _safe_text(row.get("pinyin")),
                _safe_int(row.get("tone")),
                _safe_text(row.get("definition")) or _safe_text(row.get("english")),
                _safe_text(row.get("radical")),
                _safe_int(row.get("stroke_count")),
                _safe_text(row.get("hsk_level")),
                _safe_int(row.get("frequency_rank")),
                _safe_text(row.get("note")),
                source_name,
                source_path,
                _utc_now(),
            ),
        )
        imported += 1
    return imported


def _read_csv_rows(csv_path: Path) -> list[dict[str, Any]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader)


def _read_db_rows(db_path: Path, query: str) -> list[dict[str, Any]]:
    with closing(sqlite3.connect(db_path)) as connection:
        connection.row_factory = sqlite3.Row
        return [dict(row) for row in connection.execute(query).fetchall()]


def _source_candidates(source_root: Path, relative_paths: list[Path]) -> Path | None:
    for relative_path in relative_paths:
        candidate = source_root / relative_path
        if candidate.exists():
            return candidate
    return None


def _normalized_language_code(language_code: str) -> str:
    return language_code.split("-", 1)[0].strip().lower()


def _has_cyrillic_text(value: str | None) -> bool:
    return bool(value and re.search(r"[\u0400-\u04FF]", value))


_RUSSIAN_LOOKUP_SUFFIX_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("иями", ("ия", "ие")),
    ("ями", ("я", "е", "ь")),
    ("ами", ("а", "о", "я", "е", "ь")),
    ("ого", ("ый", "ой", "ий")),
    ("его", ("ий", "ый")),
    ("ому", ("ый", "ий", "ой")),
    ("ему", ("ий", "ый")),
    ("ыми", ("ый", "ой", "ий")),
    ("ими", ("ий", "ый")),
    ("ою", ("ая",)),
    ("ею", ("яя",)),
    ("ую", ("ая", "яя")),
    ("юю", ("яя", "ая")),
    ("ая", ("а", "я", "ь")),
    ("яя", ("я", "ь")),
    ("ое", ("о", "е")),
    ("ее", ("е", "о")),
    ("ом", ("о", "е", "ь")),
    ("ем", ("е", "я", "ь")),
    ("ам", ("а", "я", "е", "о", "ь")),
    ("ям", ("я", "а", "е", "о", "ь")),
    ("ах", ("а", "я", "е", "о", "ь")),
    ("ях", ("я", "а", "е", "о", "ь")),
    ("ов", ("", "о", "а", "я", "ь")),
    ("ев", ("", "е", "я", "ь")),
    ("ей", ("я", "е", "ь")),
    ("ий", ("ий", "ь")),
    ("ый", ("ый", "ий")),
    ("ой", ("ой", "ая", "я", "ь")),
    ("а", ("", "ь", "я", "е", "о")),
    ("я", ("", "ь", "й", "е", "а", "о")),
    ("у", ("", "ь", "й", "а", "я", "о")),
    ("ю", ("", "ь", "й", "е", "я", "а")),
    ("ы", ("", "а", "я", "е", "о", "ь")),
    ("и", ("", "я", "а", "е", "о", "ь")),
    ("е", ("", "ь", "й", "я", "а", "о")),
    ("о", ("", "е", "а", "я", "ь")),
    ("ь", ("",)),
)


@lru_cache(maxsize=4096)
def _lookup_term_candidates(language_code: str, term: str) -> tuple[tuple[str, float], ...]:
    normalized_term = term.strip()
    if not normalized_term:
        return ()

    normalized_language_code = _normalized_language_code(language_code)
    if normalized_language_code != "ru":
        return ((normalized_term, 1.0),)

    lowered_term = normalized_term.lower()
    candidates: dict[str, float] = {}

    def add_candidate(candidate: str, confidence: float) -> None:
        if not candidate:
            return
        cleaned = candidate.strip().lower()
        if not cleaned or not _has_cyrillic_text(cleaned):
            return
        existing = candidates.get(cleaned)
        if existing is None or confidence > existing:
            candidates[cleaned] = confidence

    add_candidate(lowered_term, 1.0)
    for suffix, replacements in _RUSSIAN_LOOKUP_SUFFIX_RULES:
        if len(lowered_term) <= len(suffix) + 1 or not lowered_term.endswith(suffix):
            continue
        stem = lowered_term[: -len(suffix)]
        add_candidate(stem, 0.88)
        for replacement in replacements:
            add_candidate(f"{stem}{replacement}", 0.95)

    return tuple(sorted(candidates.items(), key=lambda item: (-item[1], item[0])))


def _row_map_by_surface(rows: Iterable[sqlite3.Row]) -> dict[str, list[sqlite3.Row]]:
    row_map: dict[str, list[sqlite3.Row]] = {}
    for row in rows:
        surface_form = row["surface_form"]
        if not surface_form:
            continue
        row_map.setdefault(surface_form, []).append(row)
    return row_map


def _best_row_for_term(
    *,
    row_map: dict[str, list[sqlite3.Row]],
    language_code: str,
    term: str,
) -> tuple[sqlite3.Row | None, float | None, str | None]:
    for candidate, confidence in _lookup_term_candidates(language_code, term):
        candidate_rows = row_map.get(candidate)
        if candidate_rows:
            return candidate_rows[0], confidence, candidate
    return None, None, None


def _cache_table_name() -> str:
    return "lexicon_google_translate_cache"


def _cache_table_columns(connection: sqlite3.Connection) -> set[str]:
    rows = connection.execute(f"PRAGMA table_info({_cache_table_name()})").fetchall()
    columns: set[str] = set()
    for row in rows:
        column_name = row[1] if len(row) > 1 else None
        if isinstance(column_name, str) and column_name.strip():
            columns.add(column_name.strip())
    return columns


def _cache_row_to_entry(row: sqlite3.Row) -> LexiconEntryRecord:
    row_keys = row.keys()
    return LexiconEntryRecord(
        id=row["id"],
        language_code=row["language_code"],
        entry_type=row["entry_type"],
        surface_form=row["surface_form"],
        reading=row["reading"] if "reading" in row_keys else None,
        part_of_speech=row["part_of_speech"] if "part_of_speech" in row_keys else None,
        external_id=row["external_id"] if "external_id" in row_keys else None,
        source_id=row["source_id"] if "source_id" in row_keys else None,
        source_version=row["source_version"] if "source_version" in row_keys else None,
        pronunciation=row["pronunciation"] if "pronunciation" in row_keys else None,
        pinyin=row["pinyin"],
        tone=row["tone"],
        definition=row["definition"],
        radical=row["radical"],
        stroke_count=row["stroke_count"],
        hsk_level=row["hsk_level"],
        frequency_rank=row["frequency_rank"],
        note=row["note"],
        source_name=row["source_name"],
        source_path=row["source_path"],
    )


def _select_google_cache_entry(
    *,
    connection: sqlite3.Connection,
    language_code: str,
    term: str,
) -> LexiconEntryRecord | None:
    row = connection.execute(
        f"""
        SELECT id, language_code, entry_type, surface_form, pronunciation, pinyin, tone, definition, radical, stroke_count, hsk_level, frequency_rank, note, source_name, source_path
        FROM {_cache_table_name()}
        WHERE language_code = ? AND surface_form = ?
        ORDER BY id ASC
        """,
        (language_code, term),
    ).fetchone()
    return _cache_row_to_entry(row) if row else None


def _cache_google_translation(
    *,
    connection: sqlite3.Connection,
    language_code: str,
    term: str,
    translation: str,
    pronunciation: str | None,
) -> LexiconEntryRecord:
    source_name = "Google Cloud Translation"
    source_path = "https://translation.googleapis.com/language/translate/v2"
    note = f"Google translation fallback from {language_code} to en"
    connection.execute(
        f"""
        INSERT INTO {_cache_table_name()} (
            language_code,
            entry_type,
            surface_form,
            pronunciation,
            pinyin,
            tone,
            definition,
            radical,
            stroke_count,
            hsk_level,
            frequency_rank,
            note,
            source_name,
            source_path,
            created_at,
            updated_at
        )
        VALUES (?, 'word', ?, ?, NULL, NULL, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)
        ON CONFLICT(language_code, surface_form) DO UPDATE SET
            pronunciation = excluded.pronunciation,
            definition = excluded.definition,
            note = excluded.note,
            source_name = excluded.source_name,
            source_path = excluded.source_path,
            updated_at = excluded.updated_at
        """,
        (language_code, term, pronunciation, translation, note, source_name, source_path, _utc_now(), _utc_now()),
    )
    connection.commit()
    cached = _select_google_cache_entry(connection=connection, language_code=language_code, term=term)
    if cached is None:
        raise RuntimeError("Could not cache Google translation fallback.")
    return cached


def _lookup_google_translate_entry(
    *,
    data_root: Path,
    connection: sqlite3.Connection,
    language_code: str,
    term: str,
    owner_id: str | None = None,
) -> LexiconEntryRecord | None:
    cached_entry = _select_google_cache_entry(connection=connection, language_code=language_code, term=term)
    if cached_entry is not None:
        return cached_entry

    if not is_google_translate_configured():
        return None

    translated_text = translate_text(term, source_language_code=language_code)
    if not translated_text:
        return None

    with suppress(OSError, sqlite3.Error):
        record_google_translate_usage(data_root=data_root, characters=len(term), owner_id=owner_id)

    pronunciation = romanize_text(term, source_language_code=language_code)
    if pronunciation:
        with suppress(OSError, sqlite3.Error):
            record_google_translate_usage(data_root=data_root, characters=len(term), owner_id=owner_id)

    return _cache_google_translation(
        connection=connection,
        language_code=language_code,
        term=term,
        translation=translated_text,
        pronunciation=pronunciation,
    )


def _import_from_canonical_pack(
    *,
    connection: sqlite3.Connection,
    source_root: Path,
    language_code: str,
    replace_existing: bool,
) -> tuple[int, int, int]:
    source_db = _source_candidates(source_root, [Path("lexicon.sqlite3")])
    source_csv = _source_candidates(source_root, [Path("lexicon.csv")])

    if source_db is None and source_csv is None:
        raise FileNotFoundError(
            "Could not find a canonical lexicon pack. Expected lexicon.sqlite3 or lexicon.csv in the supplied root."
        )

    if replace_existing:
        connection.execute("DELETE FROM lexicon_entries")

    if source_db is not None:
        rows = _read_db_rows(source_db, "SELECT * FROM lexicon_entries ORDER BY id")
        if not rows:
            raise FileNotFoundError(f"Could not find any rows in {source_db}.")
        imported_rows = _upsert_rows(
            connection=connection,
            rows=rows,
            language_code=language_code,
            entry_type="word",
            source_name=source_db.name,
            source_path=str(source_db),
        )
        vocabulary_rows = len([row for row in rows if _safe_text(row.get("entry_type")) in (None, "", "word")])
        character_rows = len([row for row in rows if _safe_text(row.get("entry_type")) == "character"])
        return vocabulary_rows, character_rows, imported_rows

    rows = _read_csv_rows(source_csv)
    imported_rows = _upsert_rows(
        connection=connection,
        rows=rows,
        language_code=language_code,
        entry_type="word",
        source_name=source_csv.name,
        source_path=str(source_csv),
    )
    return len(rows), 0, imported_rows


def _import_from_override_pack(
    *,
    connection: sqlite3.Connection,
    source_root: Path,
    language_code: str,
) -> tuple[int, int, int]:
    override_csv = _source_candidates(
        source_root,
        [
            Path("lexicon.override.csv"),
            Path("lexicon.overrides.csv"),
        ],
    )
    if override_csv is None:
        return 0, 0, 0

    rows = _read_csv_rows(override_csv)
    if not rows:
        return 0, 0, 0

    imported_rows = _upsert_rows(
        connection=connection,
        rows=rows,
        language_code=language_code,
        entry_type="word",
        source_name=override_csv.name,
        source_path=str(override_csv),
    )
    return len(rows), 0, imported_rows


def import_lexicon_from_source(
    source_root: str | Path | None = None,
    *,
    data_root: Path,
    language_code: str = "zh",
    replace_existing: bool = False,
) -> LexiconImportSummary:
    normalized_language_code = _normalized_language_code(language_code)
    resolved_source_root = (
        Path(source_root).expanduser().resolve()
        if source_root
        else get_lexicon_source_root(normalized_language_code).resolve()
    )
    db_path = ensure_lexicon_database(data_root)

    canonical_pack_root = _source_candidates(
        resolved_source_root,
        [
            Path("lexicon.sqlite3"),
            Path("lexicon.csv"),
        ],
    )

    if canonical_pack_root is not None:
        with _connect(data_root) as connection:
            vocabulary_rows, character_rows, imported_rows = _import_from_canonical_pack(
                connection=connection,
                source_root=resolved_source_root,
                language_code=normalized_language_code,
                replace_existing=replace_existing,
            )
            override_vocabulary_rows, override_character_rows, override_imported_rows = _import_from_override_pack(
                connection=connection,
                source_root=resolved_source_root,
                language_code=normalized_language_code,
            )
            vocabulary_rows += override_vocabulary_rows
            character_rows += override_character_rows
            imported_rows += override_imported_rows
            connection.commit()

        return LexiconImportSummary(
            database_path=str(db_path),
            source_root=str(resolved_source_root),
            vocabulary_rows=vocabulary_rows,
            character_rows=character_rows,
            imported_rows=imported_rows,
        )

    vocab_db = _source_candidates(
        resolved_source_root,
        [
            Path("my_databases") / "full_vocabulary_database.db",
            Path("my_databases") / "full_vocabulary.db",
        ],
    )
    vocab_csv = _source_candidates(
        resolved_source_root,
        [
            Path("CSV Files") / "Chinese Character Recognition - Full Vocabulary List.csv",
        ],
    )
    char_db = _source_candidates(
        resolved_source_root,
        [
            Path("my_databases") / "full_character_database.db",
            Path("my_databases") / "full_characters_database.db",
        ],
    )
    char_csv = _source_candidates(
        resolved_source_root,
        [
            Path("CSV Files") / "Chinese Character Recognition - Full Characters.csv",
        ],
    )

    if vocab_db is None and vocab_csv is None:
        raise FileNotFoundError(
            f"Could not find a vocabulary source for {normalized_language_code} in the supplied root."
        )
    if char_db is None and char_csv is None:
        raise FileNotFoundError(
            f"Could not find a character source for {normalized_language_code} in the supplied root."
        )

    with _connect(data_root) as connection:
        if replace_existing:
            connection.execute("DELETE FROM lexicon_entries")

        vocabulary_rows = 0
        character_rows = 0
        imported_rows = 0

        if vocab_db is not None:
            rows = _read_db_rows(
                vocab_db,
                "SELECT term, pinyin, definition, hsk_level FROM vocabulary ORDER BY id",
            )
            vocabulary_rows = len(rows)
            imported_rows += _upsert_rows(
                connection=connection,
                rows=rows,
                language_code=normalized_language_code,
                entry_type="word",
                source_name=vocab_db.name,
                source_path=str(vocab_db),
            )
        else:
            rows = _read_csv_rows(vocab_csv)
            vocabulary_rows = len(rows)
            imported_rows += _upsert_rows(
                connection=connection,
                rows=[
                    {
                        "term": row.get("Chinese"),
                        "pinyin": row.get("Pinyin"),
                        "definition": row.get("English"),
                        "hsk_level": row.get("HSK Level"),
                    }
                    for row in rows
                ],
                language_code=normalized_language_code,
                entry_type="word",
                source_name=vocab_csv.name,
                source_path=str(vocab_csv),
            )

        if char_db is not None:
            rows = _read_db_rows(
                char_db,
                """
                SELECT
                    character,
                    pinyin,
                    tone,
                    definition,
                    radical,
                    stroke_count,
                    hsk_level,
                    frequency_rank,
                    note
                FROM full_characters
                ORDER BY id
                """,
            )
            character_rows = len(rows)
            imported_rows += _upsert_rows(
                connection=connection,
                rows=rows,
                language_code=normalized_language_code,
                entry_type="character",
                source_name=char_db.name,
                source_path=str(char_db),
            )
        else:
            rows = _read_csv_rows(char_csv)
            character_rows = len(rows)
            imported_rows += _upsert_rows(
                connection=connection,
                rows=[
                    {
                        "character": row.get("Character"),
                        "pinyin": row.get("Pinyin"),
                        "tone": row.get("Tone"),
                        "definition": row.get("Definition"),
                        "radical": row.get("Radical"),
                        "stroke_count": row.get("Stroke count"),
                        "hsk_level": row.get("HSK level"),
                        "frequency_rank": row.get("Frequency rank"),
                        "note": row.get("Note"),
                    }
                    for row in rows
                ],
                language_code=normalized_language_code,
                entry_type="character",
                source_name=char_csv.name,
                source_path=str(char_csv),
            )

        connection.commit()

    return LexiconImportSummary(
        database_path=str(db_path),
        source_root=str(resolved_source_root),
        vocabulary_rows=vocabulary_rows,
        character_rows=character_rows,
        imported_rows=imported_rows,
    )


def lookup_lexicon_entry(
    *,
    data_root: Path,
    language_code: str,
    term: str,
    allow_google_fallback: bool = False,
    owner_id: str | None = None,
) -> LexiconLookupResponse:
    normalized_language_code = _normalized_language_code(language_code)
    warm_lexicon(data_root, language_code=normalized_language_code)
    db_path = ensure_lexicon_database(data_root)
    entries: list[LexiconEntryRecord] = []
    resolution_source: str = "local"
    match_confidence: float | None = None
    matched_term: str | None = None
    candidate_terms = _lookup_term_candidates(normalized_language_code, term)
    with closing(sqlite3.connect(db_path)) as connection:
        connection.row_factory = sqlite3.Row
        if candidate_terms:
            candidate_surface_forms = [candidate for candidate, _confidence in candidate_terms]
            placeholders = ", ".join("?" for _ in candidate_surface_forms)
            rows = connection.execute(
                f"""
                SELECT id, language_code, entry_type, surface_form, reading, part_of_speech, external_id, source_id, source_version, pinyin, tone, definition, radical, stroke_count, hsk_level, frequency_rank, note, source_name, source_path
                FROM lexicon_entries
                WHERE language_code = ? AND surface_form IN ({placeholders})
                ORDER BY CASE entry_type WHEN 'jmdict' THEN 0 WHEN 'word' THEN 1 ELSE 2 END, frequency_rank IS NULL, frequency_rank ASC, id ASC
                """,
                [normalized_language_code, *candidate_surface_forms],
            ).fetchall()
        else:
            rows = []

        row_map = _row_map_by_surface(rows)
        best_row, best_confidence, best_candidate = _best_row_for_term(
            row_map=row_map,
            language_code=normalized_language_code,
            term=term,
        )
        if best_row is not None:
            entries = [_cache_row_to_entry(row) for row in row_map.get(best_row["surface_form"], [best_row])]
            match_confidence = best_confidence
            matched_term = best_candidate
        if not entries:
            cached_entry = _select_google_cache_entry(connection=connection, language_code=normalized_language_code, term=term)
            if cached_entry is not None:
                entries = [cached_entry]
                resolution_source = "google_translate_cache"
            elif allow_google_fallback:
                google_entry = _lookup_google_translate_entry(
                    data_root=data_root,
                    connection=connection,
                    language_code=normalized_language_code,
                    term=term,
                    owner_id=owner_id,
                )
                if google_entry is not None:
                    entries = [google_entry]
                    resolution_source = "google_translate_live"

    return LexiconLookupResponse(
        query=term,
        language_code=normalized_language_code,
        entries=entries,
        resolution_source=resolution_source,
        match_confidence=match_confidence,
        matched_term=matched_term,
    )


def lookup_lexicon_pinyin_map(
    *,
    data_root: Path,
    language_code: str,
    terms: Iterable[str],
) -> dict[str, str]:
    normalized_language_code = _normalized_language_code(language_code)
    normalized_terms = [term.strip() for term in terms if isinstance(term, str) and term.strip()]
    if not normalized_terms:
        return {}

    _ensure_seeded_lexicon_if_available(data_root, language_code=normalized_language_code)
    db_path = ensure_lexicon_database(data_root)
    candidate_terms: list[str] = []
    seen_candidates: set[str] = set()
    for term in normalized_terms:
        candidates = _lookup_term_candidates(normalized_language_code, term)
        for candidate, _confidence in candidates:
            if candidate not in seen_candidates:
                seen_candidates.add(candidate)
                candidate_terms.append(candidate)

    placeholders = ", ".join("?" for _ in candidate_terms)
    with closing(sqlite3.connect(db_path)) as connection:
        connection.row_factory = sqlite3.Row
        rows = (
            connection.execute(
                f"""
                SELECT surface_form, pinyin
                FROM lexicon_entries
                WHERE language_code = ? AND surface_form IN ({placeholders}) AND pinyin IS NOT NULL AND pinyin != ''
                ORDER BY CASE entry_type WHEN 'jmdict' THEN 0 WHEN 'word' THEN 1 ELSE 2 END, frequency_rank IS NULL, frequency_rank ASC, id ASC
                """,
                [normalized_language_code, *candidate_terms],
            ).fetchall()
            if candidate_terms
            else []
        )

        row_map = _row_map_by_surface(rows)
        pinyin_map: dict[str, str] = {}
        for term in normalized_terms:
            best_row, _, _ = _best_row_for_term(row_map=row_map, language_code=normalized_language_code, term=term)
            if best_row is not None and best_row["pinyin"]:
                pinyin_map[term] = best_row["pinyin"]

        missing_terms = [term for term in normalized_terms if term not in pinyin_map]
        if missing_terms:
            missing_characters = sorted({character for term in missing_terms for character in term})
            if missing_characters:
                character_placeholders = ", ".join("?" for _ in missing_characters)
                character_rows = connection.execute(
                    f"""
                    SELECT surface_form, pinyin
                    FROM lexicon_entries
                    WHERE language_code = ?
                      AND entry_type = 'character'
                      AND surface_form IN ({character_placeholders})
                      AND pinyin IS NOT NULL
                      AND pinyin != ''
                    ORDER BY id ASC
                    """,
                    [language_code, *missing_characters],
                ).fetchall()

                character_map: dict[str, str] = {}
                for character_row in character_rows:
                    character_surface = character_row["surface_form"]
                    character_pinyin = character_row["pinyin"]
                    if character_surface and character_surface not in character_map and character_pinyin:
                        character_map[character_surface] = character_pinyin

                for term in missing_terms:
                    if len(term) < 2:
                        continue
                    if not all("\u4e00" <= character <= "\u9fff" for character in term):
                        continue
                    romanized_tokens = [character_map.get(character) for character in term if character_map.get(character)]
                    if romanized_tokens:
                        pinyin_map.setdefault(term, " ".join(romanized_tokens))

    return pinyin_map


def lookup_lexicon_entry_map(
    *,
    data_root: Path,
    language_code: str,
    terms: Iterable[str],
) -> dict[str, LexiconEntryRecord]:
    normalized_language_code = _normalized_language_code(language_code)
    normalized_terms = [term.strip() for term in terms if isinstance(term, str) and term.strip()]
    if not normalized_terms:
        return {}

    _ensure_seeded_lexicon_if_available(data_root, language_code=normalized_language_code)
    db_path = ensure_lexicon_database(data_root)
    candidate_terms: list[str] = []
    seen_candidates: set[str] = set()
    for term in normalized_terms:
        candidates = _lookup_term_candidates(normalized_language_code, term)
        for candidate, _confidence in candidates:
            if candidate not in seen_candidates:
                seen_candidates.add(candidate)
                candidate_terms.append(candidate)

    placeholders = ", ".join("?" for _ in candidate_terms)
    with closing(sqlite3.connect(db_path)) as connection:
        connection.row_factory = sqlite3.Row
        rows = (
            connection.execute(
                f"""
                SELECT id, language_code, entry_type, surface_form, reading, part_of_speech, external_id, source_id, source_version, pinyin, tone, definition, radical, stroke_count, hsk_level, frequency_rank, note, source_name, source_path
                FROM lexicon_entries
                WHERE language_code = ? AND surface_form IN ({placeholders})
                ORDER BY CASE entry_type WHEN 'word' THEN 0 ELSE 1 END, frequency_rank IS NULL, frequency_rank ASC, id ASC
                """,
                [normalized_language_code, *candidate_terms],
            ).fetchall()
            if candidate_terms
            else []
        )

    entry_map: dict[str, LexiconEntryRecord] = {}
    row_map = _row_map_by_surface(rows)
    for term in normalized_terms:
        best_row, _, _ = _best_row_for_term(row_map=row_map, language_code=normalized_language_code, term=term)
        if best_row is None:
            continue
        entry_map[term] = LexiconEntryRecord(
            id=best_row["id"],
            language_code=best_row["language_code"],
            entry_type=best_row["entry_type"],
            surface_form=best_row["surface_form"],
            reading=best_row["reading"],
            part_of_speech=best_row["part_of_speech"],
            external_id=best_row["external_id"],
            source_id=best_row["source_id"],
            source_version=best_row["source_version"],
            pinyin=best_row["pinyin"],
            tone=best_row["tone"],
            definition=best_row["definition"],
            radical=best_row["radical"],
            stroke_count=best_row["stroke_count"],
            hsk_level=best_row["hsk_level"],
            frequency_rank=best_row["frequency_rank"],
            note=best_row["note"],
            source_name=best_row["source_name"],
            source_path=best_row["source_path"],
        )

    return entry_map


def lookup_lexicon_hsk_levels_map(
    *,
    data_root: Path,
    language_code: str,
    characters: Iterable[str],
) -> dict[str, list[str]]:
    """Return every character HSK label so analysis can choose numeric evidence."""
    normalized_language_code = _normalized_language_code(language_code)
    normalized_characters = sorted({character.strip() for character in characters if isinstance(character, str) and character.strip()})
    if not normalized_characters:
        return {}

    try:
        _ensure_seeded_lexicon(data_root, language_code=normalized_language_code)
    except FileNotFoundError:
        return {}

    db_path = ensure_lexicon_database(data_root)
    placeholders = ", ".join("?" for _ in normalized_characters)
    with closing(sqlite3.connect(db_path)) as connection:
        rows = connection.execute(
            f"""
            SELECT surface_form, hsk_level
            FROM lexicon_entries
            WHERE language_code = ?
              AND entry_type = 'character'
              AND surface_form IN ({placeholders})
              AND hsk_level IS NOT NULL
              AND hsk_level != ''
            ORDER BY id ASC
            """,
            [normalized_language_code, *normalized_characters],
        ).fetchall()

    levels: dict[str, list[str]] = {}
    for surface_form, hsk_level in rows:
        levels.setdefault(surface_form, []).append(hsk_level)
    return levels
