import { clearUserSessionCookie } from "../../../_lib/user-auth.js";
import { assertSameOrigin, errorResponse, json } from "../../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        assertSameOrigin(context.request);
        return json(
            { ok: true },
            200,
            { "Set-Cookie": clearUserSessionCookie() }
        );
    } catch (error) {
        return errorResponse(error);
    }
}
