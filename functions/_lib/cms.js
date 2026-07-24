import cmsSeed from "../../cms-seed.json";
import { checksum, ensureSchema, writeAudit } from "./db.js";
import { httpError } from "./http.js";

const DOCUMENT_KEY = "main";
const BASE_PRICES = {
    wukong: 120000,
    eldenring: 0,
    cyberpunk: 90000,
    residentevil4: 80000,
    liesofp: 0,
    hogwarts: 0,
    stray: 0,
    witcher3: 0,
    baldursgate3: 120000,
    subnautica: 0,
    rust: 0,
    sekiro: 0,
    rdr2: 100000,
    ghost: 110000
};

function plainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanTree(value, depth = 0) {
    if (depth > 8) return null;
    if (value == null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
        return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, 250000);
    }
    if (Array.isArray(value)) return value.slice(0, 1000).map(item => cleanTree(item, depth + 1));
    if (typeof value === "object") {
        const output = {};
        for (const [key, child] of Object.entries(value).slice(0, 1000)) {
            if (["__proto__", "constructor", "prototype"].includes(key)) continue;
            output[String(key).slice(0, 100)] = cleanTree(child, depth + 1);
        }
        return output;
    }
    return null;
}

export function normalizeCmsState(input) {
    const source = plainObject(cleanTree(input));
    const state = {
        version: 1,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
        site: plainObject(source.site),
        trailers: Array.isArray(source.trailers) ? source.trailers.slice(0, 60) : [],
        posts: Array.isArray(source.posts) ? source.posts.slice(0, 200) : [],
        requests: Array.isArray(source.requests) ? source.requests.slice(0, 300) : [],
        hiddenGameIds: Array.isArray(source.hiddenGameIds) ? source.hiddenGameIds.slice(0, 1000) : [],
        customGames: Array.isArray(source.customGames) ? source.customGames.slice(0, 1000) : [],
        gameOverrides: plainObject(source.gameOverrides)
    };
    const encoded = JSON.stringify(state);
    if (new TextEncoder().encode(encoded).byteLength > 6 * 1024 * 1024) {
        throw httpError(413, "CMS_STATE_TOO_LARGE");
    }
    return state;
}

function parseState(value) {
    try {
        return normalizeCmsState(JSON.parse(value));
    } catch {
        return normalizeCmsState(cmsSeed);
    }
}

async function initializeDocument(env) {
    await ensureSchema(env);
    const existing = await env.DB.prepare(
        "SELECT document_key FROM cms_documents WHERE document_key = ?"
    ).bind(DOCUMENT_KEY).first();
    if (existing) return;

    const now = new Date().toISOString();
    const state = normalizeCmsState(cmsSeed);
    state.updatedAt = now;
    const encoded = JSON.stringify(state);
    await env.DB.batch([
        env.DB.prepare(
            `INSERT OR IGNORE INTO cms_documents
                (document_key, draft_json, published_json, draft_version, published_version,
                 updated_at, published_at, updated_by)
             VALUES (?, ?, ?, 1, 1, ?, ?, 'system')`
        ).bind(DOCUMENT_KEY, encoded, encoded, now, now),
        env.DB.prepare(
            `INSERT INTO cms_revisions
                (document_key, revision_type, version, data_json, checksum, actor, note, created_at)
             VALUES (?, 'published', 1, ?, ?, 'system', 'Khởi tạo dữ liệu', ?)`
        ).bind(DOCUMENT_KEY, encoded, await checksum(encoded), now)
    ]);
}

export async function getCmsDocument(env) {
    await initializeDocument(env);
    const row = await env.DB.prepare(
        `SELECT draft_json, published_json, draft_version, published_version,
                updated_at, published_at, updated_by
         FROM cms_documents WHERE document_key = ?`
    ).bind(DOCUMENT_KEY).first();
    if (!row) throw httpError(500, "CMS_DOCUMENT_MISSING");
    return {
        draft: parseState(row.draft_json),
        published: parseState(row.published_json),
        draftVersion: Number(row.draft_version),
        publishedVersion: Number(row.published_version),
        updatedAt: row.updated_at,
        publishedAt: row.published_at,
        updatedBy: row.updated_by
    };
}

export function publicCmsState(input) {
    const state = structuredClone(normalizeCmsState(input));
    state.customGames = state.customGames.map(game => {
        const price = Math.max(0, Math.round(Number(game.price) || 0));
        if (price > 0 && game.downloadUrl) {
            game.downloadUrl = `/api/vietpatch/download/${encodeURIComponent(game.id)}`;
        }
        return game;
    });
    for (const [gameId, override] of Object.entries(state.gameOverrides)) {
        const price = override.price === "" || override.price == null
            ? (BASE_PRICES[gameId] || 0)
            : Math.max(0, Math.round(Number(override.price) || 0));
        if (price > 0 && override.downloadUrl) {
            override.downloadUrl = `/api/vietpatch/download/${encodeURIComponent(gameId)}`;
        }
    }
    return state;
}

export function cmsMeta(document) {
    return {
        draftVersion: document.draftVersion,
        publishedVersion: document.publishedVersion,
        dirty: document.draftVersion !== document.publishedVersion,
        updatedAt: document.updatedAt,
        publishedAt: document.publishedAt,
        updatedBy: document.updatedBy
    };
}

