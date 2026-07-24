import {
    assertAuthAllowed,
    clearAuthFailures,
    consumeRateLimit,
    createUserSessionToken,
    normalizeEmail,
    userSessionCookie
} from "../../../_lib/user-auth.js";
import { assertHuman } from "../../../_lib/bot-protection.js";
import { createAccount, publicAccount } from "../../../_lib/vietpatch-store.js";
import { assertSameOrigin, errorResponse, json, readJson } from "../../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        assertSameOrigin(context.request);
        const body = await readJson(context.request, 32 * 1024);
        await consumeRateLimit(context.request, context.env, {
            scope: "account-register",
            limit: 5,
            windowMs: 60 * 60 * 1000,
            blockMs: 60 * 60 * 1000
        });
        await assertHuman(context.request, context.env, body.turnstileToken, "register");
        const identityHash = await assertAuthAllowed(context.request, context.env, normalizeEmail(body.email));
        const account = await createAccount(context.env, body);
        await clearAuthFailures(context.env, identityHash);
        const token = await createUserSessionToken(context.env, account.id);
        return json(
            { user: publicAccount(account) },
            201,
            { "Set-Cookie": userSessionCookie(token) }
        );
    } catch (error) {
        return errorResponse(error);
    }
}
