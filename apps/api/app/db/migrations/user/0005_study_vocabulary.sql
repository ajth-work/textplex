CREATE TABLE IF NOT EXISTS study_vocabulary_items (
    language_code TEXT NOT NULL,
    lemma TEXT NOT NULL,
    display_form TEXT NOT NULL,
    source_book_id TEXT NOT NULL,
    source_page_number INTEGER NOT NULL,
    source_sentence_order INTEGER NOT NULL,
    source_token_order INTEGER NOT NULL,
    source_surface_form TEXT NOT NULL,
    source_sentence_text TEXT NOT NULL,
    pronunciation TEXT,
    romanization TEXT,
    definition_short TEXT,
    proficiency_level TEXT,
    click_count INTEGER NOT NULL DEFAULT 1,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    PRIMARY KEY(language_code, lemma)
);
