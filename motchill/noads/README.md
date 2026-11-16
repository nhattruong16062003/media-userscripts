# Motchill — Chặn quảng cáo

Phiên bản **6.0.15**. Mở [link cài](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.15/motchill/noads/motchill-noads.user.js) bằng Firefox đã cài Tampermonkey, rồi chọn Cài đặt/Cập nhật.

Xem [hướng dẫn sử dụng](../README.md). Giữ script hiện có khi cập nhật để giữ dữ liệu.

Bản này bổ sung chặn popup và quảng cáo mở trang khác khi bấm trên nguồn Next tương thích. Cập nhật chính script **Chặn quảng cáo**, rồi tải lại trang phim; chỉ cập nhật script điều khiển player sẽ chưa nhận phần sửa này. Các nút player và link phim vẫn hoạt động bình thường.

Lớp bảo vệ bổ sung chặn cửa sổ/tab do mã trang tự mở, kể cả quảng cáo chưa có trong bộ luật. Khi bạn bấm liên kết ra ngoài website, script hỏi trước; liên kết gọi ứng dụng không được hỗ trợ sẽ bị chặn. Link phim cùng website và nút chuyển tập/server vẫn dùng như trước. Các iframe phim đã được cấp quyền được hạn chế mở popup và chuyển trang cha.

Sau khi cập nhật, tải lại trang để lớp bảo vệ có hiệu lực từ đầu. Userscript không có quyền chặn mọi kiểu chuyển trang: trên Firefox, mã chạy trong chính trang cha tự đổi địa chỉ hoặc máy chủ chuyển hướng vẫn có thể vượt ngoài phần bảo vệ này. Không xem đây là cơ chế chặn tuyệt đối mọi website/ứng dụng ngoài.

Nếu một trang bị Tampermonkey báo **loại trừ**, mở **Thiết đặt → Các loại trừ của người dùng**, chọn quy tắc chứa tên miền trang đó → **Loại bỏ → Lưu**, rồi tải lại trang. Quy tắc riêng này vẫn có thể được giữ sau khi cập nhật script.
