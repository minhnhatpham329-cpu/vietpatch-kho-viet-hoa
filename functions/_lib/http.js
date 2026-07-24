const ADMIN_COOKIE = "vp_admin_session";

export function securityHeaders(headers = new Headers()) {
    headers.set("Content-Security-Policy", [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "script-src 'self' https://www.youtube.com https://challenges.cloudflare.com",
        "script-src-attr 'none'",
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com",
        "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com",
        "connect-src 'self' https://challenges.cloudflare.com",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "upgrade-insecure-requests"
    ].join("; "));
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set("Origin-Agent-Cluster", "?1");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-Permitted-Cross-Domain-Policies", "none");
    return headers;
}

export function json(payload, status = 200, extraHeaders = {}) {
    const headers = securityHeaders(new Headers({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...extraHeaders
    }));
    return new Response(JSON.stringify(payload), { status, headers });
}

export function errorResponse(error) {
    const status = Number(error?.statusCode) || 500;
    const serverSafeErrors = new Set([
        "ACCOUNT_SERVICE_NOT_CONFIGURED",
        "CMS_DATABASE_NOT_CONFIGURED",
        "PAYMENT_NOT_CONFIGURED"
    ]);
    const message = String(error?.message || "REQUEST_FAILED");
    const safeMessage = status >= 500 && !serverSafeErrors.has(message)
        ? "INTERNAL_SERVER_ERROR"
        : message;
    if (status >= 500) console.error(error);
    const headers = {};
    if (status === 429 && Number(error?.retryAfter) > 0) {
        headers["Retry-After"] = String(Math.ceil(Number(error.retryAfter)));
    }
    return json({ error: safeMessage }, status, headers);
}

export async function readJson(request, maxBytes = 6 * 1024 * 1024) {
    const contentType = String(request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json" && !contentType.endsWith("+json")) {
        throw httpError(415, "JSON_CONTENT_TYPE_REQUIRED");
    }
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > maxBytes) throw httpError(413, "REQUEST_BODY_TOO_LARGE");
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
        throw httpError(413, "REQUEST_BODY_TOO_LARGE");
    }
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw httpError(400, "INVALID_JSON");
    }
}

export function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

export function parseCookies(request) {
    const result = {};
    for (const part of String(request.headers.get("cookie") || "").split(";")) {
        const index = part.indexOf("=");
        if (index < 1) continue;
        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        try {
            result[key] = decodeURIComponent(value);
        } catch {
            result[key] = value;
        }
    }
    return result;
}

export function getAdminCookie(request) {
    return parseCookies(request)[ADMIN_COOKIE] || "";
}

export function adminCookie(value, maxAgeSeconds = 8 * 60 * 60) {
    return `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}; Priority=High`;
}

export function clearAdminCookie() {
    return `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Priority=High`;
}

export function assertSameOrigin(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const fetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();
    if (fetchSite === "cross-site") throw httpError(403, "CROSS_SITE_REQUEST_BLOCKED");
    if (origin && new URL(origin).origin !== url.origin) {
        throw httpError(403, "CROSS_SITE_REQUEST_BLOCKED");
    }
}

export function clientFingerprint(request) {
    return [
        request.headers.get("cf-connecting-ip") || "unknown",
        request.headers.get("user-agent") || "unknown"
    ].join("|");
}

export function actorFromRequest(request) {
    return String(request.headers.get("cf-connecting-ip") || "admin").slice(0, 80);
}
