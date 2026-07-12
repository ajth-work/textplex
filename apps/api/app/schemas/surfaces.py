from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.learning import LearningProfileSummary


class AnalysisLexicalEntrySummary(BaseModel):
    lemma: str
    display_form: str
    frequency_in_book: int
    first_page: int | None = None
    last_page: int | None = None


class BookAnalysisSurfaceResponse(BaseModel):
    book_id: str
    title: str
    author: str | None = None
    language_code: str
    total_pages: int
    extracted_page_count: int
    sentence_count: int
    lexical_entry_count: int
    token_occurrence_count: int
    has_extraction: bool
    top_lexical_entries: list[AnalysisLexicalEntrySummary] = Field(default_factory=list)


class SearchResult(BaseModel):
    kind: Literal["book", "sentence", "lexical_entry"]
    book_id: str | None = None
    book_title: str | None = None
    page_number: int | None = None
    sentence_order: int | None = None
    lemma: str | None = None
    surface_form: str | None = None
    snippet: str
    score: int


class SearchSurfaceResponse(BaseModel):
    query: str
    result_count: int
    results: list[SearchResult] = Field(default_factory=list)


class StudyQueueItem(BaseModel):
    language_code: str
    lemma: str
    raw_exposures: int
    weighted_exposure: float
    unique_pages: int
    unique_books: int
    help_requests: int
    state: str
    confidence_score: float
    manual_override: str | None = None
    first_seen_at: str | None = None
    last_seen_at: str | None = None


class StudySurfaceResponse(BaseModel):
    queue_size: int
    queued_items: list[StudyQueueItem] = Field(default_factory=list)


class ProgressBookSummary(BaseModel):
    book_id: str
    title: str
    page_reads: int
    sentence_reads: int
    active_seconds: int


class ProgressSurfaceResponse(BaseModel):
    profile: LearningProfileSummary
    books: list[ProgressBookSummary] = Field(default_factory=list)


class ActivityEvent(BaseModel):
    kind: Literal["page_read", "sentence_read", "definition_lookup", "reading_session"]
    occurred_at: str
    book_id: str
    page_number: int | None = None
    sentence_order: int | None = None
    title: str | None = None
    detail: str


class ActivitySurfaceResponse(BaseModel):
    event_count: int
    events: list[ActivityEvent] = Field(default_factory=list)


class ImportRecentBook(BaseModel):
    book_id: str
    title: str
    status: str
    language_code: str
    created_at: str
    processed_at: str | None = None


class ImportSurfaceResponse(BaseModel):
    default_language: str
    supported_inputs: list[str] = Field(default_factory=list)
    can_upload_pdf: bool = True
    can_paste_text: bool = True
    recent_books: list[ImportRecentBook] = Field(default_factory=list)


class SettingEntry(BaseModel):
    key: str
    value: str


class SettingsSurfaceResponse(BaseModel):
    entries: list[SettingEntry] = Field(default_factory=list)


class SettingsUpdateRequest(BaseModel):
    entries: list[SettingEntry] = Field(default_factory=list)
