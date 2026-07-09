from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.core.paths import get_data_root
from app.schemas.books import BookExtractionRequest, BookImportRequest, BookPageManifest, BookReaderPageResponse, BookRecord
from app.schemas.learning import LearningProfileSummary, PageReadCreateRequest, PageReadRecord, ReadingSessionCreateRequest, ReadingSessionRecord
from app.schemas.lexicon import LexiconImportRequest, LexiconImportSummary, LexiconLookupResponse
from app.services.book_extraction import extract_book_text, load_page_artifact
from app.services.book_registry import import_book_from_path, load_registry, save_registry
from app.services.learning_profile import create_reading_session, get_learning_profile_summary, record_page_read
from app.services.lexicon import import_lexicon_from_source, lookup_lexicon_entry
from processor.contracts import BookExtractionResult


app = FastAPI(title="TextPlex API", version="0.1.0")
app.state.data_root = get_data_root()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _registry_path() -> Path:
    return app.state.data_root / "books" / "registry.json"


def _load_book_registry() -> dict[str, BookRecord]:
    return load_registry(_registry_path())


def _book_exists(book_id: str) -> BookRecord:
    registry = _load_book_registry()
    try:
        return registry[book_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}") from exc


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/books", response_model=list[BookRecord])
def list_books() -> list[BookRecord]:
    registry = _load_book_registry()
    return sorted(
        registry.values(),
        key=lambda record: record.processed_at or record.created_at,
        reverse=True,
    )


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
    registry = _load_book_registry()
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


@app.get("/books/{book_id}/pages/{page_number}", response_model=BookReaderPageResponse)
def get_book_page(book_id: str, page_number: int) -> BookReaderPageResponse:
    registry = _load_book_registry()
    try:
        book = registry[book_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}") from exc

    pages_path = app.state.data_root / "books" / book_id / "pages" / "manifest.json"
    if not pages_path.exists():
        raise HTTPException(status_code=404, detail=f"Page manifest not found for book: {book_id}")

    manifest = BookPageManifest.model_validate_json(pages_path.read_text(encoding="utf-8"))
    try:
        page = next(page for page in manifest.pages if page.page_number == page_number)
    except StopIteration as exc:
        raise HTTPException(status_code=404, detail=f"Page not found: {page_number}") from exc

    extraction = load_page_artifact(book_id=book_id, page_number=page_number, data_root=app.state.data_root / "books")
    image_url = f"/books/{book_id}/pages/{page_number}/image"
    return BookReaderPageResponse(book=book, page=page, image_url=image_url, extraction=extraction)


@app.get("/books/{book_id}/pages/{page_number}/image")
def get_book_page_image(book_id: str, page_number: int) -> FileResponse:
    registry = _load_book_registry()
    try:
        book = registry[book_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}") from exc

    pages_root = Path(book.pages_path) if book.pages_path else app.state.data_root / "books" / book_id / "pages"
    image_path = pages_root / f"page-{page_number:04d}.png"
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Page image not found: {page_number}")
    return FileResponse(image_path, media_type="image/png", filename=image_path.name)


@app.post("/books/{book_id}/extract")
def extract_book(book_id: str, payload: BookExtractionRequest) -> dict[str, str]:
    registry_path = _registry_path()
    registry = _load_book_registry()
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


@app.get("/learning/profile", response_model=LearningProfileSummary)
def get_learning_profile() -> LearningProfileSummary:
    return get_learning_profile_summary(app.state.data_root)


@app.post("/learning/sessions", response_model=ReadingSessionRecord)
def open_learning_session(payload: ReadingSessionCreateRequest) -> ReadingSessionRecord:
    _book_exists(payload.book_id)
    return create_reading_session(app.state.data_root, payload)


@app.post("/learning/page-reads", response_model=PageReadRecord)
def create_page_read(payload: PageReadCreateRequest) -> PageReadRecord:
    _book_exists(payload.book_id)
    try:
        return record_page_read(app.state.data_root, payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/lexicon/import", response_model=LexiconImportSummary)
def import_lexicon(payload: LexiconImportRequest) -> LexiconImportSummary:
    try:
        return import_lexicon_from_source(
            payload.source_root,
            data_root=app.state.data_root,
            language_code=payload.language_code,
            replace_existing=payload.replace_existing,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/lexicon/lookup", response_model=LexiconLookupResponse)
def lookup_lexicon(language_code: str, term: str) -> LexiconLookupResponse:
    return lookup_lexicon_entry(
        data_root=app.state.data_root,
        language_code=language_code,
        term=term,
    )
