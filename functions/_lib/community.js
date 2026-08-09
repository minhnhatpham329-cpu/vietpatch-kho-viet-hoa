import { resolvePublishedOffer, sanitizeGameId } from "./cms.js";
import { checksum, ensureSchema, writeAudit } from "./db.js";
import {
    assertSameOrigin,
    clientFingerprint,
    httpError
} from "./http.js";
import { consumeRateLimit } from "./user-auth.js";
import {
    getRequestAccount,
    hasEntitlement,
    requireAccount
} from "./vietpatch-store.js";

const REVIEW_LIMIT = 30;

function nowIso() {
    return new Date().toISOString();
}

function cleanText(value, maxLength) {
    return String(value || "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}

function safeHttpsUrl(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    try {
        const url = new URL(text);
        if (url.protocol !== "https:") return "";
        const host = url.hostname.toLowerCase();
        if (
            !host
            || host === "localhost"
            || host.endsWith(".local")
            || host === "::1"
            || /^(?:0|10|127)\./.test(host)
            || /^192\.168\./.test(host)
            || /^169\.254\./.test(host)
        ) return "";
        return url.toString().slice(0, 600);
    } catch {
        return "";
    }
}

function requireGameId(value) {
    const gameId = sanitizeGameId(value);
    if (!gameId) throw httpError(400, "INVALID_GAME_ID");
    return gameId;
}

async function requirePublishedGame(env, value) {
    const gameId = requireGameId(value);
    const offer = await resolvePublishedOffer(env, gameId);
    if (!offer) throw httpError(404, "GAME_NOT_FOUND");
    return gameId;
}

function reviewFromRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        gameId: row.game_id,
        username: row.username_snapshot,
        rating: Number(row.rating) || 0,
        body: row.body,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function reportFromRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        gameId: row.game_id,
        username: row.username_snapshot,
        reportedVersion: row.reported_version,
        sourceUrl: row.source_url || "",
        note: row.note,
        status: row.status,
        adminNote: row.admin_note || "",
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

export async function getGameStats(env, gameIdValue) {
    await ensureSchema(env);
    const gameId = await requirePublishedGame(env, gameIdValue);
    const [statsResult, reviewResult] = await env.DB.batch([
        env.DB.prepare(
            `SELECT view_count, download_count, updated_at
             FROM vietpatch_game_stats WHERE game_id = ?`
        ).bind(gameId),
        env.DB.prepare(
            `SELECT COUNT(*) AS review_count, ROUND(AVG(rating), 1) AS rating_average
             FROM vietpatch_game_reviews
             WHERE game_id = ? AND status = 'published'`
        ).bind(gameId)
    ]);
    const stats = statsResult.results?.[0] || {};
    const reviews = reviewResult.results?.[0] || {};
    return {
        gameId,
        views: Math.max(0, Number(stats.view_count) || 0),
        downloads: Math.max(0, Number(stats.download_count) || 0),
        reviewCount: Math.max(0, Number(reviews.review_count) || 0),
        ratingAverage: Math.max(0, Number(reviews.rating_average) || 0),
        updatedAt: stats.updated_at || null
    };
}

export async function listPublicGameStats(env) {
    await ensureSchema(env);
    const result = await env.DB.prepare(
        `WITH game_ids AS (
            SELECT game_id FROM vietpatch_game_stats
            UNION
            SELECT game_id FROM vietpatch_game_reviews WHERE status = 'published'
        )
        SELECT game_ids.game_id,
               COALESCE(stats.view_count, 0) AS view_count,
               COALESCE(stats.download_count, 0) AS download_count,
               COUNT(reviews.id) AS review_count,
               ROUND(AVG(reviews.rating), 1) AS rating_average
        FROM game_ids
        LEFT JOIN vietpatch_game_stats stats ON stats.game_id = game_ids.game_id
        LEFT JOIN vietpatch_game_reviews reviews
               ON reviews.game_id = game_ids.game_id AND reviews.status = 'published'
        GROUP BY game_ids.game_id, stats.view_count, stats.download_count`
    ).all();
    const stats = {};
    for (const row of result.results || []) {
        stats[row.game_id] = {
            gameId: row.game_id,
            views: Math.max(0, Number(row.view_count) || 0),
            downloads: Math.max(0, Number(row.download_count) || 0),
            reviewCount: Math.max(0, Number(row.review_count) || 0),
            ratingAverage: Math.max(0, Number(row.rating_average) || 0)
        };
    }
    return stats;
}

async function recordMetric(env, request, gameIdValue, eventType, identity, dedupeMs) {
    await ensureSchema(env);
    const gameId = await requirePublishedGame(env, gameIdValue);
    const now = Date.now();
    const bucket = Math.floor(now / dedupeMs);
    const eventKey = await checksum([
        "vietpatch-metric-v1",
        eventType,
        gameId,
        String(identity || "guest"),
        clientFingerprint(request),
        bucket
    ].join("|"));
    const insert = await env.DB.prepare(
        `INSERT OR IGNORE INTO vietpatch_metric_events
            (event_key, game_id, event_type, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`
    ).bind(eventKey, gameId, eventType, now + dedupeMs * 2, nowIso()).run();

    if (Number(insert.meta?.changes) > 0) {
        const column = eventType === "download" ? "download_count" : "view_count";
        const currentTime = nowIso();
        await env.DB.prepare(
            `INSERT INTO vietpatch_game_stats (game_id, view_count, download_count, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(game_id) DO UPDATE SET
                ${column} = ${column} + 1,
                updated_at = excluded.updated_at`
        ).bind(
            gameId,
            eventType === "view" ? 1 : 0,
            eventType === "download" ? 1 : 0,
            currentTime
        ).run();
    }

    if (crypto.getRandomValues(new Uint8Array(1))[0] < 8) {
        await env.DB.prepare(
            "DELETE FROM vietpatch_metric_events WHERE expires_at < ?"
        ).bind(now).run().catch(() => {});
    }
    return getGameStats(env, gameId);
}

export async function recordGameView(env, request, gameId) {
    await consumeRateLimit(request, env, {
        scope: "game-view",
        limit: 120,
        windowMs: 60 * 60 * 1000,
        blockMs: 60 * 60 * 1000
    });
    return recordMetric(env, request, gameId, "view", "public", 6 * 60 * 60 * 1000);
}

export function recordGameDownload(env, request, gameId, userId) {
    return recordMetric(env, request, gameId, "download", userId, 15 * 60 * 1000);
}

export async function listGameReviews(env, request, gameIdValue) {
    await ensureSchema(env);
    const gameId = await requirePublishedGame(env, gameIdValue);
    const account = await getRequestAccount(request, env);
    const [publicResult, mineRow, canReview] = await Promise.all([
        env.DB.prepare(
            `SELECT id, game_id, username_snapshot, rating, body, status, created_at, updated_at
             FROM vietpatch_game_reviews
             WHERE game_id = ? AND status = 'published'
             ORDER BY updated_at DESC LIMIT ?`
        ).bind(gameId, REVIEW_LIMIT).all(),
        account
            ? env.DB.prepare(
                `SELECT id, game_id, username_snapshot, rating, body, status, created_at, updated_at
                 FROM vietpatch_game_reviews WHERE game_id = ? AND user_id = ?`
            ).bind(gameId, account.id).first()
            : Promise.resolve(null),
        account ? hasEntitlement(env, account.id, gameId) : Promise.resolve(false)
    ]);
    return {
        reviews: (publicResult.results || []).map(reviewFromRow),
        mine: reviewFromRow(mineRow),
        canReview: Boolean(canReview),
        authenticated: Boolean(account),
        stats: await getGameStats(env, gameId)
    };
}

export async function submitGameReview(env, request, gameIdValue, input) {
    assertSameOrigin(request);
    const account = await requireAccount(request, env);
    const gameId = await requirePublishedGame(env, gameIdValue);
    const rating = Number(input?.rating);
    const body = cleanText(input?.body, 1200);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw httpError(400, "INVALID_REVIEW_RATING");
    }
    if (body.length < 12) throw httpError(400, "REVIEW_TOO_SHORT");
    if (!await hasEntitlement(env, account.id, gameId)) {
        throw httpError(403, "PATCH_REQUIRED_FOR_REVIEW");
    }
    await consumeRateLimit(request, env, {
        scope: `game-review:${gameId}`,
        identity: account.id,
        limit: 6,
        windowMs: 60 * 60 * 1000,
        blockMs: 60 * 60 * 1000
    });

    const currentTime = nowIso();
    await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO vietpatch_game_reviews
                (id, game_id, user_id, username_snapshot, rating, body, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?)
             ON CONFLICT(user_id, game_id) DO UPDATE SET
                username_snapshot = excluded.username_snapshot,
                rating = excluded.rating,
                body = excluded.body,
                status = CASE
                    WHEN vietpatch_game_reviews.status = 'hidden' THEN 'hidden'
                    ELSE 'published'
                END,
                updated_at = excluded.updated_at`
        ).bind(
            `review_${crypto.randomUUID()}`,
            gameId,
            account.id,
            cleanText(account.username, 80) || "Thành viên VietPatch",
            rating,
            body,
            currentTime,
            currentTime
        ),
        env.DB.prepare(
            `INSERT OR IGNORE INTO vietpatch_game_stats
                (game_id, view_count, download_count, updated_at)
             VALUES (?, 0, 0, ?)`
        ).bind(gameId, currentTime)
    ]);
    return listGameReviews(env, request, gameId);
}

export async function submitUpdateReport(env, request, gameIdValue, input) {
    assertSameOrigin(request);
    const account = await requireAccount(request, env);
    const gameId = await requirePublishedGame(env, gameIdValue);
    const reportedVersion = cleanText(input?.reportedVersion, 80);
    const sourceText = String(input?.sourceUrl || "").trim();
    const sourceUrl = safeHttpsUrl(sourceText);
    const note = cleanText(input?.note, 800);
    if (reportedVersion.length < 2) throw httpError(400, "INVALID_REPORTED_VERSION");
    if (sourceText && !sourceUrl) throw httpError(400, "INVALID_REPORT_SOURCE");
    if (note.length < 12) throw httpError(400, "REPORT_NOTE_TOO_SHORT");
    await consumeRateLimit(request, env, {
        scope: `version-report:${gameId}`,
        identity: account.id,
        limit: 3,
        windowMs: 24 * 60 * 60 * 1000,
        blockMs: 24 * 60 * 60 * 1000
    });

    const currentTime = nowIso();
    const pending = await env.DB.prepare(
        `SELECT id FROM vietpatch_update_reports
         WHERE game_id = ? AND user_id = ? AND status = 'pending'
         ORDER BY created_at DESC LIMIT 1`
    ).bind(gameId, account.id).first();
    if (pending) {
        await env.DB.prepare(
            `UPDATE vietpatch_update_reports
             SET username_snapshot = ?, reported_version = ?, source_url = ?, note = ?, updated_at = ?
             WHERE id = ?`
        ).bind(account.username, reportedVersion, sourceUrl, note, currentTime, pending.id).run();
        return { id: pending.id, status: "pending", updated: true };
    }

    const id = `report_${crypto.randomUUID()}`;
    await env.DB.prepare(
        `INSERT INTO vietpatch_update_reports
            (id, game_id, user_id, username_snapshot, reported_version, source_url,
             note, status, admin_note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`
    ).bind(
        id,
        gameId,
        account.id,
        cleanText(account.username, 80) || "Thành viên VietPatch",
        reportedVersion,
        sourceUrl,
        note,
        currentTime,
        currentTime
    ).run();
    return { id, status: "pending", updated: false };
}

export async function listAdminCommunity(env, limitValue = 100) {
    await ensureSchema(env);
    const limit = Math.max(10, Math.min(200, Number(limitValue) || 100));
    const [statsResult, reviewsResult, reportsResult, overviewResult] = await env.DB.batch([
        env.DB.prepare(
            `SELECT game_id, view_count, download_count, updated_at
             FROM vietpatch_game_stats
             ORDER BY (view_count + download_count) DESC, updated_at DESC LIMIT ?`
        ).bind(limit),
        env.DB.prepare(
            `SELECT id, game_id, username_snapshot, rating, body, status, created_at, updated_at
             FROM vietpatch_game_reviews
             ORDER BY updated_at DESC LIMIT ?`
        ).bind(limit),
        env.DB.prepare(
            `SELECT id, game_id, username_snapshot, reported_version, source_url, note,
                    status, admin_note, created_at, updated_at
             FROM vietpatch_update_reports
             ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT ?`
        ).bind(limit),
        env.DB.prepare(
            `SELECT
                (SELECT COALESCE(SUM(view_count), 0) FROM vietpatch_game_stats) AS total_views,
                (SELECT COALESCE(SUM(download_count), 0) FROM vietpatch_game_stats) AS total_downloads,
                (SELECT COUNT(*) FROM vietpatch_game_reviews WHERE status = 'published') AS review_count,
                (SELECT COUNT(*) FROM vietpatch_update_reports WHERE status = 'pending') AS pending_reports`
        )
    ]);
    const overview = overviewResult.results?.[0] || {};
    return {
        overview: {
            totalViews: Number(overview.total_views) || 0,
            totalDownloads: Number(overview.total_downloads) || 0,
            reviewCount: Number(overview.review_count) || 0,
            pendingReports: Number(overview.pending_reports) || 0
        },
        stats: (statsResult.results || []).map(row => ({
            gameId: row.game_id,
            views: Number(row.view_count) || 0,
            downloads: Number(row.download_count) || 0,
            updatedAt: row.updated_at
        })),
        reviews: (reviewsResult.results || []).map(reviewFromRow),
        reports: (reportsResult.results || []).map(reportFromRow)
    };
}

export async function moderateCommunityItem(env, input, actor = "admin") {
    await ensureSchema(env);
    const action = String(input?.action || "");
    const id = String(input?.id || "").slice(0, 120);
    if (!id) throw httpError(400, "COMMUNITY_ITEM_REQUIRED");

    if (action === "review-status") {
        const status = ["published", "hidden"].includes(input?.status) ? input.status : "";
        if (!status) throw httpError(400, "INVALID_REVIEW_STATUS");
        await env.DB.prepare(
            "UPDATE vietpatch_game_reviews SET status = ?, updated_at = ? WHERE id = ?"
        ).bind(status, nowIso(), id).run();
        await writeAudit(env, "community.review-status", actor, { id, status });
    } else if (action === "review-delete") {
        await env.DB.prepare("DELETE FROM vietpatch_game_reviews WHERE id = ?").bind(id).run();
        await writeAudit(env, "community.review-delete", actor, { id });
    } else if (action === "report-status") {
        const status = ["pending", "verified", "dismissed"].includes(input?.status) ? input.status : "";
        if (!status) throw httpError(400, "INVALID_REPORT_STATUS");
        const adminNote = cleanText(input?.adminNote, 500);
        await env.DB.prepare(
            `UPDATE vietpatch_update_reports
             SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?`
        ).bind(status, adminNote, nowIso(), id).run();
        await writeAudit(env, "community.report-status", actor, { id, status, adminNote });
    } else {
        throw httpError(400, "INVALID_COMMUNITY_ACTION");
    }
    return listAdminCommunity(env);
}
