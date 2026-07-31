from __future__ import annotations

from typing import Literal

from app.schemas.learning import LearningProfileSummary
from pydantic import BaseModel, Field


class AnalysisLexicalEntrySummary(BaseModel):
    lemma: str
    display_form: str
    frequency_in_book: int
    first_page: int | None = None
    last_page: int | None = None


class AnalysisDistributionBucket(BaseModel):
    label: str
    character_occurrences: int
    percentage: float


class AnalysisSeriesPoint(BaseModel):
    index: int
    label: str
    value: float
    page_number: int | None = None
    sentence_order: int | None = None


class AnalysisMetrics(BaseModel):
    metric_status: Literal["pending", "ready", "no_evidence", "unsupported"]
    assessment_system: str | None = None
    text_expected_level: float | None = None
    text_expected_level_label: str | None = None
    sentence_average_level: float | None = None
    page_average_level: float | None = None
    character_weighted_average_level: float | None = None
    eligible_character_count: int = 0
    known_character_count: int = 0
    unknown_character_count: int = 0
    chinese_word_occurrences: int = 0
    unknown_word_occurrences: int = 0
    partial_word_occurrences: int = 0
    sentence_count_with_level: int = 0
    page_count_with_level: int = 0
    distribution: list[AnalysisDistributionBucket] = Field(default_factory=list)
    comprehension_status: Literal["not_available"] = "not_available"
    estimated_comprehension_percent: None = None
    recommendation: str


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
    extraction_progress_percent: int = 0
    metrics: AnalysisMetrics
    sentence_hsk_series: list[AnalysisSeriesPoint] = Field(default_factory=list)
    page_hsk_series: list[AnalysisSeriesPoint] = Field(default_factory=list)
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
    next_due_at: str | None = None
    manual_override: str | None = None
    first_seen_at: str | None = None
    last_seen_at: str | None = None


class StudyVocabularyItem(BaseModel):
    language_code: str
    language_label: str
    lemma: str
    display_form: str
    source_book_id: str
    source_book_title: str | None = None
    source_page_number: int
    source_sentence_order: int
    source_token_order: int
    source_surface_form: str
    source_sentence_text: str
    pronunciation: str | None = None
    romanization: str | None = None
    definition_short: str | None = None
    proficiency_level: str | None = None
    click_count: int = 0
    first_seen_at: str | None = None
    last_seen_at: str | None = None


class StudyProgramItem(BaseModel):
    language_code: str
    language_label: str
    program_code: str
    program_label: str
    program_source_label: str
    level_code: str
    level_label: str
    lemma: str
    display_form: str
    pronunciation: str | None = None
    definition_short: str | None = None
    proficiency_level: str | None = None
    frequency_rank: int | None = None
    progress_state: Literal["new", "learning", "review", "mastered"] = "new"
    confidence_score: float | None = None
    saved_count: int = 0
    first_seen_at: str | None = None
    last_seen_at: str | None = None


class StudyProgramLevel(BaseModel):
    level_code: str
    level_label: str
    item_count: int
    introduction_note: str
    items: list[StudyProgramItem] = Field(default_factory=list)


class StudyProgramGroup(BaseModel):
    language_code: str
    language_label: str
    program_code: str
    program_label: str
    program_source_label: str
    level_count: int
    levels: list[StudyProgramLevel] = Field(default_factory=list)


class StudyVocabularyGroup(BaseModel):
    language_code: str
    language_label: str
    item_count: int
    items: list[StudyVocabularyItem] = Field(default_factory=list)


class StudySurfaceResponse(BaseModel):
    queue_size: int
    queued_items: list[StudyQueueItem] = Field(default_factory=list)
    study_programs: list[StudyProgramGroup] = Field(default_factory=list)
    study_item_count: int = 0
    study_groups: list[StudyVocabularyGroup] = Field(default_factory=list)


class ProgressBookSummary(BaseModel):
    book_id: str
    title: str
    page_reads: int
    sentence_reads: int
    active_seconds: int
    total_pages: int = 0
    furthest_page: int = 0
    resume_page: int = 0
    resume_sentence_order: int = 0
    total_sentences: int = 0
    sentences_read: int = 0
    progress_percent: int = Field(default=0, ge=0, le=100)
    progress_unit: Literal["pages", "sentences"] = "pages"
    last_read_at: str | None = None


class ProgressSurfaceResponse(BaseModel):
    profile: LearningProfileSummary
    books: list[ProgressBookSummary] = Field(default_factory=list)


class SettingEntry(BaseModel):
    key: str
    value: str


class SettingsSurfaceResponse(BaseModel):
    entries: list[SettingEntry] = Field(default_factory=list)


class ProfileSurfaceResponse(BaseModel):
    profile: LearningProfileSummary
    books: list[ProgressBookSummary] = Field(default_factory=list)
    settings: SettingsSurfaceResponse = Field(default_factory=SettingsSurfaceResponse)


class ActivityEvent(BaseModel):
    kind: Literal["page_read", "sentence_read", "definition_lookup", "study_vocabulary_item", "pronunciation_playback", "reading_session"]
    occurred_at: str
    book_id: str
    page_number: int | None = None
    sentence_order: int | None = None
    title: str | None = None
    detail: str


class ReadingHistoryPoint(BaseModel):
    day_index: int
    day: str
    pages_read: int = 0
    cumulative_pages: int = 0
    sentences_read: int = 0
    cumulative_sentences: int = 0


class ActivitySurfaceResponse(BaseModel):
    event_count: int
    events: list[ActivityEvent] = Field(default_factory=list)
    reading_history: list[ReadingHistoryPoint] = Field(default_factory=list)


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


class SettingsUpdateRequest(BaseModel):
    entries: list[SettingEntry] = Field(default_factory=list)
