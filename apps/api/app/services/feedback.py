from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

from app.schemas.feedback import FeedbackContext, FeedbackRecord, FeedbackTriage

logger = logging.getLogger(__name__)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_FEEDBACK_MODEL = "gpt-5.4-mini"
DEFAULT_FEEDBACK_MAX_OUTPUT_TOKENS = 768
FEEDBACK_PROMPT_VERSION = "feedback-triage-v1"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _feedback_root(data_root: Path) -> Path:
    return data_root / "feedback"


def _feedback_path(data_root: Path, feedback_id: str) -> Path:
    return _feedback_root(data_root) / f"{feedback_id}.json"


def _openai_model() -> str:
    return os.getenv("OPENAI_FEEDBACK_MODEL", DEFAULT_FEEDBACK_MODEL).strip() or DEFAULT_FEEDBACK_MODEL


def _max_output_tokens() -> int:
    raw_value = os.getenv("OPENAI_FEEDBACK_MAX_OUTPUT_TOKENS", str(DEFAULT_FEEDBACK_MAX_OUTPUT_TOKENS)).strip()
    try:
        return max(256, min(4096, int(raw_value)))
    except ValueError:
        return DEFAULT_FEEDBACK_MAX_OUTPUT_TOKENS


def _json_object_from_text(text: str) -> dict[str, object] | None:
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
        if candidate.startswith("json"):
            candidate = candidate[4:].strip()
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        payload = json.loads(candidate[start : end + 1])
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _response_text(payload: dict[str, object]) -> str:
    direct_text = payload.get("output_text")
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    chunks: list[str] = []
    for item in payload.get("output", []):
        if not isinstance(item, dict) or item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if isinstance(content, dict) and content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str):
                    chunks.append(text)
    return "".join(chunks).strip()


def _call_openai(original_text: str, context: FeedbackContext) -> FeedbackTriage:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    prompt_payload = {
        "feedback": original_text,
        "context": context.model_dump(exclude_none=True),
    }
    prompt = (
        "Classify this TextPlex tester feedback for an internal review queue. "
        "Return only valid JSON with title, summary, category, severity, affected_area, "
        "reproduction_notes, suggested_action, and tags. "
        "Do not invent facts. Keep the original feedback's meaning. "
        f"Prompt version: {FEEDBACK_PROMPT_VERSION}. "
        f"Payload: {json.dumps(prompt_payload, ensure_ascii=False, sort_keys=True)}"
    )
    request_payload = {
        "model": _openai_model(),
        "max_output_tokens": _max_output_tokens(),
        "input": [
            {
                "role": "system",
                "content": [{"type": "input_text", "text": "You triage software feedback and return only JSON."}],
            },
            {"role": "user", "content": [{"type": "input_text", "text": prompt}]},
        ],
    }
    request = Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(request_payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI feedback triage failed with HTTP {exc.code}: {detail}") from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"OpenAI feedback triage failed: {exc}") from exc

    if not isinstance(payload, dict):
        raise TypeError("OpenAI feedback triage response was not a JSON object.")
    parsed = _json_object_from_text(_response_text(payload))
    if parsed is None:
        raise RuntimeError("OpenAI feedback triage did not return a JSON object.")
    return FeedbackTriage.model_validate(parsed)


def _fallback_triage(original_text: str, context: FeedbackContext) -> FeedbackTriage:
    lowered = original_text.lower()
    category = "bug"
    if any(term in lowered for term in ("how do i", "can i", "why does")) and not any(term in lowered for term in ("broken", "error", "fails")):
        category = "question"
    elif any(term in lowered for term in ("slow", "loading", "lag", "performance")):
        category = "performance"
    elif any(term in lowered for term in ("confusing", "hard to find", "button", "layout", "design")):
        category = "ux"
    elif any(term in lowered for term in ("translation", "book", "text", "page content")):
        category = "content"

    severity = "low"
    if any(term in lowered for term in ("crash", "cannot use", "can't use", "data loss")):
        severity = "high"
    elif any(term in lowered for term in ("broken", "error", "fails", "doesn't work", "not working")):
        severity = "medium"

    area = context.route.split("/", 2)[1] or "home"
    return FeedbackTriage(
        title=f"Tester feedback on {area}",
        summary=original_text.strip()[:1000],
        category=category,  # type: ignore[arg-type]
        severity=severity,  # type: ignore[arg-type]
        affected_area=area,
        suggested_action="Review the original report with the captured route and build context.",
        tags=[area, "tester-feedback"],
    )


def create_feedback(data_root: Path, original_text: str, context: FeedbackContext, *, user_id: str | None = None) -> FeedbackRecord:
    feedback_id = uuid4().hex
    try:
        triage = _call_openai(original_text, context)
        triage_source = "openai"
    except Exception:
        logger.exception("OpenAI feedback triage failed; storing fallback classification.")
        triage = _fallback_triage(original_text, context)
        triage_source = "fallback"

    record = FeedbackRecord(
        id=feedback_id,
        submitted_at=_utc_now(),
        original_text=original_text.strip(),
        context=context,
        triage=triage,
        triage_source=triage_source,
        user_id=user_id,
    )
    path = _feedback_path(data_root, feedback_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(record.model_dump_json(indent=2), encoding="utf-8")
    return record


def list_feedback(data_root: Path, *, limit: int = 100) -> list[FeedbackRecord]:
    records: list[FeedbackRecord] = []
    for path in sorted(_feedback_root(data_root).glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)[:limit]:
        try:
            records.append(FeedbackRecord.model_validate_json(path.read_text(encoding="utf-8")))
        except (OSError, ValueError):
            logger.warning("Skipping invalid feedback record: %s", path)
    return records
