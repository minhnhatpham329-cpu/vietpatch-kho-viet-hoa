CREATE TABLE IF NOT EXISTS vietpatch_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vietpatch_users_created_idx
    ON vietpatch_users (created_at DESC);

CREATE TABLE IF NOT EXISTS vietpatch_entitlements (
    user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS vietpatch_entitlements_user_idx
    ON vietpatch_entitlements (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vietpatch_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_key TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    game_id TEXT,
    balance_after INTEGER NOT NULL DEFAULT 0,
    applied_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS vietpatch_transactions_user_created_idx
    ON vietpatch_transactions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vietpatch_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    memo TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
    item_type TEXT NOT NULL CHECK (item_type IN ('purchase', 'deposit')),
    game_id TEXT,
    item_title TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'vietqr',
    provider_transaction_id TEXT UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    paid_at TEXT,
    applied_at TEXT
);

CREATE INDEX IF NOT EXISTS vietpatch_orders_user_created_idx
    ON vietpatch_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vietpatch_orders_status_created_idx
    ON vietpatch_orders (status, created_at DESC);

CREATE TABLE IF NOT EXISTS vietpatch_wallet_claims (
    user_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    applied_at TEXT,
    PRIMARY KEY (user_id, game_id)
);

CREATE TABLE IF NOT EXISTS vietpatch_auth_attempts (
    identity_hash TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_started_at INTEGER NOT NULL,
    blocked_until INTEGER NOT NULL DEFAULT 0
);
