from __future__ import annotations

import hashlib
import re
from pathlib import Path

from .contracts import (
    BookExtractionResult,
    LexicalEntryResult,
    PageExtractionResult,
    SentenceResult,
    TokenOccurrenceResult,
    TokenResult,
)

_TOKEN_RE = re.compile(r"[\u4e00-\u9fff]|[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?")
_WHITESPACE_RE = re.compile(r"\s+")
_SENTENCE_ENDERS = set("。！？!?")


def normalize_text(raw_text: str) -> str:
    text = raw_text.replace("\u3000", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _WHITESPACE_RE.sub(" ", text)
    return text.strip()


def split_sentences(clean_text: str) -> list[str]:
    sentences: list[str] = []
    buffer: list[str] = []
    for char in clean_text:
        buffer.append(char)
        if char in _SENTENCE_ENDERS:
            sentence = "".join(buffer).strip()
            if sentence:
                sentences.append(sentence)
            buffer = []

    tail = "".join(buffer).strip()
    if tail:
        sentences.append(tail)

    return sentences if sentences else ([clean_text] if clean_text else [])


def _normalize_token_surface(surface_form: str, language_code: str) -> str:
    if language_code.lower().startswith("zh"):
        return surface_form
    return surface_form.lower()


def tokenize_sentence(sentence: str, language_code: str) -> list[TokenResult]:
    tokens: list[TokenResult] = []
    for index, match in enumerate(_TOKEN_RE.finditer(sentence), start=1):
        surface_form = match.group(0)
        tokens.append(
            TokenResult(
                order=index,
                surface_form=surface_form,
                lemma=_normalize_token_surface(surface_form, language_code),
            )
        )
    return tokens


def build_page_extraction_result(
    *,
    book_id: str,
    page_number: int,
    language_code: str,
    raw_text: str,
    source_page_sha256: str | None = None,
) -> PageExtractionResult:
    clean_text = normalize_text(raw_text)
    sentences = [
        SentenceResult(
            order=index,
            text=sentence,
            tokens=tokenize_sentence(sentence, language_code),
        )
        for index, sentence in enumerate(split_sentences(clean_text), start=1)
    ]
    token_occurrences: list[TokenOccurrenceResult] = []
    lexical_entries: dict[str, LexicalEntryResult] = {}

    for sentence in sentences:
        for token in sentence.tokens:
            normalized_form = token.lemma or _normalize_token_surface(token.surface_form, language_code)
            token_occurrences.append(
                TokenOccurrenceResult(
                    page_number=page_number,
                    sentence_order=sentence.order,
                    token_order=token.order,
                    surface_form=token.surface_form,
                    normalized_form=normalized_form,
                )
            )
            entry = lexical_entries.get(normalized_form)
            if entry is None:
                lexical_entries[normalized_form] = LexicalEntryResult(
                    lemma=normalized_form,
                    display_form=token.surface_form,
                    frequency_in_book=1,
                    first_page=page_number,
                    last_page=page_number,
                )
            else:
                entry.frequency_in_book += 1
                entry.last_page = page_number

    return PageExtractionResult(
        book_id=book_id,
        page_number=page_number,
        language_code=language_code,
        source_page_sha256=source_page_sha256,
        raw_text=raw_text,
        clean_text=clean_text,
        sentences=sentences,
        token_occurrences=token_occurrences,
        lexical_entries=list(lexical_entries.values()),
    )


def build_book_extraction_result(
    *,
    book_id: str,
    source_path: str,
    language_code: str,
    page_start: int,
    page_end: int,
    pages: list[PageExtractionResult],
) -> BookExtractionResult:
    lexical_entries: dict[str, LexicalEntryResult] = {}
    token_occurrences: list[TokenOccurrenceResult] = []

    for page in pages:
        token_occurrences.extend(page.token_occurrences)
        for entry in page.lexical_entries:
            existing = lexical_entries.get(entry.lemma)
            if existing is None:
                lexical_entries[entry.lemma] = entry.model_copy()
                continue
            existing.frequency_in_book += entry.frequency_in_book
            existing.first_page = min(existing.first_page or entry.first_page or page.page_number, entry.first_page or page.page_number)
            existing.last_page = max(existing.last_page or entry.last_page or page.page_number, entry.last_page or page.page_number)

    return BookExtractionResult(
        book_id=book_id,
        source_path=source_path,
        page_start=page_start,
        page_end=page_end,
        language_code=language_code,
        pages=pages,
        lexical_entries=sorted(lexical_entries.values(), key=lambda item: (-item.frequency_in_book, item.lemma)),
        token_occurrences=token_occurrences,
    )


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()
