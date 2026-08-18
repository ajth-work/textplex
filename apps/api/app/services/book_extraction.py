from __future__ import annotations

import hashlib
import json
import logging
import re
import sqlite3
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from pydantic import ValidationError

from app.core.paths import get_books_root
from app.schemas.books import BookRecord, PageExtractionArtifact
from app.services.book_registry import (
    import_book_from_path,
    load_registry,
    save_registry,
)
from app.services.book_sources import (
    EPUB_TEXT_SOURCE,
    EPUB_TEXT_SOURCE_SIGNATURE,
    TXT_TEXT_SOURCE,
    TXT_TEXT_SOURCE_SIGNATURE,
    is_epub_source,
    is_text_fixture_source,
    is_txt_source,
    load_epub_pages,
    load_text_fixture_pages,
    load_txt_pages,
    write_text_fixture_source,
)
from app.services.google_translate import (
    is_google_translate_configured,
    romanize_texts,
    translate_text,
)
from app.services.google_translate_usage import record_google_translate_usage
from app.services.hebrew_transliteration import transliterate_hebrew_text
from app.services.lexicon import lookup_lexicon_entry_map, lookup_lexicon_pinyin_map
from app.services.ocr import get_text_source_signature, resolve_page_ocr
from app.services.translation_alignment import build_sentence_translation_alignment, translation_alignment_matches_text
from processor import (
    build_book_extraction_result,
    build_page_extraction_result,
    stitch_page_sentence_carryover,
)

from processor.contracts import (
    CURRENT_PIPELINE_VERSION,
    BookExtractionResult,
    PageExtractionResult,
    SentenceResult,
    TokenResult,
)

logger = logging.getLogger(__name__)
from pypdf import PdfReader

FIXTURE_TEXT_SOURCE = "fixture"
FIXTURE_TEXT_SIGNATURE = "fixture-text-v1"
_SLUG_RE = re.compile(r"[^a-z0-9]+")
ExtractionProgressCallback = Callable[[int, int, int], None]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _artifact_dir(book_id: str, data_root: Path) -> Path:
    return data_root / book_id / "extractions"


def _page_artifact_path(book_id: str, page_number: int, data_root: Path) -> Path:
    return _artifact_dir(book_id, data_root) / "pages" / f"page-{page_number:04d}.json"


def _book_artifact_path(book_id: str, data_root: Path) -> Path:
    return _artifact_dir(book_id, data_root) / "book-extraction.json"


def _lexicon_root(data_root: Path) -> Path:
    return data_root.parent if data_root.name == "books" else data_root


def _language_root(language_code: str) -> str:
    return (language_code or "").strip().lower().split("-", 1)[0]


_JAPANESE_NUMBER_VALUES = {
    "一": 1,
    "二": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10,
}
_JAPANESE_NUMBER_ROMAJI = {
    1: "ichi",
    2: "ni",
    3: "san",
    4: "yon",
    5: "go",
    6: "roku",
    7: "nana",
    8: "hachi",
    9: "kyū",
}
_JAPANESE_MINUTE_READINGS = {
    1: "ippun",
    2: "nifun",
    3: "sanpun",
    4: "yonpun",
    5: "gofun",
    6: "roppun",
    7: "nanafun",
    8: "happun",
    9: "kyūfun",
}
_JAPANESE_COUNTER_READINGS = {
    "本": {
        1: "ippon",
        2: "nihon",
        3: "sanbon",
        4: "yonhon",
        5: "gohon",
        6: "roppon",
        7: "nanahon",
        8: "happon",
        9: "kyūhon",
        10: "juppon",
    },
    "匹": {
        1: "ippiki",
        2: "nihiki",
        3: "sanbiki",
        4: "yonhiki",
        5: "gohiki",
        6: "roppiki",
        7: "nanahiki",
        8: "happiki",
        9: "kyūhiki",
        10: "juppiki",
    },
    "杯": {
        1: "ippai",
        2: "nihai",
        3: "sanbai",
        4: "yonhai",
        5: "gohai",
        6: "roppai",
        7: "nanahai",
        8: "happai",
        9: "kyūhai",
        10: "juppai",
    },
}


def _parse_japanese_number(value: str) -> int | None:
    if not value or any(character not in _JAPANESE_NUMBER_VALUES for character in value):
        return None
    if value == "十":
        return 10
    if "十" in value:
        tens, ones = value.split("十", 1)
        if len(tens) > 1 or len(ones) > 1:
            return None
        return (_JAPANESE_NUMBER_VALUES.get(tens, 1) * 10) + _JAPANESE_NUMBER_VALUES.get(ones, 0)
    return _JAPANESE_NUMBER_VALUES[value]


def _japanese_number_romaji(value: int) -> str | None:
    if value in _JAPANESE_NUMBER_ROMAJI:
        return _JAPANESE_NUMBER_ROMAJI[value]
    if value == 10:
        return "jū"
    if 10 < value < 100:
        tens, ones = divmod(value, 10)
        tens_text = "jū" if tens == 1 else f"{_JAPANESE_NUMBER_ROMAJI.get(tens, '')}jū"
        return f"{tens_text}{_JAPANESE_NUMBER_ROMAJI.get(ones, '')}"
    return None


