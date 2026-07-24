import { turnstilePublicConfig } from "../../../_lib/bot-protection.js";
import { json } from "../../../_lib/http.js";

export function onRequestGet(context) {
    const googleClientId = String(context.env.GOOGLE_CLIENT_ID || "").trim();
    const googleClientSecret = String(context.env.GOOGLE_CLIENT_SECRET || "").trim();
    return json({
        googleEnabled: googleClientId.length >= 20 && googleClientSecret.length >= 16,
        turnstile: turnstilePublicConfig(context.env)
    });
}
