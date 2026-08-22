CREATE TABLE IF NOT EXISTS book_progress (
    book_id TEXT PRIMARY KEY,
    reading_sessions INTEGER DEFAULT 0,
    page_reads INTEGER DEFAULT 0,
    sentence_reads INTEGER DEFAULT 0,
    active_seconds INTEGER DEFAULT 0,
    furthest_page INTEGER DEFAULT 0,
    resume_page INTEGER DEFAULT 0,
    resume_sentence_order INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 0,
    total_sentences INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    progress_unit TEXT NOT NULL DEFAULT 'pages',
    reading_state TEXT NOT NULL DEFAULT 'not_read',
    last_read_at TEXT,
    completed_at TEXT,
    completion_override INTEGER NOT NULL DEFAULT 0
);
