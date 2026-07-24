(function () {
    "use strict";

    const form = document.getElementById("admin-login-form");
    const password = document.getElementById("admin-password");
    const error = document.getElementById("login-error");
    const button = form.querySelector("button");
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    const safeReturnTo = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/admin.html";

    async function checkExistingSession() {
        const response = await fetch("/api/admin/session", {
            credentials: "same-origin",
            headers: { Accept: "application/json" }
        }).catch(() => null);
        if (response?.ok) window.location.replace(safeReturnTo);
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        error.textContent = "";
        if (password.value.length < 12) {
            error.textContent = "Mật khẩu quản trị phải có ít nhất 12 ký tự.";
            password.focus();
            return;
        }

        button.disabled = true;
        button.firstElementChild.textContent = "Đang xác thực…";
        try {
            const response = await fetch("/api/admin/login", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ password: password.value })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error("Bạn đã thử quá nhiều lần. Hãy chờ khoảng 15 phút.");
                }
                if (payload.error === "ADMIN_SECURITY_NOT_CONFIGURED") {
                    throw new Error("Khu quản trị chưa được cấu hình mật khẩu trên máy chủ.");
                }
                if (payload.error === "CMS_DATABASE_NOT_CONFIGURED") {
                    throw new Error("Kho dữ liệu quản trị chưa được kết nối.");
                }
                if (response.status >= 500) {
                    throw new Error("Máy chủ chưa nhận đủ khóa bảo mật. Hãy kiểm tra secret Production và triển khai lại.");
                }
                throw new Error("Mật khẩu không đúng.");
            }
            window.location.replace(safeReturnTo);
        } catch (requestError) {
            error.textContent = requestError.message || "Không thể đăng nhập lúc này.";
            password.select();
        } finally {
            button.disabled = false;
            button.firstElementChild.textContent = "Vào Content Studio";
        }
    });

    checkExistingSession();
})();
