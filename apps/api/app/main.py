import asyncio
import json
import logging
import os
import shutil
import threading
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import fitz
from app.core.paths import (
    get_data_root,
    get_repo_root,
    resolve_books_root,
    resolve_user_data_root,
)
from app.schemas.admin_analytics import (
    AdminAnalyticsOverview,
    AnalyticsEventCreateRequest,
)
from app.schemas.admin_usage import AdminUsageSummary
from app.schemas.auth import (
    AccountRoleUpdateRequest,
    AuthMeResponse,
    HostedProfileSurfaceResponse,
    HostedProfileUpdateRequest,
)
from app.schemas.books import (
    BookExtractionRequest,
    BookImportRequest,
    BookPageManifest,
    BookReaderPageResponse,
    BookRecord,
    PageExtractionArtifact,
    PageRecord,
    SentenceTranslationPrefetchRequest,
    SentenceTranslationPrefetchResponse,
    SentenceTranslationResponse,
    TextImportRequest,
    TextParseRequest,
    TranslationMode,
    WikipediaRandomImportRequest,
)
from app.schemas.feedback import (
    FeedbackContext,
    FeedbackCreateRequest,
    FeedbackDigestRequest,
    FeedbackDigestResponse,
    FeedbackGitHubCreateRequest,
    FeedbackListResponse,
    FeedbackNotificationListResponse,
    FeedbackNotificationReadRequest,
    FeedbackRecord,
    FeedbackStatusUpdateRequest,
    FeedbackTesterVerificationRequest,
    TesterListResponse,
    TesterNicknameUpdateRequest,
    TesterRecord,
)
from app.schemas.generated_articles import (
    GeneratedReaderArticlePromptDetails,
    GeneratedReaderArticleRequest,
    GeneratedReaderArticleResponse,
)
from app.schemas.google_translate import GoogleTranslateUsageSummary
from app.schemas.learning import (
    BookCompletionRequest,
    LearningProfileSummary,
    LearningSyncResponse,
    PageReadCreateRequest,
    PageReadRecord,
    ReadingSessionCreateRequest,
    ReadingSessionRecord,
    SentenceReadCreateRequest,
    SentenceReadRecord,
    StudyVocabularyItemCreateRequest,
    StudyVocabularyItemRecord,
    VocabularyAssessmentReviewRequest,
    VocabularyAssessmentStateRecord,
    WordInteractionCreateRequest,
    WordInteractionRecord,
)
from app.schemas.lexicon import (
    JapaneseConjugationRequest,
    JapaneseConjugationResponse,
    LexiconImportRequest,
    LexiconImportSummary,
    LexiconLookupResponse,
)
from app.schemas.migration import ProfileMigrationRequest, ProfileMigrationResponse
from app.schemas.russian_program import RussianProgramResponse
from app.schemas.surfaces import (
    ActivitySurfaceResponse,
    BookAnalysisSurfaceResponse,
    ImportSurfaceResponse,
    ProfileSurfaceResponse,
    ProgressBookSummary,
    ProgressSurfaceResponse,
    SearchSurfaceResponse,
    SettingEntry,
    SettingsSurfaceResponse,
    SettingsUpdateRequest,
    StudySurfaceResponse,
)
from app.schemas.theme_admin import (
    ThemeAdminRecord,
    ThemeAdminResponse,
    ThemeAdminUpsertRequest,
    ThemeAiSuggestRequest,
    ThemeAiSuggestResponse,
)
from app.schemas.themes import (
    ThemeCatalogResponse,
    ThemeCheckoutRequest,
    ThemeCheckoutResponse,
    ThemeEntitlementResponse,
)
from app.services.admin_usage import get_admin_usage_summary
from app.services.analytics import get_admin_analytics_overview, record_analytics_event
from app.services.auth import (
    AuthenticatedUserContext,
    get_authenticated_user_context,
    get_current_user,
    get_hosted_profile,
    get_hosted_settings,
    get_optional_user_context,
    get_public_user_context,
    has_permission,
    require_permission,
    set_hosted_account_role,
    supabase_admin_is_configured,
    supabase_is_configured,
    update_hosted_profile,
    update_hosted_settings,
)
from app.services.book_extraction import (
    extract_book_text,
    import_text_into_book,
    load_page_artifact,
    parse_text_into_page_artifact,
    prefetch_book_sentence_translation_window,
    recover_book_extraction_result,
    translate_page_sentence,
)
from app.services.book_registry import (
    delete_book_from_path,
    import_book_from_path,
    load_registry,
    save_registry,
    split_source_into_page_images,
)
from app.services.commerce import (
    apply_sandbox_event,
    create_checkout_session,
    get_entitlements,
    verify_sandbox_signature,
)
from app.services.feedback import (
    MAX_FEEDBACK_SCREENSHOT_BYTES,
    MAX_FEEDBACK_SCREENSHOTS,
    MAX_FEEDBACK_SCREENSHOTS_TOTAL_BYTES,
    analyze_feedback_screenshots,
    create_feedback,
    create_github_issue,
    get_feedback_screenshot_file,
    list_feedback,
    list_testers,
    list_user_notifications,
    mark_user_notifications_read,
    submit_tester_verification,
    update_feedback_status,
    update_tester_nickname,
    validate_feedback_screenshot,
)
from app.services.feedback_digest import (
    feedback_digest_enabled,
    seconds_until_next_digest,
    send_feedback_digest,
)
from app.services.generated_articles import (
    generate_reader_article,
    load_generated_article_prompt_details,
)
from app.services.google_translate_usage import get_google_translate_usage_summary
from app.services.learning_profile import (
    create_reading_session,
    get_learning_profile_summary,
    record_page_read,
    record_sentence_read,
    record_study_vocabulary_item,
    set_page_by_page_completion,
    record_vocabulary_assessment_review,
    record_word_interaction,
)
from app.services.learning_sync import sync_learning_events
from app.services.lexicon import (
    import_lexicon_from_source,
    lookup_lexicon_entry,
    warm_lexicon,
)
from app.services.profile_migration import (
    apply_profile_migration,
    preview_profile_migration,
)
from app.services.reader_capabilities import get_reader_capabilities
from app.services.russian_program import get_russian_program
from app.services.surfaces import (
    get_activity_surface,
    get_book_analysis_surface,
    get_import_surface,
    get_profile_surface,
    get_progress_surface,
    get_study_surface,
    load_settings_surface,
    search_surfaces,
    update_settings_surface,
)
from app.services.theme_admin import (
    get_admin_themes,
    save_admin_theme,
    suggest_theme_with_ai,
)
from app.services.themes import get_theme_catalog, validate_theme_settings
from app.services.wikipedia import WikipediaImportError, fetch_random_article
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from processor import conjugate_japanese_verb
from processor.contracts import BookExtractionResult
from pypdf.errors import PdfReadError


async def _feedback_digest_scheduler() -> None:
    while True:
        await asyncio.sleep(seconds_until_next_digest())
        try:
            result = send_feedback_digest(app.state.data_root)
            logger.info("Feedback digest scheduler: %s", result.message)
        except Exception:
            logger.exception("Feedback digest scheduler failed; the next scheduled run will retry.")


