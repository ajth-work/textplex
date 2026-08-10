import json
from typing import Self

from app.schemas.feedback import FeedbackContext, FeedbackRecord
from app.services.feedback import _call_openai, _github_feedback_labels


class FakeOpenAIResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload

    def __enter__(self) -> Self:
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


def test_openai_usability_category_is_accepted_and_keeps_ux_label(monkeypatch) -> None:
    triage_payload = {
        "title": "Reader control is hard to find",
        "summary": "The reader control placement is confusing.",
        "category": "usability",
        "severity": "medium",
        "affected_area": "reader",
        "plan": {},
    }
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        "app.services.feedback.urlopen",
        lambda request, timeout: FakeOpenAIResponse({"output_text": json.dumps(triage_payload)}),
    )

    triage = _call_openai("The reader control is hard to find.", FeedbackContext(route="/reader"))
    record = FeedbackRecord(
        id="feedback-1",
        submitted_at="2026-08-09T00:00:00+00:00",
        original_text="The reader control is hard to find.",
        context=FeedbackContext(route="/reader"),
        triage=triage,
        triage_source="openai",
    )

    assert triage.category == "usability"
    assert "feedback:ux" in _github_feedback_labels(record)
