from __future__ import annotations

import json
import logging
import os
import sqlite3
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.schemas.generated_articles import (
    GeneratedArticleTerm,
    GeneratedReaderArticlePromptDetails,
    GeneratedReaderArticleRequest,
    GeneratedReaderArticleResponse,
)
from app.services.book_extraction import import_text_into_book
from app.services.learning_profile import ensure_profile_database
from app.services.lexicon import ensure_lexicon_database, lookup_lexicon_entry_map
from app.services.study_programs import build_study_program_groups

logger = logging.getLogger(__name__)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_GENERATION_MODEL = "gpt-5.4-mini"
DEFAULT_MAX_OUTPUT_TOKENS = 4096
ARTICLE_PROMPT_VERSION = "reader-article-v1"
GENERATED_ARTICLE_PROMPT_FILENAME = "generation.json"
GENRE_DEFAULT_TOPICS = {
    "everyday": "daily life and routine",
    "travel": "travel planning and transit",
    "news": "a local news update",
    "dialogue": "a short conversation",
    "workplace": "work tasks and coordination",
    "family": "family plans and errands",
    "school": "classroom life and study",
    "mystery": "a small household mystery",
    "science": "a simple science explanation",
    "culture": "a festival or cultural habit",
    "food": "a meal, market, or recipe",
}
GENRE_LABELS = {
    "everyday": "everyday",
    "travel": "travel",
    "news": "news",
    "dialogue": "dialogue",
    "workplace": "workplace",
    "family": "family",
    "school": "school",
    "mystery": "mystery",
    "science": "science",
    "culture": "culture",
    "food": "food",
}
TONE_LABELS = {
    "explanatory": "explanatory",
    "narrative": "narrative",
    "journalistic": "journalistic",
    "conversational": "conversational",
    "reflective": "reflective",
}
EXAM_LEVEL_ORDER = {
    "zh": [
        "HSK 1",
        "HSK 2",
        "HSK 3",
        "HSK 4",
        "HSK 5",
        "HSK 6",
    ],
    "ja": [
        "JLPT N5",
        "JLPT N4",
        "JLPT N3",
        "JLPT N2",
        "JLPT N1",
    ],
    "ko": [
        "TOPIK 1",
        "TOPIK 2",
        "TOPIK 3",
        "TOPIK 4",
        "TOPIK 5",
        "TOPIK 6",
    ],
    "ru": [
        "TRKI A1",
        "TRKI A2",
        "TRKI B1",
        "TRKI B2",
        "TRKI C1",
        "TRKI C2",
    ],
    "ar": [
        "ACTFL Novice Low",
        "ACTFL Novice Mid",
        "ACTFL Novice High",
        "ACTFL Intermediate Low",
        "ACTFL Intermediate Mid",
        "ACTFL Intermediate High",
        "ACTFL Advanced Low",
        "ACTFL Advanced Mid",
        "ACTFL Advanced High",
    ],
}


@dataclass(frozen=True)
class ArticleWindow:
    known_terms: list[GeneratedArticleTerm]
    recent_terms: list[GeneratedArticleTerm]
    upcoming_terms: list[GeneratedArticleTerm]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _normalized_language_code(language_code: str) -> str:
    return language_code.split("-", 1)[0].strip().lower()


def _language_label(language_code: str) -> str:
    normalized = _normalized_language_code(language_code)
    if normalized.startswith("zh"):
        return "Chinese"
    if normalized.startswith("ja"):
        return "Japanese"
    if normalized.startswith("ko"):
        return "Korean"
    if normalized.startswith("ru"):
        return "Russian"
    if normalized.startswith("he"):
        return "Hebrew"
    if normalized.startswith("ar"):
        return "Arabic"
    if normalized == "local":
        return "Local"
    return language_code.upper() if language_code else "Unknown"


def _genre_label(genre: str) -> str:
    normalized = genre.strip().lower()
    return GENRE_LABELS.get(normalized, normalized or "everyday")


def _tone_label(tone: str) -> str:
    normalized = tone.strip().lower()
    return TONE_LABELS.get(normalized, normalized or "explanatory")


