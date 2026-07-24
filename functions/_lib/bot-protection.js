import { httpError } from "./http.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstilePublicConfig(env) {
    const siteKey = String(env.TURNSTILE_SITE_KEY || "").trim();
    const secretKey = String(env.TURNSTILE_SECRET_KEY || "").trim();
    return {
        enabled: siteKey.length >= 10 && secretKey.length >= 10,
        siteKey: siteKey.length >= 10 && secretKey.length >= 10 ? siteKey : ""
    };
}

export async function assertHuman(request, env, tokenValue, expectedAction) {
    const config = turnstilePublicConfig(env);
    if (!config.enabled) return;

    const token = String(tokenValue || "").trim();
    if (token.length < 20 || token.length > 4096) {
        throw httpError(400, "HUMAN_VERIFICATION_REQUIRED");
    }

    const body = new FormData();
    body.set("secret", String(env.TURNSTILE_SECRET_KEY));
    body.set("response", token);
    body.set("idempotency_key", crypto.randomUUID());
    const remoteIp = String(request.headers.get("cf-connecting-ip") || "").trim();
    if (remoteIp) body.set("remoteip", remoteIp);

    let result;
    try {
        const response = await fetch(VERIFY_URL, {
            method: "POST",
            body,
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error("TURNSTILE_UPSTREAM_FAILED");
        result = await response.json();
    } catch {
        throw httpError(503, "HUMAN_VERIFICATION_UNAVAILABLE");
    }

    const hostname = String(result?.hostname || "").toLowerCase();
    const requestHostname = new URL(request.url).hostname.toLowerCase();
    const action = String(result?.action || "");
    if (
        result?.success !== true
        || (hostname && hostname !== requestHostname)
        || (action && action !== expectedAction)
    ) {
        throw httpError(400, "HUMAN_VERIFICATION_FAILED");
    }
}
