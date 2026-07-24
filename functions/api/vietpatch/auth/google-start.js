import { createGoogleAuthorization } from "../../../_lib/google-oauth.js";
import { consumeRateLimit } from "../../../_lib/user-auth.js";
import { errorResponse, securityHeaders } from "../../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        await consumeRateLimit(context.request, context.env, {
            scope: "google-oauth-start",
            limit: 30,
            windowMs: 15 * 60 * 1000,
            blockMs: 15 * 60 * 1000
        });
        const requestUrl = new URL(context.request.url);
        const flow = await createGoogleAuthorization(
            context.request,
            context.env,
            requestUrl.searchParams.get("returnTo")
        );
        const headers = securityHeaders(new Headers({
            Location: flow.authorizationUrl,
            "Set-Cookie": flow.cookie,
            "Cache-Control": "no-store"
        }));
        return new Response(null, { status: 302, headers });
    } catch (error) {
        return errorResponse(error);
    }
}
