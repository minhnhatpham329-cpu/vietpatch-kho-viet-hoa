(function () {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observed = new WeakSet();
    const progressBars = [
        ".release-track > span",
        ".production-track > span",
        ".progress-track > span",
        ".progress-bar > span",
        ".progress-fill"
    ].join(",");

    const groups = [
        { selector: ".weekly-trailer", motion: "left" },
        { selector: ".hero-carousel", motion: "right" },
        { selector: ".catalog-toolbar", motion: "rise" },
        { selector: ".catalog-overview", motion: "wipe" },
        { selector: ".collection-index-note", motion: "rise" },
        { selector: ".games-grid > .game-card", motion: "scale", stagger: true },
        { selector: ".install-flow > header", motion: "rise" },
        { selector: ".install-flow-grid > article", motion: "rise", stagger: true },
        { selector: ".flow-guide-btn", motion: "rise" },
        { selector: ".archive-masthead", motion: "rise" },
        { selector: ".production-legend", motion: "wipe" },
        { selector: ".progress-list > *", motion: "rise", stagger: true },
        { selector: ".request-form-card", motion: "left" },
        { selector: ".request-list-area", motion: "right" },
        { selector: ".req-list > *", motion: "rise", stagger: true },
        { selector: ".library-empty", motion: "scale" },
        { selector: ".library-grid > *", motion: "scale", stagger: true },
        { selector: ".profile-content > *", motion: "rise", stagger: true }
    ];

    let observer = null;

    function prepareBars(scope) {
        const bars = [];
        if (scope.matches?.(progressBars)) bars.push(scope);
        scope.querySelectorAll?.(progressBars).forEach(bar => bars.push(bar));

        bars.forEach(bar => {
            if (bar.classList.contains("motion-bar")) return;
            const target = bar.style.width || getComputedStyle(bar).width;
            if (!target || target === "0px" || target === "auto") return;
            bar.style.setProperty("--motion-bar-target", target);
            bar.classList.add("motion-bar");
        });
    }

    function observeElement(element, motion, order) {
        if (observed.has(element)) return;
        observed.add(element);
        element.dataset.motion = motion;
        element.style.setProperty("--motion-order", String(order % 7));
        prepareBars(element);

        if (reduceMotion || !observer) {
            element.classList.add("motion-in");
            return;
        }
        observer.observe(element);
    }

    function register(scope) {
        groups.forEach(group => {
            const matches = [];
            if (scope.matches?.(group.selector)) matches.push(scope);
            scope.querySelectorAll?.(group.selector).forEach(element => matches.push(element));
            matches.forEach((element, index) => {
                observeElement(element, group.motion, group.stagger ? index : 0);
            });
        });
    }

    function boot() {
        document.documentElement.classList.add("motion-ready");

        if (!reduceMotion && "IntersectionObserver" in window) {
            observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("motion-in");
                    observer.unobserve(entry.target);
                });
            }, {
                threshold: 0.12,
                rootMargin: "0px 0px -7% 0px"
            });
        }

        register(document);

        const mutations = new MutationObserver(records => {
            records.forEach(record => {
                record.addedNodes.forEach(node => {
                    if (!(node instanceof Element)) return;
                    register(node);
                    prepareBars(node);
                });
            });
        });

        mutations.observe(document.querySelector("main") || document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
