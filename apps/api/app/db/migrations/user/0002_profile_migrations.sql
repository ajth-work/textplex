CREATE TABLE IF NOT EXISTS profile_migrations (
    source_profile_key TEXT PRIMARY KEY,
    source_fingerprint TEXT NOT NULL,
    status TEXT NOT NULL,
    imported_at TEXT NOT NULL
);
