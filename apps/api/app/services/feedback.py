from __future__ import annotations

import base64
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from uuid import uuid4

from app.schemas.feedback import (
    FeedbackContext,
    FeedbackGitHubLink,
    FeedbackNotification,
    FeedbackPlan,
    FeedbackRecord,
    FeedbackScreenshot,
    FeedbackScreenshotAnalysis,
    FeedbackStatus,
    FeedbackStatusChange,
    FeedbackTesterResponse,
    FeedbackTriage,
    FeedbackVerification,
    TesterRecord,
)

logger = logging.getLogger(__name__)

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_FEEDBACK_MODEL = "gpt-5.4-mini"
DEFAULT_FEEDBACK_MAX_OUTPUT_TOKENS = 768
FEEDBACK_PROMPT_VERSION = "feedback-triage-v2"
GITHUB_API_URL = "https://api.github.com"
GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
MAX_FEEDBACK_SCREENSHOT_BYTES = 5_242_880
MAX_FEEDBACK_SCREENSHOTS = 3
MAX_FEEDBACK_SCREENSHOTS_TOTAL_BYTES = 15_728_640
FEEDBACK_SCREENSHOT_TYPES = {
    "image/png": (".png", (b"\x89PNG\r\n\x1a\n",)),
    "image/jpeg": (".jpg", (b"\xff\xd8\xff",)),
    "image/webp": (".webp", (b"RIFF",)),
    "image/gif": (".gif", (b"GIF87a", b"GIF89a")),
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _feedback_root(data_root: Path) -> Path:
    return data_root / "feedback"


def _feedback_path(data_root: Path, feedback_id: str) -> Path:
    return _feedback_root(data_root) / f"{feedback_id}.json"


def _folder_segment(value: str | None, *, fallback: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        return fallback
    return re.sub(r"[^A-Za-z0-9._-]", "_", cleaned)[:128] or fallback


def _record_path(data_root: Path, record: FeedbackRecord) -> Path:
    user_segment = _folder_segment(record.user_id, fallback="anonymous")
    return _feedback_root(data_root) / user_segment / record.status / f"{record.id}.json"


def _record_screenshots(record: FeedbackRecord) -> list[FeedbackScreenshot]:
    if record.screenshots:
        return record.screenshots
    return [record.screenshot] if record.screenshot else []


def _screenshot_path(data_root: Path, record: FeedbackRecord, index: int) -> Path | None:
    screenshots = _record_screenshots(record)
    if index < 0 or index >= len(screenshots):
        return None
    extension = FEEDBACK_SCREENSHOT_TYPES[screenshots[index].content_type][0]
    user_segment = _folder_segment(record.user_id, fallback="anonymous")
    attachment_root = _feedback_root(data_root) / user_segment / "attachments"
    if not record.screenshots and record.screenshot is not None:
        legacy_path = attachment_root / f"{record.id}{extension}"
        if legacy_path.exists():
            return legacy_path
    return attachment_root / f"{record.id}-{index + 1}{extension}"


def validate_feedback_screenshot(filename: str, content_type: str, content: bytes) -> FeedbackScreenshot:
    normalized_type = content_type.strip().lower()
    type_details = FEEDBACK_SCREENSHOT_TYPES.get(normalized_type)
    if type_details is None:
        raise ValueError("Screenshots must be PNG, JPEG, WebP, or GIF images.")
    if not content:
        raise ValueError("The screenshot file is empty.")
    if len(content) > MAX_FEEDBACK_SCREENSHOT_BYTES:
        raise ValueError("Screenshots must be 5 MB or smaller.")
    signatures = type_details[1]
    if normalized_type == "image/webp":
        if len(content) < 12 or not content.startswith(b"RIFF") or content[8:12] != b"WEBP":
            raise ValueError("The screenshot file does not match its declared image type.")
    elif not any(content.startswith(signature) for signature in signatures):
        raise ValueError("The screenshot file does not match its declared image type.")
    display_name = re.split(r"[\\/]", filename.strip())[-1]
    display_name = re.sub(r"[^A-Za-z0-9._() -]", "_", display_name)[:160].strip(" .")
    return FeedbackScreenshot(
        filename=display_name or f"screenshot{type_details[0]}",
        content_type=normalized_type,
        size_bytes=len(content),
    )


def get_feedback_screenshot_file(data_root: Path, feedback_id: str, index: int) -> tuple[FeedbackRecord, FeedbackScreenshot, Path]:
    source_path = _find_feedback_path(data_root, feedback_id)
    if source_path is None:
        raise FileNotFoundError(f"Feedback record not found: {feedback_id}")
    record = FeedbackRecord.model_validate_json(source_path.read_text(encoding="utf-8"))
    screenshots = _record_screenshots(record)
    if index < 0 or index >= len(screenshots):
        raise IndexError(f"Feedback screenshot not found: {feedback_id}/{index}")
    screenshot_path = _screenshot_path(data_root, record, index)
    if screenshot_path is None or not screenshot_path.exists():
        raise FileNotFoundError(f"Feedback screenshot file not found: {feedback_id}/{index}")
    return record, screenshots[index], screenshot_path


def _find_feedback_path(data_root: Path, feedback_id: str) -> Path | None:
    legacy_path = _feedback_path(data_root, feedback_id)
    if legacy_path.exists():
        return legacy_path
    matches = list(_feedback_root(data_root).glob(f"*/**/{feedback_id}.json"))
    return matches[0] if matches else None


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
        "Classify and plan this TextPlex tester feedback for an internal review queue. "
        "Return only valid JSON with title, summary, category, severity, affected_area, "
        "Use exactly one category from: bug, content, ux, usability, performance, question, other. "
        "reproduction_notes, suggested_action, tags, and a plan object. The plan object "
        "must contain problem_statement, expected_behavior, actual_behavior, reproduction_steps, "
        "implementation_tasks, acceptance_criteria, suggested_tests, risks, priority, and estimated_effort. "
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


def _call_openai_screenshot_analysis(data_root: Path, record: FeedbackRecord) -> FeedbackScreenshotAnalysis:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    screenshots = _record_screenshots(record)
    if not screenshots:
        raise ValueError("This feedback report has no screenshots to analyze.")
    content: list[dict[str, object]] = [
        {
            "type": "input_text",
            "text": (
                "Review these tester-submitted TextPlex screenshots in the context of the original report. "
                "Return only valid JSON with summary, observations, visible_text, and suggested_action. "
                "Do not invent details that are not visible. Distinguish visible evidence from inference. "
                f"Original report: {record.original_text}\n"
                f"Page context: {json.dumps(record.context.model_dump(exclude_none=True), ensure_ascii=False, sort_keys=True)}"
            ),
        }
    ]
    for index, screenshot in enumerate(screenshots):
        screenshot_path = _screenshot_path(data_root, record, index)
        if screenshot_path is None or not screenshot_path.exists():
            raise FileNotFoundError(f"Feedback screenshot file not found: {record.id}/{index}")
        encoded = base64.b64encode(screenshot_path.read_bytes()).decode("ascii")
        content.append(
            {
                "type": "input_image",
                "image_url": f"data:{screenshot.content_type};base64,{encoded}",
                "detail": "high",
            }
        )

    request_payload = {
        "model": _openai_model(),
        "max_output_tokens": _max_output_tokens(),
        "input": [{"role": "user", "content": content}],
    }
    request = Request(
        OPENAI_RESPONSES_URL,
        data=json.dumps(request_payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI screenshot analysis failed with HTTP {exc.code}: {detail}") from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"OpenAI screenshot analysis failed: {exc}") from exc

    if not isinstance(payload, dict):
        raise TypeError("OpenAI screenshot analysis response was not a JSON object.")
    parsed = _json_object_from_text(_response_text(payload))
    if parsed is None:
        raise RuntimeError("OpenAI screenshot analysis did not return a JSON object.")
    return FeedbackScreenshotAnalysis.model_validate(
        {
            "analyzed_at": _utc_now(),
            "model": _openai_model(),
            "summary": parsed.get("summary", ""),
            "observations": parsed.get("observations", []),
            "visible_text": parsed.get("visible_text", []),
            "suggested_action": parsed.get("suggested_action"),
        }
    )


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
        plan=FeedbackPlan(
            problem_statement=original_text.strip()[:1000],
            expected_behavior="The reported Reader interaction should be clear and reliable.",
            actual_behavior=original_text.strip()[:1000],
            reproduction_steps=[f"Open {context.route}.", "Repeat the interaction described in the original report."],
            implementation_tasks=["Review the affected surface and reproduce the report.", "Implement the smallest scoped correction."],
            acceptance_criteria=["The reported interaction behaves as expected.", "The original report context remains covered by a regression check."],
            suggested_tests=["Add a focused route or component regression test."],
            risks=["The report may depend on a specific content item or device size."],
            priority="medium" if severity in {"medium", "high"} else "low",  # type: ignore[arg-type]
            estimated_effort="small",
        ),
    )


def create_feedback(
    data_root: Path,
    original_text: str,
    context: FeedbackContext,
    *,
    user_id: str | None = None,
    screenshot_upload: tuple[str, str, bytes] | None = None,
    screenshot_uploads: list[tuple[str, str, bytes]] | None = None,
) -> FeedbackRecord:
    feedback_id = uuid4().hex
    uploads = list(screenshot_uploads or [])
    if screenshot_upload:
        uploads.insert(0, screenshot_upload)
    if len(uploads) > MAX_FEEDBACK_SCREENSHOTS:
        raise ValueError(f"A feedback report may include up to {MAX_FEEDBACK_SCREENSHOTS} screenshots.")
    screenshots = [validate_feedback_screenshot(*upload) for upload in uploads]
    if sum(screenshot.size_bytes for screenshot in screenshots) > MAX_FEEDBACK_SCREENSHOTS_TOTAL_BYTES:
        raise ValueError("The combined screenshot size must be 15 MB or smaller.")
    try:
        triage = _call_openai(original_text, context)
        triage_source = "openai"
    except Exception:
        logger.exception("OpenAI feedback triage failed; storing fallback classification.")
        triage = _fallback_triage(original_text, context)
        triage_source = "fallback"

    submitted_at = _utc_now()
    record = FeedbackRecord(
        id=feedback_id,
        submitted_at=submitted_at,
        original_text=original_text.strip(),
        context=context,
        triage=triage,
        triage_source=triage_source,
        status_history=[
            FeedbackStatusChange(
                status="needs_review",
                changed_at=submitted_at,
                changed_by=user_id,
                note="Feedback submitted.",
            )
        ],
        user_id=user_id,
        screenshots=screenshots,
    )
    path = _record_path(data_root, record)
    path.parent.mkdir(parents=True, exist_ok=True)
    if uploads:
        screenshot_root = _feedback_root(data_root) / _folder_segment(record.user_id, fallback="anonymous") / "attachments"
        screenshot_root.mkdir(parents=True, exist_ok=True)
        for index, upload in enumerate(uploads):
            screenshot_path = _screenshot_path(data_root, record, index)
            if screenshot_path is None:
                raise RuntimeError("Screenshot metadata was not created.")
            screenshot_path.write_bytes(upload[2])
    path.write_text(record.model_dump_json(indent=2), encoding="utf-8")
    if _github_auto_route_enabled():
        try:
            record = create_github_issue(
                data_root,
                record.id,
                changed_by="system:feedback-auto-route",
                title=_github_issue_title(record),
            )
        except Exception:
            logger.exception("Automatic GitHub routing failed; feedback remains available in the admin queue.")
    return record


def analyze_feedback_screenshots(data_root: Path, feedback_id: str) -> FeedbackRecord:
    source_path = _find_feedback_path(data_root, feedback_id)
    if source_path is None:
        raise FileNotFoundError(f"Feedback record not found: {feedback_id}")
    record = FeedbackRecord.model_validate_json(source_path.read_text(encoding="utf-8"))
    analysis = _call_openai_screenshot_analysis(data_root, record)
    updated_record = record.model_copy(update={"screenshot_analysis": analysis})
    source_path.write_text(updated_record.model_dump_json(indent=2), encoding="utf-8")
    return updated_record


def update_feedback_status(
    data_root: Path,
    feedback_id: str,
    status: FeedbackStatus,
    *,
    note: str | None = None,
    changed_by: str | None = None,
    implementation_build: str | None = None,
    verification_instructions: str | None = None,
) -> FeedbackRecord:
    source_path = _find_feedback_path(data_root, feedback_id)
    if source_path is None:
        raise FileNotFoundError(f"Feedback record not found: {feedback_id}")

    record = FeedbackRecord.model_validate_json(source_path.read_text(encoding="utf-8"))
    changed_at = _utc_now()
    verification = record.verification
    if status == "ready_for_testing":
        verification = FeedbackVerification(
            implementation_build=(implementation_build or "").strip(),
            instructions=(verification_instructions or "").strip(),
            requested_at=changed_at,
            requested_by=changed_by,
        )
    updated_record = record.model_copy(update={
        "status": status,
        "resolution_note": note if status in {"completed", "acknowledged", "dismissed"} else record.resolution_note,
        "verification": verification,
        "status_history": [
            *record.status_history,
            FeedbackStatusChange(status=status, changed_at=changed_at, changed_by=changed_by, note=note),
        ],
    })
    destination_path = _record_path(data_root, updated_record)
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    destination_path.write_text(updated_record.model_dump_json(indent=2), encoding="utf-8")
    if source_path.resolve() != destination_path.resolve():
        source_path.unlink()
    try:
        _sync_github_project_status(updated_record)
    except Exception:
        logger.exception("Unable to synchronize the feedback status to GitHub Projects.")
    return updated_record


def submit_tester_verification(
    data_root: Path,
    feedback_id: str,
    response: FeedbackTesterResponse,
    *,
    note: str | None = None,
    user_id: str,
) -> FeedbackRecord:
    source_path = _find_feedback_path(data_root, feedback_id)
    if source_path is None:
        raise FileNotFoundError(f"Feedback record not found: {feedback_id}")

    record = FeedbackRecord.model_validate_json(source_path.read_text(encoding="utf-8"))
    if record.user_id != user_id:
        raise PermissionError("This feedback report does not belong to the current user.")
    if record.status != "ready_for_testing" or record.verification is None:
        raise ValueError("This feedback report is not currently waiting for tester review.")

    responded_at = _utc_now()
    next_status: FeedbackStatus = "completed" if response == "verified" else "in_progress"
    verification = record.verification.model_copy(update={
        "response": response,
        "response_note": note.strip() if note and note.strip() else None,
        "responded_at": responded_at,
        "responded_by": user_id,
    })
    updated_record = record.model_copy(update={
        "status": next_status,
        "verification": verification,
        "status_history": [
            *record.status_history,
            FeedbackStatusChange(
                status=next_status,
                changed_at=responded_at,
                changed_by=user_id,
                note=note.strip() if note and note.strip() else response.replace("_", " "),
                event_type="tester_response",
            ),
        ],
    })
    destination_path = _record_path(data_root, updated_record)
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    destination_path.write_text(updated_record.model_dump_json(indent=2), encoding="utf-8")
    if source_path.resolve() != destination_path.resolve():
        source_path.unlink()
    return updated_record


def list_feedback(data_root: Path, *, limit: int = 100) -> list[FeedbackRecord]:
    records: list[FeedbackRecord] = []
    paths = sorted(
        (path for path in _feedback_root(data_root).glob("**/*.json") if path.name not in {"notifications.json", "testers.json", "digest-state.json"}),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )[:limit]
    for path in paths:
        try:
            records.append(FeedbackRecord.model_validate_json(path.read_text(encoding="utf-8")))
        except (OSError, ValueError):
            logger.warning("Skipping invalid feedback record: %s", path)
    return records


def _tester_nicknames_path(data_root: Path) -> Path:
    return _feedback_root(data_root) / "testers.json"


def _load_tester_nicknames(data_root: Path) -> dict[str, str]:
    path = _tester_nicknames_path(data_root)
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    values = payload.get("nicknames") if isinstance(payload, dict) else None
    if not isinstance(values, dict):
        return {}
    return {
        tester_id: nickname
        for tester_id, nickname in values.items()
        if isinstance(tester_id, str) and isinstance(nickname, str) and nickname.strip()
    }


def _save_tester_nicknames(data_root: Path, nicknames: dict[str, str]) -> None:
    path = _tester_nicknames_path(data_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"nicknames": nicknames}, indent=2), encoding="utf-8")


def list_testers(data_root: Path) -> list[TesterRecord]:
    nicknames = _load_tester_nicknames(data_root)
    tester_activity: dict[str, list[str]] = {}
    for record in list_feedback(data_root, limit=10000):
        if record.user_id:
            tester_activity.setdefault(record.user_id, []).append(record.submitted_at)

    return sorted(
        (
            TesterRecord(
                tester_id=tester_id,
                nickname=nicknames.get(tester_id),
                feedback_count=len(submitted_at_values),
                last_seen_at=max(submitted_at_values) if submitted_at_values else None,
            )
            for tester_id, submitted_at_values in tester_activity.items()
        ),
        key=lambda tester: (tester.last_seen_at or "", tester.tester_id),
        reverse=True,
    )


def update_tester_nickname(data_root: Path, tester_id: str, nickname: str | None) -> TesterRecord:
    normalized_tester_id = tester_id.strip()
    if not normalized_tester_id:
        raise ValueError("Tester ID is required.")
    testers = {tester.tester_id: tester for tester in list_testers(data_root)}
    if normalized_tester_id not in testers:
        raise FileNotFoundError(f"Tester not found: {normalized_tester_id}")

    nicknames = _load_tester_nicknames(data_root)
    normalized_nickname = nickname.strip() if nickname else ""
    if normalized_nickname:
        nicknames[normalized_tester_id] = normalized_nickname
    else:
        nicknames.pop(normalized_tester_id, None)
    _save_tester_nicknames(data_root, nicknames)
    return testers[normalized_tester_id].model_copy(update={"nickname": normalized_nickname or None})


def _notification_state_path(data_root: Path, user_id: str) -> Path:
    return _feedback_root(data_root) / _folder_segment(user_id, fallback="anonymous") / "notifications.json"


def _load_read_notification_ids(data_root: Path, user_id: str) -> set[str]:
    path = _notification_state_path(data_root, user_id)
    if not path.exists():
        return set()
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    values = payload.get("read_ids") if isinstance(payload, dict) else None
    return {value for value in values if isinstance(value, str)} if isinstance(values, list) else set()


def _save_read_notification_ids(data_root: Path, user_id: str, read_ids: set[str]) -> None:
    path = _notification_state_path(data_root, user_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"read_ids": sorted(read_ids)}, indent=2), encoding="utf-8")


