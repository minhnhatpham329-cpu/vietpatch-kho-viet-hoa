import { recordSiteVisit } from "../../../_lib/analytics.js";
import {
    assertSameOrigin,
    errorResponse,
    json
} from "../../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        assertSameOrigin(context.request);
        const result = await recordSiteVisit(context.env, context.request);
        const headers = result.cookie
            ? { "Set-Cookie": result.cookie }
            : {};
        return json({
            ok: true,
            counted: result.counted,
            newVisitor: result.newVisitor
        }, 200, headers);
    } catch (error) {
        return errorResponse(error);
    }
}