def _default_topic(language_code: str, genre: str) -> str:
    normalized_genre = genre.strip().lower()
    if normalized_genre in GENRE_DEFAULT_TOPICS:
        return GENRE_DEFAULT_TOPICS[normalized_genre]
    normalized = _normalized_language_code(language_code)
    return {
        "zh": "daily life in a city",
        "ja": "commuting and everyday planning",
        "ko": "travel planning and routine",
        "ru": "daily errands and neighborhood life",
        "he": "family routine and daily planning",
        "ar": "market errands and family routine",
    }.get(normalized, "everyday life")


def _normalize_curriculum_mode(mode: str | None) -> str:
    normalized = (mode or "auto").strip().lower()
    return normalized if normalized in {"auto", "study_program", "exam"} else "auto"


def _normalized_level_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _study_program_level_index(study_program_groups: list[Any], curriculum_level: str | None) -> tuple[int | None, str | None]:
    normalized = _normalized_level_text(curriculum_level)
    if not normalized:
        return None, None
    for group in study_program_groups:
        for level_index, level in enumerate(group.levels):
            candidates = {
                _normalized_level_text(level.level_code),
                _normalized_level_text(level.level_label),
                _normalized_level_text(f"{group.program_code}:{level.level_code}"),
            }
            if normalized in candidates:
                return level_index, level.level_label
    return None, None


def _proficiency_rank(language_code: str, value: str | None) -> int | None:
    normalized_value = _normalized_level_text(value)
    if not normalized_value:
        return None

    normalized_language = _normalized_language_code(language_code)
    if normalized_language == "zh":
        match = re.search(r"hsk\s*(\d)", normalized_value)
        return int(match.group(1)) if match else None
    if normalized_language == "ja":
        match = re.search(r"jlpt\s*n([1-5])", normalized_value)
        if not match:
            return None
        return 6 - int(match.group(1))
    if normalized_language == "ko":
        match = re.search(r"topik\s*([1-6])", normalized_value)
        return int(match.group(1)) if match else None
    if normalized_language == "ru":
        rank_map = {
            "trki a1": 1,
            "a1": 1,
            "trki a2": 2,
            "a2": 2,
            "trki b1": 3,
            "b1": 3,
            "trki b2": 4,
            "b2": 4,
            "trki c1": 5,
            "c1": 5,
            "trki c2": 6,
            "c2": 6,
        }
        return rank_map.get(normalized_value)
    if normalized_language == "ar":
        rank_map = {
            "actfl novice low": 1,
            "novice low": 1,
            "actfl novice mid": 2,
            "novice mid": 2,
            "actfl novice high": 3,
            "novice high": 3,
            "actfl intermediate low": 4,
            "intermediate low": 4,
            "actfl intermediate mid": 5,
            "intermediate mid": 5,
            "actfl intermediate high": 6,
            "intermediate high": 6,
            "actfl advanced low": 7,
            "advanced low": 7,
            "actfl advanced mid": 8,
            "advanced mid": 8,
            "actfl advanced high": 9,
            "advanced high": 9,
        }
        return rank_map.get(normalized_value)
    return None


def _within_curriculum_ceiling(
    *,
    language_code: str,
    curriculum_mode: str,
    curriculum_level: str | None,
    level_index: int | None = None,
    proficiency_level: str | None = None,
    ceiling_level_index: int | None = None,
    ceiling_rank: int | None = None,
) -> bool:
    if curriculum_mode == "study_program" and ceiling_level_index is not None and level_index is not None:
        return level_index <= ceiling_level_index
    if curriculum_mode == "exam" and ceiling_rank is not None:
        item_rank = _proficiency_rank(language_code, proficiency_level)
        if item_rank is None:
            return True
        return item_rank <= ceiling_rank
    return True


def _openai_api_key() -> str:
    return os.getenv("OPENAI_API_KEY", "").strip()


def _openai_model() -> str:
    model = os.getenv("OPENAI_OCR_MODEL", DEFAULT_GENERATION_MODEL).strip()
    return model or DEFAULT_GENERATION_MODEL


def _table_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {str(row[1]) for row in rows if len(row) > 1}


def _max_output_tokens() -> int:
    raw_value = os.getenv("OPENAI_OCR_MAX_OUTPUT_TOKENS", str(DEFAULT_MAX_OUTPUT_TOKENS)).strip()
    try:
        return max(512, int(raw_value))
    except ValueError:
        return DEFAULT_MAX_OUTPUT_TOKENS


