import { requireAdmin } from "../../_lib/auth.js";
import { exportBackup } from "../../_lib/cms.js";
import { errorResponse, json } from "../../_lib/http.js";

export async function onRequestGet(context) {
    try {
        await requireAdmin(context.request, context.env);
        const date = new Date().toISOString().slice(0, 10);
        return json(await exportBackup(context.env), 200, {
            "Content-Disposition": `attachment; filename="vietpatch-cms-${date}.json"`
        });
    } catch (error) {
        return errorResponse(error);
    }
}
