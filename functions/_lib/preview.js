const readOnlyEnvironments = new WeakSet();

export function markPreviewReadOnly(env) {
    if (env && (typeof env === "object" || typeof env === "function")) {
        readOnlyEnvironments.add(env);
    }
}

export function isPreviewReadOnly(env) {
    return Boolean(
        env
        && (typeof env === "object" || typeof env === "function")
        && readOnlyEnvironments.has(env)
    );
}
