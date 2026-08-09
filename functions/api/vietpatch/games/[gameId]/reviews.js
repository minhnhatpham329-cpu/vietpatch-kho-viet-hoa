import {
    listGameReviews,
    submitGameReview
} from "../../../../_lib/community.js";
import {
    errorResponse,
    json,
    readJson
} from "../../../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        return json(await listGameReviews(
            context.env,
            context.request,
            context.params.gameId
        ));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function onRequestPost(context) {
    try {
        const input = await readJson(context.request, 8 * 1024);
        return json(await submitGameReview(
            context.env,
            context.request,
            context.params.gameId,
            input
        ));
    } catch (error) {
        return errorResponse(error);
    }
}
