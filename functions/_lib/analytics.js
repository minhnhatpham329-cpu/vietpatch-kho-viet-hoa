import { checksum, ensureSchema } from "./db.js";
import { parseCookies } from "./http.js";

const VISITOR_COOKIE = "vp_visitor";
const VISITOR_TTL_SECONDS = 365 * 24 * 60 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const BOT_USER_AGENT = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pagespeed|uptime|monitor/i;

function vietnamDateKey(offsetDays = 0) {
    return new Date(Date.now() + VIETNAM_OFFSET_MS - (offsetDays * DAY_MS))
        .toISOString()
        .slice(0, 10);
}

function validVisitorId(value) {
    const normalized = String(value || "");
    return /^[A-Za-z0-9_-]{24,80}$/.test(normalized) ? normalized : "";
}

function createVisitorId() {
    return crypto.randomUUID().replaceAll("-", "");
}

function visitorCookie(value) {
    return `${VISITOR_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${VISITOR_TTL_SECONDS}; Priority=Medium`;
}

export async function recordSiteVisit(env, request) {
    await ensureSchema(env);
    const userAgent = String(request.headers.get("user-agent") || "");
    if (!userAgent || BOT_USER_AGENT.test(userAgent)) {
        return { counted: false, newVisitor: false, cookie: "" };
    }

    const cookies = parseCookies(request);
    let visitorId = validVisitorId(cookies[VISITOR_COOKIE]);
    const shouldSetCookie = !visitorId;
    if (!visitorId) visitorId = createVisitorId();

    const visitDate = vietnamDateKey();
    const visitorHash = await checksum(`${visitDate}|${visitorId}`);
    const currentTime = new Date().toISOString();
    const inserted = await env.DB.prepare(
        `INSERT OR IGNORE INTO vietpatch_traffic_visitors
            (visit_date, visitor_hash, page_views, first_seen_at, last_seen_at)
         VALUES (?, ?, 0, ?, ?)`
    ).bind(visitDate, visitorHash, currentTime, currentTime).run();
    const newVisitor = Number(inserted.meta?.changes) > 0;

    await env.DB.batch([
        env.DB.prepare(
            `UPDATE vietpatch_traffic_visitors
             SET page_views = page_views + 1, last_seen_at = ?
             WHERE visit_date = ? AND visitor_hash = ?`
        ).bind(currentTime, visitDate, visitorHash),
        env.DB.prepare(
            `INSERT INTO vietpatch_traffic_daily
                (visit_date, unique_visitors, page_views, updated_at)
             VALUES (?, ?, 1, ?)
             ON CONFLICT(visit_date) DO UPDATE SET
                unique_visitors = unique_visitors + excluded.unique_visitors,
                page_views = page_views + 1,
                updated_at = excluded.updated_at`
        ).bind(visitDate, newVisitor ? 1 : 0, currentTime)
    ]);

    if (Math.random() < 0.01) {
        await env.DB.prepare("DELETE FROM vietpatch_traffic_visitors WHERE visit_date < ?")
            .bind(vietnamDateKey(120)).run();
    }

    return {
        counted: true,
        newVisitor,
        cookie: shouldSetCookie ? visitorCookie(visitorId) : ""
    };
}

export async function getAdminTrafficOverview(env, daysValue = 14) {
    await ensureSchema(env);
    const days = Math.max(7, Math.min(31, Number(daysValue) || 14));
    const dates = Array.from({ length: days }, (_, index) => vietnamDateKey(days - index - 1));
    const result = await env.DB.prepare(
        `SELECT visit_date, unique_visitors, page_views, updated_at
         FROM vietpatch_traffic_daily
         WHERE visit_date >= ?
         ORDER BY visit_date ASC`
    ).bind(dates[0]).all();
    const rows = new Map((result.results || []).map(row => [String(row.visit_date), row]));
    const daily = dates.map(date => {
        const row = rows.get(date) || {};
        return {
            date,
            uniqueVisitors: Math.max(0, Number(row.unique_visitors) || 0),
            pageViews: Math.max(0, Number(row.page_views) || 0),
            updatedAt: row.updated_at || null
        };
    });
    return {
        timezone: "Asia/Ho_Chi_Minh",
        today: daily[daily.length - 1],
        daily
    };
}
