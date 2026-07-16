from __future__ import annotations

from typing import Literal

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
    learning_tracks: list["LearningTrackSummary"] = Field(default_factory=list)
