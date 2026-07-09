from __future__ import annotations

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


class LearningProfileSummary(BaseModel):
    database_path: str
    reading_sessions: int
    page_reads: int
    active_books: int
    vocabulary_progress_rows: int
