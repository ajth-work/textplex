CREATE TABLE IF NOT EXISTS commerce_checkout_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('theme', 'bundle')),
    product_id TEXT NOT NULL,
    theme_ids TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'refunded')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'refunded')),
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS commerce_theme_grants (
    session_id TEXT NOT NULL,
    theme_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    granted_at TEXT NOT NULL,
    revoked_at TEXT,
    PRIMARY KEY(session_id, theme_id),
    FOREIGN KEY(session_id) REFERENCES commerce_checkout_sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS commerce_events (
    event_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    FOREIGN KEY(session_id) REFERENCES commerce_checkout_sessions(session_id) ON DELETE CASCADE
);
