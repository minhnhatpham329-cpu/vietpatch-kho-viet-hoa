CREATE TABLE IF NOT EXISTS vietpatch_game_stats (
    game_id TEXT PRIMARY KEY,
    view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vietpatch_metric_events (
    event_key TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'download')),
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vietpatch_metric_events_expiry_idx
    ON vietpatch_metric_events (expires_at);

CREATE TABLE IF NOT EXISTS vietpatch_game_reviews (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username_snapshot TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published'
        CHECK (status IN ('published', 'hidden')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS vietpatch_reviews_game_status_idx
    ON vietpatch_game_reviews (game_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS vietpatch_update_reports (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username_snapshot TEXT NOT NULL,
    reported_version TEXT NOT NULL,
    source_url TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'verified', 'dismissed')),
    admin_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vietpatch_reports_status_created_idx
    ON vietpatch_update_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS vietpatch_reports_game_idx
    ON vietpatch_update_reports (game_id, created_at DESC);
