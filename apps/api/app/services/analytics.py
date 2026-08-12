from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from app.core.paths import resolve_books_root, resolve_user_data_root
from app.schemas.admin_analytics import (
    AdminAnalyticsOverview,
    AnalyticsFeatureRoleUsage,
    AnalyticsFeatureUsage,
    AnalyticsFunnelStage,
    AnalyticsMetric,
    AnalyticsRetentionCohort,
    AnalyticsWatchlistUser,
)
from app.services.admin_usage import _profile_database_paths, get_admin_usage_summary
from app.services.book_registry import load_registry
from app.services.feedback import list_feedback

logger = logging.getLogger(__name__)

ANALYTICS_DB_NAME = "analytics_events.sqlite3"
ANALYTICS_WINDOW_DAYS = 30
VALUE_EVENTS = {
    "translation_used",
    "definition_opened",
    "vocabulary_saved",
    "practice_generated",
    "ai_feature_used",
    "sentence_read",
}
PAYWALL_EVENTS = {"paywall_seen", "unlock_clicked", "pricing_viewed", "ai_limit_reached"}
CONVERSION_EVENTS = {"trial_started", "checkout_started", "subscription_activated"}
ACTIVATION_EVENTS = {"book_imported", "first_book_ready", "reading_session_started"}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_timestamp(value: object) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def get_analytics_db_path(data_root: Path) -> Path:
    return resolve_user_data_root(data_root) / ANALYTICS_DB_NAME


def _migration_root() -> Path:
    return Path(__file__).resolve().parents[1] / "db" / "migrations" / "analytics"


def ensure_analytics_database(data_root: Path) -> Path:
    db_path = get_analytics_db_path(data_root)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as connection:
        for migration_file in sorted(_migration_root().glob("*.sql")):
            connection.executescript(migration_file.read_text(encoding="utf-8"))
    return db_path


def record_analytics_event(
    data_root: Path,
    *,
    event_name: str,
    account_id: str | None = None,
    account_role: str | None = None,
    profile_id: str | None = None,
    session_id: str | None = None,
    route: str | None = None,
    feature_key: str | None = None,
    metadata: dict[str, str | int | float | bool | None] | None = None,
    occurred_at: str | None = None,
    event_id: str | None = None,
) -> str | None:
    event_key = event_id or uuid4().hex
    timestamp = _parse_timestamp(occurred_at) or _utc_now()
    event_metadata = dict(metadata or {})
    if account_role in {"member", "tester", "admin"}:
        event_metadata["_account_role"] = account_role
    metadata_json = json.dumps(event_metadata, separators=(",", ":"), sort_keys=True)
    try:
        db_path = ensure_analytics_database(data_root)
        with sqlite3.connect(db_path) as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO analytics_events (
                    event_id, event_name, occurred_at, account_id, profile_id,
                    session_id, route, feature_key, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_key,
                    event_name,
                    timestamp.isoformat().replace("+00:00", "Z"),
                    account_id,
                    profile_id,
                    session_id,
                    route,
                    feature_key,
                    metadata_json,
                ),
            )
            connection.commit()
    except (OSError, sqlite3.Error, TypeError, ValueError):
        logger.exception("Analytics event could not be recorded: %s", event_name)
        return None
    return event_key


def _load_events(data_root: Path, window_days: int) -> list[dict[str, object]]:
    cutoff = _utc_now() - timedelta(days=window_days)
    try:
        db_path = ensure_analytics_database(data_root)
        with sqlite3.connect(db_path) as connection:
            rows = connection.execute(
                """
                SELECT event_id, event_name, occurred_at, account_id, profile_id,
                       session_id, route, feature_key, metadata_json
                FROM analytics_events
                WHERE occurred_at >= ?
                ORDER BY occurred_at ASC
                """,
                (cutoff.isoformat().replace("+00:00", "Z"),),
            ).fetchall()
    except (OSError, sqlite3.Error):
        return []

    events: list[dict[str, object]] = []
    for row in rows:
        timestamp = _parse_timestamp(row[2])
        if timestamp is None:
            continue
        try:
            metadata = json.loads(row[8] or "{}")
        except (TypeError, json.JSONDecodeError):
            metadata = {}
        events.append(
            {
                "event_id": str(row[0]),
                "event_name": str(row[1]),
                "occurred_at": timestamp,
                "account_id": str(row[3]) if row[3] else None,
                "profile_id": str(row[4]) if row[4] else None,
                "session_id": str(row[5]) if row[5] else None,
                "route": str(row[6]) if row[6] else None,
                "feature_key": str(row[7]) if row[7] else None,
                "metadata": metadata if isinstance(metadata, dict) else {},
                "account_role": metadata.get("_account_role") if metadata.get("_account_role") in {"member", "tester", "admin"} else None,
            }
        )
    return events