def _notification_from_event(record: FeedbackRecord, event: FeedbackStatusChange) -> FeedbackNotification:
    notification_id = f"{record.id}:{event.changed_at}:{event.event_type}"
    if event.event_type == "github_linked":
        message = f"A GitHub issue was created for your feedback: {event.github_issue_url or 'view the tracked issue in your feedback history'}."
    elif event.status == "ready_for_testing":
        build = record.verification.implementation_build if record.verification else "the latest build"
        instructions = record.verification.instructions if record.verification else "Please try the original scenario again."
        message = f"This feedback was addressed in build {build}. {instructions}"
    elif event.status == "completed":
        message = f"Your feedback was completed.{f' Resolution: {event.note}' if event.note else ''}"
    elif event.status == "acknowledged":
        message = f"Your feedback was acknowledged but is not currently planned.{f' Rationale: {event.note}' if event.note else ''}"
    elif event.status == "dismissed":
        message = f"Your feedback was dismissed.{f' Rationale: {event.note}' if event.note else ''}"
    elif event.status == "in_progress":
        message = "Your feedback is now in progress."
    else:
        message = "Your feedback was reviewed."
    return FeedbackNotification(
        id=notification_id,
        feedback_id=record.id,
        title=record.triage.title,
        status=event.status,
        event_type=event.event_type,
        message=message,
        created_at=event.changed_at,
        route=record.context.route,
        github_issue_url=event.github_issue_url or (record.github.issue_url if record.github else None),
        verification_build=record.verification.implementation_build if event.status == "ready_for_testing" and record.verification else None,
        verification_instructions=record.verification.instructions if event.status == "ready_for_testing" and record.verification else None,
    )