def _japanese_counter_number(
    token_surface: str,
) -> tuple[str, int, str] | None:
    counters = (*_JAPANESE_COUNTER_READINGS, "分")
    for counter in sorted(counters, key=len, reverse=True):
        if counter not in token_surface:
            continue
        number_text, token_tail = token_surface.split(counter, 1)
        number = _parse_japanese_number(number_text)
        if number is not None:
            return counter, number, token_tail
    return None


def _japanese_contextual_metadata(
    tokens: list[TokenResult],
    token_index: int,
) -> tuple[str | None, str | None]:
    """Resolve Japanese counter readings that depend on number or sense."""
    counter_data = _japanese_counter_number(tokens[token_index].surface_form)
    if counter_data is None:
        return None, None
    counter, number, token_tail = counter_data

    next_surface = tokens[token_index + 1].surface_form if token_index + 1 < len(tokens) else None
    following_surface = tokens[token_index + 2].surface_form if token_index + 2 < len(tokens) else None

    if counter == "分" and number == 5 and (
        (next_surface is not None and next_surface.startswith("五分"))
        or (token_index > 0 and tokens[token_index - 1].surface_form.startswith("五分"))
    ):
        return "gobu", "evenly matched; fifty-fifty"
    if (
        counter == "分"
        and not token_tail
        and next_surface == "の"
        and following_surface
        and following_surface[0] in "一二三四五六七八九十"
    ):
        reading = f"{_japanese_number_romaji(number)}bun"
        definition = "a fifth; one fifth" if number == 5 else None
        return reading, definition

    if counter != "分":
        return _JAPANESE_COUNTER_READINGS[counter].get(number), None

    minute_context = token_tail in {"間", "ぐらい", "ほど", "かかります", "かかる"} or next_surface in {
        "間",
        "ぐらい",
        "ほど",
        "かかります",
        "かかる",
    }
    if number == 10 and not minute_context:
        return None, None

    number_romaji = _japanese_number_romaji(number)
    if not number_romaji:
        return None, None
    if number % 10 == 0:
        return ("juppun" if number == 10 else f"{number_romaji.removesuffix('jū')}juppun"), None
    if number > 10:
        return f"{number_romaji.removesuffix('jū')}{_JAPANESE_MINUTE_READINGS[number % 10]}", None
    return _JAPANESE_MINUTE_READINGS[number], "five minutes" if number == 5 else None


def _is_punctuation_surface(surface_form: str) -> bool:
    text = surface_form.strip()
    return bool(text) and len(text) == 1 and not text.isalnum()


def _load_page_artifact(
    path: Path,
    *,
    data_root: Path | None = None,
    owner_id: str | None = None,
) -> PageExtractionArtifact | None:
    if not path.exists():
        return None
    try:
        artifact = PageExtractionArtifact.model_validate_json(path.read_text(encoding="utf-8"))
    except (OSError, ValidationError) as exc:
        logger.warning("Skipping invalid page artifact %s: %s", path, exc)
        return None
    recovered = _recover_page_artifact(artifact, data_root=data_root, owner_id=owner_id)
    if recovered is not artifact:
        _save_page_artifact(path, recovered)
        return recovered
    return artifact


def _string_list(values: object) -> list[str]:
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return []

    items: list[str] = []
    for value in values:
        if isinstance(value, str):
            text = value.strip()
            if text:
                items.append(text)
            continue
        if isinstance(value, dict):
            text = value.get("text") or value.get("translation")
            if isinstance(text, str):
                text = text.strip()
                if text:
                    items.append(text)
    return items


def _page_translation(values: object) -> str | None:
    if isinstance(values, str):
        text = values.strip()
        return text or None
    return None


def _page_translation_source(values: object) -> str | None:
    if isinstance(values, str):
        text = values.strip()
        return text or None
    return None


def _page_terminator_flag(values: object) -> bool | None:
    return values if isinstance(values, bool) else None


def _json_string_fragment(raw_text: str, key: str) -> str | None:
    marker = f'"{key}":'
    start = raw_text.find(marker)
    if start < 0:
        return None
    quote_start = raw_text.find('"', start + len(marker))
    if quote_start < 0:
        return None

    buffer: list[str] = []
    escaped = False
    for char in raw_text[quote_start + 1 :]:
        if escaped:
            buffer.append(char)
            escaped = False
            continue
        if char == "\\":
            buffer.append(char)
            escaped = True
            continue
        if char == '"':
            try:
                return json.loads('"' + ''.join(buffer) + '"')
            except json.JSONDecodeError:
                return None
        buffer.append(char)
    return None


def _json_bool_fragment(raw_text: str, key: str) -> bool | None:
    marker = f'"{key}":'
    start = raw_text.find(marker)
    if start < 0:
        return None
    remainder = raw_text[start + len(marker) :].lstrip()
    if remainder.startswith("true"):
        return True
    if remainder.startswith("false"):
        return False
    return None


def _json_list_fragment(raw_text: str, key: str) -> list[object] | None:
    marker = f'"{key}":'
    start = raw_text.find(marker)
    if start < 0:
        return None
    array_start = raw_text.find('[', start + len(marker))
    if array_start < 0:
        return None

    depth = 0
    in_string = False
    escaped = False
    for index in range(array_start, len(raw_text)):
        char = raw_text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
            continue
        if char == '[':
            depth += 1
            continue
        if char == ']':
            depth -= 1
            if depth == 0:
                fragment = raw_text[array_start : index + 1]
                try:
                    value = json.loads(fragment)
                except json.JSONDecodeError:
                    return None
                return value if isinstance(value, list) else None
    return None


