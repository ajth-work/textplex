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


class TokenOccurrenceResult(BaseModel):
    page_number: int = Field(ge=1)
    sentence_order: int = Field(ge=1)
    token_order: int = Field(ge=1)
    surface_form: str
    normalized_form: str


class LexicalEntryResult(BaseModel):
    lemma: str
    display_form: str
    frequency_in_book: int = 0
    first_page: int | None = None
    last_page: int | None = None


class SentenceResult(BaseModel):
    order: int = Field(ge=1)
    text: str
    translation: str | None = None
    tokens: list[TokenResult]
    grammar_patterns: list[str] = Field(default_factory=list)
    ends_with_sentence_terminator: bool = False


class PageExtractionResult(BaseModel):
    book_id: str
    page_number: int = Field(ge=1)
    language_code: str
    source_page_sha256: str | None = None
    processor_version: str = "0.1.0"
    pipeline_version: str = "textplex-1"
    raw_text: str
    clean_text: str
    page_translation: str | None = None
    sentences: list[SentenceResult]
    page_ends_with_sentence_terminator: bool = False
    token_occurrences: list[TokenOccurrenceResult] = Field(default_factory=list)
    lexical_entries: list[LexicalEntryResult] = Field(default_factory=list)


class BookExtractionResult(BaseModel):
    book_id: str
    source_path: str
    page_start: int = Field(ge=1)
    page_end: int = Field(ge=1)
    language_code: str
    pages: list[PageExtractionResult]
    lexical_entries: list[LexicalEntryResult] = Field(default_factory=list)
    token_occurrences: list[TokenOccurrenceResult] = Field(default_factory=list)
