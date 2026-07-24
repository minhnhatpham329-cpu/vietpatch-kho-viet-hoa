import {
    adminCookie,
    assertSameOrigin,
    clientFingerprint,
    getAdminCookie,
    httpError
} from "./http.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
    const normalized = String(value).replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function hmac(secret, value) {
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function sha256(value) {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function constantTimeEqual(left, right) {
    const length = Math.max(left.length, right.length);
    let mismatch = left.length ^ right.length;
    for (let index = 0; index < length; index += 1) {
        mismatch |= (left[index] || 0) ^ (right[index] || 0);
    }
    return mismatch === 0;
}

function requiredSecret(env, name, minLength = 24) {
    const value = String(env[name] || "");
    if (value.length < minLength) throw httpError(503, "ADMIN_SECURITY_NOT_CONFIGURED");
    return value;
}

export async function hashIdentifier(value) {
    return bytesToBase64Url(await sha256(String(value)));
}

export async function verifyAdminPassword(password, env) {
    const fallback = String(env.ADMIN_PASSWORD || "");
    if (fallback) {
        if (fallback.length < 12) throw httpError(503, "ADMIN_SECURITY_NOT_CONFIGURED");
        const left = await sha256(String(password || ""));
        const right = await sha256(fallback);
        return constantTimeEqual(left, right);
    }

    const configuredHash = String(env.ADMIN_PASSWORD_HASH || "").trim();
    if (!configuredHash) throw httpError(503, "ADMIN_SECURITY_NOT_CONFIGURED");

    const [algorithm, iterationsText, saltText, expectedText] = configuredHash.split("$");
    if (algorithm !== "pbkdf2-sha256") throw httpError(503, "ADMIN_PASSWORD_HASH_INVALID");
    const iterations = Number(iterationsText);
    if (!Number.isInteger(iterations) || iterations < 150000 || iterations > 1000000) {
        throw httpError(503, "ADMIN_PASSWORD_HASH_INVALID");
    }

    let salt;
    let expected;
    try {
        salt = base64UrlToBytes(saltText);
        expected = base64UrlToBytes(expectedText);
    } catch {
        throw httpError(503, "ADMIN_PASSWORD_HASH_INVALID");
    }
    if (salt.byteLength < 16 || expected.byteLength < 32) {
        throw httpError(503, "ADMIN_PASSWORD_HASH_INVALID");
    }

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(String(password || "")),
        "PBKDF2",
        false,
        ["deriveBits"]
    );
    let derived;
    try {
        derived = new Uint8Array(await crypto.subtle.deriveBits({
            name: "PBKDF2",
            hash: "SHA-256",
            salt,
            iterations
        }, key, expected.byteLength * 8));
    } catch {
        throw httpError(503, "ADMIN_PASSWORD_HASH_INVALID");
    }
    return constantTimeEqual(derived, expected);
}

export async function createAdminSession(request, env) {
    const secret = requiredSecret(env, "ADMIN_SESSION_SECRET", 32);
    const now = Math.floor(Date.now() / 1000);
    const csrf = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
    const fingerprint = await hashIdentifier(clientFingerprint(request));
    const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
        v: 1,
        sub: "vietpatch-admin",
        iat: now,
        exp: now + 8 * 60 * 60,
        csrf,
        fp: fingerprint.slice(0, 24)
    })));
    const signature = bytesToBase64Url(await hmac(secret, payload));
    return {
        token: `${payload}.${signature}`,
        csrf,
        expiresAt: new Date((now + 8 * 60 * 60) * 1000).toISOString(),
        cookie: adminCookie(`${payload}.${signature}`)
    };
}

export async function getAdminSession(request, env) {
    const token = getAdminCookie(request);
    const secret = String(env.ADMIN_SESSION_SECRET || "");
    if (!token || secret.length < 32) return null;
    const [payloadText, signatureText] = token.split(".");
    if (!payloadText || !signatureText) return null;

    try {
        const supplied = base64UrlToBytes(signatureText);
        const expected = await hmac(secret, payloadText);
        if (!constantTimeEqual(supplied, expected)) return null;
        const payload = JSON.parse(decoder.decode(base64UrlToBytes(payloadText)));
        const now = Math.floor(Date.now() / 1000);
        if (payload.v !== 1 || payload.sub !== "vietpatch-admin" || payload.exp <= now) return null;
        const fingerprint = await hashIdentifier(clientFingerprint(request));
        if (!constantTimeEqual(
            encoder.encode(String(payload.fp || "")),
            encoder.encode(fingerprint.slice(0, 24))
        )) return null;
        return payload;
    } catch {
        return null;
    }
}

export async function requireAdmin(request, env, options = {}) {
    const session = await getAdminSession(request, env);
    if (!session) throw httpError(401, "ADMIN_AUTH_REQUIRED");
    if (options.mutation) {
        assertSameOrigin(request);
        const suppliedCsrf = String(request.headers.get("x-csrf-token") || "");
        if (!suppliedCsrf || !constantTimeEqual(
            encoder.encode(suppliedCsrf),
            encoder.encode(String(session.csrf || ""))
        )) {
            throw httpError(403, "CSRF_TOKEN_INVALID");
        }
    }
    return session;
}
