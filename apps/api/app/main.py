from pathlib import Path
import json
import logging
import os
import shutil
import threading
import time
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.core.paths import get_data_root, get_repo_root, resolve_books_root, resolve_user_data_root
from app.schemas.auth import AuthMeResponse, HostedProfileSurfaceResponse, HostedProfileUpdateRequest
from app.schemas.books import BookExtractionRequest, BookImportRequest, BookPageManifest, BookReaderPageResponse, BookRecord, PageExtractionArtifact, TextImportRequest, TextParseRequest
from app.schemas.learning import (
    LearningProfileSummary,
    LearningSyncResponse,
    PageReadCreateRequest,
    PageReadRecord,
    ReadingSessionCreateRequest,
    ReadingSessionRecord,
    SentenceReadCreateRequest,
    SentenceReadRecord,
)
from app.schemas.lexicon import LexiconImportRequest, LexiconImportSummary, LexiconLookupResponse
from app.schemas.surfaces import ActivitySurfaceResponse, BookAnalysisSurfaceResponse, ImportSurfaceResponse, ProgressSurfaceResponse, ProfileSurfaceResponse, SearchSurfaceResponse, SettingEntry, SettingsSurfaceResponse, SettingsUpdateRequest, StudySurfaceResponse
from app.services.book_extraction import (
    extract_book_text,
    import_text_into_book,
    load_page_artifact,
    parse_text_into_page_artifact,
    recover_book_extraction_result,
)
from app.schemas.migration import ProfileMigrationRequest, ProfileMigrationResponse
from app.schemas.themes import ThemeCatalogResponse, ThemeCheckoutRequest, ThemeCheckoutResponse, ThemeEntitlementResponse
from app.services.book_registry import delete_book_from_path, import_book_from_path, load_registry, save_registry
from app.services.auth import AuthenticatedUserContext, get_authenticated_user_context, get_current_user, get_hosted_profile, get_hosted_settings, get_optional_user_context, get_public_user_context, supabase_is_configured, update_hosted_profile, update_hosted_settings
from app.services.learning_profile import create_reading_session, get_learning_profile_summary, record_page_read, record_sentence_read
from app.services.learning_sync import sync_learning_events
from app.services.commerce import apply_sandbox_event, create_checkout_session, get_entitlements, verify_sandbox_signature
from app.services.lexicon import import_lexicon_from_source, lookup_lexicon_entry
from app.services.profile_migration import apply_profile_migration, preview_profile_migration
from app.services.themes import get_theme_catalog, validate_theme_settings
from app.services.surfaces import get_activity_surface, get_book_analysis_surface, get_import_surface, get_progress_surface, get_profile_surface, get_study_surface, load_settings_surface, search_surfaces, update_settings_surface
from processor.contracts import BookExtractionResult


app = FastAPI(title="TextPlex API", version="0.1.0")
app.state.data_root = get_data_root()
logger = logging.getLogger("textplex.api")
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "TEXTPLEX_CORS_ORIGINS",
        "http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:8200",
    ).split(",")
    if origin.strip()
]
cors_origin_regex = os.getenv("TEXTPLEX_CORS_ORIGIN_REGEX") or None
if cors_origin_regex is None:
    cors_origin_regex = None
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

_rate_limit_lock = threading.Lock()
_rate_limit_buckets: dict[str, tuple[float, int]] = {}


def _rate_limit_per_minute() -> int:
    raw_value = os.getenv("TEXTPLEX_RATE_LIMIT_PER_MINUTE", "300").strip()
    try:
        return max(1, int(raw_value))
    except ValueError:
        return 300


def _rate_limit_allowed(key: str, now: float) -> bool:
    window_start, count = _rate_limit_buckets.get(key, (now, 0))
    if now - window_start >= 60:
        window_start, count = now, 0
    count += 1
    _rate_limit_buckets[key] = (window_start, count)
    if len(_rate_limit_buckets) > 5000:
        cutoff = now - 60
        for bucket_key, (bucket_start, _) in list(_rate_limit_buckets.items()):
            if bucket_start < cutoff:
                _rate_limit_buckets.pop(bucket_key, None)
    return count <= _rate_limit_per_minute()


