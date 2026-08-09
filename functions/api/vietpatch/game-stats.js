import { listPublicGameStats } from "../../_lib/community.js";
import { errorResponse, json } from "../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        return json({ stats: await listPublicGameStats(context.env) });
    } catch (error) {
        return errorResponse(error);
    }
}
