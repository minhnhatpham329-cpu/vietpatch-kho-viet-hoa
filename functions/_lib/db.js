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
