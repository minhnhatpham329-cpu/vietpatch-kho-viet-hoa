import {
    assertAuthAllowed,
    clearAuthFailures,
    createUserSessionToken,
    normalizeEmail,
    userSessionCookie
} from "../../../_lib/user-auth.js";
import { createAccount, publicAccount } from "../../../_lib/vietpatch-store.js";
import { assertSameOrigin, errorResponse, json, readJson } from "../../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        assertSameOrigin(context.request);
        const body = await readJson(context.request, 32 * 1024);
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
