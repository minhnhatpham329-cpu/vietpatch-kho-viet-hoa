import { requireAdmin } from "../../_lib/auth.js";
import {
    listAdminCommunity,
    moderateCommunityItem
} from "../../_lib/community.js";
import {
    actorFromRequest,
    errorResponse,
    json,
    readJson
} from "../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        await requireAdmin(context.request, context.env);
        const limit = new URL(context.request.url).searchParams.get("limit");
        return json(await listAdminCommunity(context.env, limit));
    } catch (error) {
        return errorResponse(error);
    }
}

export async function onRequestPost(context) {
    try {
        await requireAdmin(context.request, context.env, { mutation: true });
        const input = await readJson(context.request, 16 * 1024);
        return json(await moderateCommunityItem(
            context.env,
            input,
            actorFromRequest(context.request)
        ));
    } catch (error) {
        return errorResponse(error);
    }
}