def _recover_page_result(
    page: PageExtractionResult,
    *,
    data_root: Path | None = None,
    owner_id: str | None = None,
) -> PageExtractionResult:
    raw_text = page.raw_text.strip()
    needs_pipeline_rebuild = page.pipeline_version != CURRENT_PIPELINE_VERSION
    parsed: dict | None = None
    if raw_text.startswith("{"):
        try:
            loaded = json.loads(raw_text)
        except json.JSONDecodeError:
            loaded = None
        if isinstance(loaded, dict):
            parsed = loaded

    if parsed is None:
        transcription = _json_string_fragment(raw_text, "transcription")
        has_structured_transcription = bool(transcription)
        if not transcription:
            if not needs_pipeline_rebuild:
                return page
            transcription = raw_text
        page_translation = _json_string_fragment(raw_text, "page_translation") or _json_string_fragment(raw_text, "translation")
        page_translation_source = _json_string_fragment(raw_text, "page_translation_source") or _json_string_fragment(raw_text, "translation_source")
        page_ends_with_sentence_terminator = _json_bool_fragment(raw_text, "page_ends_with_sentence_terminator")
        sentence_texts = _string_list(_json_list_fragment(raw_text, "sentence_texts")) or _string_list(_json_list_fragment(raw_text, "sentences"))
        sentence_translations = _string_list(_json_list_fragment(raw_text, "sentence_translations")) or _string_list(_json_list_fragment(raw_text, "translations"))
        sentence_translation_sources = _string_list(_json_list_fragment(raw_text, "sentence_translation_sources")) or _string_list(_json_list_fragment(raw_text, "translation_sources"))
        token_hints = _json_list_fragment(raw_text, "token_hints")
        source_payload = None
        if needs_pipeline_rebuild and not has_structured_transcription:
            sentence_texts = [sentence.text for sentence in page.sentences]
            sentence_translations = [sentence.translation or "" for sentence in page.sentences]
            sentence_translation_sources = [sentence.translation_source or "" for sentence in page.sentences]
            page_translation = page.page_translation
            page_translation_source = page.page_translation_source
            page_ends_with_sentence_terminator = page.page_ends_with_sentence_terminator
    else:
        transcription = parsed.get("transcription")
        if not isinstance(transcription, str):
            transcription = parsed.get("raw_text") if isinstance(parsed.get("raw_text"), str) else ""
        transcription = transcription.strip()
        if not transcription:
            return page

        nested = None
        if transcription.startswith("{"):
            try:
                nested_loaded = json.loads(transcription)
            except json.JSONDecodeError:
                nested_loaded = None
            if isinstance(nested_loaded, dict):
                nested = nested_loaded

        source_payload = nested if isinstance(nested, dict) else parsed
        sentence_texts = _string_list(source_payload.get("sentence_texts")) or _string_list(source_payload.get("sentences"))
        sentence_translations = _string_list(source_payload.get("sentence_translations")) or _string_list(source_payload.get("translations"))
        page_translation = _page_translation(source_payload.get("page_translation")) or _page_translation(source_payload.get("translation"))
        page_translation_source = _page_translation_source(source_payload.get("page_translation_source")) or _page_translation_source(
            source_payload.get("translation_source")
        )
        sentence_translation_sources = _string_list(source_payload.get("sentence_translation_sources")) or _string_list(
            source_payload.get("translation_sources")
        )
        page_ends_with_sentence_terminator = _page_terminator_flag(
            source_payload.get("page_ends_with_sentence_terminator")
        )
        token_hints = source_payload.get("token_hints") if isinstance(source_payload.get("token_hints"), list) else None

    transcription = transcription.strip()
    if not transcription:
        return page

    recovered = build_page_extraction_result(
        book_id=page.book_id,
        page_number=page.page_number,
        language_code=page.language_code,
        raw_text=transcription,
        source_page_sha256=page.source_page_sha256,
        sentence_texts=sentence_texts or None,
        sentence_translations=sentence_translations or None,
        sentence_translation_sources=sentence_translation_sources or None,
        page_translation=page_translation,
        page_translation_source=page_translation_source,
        page_ends_with_sentence_terminator=page_ends_with_sentence_terminator,
        token_hints=token_hints,
    )
    original_alignments = {
        sentence.order: sentence.translation_alignment
        for sentence in page.sentences
        if sentence.translation_alignment is not None
    }
    if original_alignments:
        recovered_sentences = []
        recovered_changed = False
        for sentence in recovered.sentences:
            alignment = original_alignments.get(sentence.order)
            if alignment is not None and sentence.translation_alignment is None:
                sentence = sentence.model_copy(update={"translation_alignment": alignment})
                recovered_changed = True
            recovered_sentences.append(sentence)
        if recovered_changed:
            recovered = recovered.model_copy(update={"sentences": recovered_sentences})
    if data_root is None:
        return recovered

    enriched = _enrich_page_lexicon_metadata(recovered, data_root=_lexicon_root(data_root), owner_id=owner_id)
    return enriched


def _recover_page_artifact(
    artifact: PageExtractionArtifact,
    *,
    data_root: Path | None = None,
    owner_id: str | None = None,
) -> PageExtractionArtifact:
    rebuilt_page = _recover_page_result(artifact.page, data_root=data_root, owner_id=owner_id)
    if data_root is not None:
        enriched_page = _enrich_page_lexicon_metadata(rebuilt_page, data_root=_lexicon_root(data_root), owner_id=owner_id)
        if enriched_page is not rebuilt_page:
            rebuilt_page = enriched_page
    if rebuilt_page is artifact.page:
        return artifact
    return artifact.model_copy(update={"page": rebuilt_page})


