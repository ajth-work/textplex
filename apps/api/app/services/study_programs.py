from __future__ import annotations

import sqlite3
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.core.paths import get_lexicon_source_root
from app.schemas.surfaces import StudyProgramGroup, StudyProgramItem, StudyProgramLevel
from app.services.lexicon import ensure_lexicon_database, import_lexicon_from_source


@dataclass(frozen=True)
class StudyProgramLevelDefinition:
    code: str
    label: str
    introduction_note: str
    offset: int = 0
    limit: int = 0
    terms: tuple[str, ...] = ()


@dataclass(frozen=True)
class StudyProgramDefinition:
    program_code: str
    program_label: str
    language_code: str
    program_source_label: str
    levels: tuple[StudyProgramLevelDefinition, ...]


@dataclass(frozen=True)
class StudyProgramStarterTerm:
    pronunciation: str
    definition_short: str
    proficiency_level: str = "Starter"


# Terms preserve their source-pack order. Future levels only need another
# StudyProgramLevelDefinition with an ordered terms tuple (or range selector).
STUDY_PROGRAM_DEFINITIONS: tuple[StudyProgramDefinition, ...] = (
    StudyProgramDefinition(
        program_code="ru-core",
        program_label="Russian starter program",
        language_code="ru",
        program_source_label="RU5000",
        levels=(
            StudyProgramLevelDefinition("level-1", "Level 1", "Intro frequency core from RU5000.", offset=0, limit=24),
            StudyProgramLevelDefinition("level-2", "Level 2", "Early recognition slice from the same frequency backbone.", offset=24, limit=48),
            StudyProgramLevelDefinition("level-3", "Level 3", "Guided recall slice from the same frequency backbone.", offset=72, limit=96),
        ),
    ),
    StudyProgramDefinition(
        program_code="he-starter",
        program_label="Hebrew starter program",
        language_code="he",
        program_source_label="TextPlex Hebrew starter lexicon",
        levels=(
            StudyProgramLevelDefinition(
                "starter-1", "Starter 1", "Greetings, affirmation, and first-person essentials.",
                terms=("\u05d0\u05e0\u05d9", "\u05d0\u05ea\u05d4", "\u05db\u05df", "\u05dc\u05d0", "\u05ea\u05d5\u05d3\u05d4"),
            ),
            StudyProgramLevelDefinition(
                "starter-2", "Starter 2", "People and everyday nouns for simple introductions.",
                terms=("\u05e9\u05dc\u05d5\u05dd", "\u05de\u05d9\u05dd", "\u05d1\u05d9\u05ea", "\u05e1\u05e4\u05e8", "\u05d8\u05d5\u05d1"),
            ),
        ),
    ),
    StudyProgramDefinition(
        program_code="ar-starter",
        program_label="Arabic starter program",
        language_code="ar",
        program_source_label="TextPlex Arabic starter lexicon",
        levels=(
            StudyProgramLevelDefinition(
                "starter-1", "Starter 1", "Greetings, affirmation, and first-person essentials.",
                terms=("\u0623\u0646\u0627", "\u0623\u0646\u062a", "\u0646\u0639\u0645", "\u0644\u0627", "\u0634\u0643\u0631\u0627"),
            ),
            StudyProgramLevelDefinition(
                "starter-2", "Starter 2", "People and everyday nouns for simple introductions.",
                terms=("\u0645\u0631\u062d\u0628\u0627", "\u0645\u0627\u0621", "\u0628\u064a\u062a", "\u0643\u062a\u0627\u0628", "\u062c\u064a\u062f"),
            ),
        ),
    ),
    StudyProgramDefinition(
        program_code="ja-starter",
        program_label="Japanese starter program",
        language_code="ja",
        program_source_label="TextPlex Japanese starter lexicon",
        levels=(
            StudyProgramLevelDefinition(
                "starter-1", "Starter 1", "Greetings, affirmation, and first-person essentials.",
                terms=("\u79c1", "\u3042\u306a\u305f", "\u306f\u3044", "\u3044\u3044\u3048", "\u3042\u308a\u304c\u3068\u3046"),
            ),
            StudyProgramLevelDefinition(
                "starter-2", "Starter 2", "People and everyday nouns for simple introductions.",
                terms=("\u3053\u3093\u306b\u3061\u306f", "\u6c34", "\u5bb6", "\u672c", "\u826f\u3044"),
            ),
        ),
    ),
    StudyProgramDefinition(
        program_code="zh-starter",
        program_label="Chinese starter program",
        language_code="zh",
        program_source_label="Chinese Character Recognition vocabulary database",
        levels=(
            StudyProgramLevelDefinition(
                "starter-1", "Starter 1", "Greetings, affirmation, and first-person essentials.",
                terms=("\u6211", "\u4f60", "\u662f", "\u4e0d", "\u8c22\u8c22"),
            ),
            StudyProgramLevelDefinition(
                "starter-2", "Starter 2", "People and everyday nouns for simple introductions.",
                terms=("\u6c34", "\u5bb6", "\u4e66", "\u597d", "\u7231"),
            ),
        ),
    ),
)


