(() => {
    "use strict";

    const entry = document.getElementById("brand-entry");
    const skip = document.getElementById("brand-entry-skip");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const storageKey = "vietpatch-brand-entry-seen";
    let closeTimer = null;

    if (!entry) return;

    const closeEntry = immediate => {
        if (entry.hidden) return;
        window.clearTimeout(closeTimer);
        document.body.classList.remove("brand-entry-active");

        if (immediate || reducedMotion) {
            entry.hidden = true;
            entry.setAttribute("aria-hidden", "true");
            return;
        }

        entry.classList.add("is-leaving");
        window.setTimeout(() => {
            entry.hidden = true;
            entry.setAttribute("aria-hidden", "true");
            entry.classList.remove("is-leaving");
        }, 420);
    };

    const hasSeenEntry = () => {
        try {
            return sessionStorage.getItem(storageKey) === "1";
        } catch {
            return false;
        }
    };

    const markSeen = () => {
        try {
            sessionStorage.setItem(storageKey, "1");
        } catch {
            // The entrance remains functional if storage is unavailable.
        }
    };

    const showEntry = () => {
        if (reducedMotion || hasSeenEntry()) {
            closeEntry(true);
            return;
        }

        entry.hidden = false;
        entry.setAttribute("aria-hidden", "false");
        document.body.classList.add("brand-entry-active");
        markSeen();
        closeTimer = window.setTimeout(() => closeEntry(false), 1650);
    };

    skip?.addEventListener("click", () => closeEntry(false));
    window.addEventListener("keydown", event => {
        if (event.key === "Escape") closeEntry(false);
    });
    window.addEventListener("pagehide", () => window.clearTimeout(closeTimer), { once: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", showEntry, { once: true });
    } else {
        showEntry();
    }
})();