def recover_book_extraction_result(
    extraction: BookExtractionResult,
    *,
    data_root: Path | None = None,
    owner_id: str | None = None,
) -> BookExtractionResult:
    recovered_pages = [_recover_page_result(page, data_root=data_root, owner_id=owner_id) for page in extraction.pages]
    if data_root is not None:
        lexicon_root = _lexicon_root(data_root)
        enriched_pages = []
        for page in recovered_pages:
            enriched_pages.append(_enrich_page_lexicon_metadata(page, data_root=lexicon_root, owner_id=owner_id))
        recovered_pages = enriched_pages

    if all(recovered is original for recovered, original in zip(recovered_pages, extraction.pages, strict=False)):
        return extraction
    rebuilt = build_book_extraction_result(
        book_id=extraction.book_id,
        source_path=extraction.source_path,
        language_code=extraction.language_code,
        page_start=extraction.page_start,
        page_end=extraction.page_end,
        pages=recovered_pages,
    )
    return rebuilt


def load_page_artifact(
    *,
    book_id: str,
    page_number: int,
    data_root: Path | None = None,
    owner_id: str | None = None,
) -> PageExtractionArtifact | None:
    data_root = data_root or get_books_root()
    artifact_path = _page_artifact_path(book_id, page_number, data_root)
    return _load_page_artifact(artifact_path, data_root=data_root, owner_id=owner_id)


def parse_text_into_page_artifact(
    *,
    text: str,
    language_code: str,
    title: str | None = None,
    data_root: Path | None = None,
    owner_id: str | None = None,
) -> PageExtractionArtifact:
    lexicon_root = data_root or get_books_root().parent
    page_result = build_page_extraction_result(
        book_id=(title or "local-text").strip().replace(" ", "-").lower() or "local-text",
        page_number=1,
        language_code=language_code,
        raw_text=text,
        source_page_sha256=hashlib.sha256(text.encode("utf-8")).hexdigest(),
    )
    page_result = _enrich_page_lexicon_metadata(
        page_result,
        data_root=lexicon_root,
        owner_id=owner_id,
    )
    return PageExtractionArtifact(
        source_page_sha256=page_result.source_page_sha256 or hashlib.sha256(text.encode("utf-8")).hexdigest(),
        text_source="paste",
        text_source_signature="paste-text-v1",
        processor_version=page_result.processor_version,
        pipeline_version=page_result.pipeline_version,
        page=page_result,
    )


def import_text_into_book(
    *,
    text: str,
    language_code: str,
    title: str | None = None,
    author: str | None = None,
    data_root: Path | None = None,
    owner_id: str | None = None,
) -> BookRecord:
    books_root = data_root or get_books_root()
    uploads_root = books_root.parent / "uploads"
    fixture_root = uploads_root / uuid4().hex / _slugify(title)

    write_text_fixture_source(
        fixture_root,
        text=text,
        language_code=language_code,
        title="Pasted text",
        source_work="Pasted text input",
        author=author,
    )

    book = import_book_from_path(
        fixture_root,
        language_code=language_code,
        title=title,
        author=author,
        data_root=books_root,
        owner_id=owner_id,
    )
    extraction_path, extracted_page_count = extract_book_text(
        book=book,
        page_start=1,
        page_count=book.total_pages,
        force=True,
        data_root=books_root,
        ocr_provider="local",
        owner_id=owner_id,
    )

    book.extraction_status = "complete"
    book.extraction_total_pages = extracted_page_count
    book.extraction_pages_processed = extracted_page_count
    book.extracted_page_count = extracted_page_count
    book.extraction_current_page = book.total_pages if extracted_page_count else None
    book.extraction_started_at = book.extraction_started_at or _utc_now()
    book.extraction_updated_at = _utc_now()
    book.extraction_path = str(extraction_path)
    book.status = "extracted"
    _persist_book_record(book, data_root=books_root)
    return book


def _save_page_artifact(path: Path, artifact: PageExtractionArtifact) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_name(f".{path.name}.{uuid4().hex}.tmp")
    try:
        temporary_path.write_text(artifact.model_dump_json(indent=2), encoding="utf-8")
        temporary_path.replace(path)
    finally:
        temporary_path.unlink(missing_ok=True)


def _persist_book_record(book: BookRecord, *, data_root: Path) -> None:
    registry_path = data_root / "registry.json"
    registry = load_registry(registry_path)
    registry[book.id] = book
    save_registry(registry_path, registry)
    book_path = data_root / book.id / "book.json"
    book_path.write_text(book.model_dump_json(indent=2), encoding="utf-8")


def _slugify(value: str | None, fallback: str = "pasted-text") -> str:
    text = (value or fallback).strip().lower()
    text = _SLUG_RE.sub("-", text).strip("-")
    return text or fallback


def _page_image_hash(page_image_path: Path) -> str:
    return hashlib.sha256(page_image_path.read_bytes()).hexdigest()


