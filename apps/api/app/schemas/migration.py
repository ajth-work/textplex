from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ProfileMigrationRequest(BaseModel):
    conflict_policy: Literal["merge_non_destructive"] = "merge_non_destructive"


class ProfileMigrationResponse(BaseModel):
    status: Literal["ready", "empty", "already_migrated", "completed"]
    conflict_policy: Literal["merge_non_destructive"]
    source_fingerprint: str
    source_counts: dict[str, int] = Field(default_factory=dict)
    target_counts: dict[str, int] = Field(default_factory=dict)
    imported_rows: dict[str, int] = Field(default_factory=dict)
    message: str
