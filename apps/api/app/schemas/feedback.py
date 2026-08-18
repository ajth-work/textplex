from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

FeedbackStatus = Literal["needs_review", "in_progress", "ready_for_testing", "completed", "acknowledged", "dismissed"]
FeedbackEventType = Literal["status_changed", "github_linked", "tester_response"]
FeedbackTesterResponse = Literal["verified", "still_unresolved", "partially_improved"]
AutomatedFeedbackCheck = Literal["tester_role_verification"]
FeedbackReason = Literal[
    "missing_pronunciation",
    "incorrect_pronunciation",
    "incorrect_meaning",
    "incorrect_segmentation",
]


class FeedbackContext(BaseModel):
    route: str = Field(default="/", min_length=1, max_length=512)
    page_title: str | None = Field(default=None, max_length=240)
    language_code: str | None = Field(default=None, max_length=24)
    book_id: str | None = Field(default=None, max_length=128)
    book_title: str | None = Field(default=None, max_length=240)
    page_number: int | None = Field(default=None, ge=1, le=100000)
    sentence_order: int | None = Field(default=None, ge=1, le=100000)
    app_version: str = Field(default="unknown", min_length=1, max_length=64)
    viewport_width: int | None = Field(default=None, ge=1, le=10000)
    viewport_height: int | None = Field(default=None, ge=1, le=10000)
    user_agent: str | None = Field(default=None, max_length=1000)
    feedback_target: Literal["sentence", "word"] | None = None
    feedback_target_text: str | None = Field(default=None, max_length=5000)
    feedback_target_order: int | None = Field(default=None, ge=1, le=100000)
    feedback_reason: FeedbackReason | None = None
    automated_check: AutomatedFeedbackCheck | None = None


class FeedbackScreenshot(BaseModel):
    filename: str = Field(min_length=1, max_length=160)
    content_type: Literal["image/png", "image/jpeg", "image/webp", "image/gif"]
    size_bytes: int = Field(ge=1, le=5_242_880)


class FeedbackScreenshotAnalysis(BaseModel):
    analyzed_at: str
    model: str
    summary: str = Field(min_length=1, max_length=2000)
    observations: list[str] = Field(default_factory=list, max_length=12)
    visible_text: list[str] = Field(default_factory=list, max_length=12)
    suggested_action: str | None = Field(default=None, max_length=1200)


class FeedbackCreateRequest(BaseModel):
    original_text: str = Field(min_length=3, max_length=5000)
    context: FeedbackContext


class FeedbackStatusChange(BaseModel):
    status: FeedbackStatus
    changed_at: str
    changed_by: str | None = None
    note: str | None = Field(default=None, max_length=1200)
    event_type: FeedbackEventType = "status_changed"
    github_issue_url: str | None = Field(default=None, max_length=500)


class FeedbackVerification(BaseModel):
    implementation_build: str = Field(min_length=1, max_length=64)
    instructions: str = Field(min_length=1, max_length=1200)
    requested_at: str
    requested_by: str | None = None
    response: FeedbackTesterResponse | None = None
    response_note: str | None = Field(default=None, max_length=1200)
    responded_at: str | None = None
    responded_by: str | None = None


class FeedbackStatusUpdateRequest(BaseModel):
    status: FeedbackStatus
    note: str | None = Field(default=None, max_length=1200)
    implementation_build: str | None = Field(default=None, max_length=64)
    verification_instructions: str | None = Field(default=None, max_length=1200)

    @model_validator(mode="after")
    def require_resolution_note(self) -> FeedbackStatusUpdateRequest:
        if self.status in {"completed", "acknowledged", "dismissed"} and not (self.note or "").strip():
            raise ValueError("A resolution note is required for this feedback status.")
        if self.status == "ready_for_testing":
            if not (self.implementation_build or "").strip():
                raise ValueError("An implementation build is required before requesting tester review.")
            if not (self.verification_instructions or "").strip():
                raise ValueError("Verification instructions are required before requesting tester review.")
        return self


