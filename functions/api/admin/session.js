import { getAdminSession } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestGet(context) {
    const session = await getAdminSession(context.request, context.env);
    if (!session) return json({ authenticated: false }, 401);
    return json({
        authenticated: true,
        csrf: session.csrf,
        expiresAt: new Date(session.exp * 1000).toISOString()
    });
}
