from __future__ import annotations

import hashlib
import re
from pathlib import Path
from uuid import uuid4

from pypdf import PdfReader

from app.core.paths import get_books_root
from app.schemas.books import BookRecord, PageExtractionArtifact
from app.services.book_registry import import_book_from_path, load_registry, save_registry
from app.services.book_sources import is_text_fixture_source, load_text_fixture_pages
from app.services.book_sources import write_text_fixture_source
from app.services.ocr import get_text_source_signature, resolve_page_text
from app.services.lexicon import lookup_lexicon_pinyin_map
from processor import build_book_extraction_result, build_page_extraction_result
from processor.contracts import PageExtractionResult

FIXTURE_TEXT_SOURCE = "fixture"
FIXTURE_TEXT_SIGNATURE = "fixture-text-v1"
_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _artifact_dir(book_id: str, data_root: Path) -> Path:
    return data_root / book_id / "extractions"


def _page_artifact_path(book_id: str, page_number: int, data_root: Path) -> Path:
    return _artifact_dir(book_id, data_root) / "pages" / f"page-{page_number:04d}.json"


def _book_artifact_path(book_id: str, data_root: Path) -> Path:
    return _artifact_dir(book_id, data_root) / "book-extraction.json"


def _load_page_artifact(path: Path) -> PageExtractionArtifact | None:
    if not path.exists():
        return None
    return PageExtractionArtifact.model_validate_json(path.read_text(encoding="utf-8"))


def load_page_artifact(
    *,
    book_id: str,
    page_number: int,
    data_root: Path | None = None,
) -> PageExtractionArtifact | None:
    data_root = data_root or get_books_root()
    return _load_page_artifact(_page_artifact_path(book_id, page_number, data_root))


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
    page_result = _enrich_page_romanization(
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
    )

    book.extraction_status = "complete"
    book.extracted_page_count = extracted_page_count
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


def _enrich_page_romanization(page_result: PageExtractionResult, *, data_root: Path) -> PageExtractionResult:
    if page_result.language_code.lower() != "zh":
        return page_result

    surface_forms = {
        token.surface_form
        for sentence in page_result.sentences
        for token in sentence.tokens
        if token.surface_form
    }
    pinyin_map = lookup_lexicon_pinyin_map(
        data_root=data_root,
        language_code=page_result.language_code,
        terms=surface_forms,
    )
    if not pinyin_map:
        return page_result

    sentences = []
    for sentence in page_result.sentences:
        tokens = []
        for token in sentence.tokens:
            romanization = token.romanization or pinyin_map.get(token.surface_form)
            tokens.append(token.model_copy(update={"romanization": romanization}))
        sentences.append(sentence.model_copy(update={"tokens": tokens}))

    return page_result.model_copy(update={"sentences": sentences})


def extract_book_pages(
    *,
    book: BookRecord,
    page_start: int = 1,
    page_count: int | None = None,
    force: bool = False,
    data_root: Path | None = None,
) -> tuple[PageExtractionArtifact, ...]:
    data_root = data_root or get_books_root()
    lexicon_root = data_root.parent if data_root.name == "books" else data_root
    pages_root = Path(book.pages_path) if book.pages_path else data_root / book.id / "pages"
    extraction_root = _artifact_dir(book.id, data_root) / "pages"
    extraction_root.mkdir(parents=True, exist_ok=True)

    source_pdf = Path(book.source_path)
    start_page = max(1, page_start)
    end_page = book.total_pages if page_count is None else min(book.total_pages, start_page + page_count - 1)
    fixture_pages = load_text_fixture_pages(source_pdf) if is_text_fixture_source(source_pdf) else None
    reader = None if fixture_pages is not None else PdfReader(str(source_pdf))
    current_text_source, current_text_source_signature = (
        (FIXTURE_TEXT_SOURCE, FIXTURE_TEXT_SIGNATURE)
        if fixture_pages is not None
        else get_text_source_signature()
    )

    artifacts: list[PageExtractionArtifact] = []
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
            artifacts.append(existing_artifact)
            continue

        if fixture_pages is not None:
            raw_text = fixture_pages[page_number - 1][2]
            text_source = FIXTURE_TEXT_SOURCE
            text_source_signature = FIXTURE_TEXT_SIGNATURE
        else:
            assert reader is not None
            fallback_text = reader.pages[page_number - 1].extract_text() or ""
            raw_text, text_source, text_source_signature = resolve_page_text(
                fallback_text=fallback_text,
                page_image_path=page_image_path,
                book_title=book.title,
                language_code=book.language_code,
                page_number=page_number,
            )
        page_result = build_page_extraction_result(
            book_id=book.id,
            page_number=page_number,
            language_code=book.language_code,
            raw_text=raw_text,
            source_page_sha256=page_hash,
        )
        page_result = _enrich_page_romanization(page_result, data_root=lexicon_root)
        artifact = PageExtractionArtifact(
            source_page_sha256=page_hash,
            text_source=text_source,
            text_source_signature=text_source_signature,
            processor_version=page_result.processor_version,
            pipeline_version=page_result.pipeline_version,
            page=page_result,
        )
        _save_page_artifact(artifact_path, artifact)
        artifacts.append(artifact)

    return tuple(artifacts)


def extract_book_text(
    *,
    book: BookRecord,
    page_start: int = 1,
    page_count: int | None = None,
    force: bool = False,
    data_root: Path | None = None,
) -> tuple[Path, int]:
    data_root = data_root or get_books_root()
    artifacts = extract_book_pages(
        book=book,
        page_start=page_start,
        page_count=page_count,
        force=force,
        data_root=data_root,
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
