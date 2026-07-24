import { getAdminSession } from "./_lib/auth.js";
import { json, securityHeaders } from "./_lib/http.js";

const PRIVATE_ADMIN_PATHS = new Set(["/admin.html"]);

export async function onRequest(context) {
    const url = new URL(context.request.url);
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
            || url.pathname === "/api/vietpatch/cms"
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