def list_user_notifications(data_root: Path, user_id: str, *, limit: int = 100) -> list[FeedbackNotification]:
    read_ids = _load_read_notification_ids(data_root, user_id)
    records = [record for record in list_feedback(data_root, limit=1000) if record.user_id == user_id]
    notifications: list[FeedbackNotification] = []
    for record in records:
        for event in record.status_history:
            if event.event_type == "status_changed" and event.changed_at == record.submitted_at:
                continue
            if event.event_type == "tester_response":
                continue
            if event.status == "ready_for_testing" and record.verification and record.verification.response:
                continue
            notification = _notification_from_event(record, event)
            notifications.append(notification.model_copy(update={"read": notification.id in read_ids}))
    return sorted(notifications, key=lambda item: item.created_at, reverse=True)[:limit]


def mark_user_notifications_read(data_root: Path, user_id: str, notification_ids: list[str]) -> None:
    read_ids = _load_read_notification_ids(data_root, user_id)
    read_ids.update(notification_ids)
    _save_read_notification_ids(data_root, user_id, read_ids)


def _github_token() -> str:
    return os.getenv("GITHUB_TOKEN", "").strip()


def _github_repository() -> str:
    return os.getenv("TEXTPLEX_GITHUB_REPOSITORY", "").strip().strip("/")


