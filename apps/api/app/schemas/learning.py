from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ReadingSessionCreateRequest(BaseModel):
    book_id: str = Field(min_length=1)
    started_at: str | None = None


class ReadingSessionRecord(BaseModel):
    id: str
    book_id: str
    started_at: str
    ended_at: str | None = None
    active_seconds: int = 0


class PageReadCreateRequest(BaseModel):
    session_id: str = Field(min_length=1)
    book_id: str = Field(min_length=1)
    page_number: int = Field(ge=1)
    active_seconds: int = Field(ge=0)
    completed_at: str | None = None


class PageReadRecord(BaseModel):
    id: int
    session_id: str
    book_id: str
    page_number: int
    active_seconds: int
    estimated_seconds: int
    completion_ratio: float
    counted_as_read: bool
    completed_at: str


class SentenceReadTokenInput(BaseModel):
    surface_form: str = Field(min_length=1)
    lemma: str | None = None
    token_kind: Literal["word", "character"] = "word"


class SentenceReadCreateRequest(BaseModel):
    session_id: str = Field(min_length=1)
    book_id: str = Field(min_length=1)
    page_number: int = Field(ge=1)
    sentence_order: int = Field(ge=1)
    sentence_text: str = Field(min_length=1)
    token_count: int = Field(ge=0)
    character_count: int = Field(ge=0)
    active_seconds: int = Field(ge=0)
    tokens: list[SentenceReadTokenInput] = Field(default_factory=list)
    completed_at: str | None = None


class SentenceReadRecord(BaseModel):
    id: int
    session_id: str
    book_id: str
    page_number: int
    sentence_order: int
    sentence_text: str
    token_count: int
    character_count: int
    active_seconds: int
    completed_at: str


class StudyVocabularyItemCreateRequest(BaseModel):
    book_id: str = Field(min_length=1)
    language_code: str = Field(min_length=1)
    lemma: str = Field(min_length=1)
    display_form: str = Field(min_length=1)
    page_number: int = Field(ge=1)
    sentence_order: int = Field(ge=1)
    token_order: int = Field(ge=1)
    source_surface_form: str = Field(min_length=1)
    source_sentence_text: str = Field(min_length=1)
    pronunciation: str | None = None
    romanization: str | None = None
    definition_short: str | None = None
    proficiency_level: str | None = None
    first_seen_at: str | None = None


class StudyVocabularyItemRecord(BaseModel):
    language_code: str
    lemma: str
    display_form: str
    source_book_id: str
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


VocabularyAssessmentAxisKey = Literal[
    "form_to_meaning",
    "form_to_reading",
    "meaning_to_form",
    "reading_to_form",
]

VocabularyAssessmentResult = Literal["correct", "incorrect"]


class VocabularyAssessmentReviewRequest(BaseModel):
    language_code: str = Field(min_length=1)
    lemma: str = Field(min_length=1)
    axis_key: VocabularyAssessmentAxisKey
    result: VocabularyAssessmentResult
    occurred_at: str | None = None


class VocabularyAssessmentAxisRecord(BaseModel):
    language_code: str
    lemma: str
    axis_key: VocabularyAssessmentAxisKey
    prompt_type: str
    response_type: str
    stage: int
    due_at: str | None = None
    last_seen_at: str | None = None
    last_result: VocabularyAssessmentResult | None = None
    pass_count: int = 0
    fail_count: int = 0


class VocabularyAssessmentStateRecord(BaseModel):
    language_code: str
    lemma: str
    mastery_level: str
    mastery_score: float
    srs_stage: int
    next_due_at: str | None = None
    stage_zero_complete: bool = False
    axes: list[VocabularyAssessmentAxisRecord] = Field(default_factory=list)


class LearningSyncResponse(BaseModel):
    status: Literal["synced", "pending"]
    uploaded_event_count: int = Field(ge=0)
    hydrated_event_count: int = Field(ge=0)
    remote_event_count: int = Field(ge=0)
    pending_event_count: int = Field(ge=0)
    last_synced_at: str | None = None
    retry_after_seconds: int = Field(default=0, ge=0)
    conflict_count: int = Field(default=0, ge=0)
    last_error: str | None = None


class WordInteractionCreateRequest(BaseModel):
    book_id: str = Field(min_length=1)
    language_code: str = Field(min_length=1)
    target_text: str = Field(min_length=1)
    page_number: int = Field(ge=1)
    interaction_type: Literal["definition_lookup", "study_saved", "pronunciation_playback"]
    occurred_at: str | None = None


class WordInteractionRecord(BaseModel):
    id: int
    book_id: str
    page_number: int
    language_code: str
    target_text: str
    interaction_type: Literal["definition_lookup", "study_saved", "pronunciation_playback"]
    occurred_at: str


class LearningEventPayload(BaseModel):
    event_id: str = Field(min_length=1)
    idempotency_key: str = Field(min_length=1)
    event_type: Literal["reading_session", "page_read", "sentence_read", "study_vocabulary_item", "word_interaction"]
    book_id: str = Field(min_length=1)
    occurred_at: str
    payload: dict[str, Any] = Field(default_factory=dict)


class LearningTrackJourneyStep(BaseModel):
    label: str
    detail: str
    progress: float = Field(ge=0.0, le=100.0)
    status: Literal["complete", "current", "next"]


class LearningTrackSummary(BaseModel):
    code: str
    label: str
    language_code: str
    level: str
    subtitle: str
    note: str
    progress: float = Field(ge=0.0, le=100.0)
    books: int
    page_reads: int
    sentence_reads: int
    word_exposures: int
    character_exposures: int
    unique_words_seen: int
    unique_characters_seen: int
    average_seconds_per_sentence: float | None = None
    average_seconds_per_word: float | None = None
    average_seconds_per_character: float | None = None
    next_step: str
    journey: list[LearningTrackJourneyStep] = Field(default_factory=list)


class LearningProfileSummary(BaseModel):
    database_path: str
    reading_sessions: int
    page_reads: int
    sentence_reads: int
    token_exposures: int
    word_exposures: int
    character_exposures: int
    active_books: int
    unique_words_seen: int
    unique_characters_seen: int
    vocabulary_progress_rows: int
    today_sentence_reads: int
    today_token_exposures: int
    average_seconds_per_sentence: float | None = None
    average_seconds_per_word: float | None = None
    average_seconds_per_character: float | None = None
    selected_track_code: str = "local"
    learning_tracks: list[LearningTrackSummary] = Field(default_factory=list)