def _response_text(payload: dict[str, object]) -> str:
    direct_text = payload.get("output_text")
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    chunks: list[str] = []
    for item in payload.get("output", []):
        if not isinstance(item, dict) or item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if not isinstance(content, dict):
                continue
            if content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str):
                    chunks.append(text)
    return "".join(chunks).strip()


def _json_object_from_text(text: str) -> dict[str, Any] | None:
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
        if candidate.startswith("json"):
            candidate = candidate[4:].strip()
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start < 0 or end < 0 or end <= start:
        return None
    fragment = candidate[start : end + 1]
    try:
        loaded = json.loads(fragment)
    except json.JSONDecodeError:
        return None
    return loaded if isinstance(loaded, dict) else None


def _term_key(term: str) -> str:
    return term.strip().casefold()


def _term_from_row(
    term: str,
    *,
    pronunciation: str | None = None,
    definition_short: str | None = None,
    frequency_rank: int | None = None,
    confidence_score: float | None = None,
    mastery_level: str | None = None,
) -> GeneratedArticleTerm:
    return GeneratedArticleTerm(
        term=term.strip(),
        pronunciation=pronunciation or None,
        definition_short=definition_short or None,
        frequency_rank=frequency_rank,
        confidence_score=confidence_score,
        mastery_level=mastery_level,
    )


