from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


AnalyticsScalar = str | int | float | bool | None


class AnalyticsEventCreateRequest(BaseModel):
    event_id: str | None = Field(default=None, min_length=1, max_length=120)
    event_name: str = Field(min_length=3, max_length=80, pattern=r"^[a-z][a-z0-9_]*$")
    occurred_at: str | None = None
    session_id: str | None = Field(default=None, max_length=120)
    route: str | None = Field(default=None, max_length=512)
    feature_key: str | None = Field(default=None, max_length=120)
    metadata: dict[str, AnalyticsScalar] = Field(default_factory=dict)


class AnalyticsMetric(BaseModel):
    key: str
    label: str
    value: int
    detail: str


class AnalyticsFunnelStage(BaseModel):
    key: str
    label: str
    users: int
    rate: float | None = None
    detail: str


class AnalyticsFeatureRoleUsage(BaseModel):
    role: Literal["member", "tester", "admin"]
    event_count: int
    user_count: int


class AnalyticsFeatureUsage(BaseModel):
    feature_key: str
    event_count: int
    user_count: int
    last_seen_at: str | None = None
    role_breakdown: list[AnalyticsFeatureRoleUsage] = Field(default_factory=list)


class AnalyticsRetentionCohort(BaseModel):
    cohort_date: str
    cohort_size: int
    returned_1d: int | None = None
    returned_7d: int | None = None
    returned_30d: int | None = None
    returned_1d_rate: float | None = None
    returned_7d_rate: float | None = None
    returned_30d_rate: float | None = None


class AnalyticsWatchlistUser(BaseModel):
    pseudonym: str
    active_days: int
    event_count: int
    repeated_value: bool
    paywall_intent: bool
    last_seen_at: str


class AdminAnalyticsOverview(BaseModel):
    generated_at: str
    data_scope: Literal["local_data"] = "local_data"
    window_days: int
    event_count: int
    sample_size: int
    note: str
    metrics: list[AnalyticsMetric]
    funnel: list[AnalyticsFunnelStage]
    features: list[AnalyticsFeatureUsage]
    retention: list[AnalyticsRetentionCohort]
    watchlist: list[AnalyticsWatchlistUser]