# The first two levels are deliberately authored so each supported starter
# language remains usable while its larger lexicon pack is still optional.
# Future levels can reuse `terms` and add their details here or supply a pack.
STARTER_TERM_DETAILS: dict[tuple[str, str], StudyProgramStarterTerm] = {
    ("he", "שלום"): StudyProgramStarterTerm("shalom", "hello; peace"),
    ("he", "תודה"): StudyProgramStarterTerm("todah", "thank you"),
    ("he", "כן"): StudyProgramStarterTerm("ken", "yes"),
    ("he", "לא"): StudyProgramStarterTerm("lo", "no"),
    ("he", "אני"): StudyProgramStarterTerm("ani", "I; me"),
    ("he", "אתה"): StudyProgramStarterTerm("atah", "you"),
    ("he", "מים"): StudyProgramStarterTerm("mayim", "water"),
    ("he", "בית"): StudyProgramStarterTerm("bayit", "house; home"),
    ("he", "ספר"): StudyProgramStarterTerm("sefer", "book"),
    ("he", "טוב"): StudyProgramStarterTerm("tov", "good"),
    ("ar", "مرحبا"): StudyProgramStarterTerm("marhaban", "hello"),
    ("ar", "شكرا"): StudyProgramStarterTerm("shukran", "thank you"),
    ("ar", "نعم"): StudyProgramStarterTerm("naʿam", "yes"),
    ("ar", "لا"): StudyProgramStarterTerm("lā", "no"),
    ("ar", "أنا"): StudyProgramStarterTerm("anā", "I; me"),
    ("ar", "أنت"): StudyProgramStarterTerm("anta", "you"),
    ("ar", "ماء"): StudyProgramStarterTerm("māʾ", "water"),
    ("ar", "بيت"): StudyProgramStarterTerm("bayt", "house; home"),
    ("ar", "كتاب"): StudyProgramStarterTerm("kitāb", "book"),
    ("ar", "جيد"): StudyProgramStarterTerm("jayyid", "good"),
    ("ja", "こんにちは"): StudyProgramStarterTerm("konnichiwa", "hello"),
    ("ja", "ありがとう"): StudyProgramStarterTerm("arigatō", "thank you"),
    ("ja", "はい"): StudyProgramStarterTerm("hai", "yes"),
    ("ja", "いいえ"): StudyProgramStarterTerm("iie", "no"),
    ("ja", "私"): StudyProgramStarterTerm("watashi", "I; me"),
    ("ja", "あなた"): StudyProgramStarterTerm("anata", "you"),
    ("ja", "水"): StudyProgramStarterTerm("mizu", "water"),
    ("ja", "家"): StudyProgramStarterTerm("ie", "house; home"),
    ("ja", "本"): StudyProgramStarterTerm("hon", "book"),
    ("ja", "良い"): StudyProgramStarterTerm("yoi", "good"),
    ("zh", "谢谢"): StudyProgramStarterTerm("xièxie", "thank you"),
    ("zh", "是"): StudyProgramStarterTerm("shì", "to be"),
    ("zh", "不"): StudyProgramStarterTerm("bù", "not; no"),
    ("zh", "我"): StudyProgramStarterTerm("wǒ", "I; me"),
    ("zh", "你"): StudyProgramStarterTerm("nǐ", "you"),
    ("zh", "水"): StudyProgramStarterTerm("shuǐ", "water"),
    ("zh", "家"): StudyProgramStarterTerm("jiā", "house; home"),
    ("zh", "书"): StudyProgramStarterTerm("shū", "book"),
    ("zh", "好"): StudyProgramStarterTerm("hǎo", "good"),
    ("zh", "请"): StudyProgramStarterTerm("qǐng", "please"),
}

