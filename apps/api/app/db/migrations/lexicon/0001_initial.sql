CREATE TABLE lexicon_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    language_code TEXT NOT NULL,
    entry_type TEXT NOT NULL,
    surface_form TEXT NOT NULL,
    pinyin TEXT,
    tone INTEGER,
    definition TEXT,
    radical TEXT,
    stroke_count INTEGER,
    hsk_level TEXT,
    frequency_rank INTEGER,
    note TEXT,
    source_name TEXT,
    source_path TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(language_code, entry_type, surface_form)
);

CREATE INDEX idx_lexicon_entries_lookup
    ON lexicon_entries(language_code, surface_form, entry_type);
