import {
    getOwnedOrder,
    orderQrUrl,
    requireAccount
} from "../../../../_lib/vietpatch-store.js";
import { errorResponse, securityHeaders } from "../../../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        const account = await requireAccount(context.request, context.env);
        const order = await getOwnedOrder(context.env, account, context.params.orderId);
        const headers = securityHeaders(new Headers({
            Location: orderQrUrl(context.env, order),
            "Cache-Control": "no-store"
        }));
        return new Response(null, { status: 302, headers });
    } catch (error) {
        return errorResponse(error);
    }
}
