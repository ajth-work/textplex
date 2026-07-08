CREATE TABLE books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    language_code TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    source_sha256 TEXT NOT NULL,
    total_pages INTEGER,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    processed_at TEXT
);

CREATE TABLE pages (
    id INTEGER PRIMARY KEY,
    book_id TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    raw_text TEXT,
    clean_text TEXT,
    word_count INTEGER DEFAULT 0,
    sentence_count INTEGER DEFAULT 0,
    processing_status TEXT NOT NULL,
    estimated_read_seconds INTEGER,
    UNIQUE(book_id, page_number)
);

CREATE TABLE sentences (
    id INTEGER PRIMARY KEY,
    page_id INTEGER NOT NULL,
    sentence_order INTEGER NOT NULL,
    text TEXT NOT NULL,
    normalized_text TEXT,
    translation TEXT,
    difficulty_score REAL,
    UNIQUE(page_id, sentence_order)
);

CREATE TABLE lexical_entries (
    id INTEGER PRIMARY KEY,
    language_code TEXT NOT NULL,
    lemma TEXT NOT NULL,
    display_form TEXT NOT NULL,
    part_of_speech TEXT,
    pronunciation TEXT,
    romanization TEXT,
    definition_short TEXT,
    frequency_in_book INTEGER DEFAULT 0,
    first_page INTEGER,
    last_page INTEGER,
    proficiency_system TEXT,
    proficiency_level TEXT,
    is_name INTEGER DEFAULT 0,
    is_location INTEGER DEFAULT 0,
    external_lexicon_key TEXT,
    UNIQUE(language_code, lemma, part_of_speech)
);

CREATE TABLE token_occurrences (
    id INTEGER PRIMARY KEY,
    page_id INTEGER NOT NULL,
    sentence_id INTEGER,
    lexical_entry_id INTEGER,
    token_order INTEGER NOT NULL,
    surface_form TEXT NOT NULL,
    normalized_form TEXT,
    bbox_x REAL,
    bbox_y REAL,
    bbox_w REAL,
    bbox_h REAL,
    context_before TEXT,
    context_after TEXT
);

CREATE TABLE grammar_patterns (
    id INTEGER PRIMARY KEY,
    canonical_pattern TEXT NOT NULL,
    explanation TEXT,
    proficiency_system TEXT,
    proficiency_level TEXT,
    frequency_in_book INTEGER DEFAULT 0
);

CREATE TABLE grammar_occurrences (
    id INTEGER PRIMARY KEY,
    grammar_pattern_id INTEGER NOT NULL,
    page_id INTEGER NOT NULL,
    sentence_id INTEGER,
    surface_text TEXT NOT NULL
);

CREATE TABLE entities (
    id INTEGER PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    aliases_json TEXT,
    frequency_in_book INTEGER DEFAULT 0,
    first_page INTEGER,
    last_page INTEGER,
    importance_score REAL,
    summary TEXT
);

CREATE TABLE entity_occurrences (
    id INTEGER PRIMARY KEY,
    entity_id INTEGER NOT NULL,
    page_id INTEGER NOT NULL,
    sentence_id INTEGER,
    surface_text TEXT NOT NULL
);

CREATE TABLE processing_logs (
    id INTEGER PRIMARY KEY,
    scope_type TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    status TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    input_units INTEGER,
    output_units INTEGER,
    estimated_cost_usd REAL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    error_message TEXT
);