def _enrich_page_lexicon_metadata(
    page_result: PageExtractionResult,
    *,
    data_root: Path,
    owner_id: str | None = None,
) -> PageExtractionResult:
    language_code = page_result.language_code.lower()
    if _language_root(language_code) not in {"zh", "ja", "ko", "ru", "he", "ar"}:
        return page_result

    surface_forms = {
        token.surface_form
        for sentence in page_result.sentences
        for token in sentence.tokens
        if token.surface_form
    }
    try:
        lexicon_entries = lookup_lexicon_entry_map(
            data_root=data_root,
            language_code=page_result.language_code,
            terms=surface_forms,
        )
    except (FileNotFoundError, OSError, sqlite3.Error, RuntimeError, ValueError):
        lexicon_entries = {}
    try:
        pinyin_map = lookup_lexicon_pinyin_map(
            data_root=data_root,
            language_code=page_result.language_code,
            terms=surface_forms,
        )
    except (FileNotFoundError, OSError, sqlite3.Error, RuntimeError, ValueError):
        pinyin_map = {}
    if not pinyin_map and not lexicon_entries:
        pinyin_map = {}

    google_romanization_map: dict[str, str] = {}
    if is_google_translate_configured("romanization"):
        missing_pronunciations = []
        for sentence in page_result.sentences:
            for token in sentence.tokens:
                if _is_punctuation_surface(token.surface_form):
                    continue
                if token.romanization or token.pronunciation or not any(ord(character) > 127 for character in token.surface_form):
                    continue
                missing_pronunciations.append(token.surface_form)

        unique_missing_pronunciations = list(dict.fromkeys(missing_pronunciations))
        if unique_missing_pronunciations:
            romanized_terms = romanize_texts(unique_missing_pronunciations, source_language_code=page_result.language_code)
            google_romanization_map = {
                term: romanized
                for term, romanized in zip(unique_missing_pronunciations, romanized_terms, strict=False)
                if romanized
            }
            if google_romanization_map:
                record_google_translate_usage(
                    data_root=data_root,
                    characters=sum(len(term) for term in google_romanization_map),
                    owner_id=owner_id,
                )

    hebrew_romanization_map: dict[str, str] = {}
    if _language_root(language_code) == "he":
        missing_pronunciations = []
        for sentence in page_result.sentences:
            for token in sentence.tokens:
                if _is_punctuation_surface(token.surface_form):
                    continue
                if token.romanization or token.pronunciation or not any(ord(character) > 127 for character in token.surface_form):
                    continue
                missing_pronunciations.append(token.surface_form)

        unique_missing_pronunciations = list(dict.fromkeys(missing_pronunciations))
        if unique_missing_pronunciations:
            hebrew_romanization_map = {
                term: romanized
                for term in unique_missing_pronunciations
                if (romanized := transliterate_hebrew_text(term))
            }

    if not pinyin_map and not lexicon_entries and not google_romanization_map and not hebrew_romanization_map:
        has_japanese_context = _language_root(language_code) == "ja" and any(
            _japanese_contextual_metadata(sentence.tokens, token_index)[0]
            for sentence in page_result.sentences
            for token_index, _token in enumerate(sentence.tokens)
        )
        if not has_japanese_context:
            return page_result

    sentences = []
    for sentence in page_result.sentences:
        tokens = []
        for token_index, token in enumerate(sentence.tokens):
            exact_entry = lexicon_entries.get(token.surface_form)
            contextual_romanization, contextual_definition = (None, None)
            if _language_root(language_code) == "ja":
                contextual_romanization, contextual_definition = _japanese_contextual_metadata(sentence.tokens, token_index)
            romanization = (
                contextual_romanization
                or token.romanization
                or token.pronunciation
                or (exact_entry.pinyin if exact_entry else None)
                or pinyin_map.get(token.surface_form)
                or google_romanization_map.get(token.surface_form)
                or hebrew_romanization_map.get(token.surface_form)
            )
            definition_short = contextual_definition or token.definition_short or (exact_entry.definition if exact_entry else None)
            proficiency_level = token.proficiency_level or (exact_entry.hsk_level if exact_entry else None)
            proficiency_system = token.proficiency_system or ("HSK" if exact_entry and exact_entry.hsk_level else None)
            tokens.append(
                token.model_copy(
                    update={
                        "romanization": romanization,
                        "pronunciation": contextual_romanization
                        or (romanization if romanization and not token.pronunciation else token.pronunciation),
                        "definition_short": definition_short,
                        "proficiency_level": proficiency_level,
                        "proficiency_system": proficiency_system,
                    }
                )
            )
        sentences.append(sentence.model_copy(update={"tokens": tokens}))

    return page_result.model_copy(update={"sentences": sentences})


def _translate_text_with_google(
    *,
    source_text: str,
    source_language_code: str,
    data_root: Path,
    owner_id: str | None = None,
) -> str | None:
    translated_text = translate_text(source_text, source_language_code=source_language_code)
    if not translated_text:
        return None

    record_google_translate_usage(data_root=data_root, characters=len(source_text), owner_id=owner_id)
    return translated_text


def _attach_sentence_translation_alignment(
    page_result: PageExtractionResult,
    *,
    sentence_order: int,
) -> tuple[PageExtractionResult, SentenceResult | None, str]:
    existing_sentence = next((sentence for sentence in page_result.sentences if sentence.order == sentence_order), None)
    if existing_sentence is None:
        return page_result, None, "missing"

    if not existing_sentence.translation:
        return page_result, existing_sentence, "unavailable"

    if translation_alignment_matches_text(existing_sentence.translation_alignment, existing_sentence.translation):
        return page_result, existing_sentence, "page_artifact"

    alignment = build_sentence_translation_alignment(
        existing_sentence,
        source_language_code=page_result.language_code,
        target_language_code="en",
    )
    if alignment is None:
        return page_result, existing_sentence, "unavailable"

    updated_sentence = existing_sentence.model_copy(update={"translation_alignment": alignment})
    sentences = [updated_sentence if sentence.order == sentence_order else sentence for sentence in page_result.sentences]
    updated_page = page_result.model_copy(update={"sentences": sentences})
    return updated_page, updated_sentence, "openai"


