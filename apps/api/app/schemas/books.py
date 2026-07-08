from __future__ import annotations

from pydantic import BaseModel, Field


class BookImportRequest(BaseModel):
    source_path: str
    language_code: str = Field(min_length=2, max_length=12)
    title: str | None = None
    author: str | None = None


class PageRecord(BaseModel):
    page_number: int = Field(ge=1)
    image_filename: str
    image_path: str
    status: str
    created_at: str


class BookPageManifest(BaseModel):
    book_id: str
    source_path: str
    total_pages: int
    page_count: int
    pages: list[PageRecord]


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
    page_split_status: str = "not_started"
    page_image_count: int = 0
    pages_path: str | None = None
    created_at: str
    processed_at: str | None = None
