import {
    getGameStats,
    recordGameView
} from "../../../../_lib/community.js";
import {
    assertSameOrigin,
    errorResponse,
    json
} from "../../../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        return json({ stats: await getGameStats(context.env, context.params.gameId) });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function onRequestPost(context) {
    try {
        assertSameOrigin(context.request);
        return json({
            stats: await recordGameView(
                context.env,
                context.request,
                context.params.gameId
            )
        });
    } catch (error) {
        return errorResponse(error);
    }
}
