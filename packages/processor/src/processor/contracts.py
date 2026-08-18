from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

CURRENT_PIPELINE_VERSION = "textplex-4"


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class TokenResult(BaseModel):
    order: int = Field(ge=1)
    surface_form: str
    language_code: str | None = None
    lemma: str | None = None
    part_of_speech: str | None = None
    pronunciation: str | None = None
    romanization: str | None = None
    furigana: str | None = None
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
    translation_source: str | None = None
    translation_alignment: SentenceTranslationAlignment | None = None
    tokens: list[TokenResult]
    grammar_patterns: list[str] = Field(default_factory=list)
    ends_with_sentence_terminator: bool = False


class TranslationAlignmentToken(BaseModel):
    token_id: int = Field(ge=1)
    text: str
    token_kind: Literal["word", "punctuation", "space"] = "word"


class TranslationAlignmentSegment(BaseModel):
    source_token_ids: list[int] = Field(default_factory=list)
    target_token_ids: list[int] = Field(default_factory=list)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class SentenceTranslationAlignment(BaseModel):
    alignment_source: Literal["openai", "heuristic"] = "heuristic"
    model: str | None = None
    source_language_code: str
    target_language_code: str = "en"
    source_tokens: list[TranslationAlignmentToken] = Field(default_factory=list)
    target_tokens: list[TranslationAlignmentToken] = Field(default_factory=list)
    segments: list[TranslationAlignmentSegment] = Field(default_factory=list)


class PageExtractionResult(BaseModel):
    book_id: str
    page_number: int = Field(ge=1)
    language_code: str
    source_page_sha256: str | None = None
    processor_version: str = "0.1.0"
    pipeline_version: str = CURRENT_PIPELINE_VERSION
    raw_text: str
    clean_text: str
    page_translation: str | None = None
    page_translation_source: str | None = None
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
