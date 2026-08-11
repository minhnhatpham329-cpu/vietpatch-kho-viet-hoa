# License Launcher V2.1 — bản thiết kế tham khảo

Trạng thái: chưa kích hoạt trên website và chưa dùng để khóa quyền tải.

## Luồng dự kiến

1. Khách mở launcher sau khi đã có quyền sở hữu patch.
2. Launcher tạo mã thiết bị đã băm, không gửi số serial phần cứng thô.
3. Máy chủ kiểm tra tài khoản, quyền sở hữu và số thiết bị được phép.
4. Máy chủ trả giấy phép có chữ ký, ngày hết hạn và khoảng dùng ngoại tuyến.
5. Launcher chỉ kiểm tra chữ ký bằng khóa công khai; khóa bí mật luôn ở máy chủ.

## Yêu cầu trước khi triển khai

- Có trang quản lý thiết bị, thu hồi giấy phép và khôi phục khi đổi máy.
- Không dùng mã máy làm mật khẩu hoặc lưu thông tin phần cứng thô.
- Giới hạn số lần kích hoạt, ghi nhật ký và chống thử mã hàng loạt.
- Giấy phép phải được ký bất đối xứng, có thời hạn và mã phiên bản patch.
- Có cơ chế hỗ trợ thủ công để tránh khóa nhầm khách hợp lệ.
- Kiểm thử launcher cập nhật, mất mạng, đổi ổ đĩa và cài lại Windows.

Không triển khai cơ chế giả lập phía trình duyệt vì mã JavaScript công khai không thể giữ bí mật và không đủ an toàn để cấp license.
