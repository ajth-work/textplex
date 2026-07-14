from pathlib import Path
import os
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.core.paths import get_data_root
from app.schemas.books import BookExtractionRequest, BookImportRequest, BookPageManifest, BookReaderPageResponse, BookRecord, PageExtractionArtifact, TextImportRequest, TextParseRequest
from app.schemas.learning import (
    LearningProfileSummary,
    PageReadCreateRequest,
    PageReadRecord,
    ReadingSessionCreateRequest,
    ReadingSessionRecord,
    SentenceReadCreateRequest,
    SentenceReadRecord,
)
from app.schemas.lexicon import LexiconImportRequest, LexiconImportSummary, LexiconLookupResponse
from app.schemas.surfaces import BookAnalysisSurfaceResponse, ImportSurfaceResponse, ProgressSurfaceResponse, SearchSurfaceResponse, SettingsSurfaceResponse, SettingsUpdateRequest, StudySurfaceResponse, ActivitySurfaceResponse
from app.services.book_extraction import extract_book_text, import_text_into_book, load_page_artifact, parse_text_into_page_artifact
from app.services.book_registry import delete_book_from_path, import_book_from_path, load_registry, save_registry
from app.services.learning_profile import create_reading_session, get_learning_profile_summary, record_page_read, record_sentence_read
from app.services.lexicon import import_lexicon_from_source, lookup_lexicon_entry
from app.services.surfaces import get_activity_surface, get_book_analysis_surface, get_import_surface, get_progress_surface, get_study_surface, load_settings_surface, search_surfaces, update_settings_surface
from processor.contracts import BookExtractionResult


app = FastAPI(title="TextPlex API", version="0.1.0")
app.state.data_root = get_data_root()
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "TEXTPLEX_CORS_ORIGINS",
        "http://127.0.0.1:8200,http://192.168.192.231:8200,null,https://ajth-work.github.io",
    ).split(",")
    if origin.strip()
]
cors_origin_regex = os.getenv("TEXTPLEX_CORS_ORIGIN_REGEX") or None
if cors_origin_regex is None:
    cors_origin_regex = (
        r"^https?://(?:"
        r"localhost|127\.0\.0\.1|::1|"
        r"10(?:\.\d{1,3}){3}|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}"
        r")(?::\d+)?$"
    )
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
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


def _extract_and_persist_book(book: BookRecord, *, page_start: int, page_count: int | None) -> BookRecord:
    extraction_path, extracted_page_count = extract_book_text(
        book=book,
        page_start=page_start,
        page_count=page_count,
        force=True,
        ocr_provider=book.ocr_provider,
        data_root=app.state.data_root / "books",
    )

    book.extraction_status = "complete"
    book.extracted_page_count = extracted_page_count
    book.extraction_path = str(extraction_path)
    book.status = "extracted"

    registry = _load_book_registry()
    registry[book.id] = book
    save_registry(_registry_path(), registry)
    book_path = app.state.data_root / "books" / book.id / "book.json"
    book_path.write_text(book.model_dump_json(indent=2), encoding="utf-8")
    return book


def _persist_book(book: BookRecord) -> BookRecord:
    registry = _load_book_registry()
    registry[book.id] = book
    save_registry(_registry_path(), registry)
    book_path = app.state.data_root / "books" / book.id / "book.json"
    book_path.write_text(book.model_dump_json(indent=2), encoding="utf-8")
    return book


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/texts/parse", response_model=PageExtractionArtifact)
def parse_text(payload: TextParseRequest) -> PageExtractionArtifact:
    return parse_text_into_page_artifact(
        text=payload.text,
        language_code=payload.language_code,
        title=payload.title,
        data_root=app.state.data_root,
    )


