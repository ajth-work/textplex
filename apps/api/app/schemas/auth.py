from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AuthMeResponse(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"
    account_role: Literal["member", "qa", "admin"] = "member"
    permissions: list[str] = Field(default_factory=list)
    display_name: str | None = None


class HostedProfileRecord(BaseModel):
    id: str
    display_name: str | None = None
    target_language: str
    learning_track: str
    proficiency_level: str | None = None
    created_at: str
    updated_at: str


class HostedSettingEntry(BaseModel):
    key: str
    value: str
    updated_at: str


class HostedProfileSurfaceResponse(BaseModel):
    user: AuthMeResponse
    profile: HostedProfileRecord
    settings: list[HostedSettingEntry]


class HostedProfileUpdateRequest(BaseModel):
    display_name: str | None = None
    target_language: str | None = None
    learning_track: str | None = None
    proficiency_level: str | None = None
