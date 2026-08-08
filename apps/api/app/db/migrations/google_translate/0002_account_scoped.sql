CREATE TABLE IF NOT EXISTS google_translate_account_monthly_usage (
    owner_id TEXT NOT NULL,
    month_key TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    character_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (owner_id, month_key)
);