def _github_auto_route_enabled() -> bool:
    enabled = os.getenv("TEXTPLEX_GITHUB_AUTO_ROUTE_FEEDBACK", "false").strip().lower() in {"1", "true", "yes", "on"}
    return enabled and bool(_github_token()) and "/" in _github_repository() and bool(os.getenv("TEXTPLEX_GITHUB_PROJECT_ID", "").strip())


def _github_headers() -> dict[str, str]:
    token = _github_token()
    if not token:
        raise RuntimeError("GITHUB_TOKEN is not configured.")
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _github_request(path: str, *, method: str = "POST", payload: dict[str, object] | None = None) -> dict[str, object]:
    request = Request(
        f"{GITHUB_API_URL}{path}",
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers=_github_headers(),
        method=method,
    )
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
            parsed = json.loads(body) if body else {}
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub request failed with HTTP {exc.code}: {detail}") from exc
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"GitHub request failed: {exc}") from exc
    if not isinstance(parsed, dict):
        raise TypeError("GitHub returned an invalid JSON object.")
    return parsed


def _github_graphql(query: str, variables: dict[str, object]) -> dict[str, object]:
    request = Request(
        GITHUB_GRAPHQL_URL,
        data=json.dumps({"query": query, "variables": variables}).encode("utf-8"),
        headers=_github_headers(),
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            parsed = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"GitHub project request failed: {exc}") from exc
    if not isinstance(parsed, dict) or parsed.get("errors"):
        raise RuntimeError(f"GitHub project request returned errors: {parsed.get('errors') if isinstance(parsed, dict) else parsed}")
    return parsed


