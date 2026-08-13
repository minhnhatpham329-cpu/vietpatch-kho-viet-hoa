import { getAdminSession } from "./_lib/auth.js";
import { json, securityHeaders } from "./_lib/http.js";
import { markPreviewReadOnly } from "./_lib/preview.js";

const PRIVATE_ADMIN_PATHS = new Set(["/admin.html"]);
const PREVIEW_WRITE_ALLOWLIST = new Set([
    "/api/admin/login",
    "/api/admin/logout"
]);

const PREVIEW_MUTATING_GET_PREFIXES = [
    "/api/vietpatch/download/",
    "/api/vietpatch/auth/google-start",
    "/api/vietpatch/auth/google-callback"
];

function isReadOnlyPreview(request, url) {
    if (!url.hostname.endsWith(".pages.dev")) return false;
    if (!url.pathname.startsWith("/api/")) return false;
    const method = request.method.toUpperCase();
    if (method === "GET") {
        return PREVIEW_MUTATING_GET_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
    }
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
    return !PREVIEW_WRITE_ALLOWLIST.has(url.pathname);
}

export async function onRequest(context) {
    const url = new URL(context.request.url);
    if (url.hostname.endsWith(".pages.dev")) {
        markPreviewReadOnly(context.env);
    }
    if (isReadOnlyPreview(context.request, url)) {
        return json({ error: "PREVIEW_READ_ONLY" }, 403, {
            "Cache-Control": "no-store",
            "X-VietPatch-Preview": "read-only"
        });
    }
    if (PRIVATE_ADMIN_PATHS.has(url.pathname)) {
        const session = await getAdminSession(context.request, context.env);
        if (!session) {
            return Response.redirect(`${url.origin}/admin-login.html?returnTo=${encodeURIComponent(url.pathname)}`, 302);
        }
    }

    try {
        const response = await context.next();
        const headers = securityHeaders(new Headers(response.headers));
        if (
            url.pathname === "/admin.html"
            || url.pathname === "/admin-login.html"
            || url.pathname.startsWith("/api/admin/")
            || url.pathname.startsWith("/api/vietpatch/")
            || url.pathname === "/api/webhooks/bank-transfer"
        ) {
            headers.set("Cache-Control", "no-store");
        }
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    } catch (error) {
        console.error(error);
        return json({ error: "EDGE_RUNTIME_ERROR" }, 500);
    }
}
