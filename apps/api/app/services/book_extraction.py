from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable
from uuid import uuid4

from pypdf import PdfReader

from app.core.paths import get_books_root
from app.schemas.books import BookRecord, PageExtractionArtifact
from app.services.book_registry import import_book_from_path, load_registry, save_registry
from app.services.book_sources import is_text_fixture_source, load_text_fixture_pages, write_text_fixture_source
from app.services.lexicon import lookup_lexicon_entry_map, lookup_lexicon_pinyin_map
from app.services.ocr import get_text_source_signature, resolve_page_ocr
from processor import build_book_extraction_result, build_page_extraction_result, stitch_page_sentence_carryover
from processor.contracts import BookExtractionResult, PageExtractionResult

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


def _load_page_artifact(path: Path, *, data_root: Path | None = None) -> PageExtractionArtifact | None:
    if not path.exists():
        return None
    artifact = PageExtractionArtifact.model_validate_json(path.read_text(encoding="utf-8"))
    recovered = _recover_page_artifact(artifact, data_root=data_root)
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


def _recover_page_result(page: PageExtractionResult, *, data_root: Path | None = None) -> PageExtractionResult:
    raw_text = page.raw_text.strip()
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
        if not transcription:
            return page
        page_translation = _json_string_fragment(raw_text, "page_translation") or _json_string_fragment(raw_text, "translation")
        page_ends_with_sentence_terminator = _json_bool_fragment(raw_text, "page_ends_with_sentence_terminator")
        sentence_texts = _string_list(_json_list_fragment(raw_text, "sentence_texts")) or _string_list(_json_list_fragment(raw_text, "sentences"))
        sentence_translations = _string_list(_json_list_fragment(raw_text, "sentence_translations")) or _string_list(_json_list_fragment(raw_text, "translations"))
        token_hints = _json_list_fragment(raw_text, "token_hints")
        source_payload = None
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
        page_translation=page_translation,
        page_ends_with_sentence_terminator=page_ends_with_sentence_terminator,
        token_hints=token_hints,
    )
    if data_root is None:
        return recovered

    enriched = _enrich_page_lexicon_metadata(recovered, data_root=_lexicon_root(data_root))
    return enriched


def _recover_page_artifact(artifact: PageExtractionArtifact, *, data_root: Path | None = None) -> PageExtractionArtifact:
    rebuilt_page = _recover_page_result(artifact.page, data_root=data_root)
    if data_root is not None:
        enriched_page = _enrich_page_lexicon_metadata(rebuilt_page, data_root=_lexicon_root(data_root))
        if enriched_page is not rebuilt_page:
            rebuilt_page = enriched_page
    if rebuilt_page is artifact.page:
        return artifact
    return artifact.model_copy(update={"page": rebuilt_page})


def recover_book_extraction_result(
    extraction: BookExtractionResult,
    *,
    data_root: Path | None = None,
) -> BookExtractionResult:
    recovered_pages = [_recover_page_result(page, data_root=data_root) for page in extraction.pages]
    if data_root is not None:
        lexicon_root = _lexicon_root(data_root)
        enriched_pages = []
        for page in recovered_pages:
            enriched_pages.append(_enrich_page_lexicon_metadata(page, data_root=lexicon_root))
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
) -> PageExtractionArtifact | None:
    data_root = data_root or get_books_root()
    return _load_page_artifact(_page_artifact_path(book_id, page_number, data_root), data_root=data_root)


