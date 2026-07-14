from __future__ import annotations

import csv
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from app.core.paths import get_lexicon_source_root
from app.schemas.lexicon import LexiconEntryRecord, LexiconImportSummary, LexiconLookupResponse


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def get_lexicon_db_path(data_root: Path) -> Path:
    return data_root / "lexicon" / "lexicon.sqlite3"


def _migration_root() -> Path:
    return Path(__file__).resolve().parents[1] / "db" / "migrations" / "lexicon"


def ensure_lexicon_database(data_root: Path) -> Path:
    db_path = get_lexicon_db_path(data_root)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    if db_path.exists() and db_path.stat().st_size > 0:
        return db_path

    with sqlite3.connect(db_path) as connection:
        for migration_file in sorted(_migration_root().glob("*.sql")):
            connection.executescript(migration_file.read_text(encoding="utf-8"))
        connection.commit()

    return db_path


def _lexicon_entry_count(data_root: Path) -> int:
    db_path = ensure_lexicon_database(data_root)
    with sqlite3.connect(db_path) as connection:
        row = connection.execute("SELECT COUNT(*) FROM lexicon_entries").fetchone()
    return int(row[0] if row else 0)


def _ensure_seeded_lexicon(data_root: Path) -> None:
    if _lexicon_entry_count(data_root) > 0:
        return
    import_lexicon_from_source(None, data_root=data_root, replace_existing=False)


def _connect(data_root: Path) -> sqlite3.Connection:
    db_path = ensure_lexicon_database(data_root)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


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

        connection.execute(
            """
            INSERT INTO lexicon_entries (
                language_code,
                entry_type,
                surface_form,
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(language_code, entry_type, surface_form) DO UPDATE SET
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
                entry_type,
                surface_form,
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
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        return [dict(row) for row in connection.execute(query).fetchall()]


def _source_candidates(source_root: Path, relative_paths: list[Path]) -> Path | None:
    for relative_path in relative_paths:
        candidate = source_root / relative_path
        if candidate.exists():
            return candidate
    return None


def import_lexicon_from_source(
    source_root: str | Path | None = None,
    *,
    data_root: Path,
    language_code: str = "zh",
    replace_existing: bool = False,
) -> LexiconImportSummary:
    resolved_source_root = Path(source_root).expanduser().resolve() if source_root else get_lexicon_source_root().resolve()
    db_path = ensure_lexicon_database(data_root)

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
        raise FileNotFoundError("Could not find a full vocabulary source in the supplied root.")
    if char_db is None and char_csv is None:
        raise FileNotFoundError("Could not find a full character source in the supplied root.")

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
                language_code=language_code,
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
                language_code=language_code,
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
                language_code=language_code,
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
                language_code=language_code,
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
) -> LexiconLookupResponse:
    _ensure_seeded_lexicon(data_root)
    db_path = ensure_lexicon_database(data_root)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, language_code, entry_type, surface_form, pinyin, tone, definition, radical, stroke_count, hsk_level, frequency_rank, note, source_name, source_path
            FROM lexicon_entries
            WHERE language_code = ? AND surface_form = ?
            ORDER BY CASE entry_type WHEN 'word' THEN 0 ELSE 1 END, frequency_rank IS NULL, frequency_rank ASC, id ASC
            """,
            (language_code, term),
        ).fetchall()

    return LexiconLookupResponse(
        query=term,
        language_code=language_code,
        entries=[
            LexiconEntryRecord(
                id=row["id"],
                language_code=row["language_code"],
                entry_type=row["entry_type"],
                surface_form=row["surface_form"],
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
            for row in rows
        ],
    )


def lookup_lexicon_pinyin_map(
    *,
    data_root: Path,
    language_code: str,
    terms: Iterable[str],
) -> dict[str, str]:
    normalized_terms = [term.strip() for term in terms if isinstance(term, str) and term.strip()]
    if not normalized_terms:
        return {}

    _ensure_seeded_lexicon(data_root)
    db_path = ensure_lexicon_database(data_root)
    placeholders = ", ".join("?" for _ in normalized_terms)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            f"""
            SELECT surface_form, pinyin
            FROM lexicon_entries
            WHERE language_code = ? AND surface_form IN ({placeholders}) AND pinyin IS NOT NULL AND pinyin != ''
            ORDER BY CASE entry_type WHEN 'word' THEN 0 ELSE 1 END, frequency_rank IS NULL, frequency_rank ASC, id ASC
            """,
            [language_code, *normalized_terms],
        ).fetchall()

        pinyin_map: dict[str, str] = {}
        for row in rows:
            surface_form = row["surface_form"]
            pinyin = row["pinyin"]
            if surface_form not in pinyin_map and pinyin:
                pinyin_map[surface_form] = pinyin

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
    normalized_terms = [term.strip() for term in terms if isinstance(term, str) and term.strip()]
    if not normalized_terms:
        return {}

    _ensure_seeded_lexicon(data_root)
    db_path = ensure_lexicon_database(data_root)
    placeholders = ", ".join("?" for _ in normalized_terms)
    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            f"""
            SELECT id, language_code, entry_type, surface_form, pinyin, tone, definition, radical, stroke_count, hsk_level, frequency_rank, note, source_name, source_path
            FROM lexicon_entries
            WHERE language_code = ? AND surface_form IN ({placeholders})
            ORDER BY CASE entry_type WHEN 'word' THEN 0 ELSE 1 END, frequency_rank IS NULL, frequency_rank ASC, id ASC
            """,
            [language_code, *normalized_terms],
        ).fetchall()

    entry_map: dict[str, LexiconEntryRecord] = {}
    for row in rows:
        surface_form = row["surface_form"]
        if not surface_form or surface_form in entry_map:
            continue
        entry_map[surface_form] = LexiconEntryRecord(
            id=row["id"],
            language_code=row["language_code"],
            entry_type=row["entry_type"],
            surface_form=surface_form,
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

    return entry_map
