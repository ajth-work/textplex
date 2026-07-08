from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader

from app.core.paths import get_books_root
from app.schemas.books import BookRecord


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


def import_book_from_path(
    source_path: str | Path,
    *,
    language_code: str,
    title: str | None = None,
    author: str | None = None,
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
        created_at=_utc_now(),
        processed_at=None,
    )

    book_dir = data_root / book_id
    book_dir.mkdir(parents=True, exist_ok=True)
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