@app.middleware("http")
async def request_observability(request: Request, call_next):
    started_at = time.perf_counter()
    request_id = uuid4().hex
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.url.path not in {"/health", "/ready"}:
        client_host = request.client.host if request.client else "unknown"
        with _rate_limit_lock:
            allowed = _rate_limit_allowed(f"{client_host}:{request.method}:{request.url.path}", time.monotonic())
        if not allowed:
            logger.warning(json.dumps({"event": "rate_limited", "request_id": request_id, "method": request.method, "path": request.url.path}))
            return JSONResponse(
                status_code=429,
                content={"detail": "Request rate limit exceeded."},
                headers={"Retry-After": "60", "X-Request-ID": request_id},
            )
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(json.dumps({"event": "request_error", "request_id": request_id, "method": request.method, "path": request.url.path}))
        raise
    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    logger.info(json.dumps({"event": "request", "request_id": request_id, "method": request.method, "path": request.url.path, "status": response.status_code, "duration_ms": duration_ms}))
    return response

DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024


def _books_root() -> Path:
    return resolve_books_root(app.state.data_root)


def _configured_path_roots(environment_name: str, defaults: list[Path]) -> list[Path]:
    configured = os.getenv(environment_name, "").strip()
    values = [Path(value).expanduser() for value in configured.split(",") if value.strip()] if configured else defaults
    return [value.resolve() for value in values]


def _is_within_allowed_root(candidate: Path, roots: list[Path]) -> bool:
    resolved_candidate = candidate.resolve()
    return any(resolved_candidate == root or root in resolved_candidate.parents for root in roots)


def _validate_import_source(source_path: str, *, environment_name: str, defaults: list[Path]) -> Path:
    resolved_source = Path(source_path).expanduser().resolve()
    if not _is_within_allowed_root(resolved_source, _configured_path_roots(environment_name, defaults)):
        raise HTTPException(status_code=403, detail="The requested source path is outside the configured import roots.")
    return resolved_source


def _max_upload_bytes() -> int:
    raw_value = os.getenv("TEXTPLEX_MAX_UPLOAD_BYTES", str(DEFAULT_MAX_UPLOAD_BYTES)).strip()
    try:
        return max(1, int(raw_value))
    except ValueError:
        return DEFAULT_MAX_UPLOAD_BYTES


def _registry_path() -> Path:
    return _books_root() / "registry.json"


def _load_book_registry() -> dict[str, BookRecord]:
    return load_registry(_registry_path())


def _book_exists(
    book_id: str,
    context: AuthenticatedUserContext | None = None,
) -> BookRecord:
    registry = _load_book_registry()
    try:
        book = registry[book_id]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Book not found: {book_id}") from exc
    if context and book.owner_id and book.owner_id != context.user.id:
        raise HTTPException(status_code=404, detail="Book not found.")
    return book


def _visible_books(context: AuthenticatedUserContext | None) -> list[BookRecord]:
    return [
        book
        for book in _load_book_registry().values()
        if book.owner_id is None or (context and book.owner_id == context.user.id)
    ]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_and_persist_book(book: BookRecord, *, page_start: int, page_count: int | None) -> BookRecord:
    extraction_path, extracted_page_count = extract_book_text(
        book=book,
        page_start=page_start,
        page_count=page_count,
        force=True,
        ocr_provider=book.ocr_provider,
        data_root=_books_root(),
    )

    book.extraction_status = "complete"
    book.extracted_page_count = extracted_page_count
    book.extraction_path = str(extraction_path)
    book.status = "extracted"

    registry = _load_book_registry()
    registry[book.id] = book
    save_registry(_registry_path(), registry)
    book_path = _books_root() / book.id / "book.json"
    book_path.write_text(book.model_dump_json(indent=2), encoding="utf-8")
    return book


