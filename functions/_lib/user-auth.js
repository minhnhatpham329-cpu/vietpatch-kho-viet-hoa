import { checksum, ensureSchema } from "./db.js";
import { clientFingerprint, httpError, parseCookies } from "./http.js";

const USER_COOKIE = "vp_user_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const PASSWORD_ITERATIONS = 210000;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_BLOCK_MS = 15 * 60 * 1000;
const AUTH_MAX_FAILURES = 8;

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

function sessionSecret(env) {
    const secret = String(env.USER_SESSION_SECRET || env.ADMIN_SESSION_SECRET || "");
    if (secret.length < 32) throw httpError(503, "ACCOUNT_SERVICE_NOT_CONFIGURED");
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

export function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

export function normalizeUsername(value) {
    return String(value || "")
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
}

export function validateRegistration({ email, username, password }) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        throw httpError(400, "INVALID_EMAIL");
    }
    if (username.length < 2) throw httpError(400, "INVALID_USERNAME");
    if (password.length < 8 || password.length > 128) throw httpError(400, "WEAK_PASSWORD");
}

export async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(String(password)),
        "PBKDF2",
        false,
        ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt,
            iterations: PASSWORD_ITERATIONS
        },
        key,
        256
    );
    return `pbkdf2$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password, storedHash) {
    try {
        const [scheme, iterationValue, saltValue, expectedValue] = String(storedHash || "").split("$");
        const iterations = Number(iterationValue);
        if (
            scheme !== "pbkdf2"
            || !Number.isInteger(iterations)
            || iterations < 10000
            || iterations > 1000000
        ) return false;

        const salt = base64UrlToBytes(saltValue);
        const expected = base64UrlToBytes(expectedValue);
        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(String(password)),
            "PBKDF2",
            false,
            ["deriveBits"]
        );
        const actual = new Uint8Array(await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                hash: "SHA-256",
                salt,
                iterations
            },
            key,
            expected.byteLength * 8
        ));
        if (actual.byteLength !== expected.byteLength) return false;
        let difference = 0;
        for (let index = 0; index < actual.byteLength; index += 1) {
            difference |= actual[index] ^ expected[index];
        }
        return difference === 0;
    } catch {
        return false;
    }
}

export async function createUserSessionToken(env, userId) {
    const now = Math.floor(Date.now() / 1000);
    const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({
        v: 1,
        uid: String(userId),
        iat: now,
        exp: now + SESSION_TTL_SECONDS
    })));
    const signature = new Uint8Array(await crypto.subtle.sign(
        "HMAC",
        await hmacKey(sessionSecret(env)),
        new TextEncoder().encode(`vp-user-session:v1:${payload}`)
    ));
    return `${payload}.${bytesToBase64Url(signature)}`;
}

export async function getUserSessionId(request, env) {
    const token = parseCookies(request)[USER_COOKIE] || "";
    const [payload, signatureValue] = token.split(".");
    if (!payload || !signatureValue) return "";
    try {
        const valid = await crypto.subtle.verify(
            "HMAC",
            await hmacKey(sessionSecret(env)),
            base64UrlToBytes(signatureValue),
            new TextEncoder().encode(`vp-user-session:v1:${payload}`)
        );
        if (!valid) return "";
        const decoded = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
        const now = Math.floor(Date.now() / 1000);
        if (decoded?.v !== 1 || !decoded.uid || Number(decoded.exp) <= now) return "";
        return String(decoded.uid);
    } catch {
        return "";
    }
}

export function userSessionCookie(token) {
    return `${USER_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}; Priority=High`;
}

export function clearUserSessionCookie() {
    return `${USER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Priority=High`;
}

async function authIdentity(request, email) {
    return checksum(`user-auth|${normalizeEmail(email)}|${clientFingerprint(request)}`);
}

export async function assertAuthAllowed(request, env, email) {
    await ensureSchema(env);
    const identityHash = await authIdentity(request, email);
    const now = Date.now();
    const row = await env.DB.prepare(
        `SELECT attempts, window_started_at, blocked_until
         FROM vietpatch_auth_attempts WHERE identity_hash = ?`
    ).bind(identityHash).first();
    if (!row) return identityHash;
    if (Number(row.blocked_until) > now) {
        const error = httpError(429, "TOO_MANY_LOGIN_ATTEMPTS");
        error.retryAfter = Math.ceil((Number(row.blocked_until) - now) / 1000);
        throw error;
    }
    if (now - Number(row.window_started_at) > AUTH_WINDOW_MS) {
        await env.DB.prepare("DELETE FROM vietpatch_auth_attempts WHERE identity_hash = ?")
            .bind(identityHash).run();
    }
    return identityHash;
}

export async function recordAuthFailure(env, identityHash) {
    await ensureSchema(env);
    const now = Date.now();
    const row = await env.DB.prepare(
        `SELECT attempts, window_started_at
         FROM vietpatch_auth_attempts WHERE identity_hash = ?`
    ).bind(identityHash).first();
    const sameWindow = row && now - Number(row.window_started_at) <= AUTH_WINDOW_MS;
    const attempts = sameWindow ? Number(row.attempts) + 1 : 1;
    const windowStartedAt = sameWindow ? Number(row.window_started_at) : now;
    const blockedUntil = attempts >= AUTH_MAX_FAILURES ? now + AUTH_BLOCK_MS : 0;
    await env.DB.prepare(
        `INSERT INTO vietpatch_auth_attempts
            (identity_hash, attempts, window_started_at, blocked_until)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(identity_hash) DO UPDATE SET
            attempts = excluded.attempts,
            window_started_at = excluded.window_started_at,
            blocked_until = excluded.blocked_until`
    ).bind(identityHash, attempts, windowStartedAt, blockedUntil).run();
}

export async function clearAuthFailures(env, identityHash) {
    await ensureSchema(env);
    await env.DB.prepare("DELETE FROM vietpatch_auth_attempts WHERE identity_hash = ?")
        .bind(identityHash).run();
}

export async function consumeRateLimit(request, env, {
    scope,
    identity = "",
    limit = 10,
    windowMs = 15 * 60 * 1000,
    blockMs = windowMs
}) {
    await ensureSchema(env);
    const safeScope = String(scope || "request").slice(0, 60);
    const safeIdentity = String(identity || "").slice(0, 180);
    const rateKey = await checksum(
        `vietpatch-rate|${safeScope}|${safeIdentity}|${clientFingerprint(request)}`
    );
    const now = Date.now();
    const row = await env.DB.prepare(
        `SELECT attempts, window_started_at, blocked_until
         FROM vietpatch_rate_limits WHERE rate_key = ?`
    ).bind(rateKey).first();

    if (Number(row?.blocked_until) > now) {
        const error = httpError(429, "TOO_MANY_REQUESTS");
        error.retryAfter = Math.ceil((Number(row.blocked_until) - now) / 1000);
        throw error;
    }

    const sameWindow = row && now - Number(row.window_started_at) <= windowMs;
    const attempts = sameWindow ? Number(row.attempts) + 1 : 1;
    const windowStartedAt = sameWindow ? Number(row.window_started_at) : now;
    const blockedUntil = attempts > limit ? now + blockMs : 0;

    await env.DB.prepare(
        `INSERT INTO vietpatch_rate_limits
            (rate_key, attempts, window_started_at, blocked_until)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(rate_key) DO UPDATE SET
            attempts = excluded.attempts,
            window_started_at = excluded.window_started_at,
            blocked_until = excluded.blocked_until`
    ).bind(rateKey, attempts, windowStartedAt, blockedUntil).run();

    if (blockedUntil) {
        const error = httpError(429, "TOO_MANY_REQUESTS");
        error.retryAfter = Math.ceil(blockMs / 1000);
        throw error;
    }
}
