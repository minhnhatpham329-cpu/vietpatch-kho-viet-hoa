import { resolvePublishedOffer, sanitizeGameId } from "../../../_lib/cms.js";
import {
    hasEntitlement,
    requireAccount
} from "../../../_lib/vietpatch-store.js";
import {
    errorResponse,
    httpError,
    securityHeaders
} from "../../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        const account = await requireAccount(context.request, context.env);
        const gameId = sanitizeGameId(context.params.gameId);
        if (!gameId || !await hasEntitlement(context.env, account.id, gameId)) {
            throw httpError(404, "DOWNLOAD_NOT_FOUND");
        }
        const offer = await resolvePublishedOffer(context.env, gameId);
        if (!offer?.available || !offer.downloadUrl) throw httpError(404, "DOWNLOAD_NOT_FOUND");
        const headers = securityHeaders(new Headers({
            Location: offer.downloadUrl,
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer"
        }));
        return new Response(null, { status: 302, headers });
    } catch (error) {
        return errorResponse(error);
    }
}
