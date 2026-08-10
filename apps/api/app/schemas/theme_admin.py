from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


ThemeColorScheme = Literal["light", "dark"]


class ThemeAdminRecord(BaseModel):
    id: str
    title: str
    description: str
    price_cents: int = Field(ge=0)
    is_free: bool
    preview_available: bool = True
    sort_order: int
    color_scheme: ThemeColorScheme | None = None
    tokens: dict[str, str] = Field(default_factory=dict)
    pattern_image: str | None = None
    bundle_ids: list[str] = Field(default_factory=list)


class ThemeAdminResponse(BaseModel):
    themes: list[ThemeAdminRecord] = Field(default_factory=list)


class ThemeAdminUpsertRequest(BaseModel):
    id: str = Field(min_length=2, max_length=80)
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=500)
    price_cents: int = Field(ge=0, le=1000000)
    is_free: bool
    preview_available: bool = True
    sort_order: int = Field(ge=0, le=100000)
    color_scheme: ThemeColorScheme
    tokens: dict[str, str] = Field(min_length=1, max_length=80)
    pattern_image: str | None = Field(default=None, max_length=500)

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned or any(character not in "abcdefghijklmnopqrstuvwxyz0123456789-_" for character in cleaned):
            raise ValueError("Theme IDs may contain lowercase letters, numbers, hyphens, and underscores only.")
        return cleaned

    @field_validator("title", "description")
    @classmethod
    def validate_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Theme text cannot be empty.")
        return cleaned

    @field_validator("tokens")
    @classmethod
    def validate_tokens(cls, value: dict[str, str]) -> dict[str, str]:
        cleaned: dict[str, str] = {}
        for key, token in value.items():
            normalized_key = key.strip()
            normalized_token = token.strip()
            if not normalized_key or not normalized_token:
                continue
            if len(normalized_key) > 80 or len(normalized_token) > 2000:
                raise ValueError("Theme token names or values are too long.")
            cleaned[normalized_key] = normalized_token
        if not cleaned:
            raise ValueError("At least one visual token is required.")
        return cleaned


class ThemeAiSuggestRequest(BaseModel):
    prompt: str = Field(min_length=8, max_length=3000)
    image_data_url: str | None = None
    current_theme: ThemeAdminUpsertRequest | None = None

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Describe the theme you want to create.")
        return cleaned

    @field_validator("image_data_url")
    @classmethod
    def validate_image(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if len(value) > 8_000_000:
            raise ValueError("Reference images must be 6 MB or smaller.")
        if not value.startswith(("data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,")):
            raise ValueError("Reference images must be PNG, JPEG, or WebP data URLs.")
        return value


class ThemeAiSuggestResponse(BaseModel):
    title: str
    description: str
    color_scheme: ThemeColorScheme
    tokens: dict[str, str]
    design_notes: str