def preload_page_sentence_translations(
    page_result: PageExtractionResult,
    *,
    data_root: Path,
    owner_id: str | None = None,
) -> PageExtractionResult:
    if not is_google_translate_configured("translation"):
        return page_result

    sentences: list[SentenceResult] = []
    updated = False
    for sentence in page_result.sentences:
        if sentence.translation:
            sentences.append(sentence)
            continue

        translated = _translate_text_with_google(
            source_text=sentence.text,
            source_language_code=page_result.language_code,
            data_root=data_root,
            owner_id=owner_id,
        )
        if not translated:
            sentences.append(sentence)
            continue

        sentences.append(
            sentence.model_copy(
                update={
                    "translation": translated,
                    "translation_source": "google_translate_live",
                }
            )
        )
        updated = True

    working_page = page_result.model_copy(update={"sentences": sentences}) if updated else page_result
    aligned_page = working_page
    aligned_updated = False
    for sentence in aligned_page.sentences:
        if not sentence.translation or sentence.translation_alignment is not None:
            continue

        next_page, next_sentence, _alignment_source = _attach_sentence_translation_alignment(
            aligned_page,
            sentence_order=sentence.order,
        )
        if next_sentence is not None and next_page is not aligned_page:
            aligned_page = next_page
            aligned_updated = True

    if updated or aligned_updated:
        return aligned_page
    return page_result


def translate_page_sentence(
    page_result: PageExtractionResult,
    *,
    sentence_order: int,
    data_root: Path,
    owner_id: str | None = None,
) -> tuple[PageExtractionResult, SentenceResult | None, str]:
    existing_sentence = next((sentence for sentence in page_result.sentences if sentence.order == sentence_order), None)
    if existing_sentence is None:
        return page_result, None, "missing"

    if existing_sentence.translation:
        if existing_sentence.translation_alignment is None:
            aligned_page, aligned_sentence, _alignment_source = _attach_sentence_translation_alignment(
                page_result,
                sentence_order=sentence_order,
            )
            if aligned_sentence is not None and aligned_page is not page_result:
                if existing_sentence.translation_source == "google_translate_live":
                    resolution_source = "google_translate_cache"
                elif existing_sentence.translation_source:
                    resolution_source = existing_sentence.translation_source
                else:
                    resolution_source = "page_artifact"
                return aligned_page, aligned_sentence, resolution_source

        if existing_sentence.translation_source == "google_translate_live":
            resolution_source = "google_translate_cache"
        elif existing_sentence.translation_source:
            resolution_source = existing_sentence.translation_source
        else:
            resolution_source = "page_artifact"

        aligned_page, aligned_sentence, _alignment_source = _attach_sentence_translation_alignment(page_result, sentence_order=sentence_order)
        if aligned_sentence is not None and aligned_page is not page_result:
            return aligned_page, aligned_sentence, resolution_source
        return page_result, existing_sentence, resolution_source

    if not is_google_translate_configured("translation"):
        return page_result, existing_sentence, "unavailable"

    translated = _translate_text_with_google(
        source_text=existing_sentence.text,
        source_language_code=page_result.language_code,
        data_root=data_root,
        owner_id=owner_id,
    )
    if not translated:
        return page_result, existing_sentence, "unavailable"

    updated_sentence = existing_sentence.model_copy(
        update={
            "translation": translated,
            "translation_source": "google_translate_live",
        }
    )
    sentences = [updated_sentence if sentence.order == sentence_order else sentence for sentence in page_result.sentences]
    updated_page = page_result.model_copy(update={"sentences": sentences})
    aligned_page, aligned_sentence, _alignment_source = _attach_sentence_translation_alignment(updated_page, sentence_order=sentence_order)
    if aligned_sentence is not None and aligned_page is not updated_page:
        return aligned_page, aligned_sentence, "google_translate_live"
    return updated_page, updated_sentence, "google_translate_live"


def prefetch_book_sentence_translation_window(
    *,
    book: BookRecord,
    page_number: int,
    sentence_order: int,
    lookahead: int = 3,
    data_root: Path | None = None,
    owner_id: str | None = None,
) -> list[tuple[int, SentenceResult, str]]:
    """Cache the focused sentence and a small forward-looking reader window.

    The window is deliberately sentence-bounded rather than page-bounded, so a
    learner reaching a page boundary still has the first sentences of the next
    page ready. Results are persisted per page as they are resolved.
    """
    data_root = data_root or get_books_root()
    owner_id = owner_id or book.owner_id
    remaining = lookahead + 1
    next_page_number = page_number
    results: list[tuple[int, SentenceResult, str]] = []

    while remaining > 0 and next_page_number <= book.total_pages:
        artifact = load_page_artifact(
            book_id=book.id,
            page_number=next_page_number,
            data_root=data_root,
            owner_id=owner_id,
        )
        if artifact is None:
            next_page_number += 1
            continue

        sentences = sorted(artifact.page.sentences, key=lambda sentence: sentence.order)
        if next_page_number == page_number:
            start_index = next((index for index, sentence in enumerate(sentences) if sentence.order == sentence_order), None)
            if start_index is None:
                return results
        else:
            start_index = 0

        updated_page = artifact.page
        for sentence in sentences[start_index:]:
            updated_page, updated_sentence, resolution_source = translate_page_sentence(
                updated_page,
                sentence_order=sentence.order,
                data_root=data_root,
                owner_id=owner_id,
            )
            if updated_sentence is None:
                continue
            results.append((next_page_number, updated_sentence, resolution_source))
            remaining -= 1
            if remaining == 0:
                break

        if updated_page is not artifact.page:
            _save_page_artifact(
                _page_artifact_path(book.id, next_page_number, data_root),
                artifact.model_copy(update={"page": updated_page}),
            )
        next_page_number += 1

    return results


