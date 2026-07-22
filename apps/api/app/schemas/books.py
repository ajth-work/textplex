from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from processor.contracts import PageExtractionResult

OcrProviderMode = Literal["local", "openai"]


class BookImportRequest(BaseModel):
    source_path: str
    language_code: str = Field(min_length=2, max_length=12)
    title: str | None = None
    author: str | None = None
    page_start: int = Field(default=1, ge=1)
    page_count: int | None = Field(default=None, ge=1)
    ocr_provider: OcrProviderMode = Field(default="local")


class TextParseRequest(BaseModel):
    text: str = Field(min_length=1)
    language_code: str = Field(default="zh", min_length=2, max_length=12)
    title: str | None = None


class TextImportRequest(TextParseRequest):
    author: str | None = None


class BookExtractionRequest(BaseModel):
    page_start: int = Field(default=1, ge=1)
    page_count: int | None = Field(default=None, ge=1)
    force: bool = False
    ocr_provider: OcrProviderMode | None = Field(default=None)


class PageExtractionArtifact(BaseModel):
    source_page_sha256: str
    text_source: str = "pypdf"
    text_source_signature: str = "pypdf-text-v1"
    processor_version: str
    pipeline_version: str
    page: PageExtractionResult


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
    owner_id: str | None = None
    title: str
    author: str | None = None
    language_code: str
    ocr_provider: OcrProviderMode = "local"
    source_filename: str
    source_path: str
    source_sha256: str
    total_pages: int
    status: str
    page_split_status: str = "not_started"
    page_image_count: int = 0
    pages_path: str | None = None
    extraction_status: str = "not_started"
    extraction_total_pages: int = 0
    extraction_pages_processed: int = 0
    extraction_current_page: int | None = None
    extraction_started_at: str | None = None
    extraction_updated_at: str | None = None
    extracted_page_count: int = 0
    extraction_path: str | None = None
    archived_at: str | None = None
    created_at: str
    processed_at: str | None = None


class BookReaderPageResponse(BaseModel):
    book: BookRecord
    page: PageRecord
    image_url: str
    extraction: PageExtractionArtifact | None = None
