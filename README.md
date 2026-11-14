# Tiện ích xem phim — RoPhim & Motchill

Chọn bộ dành cho website bạn sử dụng. RoPhim có ba script: chặn quảng cáo, điều khiển trình phát và lịch sử xem. Motchill có thêm Mở bản trực tiếp, tổng cộng bảy script. Có thể cài cả hai bộ trong cùng Tampermonkey.

## Cài trên Firefox

1. Cài [Tampermonkey cho Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/).
2. Mở từng link cài bên dưới **bằng Firefox**, rồi chọn **Cài đặt/Cập nhật** trong Tampermonkey.
3. Quay lại trang phim và tải lại trang.

| Website | Chặn quảng cáo | Điều khiển trình phát | Lịch sử xem |
| --- | --- | --- | --- |
| **RoPhim 0.4.4** | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.4/rophim/noads/rophim-noads.user.js) | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.4/rophim/gestures/rophim-gestures.user.js) | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.4/rophim/history/rophim-history.user.js) |
| **Motchill 6.0.4** | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.4/motchill/noads/motchill-noads.user.js) | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.4/motchill/gestures/motchill-gestures.user.js) | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.4/motchill/history/motchill-history.user.js) |

Script thứ tư của Motchill: [Mở bản trực tiếp 6.0.4](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.4/motchill/source/motchill-source.user.js). Nút chỉ hiện khi xác minh được trang phim gốc đang nhúng.

Đã cài bản cũ thì mở link mới để **cập nhật tại chỗ**, giữ nguyên script Lịch sử để giữ tiến độ. Không cần gỡ Tampermonkey hoặc chép mã thủ công. Kiểm tra đúng tên script và phiên bản trước khi xác nhận. Nếu có hai bản cùng chức năng cho cùng website, chỉ bật một bản.

## Sử dụng

- Chạm vùng trống trên phim để ẩn/hiện điều khiển. Chạm đôi hai bên để tua 10 giây; giữ khi đang phát để xem 2×, thả để trở về tốc độ cũ.
- Nút phát/dừng nằm ở giữa và thanh dưới. Bấm Phát sẽ bật tiếng cùng lúc; nếu âm lượng đang bằng 0, script đưa về mức nghe được. Trong toàn màn hình có nút khóa; khi khóa vẫn chạm đôi tua ±10 giây và giữ 2×, hai nút Bỏ qua giới thiệu/Tập tiếp theo vẫn hiện và bấm được đúng thời điểm; chạm một lần để ẩn/hiện ổ khóa.
- Chọn tốc độ trong cài đặt. Nếu nguồn phát cung cấp chất lượng, âm thanh hoặc phụ đề mà script hỗ trợ, các lựa chọn xuất hiện trong cùng menu.
- Chuyển tập bằng nút custom để giữ khung phát. Bản dịch/server được xử lý theo dữ liệu của từng website.
- Motchill nhớ lựa chọn âm thanh khi tải lại cùng website. Khi phim tiếp tục chạy, script thử khôi phục tiếng; nếu trình duyệt chặn thì bỏ qua, không bắt bấm Play lại. Đã chủ động tắt tiếng thì vẫn giữ tắt tiếng.
- Bộ chặn quảng cáo hoạt động riêng với giao diện player. Lịch sử được giữ trong Tampermonkey/profile đang dùng, chưa đồng bộ giữa thiết bị.

Nếu phim không tự phát, bấm **Phát**; có thể cho phép tự động phát trong quyền website của Firefox. Khi khung đang tải, chờ hoặc dùng **Thử lại** nếu xuất hiện. Nếu trình duyệt không hỗ trợ khóa hướng, xoay máy bằng tay.

Xem hướng dẫn riêng: [RoPhim](rophim/README.md) · [Motchill](motchill/README.md).
