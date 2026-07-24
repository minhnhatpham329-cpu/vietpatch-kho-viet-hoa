import {
    clearGoogleOAuthCookie,
    exchangeGoogleCallback,
    googleOAuthErrorLocation,
    googleOAuthSuccessLocation
} from "../../../_lib/google-oauth.js";
import { createUserSessionToken, userSessionCookie } from "../../../_lib/user-auth.js";
import { getOrCreateGoogleAccount } from "../../../_lib/vietpatch-store.js";
import { securityHeaders } from "../../../_lib/http.js";

function redirectWithCookies(location, cookies) {
    const headers = securityHeaders(new Headers({
        Location: location,
        "Cache-Control": "no-store"
    }));
    for (const cookie of cookies) headers.append("Set-Cookie", cookie);
    return new Response(null, { status: 302, headers });
}

export async function onRequestGet(context) {
    try {
        const requestUrl = new URL(context.request.url);
        if (requestUrl.searchParams.get("error")) {
            return redirectWithCookies(
                googleOAuthErrorLocation(),
                [clearGoogleOAuthCookie()]
            );
        }
        const result = await exchangeGoogleCallback(
            context.request,
            context.env,
            requestUrl.searchParams
        );
        const account = await getOrCreateGoogleAccount(context.env, result.profile);
        const session = await createUserSessionToken(context.env, account.id);
        return redirectWithCookies(
            googleOAuthSuccessLocation(result.returnTo),
            [userSessionCookie(session), clearGoogleOAuthCookie()]
        );
    } catch {
        return redirectWithCookies(
            googleOAuthErrorLocation(),
            [clearGoogleOAuthCookie()]
        );
    }
}
