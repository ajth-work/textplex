from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FeedbackContext(BaseModel):
    route: str = Field(default="/", min_length=1, max_length=512)
    page_title: str | None = Field(default=None, max_length=240)
    language_code: str | None = Field(default=None, max_length=24)
    book_id: str | None = Field(default=None, max_length=128)
    book_title: str | None = Field(default=None, max_length=240)
    page_number: int | None = Field(default=None, ge=1, le=100000)
    sentence_order: int | None = Field(default=None, ge=1, le=100000)
    app_version: str = Field(default="unknown", min_length=1, max_length=64)
    viewport_width: int | None = Field(default=None, ge=1, le=10000)
    viewport_height: int | None = Field(default=None, ge=1, le=10000)
    user_agent: str | None = Field(default=None, max_length=1000)


class FeedbackCreateRequest(BaseModel):
    original_text: str = Field(min_length=3, max_length=5000)
    context: FeedbackContext


class FeedbackTriage(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=1000)
    category: Literal["bug", "content", "ux", "performance", "question", "other"] = "other"
    severity: Literal["low", "medium", "high", "critical"] = "low"
    affected_area: str = Field(default="unknown", min_length=1, max_length=120)
    reproduction_notes: str | None = Field(default=None, max_length=1200)
    suggested_action: str | None = Field(default=None, max_length=1200)
    tags: list[str] = Field(default_factory=list, max_length=12)


class FeedbackRecord(BaseModel):
    id: str
    submitted_at: str
    original_text: str
    context: FeedbackContext
    triage: FeedbackTriage
    triage_source: Literal["openai", "fallback"]
    status: Literal["needs_review", "accepted", "dismissed"] = "needs_review"
    user_id: str | None = None


class FeedbackListResponse(BaseModel):
    records: list[FeedbackRecord] = Field(default_factory=list)
