CREATE TABLE IF NOT EXISTS google_translate_monthly_usage (
    month_key TEXT PRIMARY KEY,
    request_count INTEGER NOT NULL DEFAULT 0,
    character_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
