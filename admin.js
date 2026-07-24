(function () {
    "use strict";

    const CMS = window.VietPatchCMS;
    if (!CMS) return;

    const panelTitles = {
        dashboard: "Tổng quan nội dung",
        homepage: "Bố cục trang chủ",
        trailers: "Quản lý trailer tuần",
        requests: "Đề xuất từ cộng đồng",
        posts: "Quản lý bài đăng",
        patches: "Kho game và bản Việt hóa",
        backup: "Lịch sử và sao lưu"
    };

    let state = CMS.load();
    let selectedTrailerId = state.trailers[0]?.id || "";
    let selectedRequestId = state.requests[0]?.id || "";
    let selectedPostId = state.posts[0]?.id || "";
    const NEW_GAME_ID = "__new_game__";
    let selectedGameId = CMS.catalog[0]?.id || "";
    let saveQueue = Promise.resolve();
    let revisionsLoaded = false;

    const byId = id => document.getElementById(id);
    const escapeHtml = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    function getCustomGames() {
        if (!Array.isArray(state.customGames)) state.customGames = [];
        return state.customGames;
    }

    function getHiddenGameIds() {
        if (!Array.isArray(state.hiddenGameIds)) state.hiddenGameIds = [];
        return state.hiddenGameIds;
    }

    function isCustomGame(gameId) {
        return getCustomGames().some(game => game.id === gameId);
    }

    function isHiddenBaseGame(gameId) {
        return getHiddenGameIds().includes(gameId);
    }

    function refreshSelections() {
        selectedTrailerId = state.trailers[0]?.id || "";
        selectedRequestId = state.requests[0]?.id || "";
        selectedPostId = state.posts[0]?.id || "";
        selectedGameId = getAdminCatalog()[0]?.id || NEW_GAME_ID;
    }

    function getAdminCatalog() {
        const customGames = getCustomGames().map(game => ({
            id: game.id,
            title: game.title,
            custom: true
        }));

        const baseGames = CMS.catalog.map(game => ({
            ...game,
            title: state.gameOverrides[game.id]?.title || game.title,
            hidden: isHiddenBaseGame(game.id),
            custom: false
        }));

        return [...baseGames, ...customGames];
    }

    function getEditableGame(gameId) {
        const custom = getCustomGames().find(game => game.id === gameId);
        if (custom) return { type: "custom", data: custom };

        const base = CMS.catalog.find(game => game.id === gameId);
        if (!base) return { type: "new", data: {} };

        return {
            type: "base",
            data: {
                ...base,
                ...(state.gameOverrides[gameId] || {})
            }
        };
    }

    function compactPatchData(data) {
        const result = {};
        Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                if (value.length) result[key] = value;
                return;
            }

            if (value && typeof value === "object") {
                const compact = compactPatchData(value);
                if (Object.keys(compact).length) result[key] = compact;
                return;
            }

            if (value !== "" && value != null) result[key] = value;
        });
        return result;
    }

    function parseAssetList(value) {
        const rawItems = String(value || "")
            .split(/\r?\n/)
            .map(item => item.trim())
            .filter(Boolean);
        const invalid = rawItems.find(item => !CMS.safeAssetUrl(item));

        return {
            items: rawItems.map(item => CMS.safeAssetUrl(item)).filter(Boolean).slice(0, 8),
            invalid
        };
    }

    function updatePatchPreview() {
        const form = byId("patch-form");
        const preview = byId("patch-media-preview");
        const title = form.elements.title.value.trim() || "Ảnh kho patch sẽ hiện ở đây";
        const imageUrl = CMS.safeAssetUrl(form.elements.imageUrl.value);

        preview.classList.toggle("has-image", Boolean(imageUrl));
        preview.style.backgroundImage = imageUrl
            ? `linear-gradient(180deg, rgba(23,18,15,0.08), rgba(23,18,15,0.86)), url("${imageUrl}")`
            : "";
        preview.innerHTML = `
            <span>${imageUrl ? "COVER READY" : "PATCH COVER"}</span>
            <strong>${escapeHtml(title)}</strong>
        `;
    }

    function syncPatchPriceField() {
        const form = byId("patch-form");
        const price = form.elements.price;
        const isFree = form.elements.type.value.toLocaleLowerCase("en") === "free";
        if (isFree) price.value = "0";
        price.disabled = isFree;
        price.title = isFree ? "Patch Free luôn có giá 0đ." : "";
    }

    function getPatchPayload(form, fallback = {}) {
        const rawDownload = form.elements.downloadUrl.value.trim();
        const rawImage = form.elements.imageUrl.value.trim();
        const downloadUrl = CMS.safeUrl(rawDownload);
        const imageUrl = CMS.safeAssetUrl(rawImage);
        const screenshots = parseAssetList(form.elements.screenshots.value);
        const type = form.elements.type.value;

        if (rawDownload && !downloadUrl) {
            return { error: "Link tải phải là địa chỉ HTTP hoặc HTTPS hợp lệ." };
        }

        if (rawImage && !imageUrl) {
            return { error: "Ảnh cover phải là link HTTP/HTTPS hoặc ảnh upload hợp lệ." };
        }

        if (screenshots.invalid) {
            return { error: `Link ảnh gallery chưa hợp lệ: ${screenshots.invalid}` };
        }

        return {
            title: form.elements.title.value.trim() || fallback.title || "",
            developer: form.elements.developer.value.trim(),
            engine: form.elements.engine.value.trim(),
            engineKey: form.elements.engineKey.value,
            type,
            version: form.elements.version.value.trim(),
            size: form.elements.size.value.trim(),
            price: type.toLocaleLowerCase("en") === "free" ? 0 : form.elements.price.value,
            progress: form.elements.progress.value,
            downloads: form.elements.downloads.value.trim(),
            date: form.elements.date.value,
            badge: ["new", "hot"].includes(form.elements.badge.value) ? form.elements.badge.value : "",
            tags: Array.isArray(fallback.tags) ? fallback.tags : [],
            imageUrl,
            downloadUrl,
            screenshots: screenshots.items,
            credits: {
                translator: form.elements.creditTranslator.value.trim(),
                editor: form.elements.creditEditor.value.trim(),
                technical: form.elements.creditTechnical.value.trim(),
                qa: form.elements.creditQa.value.trim()
            },
            description: form.elements.description.value.trim(),
            notes: form.elements.notes.value.trim()
        };
    }

    function showToast(message, type = "success") {
        const wrap = byId("studio-toast-wrap");
        const toast = document.createElement("div");
        toast.className = `studio-toast ${type}`;
        toast.innerHTML = `<i class="fa-solid ${type === "error" ? "fa-triangle-exclamation" : "fa-circle-check"}"></i><span>${escapeHtml(message)}</span>`;
        wrap.appendChild(toast);
        window.setTimeout(() => toast.remove(), 3200);
    }

    function setSaveState(message, saving = false, unsynced = false) {
        const element = byId("save-state");
        element.classList.toggle("saving", saving);
        element.classList.toggle("unsynced", unsynced);
        element.querySelector("i").className = `fa-solid ${saving ? "fa-rotate fa-spin" : (unsynced ? "fa-triangle-exclamation" : "fa-circle-check")}`;
        element.querySelector("span").textContent = message;
    }

    function updatePublishUi() {
        const meta = CMS.getSyncMeta();
        const publishButton = byId("publish-btn");
        if (!publishButton) return;
        publishButton.disabled = !meta?.dirty;
        publishButton.title = meta?.dirty
            ? "Đưa toàn bộ bản nháp hiện tại ra website"
            : "Website đang dùng đúng bản mới nhất";
    }

    function persist(message) {
        const snapshot = CMS.clone(state);
        setSaveState("Đang lưu", true);
        saveQueue = saveQueue.then(async () => {
            try {
                const saved = await CMS.saveRemote(snapshot);
                const currentChanged = JSON.stringify(CMS.normalize(state)) !== JSON.stringify(CMS.normalize(snapshot));
                if (!currentChanged) state = saved;
                setSaveState("Bản nháp đã đồng bộ", false);
                byId("server-status").innerHTML = `<i class="fa-solid fa-cloud"></i> MÁY CHỦ ĐÃ KẾT NỐI`;
                showToast(message);
                updatePublishUi();
                renderDashboard();
                renderBackupReport();
            } catch (error) {
                setSaveState("Có thay đổi chưa lưu", false, true);
                if (error.message === "CMS_VERSION_CONFLICT") {
                    showToast("Dữ liệu trên máy chủ vừa thay đổi ở nơi khác. Hãy tải lại trang trước khi sửa tiếp.", "error");
                } else if (error.message === "ADMIN_AUTH_REQUIRED" || error.status === 401) {
                    window.location.replace("/admin-login.html?returnTo=%2Fadmin.html");
                } else {
                    showToast(`Máy chủ chưa lưu được: ${error.message}`, "error");
                }
                throw error;
            }
        }).catch(() => {});
        return saveQueue;
    }

    function switchPanel(panelId) {
        document.querySelectorAll(".studio-panel").forEach(panel => {
            panel.classList.toggle("active", panel.id === `panel-${panelId}`);
        });
        document.querySelectorAll(".studio-nav-btn").forEach(button => {
            button.classList.toggle("active", button.dataset.panel === panelId);
        });

        byId("panel-title").textContent = panelTitles[panelId] || "VietPatch Studio";
        document.body.classList.remove("sidebar-open");

        if (panelId === "homepage") fillHomepageForm();
        if (panelId === "trailers") renderTrailerManager();
        if (panelId === "requests") renderRequestManager();
        if (panelId === "posts") renderPostManager();
        if (panelId === "patches") renderPatchManager();
        if (panelId === "backup") {
            renderBackupReport();
            loadRevisions();
        }
    }

    function renderDashboard() {
        const enabledTrailers = state.trailers.filter(item => item.enabled).length;
        const publishedRequests = state.requests.filter(item => item.published).length;
        const totalGames = getAdminCatalog().length;
        const pageSize = Number(state.site.catalogPageSize) || 9;
        const featuredGame = getAdminCatalog().find(game => game.id === state.site.featuredGameId);
        const linkedPatches = [
            ...Object.values(state.gameOverrides).filter(item => item.downloadUrl),
            ...getCustomGames().filter(item => item.downloadUrl)
        ].length;
        const updatedText = state.updatedAt
            ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(state.updatedAt))
            : "Chưa chỉnh sửa";

        byId("dashboard-metrics").innerHTML = [
            ["Trailer đang bật", enabledTrailers, "fa-film"],
            ["Yêu cầu đang hiện", publishedRequests, "fa-square-poll-vertical"],
            ["Game có link tải", linkedPatches, "fa-link"],
            ["Tổng game trong kho", totalGames, "fa-box-archive"]
        ].map(([label, value, icon]) => `
            <article class="metric">
                <div class="metric-head"><span>${label}</span><i class="fa-solid ${icon}"></i></div>
                <strong>${value}</strong>
            </article>
        `).join("");

        byId("content-health").innerHTML = `
            <div class="health-row">
                <div><strong>Playlist trailer</strong><br><span>Cần ít nhất một trailer đang bật</span></div>
                <div class="health-value">${enabledTrailers ? "SẴN SÀNG" : "CHƯA CÓ"}</div>
            </div>
            <div class="health-row">
                <div><strong>Game tiêu điểm</strong><br><span>Hồ sơ lớn trên trang chủ</span></div>
                <div class="health-value">${escapeHtml(featuredGame?.title || "CHƯA CHỌN")}</div>
            </div>
            <div class="health-row">
                <div><strong>Bảng yêu cầu</strong><br><span>Game cộng đồng đang bình chọn</span></div>
                <div class="health-value">${publishedRequests} GAME</div>
            </div>
            <div class="health-row">
                <div><strong>Phân trang thư viện</strong><br><span>Số game hiển thị trong mỗi trang</span></div>
                <div class="health-value">${pageSize} GAME</div>
            </div>
            <div class="health-row">
                <div><strong>Link tải</strong><br><span>Patch đã gắn nguồn tải thực tế</span></div>
                <div class="health-value">${linkedPatches}/${totalGames}</div>
            </div>
            <div class="health-row">
                <div><strong>Lần lưu cuối</strong><br><span>Bản nháp trên máy chủ trung tâm</span></div>
                <div class="health-value">${escapeHtml(updatedText)}</div>
            </div>
        `;
    }

    function fillHomepageForm() {
        const form = byId("homepage-form");
        const games = getAdminCatalog().filter(game => !game.hidden);
        const selectedId = games.some(game => game.id === state.site.featuredGameId)
            ? state.site.featuredGameId
            : (games[0]?.id || "");
        const featuredSelect = byId("featured-game-select");
        featuredSelect.innerHTML = games.map(game => `
            <option value="${escapeHtml(game.id)}">${escapeHtml(game.title)}</option>
        `).join("");
        featuredSelect.value = selectedId;
        form.elements.catalogHeading.value = state.site.catalogHeading || "Thư viện Việt hóa";
        form.elements.catalogIntro.value = state.site.catalogIntro || "";
        form.elements.catalogPageSize.value = String(state.site.catalogPageSize || "9");
    }

    function renderTrailerManager() {
        if (selectedTrailerId && !state.trailers.some(item => item.id === selectedTrailerId)) {
            selectedTrailerId = state.trailers[0]?.id || "";
        }

        const featuredTrailerId = state.trailers.find(item => item.enabled)?.id || "";

        byId("trailer-list").innerHTML = state.trailers.length
            ? state.trailers.map((item, index) => `
                <div class="manager-item ${item.id === selectedTrailerId ? "active" : ""}">
                    <button class="manager-item-main" type="button" data-edit-trailer="${escapeHtml(item.id)}">
                        <strong>${escapeHtml(item.title)}</strong>
                        <span><i class="status-dot ${item.enabled ? "" : "off"}"></i> ${escapeHtml(item.category)} / ${escapeHtml(item.videoId)}${item.id === featuredTrailerId ? `<em class="weekly-home-badge">TRANG CHỦ</em>` : ""}</span>
                    </button>
                    <div class="manager-item-actions">
                        <button type="button" data-move-trailer="-1" data-id="${escapeHtml(item.id)}" title="Đưa lên" ${index === 0 ? "disabled" : ""}><i class="fa-solid fa-arrow-up"></i></button>
                        <button type="button" data-move-trailer="1" data-id="${escapeHtml(item.id)}" title="Đưa xuống" ${index === state.trailers.length - 1 ? "disabled" : ""}><i class="fa-solid fa-arrow-down"></i></button>
                        <button class="danger" type="button" data-delete-trailer="${escapeHtml(item.id)}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join("")
            : `<p>Chưa có trailer. Nhấn dấu + để tạo playlist.</p>`;

        fillTrailerForm(state.trailers.find(item => item.id === selectedTrailerId));
    }

    function fillTrailerForm(item) {
        const form = byId("trailer-form");
        form.reset();
        form.elements.id.value = item?.id || "";
        form.elements.videoId.value = item?.videoId || "";
        form.elements.title.value = item?.title || "";
        form.elements.category.value = item?.category || "";
        form.elements.description.value = item?.description || "";
        form.elements.enabled.checked = item ? item.enabled : true;
        byId("trailer-editor-title").textContent = item ? "Chỉnh sửa trailer" : "Thêm trailer";
        updateTrailerPreview();
    }

    function updateTrailerPreview() {
        const form = byId("trailer-form");
        const videoId = CMS.extractYouTubeId(form.elements.videoId.value);
        const preview = byId("trailer-preview");

        if (!videoId) {
            preview.className = "trailer-preview";
            preview.removeAttribute("style");
            preview.innerHTML = `<i class="fa-brands fa-youtube"></i><span>Dán link YouTube để xem thumbnail</span>`;
            return;
        }

        preview.className = "trailer-preview has-image";
        preview.style.backgroundImage = `url("https://img.youtube.com/vi/${videoId}/hqdefault.jpg")`;
        preview.innerHTML = `<span>${escapeHtml(form.elements.title.value || "Trailer mới")}</span>`;
    }

    function renderRequestManager() {
        if (selectedRequestId && !state.requests.some(item => item.id === selectedRequestId)) {
            selectedRequestId = state.requests[0]?.id || "";
        }

        byId("request-list").innerHTML = state.requests.length
            ? state.requests.map((item, index) => `
                <div class="manager-item ${item.id === selectedRequestId ? "active" : ""}">
                    <button class="manager-item-main" type="button" data-edit-request="${escapeHtml(item.id)}">
                        <strong>${escapeHtml(item.title)}</strong>
                        <span><i class="status-dot ${item.published ? "" : "off"}"></i> ${escapeHtml(item.engine)} / ${escapeHtml(item.platform)} / ${Number(item.votes) || 0} vote</span>
                    </button>
                    <div class="manager-item-actions">
                        <button type="button" data-move-request="-1" data-id="${escapeHtml(item.id)}" title="Đưa lên" ${index === 0 ? "disabled" : ""}><i class="fa-solid fa-arrow-up"></i></button>
                        <button type="button" data-move-request="1" data-id="${escapeHtml(item.id)}" title="Đưa xuống" ${index === state.requests.length - 1 ? "disabled" : ""}><i class="fa-solid fa-arrow-down"></i></button>
                        <button class="danger" type="button" data-delete-request="${escapeHtml(item.id)}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join("")
            : `<p>Chưa có yêu cầu. Nhấn dấu + để thêm game vào bảng bình chọn.</p>`;

        fillRequestForm(state.requests.find(item => item.id === selectedRequestId));
    }

    function fillRequestForm(item) {
        const form = byId("request-form");
        form.reset();
        form.elements.id.value = item?.id || "";
        form.elements.title.value = item?.title || "";
        form.elements.logoUrl.value = item?.logoUrl || "";
        form.elements.engine.value = item?.engine || "";
        form.elements.platform.value = item?.platform || "";
        form.elements.votes.value = item?.votes ?? "";
        form.elements.link.value = item?.link || "";
        form.elements.notes.value = item?.notes || "";
        form.elements.published.checked = item ? item.published : true;
        byId("request-editor-title").textContent = item ? "Chỉnh sửa yêu cầu" : "Thêm yêu cầu";
        updateRequestPreview();
    }

    function updateRequestPreview() {
        const form = byId("request-form");
        const preview = byId("request-preview");
        const title = form.elements.title.value.trim() || "Tên game yêu cầu";
        const logoUrl = CMS.safeAssetUrl(form.elements.logoUrl.value);
        const initials = title.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "VP";

        preview.classList.toggle("has-image", Boolean(logoUrl));
        preview.innerHTML = `
            <div class="request-preview-logo">
                ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(title)} logo">` : `<span>${escapeHtml(initials)}</span>`}
            </div>
            <div>
                <span>COMMUNITY PIN</span>
                <strong>${escapeHtml(title)}</strong>
                <small>${escapeHtml(form.elements.engine.value || "Engine")} / ${escapeHtml(form.elements.platform.value || "Nền tảng")}</small>
            </div>
        `;
    }

    function renderPostManager() {
        if (selectedPostId && !state.posts.some(item => item.id === selectedPostId)) {
            selectedPostId = state.posts[0]?.id || "";
        }

        const sorted = [...state.posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
        byId("post-list").innerHTML = sorted.length
            ? sorted.map(item => `
                <div class="manager-item ${item.id === selectedPostId ? "active" : ""}">
                    <button class="manager-item-main" type="button" data-edit-post="${escapeHtml(item.id)}">
                        <strong>${escapeHtml(item.title)}</strong>
                        <span><i class="status-dot ${item.published ? "" : "off"}"></i> ${escapeHtml(item.category)} / ${escapeHtml(item.publishedAt)}</span>
                    </button>
                    <div class="manager-item-actions">
                        <button class="danger" type="button" data-delete-post="${escapeHtml(item.id)}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join("")
            : `<p>Chưa có bài đăng. Nhấn dấu + để bắt đầu.</p>`;

        fillPostForm(state.posts.find(item => item.id === selectedPostId));
    }

    function fillPostForm(item) {
        const form = byId("post-form");
        form.reset();
        form.elements.id.value = item?.id || "";
        form.elements.title.value = item?.title || "";
        form.elements.category.value = item?.category || "";
        form.elements.excerpt.value = item?.excerpt || "";
        form.elements.cover.value = item?.cover || "";
        form.elements.link.value = item?.link || "";
        form.elements.publishedAt.value = item?.publishedAt || new Date().toISOString().slice(0, 10);
        form.elements.published.checked = item ? item.published : true;
        byId("post-editor-title").textContent = item ? "Chỉnh sửa bài đăng" : "Tạo bài đăng";
        updatePostPreview();
    }

    function updatePostPreview() {
        const form = byId("post-form");
        const preview = byId("post-preview");
        const cover = CMS.safeUrl(form.elements.cover.value);
        preview.style.backgroundImage = cover
            ? `linear-gradient(90deg, rgba(23,18,15,0.82), rgba(23,18,15,0.15)), url("${cover}")`
            : "";
        preview.innerHTML = `
            <span>${escapeHtml(form.elements.category.value || "PREVIEW")}</span>
            <strong>${escapeHtml(form.elements.title.value || "Tiêu đề bài đăng")}</strong>
            <p>${escapeHtml(form.elements.excerpt.value || "Nội dung xem trước sẽ hiện ở đây.")}</p>
        `;
    }

    function renderPatchManager() {
        const catalog = getAdminCatalog();
        if (selectedGameId !== NEW_GAME_ID && !catalog.some(game => game.id === selectedGameId)) {
            selectedGameId = catalog[0]?.id || NEW_GAME_ID;
        }
        renderGameList();
        fillPatchForm(selectedGameId);
    }

    function renderGameList() {
        const query = byId("game-search").value.trim().toLocaleLowerCase("vi");
        const items = getAdminCatalog().filter(game => game.title.toLocaleLowerCase("vi").includes(query));

        byId("game-list").innerHTML = items.map(game => {
            const entry = game.custom
                ? getCustomGames().find(item => item.id === game.id)
                : state.gameOverrides[game.id];
            const hasLink = Boolean(entry?.downloadUrl);
            const hasImage = Boolean(entry?.imageUrl);
            const badge = entry?.badge === "new"
                ? "Mới"
                : (entry?.badge === "hot" ? "Nổi bật" : "");
            const hasGallery = Array.isArray(entry?.screenshots) && entry.screenshots.length > 0;
            const hasCredits = entry?.credits && Object.values(entry.credits).some(Boolean);
            const hasOverride = Boolean(entry);
            const status = [
                game.hidden ? "Đã ẩn" : "",
                game.custom ? "Game mới" : "",
                hasLink ? "Link tải" : "",
                hasImage ? "Có ảnh" : "",
                hasGallery ? "Gallery" : "",
                hasCredits ? "Nhân sự" : "",
                badge ? `Nhãn ${badge}` : ""
            ].filter(Boolean).join(" / ");
            return `
                <div class="manager-item ${game.id === selectedGameId ? "active" : ""}">
                    <button class="manager-item-main" type="button" data-edit-game="${escapeHtml(game.id)}">
                        <strong>${escapeHtml(game.title)}</strong>
                        <span><i class="status-dot ${game.hidden || hasLink || hasImage || hasGallery || hasCredits || badge ? "" : "off"}"></i> ${status || (hasOverride ? "Đã chỉnh nội dung" : "Dùng dữ liệu gốc")}</span>
                    </button>
                </div>
            `;
        }).join("");
    }

    function fillPatchForm(gameId) {
        const form = byId("patch-form");
        const isNew = gameId === NEW_GAME_ID;
        const editable = isNew ? { type: "new", data: {} } : getEditableGame(gameId);
        const game = editable.data || {};
        const entry = game;

        form.reset();
        form.elements.gameId.value = game?.id || "";
        form.elements.title.value = entry.title || "";
        form.elements.developer.value = entry.developer || "";
        form.elements.engine.value = entry.engine || "";
        form.elements.engineKey.value = entry.engineKey || "";
        form.elements.type.value = entry.type || "";
        form.elements.version.value = entry.version || "";
        form.elements.size.value = entry.size || "";
        form.elements.price.value = entry.price === "" || entry.price == null ? "" : entry.price;
        form.elements.progress.value = entry.progress === "" || entry.progress == null ? "" : entry.progress;
        form.elements.downloads.value = entry.downloads || "";
        form.elements.date.value = entry.date || "";
        form.elements.badge.value = ["new", "hot"].includes(entry.badge) ? entry.badge : "";
        form.elements.imageUrl.value = entry.imageUrl || "";
        form.elements.downloadUrl.value = entry.downloadUrl || "";
        form.elements.description.value = entry.description || "";
        form.elements.creditTranslator.value = entry.credits?.translator || "";
        form.elements.creditEditor.value = entry.credits?.editor || "";
        form.elements.creditTechnical.value = entry.credits?.technical || "";
        form.elements.creditQa.value = entry.credits?.qa || "";
        form.elements.screenshots.value = Array.isArray(entry.screenshots) ? entry.screenshots.join("\n") : "";
        form.elements.notes.value = entry.notes || "";
        syncPatchPriceField();

        byId("patch-image-file").value = "";
        byId("patch-editor-title").textContent = isNew ? "Thêm game mới" : "Chỉnh sửa patch";
        const deleteGameBtn = byId("delete-game-btn");
        const isHidden = editable.type === "base" && isHiddenBaseGame(gameId);
        deleteGameBtn.hidden = editable.type === "new";
        deleteGameBtn.classList.toggle("danger-command", editable.type === "custom" || !isHidden);
        deleteGameBtn.innerHTML = editable.type === "custom"
            ? `<i class="fa-solid fa-trash"></i> Xóa game`
            : (isHidden
                ? `<i class="fa-solid fa-eye"></i> Hiện lại`
                : `<i class="fa-solid fa-eye-slash"></i> Ẩn khỏi web`);
        byId("reset-patch-btn").hidden = editable.type === "new" || editable.type === "custom";
        byId("patch-selected").innerHTML = `
            <span>${editable.type === "custom" ? "CUSTOM GAME" : (isNew ? "NEW GAME" : (isHidden ? "HIDDEN DOSSIER" : "GAME DOSSIER"))}</span>
            <strong>${escapeHtml(game?.title || "Điền thông tin game mới")}</strong>
        `;
        updatePatchPreview();
    }

    function renderBackupReport() {
        const json = JSON.stringify(state);
        const meta = CMS.getSyncMeta();
        const date = state.updatedAt
            ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(state.updatedAt))
            : "Chưa có";

        byId("storage-report").innerHTML = `
            <div class="storage-stat"><span>DUNG LƯỢNG</span><strong>${(new Blob([json]).size / 1024).toFixed(1)} KB</strong></div>
            <div class="storage-stat"><span>BẢN NHÁP / CÔNG KHAI</span><strong>v${Number(meta?.draftVersion || 0)} / v${Number(meta?.publishedVersion || 0)}</strong></div>
            <div class="storage-stat"><span>LẦN ĐỒNG BỘ</span><strong>${escapeHtml(date)}</strong></div>
        `;
    }

    async function adminRequest(path, options = {}) {
        const headers = {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.mutation ? { "X-CSRF-Token": CMS.getCsrfToken() } : {}),
            ...(options.headers || {})
        };
        const response = await fetch(path, {
            method: options.method || "GET",
            credentials: "same-origin",
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(payload.error || `ADMIN_REQUEST_${response.status}`);
            error.status = response.status;
            throw error;
        }
        return payload;
    }

    function renderAllEditors() {
        refreshSelections();
        renderDashboard();
        fillHomepageForm();
        renderTrailerManager();
        renderRequestManager();
        renderPostManager();
        renderPatchManager();
        renderBackupReport();
        updatePublishUi();
    }

    async function loadRevisions(force = false) {
        if (revisionsLoaded && !force) return;
        const list = byId("revision-list");
        list.innerHTML = `<p>Đang tải lịch sử…</p>`;
        try {
            const payload = await adminRequest("/api/admin/revisions?limit=40");
            const labels = {
                draft: "BẢN NHÁP",
                published: "ĐÃ XUẤT BẢN",
                restored: "ĐÃ KHÔI PHỤC"
            };
            list.innerHTML = payload.revisions?.length
                ? payload.revisions.map(item => {
                    const date = new Intl.DateTimeFormat("vi-VN", {
                        dateStyle: "medium",
                        timeStyle: "short"
                    }).format(new Date(item.created_at));
                    return `
                        <article class="revision-item">
                            <div>
                                <strong><em class="revision-kind ${escapeHtml(item.revision_type)}">${labels[item.revision_type] || "BẢN LƯU"}</em> Phiên bản ${Number(item.version)}</strong>
                                <span>${escapeHtml(date)} · ${escapeHtml(item.note || "Thay đổi nội dung")}</span>
                            </div>
                            <button class="restore-revision-btn" type="button" data-restore-revision="${Number(item.id)}">Khôi phục về bản nháp</button>
                        </article>
                    `;
                }).join("")
                : `<p>Chưa có lịch sử thay đổi.</p>`;
            revisionsLoaded = true;
        } catch (error) {
            list.innerHTML = `<p>Không tải được lịch sử: ${escapeHtml(error.message)}</p>`;
        }
    }

    async function publishCurrentDraft() {
        await saveQueue;
        const meta = CMS.getSyncMeta();
        if (!meta?.dirty) {
            showToast("Website đã dùng đúng bản mới nhất.");
            return;
        }
        if (!window.confirm("Xuất bản toàn bộ thay đổi hiện tại ra website công khai?")) return;
        const button = byId("publish-btn");
        button.disabled = true;
        setSaveState("Đang xuất bản", true);
        try {
            const payload = await adminRequest("/api/admin/publish", {
                method: "POST",
                mutation: true,
                body: { note: "Xuất bản từ VietPatch Content Studio" }
            });
            CMS.updateSyncMeta(payload.meta);
            setSaveState("Đã xuất bản", false);
            revisionsLoaded = false;
            updatePublishUi();
            renderBackupReport();
            showToast("Website công khai đã nhận nội dung mới.");
        } catch (error) {
            setSaveState("Xuất bản chưa thành công", false, true);
            showToast(`Không xuất bản được: ${error.message}`, "error");
        }
    }

    async function restoreFromRevision(revisionId) {
        if (!window.confirm("Khôi phục bản này thành bản nháp hiện tại? Website công khai chưa thay đổi cho tới khi bạn bấm Xuất bản.")) return;
        setSaveState("Đang khôi phục", true);
        try {
            const payload = await adminRequest("/api/admin/restore", {
                method: "POST",
                mutation: true,
                body: { revisionId }
            });
            state = CMS.save(payload.state);
            CMS.updateSyncMeta(payload.meta);
            revisionsLoaded = false;
            renderAllEditors();
            await loadRevisions(true);
            setSaveState("Đã khôi phục vào bản nháp", false);
            showToast("Đã khôi phục. Hãy kiểm tra rồi bấm Xuất bản khi sẵn sàng.");
        } catch (error) {
            setSaveState("Khôi phục chưa thành công", false, true);
            showToast(`Không khôi phục được: ${error.message}`, "error");
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        setSaveState("Đang kết nối máy chủ", true);
        try {
            const session = await adminRequest("/api/admin/session");
            CMS.configureAdminSession(session);
            state = await CMS.loadRemote({ scope: "draft", strict: true });
            byId("server-status").innerHTML = `<i class="fa-solid fa-cloud"></i> MÁY CHỦ ĐÃ KẾT NỐI`;
            setSaveState("Bản nháp đã đồng bộ", false);
            renderAllEditors();
        } catch (error) {
            if (error.status === 401 || /CMS_READ_401/.test(error.message)) {
                window.location.replace("/admin-login.html?returnTo=%2Fadmin.html");
                return;
            }
            setSaveState("Không kết nối được máy chủ", false, true);
            byId("server-status").innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> MÁY CHỦ CHƯA SẴN SÀNG`;
            showToast(`Không mở được CMS: ${error.message}`, "error");
            return;
        }

        document.querySelectorAll(".studio-nav-btn").forEach(button => {
            button.addEventListener("click", () => switchPanel(button.dataset.panel));
        });

        document.querySelectorAll("[data-open-panel]").forEach(button => {
            button.addEventListener("click", () => switchPanel(button.dataset.openPanel));
        });

        byId("sidebar-toggle").addEventListener("click", () => {
            document.body.classList.toggle("sidebar-open");
        });

        byId("homepage-form").addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            state.site.featuredGameId = form.elements.featuredGameId.value;
            state.site.catalogHeading = form.elements.catalogHeading.value.trim();
            state.site.catalogIntro = form.elements.catalogIntro.value.trim();
            state.site.catalogPageSize = form.elements.catalogPageSize.value;
            persist("Đã cập nhật bố cục trang chủ và thư viện.");
        });

        byId("new-trailer-btn").addEventListener("click", () => {
            selectedTrailerId = "";
            renderTrailerManager();
        });

        byId("trailer-form").addEventListener("input", updateTrailerPreview);
        byId("trailer-form").addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            const videoId = CMS.extractYouTubeId(form.elements.videoId.value);
            if (!videoId) {
                showToast("Link YouTube hoặc Video ID chưa hợp lệ.", "error");
                return;
            }

            const id = form.elements.id.value || CMS.createId("trailer");
            const item = {
                id,
                videoId,
                title: form.elements.title.value.trim(),
                category: form.elements.category.value.trim(),
                description: form.elements.description.value.trim(),
                enabled: form.elements.enabled.checked
            };
            const index = state.trailers.findIndex(entry => entry.id === id);
            if (index >= 0) state.trailers[index] = item;
            else state.trailers.push(item);
            selectedTrailerId = id;
            persist("Đã lưu trailer tuần.");
            renderTrailerManager();
        });

        byId("trailer-list").addEventListener("click", event => {
            const edit = event.target.closest("[data-edit-trailer]");
            const remove = event.target.closest("[data-delete-trailer]");
            const move = event.target.closest("[data-move-trailer]");

            if (edit) {
                selectedTrailerId = edit.dataset.editTrailer;
                renderTrailerManager();
                return;
            }

            if (remove) {
                const item = state.trailers.find(entry => entry.id === remove.dataset.deleteTrailer);
                if (!item || !window.confirm(`Xóa trailer "${item.title}"?`)) return;
                state.trailers = state.trailers.filter(entry => entry.id !== item.id);
                selectedTrailerId = state.trailers[0]?.id || "";
                persist("Đã xóa trailer.");
                renderTrailerManager();
                return;
            }

            if (move) {
                const index = state.trailers.findIndex(entry => entry.id === move.dataset.id);
                const target = index + Number(move.dataset.moveTrailer);
                if (index < 0 || target < 0 || target >= state.trailers.length) return;
                [state.trailers[index], state.trailers[target]] = [state.trailers[target], state.trailers[index]];
                persist("Đã đổi thứ tự playlist.");
                renderTrailerManager();
            }
        });

        byId("new-request-btn").addEventListener("click", () => {
            selectedRequestId = "";
            renderRequestManager();
        });

        byId("request-form").addEventListener("input", updateRequestPreview);
        byId("request-form").addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            const rawLogo = form.elements.logoUrl.value.trim();
            const rawLink = form.elements.link.value.trim();
            const logoUrl = CMS.safeAssetUrl(rawLogo);
            const link = CMS.safeUrl(rawLink);

            if (rawLogo && !logoUrl) {
                showToast("Logo game phải là link ảnh HTTP/HTTPS hoặc ảnh upload hợp lệ.", "error");
                return;
            }

            if (rawLink && !link) {
                showToast("Link cửa hàng phải là địa chỉ HTTP hoặc HTTPS hợp lệ.", "error");
                return;
            }

            const id = form.elements.id.value || CMS.createId("request");
            const item = {
                id,
                title: form.elements.title.value.trim(),
                logoUrl,
                engine: form.elements.engine.value.trim() || "Khác",
                platform: form.elements.platform.value.trim() || "Nhiều nền tảng",
                link,
                notes: form.elements.notes.value.trim(),
                votes: Math.max(0, Math.round(Number(form.elements.votes.value) || 0)),
                published: form.elements.published.checked
            };

            if (!item.title) {
                showToast("Hãy nhập tên game yêu cầu.", "error");
                return;
            }

            const index = state.requests.findIndex(entry => entry.id === id);
            if (index >= 0) state.requests[index] = item;
            else state.requests.push(item);
            selectedRequestId = id;
            persist("Đã lưu yêu cầu cộng đồng.");
            renderRequestManager();
        });

        byId("request-list").addEventListener("click", event => {
            const edit = event.target.closest("[data-edit-request]");
            const remove = event.target.closest("[data-delete-request]");
            const move = event.target.closest("[data-move-request]");

            if (edit) {
                selectedRequestId = edit.dataset.editRequest;
                renderRequestManager();
                return;
            }

            if (remove) {
                const item = state.requests.find(entry => entry.id === remove.dataset.deleteRequest);
                if (!item || !window.confirm(`Xóa yêu cầu "${item.title}"?`)) return;
                state.requests = state.requests.filter(entry => entry.id !== item.id);
                selectedRequestId = state.requests[0]?.id || "";
                persist("Đã xóa yêu cầu cộng đồng.");
                renderRequestManager();
                return;
            }

            if (move) {
                const index = state.requests.findIndex(entry => entry.id === move.dataset.id);
                const target = index + Number(move.dataset.moveRequest);
                if (index < 0 || target < 0 || target >= state.requests.length) return;
                [state.requests[index], state.requests[target]] = [state.requests[target], state.requests[index]];
                persist("Đã đổi thứ tự bảng yêu cầu.");
                renderRequestManager();
            }
        });

        byId("new-post-btn").addEventListener("click", () => {
            selectedPostId = "";
            renderPostManager();
        });

        byId("post-form").addEventListener("input", updatePostPreview);
        byId("post-form").addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            const id = form.elements.id.value || CMS.createId("post");
            const item = {
                id,
                title: form.elements.title.value.trim(),
                category: form.elements.category.value.trim(),
                excerpt: form.elements.excerpt.value.trim(),
                cover: CMS.safeUrl(form.elements.cover.value),
                link: CMS.safeUrl(form.elements.link.value),
                publishedAt: form.elements.publishedAt.value,
                published: form.elements.published.checked
            };
            const index = state.posts.findIndex(entry => entry.id === id);
            if (index >= 0) state.posts[index] = item;
            else state.posts.push(item);
            selectedPostId = id;
            persist(item.published ? "Bài đăng đã được xuất bản." : "Đã lưu bài ở trạng thái ẩn.");
            renderPostManager();
        });

        byId("post-list").addEventListener("click", event => {
            const edit = event.target.closest("[data-edit-post]");
            const remove = event.target.closest("[data-delete-post]");
            if (edit) {
                selectedPostId = edit.dataset.editPost;
                renderPostManager();
                return;
            }
            if (remove) {
                const item = state.posts.find(entry => entry.id === remove.dataset.deletePost);
                if (!item || !window.confirm(`Xóa bài "${item.title}"?`)) return;
                state.posts = state.posts.filter(entry => entry.id !== item.id);
                selectedPostId = state.posts[0]?.id || "";
                persist("Đã xóa bài đăng.");
                renderPostManager();
            }
        });

        byId("new-game-btn").addEventListener("click", () => {
            selectedGameId = NEW_GAME_ID;
            renderGameList();
            fillPatchForm(selectedGameId);
        });

        byId("game-search").addEventListener("input", renderGameList);
        byId("game-list").addEventListener("click", event => {
            const edit = event.target.closest("[data-edit-game]");
            if (!edit) return;
            selectedGameId = edit.dataset.editGame;
            renderGameList();
            fillPatchForm(selectedGameId);
        });

        byId("patch-form").addEventListener("input", event => {
            if (["title", "imageUrl"].includes(event.target.name)) updatePatchPreview();
            if (event.target.name === "type") syncPatchPriceField();
        });

        byId("patch-form").elements.type.addEventListener("change", syncPatchPriceField);

        byId("patch-image-file").addEventListener("change", event => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                showToast("Tệp upload phải là ảnh.", "error");
                event.currentTarget.value = "";
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                showToast("Ảnh hơi nặng. Hãy dùng ảnh dưới 2MB để lưu ổn định hơn.", "error");
                event.currentTarget.value = "";
                return;
            }

            const reader = new FileReader();
            reader.addEventListener("load", () => {
                byId("patch-form").elements.imageUrl.value = reader.result;
                updatePatchPreview();
                showToast("Đã gắn ảnh vào patch editor.");
            });
            reader.addEventListener("error", () => showToast("Không đọc được ảnh này.", "error"));
            reader.readAsDataURL(file);
        });

        byId("patch-form").addEventListener("submit", event => {
            event.preventDefault();
            const form = event.currentTarget;
            const isNew = selectedGameId === NEW_GAME_ID;
            const gameId = isNew ? "" : form.elements.gameId.value;
            const editable = isNew ? { type: "new", data: {} } : getEditableGame(gameId);
            const payload = getPatchPayload(form, editable.data);

            if (payload.error) {
                showToast(payload.error, "error");
                return;
            }

            if (!payload.title) {
                showToast("Hãy nhập tên game trước khi lưu.", "error");
                return;
            }

            const effectiveProgress = payload.progress === "" ? 100 : Number(payload.progress);
            const effectivePrice = payload.price === "" ? 0 : Number(payload.price);
            if (effectiveProgress >= 100 && !payload.downloadUrl) {
                showToast(
                    effectivePrice > 0
                        ? "Không thể mở bán patch đã hoàn thành khi chưa có link tải."
                        : "Patch đã hoàn thành cần có link tải trước khi xuất hiện là sẵn sàng.",
                    "error"
                );
                return;
            }

            if (isNew || editable.type === "custom") {
                const id = isNew ? CMS.createId("game") : gameId;
                const customGame = {
                    id,
                    title: payload.title,
                    developer: payload.developer || "Community Studio",
                    engine: payload.engine || "Unreal Engine 5",
                    engineKey: payload.engineKey || "other",
                    type: payload.type || "Free",
                    version: payload.version || "v1.0.0",
                    size: payload.size || "Đang cập nhật",
                    price: payload.price === "" ? 0 : payload.price,
                    progress: payload.progress === "" ? 100 : payload.progress,
                    downloads: payload.downloads || "0",
                    date: payload.date || new Date().toISOString().slice(0, 10),
                    badge: payload.badge,
                    tags: payload.tags,
                    imageUrl: payload.imageUrl,
                    downloadUrl: payload.downloadUrl,
                    credits: {
                        translator: payload.credits.translator || "VietPatch Community",
                        editor: payload.credits.editor || "Content Studio",
                        technical: payload.credits.technical || "Patchroom",
                        qa: payload.credits.qa || "QA Board"
                    },
                    screenshots: payload.screenshots.length
                        ? payload.screenshots
                        : (payload.imageUrl ? [payload.imageUrl] : []),
                    description: payload.description || "Bản patch cộng đồng mới được thêm từ VietPatch Content Studio.",
                    notes: payload.notes || "Thông tin cài đặt sẽ được cập nhật trong hồ sơ patch."
                };

                const index = getCustomGames().findIndex(game => game.id === id);
                if (index >= 0) state.customGames[index] = customGame;
                else state.customGames.push(customGame);

                selectedGameId = id;
                persist(isNew ? "Đã thêm game mới vào kho game." : "Đã cập nhật game tự thêm.");
            } else {
                const baseGame = CMS.catalog.find(game => game.id === gameId);
                const override = compactPatchData({
                    ...payload,
                    title: payload.title === baseGame?.title ? "" : payload.title
                });

                if (Object.keys(override).length) {
                    state.gameOverrides[gameId] = override;
                } else {
                    delete state.gameOverrides[gameId];
                }

                persist("Đã cập nhật thông tin, ảnh, mác và link tải patch.");
            }

            renderGameList();
            fillPatchForm(selectedGameId);
        });

        byId("delete-game-btn").addEventListener("click", () => {
            if (!selectedGameId || selectedGameId === NEW_GAME_ID) return;

            if (isCustomGame(selectedGameId)) {
                const game = getCustomGames().find(item => item.id === selectedGameId);
                if (!game || !window.confirm(`Xóa game tự thêm "${game.title}" khỏi kho game?`)) return;

                state.customGames = getCustomGames().filter(item => item.id !== selectedGameId);
                selectedGameId = CMS.catalog[0]?.id || "";
                persist("Đã xóa game tự thêm khỏi kho game.");
                renderGameList();
                fillPatchForm(selectedGameId);
                return;
            }

            const baseGame = CMS.catalog.find(item => item.id === selectedGameId);
            if (!baseGame) return;

            if (isHiddenBaseGame(selectedGameId)) {
                state.hiddenGameIds = getHiddenGameIds().filter(id => id !== selectedGameId);
                persist(`Đã hiện lại "${baseGame.title}" trên web công khai.`);
            } else {
                if (!window.confirm(`Ẩn "${baseGame.title}" khỏi kho game trên web công khai?`)) return;
                state.hiddenGameIds = [...getHiddenGameIds(), selectedGameId];
                persist(`Đã ẩn "${baseGame.title}" khỏi web công khai.`);
            }

            renderGameList();
            fillPatchForm(selectedGameId);
        });

        byId("reset-patch-btn").addEventListener("click", () => {
            if (!selectedGameId || !state.gameOverrides[selectedGameId]) return;
            const game = CMS.catalog.find(item => item.id === selectedGameId);
            if (!window.confirm(`Khôi phục dữ liệu gốc cho "${game?.title}"?`)) return;
            delete state.gameOverrides[selectedGameId];
            persist("Đã khôi phục thông tin patch mặc định.");
            renderGameList();
            fillPatchForm(selectedGameId);
        });

        byId("export-btn").addEventListener("click", async () => {
            try {
                const response = await fetch("/api/admin/backup", {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" }
                });
                if (!response.ok) throw new Error(`BACKUP_${response.status}`);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `vietpatch-cms-${new Date().toISOString().slice(0, 10)}.json`;
                anchor.click();
                URL.revokeObjectURL(url);
                showToast("Đã xuất bản sao máy chủ.");
            } catch (error) {
                showToast(`Không xuất được bản sao: ${error.message}`, "error");
            }
        });

        byId("import-input").addEventListener("change", event => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    setSaveState("Đang nhập", true);
                    const imported = JSON.parse(reader.result);
                    state = await CMS.saveRemote(imported.draft || imported);
                    revisionsLoaded = false;
                    renderAllEditors();
                    setSaveState("Bản nháp đã đồng bộ", false);
                    showToast("Đã nhập dữ liệu vào bản nháp. Hãy kiểm tra trước khi xuất bản.");
                } catch (error) {
                    setSaveState("Nhập dữ liệu chưa thành công", false, true);
                    showToast(`Không nhập được tệp: ${error.message}`, "error");
                }
                event.target.value = "";
            };
            reader.readAsText(file);
        });

        byId("reset-cms-btn").addEventListener("click", async () => {
            if (!window.confirm("Khôi phục toàn bộ nội dung CMS về mặc định?")) return;
            state = CMS.reset();
            setSaveState("Đang lưu", true);
            try {
                state = await CMS.saveRemote(state);
                setSaveState("Bản nháp đã đồng bộ", false);
            } catch (error) {
                setSaveState("Có thay đổi chưa lưu", false, true);
                showToast(`Không lưu được lên server: ${error.message}`, "error");
                return;
            }
            revisionsLoaded = false;
            renderAllEditors();
            showToast("Đã khôi phục nội dung mặc định vào bản nháp.");
        });

        byId("publish-btn").addEventListener("click", publishCurrentDraft);
        byId("refresh-revisions-btn").addEventListener("click", () => loadRevisions(true));
        byId("revision-list").addEventListener("click", event => {
            const button = event.target.closest("[data-restore-revision]");
            if (button) restoreFromRevision(button.dataset.restoreRevision);
        });
        byId("logout-btn").addEventListener("click", async () => {
            try {
                await adminRequest("/api/admin/logout", {
                    method: "POST",
                    mutation: true,
                    body: {}
                });
            } finally {
                window.location.replace("/admin-login.html");
            }
        });

        document.addEventListener("click", event => {
            const navButton = event.target.closest(".studio-nav-btn[data-panel]");
            if (navButton) {
                event.preventDefault();
                switchPanel(navButton.dataset.panel);
                return;
            }

            const quickButton = event.target.closest("[data-open-panel]");
            if (quickButton) {
                event.preventDefault();
                switchPanel(quickButton.dataset.openPanel);
            }
        });
    });
})();