export async function saveDraft(env, input, expectedVersion, actor) {
    const document = await getCmsDocument(env);
    if (Number(expectedVersion) !== document.draftVersion) {
        const error = httpError(409, "CMS_VERSION_CONFLICT");
        error.current = document;
        throw error;
    }

    const state = normalizeCmsState(input);
    const now = new Date().toISOString();
    state.updatedAt = now;
    const encoded = JSON.stringify(state);
    const nextVersion = document.draftVersion + 1;
    const result = await env.DB.prepare(
        `UPDATE cms_documents
         SET draft_json = ?, draft_version = ?, updated_at = ?, updated_by = ?
         WHERE document_key = ? AND draft_version = ?`
    ).bind(encoded, nextVersion, now, actor, DOCUMENT_KEY, document.draftVersion).run();
    if (!result.meta?.changes) throw httpError(409, "CMS_VERSION_CONFLICT");

    await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO cms_revisions
                (document_key, revision_type, version, data_json, checksum, actor, note, created_at)
             VALUES (?, 'draft', ?, ?, ?, ?, 'Lưu bản nháp', ?)`
        ).bind(DOCUMENT_KEY, nextVersion, encoded, await checksum(encoded), actor, now),
        env.DB.prepare(
            `DELETE FROM cms_revisions WHERE id IN (
                SELECT id FROM cms_revisions
                WHERE document_key = ?
                ORDER BY created_at DESC
                LIMIT -1 OFFSET 80
             )`
        ).bind(DOCUMENT_KEY)
    ]);
    await writeAudit(env, "cms.draft.saved", actor, { version: nextVersion });
    return getCmsDocument(env);
}

export async function publishDraft(env, actor, note = "") {
    const document = await getCmsDocument(env);
    const now = new Date().toISOString();
    const nextVersion = document.draftVersion;
    const encoded = JSON.stringify(document.draft);
    await env.DB.batch([
        env.DB.prepare(
            `UPDATE cms_documents
             SET published_json = draft_json, published_version = draft_version,
                 published_at = ?, updated_by = ?
             WHERE document_key = ?`
        ).bind(now, actor, DOCUMENT_KEY),
        env.DB.prepare(
            `INSERT INTO cms_revisions
                (document_key, revision_type, version, data_json, checksum, actor, note, created_at)
             VALUES (?, 'published', ?, ?, ?, ?, ?, ?)`
        ).bind(
            DOCUMENT_KEY,
            nextVersion,
            encoded,
            await checksum(encoded),
            actor,
            String(note || "Xuất bản nội dung").slice(0, 300),
            now
        )
    ]);
    await writeAudit(env, "cms.published", actor, { version: nextVersion });
    return getCmsDocument(env);
}

export async function listRevisions(env, limit = 30) {
    await initializeDocument(env);
    const safeLimit = Math.max(1, Math.min(80, Number(limit) || 30));
    const result = await env.DB.prepare(
        `SELECT id, revision_type, version, checksum, actor, note, created_at
         FROM cms_revisions
         WHERE document_key = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`
    ).bind(DOCUMENT_KEY, safeLimit).all();
    return result.results || [];
}

export async function restoreRevision(env, revisionId, actor) {
    await initializeDocument(env);
    const revision = await env.DB.prepare(
        `SELECT id, data_json, version FROM cms_revisions
         WHERE document_key = ? AND id = ?`
    ).bind(DOCUMENT_KEY, Number(revisionId)).first();
    if (!revision) throw httpError(404, "REVISION_NOT_FOUND");

    const document = await getCmsDocument(env);
    const state = parseState(revision.data_json);
    const now = new Date().toISOString();
    state.updatedAt = now;
    const encoded = JSON.stringify(state);
    const nextVersion = document.draftVersion + 1;
    await env.DB.batch([
        env.DB.prepare(
            `UPDATE cms_documents
             SET draft_json = ?, draft_version = ?, updated_at = ?, updated_by = ?
             WHERE document_key = ?`
        ).bind(encoded, nextVersion, now, actor, DOCUMENT_KEY),
        env.DB.prepare(
            `INSERT INTO cms_revisions
                (document_key, revision_type, version, data_json, checksum, actor, note, created_at)
             VALUES (?, 'restored', ?, ?, ?, ?, ?, ?)`
        ).bind(
            DOCUMENT_KEY,
            nextVersion,
            encoded,
            await checksum(encoded),
            actor,
            `Khôi phục từ bản #${revision.id}`,
            now
        )
    ]);
    await writeAudit(env, "cms.revision.restored", actor, {
        revisionId: Number(revision.id),
        sourceVersion: Number(revision.version),
        draftVersion: nextVersion
    });
    return getCmsDocument(env);
}

export async function exportBackup(env) {
    const document = await getCmsDocument(env);
    const revisions = await listRevisions(env, 80);
    return {
        format: "vietpatch-cms-backup-v2",
        exportedAt: new Date().toISOString(),
        draft: document.draft,
        published: document.published,
        meta: cmsMeta(document),
        revisions
    };
}
