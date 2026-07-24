import { requireAdmin } from "../../_lib/auth.js";
import { cmsMeta, restoreRevision } from "../../_lib/cms.js";
import { actorFromRequest, errorResponse, json, readJson } from "../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        await requireAdmin(context.request, context.env, { mutation: true });
        const body = await readJson(context.request, 32 * 1024);
        const document = await restoreRevision(
            context.env,
            body.revisionId,
            actorFromRequest(context.request)
        );
        return json({ state: document.draft, meta: cmsMeta(document) });
    } catch (error) {
        return errorResponse(error);
    }
}