STARTER_TERM_DETAILS.update(
    {
        ("he", "את"): StudyProgramStarterTerm("at", "you (feminine)"),
        ("he", "הוא"): StudyProgramStarterTerm("hu", "he"),
        ("he", "היא"): StudyProgramStarterTerm("hi", "she"),
        ("he", "בבקשה"): StudyProgramStarterTerm("bevakasha", "please; you're welcome"),
        ("he", "אוכל"): StudyProgramStarterTerm("okhel", "food"),
        ("he", "משפחה"): StudyProgramStarterTerm("mishpacha", "family"),
        ("he", "חבר"): StudyProgramStarterTerm("chaver", "friend"),
        ("ar", "هو"): StudyProgramStarterTerm("huwa", "he"),
        ("ar", "هي"): StudyProgramStarterTerm("hiya", "she"),
        ("ar", "شكرًا"): StudyProgramStarterTerm("shukran", "thank you"),
        ("ar", "من فضلك"): StudyProgramStarterTerm("min faḍlik", "please"),
        ("ar", "طعام"): StudyProgramStarterTerm("ṭaʿām", "food"),
        ("ar", "أسرة"): StudyProgramStarterTerm("usra", "family"),
        ("ar", "صديق"): StudyProgramStarterTerm("ṣadīq", "friend"),
        ("ar", "مدرسة"): StudyProgramStarterTerm("madrasa", "school"),
        ("ja", "彼"): StudyProgramStarterTerm("kare", "he; boyfriend"),
        ("ja", "彼女"): StudyProgramStarterTerm("kanojo", "she; girlfriend"),
        ("ja", "お願いします"): StudyProgramStarterTerm("onegaishimasu", "please"),
        ("ja", "食べ物"): StudyProgramStarterTerm("tabemono", "food"),
        ("ja", "家族"): StudyProgramStarterTerm("kazoku", "family"),
        ("ja", "友達"): StudyProgramStarterTerm("tomodachi", "friend"),
        ("ja", "学校"): StudyProgramStarterTerm("gakkō", "school"),
        ("zh", "他"): StudyProgramStarterTerm("tā", "he; him"),
        ("zh", "她"): StudyProgramStarterTerm("tā", "she; her"),
        ("zh", "再见"): StudyProgramStarterTerm("zàijiàn", "goodbye"),
        ("zh", "吃"): StudyProgramStarterTerm("chī", "to eat"),
        ("zh", "学校"): StudyProgramStarterTerm("xuéxiào", "school"),
        ("zh", "朋友"): StudyProgramStarterTerm("péngyou", "friend"),
        ("zh", "老师"): StudyProgramStarterTerm("lǎoshī", "teacher"),
    }
)

# Unicode escapes keep the curriculum data stable regardless of the shell's
# active code page when these source files are edited on Windows.
STARTER_TERM_DETAILS.update(
    {
        ("he", "\u05d4\u05d9\u05d0"): StudyProgramStarterTerm("hi", "she"),
        ("ar", "\u0647\u0648"): StudyProgramStarterTerm("huwa", "he"),
        ("ar", "\u0647\u064a"): StudyProgramStarterTerm("hiya", "she"),
        ("ar", "\u0634\u0643\u0631\u0627\u064b"): StudyProgramStarterTerm("shukran", "thank you"),
        ("ar", "\u0645\u0646 \u0641\u0636\u0644\u0643"): StudyProgramStarterTerm("min fadlik", "please"),
        ("ar", "\u0637\u0639\u0627\u0645"): StudyProgramStarterTerm("ta'am", "food"),
        ("ar", "\u0623\u0633\u0631\u0629"): StudyProgramStarterTerm("usra", "family"),
        ("ar", "\u0635\u062f\u064a\u0642"): StudyProgramStarterTerm("sadiq", "friend"),
        ("ar", "\u0645\u062f\u0631\u0633\u0629"): StudyProgramStarterTerm("madrasa", "school"),
        ("ja", "\u5f7c"): StudyProgramStarterTerm("kare", "he"),
        ("ja", "\u5f7c\u5973"): StudyProgramStarterTerm("kanojo", "she"),
        ("ja", "\u304a\u9858\u3044\u3057\u307e\u3059"): StudyProgramStarterTerm("onegaishimasu", "please"),
        ("ja", "\u98df\u3079\u7269"): StudyProgramStarterTerm("tabemono", "food"),
        ("ja", "\u5bb6\u65cf"): StudyProgramStarterTerm("kazoku", "family"),
        ("ja", "\u53cb\u9054"): StudyProgramStarterTerm("tomodachi", "friend"),
        ("ja", "\u5b66\u6821"): StudyProgramStarterTerm("gakkō", "school"),
        ("zh", "\u4ed6"): StudyProgramStarterTerm("tā", "he"),
        ("zh", "\u5979"): StudyProgramStarterTerm("tā", "she"),
        ("zh", "\u518d\u89c1"): StudyProgramStarterTerm("zàijiàn", "goodbye"),
        ("zh", "\u5403"): StudyProgramStarterTerm("chī", "eat"),
        ("zh", "\u5b66\u6821"): StudyProgramStarterTerm("xuéxiào", "school"),
        ("zh", "\u670b\u53cb"): StudyProgramStarterTerm("péngyou", "friend"),
        ("zh", "\u8001\u5e08"): StudyProgramStarterTerm("lǎoshī", "teacher"),
    }
)