def _select_window_terms(
    data_root: Path,
    *,
    language_code: str,
    request: GeneratedReaderArticleRequest,
    owner_id: str | None,
) -> ArticleWindow:
    profile_db = ensure_profile_database(data_root, owner_id)
    lexicon_db = ensure_lexicon_database(data_root)
    normalized_language_code = _normalized_language_code(language_code)
    curriculum_mode = _normalize_curriculum_mode(request.curriculum_mode)
    requested_curriculum_level = request.curriculum_level.strip() if isinstance(request.curriculum_level, str) and request.curriculum_level.strip() else None

    with sqlite3.connect(profile_db) as connection:
        connection.row_factory = sqlite3.Row
        study_columns = _table_columns(connection, "study_vocabulary_items")
        study_proficiency_select = "proficiency_level" if "proficiency_level" in study_columns else "NULL AS proficiency_level"
        progress_rows = connection.execute(
            """
            SELECT lemma, state, confidence_score, raw_exposures, weighted_exposure, first_seen_at, last_seen_at
            FROM vocabulary_progress
            WHERE language_code = ?
            ORDER BY
                CASE COALESCE(manual_override, state)
                    WHEN 'mastered' THEN 0
                    WHEN 'review' THEN 1
                    WHEN 'learning' THEN 2
                    ELSE 3
                END,
                confidence_score DESC,
                weighted_exposure DESC,
                last_seen_at DESC,
                lemma ASC
            LIMIT ?
            """,
            (normalized_language_code, request.known_lemma_limit + request.recent_lemma_limit + request.upcoming_lemma_limit + 24),
        ).fetchall()
        study_rows = connection.execute(
            f"""
            SELECT lemma, display_form, pronunciation, romanization, definition_short, {study_proficiency_select}, click_count, first_seen_at, last_seen_at
            FROM study_vocabulary_items
            WHERE language_code = ?
            ORDER BY last_seen_at DESC, click_count DESC, lemma ASC
            LIMIT ?
            """,
            (normalized_language_code, request.known_lemma_limit + request.recent_lemma_limit + 24),
        ).fetchall()

    progress_terms = [
        {
            "term": str(row["lemma"]).strip(),
            "mastery_level": str(row["state"] or "new").strip().lower(),
            "confidence_score": float(row["confidence_score"] or 0.0),
        }
        for row in progress_rows
        if str(row["lemma"]).strip()
    ]
    study_terms = [
        {
            "term": str(row["lemma"]).strip(),
            "pronunciation": str(row["pronunciation"] or row["romanization"] or "").strip() or None,
            "definition_short": str(row["definition_short"] or "").strip() or None,
            "proficiency_level": str(row["proficiency_level"] or "").strip() or None,
            "mastery_level": "study",
            "confidence_score": None,
        }
        for row in study_rows
        if str(row["lemma"]).strip()
    ]

    known_terms = [
        _term_from_row(
            row["term"],
            mastery_level=row["mastery_level"],
            confidence_score=row["confidence_score"],
        )
        for row in progress_terms
        if row["mastery_level"] == "mastered" or row["confidence_score"] >= 0.65
    ][: request.known_lemma_limit]

    known_keys = {_term_key(term.term) for term in known_terms}
    recent_candidates: list[GeneratedArticleTerm] = []
    for row in study_terms:
        if _term_key(row["term"]) in known_keys:
            continue
        if not _within_curriculum_ceiling(
            language_code=normalized_language_code,
            curriculum_mode=curriculum_mode,
            curriculum_level=requested_curriculum_level,
            proficiency_level=row["proficiency_level"],
        ):
            continue
        recent_candidates.append(
            _term_from_row(
                row["term"],
                pronunciation=row["pronunciation"],
                definition_short=row["definition_short"],
                mastery_level=row["proficiency_level"] or "study",
            )
        )
    for row in progress_terms:
        term_key = _term_key(row["term"])
        if term_key in known_keys or term_key in {_term_key(term.term) for term in recent_candidates}:
            continue
        if row["mastery_level"] in {"review", "learning"} or row["confidence_score"] >= 0.3:
            if not _within_curriculum_ceiling(
                language_code=normalized_language_code,
                curriculum_mode=curriculum_mode,
                curriculum_level=requested_curriculum_level,
                proficiency_level=row["mastery_level"],
            ):
                continue
            recent_candidates.append(
                _term_from_row(
                    row["term"],
                    mastery_level=row["mastery_level"],
                    confidence_score=row["confidence_score"],
                )
            )
    recent_terms = recent_candidates[: request.recent_lemma_limit]

    recent_keys = known_keys | {_term_key(term.term) for term in recent_terms}
    upcoming_candidates: list[GeneratedArticleTerm] = []
    study_program_groups = build_study_program_groups(data_root, language_code=normalized_language_code)
    ceiling_level_index: int | None = None
    if curriculum_mode == "study_program" and requested_curriculum_level:
        ceiling_level_index, _ = _study_program_level_index(study_program_groups, requested_curriculum_level)
    ceiling_rank = _proficiency_rank(language_code, requested_curriculum_level) if curriculum_mode == "exam" else None
    for group in study_program_groups:
        if _normalized_language_code(group.language_code) != normalized_language_code:
            continue
        for level_index, level in enumerate(group.levels):
            if not _within_curriculum_ceiling(
                language_code=normalized_language_code,
                curriculum_mode=curriculum_mode,
                curriculum_level=requested_curriculum_level,
                level_index=level_index,
                ceiling_level_index=ceiling_level_index,
                ceiling_rank=ceiling_rank,
            ):
                continue
            for item in level.items:
                if _term_key(item.lemma) in recent_keys:
                    continue
                if not _within_curriculum_ceiling(
                    language_code=normalized_language_code,
                    curriculum_mode=curriculum_mode,
                    curriculum_level=requested_curriculum_level,
                    proficiency_level=item.proficiency_level,
                    ceiling_level_index=ceiling_level_index,
                    ceiling_rank=ceiling_rank,
                ):
                    continue
                upcoming_candidates.append(
                    _term_from_row(
                        item.lemma,
                        pronunciation=item.pronunciation,
                        definition_short=item.definition_short,
                        frequency_rank=item.frequency_rank,
                        mastery_level=item.progress_state,
                        confidence_score=item.confidence_score,
                    )
                )
    if not upcoming_candidates:
        with sqlite3.connect(lexicon_db) as connection:
            connection.row_factory = sqlite3.Row
            lexicon_columns = _table_columns(connection, "lexicon_entries")
            lexicon_proficiency_select = "proficiency_level" if "proficiency_level" in lexicon_columns else "NULL AS proficiency_level"
            rows = connection.execute(
                f"""
                SELECT surface_form, pinyin AS pronunciation, definition, frequency_rank, hsk_level, {lexicon_proficiency_select}
                FROM lexicon_entries
                WHERE language_code = ? AND entry_type = 'word'
                ORDER BY frequency_rank IS NULL, frequency_rank ASC, surface_form ASC
                LIMIT ?
                """,
                (normalized_language_code, request.upcoming_lemma_limit + 48),
            ).fetchall()
        for row in rows:
            surface_form = str(row["surface_form"] or "").strip()
            if not surface_form or _term_key(surface_form) in recent_keys:
                continue
            row_proficiency_level = str(row["hsk_level"] or row["proficiency_level"] or "").strip() or None
            if not _within_curriculum_ceiling(
                language_code=normalized_language_code,
                curriculum_mode=curriculum_mode,
                curriculum_level=requested_curriculum_level,
                proficiency_level=row_proficiency_level,
                ceiling_level_index=ceiling_level_index,
                ceiling_rank=ceiling_rank,
            ):
                continue
            upcoming_candidates.append(
                _term_from_row(
                    surface_form,
                    pronunciation=str(row["pronunciation"] or "").strip() or None,
                    definition_short=str(row["definition"] or "").strip() or None,
                    frequency_rank=int(row["frequency_rank"]) if row["frequency_rank"] is not None else None,
                    mastery_level=row_proficiency_level,
                )
            )

    upcoming_terms = upcoming_candidates[: request.upcoming_lemma_limit]

    all_terms = known_terms + recent_terms + upcoming_terms
    lookup_terms = {term.term for term in all_terms}
    lookup_map = lookup_lexicon_entry_map(data_root=data_root, language_code=normalized_language_code, terms=lookup_terms)
    enriched_known_terms = [_enrich_term(term, lookup_map.get(term.term)) for term in known_terms]
    enriched_recent_terms = [_enrich_term(term, lookup_map.get(term.term)) for term in recent_terms]
    enriched_upcoming_terms = [_enrich_term(term, lookup_map.get(term.term)) for term in upcoming_terms]
    return ArticleWindow(
        known_terms=enriched_known_terms,
        recent_terms=enriched_recent_terms,
        upcoming_terms=enriched_upcoming_terms,
    )