class FeedbackTesterVerificationRequest(BaseModel):
    response: FeedbackTesterResponse
    note: str | None = Field(default=None, max_length=1200)


class FeedbackPlan(BaseModel):
    problem_statement: str = ""
    expected_behavior: str = ""
    actual_behavior: str = ""
    reproduction_steps: list[str] = Field(default_factory=list, max_length=12)
    implementation_tasks: list[str] = Field(default_factory=list, max_length=12)
    acceptance_criteria: list[str] = Field(default_factory=list, max_length=12)
    suggested_tests: list[str] = Field(default_factory=list, max_length=12)
    risks: list[str] = Field(default_factory=list, max_length=8)
    priority: Literal["low", "medium", "high", "urgent"] = "low"
    estimated_effort: Literal["small", "medium", "large", "unknown"] = "unknown"


class FeedbackGitHubLink(BaseModel):
    repository: str
    issue_number: int
    issue_url: str
    issue_state: Literal["open", "closed"] = "open"
    project_item_id: str | None = None
    project_url: str | None = None
    linked_at: str
    last_synced_at: str | None = None


class FeedbackNotification(BaseModel):
    id: str
    feedback_id: str
    title: str
    status: FeedbackStatus
    event_type: FeedbackEventType
    message: str
    created_at: str
    route: str
    github_issue_url: str | None = None
    verification_build: str | None = None
    verification_instructions: str | None = None
    read: bool = False


class FeedbackNotificationListResponse(BaseModel):
    notifications: list[FeedbackNotification] = Field(default_factory=list)
    unread_count: int = 0


class FeedbackNotificationReadRequest(BaseModel):
    notification_ids: list[str] = Field(default_factory=list, max_length=100)


class FeedbackGitHubCreateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)


class FeedbackDigestRequest(BaseModel):
    force: bool = False


class FeedbackDigestResponse(BaseModel):
    sent: bool
    record_count: int = Field(default=0, ge=0)
    generated_at: str
    message: str


class FeedbackTriage(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=1000)
    category: Literal["bug", "content", "ux", "usability", "performance", "question", "other"] = "other"
    severity: Literal["low", "medium", "high", "critical"] = "low"
    affected_area: str = Field(default="unknown", min_length=1, max_length=120)
    reproduction_notes: str | None = Field(default=None, max_length=1200)
    suggested_action: str | None = Field(default=None, max_length=1200)
    tags: list[str] = Field(default_factory=list, max_length=12)
    plan: FeedbackPlan = Field(default_factory=FeedbackPlan)


class FeedbackRecord(BaseModel):
    id: str
    submitted_at: str
    original_text: str
    context: FeedbackContext
    triage: FeedbackTriage
    triage_source: Literal["openai", "fallback"]
    status: FeedbackStatus = "needs_review"
    status_history: list[FeedbackStatusChange] = Field(default_factory=list)
    resolution_note: str | None = Field(default=None, max_length=1200)
    verification: FeedbackVerification | None = None
    github: FeedbackGitHubLink | None = None
    user_id: str | None = None
    account_role: Literal["member", "tester", "admin"] | None = None
    screenshots: list[FeedbackScreenshot] = Field(default_factory=list, max_length=3)
    screenshot: FeedbackScreenshot | None = None
    screenshot_analysis: FeedbackScreenshotAnalysis | None = None


class FeedbackListResponse(BaseModel):
    records: list[FeedbackRecord] = Field(default_factory=list)


class TesterRecord(BaseModel):
    tester_id: str
    nickname: str | None = Field(default=None, max_length=80)
    feedback_count: int = Field(default=0, ge=0)
    last_seen_at: str | None = None


class TesterListResponse(BaseModel):
    testers: list[TesterRecord] = Field(default_factory=list)


class TesterNicknameUpdateRequest(BaseModel):
    nickname: str | None = Field(default=None, max_length=80)
