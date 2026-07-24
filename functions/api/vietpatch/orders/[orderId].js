import {
    getAccountById,
    getOwnedOrder,
    publicAccount,
    publicOrder,
    requireAccount
} from "../../../_lib/vietpatch-store.js";
import { errorResponse, json } from "../../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        const account = await requireAccount(context.request, context.env);
        const order = await getOwnedOrder(context.env, account, context.params.orderId);
        const updatedAccount = await getAccountById(context.env, account.id);
        return json({
            ...publicOrder(order),
            user: publicAccount(updatedAccount)
        });
    } catch (error) {
        return errorResponse(error);
    }
}
