from __future__ import annotations

import json
import os
import smtplib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path

from app.schemas.feedback import FeedbackRecord
from app.services.feedback import list_feedback

DEFAULT_DIGEST_HOUR_UTC = 13
DEFAULT_DIGEST_MINUTE_UTC = 0


@dataclass(frozen=True)
class FeedbackDigestResult:
    sent: bool
    record_count: int
    generated_at: str
    message: str


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.astimezone(timezone.utc) if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _env_bool(name: str, default: bool = False) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def feedback_digest_enabled() -> bool:
    return _env_bool("FEEDBACK_DIGEST_ENABLED", False)


def _digest_hour() -> int:
    try:
        return max(0, min(23, int(os.getenv("FEEDBACK_DIGEST_HOUR_UTC", str(DEFAULT_DIGEST_HOUR_UTC)))))
    except ValueError:
        return DEFAULT_DIGEST_HOUR_UTC


def _digest_minute() -> int:
    try:
        return max(0, min(59, int(os.getenv("FEEDBACK_DIGEST_MINUTE_UTC", str(DEFAULT_DIGEST_MINUTE_UTC)))))
    except ValueError:
        return DEFAULT_DIGEST_MINUTE_UTC


def seconds_until_next_digest(now: datetime | None = None) -> float:
    current = (now or _utc_now()).astimezone(timezone.utc)
    target = current.replace(hour=_digest_hour(), minute=_digest_minute(), second=0, microsecond=0)
    if target <= current:
        target += timedelta(days=1)
    return max(1.0, (target - current).total_seconds())


def _digest_state_path(data_root: Path) -> Path:
    return data_root / "feedback" / "digest-state.json"


def _load_digest_state(data_root: Path) -> datetime | None:
    path = _digest_state_path(data_root)
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return _timestamp(payload.get("last_sent_at")) if isinstance(payload, dict) else None


def _save_digest_state(data_root: Path, sent_at: datetime, record_count: int) -> None:
    path = _digest_state_path(data_root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "last_sent_at": sent_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
                "last_record_count": record_count,
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def _record_activity(record: FeedbackRecord) -> datetime:
    timestamps = [_timestamp(record.submitted_at)] + [_timestamp(event.changed_at) for event in record.status_history]
    return max((value for value in timestamps if value is not None), default=datetime.min.replace(tzinfo=timezone.utc))


def _digest_records(data_root: Path, *, force: bool) -> list[FeedbackRecord]:
    records = list_feedback(data_root, limit=10000)
    if force:
        return [record for record in records if record.status != "dismissed"]

    last_sent_at = _load_digest_state(data_root)
    if last_sent_at is None:
        return [record for record in records if record.status in {"needs_review", "in_progress"}]
    return [record for record in records if _record_activity(record) > last_sent_at]


def _admin_url() -> str:
    return os.getenv("FEEDBACK_DIGEST_ADMIN_URL", "http://localhost:3000/admin/feedback").strip()


def _project_url() -> str:
    return os.getenv("TEXTPLEX_GITHUB_PROJECT_URL", "https://github.com/users/ajth-work/projects/2").strip()


def _recipients() -> list[str]:
    return [value.strip() for value in os.getenv("FEEDBACK_DIGEST_TO", "").split(",") if value.strip()]


def _smtp_message(records: list[FeedbackRecord], generated_at: datetime) -> EmailMessage:
    recipients = _recipients()
    if not recipients:
        raise RuntimeError("FEEDBACK_DIGEST_TO is not configured.")
    unresolved_count = sum(record.status in {"needs_review", "in_progress"} for record in records)
    subject = f"[TextPlex] Feedback digest — {len(records)} update{'s' if len(records) != 1 else ''}"
    lines = [
        f"TextPlex feedback digest generated {generated_at.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')}.",
        f"Updates in this digest: {len(records)}.",
        f"Unresolved among these updates: {unresolved_count}.",
        "",
        f"Admin feedback panel: {_admin_url()}",
        f"GitHub Feature Board: {_project_url()}",
        "",
    ]
    for record in sorted(records, key=_record_activity, reverse=True):
        plan = record.triage.plan
        lines.extend(
            [
                f"{record.triage.title} [{record.status}]",
                f"  Feedback ID: {record.id}",
                f"  Tester: {record.user_id or 'anonymous'}",
                f"  Route: {record.context.route}",
                f"  Language: {record.context.language_code or 'unknown'}",
                f"  Category / priority: {record.triage.category} / {plan.priority}",
                f"  Summary: {record.triage.summary[:500]}",
                f"  Admin: {_admin_url()}",
                f"  GitHub: {record.github.issue_url if record.github else 'Not linked'}",
                "",
            ]
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = os.getenv("FEEDBACK_DIGEST_FROM", "").strip() or recipients[0]
    message["To"] = ", ".join(recipients)
    message.set_content("\n".join(lines))
    return message


def _send_email(message: EmailMessage) -> None:
    host = os.getenv("FEEDBACK_DIGEST_SMTP_HOST", "").strip()
    if not host:
        raise RuntimeError("FEEDBACK_DIGEST_SMTP_HOST is not configured.")
    recipients = _recipients()
    if not recipients:
        raise RuntimeError("FEEDBACK_DIGEST_TO is not configured.")
    try:
        port = int(os.getenv("FEEDBACK_DIGEST_SMTP_PORT", "587"))
    except ValueError as exc:
        raise RuntimeError("FEEDBACK_DIGEST_SMTP_PORT must be an integer.") from exc

    use_ssl = _env_bool("FEEDBACK_DIGEST_SMTP_SSL", False)
    use_tls = _env_bool("FEEDBACK_DIGEST_SMTP_USE_TLS", True)
    client_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
    with client_class(host, port, timeout=30) as client:
        if use_tls and not use_ssl:
            client.starttls()
        username = os.getenv("FEEDBACK_DIGEST_SMTP_USERNAME", "").strip()
        password = os.getenv("FEEDBACK_DIGEST_SMTP_PASSWORD", "")
        if username:
            client.login(username, password)
        client.send_message(message)


def send_feedback_digest(data_root: Path, *, force: bool = False, now: datetime | None = None) -> FeedbackDigestResult:
    generated_at = (now or _utc_now()).astimezone(timezone.utc)
    records = _digest_records(data_root, force=force)
    if not records:
        return FeedbackDigestResult(False, 0, generated_at.isoformat().replace("+00:00", "Z"), "No new feedback updates.")
    message = _smtp_message(records, generated_at)
    _send_email(message)
    _save_digest_state(data_root, generated_at, len(records))
    return FeedbackDigestResult(True, len(records), generated_at.isoformat().replace("+00:00", "Z"), "Digest email sent.")