def _github_project_item(content_node_id: str) -> str | None:
    project_id = os.getenv("TEXTPLEX_GITHUB_PROJECT_ID", "").strip()
    if not project_id:
        return None
    payload = _github_graphql(
        "mutation AddProjectItem($projectId:ID!, $contentId:ID!) { addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) { item { id } } }",
        {"projectId": project_id, "contentId": content_node_id},
    )
    data = payload.get("data")
    item = data.get("addProjectV2ItemById", {}).get("item") if isinstance(data, dict) else None
    return item.get("id") if isinstance(item, dict) and isinstance(item.get("id"), str) else None


def _sync_github_project_status(record: FeedbackRecord) -> None:
    if not record.github or not record.github.project_item_id:
        return
    field_id = os.getenv("TEXTPLEX_GITHUB_PROJECT_STATUS_FIELD_ID", "").strip()
    options_raw = os.getenv("TEXTPLEX_GITHUB_PROJECT_STATUS_OPTIONS_JSON", "").strip()
    if not field_id or not options_raw:
        return
    try:
        options = json.loads(options_raw)
    except json.JSONDecodeError:
        logger.warning("TEXTPLEX_GITHUB_PROJECT_STATUS_OPTIONS_JSON is invalid JSON.")
        return
    option_id = options.get(record.status) if isinstance(options, dict) else None
    if not isinstance(option_id, str) or not option_id:
        return
    _github_graphql(
        "mutation UpdateProjectStatus($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!) { updateProjectV2ItemFieldValue(input:{projectId:$projectId, itemId:$itemId, fieldId:$fieldId, value:{singleSelectOptionId:$optionId}}) { projectV2Item { id } } }",
        {
            "projectId": os.getenv("TEXTPLEX_GITHUB_PROJECT_ID", "").strip(),
            "itemId": record.github.project_item_id,
            "fieldId": field_id,
            "optionId": option_id,
        },
    )