@asynccontextmanager
async def _lifespan(_application: FastAPI):
    default_language = os.getenv("DEFAULT_LANGUAGE", "zh").strip() or "zh"
    try:
        await asyncio.to_thread(warm_lexicon, app.state.data_root, language_code=default_language)
        logger.info("Lexicon warm-up completed for %s", default_language)
    except Exception:
        logger.exception("Lexicon warm-up failed for %s; lookups will retry on demand", default_language)
    digest_task = asyncio.create_task(_feedback_digest_scheduler()) if feedback_digest_enabled() else None
    try:
        yield
    finally:
        if digest_task is not None:
            digest_task.cancel()
            await asyncio.gather(digest_task, return_exceptions=True)


app = FastAPI(title="TextPlex API", version="0.1.0", lifespan=_lifespan)
app.state.data_root = get_data_root()
OPTIONAL_USER_CONTEXT = Depends(get_optional_user_context)
AUTHENTICATED_USER_CONTEXT = Depends(get_authenticated_user_context)
PUBLIC_USER_CONTEXT = Depends(get_public_user_context)
CURRENT_USER = Depends(get_current_user)
UPLOAD_FILE = File(...)
OPTIONAL_SCREENSHOT_FILE = File(default=None)
OPTIONAL_SCREENSHOTS_FILE = File(default=None)
REQUIRED_LANGUAGE_CODE = Form(...)
OPTIONAL_TITLE = Form(default=None)
OPTIONAL_AUTHOR = Form(default=None)
OPTIONAL_PAGE_START = Form(default=1)
OPTIONAL_PAGE_COUNT = Form(default=None)
OPTIONAL_OCR_PROVIDER = Form(default=None)
TRANSLATION_MODE = Form(default="off")
logger = logging.getLogger("textplex.api")
_progressive_extraction_lock = threading.Lock()
_progressive_extraction_book_ids: set[str] = set()
_progressive_extraction_active_windows: dict[str, tuple[int, int]] = {}
_progressive_extraction_pending_windows: dict[str, list[tuple[int, int]]] = {}
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
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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
MAX_IMAGE_IMPORT_PAGES = 12
MAX_IMAGE_IMPORT_PAGE_BYTES = 20 * 1024 * 1024
SUPPORTED_IMAGE_IMPORT_EXTENSIONS = {".jpg", ".jpeg", ".png"}


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


async def _save_photo_import_as_pdf(images: list[UploadFile], upload_dir: Path) -> Path:
    if not images:
        raise HTTPException(status_code=400, detail="Add at least one page photo before importing.")
    if len(images) > MAX_IMAGE_IMPORT_PAGES:
        raise HTTPException(status_code=400, detail=f"Photo imports are limited to {MAX_IMAGE_IMPORT_PAGES} pages.")

    pdf_path = upload_dir / "photo-import.pdf"
    pdf_document = fitz.open()
    total_bytes = 0
    try:
        for page_number, image in enumerate(images, start=1):
            filename = Path(image.filename or "page.jpg").name
            extension = Path(filename).suffix.lower()
            if extension not in SUPPORTED_IMAGE_IMPORT_EXTENSIONS:
                raise HTTPException(status_code=400, detail="Photo imports currently accept JPG or PNG images.")
            image_bytes = await image.read()
            if not image_bytes:
                raise HTTPException(status_code=400, detail=f"Page {page_number} is empty.")
            if len(image_bytes) > MAX_IMAGE_IMPORT_PAGE_BYTES:
                raise HTTPException(status_code=413, detail=f"Page {page_number} exceeds the 20 MB image limit.")
            total_bytes += len(image_bytes)
            if total_bytes > _max_upload_bytes():
                raise HTTPException(status_code=413, detail="The photo batch exceeds the configured upload size limit.")
            try:
                image_document = fitz.open(stream=image_bytes, filetype=extension[1:])
                image_pdf = fitz.open("pdf", image_document.convert_to_pdf())
                pdf_document.insert_pdf(image_pdf)
                image_pdf.close()
                image_document.close()
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Page {page_number} is not a readable JPG or PNG image.") from exc
        pdf_document.save(str(pdf_path))
    finally:
        pdf_document.close()
        for image in images:
            await image.close()
    return pdf_path


async def _save_photo_import_as_images(
    images: list[UploadFile],
    *,
    book_id: str,
    source_path: str,
    pages_dir: Path,
    start_page: int,
    upload_dir: Path,
) -> BookPageManifest:
    if not images:
        raise HTTPException(status_code=400, detail="Add at least one page photo before importing.")
    if len(images) > MAX_IMAGE_IMPORT_PAGES:
        raise HTTPException(status_code=400, detail=f"Photo imports are limited to {MAX_IMAGE_IMPORT_PAGES} pages.")

    pages_dir.mkdir(parents=True, exist_ok=True)
    staged_pages_dir = upload_dir / "pages"
    staged_pages_dir.mkdir(parents=True, exist_ok=True)
    total_bytes = 0
    staged_paths: list[tuple[Path, Path]] = []
    try:
        for page_offset, image in enumerate(images):
            filename = Path(image.filename or "page.jpg").name
            extension = Path(filename).suffix.lower()
            if extension not in SUPPORTED_IMAGE_IMPORT_EXTENSIONS:
                raise HTTPException(status_code=400, detail="Photo imports currently accept JPG or PNG images.")
            image_bytes = await image.read()
            if not image_bytes:
                raise HTTPException(status_code=400, detail=f"Page {page_offset + 1} is empty.")
            if len(image_bytes) > MAX_IMAGE_IMPORT_PAGE_BYTES:
                raise HTTPException(status_code=413, detail=f"Page {page_offset + 1} exceeds the 20 MB image limit.")
            total_bytes += len(image_bytes)
            if total_bytes > _max_upload_bytes():
                raise HTTPException(status_code=413, detail="The photo batch exceeds the configured upload size limit.")

            staged_path = staged_pages_dir / f"page-{start_page + page_offset:04d}.png"
            try:
                with fitz.open(stream=image_bytes, filetype=extension[1:]) as image_document:
                    if image_document.page_count != 1:
                        raise ValueError("The uploaded image did not contain exactly one page.")
                    pixmap = image_document[0].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                    pixmap.save(str(staged_path))
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Page {page_offset + 1} is not a readable JPG or PNG image.") from exc
            staged_paths.append((staged_path, pages_dir / staged_path.name))
    finally:
        for image in images:
            await image.close()

    moved_paths: list[Path] = []
    try:
        for staged_path, final_path in staged_paths:
            os.replace(staged_path, final_path)
            moved_paths.append(final_path)

        manifest_path = pages_dir / "manifest.json"
        manifest = (
            BookPageManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
            if manifest_path.exists()
            else BookPageManifest(
                book_id=book_id,
                source_path=source_path,
                total_pages=0,
                page_count=0,
                pages=[],
            )
        )
        existing_pages = {page.page_number: page for page in manifest.pages}
        for _, final_path in staged_paths:
            page_number = int(final_path.stem.removeprefix("page-"))
            existing_pages[page_number] = PageRecord(
                page_number=page_number,
                image_filename=final_path.name,
                image_path=str(final_path),
                status="ready",
                created_at=_utc_now(),
            )
        updated_total_pages = max(manifest.total_pages, start_page + len(images) - 1)
        updated_manifest = BookPageManifest(
            book_id=manifest.book_id,
            source_path=manifest.source_path,
            total_pages=updated_total_pages,
            page_count=len(existing_pages),
            pages=[existing_pages[number] for number in sorted(existing_pages)],
        )
        manifest_path.write_text(updated_manifest.model_dump_json(indent=2), encoding="utf-8")
        return updated_manifest
    except Exception:
        for final_path in moved_paths:
            final_path.unlink(missing_ok=True)
        raise