def _initialize_book_extraction(book: BookRecord, *, page_count: int | None) -> None:
    total_pages = page_count if page_count is not None else book.page_image_count or book.total_pages
    book.extraction_status = "processing"
    book.extraction_total_pages = total_pages
    book.extraction_pages_processed = 0
    book.extraction_current_page = None
    book.extraction_started_at = book.extraction_started_at or _utc_now()
    book.extraction_updated_at = _utc_now()
    if book.status not in {"archived"}:
        book.status = "processing"
    _persist_book(book)


def _update_book_extraction_progress(book: BookRecord, *, current_page: int, pages_processed: int, total_pages: int) -> None:
    book.extraction_total_pages = total_pages
    book.extraction_pages_processed = pages_processed
    book.extraction_current_page = current_page
    book.extraction_started_at = book.extraction_started_at or _utc_now()
    book.extraction_updated_at = _utc_now()
    book.extraction_status = "processing"
    if book.status not in {"archived"}:
        book.status = "processing"
    _persist_book(book)


def _complete_book_extraction(book: BookRecord, *, extraction_path: Path, extracted_page_count: int) -> None:
    book.extraction_status = "complete"
    book.extraction_total_pages = extracted_page_count
    book.extraction_pages_processed = extracted_page_count
    book.extracted_page_count = extracted_page_count
    book.extraction_current_page = book.page_image_count or book.total_pages
    book.extraction_updated_at = _utc_now()
    book.extraction_path = str(extraction_path)
    book.status = "extracted"
    _persist_book(book)


def _fail_book_extraction(book: BookRecord) -> None:
    book.extraction_status = "failed"
    book.extraction_updated_at = _utc_now()
    if book.status == "processing":
        book.status = "pages_split"
    _persist_book(book)


def _start_background_extraction(book: BookRecord, *, page_start: int, page_count: int | None) -> None:
    _initialize_book_extraction(book, page_count=page_count)
    _persist_book(book)

    def progress_callback(current_page: int, pages_processed: int, total_pages: int) -> None:
        _update_book_extraction_progress(
            book,
            current_page=current_page,
            pages_processed=pages_processed,
            total_pages=total_pages,
        )

    def worker() -> None:
        try:
            extraction_path, extracted_page_count = extract_book_text(
                book=book,
                page_start=page_start,
                page_count=page_count,
                force=True,
                ocr_provider=book.ocr_provider,
                data_root=_books_root(),
                progress_callback=progress_callback,
            )
        except Exception:
            _fail_book_extraction(book)
            return
        _complete_book_extraction(book, extraction_path=extraction_path, extracted_page_count=extracted_page_count)

    thread = threading.Thread(target=worker, name=f"textplex-extract-{book.id}", daemon=True)
    thread.start()


def _persist_book(book: BookRecord) -> BookRecord:
    registry = _load_book_registry()
    registry[book.id] = book
    save_registry(_registry_path(), registry)
    book_path = _books_root() / book.id / "book.json"
    book_path.write_text(book.model_dump_json(indent=2), encoding="utf-8")
    return book


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _storage_ready(path: Path) -> bool:
    try:
        return path.exists() and path.is_dir() and os.access(path, os.R_OK | os.W_OK)
    except OSError:
        return False


def _production_configuration_ready() -> bool:
    if os.getenv("APP_ENV", "development").strip().lower() != "production":
        return True
    configured_origins = [origin.strip().lower() for origin in os.getenv("TEXTPLEX_CORS_ORIGINS", "").split(",") if origin.strip()]
    has_insecure_origin = any(
        origin.startswith("http://localhost")
        or origin.startswith("http://127.")
        or origin.startswith("http://192.168.")
        for origin in configured_origins
    )
    return bool(configured_origins) and not has_insecure_origin and supabase_is_configured()


