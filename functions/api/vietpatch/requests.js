import { getCmsDocument, saveDraft } from "../../_lib/cms.js";
import { assertHuman } from "../../_lib/bot-protection.js";
import { assertSameOrigin, errorResponse, httpError, json, readJson } from "../../_lib/http.js";
import { consumeRateLimit } from "../../_lib/user-auth.js";

const MAX_IMAGE_DATA_URL_CHARS = 950000;

function cleanText(value, maxLength, { multiline = false } = {}) {
    const source = String(value || "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .trim();
    const normalized = multiline
        ? source.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n")
        : source.replace(/\s+/g, " ");
    return normalized.slice(0, maxLength);
}

function safeHttpUrl(value) {
    const source = cleanText(value, 1800);
    if (!source) return "";
    try {
        const url = new URL(source);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
        return "";
    }
}

function safeImage(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    if (source.length <= MAX_IMAGE_DATA_URL_CHARS
        && /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(source)) {
        return source;
    }
    return safeHttpUrl(source);
}

function makeRequestId() {
    return `request-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

async function appendPendingRequest(env, item) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const document = await getCmsDocument(env);
        if (document.draft.requests.length >= 300) throw httpError(429, "REQUEST_QUEUE_FULL");

        const nextState = structuredClone(document.draft);
        nextState.requests.unshift(item);
        try {
            await saveDraft(env, nextState, document.draftVersion, "community-request");
            return;
        } catch (error) {
            if (error?.message !== "CMS_VERSION_CONFLICT" || attempt === 1) throw error;
        }
    }
}

export async function onRequestPost(context) {
    try {
        assertSameOrigin(context.request);
        const body = await readJson(context.request, 1024 * 1024);
        await consumeRateLimit(context.request, context.env, {
            scope: "community-request",
            limit: 3,
            windowMs: 24 * 60 * 60 * 1000,
            blockMs: 24 * 60 * 60 * 1000
        });
        await assertHuman(context.request, context.env, body.turnstileToken, "proposal");

        const title = cleanText(body.title, 120);
        const engine = cleanText(body.engine, 60) || "Khác";
        const platform = cleanText(body.platform, 60) || "Nhiều nền tảng";
        const notes = cleanText(body.notes, 420, { multiline: true });
        const rawLink = cleanText(body.link, 1800);
        const rawImage = String(body.logoUrl || "").trim();
        const link = safeHttpUrl(rawLink);
        const logoUrl = safeImage(rawImage);

        if (!title) throw httpError(400, "INVALID_REQUEST_TITLE");
        if (rawLink && !link) throw httpError(400, "INVALID_REQUEST_LINK");
        if (rawImage && !logoUrl) throw httpError(400, "INVALID_REQUEST_IMAGE");

        const request = {
            id: makeRequestId(),
            title,
            logoUrl,
            engine,
            platform,
            link,
            notes,
            votes: 0,
            // Mặc định để ẩn: Admin kiểm duyệt và bấm xuất bản thì mới hiện công khai.
            published: false
        };
        await appendPendingRequest(context.env, request);

        return json({ request: { id: request.id, title: request.title, pending: true } }, 201);
    } catch (error) {
        return errorResponse(error);
    }
}
