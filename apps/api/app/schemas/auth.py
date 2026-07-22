from __future__ import annotations

from pydantic import BaseModel


class AuthMeResponse(BaseModel):
    id: str
    email: str | None = None
    role: str = "authenticated"
    display_name: str | None = None
