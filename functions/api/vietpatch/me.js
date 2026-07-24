import { publicAccount, requireAccount } from "../../_lib/vietpatch-store.js";
import { errorResponse, json } from "../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        const account = await requireAccount(context.request, context.env);
        return json({ user: publicAccount(account) });
    } catch (error) {
        return errorResponse(error);
    }
}