def _github_issue_body(record: FeedbackRecord) -> str:
    plan = record.triage.plan
    context = record.context
    lines = [
        "## Tester feedback",
        "",
        record.original_text,
        "",
        "## Captured context",
        f"- Route: `{context.route}`",
        f"- Language: `{context.language_code or 'unknown'}`",
        f"- Book/page: `{context.book_id or 'n/a'}` / `{context.page_number or 'n/a'}`",
        f"- Build: `{context.app_version}`",
        f"- Tester ID: `{record.user_id or 'anonymous'}`",
        "",
        "## AI triage",
        f"- Category: `{record.triage.category}`",
        f"- Severity: `{record.triage.severity}`",
        f"- Priority: `{plan.priority}`",
        f"- Estimated effort: `{plan.estimated_effort}`",
        "",
        "### Problem",
        plan.problem_statement or record.triage.summary,
        "",
        "### Implementation tasks",
        *[f"- {item}" for item in plan.implementation_tasks],
        "",
        "### Acceptance criteria",
        *[f"- [ ] {item}" for item in plan.acceptance_criteria],
        "",
        "### Suggested tests",
        *[f"- {item}" for item in plan.suggested_tests],
        "",
        "---",
        "Generated by TextPlex feedback triage. The original report is retained in TextPlex.",
    ]
    return "\n".join(lines)


