import {
    createPaymentOrder,
    requireAccount
} from "../../../_lib/vietpatch-store.js";
import {
    assertSameOrigin,
    errorResponse,
    json,
    readJson
} from "../../../_lib/http.js";

export async function onRequestPost(context) {
    try {
        assertSameOrigin(context.request);
        const account = await requireAccount(context.request, context.env);
        const body = await readJson(context.request, 32 * 1024);
        const order = await createPaymentOrder(context.env, account, body);
        return json(order, 201);
    } catch (error) {
        return errorResponse(error);
    }
}
