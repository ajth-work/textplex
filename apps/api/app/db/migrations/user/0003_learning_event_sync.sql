CREATE TABLE IF NOT EXISTS learning_event_outbox (
    event_id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    book_id TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    payload TEXT NOT NULL,
    synced_at TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE TABLE IF NOT EXISTS learning_event_receipts (
    event_id TEXT PRIMARY KEY,
    received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_attempt_at TEXT,
    last_success_at TEXT,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    conflict_count INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO learning_sync_state (id) VALUES (1);
