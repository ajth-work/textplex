from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class GoogleTranslateUsageSummary(BaseModel):
    scope: Literal["account", "service"]
    month_key: str
    request_count: int
    character_count: int
    free_tier_limit: int
    free_remaining_characters: int
    billable_characters: int
    billing_rate_per_million_usd: float
    estimated_cost_usd: float
    updated_at: str | None = None