def _normalized_language_code(language_code: str) -> str:
    return language_code.split("-", 1)[0].strip().lower()


def _language_label(language_code: str) -> str:
    labels = {"ar": "Arabic", "he": "Hebrew", "ja": "Japanese", "ru": "Russian", "zh": "Chinese"}
    normalized = _normalized_language_code(language_code)
    return labels.get(normalized, language_code.upper() if language_code else "Unknown")


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
    if source_root.exists():
        import_lexicon_from_source(source_root, data_root=data_root, language_code=language_code, replace_existing=False)


def _table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    return connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (table_name,)
    ).fetchone() is not None


def _load_progress_map(connection: sqlite3.Connection, language_code: str) -> dict[str, sqlite3.Row]:
    if not _table_exists(connection, "vocabulary_progress"):
        return {}
    rows = connection.execute(
        "SELECT lemma, state, confidence_score, first_seen_at, last_seen_at FROM vocabulary_progress WHERE language_code = ?",
        (language_code,),
    ).fetchall()
    return {str(row["lemma"]): row for row in rows if row["lemma"]}


def _load_saved_count_map(connection: sqlite3.Connection, language_code: str) -> dict[str, int]:
    if not _table_exists(connection, "study_vocabulary_items"):
        return {}
    rows = connection.execute(
        "SELECT lemma, COUNT(*) AS saved_count FROM study_vocabulary_items WHERE language_code = ? GROUP BY lemma",
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
    if level_definition.terms:
        placeholders = ", ".join("?" for _ in level_definition.terms)
        matched_rows = connection.execute(
            f"""
            SELECT surface_form, pinyin AS pronunciation, definition, hsk_level, frequency_rank
            FROM lexicon_entries
            WHERE language_code = ? AND entry_type = 'word' AND surface_form IN ({placeholders})
            """,
            (language_code, *level_definition.terms),
        ).fetchall()
        rows_by_surface = {str(row["surface_form"]): row for row in matched_rows}
        items: list[StudyProgramItem] = []
        for rank, term in enumerate(level_definition.terms, start=1):
            row = rows_by_surface.get(term)
            starter_term = STARTER_TERM_DETAILS.get((language_code, term))
            if row is None and starter_term is None:
                continue
            progress_row = progress_map.get(term)
            items.append(
                StudyProgramItem(
                    language_code=language_code,
                    language_label=_language_label(language_code),
                    program_code=program_definition.program_code,
                    program_label=program_definition.program_label,
                    program_source_label=program_definition.program_source_label,
                    level_code=level_definition.code,
                    level_label=level_definition.label,
                    lemma=term,
                    display_form=term,
                    pronunciation=(str(row["pronunciation"] or "").strip() or None) if row else starter_term.pronunciation,
                    definition_short=(str(row["definition"] or "").strip() or None) if row else starter_term.definition_short,
                    proficiency_level=(str(row["hsk_level"] or "").strip() or None) if row else starter_term.proficiency_level,
                    frequency_rank=int(row["frequency_rank"]) if row and row["frequency_rank"] is not None else rank,
                    progress_state=_coerce_progress_state(progress_row["state"] if progress_row else None),
                    confidence_score=float(progress_row["confidence_score"]) if progress_row and progress_row["confidence_score"] is not None else None,
                    saved_count=saved_count_map.get(term, 0),
                    first_seen_at=str(progress_row["first_seen_at"]) if progress_row and progress_row["first_seen_at"] else None,
                    last_seen_at=str(progress_row["last_seen_at"]) if progress_row and progress_row["last_seen_at"] else None,
                )
            )
        return items
    else:
        rows = connection.execute(
            """
            SELECT surface_form, pinyin AS pronunciation, definition, hsk_level, frequency_rank
            FROM lexicon_entries
            WHERE language_code = ? AND entry_type = 'word'
            ORDER BY frequency_rank IS NULL, frequency_rank ASC, surface_form ASC
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


def build_study_program_groups(data_root: Path, *, language_code: str | None = None) -> list[StudyProgramGroup]:
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
                if items:
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
