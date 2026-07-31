from __future__ import annotations

from contextlib import closing
from dataclasses import dataclass
import sqlite3
from pathlib import Path
from typing import Any

from app.core.paths import get_lexicon_source_root
from app.services.lexicon import ensure_lexicon_database, import_lexicon_from_source
from app.schemas.surfaces import StudyProgramGroup, StudyProgramItem, StudyProgramLevel


@dataclass(frozen=True)
class StudyProgramLevelDefinition:
    code: str
    label: str
    introduction_note: str
    offset: int
    limit: int


@dataclass(frozen=True)
class StudyProgramDefinition:
    program_code: str
    program_label: str
    language_code: str
    program_source_label: str
    levels: tuple[StudyProgramLevelDefinition, ...]


STUDY_PROGRAM_DEFINITIONS: tuple[StudyProgramDefinition, ...] = (
    StudyProgramDefinition(
        program_code="ru-core",
        program_label="Russian starter program",
        language_code="ru",
        program_source_label="RU5000",
        levels=(
            StudyProgramLevelDefinition(
                code="level-1",
                label="Level 1",
                introduction_note="Intro frequency core from RU5000.",
                offset=0,
                limit=24,
            ),
            StudyProgramLevelDefinition(
                code="level-2",
                label="Level 2",
                introduction_note="Early recognition slice from the same frequency backbone.",
                offset=24,
                limit=48,
            ),
            StudyProgramLevelDefinition(
                code="level-3",
                label="Level 3",
                introduction_note="Guided recall slice from the same frequency backbone.",
                offset=72,
                limit=96,
            ),
        ),
    ),
)


def _normalized_language_code(language_code: str) -> str:
    return language_code.split("-", 1)[0].strip().lower()


def _language_label(language_code: str) -> str:
    normalized = _normalized_language_code(language_code)
    if normalized.startswith("ru"):
        return "Russian"
    return language_code.upper() if language_code else "Unknown"


def _ensure_program_lexicon(data_root: Path, language_code: str) -> None:
    db_path = ensure_lexicon_database(data_root)
    with closing(sqlite3.connect(db_path)) as connection:
        row = connection.execute(
            "SELECT COUNT(*) FROM lexicon_entries WHERE language_code = ? AND entry_type = 'word'",
            (language_code,),
        ).fetchone()
    if row and int(row[0] or 0) > 0:
        return

    source_root = get_lexicon_source_root(language_code)
    if not source_root.exists():
        return

    import_lexicon_from_source(source_root, data_root=data_root, language_code=language_code, replace_existing=False)


def _table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def _load_progress_map(connection: sqlite3.Connection, language_code: str) -> dict[str, sqlite3.Row]:
    if not _table_exists(connection, "vocabulary_progress"):
        return {}

    rows = connection.execute(
        """
        SELECT lemma, state, confidence_score, first_seen_at, last_seen_at
        FROM vocabulary_progress
        WHERE language_code = ?
        """,
        (language_code,),
    ).fetchall()
    return {str(row["lemma"]): row for row in rows if row["lemma"]}


def _load_saved_count_map(connection: sqlite3.Connection, language_code: str) -> dict[str, int]:
    if not _table_exists(connection, "study_vocabulary_items"):
        return {}

    rows = connection.execute(
        """
        SELECT lemma, COUNT(*) AS saved_count
        FROM study_vocabulary_items
        WHERE language_code = ?
        GROUP BY lemma
        """,
        (language_code,),
    ).fetchall()
    return {str(row["lemma"]): int(row["saved_count"] or 0) for row in rows if row["lemma"]}


def _coerce_progress_state(value: Any) -> str:
    text = str(value or "").strip().lower()
    return text if text in {"new", "learning", "review", "mastered"} else "new"


def _program_items_for_level(
    *,
    connection: sqlite3.Connection,
    progress_map: dict[str, sqlite3.Row],
    saved_count_map: dict[str, int],
    language_code: str,
    program_definition: StudyProgramDefinition,
    level_definition: StudyProgramLevelDefinition,
) -> list[StudyProgramItem]:
    rows = connection.execute(
        """
        SELECT surface_form, pinyin AS pronunciation, definition, hsk_level, frequency_rank
        FROM lexicon_entries
        WHERE language_code = ? AND entry_type = 'word'
        ORDER BY
            frequency_rank IS NULL,
            frequency_rank ASC,
            surface_form ASC
        LIMIT ? OFFSET ?
        """,
        (language_code, level_definition.limit, level_definition.offset),
    ).fetchall()

    items: list[StudyProgramItem] = []
    for row in rows:
        surface_form = str(row["surface_form"] or "").strip()
        if not surface_form:
            continue
        progress_row = progress_map.get(surface_form)
        items.append(
            StudyProgramItem(
                language_code=language_code,
                language_label=_language_label(language_code),
                program_code=program_definition.program_code,
                program_label=program_definition.program_label,
                program_source_label=program_definition.program_source_label,
                level_code=level_definition.code,
                level_label=level_definition.label,
                lemma=surface_form,
                display_form=surface_form,
                pronunciation=str(row["pronunciation"] or "").strip() or None,
                definition_short=str(row["definition"] or "").strip() or None,
                proficiency_level=str(row["hsk_level"] or "").strip() or None,
                frequency_rank=int(row["frequency_rank"]) if row["frequency_rank"] is not None else None,
                progress_state=_coerce_progress_state(progress_row["state"] if progress_row else None),
                confidence_score=float(progress_row["confidence_score"]) if progress_row and progress_row["confidence_score"] is not None else None,
                saved_count=saved_count_map.get(surface_form, 0),
                first_seen_at=str(progress_row["first_seen_at"]) if progress_row and progress_row["first_seen_at"] else None,
                last_seen_at=str(progress_row["last_seen_at"]) if progress_row and progress_row["last_seen_at"] else None,
            )
        )

    return items


def build_study_program_groups(
    data_root: Path,
    *,
    language_code: str | None = None,
) -> list[StudyProgramGroup]:
    normalized_filter = _normalized_language_code(language_code) if language_code else None
    groups: list[StudyProgramGroup] = []

    for program_definition in STUDY_PROGRAM_DEFINITIONS:
        if normalized_filter and not program_definition.language_code.startswith(normalized_filter):
            continue

        _ensure_program_lexicon(data_root, program_definition.language_code)
        db_path = ensure_lexicon_database(data_root)
        with closing(sqlite3.connect(db_path)) as connection:
            connection.row_factory = sqlite3.Row
            progress_map = _load_progress_map(connection, program_definition.language_code)
            saved_count_map = _load_saved_count_map(connection, program_definition.language_code)
            levels: list[StudyProgramLevel] = []

            for level_definition in program_definition.levels:
                items = _program_items_for_level(
                    connection=connection,
                    progress_map=progress_map,
                    saved_count_map=saved_count_map,
                    language_code=program_definition.language_code,
                    program_definition=program_definition,
                    level_definition=level_definition,
                )
                if not items:
                    continue
                levels.append(
                    StudyProgramLevel(
                        level_code=level_definition.code,
                        level_label=level_definition.label,
                        item_count=len(items),
                        introduction_note=level_definition.introduction_note,
                        items=items,
                    )
                )

        if levels:
            groups.append(
                StudyProgramGroup(
                    language_code=program_definition.language_code,
                    language_label=_language_label(program_definition.language_code),
                    program_code=program_definition.program_code,
                    program_label=program_definition.program_label,
                    program_source_label=program_definition.program_source_label,
                    level_count=len(levels),
                    levels=levels,
                )
            )

    return groups
