import { submitUpdateReport } from "../../../../_lib/community.js";
import {
    errorResponse,
    json,
    readJson
} from "../../../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        const input = await readJson(context.request, 8 * 1024);
        return json({
            report: await submitUpdateReport(
                context.env,
                context.request,
                context.params.gameId,
                input
            )
        }, 201);
    } catch (error) {
        return errorResponse(error);
    }
}
