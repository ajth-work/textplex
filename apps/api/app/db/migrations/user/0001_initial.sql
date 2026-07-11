CREATE TABLE IF NOT EXISTS reading_sessions (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    active_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS page_reads (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    active_seconds INTEGER NOT NULL,
    estimated_seconds INTEGER NOT NULL,
    completion_ratio REAL NOT NULL,
    counted_as_read INTEGER NOT NULL,
    completed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sentence_reads (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    sentence_order INTEGER NOT NULL,
    sentence_text TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    character_count INTEGER NOT NULL,
    active_seconds INTEGER NOT NULL,
    completed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS token_exposures (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    sentence_order INTEGER NOT NULL,
    token_kind TEXT NOT NULL,
    surface_form TEXT NOT NULL,
    normalized_form TEXT NOT NULL,
    character_count INTEGER NOT NULL,
    active_seconds INTEGER NOT NULL,
    occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS word_interactions (
    id INTEGER PRIMARY KEY,
    book_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    language_code TEXT NOT NULL,
    lemma TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exposure_ledger (
    id INTEGER PRIMARY KEY,
    language_code TEXT NOT NULL,
    lemma TEXT NOT NULL,
    book_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    exposure_type TEXT NOT NULL,
    weight REAL NOT NULL,
    occurred_at TEXT NOT NULL,
    UNIQUE(language_code, lemma, book_id, page_number, exposure_type)
);

CREATE TABLE IF NOT EXISTS vocabulary_progress (
    language_code TEXT NOT NULL,
    lemma TEXT NOT NULL,
    raw_exposures INTEGER DEFAULT 0,
    weighted_exposure REAL DEFAULT 0,
    unique_pages INTEGER DEFAULT 0,
    unique_books INTEGER DEFAULT 0,
    help_requests INTEGER DEFAULT 0,
    first_seen_at TEXT,
    last_seen_at TEXT,
    state TEXT NOT NULL,
    confidence_score REAL NOT NULL,
    manual_override TEXT,
    PRIMARY KEY(language_code, lemma)
);
