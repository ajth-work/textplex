from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ThemeCatalogItem(BaseModel):
    id: str
    title: str
    description: str
    price_cents: int = Field(ge=0)
    is_free: bool
    is_owned: bool
    preview_available: bool = True


class ThemeBundleCatalogItem(BaseModel):
    id: str
    title: str
    description: str
    theme_ids: list[str] = Field(default_factory=list)
    price_cents: int = Field(ge=0)
    is_owned: bool


class ThemeCatalogResponse(BaseModel):
    mode: Literal["local", "hosted"]
    themes: list[ThemeCatalogItem] = Field(default_factory=list)
    bundles: list[ThemeBundleCatalogItem] = Field(default_factory=list)