def _github_issue_title(record: FeedbackRecord) -> str:
    title = record.triage.title.strip()
    return title if title.lower().startswith("[feedback]") else f"[Feedback] {title}"


def _github_feedback_labels(record: FeedbackRecord) -> list[str]:
    labels = ["feedback", "feedback:needs-review"]
    category_label = {
        "bug": "bug",
        "question": "question",
        "content": "enhancement",
        "ux": "feedback:ux",
        "usability": "feedback:ux",
        "performance": "enhancement",
    }.get(record.triage.category)
    if category_label:
        labels.append(category_label)
    route_segment = record.context.route.strip("/").split("/", 1)[0]
    route_label = {
        "reader": "feedback:reader",
        "books": "feedback:book-detail",
        "profile": "feedback:profile",
    }.get(route_segment)
    if route_label:
        labels.append(route_label)
    return list(dict.fromkeys(labels))


def create_github_issue(
    data_root: Path,
    feedback_id: str,
    *,
    changed_by: str,
    title: str | None = None,
) -> FeedbackRecord:
    source_path = _find_feedback_path(data_root, feedback_id)
    repository = _github_repository()
    if source_path is None:
        raise FileNotFoundError(f"Feedback record not found: {feedback_id}")
    if not repository or "/" not in repository:
        raise RuntimeError("TEXTPLEX_GITHUB_REPOSITORY must be configured as owner/repository.")

    record = FeedbackRecord.model_validate_json(source_path.read_text(encoding="utf-8"))
    if record.github:
        return record
    issue = _github_request(
        f"/repos/{quote(repository, safe='/')}/issues",
        payload={
            "title": title or _github_issue_title(record),
            "body": _github_issue_body(record),
            "labels": _github_feedback_labels(record),
        },
    )
    issue_number = issue.get("number")
    issue_url = issue.get("html_url")
    node_id = issue.get("node_id")
    if not isinstance(issue_number, int) or not isinstance(issue_url, str):
        raise TypeError("GitHub issue response did not contain an issue number and URL.")
    project_item_id = None
    if isinstance(node_id, str):
        try:
            project_item_id = _github_project_item(node_id)
        except Exception:
            logger.exception("GitHub issue created, but the issue could not be added to the configured Project.")
    linked_at = _utc_now()
    updated_record = record.model_copy(
        update={
            "github": FeedbackGitHubLink(
                repository=repository,
                issue_number=issue_number,
                issue_url=issue_url,
                issue_state=issue.get("state") if issue.get("state") in {"open", "closed"} else "open",
                project_item_id=project_item_id,
                project_url=os.getenv("TEXTPLEX_GITHUB_PROJECT_URL") or None,
                linked_at=linked_at,
                last_synced_at=linked_at,
            ),
            "status_history": [
                *record.status_history,
                FeedbackStatusChange(
                    status=record.status,
                    changed_at=linked_at,
                    changed_by=changed_by,
                    note=f"GitHub issue created: {issue_url}",
                    event_type="github_linked",
                    github_issue_url=issue_url,
                ),
            ],
        }
    )
    destination_path = _record_path(data_root, updated_record)
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    destination_path.write_text(updated_record.model_dump_json(indent=2), encoding="utf-8")
    if source_path.resolve() != destination_path.resolve():
        source_path.unlink()
    try:
        _sync_github_project_status(updated_record)
    except Exception:
        logger.exception("Unable to set the automatically linked feedback item status in GitHub Projects.")
    return updated_record
