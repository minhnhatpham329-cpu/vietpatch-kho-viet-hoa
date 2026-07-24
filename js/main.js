const game = CONFIG.games[0];
const MIN_DONATION = 35000;

let activeAmount = MIN_DONATION;
let publicConfig = null;
let currentUser = null;
let currentOrder = null;
let accountOrders = [];
let countdownTimer = null;
let paymentPollTimer = null;
let paymentPollStartedAt = 0;

document.addEventListener("DOMContentLoaded", async () => {
    document.documentElement.style.setProperty("--game-art", `url("../${game.banner}")`);
    setupTrailer();
    bindActions();
    await loadAppState();
});

function setupTrailer() {
    const frame = document.getElementById("trailer-frame");
    const shell = document.getElementById("trailer-player");
    const playButton = document.getElementById("trailer-play");
    const youtubeId = game.trailerYoutubeId;
    if (!frame || !shell || !youtubeId) return;

    shell.style.backgroundImage = `url("https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg")`;
    shell.style.backgroundSize = "cover";
    shell.style.backgroundPosition = "center";

    const playTrailer = () => {
        const params = new URLSearchParams({
            autoplay: "1",
            controls: "1",
            rel: "0",
            modestbranding: "1",
            playsinline: "1",
            iv_load_policy: "3",
            origin: window.location.origin
        });
        frame.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?${params}`;
        frame.hidden = false;
        shell.classList.add("playing");
        playButton?.setAttribute("hidden", "");
    };

    playButton?.addEventListener("click", playTrailer);
}

async function loadAppState() {
    try {
        publicConfig = await apiGet("/api/public-config");
        activeAmount = publicConfig.defaultAmount || MIN_DONATION;
        setText("bank-line", publicConfig.bankLine || "");
        await loadCurrentUser();
        await restoreLatestOrder();
        updateAmountUi();
        updateReleaseUi();
        startReleaseCountdown();
    } catch {
        showToast("Không kết nối được server.");
    }
}

async function loadCurrentUser() {
    try {
        const data = await apiGet("/api/me");
        currentUser = data.user;
    } catch {
        currentUser = null;
    }
    renderAccount();
}

function bindActions() {
    document.getElementById("donate-btn")?.addEventListener("click", beginDonateFlow);
    document.getElementById("account-btn")?.addEventListener("click", handleAccountClick);
    document.getElementById("close-payment-btn")?.addEventListener("click", closePaymentDrawer);
    document.getElementById("drawer-backdrop")?.addEventListener("click", closePaymentDrawer);
    document.getElementById("close-auth-btn")?.addEventListener("click", () => document.getElementById("auth-dialog")?.close());
    document.getElementById("google-login-btn")?.addEventListener("click", loginWithGoogle);
    document.getElementById("release-info-btn")?.addEventListener("click", () => document.getElementById("release-info")?.scrollIntoView({ behavior: "smooth" }));
    document.getElementById("create-qr-btn")?.addEventListener("click", () => createOrder(activeAmount));
    document.getElementById("verify-btn")?.addEventListener("click", verifyPayment);
    document.getElementById("custom-amount-btn")?.addEventListener("click", applyCustomAmount);
    document.getElementById("copy-license-btn")?.addEventListener("click", copyLicense);
    document.getElementById("download-btn")?.addEventListener("click", () => {
        if (currentOrder?.downloadUrl) window.location.assign(currentOrder.downloadUrl);
    });
    document.getElementById("order-list")?.addEventListener("click", handleOrderListClick);

    document.querySelectorAll(".amounts button").forEach(button => {
        button.addEventListener("click", () => {
            activeAmount = Number(button.dataset.amount);
            updateAmountUi();
        });
    });
}

function beginDonateFlow() {
    if (!isDonationOpen()) {
        updateReleaseUi(true);
        showToast("Donate mở lúc 20:00 hôm nay.");
        return;
    }
    if (!currentUser) {
        document.getElementById("auth-dialog")?.showModal();
        return;
    }
    openPaymentDrawer();
}

async function handleAccountClick() {
    if (!currentUser) {
        document.getElementById("auth-dialog")?.showModal();
        return;
    }
    stopPaymentPolling();
    await apiPost("/api/auth/logout", {});
    currentUser = null;
    currentOrder = null;
    accountOrders = [];
    renderAccount();
    renderOrderHistory();
    closePaymentDrawer();
    showToast("Đã đăng xuất.");
}

async function loginWithGoogle() {
    if (publicConfig?.authConfigured) {
        window.location.assign("/api/auth/google");
        return;
    }
    if (publicConfig?.devAuthEnabled) {
        const data = await apiPost("/api/auth/dev", {});
        currentUser = data.user;
        renderAccount();
        document.getElementById("auth-dialog")?.close();
        openPaymentDrawer();
        return;
    }
    showToast("Google Login chưa được cấu hình.");
}

function renderAccount() {
    const button = document.getElementById("account-btn");
    if (!button) return;
    button.innerHTML = currentUser
        ? `<i class="fa-solid fa-user"></i><span>${escapeHtml(currentUser.name)}</span>`
        : `<i class="fa-brands fa-google"></i><span>Đăng nhập</span>`;
    setText("signed-user", currentUser ? `${currentUser.name} · ${currentUser.email}` : "");
}

async function restoreLatestOrder() {
    if (!currentUser) return;
    try {
        const data = await apiGet("/api/orders/mine");
        accountOrders = Array.isArray(data.orders) ? data.orders : [];
        renderOrderHistory();
        currentOrder = accountOrders.find(order => order.status === "paid") || accountOrders[0] || null;
        if (!currentOrder) return;
        renderOrder(currentOrder);
        if (currentOrder.status !== "paid") startPaymentPolling();
    } catch (error) {
        showToast("Chưa khôi phục được đơn hàng. Vui lòng thử lại.");
    }
}

function handleOrderListClick(event) {
    const action = event.target.closest("button[data-order-id]");
    if (!action) return;
    const order = accountOrders.find(item => item.orderId === action.dataset.orderId);
    if (!order) return;
    currentOrder = order;
    renderOrder(order);
    renderOrderHistory();
    if (action.classList.contains("order-download") && order.downloadUrl) {
        window.location.assign(order.downloadUrl);
    }
}

function renderOrderHistory() {
    const section = document.getElementById("order-history");
    const list = document.getElementById("order-list");
    if (!section || !list) return;
    section.hidden = accountOrders.length === 0;
    setText("order-count", `${accountOrders.length} đơn`);
    list.innerHTML = accountOrders.map(order => {
        const paid = order.status === "paid";
        const active = currentOrder?.orderId === order.orderId ? " active" : "";
        const status = paid ? "Đã thanh toán" : "Chờ thanh toán";
        return `<div class="order-row">
            <button class="order-select${active}" type="button" data-order-id="${escapeHtml(order.orderId)}">
                <span class="order-copy"><strong>${escapeHtml(order.orderId)}</strong><small>${formatMoney(order.amount)} · ${formatOrderDate(order.createdAt)}</small></span>
                <span class="order-status${paid ? " paid" : ""}">${status}</span>
            </button>
            <button class="order-download" type="button" data-order-id="${escapeHtml(order.orderId)}" aria-label="Tải đơn ${escapeHtml(order.orderId)}" title="Tải bản Việt hóa" ${order.downloadUrl ? "" : "disabled"}><i class="fa-solid fa-download"></i></button>
        </div>`;
    }).join("");
}

function rememberOrder(order) {
    const index = accountOrders.findIndex(item => item.orderId === order.orderId);
    if (index >= 0) accountOrders[index] = order;
    else accountOrders.unshift(order);
    renderOrderHistory();
}

function openPaymentDrawer() {
    const drawer = document.getElementById("payment-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    drawer?.classList.add("open");
    drawer?.setAttribute("aria-hidden", "false");
    if (backdrop) backdrop.hidden = false;
}

function closePaymentDrawer() {
    const drawer = document.getElementById("payment-drawer");
    const backdrop = document.getElementById("drawer-backdrop");
    drawer?.classList.remove("open");
    drawer?.setAttribute("aria-hidden", "true");
    if (backdrop) backdrop.hidden = true;
}

function applyCustomAmount() {
    const input = document.getElementById("custom-amount");
    const amount = Number(input?.value);
    if (!Number.isInteger(amount) || amount < MIN_DONATION) {
        showToast("Số tiền phải từ 35.000đ trở lên.");
        input?.focus();
        return;
    }
    activeAmount = amount;
    updateAmountUi();
}

function updateAmountUi() {
    document.querySelectorAll(".amounts button").forEach(button => {
        button.classList.toggle("active", Number(button.dataset.amount) === activeAmount);
    });
    const createButton = document.getElementById("create-qr-btn");
    if (createButton) createButton.innerHTML = `<i class="fa-solid fa-qrcode"></i> Tạo QR ${formatMoney(activeAmount)}`;
    if (createButton) createButton.disabled = !isDonationOpen();
}

async function createOrder(amount) {
    if (!isDonationOpen()) {
        setText("payment-status", "Donate chưa mở. Vui lòng quay lại lúc 20:00 hôm nay.");
        showToast("Donate mở lúc 20:00 hôm nay.");
        return;
    }
    if (!currentUser) return beginDonateFlow();
    setText("payment-status", "Đang tạo mã thanh toán...");
    try {
        stopPaymentPolling();
        currentOrder = await apiPost("/api/orders", { amount });
        rememberOrder(currentOrder);
        renderOrder(currentOrder);
        startPaymentPolling();
    } catch (error) {
        if (error.status === 401) return beginDonateFlow();
        setText("payment-status", error.status === 423 ? "Donate chưa mở. Vui lòng quay lại sau." : "Không tạo được QR. Vui lòng thử lại.");
    }
}

function isDonationOpen() {
    return Boolean(publicConfig?.donationOpen);
}

function updateReleaseUi(pulse = false) {
    const donateButton = document.getElementById("donate-btn");
    const releaseState = document.querySelector(".release-state");
    const waitLabel = document.getElementById("release-wait-label");
    const donationOpen = isDonationOpen();

    if (donateButton) {
        donateButton.classList.toggle("locked", !donationOpen);
        donateButton.setAttribute("aria-disabled", donationOpen ? "false" : "true");
        donateButton.innerHTML = donationOpen
            ? `<span class="button-icon"><i class="fa-solid fa-bolt"></i></span><span><small>Ủng hộ từ 35.000đ</small>Donate để nhận bản Việt hóa</span><i class="fa-solid fa-arrow-right"></i>`
            : `<span class="button-icon"><i class="fa-solid fa-clock"></i></span><span><small>Mở lúc 20:00</small>Chờ bản Việt hóa</span><i class="fa-solid fa-lock"></i>`;
        if (pulse) {
            donateButton.animate([
                { transform: "translateX(0)" },
                { transform: "translateX(-5px)" },
                { transform: "translateX(5px)" },
                { transform: "translateX(0)" }
            ], { duration: 220, iterations: 1 });
        }
    }

    if (releaseState) {
        releaseState.innerHTML = donationOpen
            ? `<i></i> Đã mở donate`
            : `<i></i> Mở lúc 20:00 hôm nay`;
    }
    if (waitLabel) {
        waitLabel.textContent = donationOpen ? "Donate đã mở" : "Chờ mở bản Việt hóa";
    }
}

function startReleaseCountdown() {
    clearInterval(countdownTimer);
    renderReleaseCountdown();
    countdownTimer = setInterval(renderReleaseCountdown, 1000);
}

function renderReleaseCountdown() {
    const target = new Date(publicConfig?.donateOpenAt || publicConfig?.releaseOpenAt || "").getTime();
    const element = document.getElementById("release-countdown");
    if (!element || !Number.isFinite(target)) return;

    const remaining = target - Date.now();
    if (remaining <= 0 || isDonationOpen()) {
        if (publicConfig) publicConfig.donationOpen = true;
        element.textContent = "Đã mở donate và tải";
        updateReleaseUi();
        clearInterval(countdownTimer);
        return;
    }

    const totalSeconds = Math.ceil(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    element.textContent = days > 0
        ? `Mở donate sau ${days} ngày ${hours} giờ`
        : `Mở donate sau ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

async function verifyPayment() {
    if (!currentOrder?.orderId) return;
    try {
        currentOrder = await apiGet(`/api/orders/${currentOrder.orderId}`);
        rememberOrder(currentOrder);
        renderOrder(currentOrder);
        showToast(currentOrder.status === "paid" ? "Đã xác nhận thanh toán." : "Chưa nhận được giao dịch.");
        if (currentOrder.status === "paid") stopPaymentPolling();
    } catch {
        showToast("Chưa kiểm tra được thanh toán. Thử lại sau ít giây.");
    }
}

function startPaymentPolling() {
    if (!currentOrder?.orderId || currentOrder.status === "paid") return;
    stopPaymentPolling();
    paymentPollStartedAt = Date.now();
    setText("payment-status", `Nội dung chuyển khoản: ${currentOrder.memo}. Web sẽ tự xác nhận khi tiền về.`);
    paymentPollTimer = setInterval(pollPaymentStatus, 4500);
}

function stopPaymentPolling() {
    clearInterval(paymentPollTimer);
    paymentPollTimer = null;
    paymentPollStartedAt = 0;
}

async function pollPaymentStatus() {
    if (!currentOrder?.orderId) return stopPaymentPolling();
    const elapsed = Date.now() - paymentPollStartedAt;
    if (elapsed > 15 * 60 * 1000) {
        stopPaymentPolling();
        setText("payment-status", `Chưa nhận được giao dịch. Kiểm tra lại nội dung chuyển khoản: ${currentOrder.memo}`);
        return;
    }

    try {
        const nextOrder = await apiGet(`/api/orders/${currentOrder.orderId}`);
        currentOrder = nextOrder;
        rememberOrder(nextOrder);
        renderOrder(nextOrder);
        if (nextOrder.status === "paid") {
            stopPaymentPolling();
            showToast("Đã tự xác nhận thanh toán.");
        }
    } catch {
        // Lần kế tiếp sẽ thử lại, tránh làm người dùng hoang mang vì lỗi mạng ngắn.
    }
}

function renderOrder(order) {
    const qr = document.getElementById("vietqr-img");
    const placeholder = document.querySelector(".qr-placeholder");
    if (qr) {
        qr.src = order.qrUrl;
        qr.hidden = false;
    }
    if (placeholder) placeholder.hidden = true;
    document.getElementById("verify-btn").disabled = false;

    let status = `Nội dung chuyển khoản: ${order.memo}`;
    if (order.status === "paid") {
        if (order.downloadUrl) {
            status = "Thanh toán thành công. Bản Việt hóa đã sẵn sàng để tải.";
        } else if (order.releaseOpen === false) {
            status = `Đã xác nhận thanh toán. Link tải mở lúc ${formatReleaseDate(order.releaseOpenAt)}.`;
        } else {
            status = "Đã xác nhận thanh toán. File tải đang được cập nhật.";
        }
    } else if (paymentPollTimer) {
        status = `Nội dung chuyển khoản: ${order.memo}. Web sẽ tự xác nhận khi tiền về.`;
    }
    setText("payment-status", status);

    const result = document.getElementById("license-result");
    if (result) result.hidden = !order.licenseKey;
    const downloadButton = document.getElementById("download-btn");
    if (downloadButton) downloadButton.disabled = !order.downloadUrl;
    if (order.licenseKey && result) {
        setText("license-key", order.licenseKey);
    }
}

async function copyLicense() {
    const key = currentOrder?.licenseKey;
    if (!key) return;
    await navigator.clipboard.writeText(key);
    showToast("Đã sao chép launcher ID.");
}

async function apiGet(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw responseError(response);
    return response.json();
}

async function apiPost(url, body) {
    const response = await fetch(url, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw responseError(response);
    return response.json();
}

function responseError(response) {
    const error = new Error(`Request failed: ${response.status}`);
    error.status = response.status;
    return error;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatMoney(value) {
    return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

function formatReleaseDate(value) {
    const date = new Date(value || "");
    if (!Number.isFinite(date.getTime())) return "20:00 hôm nay";
    return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh"
    }).format(date);
}

function formatOrderDate(value) {
    const date = new Date(value || "");
    if (!Number.isFinite(date.getTime())) return "Vừa tạo";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh"
    }).format(date);
}

function pad2(value) {
    return String(value).padStart(2, "0");
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
}
