CREATE TABLE IF NOT EXISTS analytics_events (
    event_id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    account_id TEXT,
    profile_id TEXT,
    session_id TEXT,
    route TEXT,
    feature_key TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at
    ON analytics_events(occurred_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_occurred_at
    ON analytics_events(event_name, occurred_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_account_occurred_at
    ON analytics_events(account_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_profile_occurred_at
    ON analytics_events(profile_id, occurred_at);
