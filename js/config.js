// CẤU HÌNH HỆ THỐNG & DANH SÁCH GAME - PỏnGG Game Việt Hóa

const CONFIG = {
    // 1. THÔNG TIN TÀI KHOẢN NHẬN DONATE (Tự động tạo QR qua VietQR.io)
    // Xem danh sách mã Ngân hàng tại: https://vietqr.io/danh-sach-ma-bin-ngan-hang/
    // Ví dụ: VCB (Vietcombank), MB (MBBank), TCB (Techcombank), ACB (ACB), BIDV (BIDV)...
    bank: {
        bankId: "MB",               // Mã ngân hàng (VD: MB, VCB, TCB, ACB, VPB...)
        accountNo: "999999999999",  // Số tài khoản của bạn
        accountName: "NGUYEN VAN A", // Tên chủ tài khoản (VIẾT HOA KHÔNG DẤU)
        momoPhone: "0901234567",    // Số MoMo (nếu muốn hiển thị thêm QR MoMo)
        momoName: "Nguyễn Văn A"     // Tên tài khoản MoMo
    },

    // 2. THÔNG TIN WEBSITE & LIÊN HỆ
    website: {
        title: "PỏnGG | Game Việt Hóa",
        logoText: "PỏnGG",
        facebook: "https://facebook.com/yourpage",
        discord: "https://discord.gg/yourserver",
        youtube: "https://youtube.com/@yourchannel",
        email: "contact@pongg.vn"
    },

    // 3. DANH SÁCH GAME VIỆT HÓA
    games: [
        {
            id: "elliot-tales",
            title: "The Adventures of Elliot: The Millennium Tales",
            category: "Action RPG / HD-2D",
            status: "Hoàn thành", // Hoàn thành | Đang làm | Tạm ngưng
            progress: 100, // % hoàn thành
            version: "v1.0.1",
            releaseDate: "18/06/2026",
            translator: "PỏnGG",
            suggestedDonate: 50000, // Mức donate gợi ý (VNĐ)
            trailerYoutubeId: "DhlKLSV362I",
            shortDesc: "Bản dịch Việt hóa hoàn chỉnh cho siêu phẩm Action RPG phong cách HD-2D của Square Enix. Trải nghiệm hành trình kỳ thú của Elliot ngoài bức tường thành Huther.",
            longDesc: "Bản dịch được thực hiện tỉ mỉ bởi PỏnGG, bao gồm dịch toàn bộ cốt truyện chính, nhiệm vụ phụ, mô tả trang bị, vật phẩm cũng như các chỉ dẫn trong game. Đặc biệt, font chữ của game đã được vẽ lại thủ công cực kỳ đẹp mắt, giữ nguyên phong cách HD-2D nghệ thuật nguyên bản.",
            features: [
                "Việt hóa 100% cốt truyện chính và hội thoại",
                "Dịch toàn bộ mô tả trang bị, kỹ năng, vật phẩm",
                "Font chữ vẽ lại tinh tế chuẩn HD-2D, không lỗi ô vuông",
                "Hỗ trợ cả phiên bản bản quyền Steam và Switch"
            ],
            banner: "assets/images/elliot-keyart.webp",
            thumbnail: "assets/images/elliot-keyart.webp",
            guide: [
                "Tải file patch Việt hóa ở link phía trên.",
                "Giải nén file zip vừa tải về bằng WinRAR hoặc 7-Zip.",
                "Copy toàn bộ các file trong thư mục patch đè vào thư mục cài đặt game (nơi chứa file chạy game .exe).",
                "Mở game và thưởng thức bản Việt hóa!"
            ]
        }
    ]
};
