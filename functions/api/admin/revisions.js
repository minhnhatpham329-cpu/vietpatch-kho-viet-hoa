import { requireAdmin } from "../../_lib/auth.js";
import { listRevisions } from "../../_lib/cms.js";
import { errorResponse, json } from "../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        await requireAdmin(context.request, context.env);
        const limit = new URL(context.request.url).searchParams.get("limit");
        return json({ revisions: await listRevisions(context.env, limit) });
    } catch (error) {
        return errorResponse(error);
    }
}