def _legacy_profile_id(db_path: Path) -> str:
    return "local-profile" if db_path.name == "profile.sqlite3" and db_path.parent.name != "accounts" else db_path.parent.name


def _backfill_legacy_events(data_root: Path) -> None:
    """Seed deterministic events from existing local data without duplicating rows."""
    for db_path in _profile_database_paths(data_root):
        profile_id = _legacy_profile_id(db_path)
        try:
            with sqlite3.connect(db_path) as connection:
                sessions = connection.execute("SELECT id, book_id, started_at FROM reading_sessions").fetchall()
                pages = connection.execute("SELECT id, session_id, book_id, page_number, completed_at FROM page_reads").fetchall()
                sentences = connection.execute("SELECT id, session_id, book_id, page_number, completed_at FROM sentence_reads").fetchall()
        except sqlite3.Error:
            continue

        for session_id, book_id, started_at in sessions:
            record_analytics_event(
                data_root,
                event_id=f"legacy-session:{profile_id}:{session_id}",
                event_name="reading_session_started",
                profile_id=profile_id,
                session_id=str(session_id),
                feature_key="reader",
                occurred_at=str(started_at),
                metadata={"book_id": str(book_id), "source": "legacy_profile"},
            )
        for page_id, session_id, book_id, page_number, completed_at in pages:
            record_analytics_event(
                data_root,
                event_id=f"legacy-page:{profile_id}:{page_id}",
                event_name="page_read",
                profile_id=profile_id,
                session_id=str(session_id),
                feature_key="reader",
                occurred_at=str(completed_at),
                metadata={"book_id": str(book_id), "page_number": int(page_number), "source": "legacy_profile"},
            )
        for sentence_id, session_id, book_id, page_number, completed_at in sentences:
            record_analytics_event(
                data_root,
                event_id=f"legacy-sentence:{profile_id}:{sentence_id}",
                event_name="sentence_read",
                profile_id=profile_id,
                session_id=str(session_id),
                feature_key="reader",
                occurred_at=str(completed_at),
                metadata={"book_id": str(book_id), "page_number": int(page_number), "source": "legacy_profile"},
            )

    for book in load_registry(resolve_books_root(data_root) / "registry.json").values():
        record_analytics_event(
            data_root,
            event_id=f"legacy-book:{book.id}",
            event_name="book_imported",
            account_id=book.owner_id,
            feature_key="book_import",
            occurred_at=book.created_at,
            metadata={"language_code": book.language_code, "source": "legacy_registry"},
        )
        if book.processed_at:
            record_analytics_event(
                data_root,
                event_id=f"legacy-book-ready:{book.id}",
                event_name="first_book_ready",
                account_id=book.owner_id,
                feature_key="book_import",
                occurred_at=book.processed_at,
                metadata={"language_code": book.language_code, "source": "legacy_registry"},
            )

    for feedback in list_feedback(data_root, limit=10000):
        record_analytics_event(
            data_root,
            event_id=f"legacy-feedback:{feedback.id}",
            event_name="feedback_submitted",
            account_id=feedback.user_id,
            feature_key="feedback",
            route=feedback.context.route,
            occurred_at=feedback.submitted_at,
            metadata={"language_code": feedback.context.language_code, "source": "legacy_feedback"},
        )


def _actor_key(event: dict[str, object]) -> str | None:
    account_id = event.get("account_id")
    profile_id = event.get("profile_id")
    return str(account_id or profile_id) if account_id or profile_id else None


def _percentage(value: int, denominator: int) -> float | None:
    return round(value / denominator * 100, 1) if denominator else None


