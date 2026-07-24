import { requireAdmin } from "../../_lib/auth.js";
import { clearAdminCookie, errorResponse, json } from "../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        await requireAdmin(context.request, context.env, { mutation: true });
        return json({ ok: true }, 200, { "Set-Cookie": clearAdminCookie() });
    } catch (error) {
        return errorResponse(error);
    }
}
