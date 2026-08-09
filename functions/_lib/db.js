import { httpError } from "./http.js";

let schemaReady = null;

const SCHEMA_STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS cms_documents (
        document_key TEXT PRIMARY KEY,
        draft_json TEXT NOT NULL,
        published_json TEXT NOT NULL,
        draft_version INTEGER NOT NULL DEFAULT 1,
        published_version INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        published_at TEXT NOT NULL,
        updated_by TEXT NOT NULL DEFAULT 'system'
    )`,
    `CREATE TABLE IF NOT EXISTS cms_revisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_key TEXT NOT NULL,
        revision_type TEXT NOT NULL CHECK (revision_type IN ('draft', 'published', 'restored')),
        version INTEGER NOT NULL,
        data_json TEXT NOT NULL,
        checksum TEXT NOT NULL,
        actor TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS cms_revisions_document_created_idx
        ON cms_revisions (document_key, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS admin_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        detail_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS admin_audit_created_idx
        ON admin_audit_log (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS admin_login_attempts (
        identity_hash TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        window_started_at INTEGER NOT NULL,
        blocked_until INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS vietpatch_users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS vietpatch_users_created_idx
        ON vietpatch_users (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS vietpatch_entitlements (
        user_id TEXT NOT NULL,
        game_id TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, game_id)
    )`,
    `CREATE INDEX IF NOT EXISTS vietpatch_entitlements_user_idx
        ON vietpatch_entitlements (user_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS vietpatch_transactions (
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
    )`,
    `CREATE INDEX IF NOT EXISTS vietpatch_transactions_user_created_idx
        ON vietpatch_transactions (user_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS vietpatch_orders (
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
    )`,
    `CREATE INDEX IF NOT EXISTS vietpatch_orders_user_created_idx
        ON vietpatch_orders (user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS vietpatch_orders_status_created_idx
        ON vietpatch_orders (status, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS vietpatch_wallet_claims (
        user_id TEXT NOT NULL,
        game_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        applied_at TEXT,
        PRIMARY KEY (user_id, game_id)
    )`,
    `CREATE TABLE IF NOT EXISTS vietpatch_auth_attempts (
        identity_hash TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        window_started_at INTEGER NOT NULL,
        blocked_until INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS vietpatch_oauth_identities (
        provider TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (provider, provider_user_id),
        UNIQUE (provider, user_id)
    )`,
    `CREATE INDEX IF NOT EXISTS vietpatch_oauth_user_idx
        ON vietpatch_oauth_identities (user_id)`,
    `CREATE TABLE IF NOT EXISTS vietpatch_rate_limits (
        rate_key TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        window_started_at INTEGER NOT NULL,
        blocked_until INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS vietpatch_game_stats (
        game_id TEXT PRIMARY KEY,
        view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
        download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
        updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS vietpatch_metric_events (
        event_key TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('view', 'download')),
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS vietpatch_metric_events_expiry_idx
        ON vietpatch_metric_events (expires_at)`,
    `CREATE TABLE IF NOT EXISTS vietpatch_game_reviews (
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
    )`,
    `CREATE INDEX IF NOT EXISTS vietpatch_reviews_game_status_idx
        ON vietpatch_game_reviews (game_id, status, updated_at DESC)`,
    `CREATE TABLE IF NOT EXISTS vietpatch_update_reports (
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
    )`,
    `CREATE INDEX IF NOT EXISTS vietpatch_reports_status_created_idx
        ON vietpatch_update_reports (status, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS vietpatch_reports_game_idx
        ON vietpatch_update_reports (game_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS vietpatch_traffic_visitors (
        visit_date TEXT NOT NULL,
        visitor_hash TEXT NOT NULL,
        page_views INTEGER NOT NULL DEFAULT 0 CHECK (page_views >= 0),
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        PRIMARY KEY (visit_date, visitor_hash)
    )`,
    `CREATE TABLE IF NOT EXISTS vietpatch_traffic_daily (
        visit_date TEXT PRIMARY KEY,
        unique_visitors INTEGER NOT NULL DEFAULT 0 CHECK (unique_visitors >= 0),
        page_views INTEGER NOT NULL DEFAULT 0 CHECK (page_views >= 0),
        updated_at TEXT NOT NULL
    )`
];

export async function ensureSchema(env) {
    if (!env.DB) throw httpError(503, "CMS_DATABASE_NOT_CONFIGURED");
    if (!schemaReady) {
        schemaReady = env.DB.batch(SCHEMA_STATEMENTS.map(statement => env.DB.prepare(statement)))
            .catch(error => {
                schemaReady = null;
                throw error;
            });
    }
    await schemaReady;
}

export async function checksum(value) {
    const bytes = new TextEncoder().encode(String(value));
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function writeAudit(env, action, actor, detail = {}) {
    await ensureSchema(env);
    await env.DB.prepare(
        `INSERT INTO admin_audit_log (action, actor, detail_json, created_at)
         VALUES (?, ?, ?, ?)`
    ).bind(
        String(action).slice(0, 80),
        String(actor).slice(0, 120),
        JSON.stringify(detail).slice(0, 20000),
        new Date().toISOString()
    ).run();
}

export async function checkLoginLimit(env, identityHash) {
    await ensureSchema(env);
    const now = Date.now();
    const row = await env.DB.prepare(
        `SELECT attempts, window_started_at, blocked_until
         FROM admin_login_attempts WHERE identity_hash = ?`
    ).bind(identityHash).first();
    if (!row) return { allowed: true, retryAfter: 0 };
    if (Number(row.blocked_until) > now) {
        return { allowed: false, retryAfter: Math.ceil((Number(row.blocked_until) - now) / 1000) };
    }
    if (now - Number(row.window_started_at) > 15 * 60 * 1000) {
        await env.DB.prepare("DELETE FROM admin_login_attempts WHERE identity_hash = ?")
            .bind(identityHash).run();
        return { allowed: true, retryAfter: 0 };
    }
    return { allowed: true, retryAfter: 0 };
}

export async function recordLoginFailure(env, identityHash) {
    await ensureSchema(env);
    const now = Date.now();
    const current = await env.DB.prepare(
        `SELECT attempts, window_started_at FROM admin_login_attempts WHERE identity_hash = ?`
    ).bind(identityHash).first();
    const sameWindow = current && now - Number(current.window_started_at) <= 15 * 60 * 1000;
    const attempts = sameWindow ? Number(current.attempts) + 1 : 1;
    const windowStartedAt = sameWindow ? Number(current.window_started_at) : now;
    const blockedUntil = attempts >= 8 ? now + 15 * 60 * 1000 : 0;
    await env.DB.prepare(
        `INSERT INTO admin_login_attempts
            (identity_hash, attempts, window_started_at, blocked_until)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(identity_hash) DO UPDATE SET
            attempts = excluded.attempts,
            window_started_at = excluded.window_started_at,
            blocked_until = excluded.blocked_until`
    ).bind(identityHash, attempts, windowStartedAt, blockedUntil).run();
    return { attempts, blockedUntil };
}

export async function clearLoginFailures(env, identityHash) {
    await ensureSchema(env);
    await env.DB.prepare("DELETE FROM admin_login_attempts WHERE identity_hash = ?")
        .bind(identityHash).run();
}