def _pseudonym(actor_key: str) -> str:
    return f"user-{hashlib.sha256(actor_key.encode('utf-8')).hexdigest()[:8]}"


def _feature_role_breakdown(feature_events: list[dict[str, object]]) -> list[AnalyticsFeatureRoleUsage]:
    breakdown: list[AnalyticsFeatureRoleUsage] = []
    for role in ("member", "tester", "admin"):
        role_events = [event for event in feature_events if event.get("account_role") == role]
        if role_events:
            breakdown.append(
                AnalyticsFeatureRoleUsage(
                    role=role,
                    event_count=len(role_events),
                    user_count=len({_actor_key(event) for event in role_events if _actor_key(event)}),
                )
            )
    return breakdown


def _retention_cohorts(events_by_actor: dict[str, list[dict[str, object]]], today: date) -> list[AnalyticsRetentionCohort]:
    cohorts: dict[date, list[list[date]]] = defaultdict(list)
    for actor_events in events_by_actor.values():
        dates = sorted({event["occurred_at"].date() for event in actor_events if isinstance(event.get("occurred_at"), datetime)})
        if dates:
            cohorts[dates[0]].append(dates)

    result: list[AnalyticsRetentionCohort] = []
    for cohort_date in sorted(cohorts)[-14:]:
        date_sets = cohorts[cohort_date]
        size = len(date_sets)
        values: dict[int, int | None] = {}
        for offset in (1, 7, 30):
            target = cohort_date + timedelta(days=offset)
            values[offset] = sum(1 for dates in date_sets if any(value >= target for value in dates)) if target <= today else None
        result.append(
            AnalyticsRetentionCohort(
                cohort_date=cohort_date.isoformat(),
                cohort_size=size,
                returned_1d=values[1],
                returned_7d=values[7],
                returned_30d=values[30],
                returned_1d_rate=_percentage(values[1], size) if values[1] is not None else None,
                returned_7d_rate=_percentage(values[7], size) if values[7] is not None else None,
                returned_30d_rate=_percentage(values[30], size) if values[30] is not None else None,
            )
        )
    return result