async def _append_photo_pages_to_book(book: BookRecord, images: list[UploadFile], upload_dir: Path) -> BookRecord:
    if book.source_type != "page-by-page":
        raise HTTPException(status_code=400, detail="Only page-by-page books can receive more photo pages.")

    original_page_count = book.total_pages
    pages_dir = Path(book.pages_path) if book.pages_path else _books_root() / book.id / "pages"
    manifest = await _save_photo_import_as_images(
        images,
        book_id=book.id,
        source_path=book.source_path,
        pages_dir=pages_dir,
        start_page=original_page_count + 1,
        upload_dir=upload_dir,
    )
    book.total_pages = original_page_count + len(images)
    book.page_split_status = "complete"
    book.page_image_count = manifest.page_count
    book.status = "pages_split"
    book.processed_at = _utc_now()
    return book


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
    if context is not None and book.owner_id != context.user.id:
        raise HTTPException(status_code=404, detail="Book not found.")
    return book


def _visible_books(context: AuthenticatedUserContext | None) -> list[BookRecord]:
    return [
        book
        for book in _load_book_registry().values()
        if (context is None and book.owner_id is None)
        or (context is not None and book.owner_id == context.user.id)
    ]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_and_persist_book(
    book: BookRecord,
    *,
    page_start: int,
    page_count: int | None,
) -> BookRecord:
    extraction_path, extracted_page_count = extract_book_text(
        book=book,
        page_start=page_start,
        page_count=page_count,
        force=True,
        ocr_provider=book.ocr_provider,
        data_root=_books_root(),
        owner_id=book.owner_id,
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
    book.extraction_status = "processing"
    book.extraction_total_pages = book.total_pages
    book.extraction_started_at = book.extraction_started_at or _utc_now()
    book.extraction_updated_at = _utc_now()
    if book.status not in {"archived"}:
        book.status = "processing"
    _persist_book(book)


def _update_book_extraction_progress(book: BookRecord, *, current_page: int, pages_processed: int, total_pages: int) -> None:
    book.extraction_total_pages = book.total_pages
    book.extraction_pages_processed = max(book.extraction_pages_processed, current_page)
    book.extraction_current_page = current_page
    book.extraction_started_at = book.extraction_started_at or _utc_now()
    book.extraction_updated_at = _utc_now()
    book.extraction_status = "processing"
    if book.status not in {"archived"}:
        book.status = "processing"
    _persist_book(book)


def _extracted_page_numbers(book: BookRecord) -> set[int]:
    page_artifact_root = _books_root() / book.id / "extractions" / "pages"
    page_numbers: set[int] = set()
    for artifact_path in page_artifact_root.glob("page-*.json"):
        try:
            page_numbers.add(int(artifact_path.stem.removeprefix("page-")))
        except ValueError:
            continue
    return page_numbers


def _complete_book_extraction(book: BookRecord, *, extraction_path: Path, extracted_page_count: int, page_start: int) -> None:
    extracted_pages = _extracted_page_numbers(book)
    book.extraction_status = "complete" if len(extracted_pages) >= book.total_pages else "processing"
    book.extraction_total_pages = book.total_pages
    book.extraction_pages_processed = len(extracted_pages)
    book.extracted_page_count = len(extracted_pages)
    book.extraction_current_page = max(extracted_pages) if extracted_pages else None
    book.extraction_updated_at = _utc_now()
    book.extraction_path = str(extraction_path)
    book.status = "extracted" if len(extracted_pages) >= book.total_pages else "processing"
    _persist_book(book)


def _fail_book_extraction(book: BookRecord) -> None:
    book.extraction_status = "failed"
    book.extraction_updated_at = _utc_now()
    if book.status == "processing":
        book.status = "pages_split"
    _persist_book(book)


def _start_background_extraction(
    book: BookRecord,
    *,
    page_start: int,
    page_count: int | None,
    force: bool = True,
) -> None:
    page_start = max(1, page_start)
    if page_start > book.total_pages:
        return
    page_count = min(page_count or 2, book.total_pages - page_start + 1)
    with _progressive_extraction_lock:
        if book.id in _progressive_extraction_book_ids:
            requested_end = page_start + page_count - 1
            active_window = _progressive_extraction_active_windows.get(book.id)
            pending_windows = _progressive_extraction_pending_windows.setdefault(book.id, [])
            window = (page_start, page_count)
            known_windows = ([active_window] if active_window else []) + pending_windows
            if any(start <= page_start and start + count - 1 >= requested_end for start, count in known_windows):
                return
            if window not in pending_windows:
                pending_windows.append(window)
            return
        _progressive_extraction_book_ids.add(book.id)
        _progressive_extraction_active_windows[book.id] = (page_start, page_count)

    def worker() -> None:
        window: tuple[int, int] | None = (page_start, page_count)
        try:
            while window is not None:
                window_start, window_count = window
                _initialize_book_extraction(book, page_count=window_count)
                _persist_book(book)

                def progress_callback(current_page: int, pages_processed: int, total_pages: int) -> None:
                    _update_book_extraction_progress(book, current_page=current_page, pages_processed=pages_processed, total_pages=total_pages)

                manifest = split_source_into_page_images(
                    book.source_path,
                    book_id=book.id,
                    total_pages=book.total_pages,
                    page_start=window_start,
                    page_count=window_count,
                    display_title=book.title,
                    data_root=_books_root(),
                )
                book.page_image_count = manifest.page_count
                book.page_split_status = "partial" if manifest.page_count < book.total_pages else "complete"
                _persist_book(book)
                extraction_path, extracted_page_count = extract_book_text(
                    book=book,
                    page_start=window_start,
                    page_count=window_count,
                    force=force,
                    ocr_provider=book.ocr_provider,
                    data_root=_books_root(),
                    owner_id=book.owner_id,
                    progress_callback=progress_callback,
                )
                _complete_book_extraction(book, extraction_path=extraction_path, extracted_page_count=extracted_page_count, page_start=window_start)
                with _progressive_extraction_lock:
                    pending_windows = _progressive_extraction_pending_windows.get(book.id, [])
                    window = pending_windows.pop(0) if pending_windows else None
                    if window is not None:
                        _progressive_extraction_active_windows[book.id] = window
                    else:
                        _progressive_extraction_active_windows.pop(book.id, None)
                    if not pending_windows:
                        _progressive_extraction_pending_windows.pop(book.id, None)
        except Exception:
            logger.exception("Background book extraction failed for %s", book.id)
            _fail_book_extraction(book)

        finally:
            with _progressive_extraction_lock:
                _progressive_extraction_book_ids.discard(book.id)
                _progressive_extraction_active_windows.pop(book.id, None)
                _progressive_extraction_pending_windows.pop(book.id, None)

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


@app.put("/auth/account-role", response_model=AuthMeResponse)
def put_account_role(
    payload: AccountRoleUpdateRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> AuthMeResponse:
    return set_hosted_account_role(context, payload.account_role)


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
        origin.startswith(("http://localhost", "http://127.", "http://192.168."))
        for origin in configured_origins
    )
    return bool(configured_origins) and not has_insecure_origin and supabase_is_configured() and supabase_admin_is_configured()


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


@app.post("/feedback", response_model=FeedbackRecord)
def submit_feedback(
    payload: FeedbackCreateRequest,
    context: AuthenticatedUserContext | None = PUBLIC_USER_CONTEXT,
) -> FeedbackRecord:
    record = create_feedback(
        app.state.data_root,
        payload.original_text,
        payload.context,
        user_id=context.user.id if context else None,
        account_role=context.user.account_role if context else None,
    )
    record_analytics_event(
        app.state.data_root,
        event_name="feedback_submitted",
        account_id=context.user.id if context else None,
        account_role=context.user.account_role if context else None,
        feature_key="feedback",
        route=payload.context.route,
        metadata={"language_code": payload.context.language_code},
    )
    return record


@app.post("/feedback/with-screenshot", response_model=FeedbackRecord)
async def submit_feedback_with_screenshot(
    original_text: str = Form(...),
    context: str = Form(...),
    screenshot: UploadFile | None = OPTIONAL_SCREENSHOT_FILE,
    screenshots: list[UploadFile] | None = OPTIONAL_SCREENSHOTS_FILE,
    user_context: AuthenticatedUserContext | None = PUBLIC_USER_CONTEXT,
) -> FeedbackRecord:
    try:
        parsed_context = FeedbackContext.model_validate_json(context)
        FeedbackCreateRequest(original_text=original_text, context=parsed_context)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    uploaded_files = list(screenshots or [])
    if screenshot is not None:
        uploaded_files.insert(0, screenshot)
    if len(uploaded_files) > MAX_FEEDBACK_SCREENSHOTS:
        raise HTTPException(status_code=422, detail=f"A feedback report may include up to {MAX_FEEDBACK_SCREENSHOTS} screenshots.")

    screenshot_uploads: list[tuple[str, str, bytes]] = []
    total_size = 0
    for uploaded_file in uploaded_files:
        screenshot_bytes = await uploaded_file.read(MAX_FEEDBACK_SCREENSHOT_BYTES + 1)
        try:
            validate_feedback_screenshot(uploaded_file.filename or "screenshot", uploaded_file.content_type or "", screenshot_bytes)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        total_size += len(screenshot_bytes)
        if total_size > MAX_FEEDBACK_SCREENSHOTS_TOTAL_BYTES:
            raise HTTPException(status_code=422, detail="The combined screenshot size must be 15 MB or smaller.")
        screenshot_uploads.append((uploaded_file.filename or "screenshot", uploaded_file.content_type or "", screenshot_bytes))

    record = create_feedback(
        app.state.data_root,
        original_text,
        parsed_context,
        user_id=user_context.user.id if user_context else None,
        account_role=user_context.user.account_role if user_context else None,
        screenshot_uploads=screenshot_uploads,
    )
    record_analytics_event(
        app.state.data_root,
        event_name="feedback_submitted",
        account_id=user_context.user.id if user_context else None,
        account_role=user_context.user.account_role if user_context else None,
        feature_key="feedback",
        route=parsed_context.route,
        metadata={"language_code": parsed_context.language_code, "screenshot_count": len(screenshot_uploads)},
    )
    return record


@app.get("/feedback", response_model=FeedbackListResponse)
def get_feedback(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> FeedbackListResponse:
    require_permission(context, "accounts.manage")
    return FeedbackListResponse(records=list_feedback(app.state.data_root))


@app.get("/feedback/{feedback_id}/screenshots/{screenshot_index}")
def get_feedback_screenshot(
    feedback_id: str,
    screenshot_index: int,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> FileResponse:
    require_permission(context, "accounts.manage")
    try:
        _record, screenshot, screenshot_path = get_feedback_screenshot_file(app.state.data_root, feedback_id, screenshot_index)
    except (FileNotFoundError, IndexError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(screenshot_path, media_type=screenshot.content_type, filename=screenshot.filename)


@app.post("/feedback/{feedback_id}/screenshot-analysis", response_model=FeedbackRecord)
def analyze_feedback_screenshot_images(
    feedback_id: str,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> FeedbackRecord:
    require_permission(context, "accounts.manage")
    try:
        return analyze_feedback_screenshots(app.state.data_root, feedback_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/feedback/testers", response_model=TesterListResponse)
def get_feedback_testers(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> TesterListResponse:
    require_permission(context, "accounts.manage")
    return TesterListResponse(testers=list_testers(app.state.data_root))


@app.patch("/feedback/testers/{tester_id}", response_model=TesterRecord)
def change_tester_nickname(
    tester_id: str,
    payload: TesterNicknameUpdateRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> TesterRecord:
    require_permission(context, "accounts.manage")
    try:
        return update_tester_nickname(app.state.data_root, tester_id, payload.nickname)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/feedback/mine", response_model=FeedbackListResponse)
def get_my_feedback(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> FeedbackListResponse:
    return FeedbackListResponse(records=[record for record in list_feedback(app.state.data_root, limit=1000) if record.user_id == context.user.id])


@app.get("/feedback/notifications", response_model=FeedbackNotificationListResponse)
def get_feedback_notifications(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> FeedbackNotificationListResponse:
    notifications = list_user_notifications(app.state.data_root, context.user.id)
    return FeedbackNotificationListResponse(
        notifications=notifications,
        unread_count=sum(1 for notification in notifications if not notification.read),
    )


@app.post("/feedback/notifications/read")
def read_feedback_notifications(
    payload: FeedbackNotificationReadRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> dict[str, str]:
    mark_user_notifications_read(app.state.data_root, context.user.id, payload.notification_ids)
    return {"status": "read"}


@app.patch("/feedback/{feedback_id}/status", response_model=FeedbackRecord)
def change_feedback_status(
    feedback_id: str,
    payload: FeedbackStatusUpdateRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> FeedbackRecord:
    require_permission(context, "accounts.manage")
    try:
        return update_feedback_status(
            app.state.data_root,
            feedback_id,
            payload.status,
            note=payload.note,
            changed_by=context.user.id,
            implementation_build=payload.implementation_build,
            verification_instructions=payload.verification_instructions,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/feedback/{feedback_id}/verification", response_model=FeedbackRecord)
def verify_feedback_fix(
    feedback_id: str,
    payload: FeedbackTesterVerificationRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> FeedbackRecord:
    try:
        return submit_tester_verification(
            app.state.data_root,
            feedback_id,
            payload.response,
            note=payload.note,
            user_id=context.user.id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/feedback/{feedback_id}/github-issue", response_model=FeedbackRecord)
def post_feedback_github_issue(
    feedback_id: str,
    payload: FeedbackGitHubCreateRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> FeedbackRecord:
    if not has_permission(context, "accounts.manage"):
        owns_feedback = any(
            record.id == feedback_id and record.user_id == context.user.id
            for record in list_feedback(app.state.data_root, limit=1000)
        )
        if not owns_feedback:
            raise HTTPException(status_code=403, detail="Only the feedback author or an admin can send feedback to GitHub.")
    try:
        return create_github_issue(
            app.state.data_root,
            feedback_id,
            changed_by=context.user.id,
            title=payload.title,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/feedback/digest", response_model=FeedbackDigestResponse)
def post_feedback_digest(
    payload: FeedbackDigestRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> FeedbackDigestResponse:
    require_permission(context, "accounts.manage")
    try:
        result = send_feedback_digest(app.state.data_root, force=payload.force)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return FeedbackDigestResponse(
        sent=result.sent,
        record_count=result.record_count,
        generated_at=result.generated_at,
        message=result.message,
    )


@app.post("/texts/parse", response_model=PageExtractionArtifact)
def parse_text(
    payload: TextParseRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> PageExtractionArtifact:
    return parse_text_into_page_artifact(
        text=payload.text,
        language_code=payload.language_code,
        title=payload.title,
        data_root=app.state.data_root,
        owner_id=context.user.id if context else None,
    )


@app.post("/texts/import", response_model=BookRecord)
def import_text(
    payload: TextImportRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookRecord:
    try:
        record = import_text_into_book(
            text=payload.text,
            language_code=payload.language_code,
            title=payload.title,
            author=payload.author,
            data_root=_books_root(),
            owner_id=context.user.id if context else None,
        )
        record_analytics_event(
            app.state.data_root,
            event_name="book_imported",
            account_id=context.user.id if context else None,
            account_role=context.user.account_role if context else None,
            feature_key="book_import",
            route="/import",
            metadata={"language_code": payload.language_code, "source": "text"},
        )
        return record
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/wikipedia/random-import", response_model=BookRecord)
def import_random_wikipedia_article(
    payload: WikipediaRandomImportRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookRecord:
    try:
        article = fetch_random_article(payload.language_code)
        record = import_text_into_book(
            text=article.text,
            language_code=article.language_code,
            title=article.title,
            author="Wikipedia",
            data_root=_books_root(),
            owner_id=context.user.id if context else None,
        )
    except WikipediaImportError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Random Wikipedia article import failed for language %s", payload.language_code)
        raise HTTPException(status_code=502, detail="Wikipedia article could not be imported. Please try again.") from exc

    try:
        record_analytics_event(
            app.state.data_root,
            event_name="book_imported",
            account_id=context.user.id if context else None,
            account_role=context.user.account_role if context else None,
            feature_key="wikipedia_random_import",
            route="/import",
            metadata={
                "language_code": article.language_code,
                "source": "wikipedia_random",
                "title": article.title,
            },
        )
    except Exception:
        logger.exception("Could not record analytics for random Wikipedia article import")
    return record


@app.post("/articles/generate", response_model=GeneratedReaderArticleResponse)
def generate_article(
    payload: GeneratedReaderArticleRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> GeneratedReaderArticleResponse:
    try:
        response = generate_reader_article(
            app.state.data_root,
            payload,
            owner_id=context.user.id if context else None,
        )
        record_analytics_event(
            app.state.data_root,
            event_name="practice_generated",
            account_id=context.user.id if context else None,
            account_role=context.user.account_role if context else None,
            feature_key="article_generation",
            route="/library",
            metadata={"language_code": payload.language_code, "genre": payload.genre},
        )
        return response
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/books", response_model=list[BookRecord])
def list_books(
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> list[BookRecord]:
    return sorted(
        (book for book in _visible_books(context) if book.archived_at is None),
        key=lambda record: record.processed_at or record.created_at,
        reverse=True,
    )


@app.get("/books/{book_id}/generation", response_model=GeneratedReaderArticlePromptDetails)
def get_generated_article_prompt_details(
    book_id: str,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> GeneratedReaderArticlePromptDetails:
    _book_exists(book_id, context)
    record = load_generated_article_prompt_details(app.state.data_root, book_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Generated article prompt details not found for book: {book_id}")
    return record


@app.get("/books/archived", response_model=list[BookRecord])
def list_archived_books(
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> list[BookRecord]:
    return sorted(
        (book for book in _visible_books(context) if book.archived_at is not None),
        key=lambda record: record.archived_at or record.processed_at or record.created_at,
        reverse=True,
    )


@app.post("/books/import", response_model=BookRecord)
def import_book(
    payload: BookImportRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookRecord:
    try:
        source_path = _validate_import_source(
            payload.source_path,
            environment_name="TEXTPLEX_IMPORT_ROOTS",
            defaults=[get_repo_root() / "tests" / "fixtures", app.state.data_root / "uploads"],
        )
        progressive_pdf = source_path.suffix.lower() == ".pdf"
        book = import_book_from_path(
            source_path,
            language_code=payload.language_code,
            ocr_provider=payload.ocr_provider,
            title=payload.title,
            author=payload.author,
            page_start=payload.page_start,
            page_count=payload.page_count,
            initial_page_count=1 if progressive_pdf else None,
            data_root=_books_root(),
            owner_id=context.user.id if context else None,
        )
        if not progressive_pdf:
            return _extract_and_persist_book(book, page_start=payload.page_start, page_count=payload.page_count)
        extraction_path, extracted_page_count = extract_book_text(
            book=book,
            page_start=payload.page_start,
            page_count=1,
            force=True,
            ocr_provider=book.ocr_provider,
            data_root=_books_root(),
            owner_id=book.owner_id,
        )
        _complete_book_extraction(book, extraction_path=extraction_path, extracted_page_count=extracted_page_count, page_start=payload.page_start)
        _start_background_extraction(book, page_start=payload.page_start + 1, page_count=2)
        return book
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/books/upload", response_model=BookRecord)
async def upload_book(
    file: UploadFile = UPLOAD_FILE,
    language_code: str = REQUIRED_LANGUAGE_CODE,
    title: str | None = OPTIONAL_TITLE,
    author: str | None = OPTIONAL_AUTHOR,
    page_start: int = OPTIONAL_PAGE_START,
    page_count: int | None = OPTIONAL_PAGE_COUNT,
    ocr_provider: str | None = OPTIONAL_OCR_PROVIDER,
    translation_mode: TranslationMode = TRANSLATION_MODE,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookRecord:
    filename = Path(file.filename or "uploaded.txt").name
    if Path(filename).suffix.lower() not in {".pdf", ".epub", ".txt"}:
        raise HTTPException(status_code=400, detail="TextPlex import currently accepts PDF, EPUB, or TXT files only.")

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
                    raise HTTPException(status_code=413, detail="Uploaded file exceeds the configured size limit.")
                destination.write(chunk)
        progressive_pdf = Path(filename).suffix.lower() == ".pdf"
        book = import_book_from_path(
            upload_path,
            language_code=language_code,
            ocr_provider=ocr_provider,
            title=title,
            author=author,
            source_filename=filename,
            page_start=page_start,
            page_count=page_count,
            initial_page_count=1 if progressive_pdf else None,
            data_root=_books_root(),
            owner_id=context.user.id if context else None,
        )
        if progressive_pdf:
            extraction_path, extracted_page_count = extract_book_text(
                book=book,
                page_start=page_start,
                page_count=1,
                force=True,
                ocr_provider=book.ocr_provider,
                data_root=_books_root(),
                owner_id=book.owner_id,
            )
            _complete_book_extraction(book, extraction_path=extraction_path, extracted_page_count=extracted_page_count, page_start=page_start)
            _start_background_extraction(book, page_start=page_start + 1, page_count=2)
        else:
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


@app.post("/books/upload-images", response_model=BookRecord)
async def upload_image_pages(
    images: list[UploadFile] = File(...),  # noqa: B008
    language_code: str = REQUIRED_LANGUAGE_CODE,
    title: str | None = OPTIONAL_TITLE,
    author: str | None = OPTIONAL_AUTHOR,
    ocr_provider: str | None = OPTIONAL_OCR_PROVIDER,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookRecord:
    uploads_root = app.state.data_root / "uploads"
    uploads_root.mkdir(parents=True, exist_ok=True)
    upload_dir = uploads_root / uuid4().hex
    upload_dir.mkdir(parents=True, exist_ok=True)
    succeeded = False
    try:
        pdf_path = await _save_photo_import_as_pdf(images, upload_dir)
        book = import_book_from_path(
            pdf_path,
            language_code=language_code,
            source_type="page-by-page",
            ocr_provider=ocr_provider,
            title=title,
            author=author,
            source_filename="photo-import.pdf",
            data_root=_books_root(),
            owner_id=context.user.id if context else None,
        )
        _start_background_extraction(book, page_start=1, page_count=book.total_pages)
        succeeded = True
        return book
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PdfReadError as exc:
        raise HTTPException(
            status_code=400,
            detail="The uploaded page photos could not be assembled into a readable document. Please use clear JPG or PNG images.",
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        if not succeeded:
            shutil.rmtree(upload_dir, ignore_errors=True)


@app.post("/books/{book_id}/append-images", response_model=BookRecord)
async def append_image_pages(
    book_id: str,
    images: list[UploadFile] = File(...),  # noqa: B008
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookRecord:
    book = _book_exists(book_id, context)
    uploads_root = app.state.data_root / "uploads"
    uploads_root.mkdir(parents=True, exist_ok=True)
    upload_dir = uploads_root / uuid4().hex
    upload_dir.mkdir(parents=True, exist_ok=True)
    try:
        updated_book = await _append_photo_pages_to_book(book, images, upload_dir)
        set_page_by_page_completion(
            app.state.data_root,
            updated_book.id,
            finished=False,
            owner_id=context.user.id if context else None,
        )
        _start_background_extraction(
            updated_book,
            page_start=1,
            page_count=updated_book.total_pages,
            force=False,
        )
        return updated_book
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        shutil.rmtree(upload_dir, ignore_errors=True)


@app.get("/books/{book_id}", response_model=BookRecord)
def get_book(
    book_id: str,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookRecord:
    return _book_exists(book_id, context)


@app.get("/books/{book_id}/pages", response_model=BookPageManifest)
def get_book_pages(
    book_id: str,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
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
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookReaderPageResponse:
    book = _book_exists(book_id, context)

    if page_number < 1 or page_number > book.total_pages:
        raise HTTPException(status_code=404, detail=f"Page not found: {page_number}")

    pages_path = _books_root() / book_id / "pages" / "manifest.json"
    if not pages_path.exists():
        raise HTTPException(status_code=404, detail=f"Page manifest not found for book: {book_id}")

    manifest = BookPageManifest.model_validate_json(pages_path.read_text(encoding="utf-8"))
    if not any(page.page_number == page_number for page in manifest.pages):
        manifest = split_source_into_page_images(
            book.source_path,
            book_id=book.id,
            total_pages=book.total_pages,
            page_start=page_number,
            page_count=1,
            display_title=book.title,
            data_root=_books_root(),
        )
        book.page_image_count = manifest.page_count
        book.page_split_status = "partial" if manifest.page_count < book.total_pages else "complete"
        extraction_path, extracted_page_count = extract_book_text(
            book=book,
            page_start=page_number,
            page_count=1,
            force=True,
            ocr_provider=book.ocr_provider,
            data_root=_books_root(),
            owner_id=book.owner_id,
        )
        _complete_book_extraction(book, extraction_path=extraction_path, extracted_page_count=extracted_page_count, page_start=page_number)
    try:
        page = next(page for page in manifest.pages if page.page_number == page_number)
    except StopIteration as exc:
        raise HTTPException(status_code=404, detail=f"Page not found: {page_number}") from exc

    extraction = load_page_artifact(book_id=book_id, page_number=page_number, data_root=_books_root(), owner_id=book.owner_id)
    if extraction is None:
        extraction_path, extracted_page_count = extract_book_text(
            book=book,
            page_start=page_number,
            page_count=1,
            force=True,
            ocr_provider=book.ocr_provider,
            data_root=_books_root(),
            owner_id=book.owner_id,
        )
        _complete_book_extraction(book, extraction_path=extraction_path, extracted_page_count=extracted_page_count, page_start=page_number)
        extraction = load_page_artifact(book_id=book_id, page_number=page_number, data_root=_books_root(), owner_id=book.owner_id)

    previous_extraction = load_page_artifact(book_id=book_id, page_number=page_number - 1, data_root=_books_root(), owner_id=book.owner_id) if page_number > 1 else None
    if page_number > 1 and previous_extraction is None:
        _start_background_extraction(book, page_start=page_number - 1, page_count=1)
    next_extraction = load_page_artifact(book_id=book_id, page_number=page_number + 1, data_root=_books_root(), owner_id=book.owner_id) if page_number < book.total_pages else None
    if page_number < book.total_pages and next_extraction is None:
        _start_background_extraction(book, page_start=page_number + 1, page_count=1)
    image_url = f"/books/{book_id}/pages/{page_number}/image"
    return BookReaderPageResponse(
        book=book,
        page=page,
        image_url=image_url,
        extraction=extraction,
        reader_capabilities=get_reader_capabilities(book.language_code),
    )


@app.post("/books/{book_id}/pages/{page_number}/sentences/{sentence_order}/translation", response_model=SentenceTranslationResponse)
def get_book_sentence_translation(
    book_id: str,
    page_number: int,
    sentence_order: int,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> SentenceTranslationResponse:
    book = _book_exists(book_id, context)
    artifact = load_page_artifact(book_id=book_id, page_number=page_number, data_root=_books_root(), owner_id=book.owner_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail=f"Page artifact not found for page: {page_number}")

    updated_page, sentence, resolution_source = translate_page_sentence(
        artifact.page,
        sentence_order=sentence_order,
        data_root=_books_root(),
        owner_id=book.owner_id,
    )
    if sentence is None:
        raise HTTPException(status_code=404, detail=f"Sentence not found: {sentence_order}")

    if updated_page is not artifact.page:
        updated_artifact = artifact.model_copy(update={"page": updated_page})
        artifact_path = _books_root() / book.id / "extractions" / "pages" / f"page-{page_number:04d}.json"
        artifact_path.parent.mkdir(parents=True, exist_ok=True)
        artifact_path.write_text(updated_artifact.model_dump_json(indent=2), encoding="utf-8")

    return SentenceTranslationResponse(
        book_id=book_id,
        page_number=page_number,
        sentence_order=sentence_order,
        sentence_text=sentence.text,
        translation=sentence.translation,
        translation_source=sentence.translation_source,
        resolution_source=resolution_source,
        translation_alignment=sentence.translation_alignment.model_dump() if sentence.translation_alignment is not None else None,
    )


@app.post(
    "/books/{book_id}/pages/{page_number}/sentences/{sentence_order}/translation-buffer",
    response_model=SentenceTranslationPrefetchResponse,
)
def prefetch_book_sentence_translations(
    book_id: str,
    page_number: int,
    sentence_order: int,
    request: SentenceTranslationPrefetchRequest | None = None,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> SentenceTranslationPrefetchResponse:
    book = _book_exists(book_id, context)
    current_artifact = load_page_artifact(
        book_id=book_id,
        page_number=page_number,
        data_root=_books_root(),
        owner_id=book.owner_id,
    )
    if current_artifact is None:
        raise HTTPException(status_code=404, detail=f"Page artifact not found for page: {page_number}")
    if not any(sentence.order == sentence_order for sentence in current_artifact.page.sentences):
        raise HTTPException(status_code=404, detail=f"Sentence not found: {sentence_order}")

    translations = prefetch_book_sentence_translation_window(
        book=book,
        page_number=page_number,
        sentence_order=sentence_order,
        lookahead=(request.lookahead if request is not None else 3),
        data_root=_books_root(),
        owner_id=book.owner_id,
    )
    return SentenceTranslationPrefetchResponse(
        book_id=book_id,
        page_number=page_number,
        sentence_order=sentence_order,
        translations=[
            SentenceTranslationResponse(
                book_id=book_id,
                page_number=translated_page_number,
                sentence_order=sentence.order,
                sentence_text=sentence.text,
                translation=sentence.translation,
                translation_source=sentence.translation_source,
                resolution_source=resolution_source,
                translation_alignment=sentence.translation_alignment.model_dump() if sentence.translation_alignment is not None else None,
            )
            for translated_page_number, sentence, resolution_source in translations
        ],
    )


@app.get("/books/{book_id}/pages/{page_number}/image")
def get_book_page_image(
    book_id: str,
    page_number: int,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
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
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> dict[str, str]:
    _book_exists(book_id, context)

    delete_book_from_path(book_id, _books_root())
    return {"status": "deleted", "book_id": book_id}


@app.post("/books/{book_id}/archive", response_model=BookRecord)
def archive_book(
    book_id: str,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookRecord:
    book = _book_exists(book_id, context)
    book.archived_at = book.archived_at or book.processed_at or book.created_at
    book.status = "archived"
    return _persist_book(book)


@app.post("/books/{book_id}/restore", response_model=BookRecord)
def restore_book(
    book_id: str,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
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
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> dict[str, str]:
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
            owner_id=book.owner_id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    _complete_book_extraction(
        book,
        extraction_path=extraction_path,
        extracted_page_count=extracted_page_count,
        page_start=payload.page_start,
    )
    return {"status": "complete", "extraction_path": str(extraction_path)}


@app.get("/books/{book_id}/extractions", response_model=BookExtractionResult)
def get_book_extraction(
    book_id: str,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> BookExtractionResult:
    book = _book_exists(book_id, context)
    extraction_path = _books_root() / book_id / "extractions" / "book-extraction.json"
    if not extraction_path.exists():
        raise HTTPException(status_code=404, detail=f"Extraction not found for book: {book_id}")
    extraction = BookExtractionResult.model_validate_json(extraction_path.read_text(encoding="utf-8"))
    recovered = recover_book_extraction_result(extraction, data_root=_books_root(), owner_id=book.owner_id)
    if recovered is not extraction:
        extraction_path.write_text(recovered.model_dump_json(indent=2), encoding="utf-8")
        return recovered
    return extraction


@app.get("/learning/profile", response_model=LearningProfileSummary)
def get_learning_profile(
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> LearningProfileSummary:
    return get_learning_profile_summary(app.state.data_root, owner_id=context.user.id if context else None)


@app.get("/learning/programs/russian", response_model=RussianProgramResponse)
def get_russian_learning_program() -> RussianProgramResponse:
    return get_russian_program()


@app.get("/auth/me", response_model=AuthMeResponse)
def get_authenticated_user(user: AuthMeResponse = CURRENT_USER) -> AuthMeResponse:
    return user


@app.post("/learning/sessions", response_model=ReadingSessionRecord)
def open_learning_session(
    payload: ReadingSessionCreateRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> ReadingSessionRecord:
    _book_exists(payload.book_id, context)
    record = create_reading_session(app.state.data_root, payload, owner_id=context.user.id if context else None)
    record_analytics_event(
        app.state.data_root,
        event_name="reading_session_started",
        account_id=context.user.id if context else None,
        account_role=context.user.account_role if context else None,
        session_id=record.id,
        feature_key="reader",
        route="/reader",
        metadata={"book_id": payload.book_id},
    )
    return record


@app.post("/learning/books/{book_id}/completion", response_model=ProgressBookSummary)
def update_book_completion(
    book_id: str,
    payload: BookCompletionRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> ProgressBookSummary:
    _book_exists(book_id, context)
    try:
        set_page_by_page_completion(
            app.state.data_root,
            book_id,
            finished=payload.finished,
            owner_id=context.user.id if context else None,
        )
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    progress = get_progress_surface(app.state.data_root, owner_id=context.user.id if context else None)
    updated = next((book for book in progress.books if book.book_id == book_id), None)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Progress not found for book: {book_id}")
    return updated


@app.post("/learning/page-reads", response_model=PageReadRecord)
def create_page_read(
    payload: PageReadCreateRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> PageReadRecord:
    _book_exists(payload.book_id, context)
    try:
        record = record_page_read(app.state.data_root, payload, owner_id=context.user.id if context else None)
        record_analytics_event(
            app.state.data_root,
            event_name="page_read",
            account_id=context.user.id if context else None,
            account_role=context.user.account_role if context else None,
            session_id=payload.session_id,
            feature_key="reader",
            route="/reader",
            metadata={"book_id": payload.book_id, "page_number": payload.page_number},
        )
        return record
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/learning/sentence-reads", response_model=SentenceReadRecord)
def create_sentence_read(
    payload: SentenceReadCreateRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> SentenceReadRecord:
    _book_exists(payload.book_id, context)
    try:
        record = record_sentence_read(app.state.data_root, payload, owner_id=context.user.id if context else None)
        record_analytics_event(
            app.state.data_root,
            event_name="sentence_read",
            account_id=context.user.id if context else None,
            account_role=context.user.account_role if context else None,
            session_id=payload.session_id,
            feature_key="reader",
            route="/reader",
            metadata={"book_id": payload.book_id, "page_number": payload.page_number},
        )
        return record
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/learning/study-items", response_model=StudyVocabularyItemRecord)
def create_study_vocabulary_item(
    payload: StudyVocabularyItemCreateRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> StudyVocabularyItemRecord:
    _book_exists(payload.book_id, context)
    try:
        record = record_study_vocabulary_item(app.state.data_root, payload, owner_id=context.user.id if context else None)
        record_analytics_event(
            app.state.data_root,
            event_name="vocabulary_saved",
            account_id=context.user.id if context else None,
            account_role=context.user.account_role if context else None,
            feature_key="study",
            route="/study",
            metadata={"book_id": payload.book_id, "language_code": payload.language_code},
        )
        return record
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/learning/vocabulary-reviews", response_model=VocabularyAssessmentStateRecord)
def create_vocabulary_assessment_review(
    payload: VocabularyAssessmentReviewRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> VocabularyAssessmentStateRecord:
    try:
        return record_vocabulary_assessment_review(app.state.data_root, payload, owner_id=context.user.id if context else None)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/learning/word-interactions", response_model=WordInteractionRecord)
def create_word_interaction(
    payload: WordInteractionCreateRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> WordInteractionRecord:
    _book_exists(payload.book_id, context)
    try:
        return record_word_interaction(app.state.data_root, payload, owner_id=context.user.id if context else None)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/learning/sync", response_model=LearningSyncResponse)
def synchronize_learning_events(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
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
def lookup_lexicon(
    language_code: str,
    term: str,
    allow_google_fallback: bool = False,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> LexiconLookupResponse:
    response = lookup_lexicon_entry(
        data_root=app.state.data_root,
        language_code=language_code,
        term=term,
        allow_google_fallback=allow_google_fallback,
        owner_id=context.user.id if context else None,
    )
    record_analytics_event(
        app.state.data_root,
        event_name="translation_used" if allow_google_fallback else "definition_opened",
        account_id=context.user.id if context else None,
        account_role=context.user.account_role if context else None,
        feature_key="translation" if allow_google_fallback else "dictionary",
        route="/reader",
        metadata={"language_code": language_code, "google_fallback": allow_google_fallback},
    )
    return response


@app.post("/lexicon/japanese/conjugate", response_model=JapaneseConjugationResponse)
def conjugate_japanese(payload: JapaneseConjugationRequest) -> JapaneseConjugationResponse:
    try:
        return JapaneseConjugationResponse.model_validate(
            conjugate_japanese_verb(
                payload.lemma,
                reading=payload.reading,
                conjugation_class=payload.conjugation_class,
            ).model_dump()
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/lexicon/google-translate/usage", response_model=GoogleTranslateUsageSummary)
def google_translate_usage(
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> GoogleTranslateUsageSummary:
    return get_google_translate_usage_summary(app.state.data_root, owner_id=context.user.id if context else None)


@app.get("/admin/usage/google-translate", response_model=GoogleTranslateUsageSummary)
def admin_google_translate_usage(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> GoogleTranslateUsageSummary:
    require_permission(context, "usage.global.read")
    return get_google_translate_usage_summary(app.state.data_root)


@app.get("/admin/usage", response_model=AdminUsageSummary)
def admin_usage(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> AdminUsageSummary:
    require_permission(context, "usage.global.read")
    return get_admin_usage_summary(app.state.data_root)


@app.post("/analytics/events")
def create_analytics_event(
    payload: AnalyticsEventCreateRequest,
    context: AuthenticatedUserContext | None = PUBLIC_USER_CONTEXT,
) -> dict[str, str]:
    event_id = record_analytics_event(
        app.state.data_root,
        event_id=payload.event_id,
        event_name=payload.event_name,
        occurred_at=payload.occurred_at,
        account_id=context.user.id if context else None,
        account_role=context.user.account_role if context else None,
        session_id=payload.session_id,
        route=payload.route,
        feature_key=payload.feature_key,
        metadata=payload.metadata,
    )
    if event_id is None:
        raise HTTPException(status_code=503, detail="Analytics storage is unavailable.")
    return {"event_id": event_id}


@app.get("/admin/analytics/overview", response_model=AdminAnalyticsOverview)
def admin_analytics_overview(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> AdminAnalyticsOverview:
    require_permission(context, "usage.global.read")
    return get_admin_analytics_overview(app.state.data_root)


@app.get("/analysis/{book_id}", response_model=BookAnalysisSurfaceResponse)
def get_analysis_surface(
    book_id: str,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
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
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> StudySurfaceResponse:
    return get_study_surface(
        app.state.data_root,
        language_code=language_code,
        limit=limit,
        owner_id=context.user.id if context else None,
    )


@app.get("/progress", response_model=ProgressSurfaceResponse)
def progress_surface(
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> ProgressSurfaceResponse:
    return get_progress_surface(app.state.data_root, owner_id=context.user.id if context else None)


@app.get("/profile", response_model=ProfileSurfaceResponse)
def profile_surface(
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> ProfileSurfaceResponse:
    return get_profile_surface(app.state.data_root, owner_id=context.user.id if context else None)


@app.get("/profile/hosted", response_model=HostedProfileSurfaceResponse)
def hosted_profile_surface(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> HostedProfileSurfaceResponse:
    return get_hosted_profile(context)


@app.put("/profile/hosted", response_model=HostedProfileSurfaceResponse)
def put_hosted_profile(
    payload: HostedProfileUpdateRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> HostedProfileSurfaceResponse:
    return update_hosted_profile(context, payload)


@app.get("/profile/migration", response_model=ProfileMigrationResponse)
def get_profile_migration(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> ProfileMigrationResponse:
    return preview_profile_migration(app.state.data_root, context.user.id)


@app.post("/profile/migration", response_model=ProfileMigrationResponse)
def post_profile_migration(
    payload: ProfileMigrationRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> ProfileMigrationResponse:
    return apply_profile_migration(app.state.data_root, context.user.id, payload)


@app.get("/themes/catalog", response_model=ThemeCatalogResponse)
def themes_catalog(
    context: AuthenticatedUserContext | None = PUBLIC_USER_CONTEXT,
) -> ThemeCatalogResponse:
    return get_theme_catalog(context, data_root=app.state.data_root)


@app.get("/admin/themes", response_model=ThemeAdminResponse)
def admin_themes(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> ThemeAdminResponse:
    return get_admin_themes(context)


@app.post("/admin/themes", response_model=ThemeAdminRecord)
def create_admin_theme(
    payload: ThemeAdminUpsertRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> ThemeAdminRecord:
    return save_admin_theme(context, payload)


@app.put("/admin/themes/{theme_id}", response_model=ThemeAdminRecord)
def update_admin_theme(
    theme_id: str,
    payload: ThemeAdminUpsertRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> ThemeAdminRecord:
    if theme_id != payload.id:
        raise HTTPException(status_code=400, detail="The theme ID in the path must match the payload.")
    return save_admin_theme(context, payload)


@app.post("/admin/themes/ai-suggest", response_model=ThemeAiSuggestResponse)
def admin_theme_ai_suggest(
    payload: ThemeAiSuggestRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> ThemeAiSuggestResponse:
    return suggest_theme_with_ai(context, payload)


@app.post("/themes/checkout", response_model=ThemeCheckoutResponse)
def themes_checkout(
    payload: ThemeCheckoutRequest,
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
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
            raise TypeError("Webhook payload must be an object.")
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid sandbox webhook JSON.") from None
    return apply_sandbox_event(app.state.data_root, payload)


@app.get("/themes/entitlements", response_model=ThemeEntitlementResponse)
def themes_entitlements(
    context: AuthenticatedUserContext = AUTHENTICATED_USER_CONTEXT,
) -> ThemeEntitlementResponse:
    return get_entitlements(app.state.data_root, context.user.id)


@app.get("/activity", response_model=ActivitySurfaceResponse)
def activity_surface(
    limit: int = 50,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> ActivitySurfaceResponse:
    return get_activity_surface(
        app.state.data_root,
        limit=limit,
        owner_id=context.user.id if context else None,
    )


@app.get("/import", response_model=ImportSurfaceResponse)
def import_surface(
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> ImportSurfaceResponse:
    return get_import_surface(
        app.state.data_root,
        default_language=os.getenv("DEFAULT_LANGUAGE", "zh"),
        owner_id=context.user.id if context else None,
    )


@app.get("/settings", response_model=SettingsSurfaceResponse)
def get_settings_surface(
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
) -> SettingsSurfaceResponse:
    if context:
        hosted_entries = get_hosted_settings(context)
        return SettingsSurfaceResponse(entries=[SettingEntry.model_validate(entry) for entry in hosted_entries])
    return load_settings_surface(app.state.data_root, owner_id=context.user.id if context else None)


@app.put("/settings", response_model=SettingsSurfaceResponse)
def put_settings_surface(
    payload: SettingsUpdateRequest,
    context: AuthenticatedUserContext | None = OPTIONAL_USER_CONTEXT,
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