def preload_book_sentence_translations(
    *,
    book: BookRecord,
    page_start: int = 1,
    page_count: int | None = None,
    data_root: Path | None = None,
    owner_id: str | None = None,
) -> int:
    data_root = data_root or get_books_root()
    owner_id = owner_id or book.owner_id
    start_page = max(1, page_start)
    end_page = book.total_pages if page_count is None else min(book.total_pages, start_page + page_count - 1)
    updated_pages = 0

    for page_number in range(start_page, end_page + 1):
        artifact = load_page_artifact(book_id=book.id, page_number=page_number, data_root=data_root, owner_id=owner_id)
        if artifact is None:
            continue

        translated_page = preload_page_sentence_translations(artifact.page, data_root=data_root, owner_id=owner_id)
        if translated_page is artifact.page:
            continue

        artifact = artifact.model_copy(update={"page": translated_page})
        _save_page_artifact(_page_artifact_path(book.id, page_number, data_root), artifact)
        updated_pages += 1

    return updated_pages


def _update_extraction_progress(
    *,
    book: BookRecord,
    data_root: Path,
    total_pages: int,
    pages_processed: int,
    current_page: int | None,
) -> None:
    book.extraction_total_pages = total_pages
    book.extraction_pages_processed = pages_processed
    book.extraction_current_page = current_page
    if not book.extraction_started_at:
        book.extraction_started_at = _utc_now()
    book.extraction_updated_at = _utc_now()
    if book.extraction_status != "complete":
        book.extraction_status = "processing"
    if book.status not in {"extracted", "archived"}:
        book.status = "processing"
    _persist_book_record(book, data_root=data_root)


