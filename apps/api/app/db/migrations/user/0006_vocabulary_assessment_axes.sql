CREATE TABLE IF NOT EXISTS vocabulary_assessment_axes (
    language_code TEXT NOT NULL,
    lemma TEXT NOT NULL,
    axis_key TEXT NOT NULL,
    prompt_type TEXT NOT NULL,
    response_type TEXT NOT NULL,
    stage INTEGER NOT NULL DEFAULT 0,
    due_at TEXT,
    last_seen_at TEXT,
    last_result TEXT,
    pass_count INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(language_code, lemma, axis_key)
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_assessment_axes_due_at
    ON vocabulary_assessment_axes(language_code, due_at);
