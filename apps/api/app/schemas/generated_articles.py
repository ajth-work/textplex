from __future__ import annotations

from typing import Literal

from app.schemas.books import BookRecord
from pydantic import BaseModel, Field


class GeneratedArticleTerm(BaseModel):
    term: str = Field(min_length=1)
    pronunciation: str | None = None
    definition_short: str | None = None
    frequency_rank: int | None = None
    confidence_score: float | None = None
    mastery_level: str | None = None


class GeneratedReaderArticleRequest(BaseModel):
    language_code: str = Field(min_length=1, max_length=12)
    topic: str | None = None
    genre: str = Field(default="everyday", min_length=1, max_length=64)
    tone: str = Field(default="explanatory", min_length=1, max_length=64)
    style: str = Field(default="explanatory", min_length=1, max_length=64)
    curriculum_mode: Literal["auto", "study_program", "exam"] = "auto"
    curriculum_level: str | None = Field(default=None, max_length=48)
    sentence_count: int = Field(default=30, ge=5, le=80)
    known_lemma_limit: int = Field(default=12, ge=0, le=50)
    recent_lemma_limit: int = Field(default=10, ge=0, le=50)
    upcoming_lemma_limit: int = Field(default=12, ge=0, le=50)
    max_new_lemmas: int = Field(default=8, ge=0, le=30)


class GeneratedReaderArticleResponse(BaseModel):
    book: BookRecord
    title: str
    language_code: str
    topic: str
    sentence_count: int
    article_text: str
    known_terms: list[GeneratedArticleTerm] = Field(default_factory=list)
    recent_terms: list[GeneratedArticleTerm] = Field(default_factory=list)
    upcoming_terms: list[GeneratedArticleTerm] = Field(default_factory=list)
    unknown_lemma_count: int = 0
    generation_source: Literal["openai", "template"] = "template"


class GeneratedReaderArticlePromptDetails(BaseModel):
    book_id: str
    title: str
    language_code: str
    language_label: str
    topic: str
    genre: str
    tone: str
    curriculum_mode: Literal["auto", "study_program", "exam"]
    curriculum_level: str | None = None
    curriculum_label: str | None = None
    requested_sentence_count: int = Field(default=30, ge=5, le=80)
    actual_sentence_count: int = Field(default=30, ge=1, le=80)
    prompt_version: str
    model: str
    generation_source: Literal["openai", "template"] = "template"
    max_new_lemmas: int = Field(default=8, ge=0, le=30)
    known_lemma_limit: int = Field(default=12, ge=0, le=50)
    recent_lemma_limit: int = Field(default=10, ge=0, le=50)
    upcoming_lemma_limit: int = Field(default=12, ge=0, le=50)
    unknown_lemma_count: int = 0
    generated_at: str
    prompt_text: str
    known_terms: list[GeneratedArticleTerm] = Field(default_factory=list)
    recent_terms: list[GeneratedArticleTerm] = Field(default_factory=list)
    upcoming_terms: list[GeneratedArticleTerm] = Field(default_factory=list)
