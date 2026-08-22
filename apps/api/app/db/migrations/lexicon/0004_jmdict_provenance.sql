CREATE TABLE IF NOT EXISTS lexicon_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    version TEXT NOT NULL,
    source_url TEXT NOT NULL,
    license_url TEXT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    attribution_text TEXT NOT NULL,
    retrieved_at TEXT NOT NULL,
    source_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jmdict_entries (
    source_id INTEGER NOT NULL,
    ent_seq INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    PRIMARY KEY (source_id, ent_seq),
    FOREIGN KEY (source_id) REFERENCES lexicon_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jmdict_entries_source_seq
    ON jmdict_entries(source_id, ent_seq);
