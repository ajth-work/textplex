from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

LearningTrackCode = Literal["local", "hsk", "jlpt", "topik", "trki", "cefr", "custom", "not_sure"]


class AuthMeResponse(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"
    account_role: Literal["member", "tester", "admin"] = "member"
    permissions: list[str] = Field(default_factory=list)
    display_name: str | None = None


class HostedProfileRecord(BaseModel):
    id: str
    display_name: str | None = None
    target_language: str
    target_language_other: str | None = None
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
    learning_track: LearningTrackCode | None = None
    proficiency_level: str | None = None