def parse_text_into_page_artifact(
    *,
    text: str,
    language_code: str,
    title: str | None = None,
    data_root: Path | None = None,
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
    )
    extraction_path, extracted_page_count = extract_book_text(
        book=book,
        page_start=1,
        page_count=book.total_pages,
        force=True,
        data_root=books_root,
        ocr_provider="local",
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
    path.write_text(artifact.model_dump_json(indent=2), encoding="utf-8")


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


def _enrich_page_lexicon_metadata(page_result: PageExtractionResult, *, data_root: Path) -> PageExtractionResult:
    if page_result.language_code.lower() != "zh":
        return page_result

    surface_forms = {
        token.surface_form
        for sentence in page_result.sentences
        for token in sentence.tokens
        if token.surface_form
    }
    lexicon_entries = lookup_lexicon_entry_map(
        data_root=data_root,
        language_code=page_result.language_code,
        terms=surface_forms,
    )
    pinyin_map = lookup_lexicon_pinyin_map(
        data_root=data_root,
        language_code=page_result.language_code,
        terms=surface_forms,
    )
    if not pinyin_map and not lexicon_entries:
        return page_result

    sentences = []
    for sentence in page_result.sentences:
        tokens = []
        for token in sentence.tokens:
            exact_entry = lexicon_entries.get(token.surface_form)
            romanization = token.romanization or (exact_entry.pinyin if exact_entry else None) or pinyin_map.get(token.surface_form)
            definition_short = token.definition_short or (exact_entry.definition if exact_entry else None)
            proficiency_level = token.proficiency_level or (exact_entry.hsk_level if exact_entry else None)
            proficiency_system = token.proficiency_system or ("HSK" if exact_entry and exact_entry.hsk_level else None)
            tokens.append(
                token.model_copy(
                    update={
                        "romanization": romanization,
                        "definition_short": definition_short,
                        "proficiency_level": proficiency_level,
                        "proficiency_system": proficiency_system,
                    }
                )
            )
        sentences.append(sentence.model_copy(update={"tokens": tokens}))

    return page_result.model_copy(update={"sentences": sentences})


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
    progress_callback: ExtractionProgressCallback | None = None,
) -> tuple[PageExtractionArtifact, ...]:
    data_root = data_root or get_books_root()
    lexicon_root = data_root.parent if data_root.name == "books" else data_root
    pages_root = Path(book.pages_path) if book.pages_path else data_root / book.id / "pages"
    extraction_root = _artifact_dir(book.id, data_root) / "pages"
    extraction_root.mkdir(parents=True, exist_ok=True)

    source_pdf = Path(book.source_path)
    start_page = max(1, page_start)
    end_page = book.total_pages if page_count is None else min(book.total_pages, start_page + page_count - 1)
    total_to_process = max(0, end_page - start_page + 1)
    fixture_pages = load_text_fixture_pages(source_pdf) if is_text_fixture_source(source_pdf) else None
    reader = None if fixture_pages is not None else PdfReader(str(source_pdf))
    current_text_source, current_text_source_signature = (
        (FIXTURE_TEXT_SOURCE, FIXTURE_TEXT_SIGNATURE)
        if fixture_pages is not None
        else get_text_source_signature(ocr_provider or book.ocr_provider)
    )

    page_results: list[PageExtractionResult] = []
    artifact_meta: list[tuple[str, str, str, PageExtractionResult]] = []
    processed_count = 0
    for page_number in range(start_page, end_page + 1):
        page_image_path = pages_root / f"page-{page_number:04d}.png"
        page_hash = _page_image_hash(page_image_path)
        artifact_path = _page_artifact_path(book.id, page_number, data_root)
        existing_artifact = _load_page_artifact(artifact_path)
        if (
            not force
            and existing_artifact
            and existing_artifact.source_page_sha256 == page_hash
            and existing_artifact.text_source == current_text_source
            and existing_artifact.text_source_signature == current_text_source_signature
        ):
            page_result = existing_artifact.page.model_copy(deep=True)
            page_result = _enrich_page_lexicon_metadata(page_result, data_root=lexicon_root)
            page_results.append(page_result)
            artifact_meta.append(
                (page_hash, existing_artifact.text_source, existing_artifact.text_source_signature, page_result)
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
        else:
            assert reader is not None
            fallback_text = reader.pages[page_number - 1].extract_text() or ""
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
        page_result = _enrich_page_lexicon_metadata(page_result, data_root=lexicon_root)
        page_results.append(page_result)
        artifact_meta.append((page_hash, text_source, text_source_signature, page_result))
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
    progress_callback: ExtractionProgressCallback | None = None,
) -> tuple[Path, int]:
    data_root = data_root or get_books_root()
    artifacts = extract_book_pages(
        book=book,
        page_start=page_start,
        page_count=page_count,
        force=force,
        ocr_provider=ocr_provider,
        data_root=data_root,
        progress_callback=progress_callback,
    )
    pages = [artifact.page for artifact in artifacts]
    if not pages:
        raise ValueError("No pages were extracted.")

    page_start_value = pages[0].page_number
    page_end_value = pages[-1].page_number
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
