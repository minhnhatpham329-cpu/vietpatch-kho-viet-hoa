import {
    assertAuthAllowed,
    clearAuthFailures,
    createUserSessionToken,
    normalizeEmail,
    recordAuthFailure,
    userSessionCookie
} from "../../../_lib/user-auth.js";
import { publicAccount, verifyAccountLogin } from "../../../_lib/vietpatch-store.js";
import { assertSameOrigin, errorResponse, httpError, json, readJson } from "../../../_lib/http.js";

export async function onRequestPost(context) {
    let identityHash = "";
    try {
        assertSameOrigin(context.request);
        const body = await readJson(context.request, 32 * 1024);
        const email = normalizeEmail(body.email);
        identityHash = await assertAuthAllowed(context.request, context.env, email);
        const account = await verifyAccountLogin(context.env, email, body.password);
        if (!account) {
            await recordAuthFailure(context.env, identityHash);
            throw httpError(401, "INVALID_LOGIN");
        }
        await clearAuthFailures(context.env, identityHash);
        const token = await createUserSessionToken(context.env, account.id);
        return json(
            { user: publicAccount(account) },
            200,
            { "Set-Cookie": userSessionCookie(token) }
        );
    } catch (error) {
        return errorResponse(error);
    }
}