@app.post("/texts/import", response_model=BookRecord)
def import_text(payload: TextImportRequest) -> BookRecord:
    try:
        return import_text_into_book(
            text=payload.text,
            language_code=payload.language_code,
            title=payload.title,
            author=payload.author,
            data_root=app.state.data_root / "books",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/books", response_model=list[BookRecord])
def list_books() -> list[BookRecord]:
    registry = _load_book_registry()
    return sorted(
        (book for book in registry.values() if book.archived_at is None),
        key=lambda record: record.processed_at or record.created_at,
        reverse=True,
    )


@app.get("/books/archived", response_model=list[BookRecord])
def list_archived_books() -> list[BookRecord]:
    registry = _load_book_registry()
    return sorted(
        (book for book in registry.values() if book.archived_at is not None),
        key=lambda record: record.archived_at or record.processed_at or record.created_at,
        reverse=True,
    )


@app.post("/books/import", response_model=BookRecord)
def import_book(payload: BookImportRequest) -> BookRecord:
    try:
        book = import_book_from_path(
            payload.source_path,
            language_code=payload.language_code,
            ocr_provider=payload.ocr_provider,
            title=payload.title,
            author=payload.author,
            page_start=payload.page_start,
            page_count=payload.page_count,
            data_root=app.state.data_root / "books",
        )
        return _extract_and_persist_book(
            book,
            page_start=payload.page_start,
            page_count=payload.page_count,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/books/upload", response_model=BookRecord)
async def upload_book(
    file: UploadFile = File(...),
    language_code: str = Form(...),
    title: str | None = Form(default=None),
    author: str | None = Form(default=None),
    page_start: int = Form(default=1),
    page_count: int | None = Form(default=None),
    ocr_provider: str = Form(default="local"),
) -> BookRecord:
    filename = Path(file.filename or "uploaded.pdf").name
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="TextPlex import currently accepts PDF files only.")

    uploads_root = app.state.data_root / "uploads"
    uploads_root.mkdir(parents=True, exist_ok=True)
    upload_dir = uploads_root / uuid4().hex
    upload_dir.mkdir(parents=True, exist_ok=True)
    upload_path = upload_dir / filename

    try:
        contents = await file.read()
        upload_path.write_bytes(contents)
        book = import_book_from_path(
            upload_path,
            language_code=language_code,
            ocr_provider=ocr_provider,
            title=title,
            author=author,
            source_filename=filename,
            page_start=page_start,
            page_count=page_count,
            data_root=app.state.data_root / "books",
        )
        return _extract_and_persist_book(book, page_start=page_start, page_count=page_count)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        await file.close()


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


@app.delete("/books/{book_id}")
def delete_book(book_id: str) -> dict[str, str]:
    registry = _load_book_registry()
    if book_id not in registry:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}")

    delete_book_from_path(book_id, app.state.data_root / "books")
    return {"status": "deleted", "book_id": book_id}


@app.post("/books/{book_id}/archive", response_model=BookRecord)
def archive_book(book_id: str) -> BookRecord:
    book = _book_exists(book_id)
    book.archived_at = book.archived_at or book.processed_at or book.created_at
    book.status = "archived"
    return _persist_book(book)


@app.post("/books/{book_id}/restore", response_model=BookRecord)
def restore_book(book_id: str) -> BookRecord:
    book = _book_exists(book_id)
    book.archived_at = None
    if book.extraction_status == "complete":
        book.status = "extracted"
    elif book.page_split_status == "complete":
        book.status = "pages_split"
    else:
        book.status = "imported"
    return _persist_book(book)


@app.post("/books/{book_id}/extract")
def extract_book(book_id: str, payload: BookExtractionRequest) -> dict[str, str]:
    registry_path = _registry_path()
    registry = _load_book_registry()
    try:
        book = registry[book_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}") from exc

    try:
        if payload.ocr_provider:
            book.ocr_provider = payload.ocr_provider
        extraction_path, extracted_page_count = extract_book_text(
            book=book,
            page_start=payload.page_start,
            page_count=payload.page_count,
            force=payload.force,
            ocr_provider=payload.ocr_provider or book.ocr_provider,
            data_root=app.state.data_root / "books",
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    book.extraction_status = "complete"
    book.extracted_page_count = extracted_page_count
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


@app.post("/learning/sentence-reads", response_model=SentenceReadRecord)
def create_sentence_read(payload: SentenceReadCreateRequest) -> SentenceReadRecord:
    _book_exists(payload.book_id)
    try:
        return record_sentence_read(app.state.data_root, payload)
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


@app.get("/analysis/{book_id}", response_model=BookAnalysisSurfaceResponse)
def get_analysis_surface(book_id: str) -> BookAnalysisSurfaceResponse:
    try:
        return get_book_analysis_surface(app.state.data_root, book_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/search", response_model=SearchSurfaceResponse)
def search_surface(query: str, limit: int = 20) -> SearchSurfaceResponse:
    return search_surfaces(app.state.data_root, query=query, limit=limit)


@app.get("/study", response_model=StudySurfaceResponse)
def study_surface(language_code: str | None = None, limit: int = 50) -> StudySurfaceResponse:
    return get_study_surface(app.state.data_root, language_code=language_code, limit=limit)


@app.get("/progress", response_model=ProgressSurfaceResponse)
def progress_surface() -> ProgressSurfaceResponse:
    return get_progress_surface(app.state.data_root)


@app.get("/activity", response_model=ActivitySurfaceResponse)
def activity_surface(limit: int = 50) -> ActivitySurfaceResponse:
    return get_activity_surface(app.state.data_root, limit=limit)


@app.get("/import", response_model=ImportSurfaceResponse)
def import_surface() -> ImportSurfaceResponse:
    return get_import_surface(app.state.data_root, default_language=os.getenv("DEFAULT_LANGUAGE", "zh"))


@app.get("/settings", response_model=SettingsSurfaceResponse)
def get_settings_surface() -> SettingsSurfaceResponse:
    return load_settings_surface(app.state.data_root)


@app.put("/settings", response_model=SettingsSurfaceResponse)
def put_settings_surface(payload: SettingsUpdateRequest) -> SettingsSurfaceResponse:
    return update_settings_surface(app.state.data_root, payload)