def _enrich_term(term: GeneratedArticleTerm, lexicon_entry: Any | None) -> GeneratedArticleTerm:
    if lexicon_entry is None:
        return term
    pronunciation = term.pronunciation or getattr(lexicon_entry, "pinyin", None) or None
    definition_short = term.definition_short or getattr(lexicon_entry, "definition", None) or None
    frequency_rank = term.frequency_rank if term.frequency_rank is not None else getattr(lexicon_entry, "frequency_rank", None)
    return term.model_copy(
        update={
            "pronunciation": pronunciation,
            "definition_short": definition_short,
            "frequency_rank": frequency_rank,
        }
    )


def _template_article(
    *,
    language_code: str,
    topic: str,
    sentence_count: int,
    window: ArticleWindow,
) -> tuple[str, int]:
    language_label = _language_label(language_code)
    separator = "。" if _normalized_language_code(language_code) in {"zh", "ja", "ko"} else "."
    seed_terms = [term.term for term in (window.known_terms + window.recent_terms + window.upcoming_terms) if term.term]
    if not seed_terms:
        seed_terms = [topic]

    sentences: list[str] = []
    cycle_index = 0
    while len(sentences) < sentence_count:
        known = window.known_terms[cycle_index % len(window.known_terms)].term if window.known_terms else seed_terms[cycle_index % len(seed_terms)]
        recent = window.recent_terms[cycle_index % len(window.recent_terms)].term if window.recent_terms else seed_terms[(cycle_index + 1) % len(seed_terms)]
        upcoming = window.upcoming_terms[cycle_index % len(window.upcoming_terms)].term if window.upcoming_terms else seed_terms[(cycle_index + 2) % len(seed_terms)]
        sentences.append(f"{known} {recent} {upcoming}".strip())
        cycle_index += 1

    article_text = f"{separator} ".join(sentences)
    if not article_text.endswith(separator):
        article_text = f"{article_text}{separator}"
    return article_text, len(sentences)


