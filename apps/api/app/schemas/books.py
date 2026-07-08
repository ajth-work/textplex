from __future__ import annotations

from pydantic import BaseModel, Field


class BookImportRequest(BaseModel):
    source_path: str
    language_code: str = Field(min_length=2, max_length=12)
    title: str | None = None
    author: str | None = None


class BookRecord(BaseModel):
    id: str
    title: str
    author: str | None = None
    language_code: str
    source_filename: str
    source_path: str
    source_sha256: str
    total_pages: int
    status: str
    created_at: str
    processed_at: str | None = None
