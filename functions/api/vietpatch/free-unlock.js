import { resolvePublishedOffer, sanitizeGameId } from "../../_lib/cms.js";
import {
    publicAccount,
    requireAccount,
    unlockFreeOffer
} from "../../_lib/vietpatch-store.js";
import {
    assertSameOrigin,
    errorResponse,
    httpError,
    json,
    readJson
} from "../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        assertSameOrigin(context.request);
        const account = await requireAccount(context.request, context.env);
        const body = await readJson(context.request, 32 * 1024);
        const gameId = sanitizeGameId(body.gameId);
        if (!gameId) throw httpError(400, "INVALID_GAME");
        const offer = await resolvePublishedOffer(context.env, gameId);
        if (!offer?.available) throw httpError(409, "PATCH_UNAVAILABLE");
        if (offer.price !== 0) throw httpError(403, "PAID_PATCH_REQUIRED");
        const updated = await unlockFreeOffer(context.env, account, offer);
        return json({ user: publicAccount(updated) });
    } catch (error) {
        return errorResponse(error);
    }
}