def _build_prompt(
    *,
    language_code: str,
    topic: str,
    genre: str,
    tone: str,
    curriculum_mode: str,
    curriculum_level: str | None,
    sentence_count: int,
    max_new_lemmas: int,
    window: ArticleWindow,
) -> str:
    payload = {
        "language_code": language_code,
        "language_label": _language_label(language_code),
        "topic": topic,
        "genre": genre,
        "tone": tone,
        "curriculum_mode": curriculum_mode,
        "curriculum_level": curriculum_level,
        "sentence_count": sentence_count,
        "max_new_lemmas": max_new_lemmas,
        "known_terms": [term.model_dump() for term in window.known_terms],
        "recent_terms": [term.model_dump() for term in window.recent_terms],
        "upcoming_terms": [term.model_dump() for term in window.upcoming_terms],
    }
    return (
        "You write learner-calibrated reading passages for TextPlex.\n"
        "Return only valid JSON. Do not add markdown, headings, or commentary.\n"
        "Create one coherent article in the target language that is exactly the requested sentence count.\n"
        "Match the requested genre and tone, and keep vocabulary at or below the requested curriculum ceiling when one is provided.\n"
        "Use the known terms heavily, reuse the recent terms naturally, and introduce the upcoming terms gently.\n"
        "Do not exceed the new-lemma budget. Keep the wording concrete and readable.\n"
        "Return a JSON object with article_text, used_known_terms, used_recent_terms, used_upcoming_terms, unknown_lemma_count, and sentence_count.\n"
        f"Request payload: {json.dumps(payload, ensure_ascii=False, sort_keys=True)}"
    )


def _generation_record_path(data_root: Path, book_id: str) -> Path:
    return data_root / "books" / book_id / GENERATED_ARTICLE_PROMPT_FILENAME


def _load_generation_record(data_root: Path, book_id: str) -> GeneratedReaderArticlePromptDetails | None:
    path = _generation_record_path(data_root, book_id)
    if not path.exists():
        return None
    return GeneratedReaderArticlePromptDetails.model_validate_json(path.read_text(encoding="utf-8"))


def _write_generation_record(data_root: Path, record: GeneratedReaderArticlePromptDetails) -> Path:
    path = _generation_record_path(data_root, record.book_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(record.model_dump_json(indent=2), encoding="utf-8")
    return path


def load_generated_article_prompt_details(
    data_root: Path,
    book_id: str,
) -> GeneratedReaderArticlePromptDetails | None:
    return _load_generation_record(data_root, book_id)


def _call_openai(prompt: str) -> dict[str, Any]:
    api_key = _openai_api_key()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    payload = {
        "model": _openai_model(),
        "max_output_tokens": _max_output_tokens(),
        "input": [
            {
                "role": "system",
                "content": [
                    {
                        "type": "input_text",
                        "text": "You generate controlled learner-calibrated reading articles and return only valid JSON.",
                    }
                ],
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": prompt,
                    }
                ],
            },
        ],
    }

    request = Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=120) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI article generation failed with HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"OpenAI article generation failed: {exc.reason}") from exc

    if not isinstance(response_payload, dict):
        raise RuntimeError("OpenAI article generation response was not a JSON object.")
    return response_payload


def _parse_model_payload(text: str) -> dict[str, Any] | None:
    payload = _json_object_from_text(text)
    if payload is None:
        return None
    article_text = payload.get("article_text")
    if not isinstance(article_text, str) or not article_text.strip():
        return None
    return payload


def _fallback_unknown_lemma_count(window: ArticleWindow) -> int:
    return 0 if window.upcoming_terms else 0


def _resolve_topic(language_code: str, topic: str | None, genre: str) -> str:
    cleaned_topic = topic.strip() if isinstance(topic, str) else ""
    return cleaned_topic or _default_topic(language_code, genre)


def _resolve_curriculum_label(
    *,
    language_code: str,
    curriculum_mode: str,
    curriculum_level: str | None,
    study_program_groups: list[Any] | None = None,
) -> str | None:
    cleaned_level = curriculum_level.strip() if isinstance(curriculum_level, str) and curriculum_level.strip() else None
    if not cleaned_level:
        return None
    if curriculum_mode == "study_program":
        if study_program_groups:
            _, resolved_label = _study_program_level_index(study_program_groups, cleaned_level)
            if resolved_label:
                return resolved_label
        return cleaned_level
    if curriculum_mode == "exam":
        return cleaned_level.upper()
    return cleaned_level


