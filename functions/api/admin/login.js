import { createAdminSession, hashIdentifier, verifyAdminPassword } from "../../_lib/auth.js";
import {
    checkLoginLimit,
    clearLoginFailures,
    recordLoginFailure,
    writeAudit
} from "../../_lib/db.js";
import {
    actorFromRequest,
    assertSameOrigin,
    errorResponse,
    json,
    readJson
} from "../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        assertSameOrigin(context.request);
        const identityHash = await hashIdentifier(
            context.request.headers.get("cf-connecting-ip") || "unknown"
        );
        const limit = await checkLoginLimit(context.env, identityHash);
        if (!limit.allowed) {
            return json(
                { error: "TOO_MANY_LOGIN_ATTEMPTS", retryAfter: limit.retryAfter },
                429,
                { "Retry-After": String(limit.retryAfter) }
            );
        }

        const body = await readJson(context.request, 16 * 1024);
        if (!await verifyAdminPassword(body.password, context.env)) {
            const failure = await recordLoginFailure(context.env, identityHash);
            await writeAudit(context.env, "admin.login.failed", "anonymous", {
                attempts: failure.attempts
            });
            return json({ error: "INVALID_ADMIN_PASSWORD" }, 401);
        }

        await clearLoginFailures(context.env, identityHash);
        const session = await createAdminSession(context.request, context.env);
        await writeAudit(context.env, "admin.login.succeeded", actorFromRequest(context.request));
        return json({
            authenticated: true,
            csrf: session.csrf,
            expiresAt: session.expiresAt
        }, 200, { "Set-Cookie": session.cookie });
    } catch (error) {
        return errorResponse(error);
    }
}
