from __future__ import annotations

from pydantic import BaseModel


class AuthMeResponse(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"
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
