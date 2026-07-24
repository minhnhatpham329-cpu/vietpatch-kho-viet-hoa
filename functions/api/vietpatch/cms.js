import { requireAdmin } from "../../_lib/auth.js";
import {
    cmsMeta,
    getCmsDocument,
    publicCmsState,
    saveDraft
} from "../../_lib/cms.js";
import {
    actorFromRequest,
    errorResponse,
    json,
    readJson
} from "../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const document = await getCmsDocument(context.env);
        if (url.searchParams.get("scope") === "draft") {
            await requireAdmin(context.request, context.env);
            return json({
                state: document.draft,
                meta: cmsMeta(document),
                mode: "d1-draft"
            });
        }
        return json({
            state: publicCmsState(document.published),
            meta: {
                publishedVersion: document.publishedVersion,
                publishedAt: document.publishedAt
            },
            mode: "d1-published"
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function onRequestPut(context) {
    try {
        await requireAdmin(context.request, context.env, { mutation: true });
        const body = await readJson(context.request);
        const document = await saveDraft(
            context.env,
            body.state || body,
            body.expectedVersion,
            actorFromRequest(context.request)
        );
        return json({
            state: document.draft,
            meta: cmsMeta(document),
            mode: "d1-draft"
        });
    } catch (error) {
        if (error?.message === "CMS_VERSION_CONFLICT" && error.current) {
            return json({
                error: "CMS_VERSION_CONFLICT",
                state: error.current.draft,
                meta: cmsMeta(error.current)
            }, 409);
        }
        return errorResponse(error);
    }
}
