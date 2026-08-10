from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from app.schemas.google_translate import GoogleTranslateUsageSummary


class AdminUsageActivityPoint(BaseModel):
    date: str
    active_profiles: int
    sessions: int
    page_reads: int
    sentence_reads: int


class AdminUsageSummary(BaseModel):
    generated_at: str
    data_scope: Literal["local_data"] = "local_data"
    profile_count: int
    active_profiles_7d: int
    active_profiles_30d: int
    book_count: int
    processed_book_count: int
    reading_sessions: int
    page_reads: int
    sentence_reads: int
    active_seconds: int
    unique_words_exposed: int
    feedback_count: int
    open_feedback_count: int
    google_translate: GoogleTranslateUsageSummary
    activity: list[AdminUsageActivityPoint]
