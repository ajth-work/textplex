from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import fitz
from pypdf import PdfReader

from app.core.paths import get_books_root
from app.schemas.books import BookPageManifest, BookRecord, PageRecord


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _book_id_from_hash(source_sha256: str) -> str:
    return f"book-{source_sha256[:12]}"


def _safe_text(value: str | None, fallback: str) -> str:
    if value is None:
        return fallback
    stripped = value.strip()
    return stripped or fallback


def _optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _page_filename(page_number: int) -> str:
    return f"page-{page_number:04d}.png"


def _write_manifest(manifest_path: Path, manifest: BookPageManifest) -> None:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")


def _load_manifest(manifest_path: Path, book_id: str, source_path: str, total_pages: int) -> BookPageManifest:
    if not manifest_path.exists():
        return BookPageManifest(book_id=book_id, source_path=source_path, total_pages=total_pages, page_count=0, pages=[])
    return BookPageManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))


def split_pdf_into_page_images(
    source_path: str | Path,
    *,
    book_id: str,
    total_pages: int,
    page_start: int = 1,
    page_count: int | None = None,
    data_root: Path | None = None,
) -> BookPageManifest:
    resolved_source_path = Path(source_path).expanduser().resolve()
    data_root = data_root or get_books_root()
    book_dir = data_root / book_id
    pages_dir = book_dir / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    start_page = max(1, page_start)
    end_page = total_pages if page_count is None else min(total_pages, start_page + page_count - 1)

    manifest_path = pages_dir / "manifest.json"
    manifest = _load_manifest(manifest_path, book_id, str(resolved_source_path), total_pages)
    existing_pages = {page.page_number: page for page in manifest.pages}
    with fitz.open(str(resolved_source_path)) as document:
        for page_number in range(start_page, end_page + 1):
            image_filename = _page_filename(page_number)
            image_path = pages_dir / image_filename
            if not image_path.exists():
                page = document.load_page(page_number - 1)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                pixmap.save(str(image_path))

            existing_pages[page_number] = PageRecord(
                page_number=page_number,
                image_filename=image_filename,
                image_path=str(image_path),
                status="ready",
                created_at=_utc_now(),
            )
            manifest = BookPageManifest(
                book_id=book_id,
                source_path=str(resolved_source_path),
                total_pages=total_pages,
                page_count=len(existing_pages),
                pages=[existing_pages[number] for number in sorted(existing_pages)],
            )
            _write_manifest(manifest_path, manifest)

    return manifest


def import_book_from_path(
    source_path: str | Path,
    *,
    language_code: str,
    title: str | None = None,
    author: str | None = None,
    page_start: int = 1,
    page_count: int | None = None,
    data_root: Path | None = None,
) -> BookRecord:
    resolved_source_path = Path(source_path).expanduser().resolve()
    if not resolved_source_path.exists():
        raise FileNotFoundError(f"Source PDF not found: {resolved_source_path}")
    if resolved_source_path.suffix.lower() != ".pdf":
        raise ValueError("TextPlex import currently accepts PDF files only.")

    data_root = data_root or get_books_root()
    data_root.mkdir(parents=True, exist_ok=True)

    source_bytes = resolved_source_path.read_bytes()
    source_sha256 = hashlib.sha256(source_bytes).hexdigest()
    book_id = _book_id_from_hash(source_sha256)

    reader = PdfReader(str(resolved_source_path))
    pdf_title = reader.metadata.title if reader.metadata else None
    pdf_author = reader.metadata.author if reader.metadata else None
    pages_dir = data_root / book_id / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    record = BookRecord(
        id=book_id,
        title=_safe_text(title, _safe_text(pdf_title, resolved_source_path.stem)),
        author=_optional_text(author) or _optional_text(pdf_author),
        language_code=language_code,
        source_filename=resolved_source_path.name,
        source_path=str(resolved_source_path),
        source_sha256=source_sha256,
        total_pages=len(reader.pages),
        status="imported",
        page_split_status="not_started",
        page_image_count=0,
        pages_path=str(pages_dir),
        created_at=_utc_now(),
        processed_at=None,
    )

    book_dir = data_root / book_id
    book_dir.mkdir(parents=True, exist_ok=True)
    (book_dir / "book.json").write_text(
        record.model_dump_json(indent=2),
        encoding="utf-8",
    )

    page_manifest = split_pdf_into_page_images(
        resolved_source_path,
        book_id=book_id,
        total_pages=record.total_pages,
        page_start=page_start,
        page_count=page_count,
        data_root=data_root,
    )
    record.page_split_status = "complete"
    record.page_image_count = page_manifest.page_count
    record.status = "pages_split"
    record.processed_at = _utc_now()
    (book_dir / "book.json").write_text(
        record.model_dump_json(indent=2),
        encoding="utf-8",
    )

    registry_path = data_root / "registry.json"
    registry = load_registry(registry_path)
    registry[record.id] = record
    save_registry(registry_path, registry)

    return record


def load_registry(registry_path: Path) -> dict[str, BookRecord]:
    if not registry_path.exists():
        return {}

    raw = json.loads(registry_path.read_text(encoding="utf-8"))
    return {book_id: BookRecord.model_validate(payload) for book_id, payload in raw.items()}


def save_registry(registry_path: Path, registry: dict[str, BookRecord]) -> None:
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {book_id: record.model_dump(mode="json") for book_id, record in registry.items()}
    registry_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
