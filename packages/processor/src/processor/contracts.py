from __future__ import annotations

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class TokenResult(BaseModel):
    order: int = Field(ge=1)
    surface_form: str
    lemma: str | None = None
    part_of_speech: str | None = None
    pronunciation: str | None = None
    romanization: str | None = None
    definition_short: str | None = None
    proficiency_system: str | None = None
    proficiency_level: str | None = None
    entity: str | None = None
    bbox: BoundingBox | None = None


class SentenceResult(BaseModel):
    order: int = Field(ge=1)
    text: str
    tokens: list[TokenResult]
    grammar_patterns: list[str] = []


class PageExtractionResult(BaseModel):
    book_id: str
    page_number: int = Field(ge=1)
    language_code: str
    raw_text: str
    clean_text: str
    sentences: list[SentenceResult]
