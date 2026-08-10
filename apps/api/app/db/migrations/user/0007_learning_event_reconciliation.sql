CREATE TABLE IF NOT EXISTS learning_event_reconciliation (
    event_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'uploading', 'retry_scheduled', 'synced', 'hydrated', 'conflict')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT,
    next_attempt_at TEXT,
    last_checked_at TEXT NOT NULL,
    last_error TEXT,
    detail TEXT
);

CREATE INDEX IF NOT EXISTS learning_event_reconciliation_status_idx
    ON learning_event_reconciliation (status, next_attempt_at, last_checked_at);