def generate_reader_article(
    data_root: Path,
    payload: GeneratedReaderArticleRequest,
    *,
    owner_id: str | None = None,
) -> GeneratedReaderArticleResponse:
    language_code = payload.language_code.strip().lower()
    genre = payload.genre.strip() if isinstance(payload.genre, str) and payload.genre.strip() else "everyday"
    tone = _tone_label(payload.tone or payload.style)
    curriculum_mode = _normalize_curriculum_mode(payload.curriculum_mode)
    topic = _resolve_topic(language_code, payload.topic, genre)
    window = _select_window_terms(data_root, language_code=language_code, request=payload, owner_id=owner_id)
    curriculum_label = _resolve_curriculum_label(
        language_code=language_code,
        curriculum_mode=curriculum_mode,
        curriculum_level=payload.curriculum_level,
        study_program_groups=build_study_program_groups(data_root, language_code=language_code),
    )
    sentence_count = max(5, payload.sentence_count)
    prompt = _build_prompt(
        language_code=language_code,
        topic=topic,
        genre=genre,
        tone=tone,
        curriculum_mode=curriculum_mode,
        curriculum_level=curriculum_label,
        sentence_count=sentence_count,
        max_new_lemmas=payload.max_new_lemmas,
        window=window,
    )

    generation_source = "template"
    article_text, actual_sentence_count = _template_article(
        language_code=language_code,
        topic=topic,
        sentence_count=sentence_count,
        window=window,
    )
    unknown_lemma_count = _fallback_unknown_lemma_count(window)

    try:
        response_payload = _call_openai(prompt)
    except Exception:
        logger.exception("OpenAI article generation failed; using template fallback.")
        response_payload = None
    else:
        response_text = _response_text(response_payload)
        parsed_payload = _parse_model_payload(response_text)
        if parsed_payload is not None:
            unknown_count = parsed_payload.get("unknown_lemma_count")
            parsed_sentence_count = parsed_payload.get("sentence_count")
            if isinstance(unknown_count, int) and unknown_count <= payload.max_new_lemmas and isinstance(parsed_sentence_count, int) and parsed_sentence_count >= 1:
                generated_text = str(parsed_payload["article_text"]).strip()
                if generated_text:
                    article_text = generated_text
                    actual_sentence_count = parsed_sentence_count
                    unknown_lemma_count = unknown_count
                    generation_source = "openai"

    title_prefix = f"{_language_label(language_code)}"
    if curriculum_label:
        title_prefix = f"{title_prefix} {curriculum_label}"
    title = f"{title_prefix} practice article: {topic}"
    generated_at = _utc_now()
    book = import_text_into_book(
        text=article_text,
        language_code=language_code,
        title=title,
        author="TextPlex AI",
        data_root=data_root / "books",
        owner_id=owner_id,
    )
    prompt_record = GeneratedReaderArticlePromptDetails(
        book_id=book.id,
        title=book.title,
        language_code=language_code,
        language_label=_language_label(language_code),
        topic=topic,
        genre=genre,
        tone=tone,
        curriculum_mode=curriculum_mode,
        curriculum_level=payload.curriculum_level.strip() if isinstance(payload.curriculum_level, str) and payload.curriculum_level.strip() else None,
        curriculum_label=curriculum_label,
        requested_sentence_count=sentence_count,
        actual_sentence_count=actual_sentence_count,
        prompt_version=ARTICLE_PROMPT_VERSION,
        model=_openai_model(),
        generation_source=generation_source,
        max_new_lemmas=payload.max_new_lemmas,
        known_lemma_limit=payload.known_lemma_limit,
        recent_lemma_limit=payload.recent_lemma_limit,
        upcoming_lemma_limit=payload.upcoming_lemma_limit,
        unknown_lemma_count=unknown_lemma_count,
        generated_at=generated_at,
        prompt_text=prompt,
        known_terms=window.known_terms,
        recent_terms=window.recent_terms,
        upcoming_terms=window.upcoming_terms,
    )
    _write_generation_record(data_root, prompt_record)
    return GeneratedReaderArticleResponse(
        book=book,
        title=title,
        language_code=language_code,
        topic=topic,
        sentence_count=actual_sentence_count,
        article_text=article_text,
        known_terms=window.known_terms,
        recent_terms=window.recent_terms,
        upcoming_terms=window.upcoming_terms,
        unknown_lemma_count=unknown_lemma_count,
        generation_source=generation_source,
    )
