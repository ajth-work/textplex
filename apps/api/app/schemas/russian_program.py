from __future__ import annotations

from pydantic import BaseModel, Field


class RussianProgramItem(BaseModel):
    lemma: str
    surface_form: str
    transliteration: str | None = None
    definition: str | None = None
    frequency_rank: int | None = None
    source_name: str | None = None
    source_path: str | None = None
    source_note: str | None = None


class RussianProgramLevel(BaseModel):
    level: int = Field(ge=1)
    title: str
    focus: str
    selection_rule: str
    is_active: bool = False
    item_count: int = 0
    items: list[RussianProgramItem] = Field(default_factory=list)


class RussianProgramResponse(BaseModel):
    title: str
    track_code: str
    track_label: str
    source_pack: str
    selection_rule: str
    levels: list[RussianProgramLevel] = Field(default_factory=list)
