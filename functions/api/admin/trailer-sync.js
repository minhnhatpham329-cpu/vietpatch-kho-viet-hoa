import { requireAdmin } from "../../_lib/auth.js";
import { syncWeeklyTrailers } from "../../_lib/trailer-automation.js";
import { errorResponse, httpError, json, readJson } from "../../_lib/http.js";

const encoder = new TextEncoder();

async function digest(value) {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(String(value || ""))));
}

function equalBytes(left, right) {
    const length = Math.max(left.length, right.length);
    let mismatch = left.length ^ right.length;
    for (let index = 0; index < length; index += 1) {
        mismatch |= (left[index] || 0) ^ (right[index] || 0);
    }
    return mismatch === 0;
}

async function scheduledAccess(request, env) {
    const expected = String(env.TRAILER_SYNC_SECRET || "");
    if (expected.length < 32) return false;
    const authorization = String(request.headers.get("authorization") || "");
    const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!supplied) return false;
    return equalBytes(await digest(supplied), await digest(expected));
}

export async function onRequestPost(context) {
    try {
        const scheduled = await scheduledAccess(context.request, context.env);
        if (!scheduled) await requireAdmin(context.request, context.env, { mutation: true });
        const body = await readJson(context.request, 16 * 1024);
        const publish = scheduled ? body.publish !== false : false;
        const result = await syncWeeklyTrailers(context.env, {
            publish,
            actor: scheduled ? "github-weekly-schedule" : "admin-manual-review"
        });
        if (scheduled) {
            return json({ ok: true, published: publish, status: result.status, meta: result.meta });
        }
        return json({ ok: true, state: result.state, status: result.status, meta: result.meta });
    } catch (error) {
        if (error?.message === "ADMIN_AUTH_REQUIRED" && !String(context.env.TRAILER_SYNC_SECRET || "")) {
            return errorResponse(httpError(503, "TRAILER_SYNC_NOT_CONFIGURED"));
        }
        return errorResponse(error);
    }
}
