(() => {
    "use strict";
    const preview = location.hostname.endsWith(".pages.dev");
    window.VIETPATCH_PREVIEW_READ_ONLY = preview;
    if (!preview) return;
    document.documentElement.dataset.previewMode = "read-only";
})();
