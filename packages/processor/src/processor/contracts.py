from __future__ import annotations

import hashlib
import json
import unicodedata
from typing import Literal

from pydantic import BaseModel, Field, computed_field, field_validator

CURRENT_PIPELINE_VERSION = "textplex-5"
CURRENT_TOKENIZER_VERSION = "textplex-tokenizer-1"
LEXICAL_IDENTITY_KEY_VERSION = "v1"


def _normalize_identity_text(value: str, *, casefold: bool = False) -> str:
    normalized = unicodedata.normalize("NFC", value.strip())
    return normalized.casefold() if casefold else normalized


def _normalize_optional_identity_text(value: str | None, *, casefold: bool = False) -> str | None:
    if value is None:
        return None
    normalized = _normalize_identity_text(value, casefold=casefold)
    return normalized or None


def build_lexical_identity_key(
    *,
    language_code: str,
    lemma: str,
    part_of_speech: str | None = None,
    sense_id: str | None = None,
    external_lexicon_id: str | None = None,
) -> str:
    """Build a stable key without collapsing distinct parts of speech or senses."""
    normalized_language_code = _normalize_identity_text(language_code, casefold=True).replace("_", "-")
    normalized_lemma = _normalize_identity_text(lemma, casefold=True)
    if not normalized_language_code or not normalized_lemma:
        raise ValueError("language_code and lemma are required to build a lexical identity key")
    payload = {
        "external_lexicon_id": _normalize_optional_identity_text(external_lexicon_id),
        "language_code": normalized_language_code,
        "lemma": normalized_lemma,
        "part_of_speech": _normalize_optional_identity_text(part_of_speech, casefold=True),
        "sense_id": _normalize_optional_identity_text(sense_id),
    }
    canonical_payload = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    digest = hashlib.sha256(canonical_payload.encode("utf-8")).hexdigest()
    return f"lex:{LEXICAL_IDENTITY_KEY_VERSION}:{digest}"


class LexicalIdentity(BaseModel):
    language_code: str = Field(min_length=2, max_length=35)
    lemma: str = Field(min_length=1)
    part_of_speech: str | None = None
    sense_id: str | None = None
    external_lexicon_id: str | None = None
    status: Literal["resolved", "ambiguous", "surface_fallback"] = "surface_fallback"
    provenance: str = Field(default="tokenizer_surface", min_length=1)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    tokenizer_version: str = Field(default=CURRENT_TOKENIZER_VERSION, min_length=1)

    @field_validator("language_code")
    @classmethod
    def normalize_language_code(cls, value: str) -> str:
        normalized = _normalize_identity_text(value, casefold=True).replace("_", "-")
        if not 2 <= len(normalized) <= 35:
            raise ValueError("language_code must contain between 2 and 35 non-whitespace characters")
        return normalized

    @field_validator("lemma")
    @classmethod
    def normalize_lemma(cls, value: str) -> str:
        normalized = _normalize_identity_text(value, casefold=True)
        if not normalized:
            raise ValueError("lemma must contain at least one non-whitespace character")
        return normalized

    @field_validator("part_of_speech")
    @classmethod
    def normalize_part_of_speech(cls, value: str | None) -> str | None:
        return _normalize_optional_identity_text(value, casefold=True)

    @field_validator("sense_id", "external_lexicon_id")
    @classmethod
    def normalize_optional_identifier(cls, value: str | None) -> str | None:
        return _normalize_optional_identity_text(value)

    @field_validator("provenance", "tokenizer_version")
    @classmethod
    def normalize_required_metadata(cls, value: str) -> str:
        normalized = _normalize_identity_text(value)
        if not normalized:
            raise ValueError("identity metadata must contain at least one non-whitespace character")
        return normalized

    @computed_field(return_type=str)
    @property
    def identity_key(self) -> str:
        return build_lexical_identity_key(
            language_code=self.language_code,
            lemma=self.lemma,
            part_of_speech=self.part_of_speech,
            sense_id=self.sense_id,
            external_lexicon_id=self.external_lexicon_id,
        )


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
    lexical_identity: LexicalIdentity | None = None
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
