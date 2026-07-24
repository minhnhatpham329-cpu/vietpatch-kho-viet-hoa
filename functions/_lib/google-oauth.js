import { httpError, parseCookies } from "./http.js";

const OAUTH_COOKIE = "vp_google_oauth";
const OAUTH_TTL_SECONDS = 10 * 60;
const CALLBACK_PATH = "/api/vietpatch/auth/google-callback";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

function bytesToBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function randomToken(bytes = 32) {
    return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function oauthConfig(request, env) {
    const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
    const clientSecret = String(env.GOOGLE_CLIENT_SECRET || "").trim();
    if (clientId.length < 20 || clientSecret.length < 16) {
        throw httpError(503, "GOOGLE_AUTH_NOT_CONFIGURED");
    }

    const requestUrl = new URL(request.url);
    const configuredRedirect = String(env.GOOGLE_REDIRECT_URI || "").trim();
    const redirectUri = configuredRedirect || `${requestUrl.origin}${CALLBACK_PATH}`;
    let redirectUrl;
    try {
        redirectUrl = new URL(redirectUri);
    } catch {
        throw httpError(503, "GOOGLE_AUTH_NOT_CONFIGURED");
    }
    if (redirectUrl.protocol !== "https:" || redirectUrl.pathname !== CALLBACK_PATH) {
        throw httpError(503, "GOOGLE_AUTH_NOT_CONFIGURED");
    }
    return { clientId, clientSecret, redirectUri: redirectUrl.toString() };
}

function stateSecret(env) {
    const secret = String(
        env.GOOGLE_OAUTH_STATE_SECRET
        || env.USER_SESSION_SECRET
        || env.ADMIN_SESSION_SECRET
        || ""
    );
    if (secret.length < 32) throw httpError(503, "GOOGLE_AUTH_NOT_CONFIGURED");
    return secret;
}

async function hmacKey(secret) {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

async function signFlow(env, value) {
    const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
    const signature = new Uint8Array(await crypto.subtle.sign(
        "HMAC",
        await hmacKey(stateSecret(env)),
        new TextEncoder().encode(`vp-google-oauth:v1:${payload}`)
    ));
    return `${payload}.${bytesToBase64Url(signature)}`;
}

async function verifyFlow(env, token) {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature) throw httpError(400, "GOOGLE_AUTH_INVALID_STATE");
    const valid = await crypto.subtle.verify(
        "HMAC",
        await hmacKey(stateSecret(env)),
        base64UrlToBytes(signature),
        new TextEncoder().encode(`vp-google-oauth:v1:${payload}`)
    );
    if (!valid) throw httpError(400, "GOOGLE_AUTH_INVALID_STATE");
    let decoded;
    try {
        decoded = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    } catch {
        throw httpError(400, "GOOGLE_AUTH_INVALID_STATE");
    }
    const now = Math.floor(Date.now() / 1000);
    if (
        decoded?.v !== 1
        || !decoded.state
        || !decoded.nonce
        || !decoded.verifier
        || Number(decoded.exp) <= now
    ) throw httpError(400, "GOOGLE_AUTH_INVALID_STATE");
    return decoded;
}

function safeReturnTo(value) {
    const candidate = String(value || "/").trim();
    if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return "/";
    try {
        const parsed = new URL(candidate, "https://vietpatch.invalid");
        return `${parsed.pathname}${parsed.search}`;
    } catch {
        return "/";
    }
}

function oauthCookie(value) {
    return `${OAUTH_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${OAUTH_TTL_SECONDS}; Priority=High`;
}

export function clearGoogleOAuthCookie() {
    return `${OAUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Priority=High`;
}

export async function createGoogleAuthorization(request, env, returnToValue) {
    const config = oauthConfig(request, env);
    const now = Math.floor(Date.now() / 1000);
    const verifier = randomToken(48);
    const challenge = bytesToBase64Url(new Uint8Array(await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(verifier)
    )));
    const flow = {
        v: 1,
        state: randomToken(24),
        nonce: randomToken(24),
        verifier,
        returnTo: safeReturnTo(returnToValue),
        iat: now,
        exp: now + OAUTH_TTL_SECONDS
    };
    const url = new URL(GOOGLE_AUTH_URL);
    url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state: flow.state,
        nonce: flow.nonce,
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "select_account"
    }).toString();
    return {
        authorizationUrl: url.toString(),
        cookie: oauthCookie(await signFlow(env, flow))
    };
}

function decodeJwtPart(part) {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
}

async function verifyGoogleIdToken(idToken, clientId, nonce) {
    const parts = String(idToken || "").split(".");
    if (parts.length !== 3) throw httpError(403, "GOOGLE_IDENTITY_NOT_VERIFIED");
    let header;
    let claims;
    try {
        header = decodeJwtPart(parts[0]);
        claims = decodeJwtPart(parts[1]);
    } catch {
        throw httpError(403, "GOOGLE_IDENTITY_NOT_VERIFIED");
    }
    if (header?.alg !== "RS256" || !header?.kid) {
        throw httpError(403, "GOOGLE_IDENTITY_NOT_VERIFIED");
    }

    const keyResponse = await fetch(GOOGLE_JWKS_URL, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000)
    });
    if (!keyResponse.ok) throw httpError(502, "GOOGLE_AUTH_UPSTREAM_FAILED");
    const keySet = await keyResponse.json();
    const jwk = Array.isArray(keySet?.keys)
        ? keySet.keys.find(item => item.kid === header.kid && item.alg === "RS256")
        : null;
    if (!jwk) throw httpError(403, "GOOGLE_IDENTITY_NOT_VERIFIED");

    const publicKey = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
    );
    const signatureValid = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        publicKey,
        base64UrlToBytes(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );

    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
    if (
        !signatureValid
        || !["accounts.google.com", "https://accounts.google.com"].includes(claims?.iss)
        || !audiences.includes(clientId)
        || (audiences.length > 1 && claims?.azp !== clientId)
        || Number(claims?.exp) <= now
        || Number(claims?.iat) > now + 120
        || claims?.nonce !== nonce
        || claims?.email_verified !== true
        || !claims?.sub
        || !claims?.email
    ) {
        throw httpError(403, "GOOGLE_IDENTITY_NOT_VERIFIED");
    }
    return {
        sub: String(claims.sub),
        email: String(claims.email),
        emailVerified: true,
        name: String(claims.name || "")
    };
}

export async function exchangeGoogleCallback(request, env, query) {
    const config = oauthConfig(request, env);
    const flow = await verifyFlow(env, parseCookies(request)[OAUTH_COOKIE]);
    const state = String(query.get("state") || "");
    const code = String(query.get("code") || "");
    if (!state || state !== flow.state || !code || code.length > 4096) {
        throw httpError(400, "GOOGLE_AUTH_INVALID_STATE");
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            grant_type: "authorization_code",
            code_verifier: flow.verifier
        }),
        signal: AbortSignal.timeout(10000)
    });
    if (!tokenResponse.ok) throw httpError(502, "GOOGLE_AUTH_UPSTREAM_FAILED");
    const tokens = await tokenResponse.json();
    const profile = await verifyGoogleIdToken(tokens?.id_token, config.clientId, flow.nonce);
    return { profile, returnTo: flow.returnTo };
}

export function googleOAuthSuccessLocation(returnTo) {
    const target = new URL(safeReturnTo(returnTo), "https://vietpatch.invalid");
    target.searchParams.set("auth", "google-success");
    return `${target.pathname}${target.search}`;
}

export function googleOAuthErrorLocation() {
    return "/?auth=google-error";
}
