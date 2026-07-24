(function () {
    "use strict";

    const STORAGE_KEY = "vietpatch_cms_v1";
    const syncContext = {
        admin: false,
        csrf: "",
        meta: null
    };

    const catalog = [
        { id: "wukong", title: "Black Myth: Wukong" },
        { id: "eldenring", title: "Elden Ring: Shadow of the Erdtree" },
        { id: "cyberpunk", title: "Cyberpunk 2077: Phantom Liberty" },
        { id: "residentevil4", title: "Resident Evil 4 Remake" },
        { id: "liesofp", title: "Lies of P" },
        { id: "hogwarts", title: "Hogwarts Legacy" },
        { id: "stray", title: "Stray" },
        { id: "witcher3", title: "The Witcher 3: Wild Hunt (Next-Gen)" },
        { id: "baldursgate3", title: "Baldur's Gate 3" },
        { id: "subnautica", title: "Subnautica" },
        { id: "rust", title: "Rust" },
        { id: "sekiro", title: "Sekiro: Shadows Die Twice" },
        { id: "rdr2", title: "Red Dead Redemption 2" },
        { id: "ghost", title: "Ghost of Tsushima: Director's Cut" }
    ];

    const defaults = {
        version: 1,
        updatedAt: null,
        site: {
            featuredGameId: "wukong",
            featuredGameIds: ["wukong", "eldenring", "cyberpunk"],
            catalogHeading: "Thư viện Việt hóa",
            catalogIntro: "Tìm đúng game, phiên bản và trạng thái kiểm thử trong một danh mục gọn, có bộ lọc và phân trang rõ ràng.",
            catalogPageSize: "9",
            trailerKicker: "TRAILER BOARD / GAME HOT GẦN ĐÂY",
            trailerHeading: "Trailer game hot tuần này.",
            trailerIntro: "Theo dõi những game đang được cộng đồng nhắc nhiều để VietPatch ưu tiên khảo sát text, font và khả năng đóng gói patch.",
            newsroomKicker: "PATCH NOTES / BẢN TIN MỚI",
            newsroomHeading: "Tin từ kho patch.",
            newsroomIntro: "Cập nhật bản dịch, hướng dẫn cài đặt và những thay đổi quan trọng từ đội VietPatch.",
            patchDeskKicker: "PATCHROOM / BẢN TIN TUẦN 26",
            patchDeskHeading: "Trong phòng biên tập.",
            patchDeskIntro: "Lịch patch, tín hiệu kiểm thử và những game cộng đồng đang chờ được gom vào một bàn tin sống."
        },
        trailers: [
            {
                id: "trailer-clair-obscur",
                videoId: "2VaLOc1FpSo",
                title: "Clair Obscur: Expedition 33",
                category: "RPG / Story",
                description: "RPG điện ảnh đang được nhắc nhiều nhờ cốt truyện, nhạc và phần chữ cực hợp để ưu tiên Việt hóa.",
                enabled: true
            },
            {
                id: "trailer-monster-hunter",
                videoId: "a_wNFT4j6qI",
                title: "Monster Hunter Wilds",
                category: "Action RPG",
                description: "Action RPG săn quái quy mô lớn, nhiều item và hướng dẫn hệ thống cần bản dịch dễ đọc.",
                enabled: true
            },
            {
                id: "trailer-kingdom-come",
                videoId: "bjMnS7_u1Qg",
                title: "Kingdom Come: Deliverance II",
                category: "Medieval RPG",
                description: "RPG trung cổ nhiều hội thoại, glossary lịch sử và nhiệm vụ dài, rất hợp dạng patch chú giải kỹ.",
                enabled: true
            },
            {
                id: "trailer-doom",
                videoId: "S7IEg0_qNXs",
                title: "DOOM: The Dark Ages",
                category: "Action / FPS",
                description: "Bom tấn hành động dark fantasy, phần UI, arsenal và codex có thể làm thành bản dịch gọn, sắc và dễ tra.",
                enabled: true
            }
        ],
        posts: [
            {
                id: "post-patch-notes-june",
                title: "Patch notes tháng 6: ưu tiên độ ổn định",
                category: "CẬP NHẬT",
                excerpt: "Các gói cài mới có kiểm tra phiên bản game, bản hoàn tác và ghi chú tương thích rõ ràng hơn.",
                cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/library_hero.jpg",
                link: "",
                publishedAt: "2026-06-25",
                published: true
            },
            {
                id: "post-font-qa",
                title: "Bảng kiểm font Việt cho game UE5",
                category: "KỸ THUẬT",
                excerpt: "Một vòng QA riêng cho dấu tiếng Việt, text tràn khung và các màn hình dùng font atlas.",
                cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2358720/library_hero.jpg",
                link: "",
                publishedAt: "2026-06-22",
                published: true
            },
            {
                id: "post-community-pick",
                title: "Community Pick: game nào nên vào lịch dịch?",
                category: "CỘNG ĐỒNG",
                excerpt: "Đội biên tập đang tổng hợp lượt đề xuất để chọn dự án khảo sát tiếp theo.",
                cover: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2054970/library_hero.jpg",
                link: "",
                publishedAt: "2026-06-19",
                published: true
            }
        ],
        requests: [
            {
                id: "request-dragons-dogma-2",
                title: "Dragon's Dogma 2",
                logoUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2054970/header.jpg",
                engine: "RE Engine",
                platform: "Steam",
                link: "https://store.steampowered.com/app/2054970/Dragons_Dogma_2/",
                notes: "Game cốt truyện sâu sắc, lời thoại phong cách cổ trang Anh ngữ khá phức tạp, cần được dịch ngữ Việt để tăng trải nghiệm.",
                votes: 1845,
                published: true
            },
            {
                id: "request-alan-wake-2",
                title: "Alan Wake 2",
                logoUrl: "",
                engine: "Northlight",
                platform: "Epic Games",
                link: "https://store.epicgames.com/vi/p/alan-wake-2",
                notes: "Game kinh dị tâm lý cực kì đỉnh cao của Remedy, rất nhiều tài liệu trinh thám phức tạp cần Việt hóa.",
                votes: 1532,
                published: true
            },
            {
                id: "request-dead-space-remake",
                title: "Dead Space Remake",
                logoUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1693980/header.jpg",
                engine: "Frostbite",
                platform: "Steam",
                link: "https://store.steampowered.com/app/1693980/Dead_Space/",
                notes: "Muốn trải nghiệm cảm giác kinh dị ngoài vũ trụ một cách trọn vẹn hơn. Việt hóa sẽ giúp hiểu rõ nguồn gốc Marker.",
                votes: 945,
                published: true
            },
            {
                id: "request-sifu",
                title: "Sifu",
                logoUrl: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2138710/header.jpg",
                engine: "Unreal Engine 4",
                platform: "Steam",
                link: "https://store.steampowered.com/app/2138710/Sifu/",
                notes: "Game võ thuật hành động xuất sắc, mong muốn Việt hóa giao diện bảng ngọc kỹ năng và các cuộc hội thoại nói chuyện.",
                votes: 720,
                published: true
            }
        ],
        hiddenGameIds: [],
        customGames: [],
        gameOverrides: {}
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function text(value, fallback = "") {
        return typeof value === "string" ? value.trim() : fallback;
    }

    function normalizeSite(site) {
        const source = site && typeof site === "object" ? site : {};
        const result = {};

        Object.keys(defaults.site).forEach(key => {
            if (key === "featuredGameIds") return;
            result[key] = text(source[key], defaults.site[key]) || defaults.site[key];
        });

        const legacyFeaturedId = text(source.featuredGameId, defaults.site.featuredGameId);
        const featuredSource = Array.isArray(source.featuredGameIds)
            ? source.featuredGameIds
            : [legacyFeaturedId, ...defaults.site.featuredGameIds];
        result.featuredGameIds = [...new Set(featuredSource
            .map(item => text(item))
            .filter(item => /^[a-zA-Z0-9_-]{1,80}$/.test(item)))]
            .slice(0, 6);
        if (!result.featuredGameIds.length) result.featuredGameIds = clone(defaults.site.featuredGameIds);
        result.featuredGameId = result.featuredGameIds[0] || legacyFeaturedId;

        return result;
    }

    function normalizeTrailers(trailers) {
        const source = Array.isArray(trailers) ? trailers : defaults.trailers;

        return source.map((item, index) => ({
            id: text(item.id, `trailer-${index + 1}`),
            videoId: extractYouTubeId(item.videoId || item.url),
            title: text(item.title, `Trailer ${index + 1}`),
            category: text(item.category, "GAME TRAILER"),
            description: text(item.description),
            enabled: item.enabled !== false
        })).filter(item => item.videoId && item.title);
    }

    function normalizePosts(posts) {
        const source = Array.isArray(posts) ? posts : defaults.posts;

        return source.map((item, index) => ({
            id: text(item.id, `post-${index + 1}`),
            title: text(item.title, `Bài viết ${index + 1}`),
            category: text(item.category, "BẢN TIN"),
            excerpt: text(item.excerpt),
            cover: safeUrl(item.cover),
            link: safeUrl(item.link),
            publishedAt: text(item.publishedAt, new Date().toISOString().slice(0, 10)),
            published: item.published !== false
        })).filter(item => item.title);
    }

    function normalizeRequests(requests) {
        const source = Array.isArray(requests) ? requests : defaults.requests;

        return source.map((item, index) => ({
            id: text(item.id, `request-${index + 1}`),
            title: text(item.title, `Game yêu cầu ${index + 1}`),
            logoUrl: safeAssetUrl(item.logoUrl || item.imageUrl),
            engine: text(item.engine, "Khác"),
            platform: text(item.platform, "Nhiều nền tảng"),
            link: safeUrl(item.link),
            notes: text(item.notes),
            votes: Math.max(0, Math.round(Number(item.votes) || 0)),
            published: item.published !== false
        })).filter(item => item.title);
    }

    function safeAssetUrl(value) {
        const candidate = text(value);
        if (!candidate) return "";

        if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(candidate)) {
            return candidate;
        }

        return safeUrl(candidate);
    }

    function normalizeTags(value) {
        const source = Array.isArray(value)
            ? value
            : text(value).split(",");

        return [...new Set(source
            .map(item => text(item).replace(/^#+/, ""))
            .filter(Boolean))]
            .slice(0, 6);
    }

    function normalizeBadge(value, fallback = "") {
        const normalized = text(value, fallback).toLocaleLowerCase("en");
        return ["hot", "new"].includes(normalized) ? normalized : "";
    }

    function normalizeProgress(value, fallback = 100) {
        if (value === "" || value == null) return fallback;
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(100, Math.max(0, Math.round(number)));
    }

    function normalizeCredits(value, fallback = {}, partial = false) {
        const source = value && typeof value === "object" ? value : {};
        const defaultCredits = partial
            ? {}
            : {
                translator: "VietPatch Community",
                editor: "Content Studio",
                technical: "Patchroom",
                qa: "QA Board"
            };

        return {
            translator: text(source.translator, fallback.translator || defaultCredits.translator),
            editor: text(source.editor, fallback.editor || defaultCredits.editor),
            technical: text(source.technical, fallback.technical || defaultCredits.technical),
            qa: text(source.qa, fallback.qa || defaultCredits.qa)
        };
    }

    function normalizeScreenshots(value, fallback = []) {
        const source = Array.isArray(value)
            ? value
            : text(value).split(/\r?\n/);
        const fallbackList = Array.isArray(fallback) ? fallback : [];
        const normalized = source
            .map(item => safeAssetUrl(item))
            .filter(Boolean)
            .slice(0, 8);

        return normalized.length ? normalized : fallbackList
            .map(item => safeAssetUrl(item))
            .filter(Boolean)
            .slice(0, 8);
    }

    function normalizeGameFields(entry, fallback = {}, partial = false) {
        const source = entry && typeof entry === "object" ? entry : {};
        const fallbackTags = Array.isArray(fallback.tags) ? fallback.tags : [];
        const type = text(source.type, fallback.type || (partial ? "" : "Free"));
        const price = type.toLocaleLowerCase("en") === "free"
            ? 0
            : (source.price === "" || source.price == null
                ? (fallback.price === "" || fallback.price == null ? "" : Math.max(0, Number(fallback.price) || 0))
                : Math.max(0, Number(source.price) || 0));

        return {
            title: text(source.title, fallback.title),
            engine: text(source.engine, fallback.engine || (partial ? "" : "Unreal Engine 5")),
            engineKey: text(source.engineKey, fallback.engineKey || (partial ? "" : "other")),
            developer: text(source.developer, fallback.developer || (partial ? "" : "Community Studio")),
            version: text(source.version, fallback.version),
            size: text(source.size, fallback.size),
            price,
            type,
            progress: source.progress === "" || source.progress == null
                ? (fallback.progress ?? (partial ? "" : 100))
                : normalizeProgress(source.progress, fallback.progress ?? 100),
            downloads: text(source.downloads, fallback.downloads || (partial ? "" : "0")),
            date: text(source.date, fallback.date || (partial ? "" : new Date().toISOString().slice(0, 10))),
            description: text(source.description ?? source.desc, fallback.description ?? fallback.desc),
            notes: text(source.notes, fallback.notes),
            downloadUrl: safeUrl(source.downloadUrl || fallback.downloadUrl),
            imageUrl: safeAssetUrl(source.imageUrl || source.coverImage || fallback.imageUrl),
            badge: normalizeBadge(source.badge, fallback.badge),
            tags: normalizeTags(source.tags ?? fallbackTags),
            credits: normalizeCredits(source.credits, fallback.credits, partial),
            screenshots: normalizeScreenshots(source.screenshots, fallback.screenshots)
        };
    }

    function normalizeCustomGames(games) {
        const source = Array.isArray(games) ? games : [];

        return source.map((item, index) => {
            const fields = normalizeGameFields(item, {
                title: `Game mới ${index + 1}`,
                version: "v1.0.0",
                size: "Đang cập nhật",
                type: "Free",
                progress: 100,
                downloads: "0"
            });

            return {
                id: text(item?.id, createId("game")),
                ...fields
            };
        }).filter(item => item.id && item.title);
    }

    function normalizeOverrides(overrides) {
        const source = overrides && typeof overrides === "object" ? overrides : {};
        const result = {};

        catalog.forEach(game => {
            const entry = source[game.id];
            if (!entry || typeof entry !== "object") return;

            result[game.id] = normalizeGameFields(entry, {}, true);
        });

        return result;
    }

    function normalizeHiddenGameIds(ids) {
        const source = Array.isArray(ids) ? ids : [];
        const allowed = new Set(catalog.map(game => game.id));

        return [...new Set(source
            .map(item => text(item))
            .filter(item => allowed.has(item)))];
    }

    function normalize(state) {
        const source = state && typeof state === "object" ? state : {};

        return {
            version: 1,
            updatedAt: source.updatedAt || null,
            site: normalizeSite(source.site),
            trailers: normalizeTrailers(source.trailers),
            posts: normalizePosts(source.posts),
            requests: normalizeRequests(source.requests),
            hiddenGameIds: normalizeHiddenGameIds(source.hiddenGameIds),
            customGames: normalizeCustomGames(source.customGames),
            gameOverrides: normalizeOverrides(source.gameOverrides)
        };
    }

    function seedState() {
        return window.VIETPATCH_CMS_SEED ? normalize(window.VIETPATCH_CMS_SEED) : clone(defaults);
    }

    function isNewerState(candidate, current) {
        const candidateTime = Date.parse(candidate?.updatedAt || "");
        const currentTime = Date.parse(current?.updatedAt || "");
        return Number.isFinite(candidateTime) && (!Number.isFinite(currentTime) || candidateTime > currentTime);
    }

    function load() {
        const seed = seedState();
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return seed;

        try {
            const current = normalize(JSON.parse(saved));
            return isNewerState(seed, current) ? seed : current;
        } catch (error) {
            console.warn("VietPatch CMS data is invalid. Loading seed.", error);
            return seed;
        }
    }

    function cache(state) {
        const normalized = normalize(state);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        window.dispatchEvent(new CustomEvent("vietpatch:cms-updated", {
            detail: clone(normalized)
        }));
        return normalized;
    }

    async function loadRemote(options = {}) {
        const local = load();
        const draftScope = options.scope === "draft";
        const endpoint = draftScope ? "/api/vietpatch/cms?scope=draft" : "/api/vietpatch/cms";

        try {
            const response = await fetch(endpoint, {
                credentials: "same-origin",
                headers: { Accept: "application/json" }
            });
            if (!response.ok) throw new Error(`CMS_READ_${response.status}`);

            const payload = await response.json();
            if (payload.meta) syncContext.meta = clone(payload.meta);
            const remote = normalize(payload.state);
            if (!draftScope && options.preferLocalNewer && isNewerState(local, remote)) {
                return options.syncLocalNewer ? await saveRemote(local) : local;
            }
            return cache(remote);
        } catch (error) {
            if (options.strict || draftScope) throw error;
            console.warn("Không đọc được CMS từ server, dùng cache local.", error);
            return local;
        }
    }

    function save(state) {
        const normalized = normalize(state);
        normalized.updatedAt = new Date().toISOString();
        return cache(normalized);
    }

    async function saveRemote(state) {
        const normalized = normalize(state);
        normalized.updatedAt = new Date().toISOString();
        const headers = {
            Accept: "application/json",
            "Content-Type": "application/json"
        };
        if (syncContext.admin && syncContext.csrf) {
            headers["X-CSRF-Token"] = syncContext.csrf;
        }

        const response = await fetch("/api/vietpatch/cms", {
            method: "PUT",
            credentials: "same-origin",
            headers,
            body: JSON.stringify({
                state: normalized,
                expectedVersion: syncContext.meta?.draftVersion
            })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(payload.error || `CMS_SAVE_${response.status}`);
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        if (payload.meta) syncContext.meta = clone(payload.meta);
        return cache(payload.state || normalized);
    }

    function configureAdminSession(payload = {}) {
        syncContext.admin = true;
        syncContext.csrf = String(payload.csrf || "");
        if (payload.meta) syncContext.meta = clone(payload.meta);
    }

    function updateSyncMeta(meta) {
        syncContext.meta = meta ? clone(meta) : null;
    }

    function getSyncMeta() {
        return syncContext.meta ? clone(syncContext.meta) : null;
    }

    function getCsrfToken() {
        return syncContext.csrf;
    }

    function reset() {
        localStorage.removeItem(STORAGE_KEY);
        return seedState();
    }

    function safeUrl(value) {
        const candidate = text(value);
        if (!candidate) return "";

        try {
            const url = new URL(candidate, window.location.origin);
            if (url.protocol !== "http:" && url.protocol !== "https:") return "";
            return url.href;
        } catch {
            return "";
        }
    }

    function extractYouTubeId(value) {
        const candidate = text(value);
        if (!candidate) return "";
        if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) return candidate;

        try {
            const url = new URL(candidate);
            if (url.hostname.includes("youtu.be")) {
                return url.pathname.split("/").filter(Boolean)[0] || "";
            }

            if (url.hostname.includes("youtube.com") || url.hostname.includes("youtube-nocookie.com")) {
                const fromQuery = url.searchParams.get("v");
                if (fromQuery) return fromQuery;

                const parts = url.pathname.split("/").filter(Boolean);
                const markerIndex = parts.findIndex(part => part === "embed" || part === "shorts" || part === "live");
                return markerIndex >= 0 ? parts[markerIndex + 1] || "" : "";
            }
        } catch {
            return "";
        }

        return "";
    }

    function createId(prefix) {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    window.VietPatchCMS = {
        STORAGE_KEY,
        catalog: clone(catalog),
        defaults: clone(defaults),
        load,
        loadRemote,
        save,
        saveRemote,
        reset,
        normalize,
        safeUrl,
        safeAssetUrl,
        normalizeTags,
        normalizeScreenshots,
        normalizeCredits,
        extractYouTubeId,
        createId,
        clone,
        configureAdminSession,
        updateSyncMeta,
        getSyncMeta,
        getCsrfToken
    };
})();