def extract_book_pages(
    *,
    book: BookRecord,
    page_start: int = 1,
    page_count: int | None = None,
    force: bool = False,
    ocr_provider: str | None = None,
    data_root: Path | None = None,
    owner_id: str | None = None,
    progress_callback: ExtractionProgressCallback | None = None,
) -> tuple[PageExtractionArtifact, ...]:
    data_root = data_root or get_books_root()
    owner_id = owner_id or book.owner_id
    lexicon_root = data_root.parent if data_root.name == "books" else data_root
    pages_root = Path(book.pages_path) if book.pages_path else data_root / book.id / "pages"
    extraction_root = _artifact_dir(book.id, data_root) / "pages"
    extraction_root.mkdir(parents=True, exist_ok=True)

    source_path = Path(book.source_path)
    start_page = max(1, page_start)
    end_page = book.total_pages if page_count is None else min(book.total_pages, start_page + page_count - 1)
    total_to_process = max(0, end_page - start_page + 1)
    is_page_by_page_source = getattr(book, "source_type", "static") == "page-by-page"
    fixture_pages = load_text_fixture_pages(source_path) if is_text_fixture_source(source_path) else None
    epub_pages = load_epub_pages(source_path) if is_epub_source(source_path) else None
    txt_pages = load_txt_pages(source_path) if is_txt_source(source_path) else None
    reader = None if is_page_by_page_source or fixture_pages is not None or epub_pages is not None or txt_pages is not None else PdfReader(str(source_path))
    current_text_source, current_text_source_signature = (
        (FIXTURE_TEXT_SOURCE, FIXTURE_TEXT_SIGNATURE)
        if fixture_pages is not None
        else (EPUB_TEXT_SOURCE, EPUB_TEXT_SOURCE_SIGNATURE)
        if epub_pages is not None
        else (TXT_TEXT_SOURCE, TXT_TEXT_SOURCE_SIGNATURE)
        if txt_pages is not None
        else get_text_source_signature(ocr_provider or book.ocr_provider)
    )

    page_results: list[PageExtractionResult] = []
    artifact_meta: list[tuple[str, str, str, PageExtractionResult]] = []
    processed_count = 0
    for page_number in range(start_page, end_page + 1):
        page_image_path = pages_root / f"page-{page_number:04d}.png"
        page_hash = _page_image_hash(page_image_path)
        artifact_path = _page_artifact_path(book.id, page_number, data_root)
        existing_artifact = _load_page_artifact(artifact_path, owner_id=owner_id)
        if (
            not force
            and existing_artifact
            and existing_artifact.source_page_sha256 == page_hash
            and existing_artifact.text_source == current_text_source
            and existing_artifact.text_source_signature == current_text_source_signature
        ):
            page_result = existing_artifact.page.model_copy(deep=True)
            page_result = _enrich_page_lexicon_metadata(page_result, data_root=lexicon_root, owner_id=owner_id)
            page_results.append(page_result)
            artifact_meta.append(
                (page_hash, existing_artifact.text_source, existing_artifact.text_source_signature, page_result)
            )
            _save_page_artifact(
                artifact_path,
                existing_artifact.model_copy(update={"page": page_result}),
            )
            processed_count += 1
            if progress_callback:
                progress_callback(page_number, processed_count, total_to_process)
            continue

        if fixture_pages is not None:
            raw_text = fixture_pages[page_number - 1][2]
            text_source = FIXTURE_TEXT_SOURCE
            text_source_signature = FIXTURE_TEXT_SIGNATURE
            sentence_texts = None
            sentence_translations = None
            page_translation = None
            page_ends = None
            token_hints = None
        elif epub_pages is not None:
            raw_text = epub_pages[page_number - 1][2]
            text_source = EPUB_TEXT_SOURCE
            text_source_signature = EPUB_TEXT_SOURCE_SIGNATURE
            sentence_texts = None
            sentence_translations = None
            page_translation = None
            page_ends = None
            token_hints = None
        elif txt_pages is not None:
            raw_text = txt_pages[page_number - 1][2]
            text_source = TXT_TEXT_SOURCE
            text_source_signature = TXT_TEXT_SOURCE_SIGNATURE
            sentence_texts = None
            sentence_translations = None
            page_translation = None
            page_ends = None
            token_hints = None
        else:
            fallback_text = reader.pages[page_number - 1].extract_text() if reader is not None and page_number <= len(reader.pages) else ""
            ocr_result = resolve_page_ocr(
                fallback_text=fallback_text,
                page_image_path=page_image_path,
                book_title=book.title,
                language_code=book.language_code,
                page_number=page_number,
                ocr_provider=ocr_provider or book.ocr_provider,
            )
            raw_text = ocr_result.transcription
            text_source = ocr_result.text_source
            text_source_signature = ocr_result.text_source_signature
            sentence_texts = ocr_result.sentence_texts
            sentence_translations = ocr_result.sentence_translations
            page_translation = ocr_result.page_translation
            page_ends = ocr_result.page_ends_with_sentence_terminator
            token_hints = [hint.model_dump() for hint in ocr_result.token_hints]

        page_result = build_page_extraction_result(
            book_id=book.id,
            page_number=page_number,
            language_code=book.language_code,
            raw_text=raw_text,
            source_page_sha256=page_hash,
            sentence_texts=sentence_texts,
            sentence_translations=sentence_translations,
            page_translation=page_translation,
            page_ends_with_sentence_terminator=page_ends,
            token_hints=token_hints,
        )
        page_result = _enrich_page_lexicon_metadata(page_result, data_root=lexicon_root, owner_id=owner_id)
        page_results.append(page_result)
        artifact_meta.append((page_hash, text_source, text_source_signature, page_result))
        _save_page_artifact(
            artifact_path,
            PageExtractionArtifact(
                source_page_sha256=page_hash,
                text_source=text_source,
                text_source_signature=text_source_signature,
                processor_version=page_result.processor_version,
                pipeline_version=page_result.pipeline_version,
                page=page_result,
            ),
        )
        processed_count += 1
        if progress_callback:
            progress_callback(page_number, processed_count, total_to_process)

    stitched_pages = stitch_page_sentence_carryover(page_results)
    artifacts: list[PageExtractionArtifact] = []
    for page_result, (page_hash, text_source, text_source_signature, _original_page_result) in zip(stitched_pages, artifact_meta):
        artifact = PageExtractionArtifact(
            source_page_sha256=page_hash,
            text_source=text_source,
            text_source_signature=text_source_signature,
            processor_version=page_result.processor_version,
            pipeline_version=page_result.pipeline_version,
            page=page_result,
        )
        artifact_path = _page_artifact_path(book.id, page_result.page_number, data_root)
        _save_page_artifact(artifact_path, artifact)
        artifacts.append(artifact)

    return tuple(artifacts)


def extract_book_text(
    *,
    book: BookRecord,
    page_start: int = 1,
    page_count: int | None = None,
    force: bool = False,
    ocr_provider: str | None = None,
    data_root: Path | None = None,
    owner_id: str | None = None,
    progress_callback: ExtractionProgressCallback | None = None,
) -> tuple[Path, int]:
    data_root = data_root or get_books_root()
    owner_id = owner_id or book.owner_id
    artifacts = extract_book_pages(
        book=book,
        page_start=page_start,
        page_count=page_count,
        force=force,
        ocr_provider=ocr_provider,
        data_root=data_root,
        owner_id=owner_id,
        progress_callback=progress_callback,
    )
    pages = [artifact.page for artifact in artifacts]
    if not pages:
        raise ValueError("No pages were extracted.")

    page_start_value = pages[0].page_number
    page_end_value = pages[-1].page_number
    total_sentences = sum(len(page.sentences) for page in pages)
    book.total_sentences = total_sentences
    summary = build_book_extraction_result(
        book_id=book.id,
        source_path=book.source_path,
        language_code=book.language_code,
        page_start=page_start_value,
        page_end=page_end_value,
        pages=pages,
    )

    book_artifact_path = _book_artifact_path(book.id, data_root)
    book_artifact_path.parent.mkdir(parents=True, exist_ok=True)
    book_artifact_path.write_text(summary.model_dump_json(indent=2), encoding="utf-8")
    return book_artifact_path, len(pages)
