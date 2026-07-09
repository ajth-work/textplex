from __future__ import annotations

from pydantic import BaseModel, Field


class LexiconImportRequest(BaseModel):
    source_root: str | None = Field(default=None, min_length=1)
    language_code: str = Field(default="zh", min_length=2, max_length=12)
    replace_existing: bool = False


class LexiconEntryRecord(BaseModel):
    id: int
    language_code: str
    entry_type: str
    surface_form: str
    pinyin: str | None = None
    tone: int | None = None
    definition: str | None = None
    radical: str | None = None
    stroke_count: int | None = None
    hsk_level: str | None = None
    frequency_rank: int | None = None
    note: str | None = None
    source_name: str | None = None
    source_path: str | None = None


class LexiconLookupResponse(BaseModel):
    query: str
    language_code: str
    entries: list[LexiconEntryRecord]


class LexiconImportSummary(BaseModel):
    database_path: str
    source_root: str
    vocabulary_rows: int
    character_rows: int
    imported_rows: int
