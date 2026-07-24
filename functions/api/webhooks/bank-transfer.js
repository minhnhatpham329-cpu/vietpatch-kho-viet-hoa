import {
    confirmPaymentEvent,
    extractPaymentEvent,
    hasPaymentWebhookAccess
} from "../../_lib/vietpatch-store.js";
import {
    errorResponse,
    httpError,
    json,
    readJson
} from "../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        if (!hasPaymentWebhookAccess(context.request, context.env)) {
            throw httpError(401, "UNAUTHORIZED");
        }
        const body = await readJson(context.request, 128 * 1024);
        const payment = extractPaymentEvent(body);
        const result = await confirmPaymentEvent(context.env, payment);
        return json({
            success: true,
            matched: result.matched,
            orderId: result.order?.orderId || null
        });
    } catch (error) {
        return errorResponse(error);
    }
}
