from fastapi import FastAPI, HTTPException

from app.core.paths import get_data_root
from app.schemas.books import BookExtractionRequest, BookImportRequest, BookPageManifest, BookRecord
from app.services.book_extraction import extract_book_text
from app.services.book_registry import import_book_from_path, load_registry, save_registry
from processor.contracts import BookExtractionResult


app = FastAPI(title="TextPlex API", version="0.1.0")
app.state.data_root = get_data_root()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/books/import", response_model=BookRecord)
def import_book(payload: BookImportRequest) -> BookRecord:
    try:
        return import_book_from_path(
            payload.source_path,
            language_code=payload.language_code,
            title=payload.title,
            author=payload.author,
            page_start=payload.page_start,
            page_count=payload.page_count,
            data_root=app.state.data_root / "books",
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/books/{book_id}", response_model=BookRecord)
def get_book(book_id: str) -> BookRecord:
    registry_path = app.state.data_root / "books" / "registry.json"
    registry = load_registry(registry_path)
    try:
        return registry[book_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}") from exc


@app.get("/books/{book_id}/pages", response_model=BookPageManifest)
def get_book_pages(book_id: str) -> BookPageManifest:
    pages_path = app.state.data_root / "books" / book_id / "pages" / "manifest.json"
    if not pages_path.exists():
        raise HTTPException(status_code=404, detail=f"Page manifest not found for book: {book_id}")
    return BookPageManifest.model_validate_json(pages_path.read_text(encoding="utf-8"))


@app.post("/books/{book_id}/extract")
def extract_book(book_id: str, payload: BookExtractionRequest) -> dict[str, str]:
    registry_path = app.state.data_root / "books" / "registry.json"
    registry = load_registry(registry_path)
    try:
        book = registry[book_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}") from exc

    try:
        extraction_path = extract_book_text(
            book=book,
            page_start=payload.page_start,
            page_count=payload.page_count,
            data_root=app.state.data_root / "books",
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    book.extraction_status = "complete"
    book.extracted_page_count = payload.page_count or max(0, book.total_pages - payload.page_start + 1)
    book.extraction_path = str(extraction_path)
    book.status = "extracted"
    registry[book_id] = book

    save_registry(registry_path, registry)
    book_path = app.state.data_root / "books" / book_id / "book.json"
    book_path.write_text(book.model_dump_json(indent=2), encoding="utf-8")
    return {"status": "complete", "extraction_path": str(extraction_path)}


@app.get("/books/{book_id}/extractions", response_model=BookExtractionResult)
def get_book_extraction(book_id: str) -> BookExtractionResult:
    extraction_path = app.state.data_root / "books" / book_id / "extractions" / "book-extraction.json"
    if not extraction_path.exists():
        raise HTTPException(status_code=404, detail=f"Extraction not found for book: {book_id}")
    return BookExtractionResult.model_validate_json(extraction_path.read_text(encoding="utf-8"))
