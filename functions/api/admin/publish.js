import { requireAdmin } from "../../_lib/auth.js";
import { cmsMeta, publishDraft } from "../../_lib/cms.js";
import { actorFromRequest, errorResponse, json, readJson } from "../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        await requireAdmin(context.request, context.env, { mutation: true });
        const body = await readJson(context.request, 32 * 1024);
        const document = await publishDraft(
            context.env,
            actorFromRequest(context.request),
            body.note
        );
        return json({ state: document.draft, meta: cmsMeta(document) });
    } catch (error) {
        return errorResponse(error);
    }
}