@app.get("/ready")
def readiness() -> JSONResponse:
    checks = {
        "books_storage": _storage_ready(_books_root()),
        "user_storage": _storage_ready(resolve_user_data_root(app.state.data_root)),
        "configuration": _production_configuration_ready(),
    }
    ready = all(checks.values())
    return JSONResponse(
        status_code=200 if ready else 503,
        content={"status": "ready" if ready else "not_ready", "checks": checks},
    )


@app.post("/texts/parse", response_model=PageExtractionArtifact)
def parse_text(payload: TextParseRequest) -> PageExtractionArtifact:
    return parse_text_into_page_artifact(
        text=payload.text,
        language_code=payload.language_code,
        title=payload.title,
        data_root=app.state.data_root,
    )


@app.post("/texts/import", response_model=BookRecord)
def import_text(
    payload: TextImportRequest,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookRecord:
    try:
        return import_text_into_book(
            text=payload.text,
            language_code=payload.language_code,
            title=payload.title,
            author=payload.author,
            data_root=_books_root(),
            owner_id=context.user.id if context else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/books", response_model=list[BookRecord])
def list_books(
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> list[BookRecord]:
    return sorted(
        (book for book in _visible_books(context) if book.archived_at is None),
        key=lambda record: record.processed_at or record.created_at,
        reverse=True,
    )


@app.get("/books/archived", response_model=list[BookRecord])
def list_archived_books(
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> list[BookRecord]:
    return sorted(
        (book for book in _visible_books(context) if book.archived_at is not None),
        key=lambda record: record.archived_at or record.processed_at or record.created_at,
        reverse=True,
    )


@app.post("/books/import", response_model=BookRecord)
def import_book(
    payload: BookImportRequest,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookRecord:
    try:
        source_path = _validate_import_source(
            payload.source_path,
            environment_name="TEXTPLEX_IMPORT_ROOTS",
            defaults=[get_repo_root() / "tests" / "fixtures", app.state.data_root / "uploads"],
        )
        book = import_book_from_path(
            source_path,
            language_code=payload.language_code,
            ocr_provider=payload.ocr_provider,
            title=payload.title,
            author=payload.author,
            page_start=payload.page_start,
            page_count=payload.page_count,
            data_root=_books_root(),
            owner_id=context.user.id if context else None,
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
    ocr_provider: str | None = Form(default=None),
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookRecord:
    filename = Path(file.filename or "uploaded.pdf").name
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="TextPlex import currently accepts PDF files only.")

    uploads_root = app.state.data_root / "uploads"
    uploads_root.mkdir(parents=True, exist_ok=True)
    upload_dir = uploads_root / uuid4().hex
    upload_dir.mkdir(parents=True, exist_ok=True)
    upload_path = upload_dir / filename

    succeeded = False
    try:
        total_bytes = 0
        with upload_path.open("wb") as destination:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > _max_upload_bytes():
                    raise HTTPException(status_code=413, detail="Uploaded PDF exceeds the configured size limit.")
                destination.write(chunk)
        book = import_book_from_path(
            upload_path,
            language_code=language_code,
            ocr_provider=ocr_provider,
            title=title,
            author=author,
            source_filename=filename,
            page_start=page_start,
            page_count=page_count,
            data_root=_books_root(),
            owner_id=context.user.id if context else None,
        )
        _start_background_extraction(book, page_start=page_start, page_count=page_count)
        succeeded = True
        return book
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        await file.close()
        if not succeeded:
            shutil.rmtree(upload_dir, ignore_errors=True)


@app.get("/books/{book_id}", response_model=BookRecord)
def get_book(
    book_id: str,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookRecord:
    return _book_exists(book_id, context)


@app.get("/books/{book_id}/pages", response_model=BookPageManifest)
def get_book_pages(
    book_id: str,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookPageManifest:
    _book_exists(book_id, context)
    pages_path = _books_root() / book_id / "pages" / "manifest.json"
    if not pages_path.exists():
        raise HTTPException(status_code=404, detail=f"Page manifest not found for book: {book_id}")
    return BookPageManifest.model_validate_json(pages_path.read_text(encoding="utf-8"))


@app.get("/books/{book_id}/pages/{page_number}", response_model=BookReaderPageResponse)
def get_book_page(
    book_id: str,
    page_number: int,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookReaderPageResponse:
    book = _book_exists(book_id, context)

    pages_path = _books_root() / book_id / "pages" / "manifest.json"
    if not pages_path.exists():
        raise HTTPException(status_code=404, detail=f"Page manifest not found for book: {book_id}")

    manifest = BookPageManifest.model_validate_json(pages_path.read_text(encoding="utf-8"))
    try:
        page = next(page for page in manifest.pages if page.page_number == page_number)
    except StopIteration as exc:
        raise HTTPException(status_code=404, detail=f"Page not found: {page_number}") from exc

    extraction = load_page_artifact(book_id=book_id, page_number=page_number, data_root=_books_root())
    image_url = f"/books/{book_id}/pages/{page_number}/image"
    return BookReaderPageResponse(book=book, page=page, image_url=image_url, extraction=extraction)


@app.get("/books/{book_id}/pages/{page_number}/image")
def get_book_page_image(
    book_id: str,
    page_number: int,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> FileResponse:
    book = _book_exists(book_id, context)

    pages_root = Path(book.pages_path) if book.pages_path else _books_root() / book_id / "pages"
    image_path = pages_root / f"page-{page_number:04d}.png"
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Page image not found: {page_number}")
    return FileResponse(image_path, media_type="image/png", filename=image_path.name)


@app.delete("/books/{book_id}")
def delete_book(
    book_id: str,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> dict[str, str]:
    _book_exists(book_id, context)

    delete_book_from_path(book_id, _books_root())
    return {"status": "deleted", "book_id": book_id}


@app.post("/books/{book_id}/archive", response_model=BookRecord)
def archive_book(
    book_id: str,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookRecord:
    book = _book_exists(book_id, context)
    book.archived_at = book.archived_at or book.processed_at or book.created_at
    book.status = "archived"
    return _persist_book(book)


@app.post("/books/{book_id}/restore", response_model=BookRecord)
def restore_book(
    book_id: str,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookRecord:
    book = _book_exists(book_id, context)
    book.archived_at = None
    if book.extraction_status == "complete":
        book.status = "extracted"
    elif book.page_split_status == "complete":
        book.status = "pages_split"
    else:
        book.status = "imported"
    return _persist_book(book)


@app.post("/books/{book_id}/extract")
def extract_book(
    book_id: str,
    payload: BookExtractionRequest,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> dict[str, str]:
    registry_path = _registry_path()
    registry = _load_book_registry()
    book = _book_exists(book_id, context)

    try:
        if payload.ocr_provider:
            book.ocr_provider = payload.ocr_provider
        extraction_path, extracted_page_count = extract_book_text(
            book=book,
            page_start=payload.page_start,
            page_count=payload.page_count,
            force=payload.force,
            ocr_provider=payload.ocr_provider or book.ocr_provider,
            data_root=_books_root(),
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
    book_path = _books_root() / book_id / "book.json"
    book_path.write_text(book.model_dump_json(indent=2), encoding="utf-8")
    return {"status": "complete", "extraction_path": str(extraction_path)}


@app.get("/books/{book_id}/extractions", response_model=BookExtractionResult)
def get_book_extraction(
    book_id: str,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookExtractionResult:
    _book_exists(book_id, context)
    extraction_path = _books_root() / book_id / "extractions" / "book-extraction.json"
    if not extraction_path.exists():
        raise HTTPException(status_code=404, detail=f"Extraction not found for book: {book_id}")
    extraction = BookExtractionResult.model_validate_json(extraction_path.read_text(encoding="utf-8"))
    recovered = recover_book_extraction_result(extraction, data_root=_books_root())
    if recovered is not extraction:
        extraction_path.write_text(recovered.model_dump_json(indent=2), encoding="utf-8")
        return recovered
    return extraction


@app.get("/learning/profile", response_model=LearningProfileSummary)
def get_learning_profile(
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> LearningProfileSummary:
    return get_learning_profile_summary(app.state.data_root, owner_id=context.user.id if context else None)


@app.get("/auth/me", response_model=AuthMeResponse)
def get_authenticated_user(user: AuthMeResponse = Depends(get_current_user)) -> AuthMeResponse:
    return user


@app.post("/learning/sessions", response_model=ReadingSessionRecord)
def open_learning_session(
    payload: ReadingSessionCreateRequest,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> ReadingSessionRecord:
    _book_exists(payload.book_id, context)
    return create_reading_session(app.state.data_root, payload, owner_id=context.user.id if context else None)


@app.post("/learning/page-reads", response_model=PageReadRecord)
def create_page_read(
    payload: PageReadCreateRequest,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> PageReadRecord:
    _book_exists(payload.book_id, context)
    try:
        return record_page_read(app.state.data_root, payload, owner_id=context.user.id if context else None)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/learning/sentence-reads", response_model=SentenceReadRecord)
def create_sentence_read(
    payload: SentenceReadCreateRequest,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> SentenceReadRecord:
    _book_exists(payload.book_id, context)
    try:
        return record_sentence_read(app.state.data_root, payload, owner_id=context.user.id if context else None)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/learning/sync", response_model=LearningSyncResponse)
def synchronize_learning_events(
    context: AuthenticatedUserContext = Depends(get_authenticated_user_context),
) -> LearningSyncResponse:
    return sync_learning_events(app.state.data_root, context)


@app.post("/lexicon/import", response_model=LexiconImportSummary)
def import_lexicon(payload: LexiconImportRequest) -> LexiconImportSummary:
    try:
        source_root = None
        if payload.source_root:
            source_root = _validate_import_source(
                payload.source_root,
                environment_name="TEXTPLEX_LEXICON_ROOTS",
                defaults=[get_repo_root() / "resources" / "lexicon"],
            )
        return import_lexicon_from_source(
            source_root,
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
def get_analysis_surface(
    book_id: str,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> BookAnalysisSurfaceResponse:
    try:
        _book_exists(book_id, context)
        return get_book_analysis_surface(app.state.data_root, book_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/search", response_model=SearchSurfaceResponse)
def search_surface(query: str, limit: int = 20) -> SearchSurfaceResponse:
    return search_surfaces(app.state.data_root, query=query, limit=limit)


@app.get("/study", response_model=StudySurfaceResponse)
def study_surface(
    language_code: str | None = None,
    limit: int = 50,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> StudySurfaceResponse:
    return get_study_surface(
        app.state.data_root,
        language_code=language_code,
        limit=limit,
        owner_id=context.user.id if context else None,
    )


@app.get("/progress", response_model=ProgressSurfaceResponse)
def progress_surface(
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> ProgressSurfaceResponse:
    return get_progress_surface(app.state.data_root, owner_id=context.user.id if context else None)


@app.get("/profile", response_model=ProfileSurfaceResponse)
def profile_surface(
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> ProfileSurfaceResponse:
    return get_profile_surface(app.state.data_root, owner_id=context.user.id if context else None)


@app.get("/profile/hosted", response_model=HostedProfileSurfaceResponse)
def hosted_profile_surface(
    context: AuthenticatedUserContext = Depends(get_authenticated_user_context),
) -> HostedProfileSurfaceResponse:
    return get_hosted_profile(context)


@app.put("/profile/hosted", response_model=HostedProfileSurfaceResponse)
def put_hosted_profile(
    payload: HostedProfileUpdateRequest,
    context: AuthenticatedUserContext = Depends(get_authenticated_user_context),
) -> HostedProfileSurfaceResponse:
    return update_hosted_profile(context, payload)


@app.get("/profile/migration", response_model=ProfileMigrationResponse)
def get_profile_migration(
    context: AuthenticatedUserContext = Depends(get_authenticated_user_context),
) -> ProfileMigrationResponse:
    return preview_profile_migration(app.state.data_root, context.user.id)


@app.post("/profile/migration", response_model=ProfileMigrationResponse)
def post_profile_migration(
    payload: ProfileMigrationRequest,
    context: AuthenticatedUserContext = Depends(get_authenticated_user_context),
) -> ProfileMigrationResponse:
    return apply_profile_migration(app.state.data_root, context.user.id, payload)


@app.get("/themes/catalog", response_model=ThemeCatalogResponse)
def themes_catalog(
    context: AuthenticatedUserContext | None = Depends(get_public_user_context),
) -> ThemeCatalogResponse:
    return get_theme_catalog(context, data_root=app.state.data_root)


@app.post("/themes/checkout", response_model=ThemeCheckoutResponse)
def themes_checkout(
    payload: ThemeCheckoutRequest,
    context: AuthenticatedUserContext = Depends(get_authenticated_user_context),
) -> ThemeCheckoutResponse:
    return create_checkout_session(app.state.data_root, context.user.id, payload)


@app.post("/themes/webhooks/sandbox", response_model=ThemeCheckoutResponse)
async def themes_sandbox_webhook(
    request: Request,
) -> ThemeCheckoutResponse:
    raw_body = await request.body()
    verify_sandbox_signature(raw_body, request.headers.get("X-TextPlex-Sandbox-Signature"))
    try:
        payload = await request.json()
        if not isinstance(payload, dict):
            raise ValueError("Webhook payload must be an object.")
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid sandbox webhook JSON.") from None
    return apply_sandbox_event(app.state.data_root, payload)


@app.get("/themes/entitlements", response_model=ThemeEntitlementResponse)
def themes_entitlements(
    context: AuthenticatedUserContext = Depends(get_authenticated_user_context),
) -> ThemeEntitlementResponse:
    return get_entitlements(app.state.data_root, context.user.id)


@app.get("/activity", response_model=ActivitySurfaceResponse)
def activity_surface(
    limit: int = 50,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> ActivitySurfaceResponse:
    return get_activity_surface(
        app.state.data_root,
        limit=limit,
        owner_id=context.user.id if context else None,
    )


@app.get("/import", response_model=ImportSurfaceResponse)
def import_surface() -> ImportSurfaceResponse:
    return get_import_surface(app.state.data_root, default_language=os.getenv("DEFAULT_LANGUAGE", "zh"))


@app.get("/settings", response_model=SettingsSurfaceResponse)
def get_settings_surface(
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> SettingsSurfaceResponse:
    if context:
        hosted_entries = get_hosted_settings(context)
        return SettingsSurfaceResponse(entries=[SettingEntry.model_validate(entry) for entry in hosted_entries])
    return load_settings_surface(app.state.data_root, owner_id=context.user.id if context else None)


@app.put("/settings", response_model=SettingsSurfaceResponse)
def put_settings_surface(
    payload: SettingsUpdateRequest,
    context: AuthenticatedUserContext | None = Depends(get_optional_user_context),
) -> SettingsSurfaceResponse:
    if context:
        validate_theme_settings(payload, context, data_root=app.state.data_root)
        hosted_entries = update_hosted_settings(
            context,
            [{"key": entry.key, "value": entry.value} for entry in payload.entries],
        )
        return SettingsSurfaceResponse(entries=[SettingEntry.model_validate(entry) for entry in hosted_entries])
    return update_settings_surface(
        app.state.data_root,
        payload,
        owner_id=context.user.id if context else None,
    )