def get_admin_analytics_overview(data_root: Path, *, window_days: int = ANALYTICS_WINDOW_DAYS) -> AdminAnalyticsOverview:
    now = _utc_now()
    _backfill_legacy_events(data_root)
    events = _load_events(data_root, window_days)
    events_by_actor: dict[str, list[dict[str, object]]] = defaultdict(list)
    for event in events:
        actor = _actor_key(event)
        if actor:
            events_by_actor[actor].append(event)

    usage = get_admin_usage_summary(data_root)
    active_users_7d = len({actor for actor, actor_events in events_by_actor.items() if any(event["occurred_at"] >= now - timedelta(days=7) for event in actor_events)})
    active_users_30d = len(events_by_actor)
    if not active_users_7d:
        active_users_7d = usage.active_profiles_7d
    if not active_users_30d:
        active_users_30d = usage.active_profiles_30d

    repeat_value_users = sum(
        1
        for actor_events in events_by_actor.values()
        if sum(1 for event in actor_events if event["event_name"] in VALUE_EVENTS) >= 2
        or len({event["occurred_at"].date() for event in actor_events}) >= 2
    )
    ai_feature_events = sum(1 for event in events if event["event_name"] in {"ai_feature_used", "practice_generated"})
    paywall_actors = {actor for actor, actor_events in events_by_actor.items() if any(event["event_name"] in PAYWALL_EVENTS for event in actor_events)}
    feedback_actors = {actor for actor, actor_events in events_by_actor.items() if any(event["event_name"] == "feedback_submitted" for event in actor_events)}

    stage_definitions = (
        ("activation", "Activation", ACTIVATION_EVENTS),
        ("first_value", "First value", VALUE_EVENTS),
        ("paywall_intent", "Paywall intent", PAYWALL_EVENTS),
        ("conversion", "Conversion", CONVERSION_EVENTS),
    )
    activation_users = {actor for actor, actor_events in events_by_actor.items() if any(event["event_name"] in ACTIVATION_EVENTS for event in actor_events)}
    funnel = [
        AnalyticsFunnelStage(
            key=key,
            label=label,
            users=len({actor for actor, actor_events in events_by_actor.items() if any(event["event_name"] in event_names for event in actor_events)}),
            rate=None,
            detail="No captured users yet.",
        )
        for key, label, event_names in stage_definitions
    ]
    repeat_stage = AnalyticsFunnelStage(
        key="repeat_value",
        label="Repeated value",
        users=repeat_value_users,
        rate=_percentage(repeat_value_users, len(activation_users)),
        detail="Users with repeated value activity or activity on multiple days.",
    )
    for stage in funnel:
        stage.rate = _percentage(stage.users, len(activation_users))
        stage.detail = f"{stage.users} unique user{'s' if stage.users != 1 else ''} in the last {window_days} days."
    funnel.insert(2, repeat_stage)

    feature_counts: dict[str, list[dict[str, object]]] = defaultdict(list)
    for event in events:
        feature_key = str(event.get("feature_key") or event["event_name"])
        feature_counts[feature_key].append(event)
    features = [
        AnalyticsFeatureUsage(
            feature_key=feature_key,
            event_count=len(feature_events),
            user_count=len({_actor_key(event) for event in feature_events if _actor_key(event)}),
            last_seen_at=max(event["occurred_at"] for event in feature_events).isoformat().replace("+00:00", "Z"),
            role_breakdown=_feature_role_breakdown(feature_events),
        )
        for feature_key, feature_events in sorted(feature_counts.items(), key=lambda item: len(item[1]), reverse=True)[:8]
    ]

    watchlist: list[AnalyticsWatchlistUser] = []
    for actor, actor_events in events_by_actor.items():
        value_count = sum(1 for event in actor_events if event["event_name"] in VALUE_EVENTS)
        active_days = len({event["occurred_at"].date() for event in actor_events})
        paywall_intent = any(event["event_name"] in PAYWALL_EVENTS for event in actor_events)
        repeated_value = value_count >= 2 or active_days >= 2
        if not (repeated_value or paywall_intent):
            continue
        last_seen = max(event["occurred_at"] for event in actor_events)
        watchlist.append(
            AnalyticsWatchlistUser(
                pseudonym=_pseudonym(actor),
                active_days=active_days,
                event_count=len(actor_events),
                repeated_value=repeated_value,
                paywall_intent=paywall_intent,
                last_seen_at=last_seen.isoformat().replace("+00:00", "Z"),
            )
        )
    watchlist.sort(key=lambda item: (item.paywall_intent, item.repeated_value, item.last_seen_at), reverse=True)

    sample_size = max(len(events_by_actor), usage.profile_count)
    note = (
        f"Directional analytics for {sample_size} recognized user{'s' if sample_size != 1 else ''}; rates are not statistically reliable below five users."
        if sample_size < 5
        else f"Analytics window covers the last {window_days} days and {sample_size} recognized users."
    )
    metrics = [
        AnalyticsMetric(key="active_users_7d", label="Active users (7d)", value=active_users_7d, detail="Unique users with recent activity."),
        AnalyticsMetric(key="active_users_30d", label="Active users (30d)", value=active_users_30d, detail="Unique users in the analytics window."),
        AnalyticsMetric(key="repeat_value_users", label="Repeated value", value=repeat_value_users, detail="Users with repeat value or multi-day activity."),
        AnalyticsMetric(key="ai_feature_events", label="AI feature uses", value=ai_feature_events, detail="Captured AI or generated-practice events."),
        AnalyticsMetric(key="paywall_intent_users", label="Paywall intent", value=len(paywall_actors), detail="Users who reached a paywall or unlock signal."),
        AnalyticsMetric(key="feedback_users", label="Feedback users", value=len(feedback_actors), detail="Users who submitted product feedback."),
    ]

    return AdminAnalyticsOverview(
        generated_at=now.isoformat().replace("+00:00", "Z"),
        window_days=window_days,
        event_count=len(events),
        sample_size=sample_size,
        note=note,
        metrics=metrics,
        funnel=funnel,
        features=features,
        retention=_retention_cohorts(events_by_actor, now.date()),
        watchlist=watchlist[:12],
    )
