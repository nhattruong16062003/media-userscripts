# Cài RoPhim trên Firefox

## Firefox Android

1. Mở Firefox, vào **⋮ → Tiện ích → Quản lý tiện ích**, tìm và cài **Tampermonkey**. Có thể mở [trang Tampermonkey trên Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) bằng Firefox.
2. Mở link script muốn dùng ngay trong Firefox:
   - [Chặn quảng cáo 0.2.0](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.2.0/dist/rophim-noads.user.js)
   - [Thao tác trình phát 0.2.0](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.2.0/dist/rophim-gestures.user.js)
   - [Lịch sử xem 0.2.0](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.2.0/dist/rophim-history.user.js)
3. Tampermonkey mở trang cài đặt. Kiểm tra tên **RoPhim**, phiên bản **0.2.0**, tác giả **zic**, nguồn là repo `nhattruong16062003/rophim-userscripts`; kéo xuống và bấm **Cài đặt**.
4. Muốn dùng thêm script khác thì làm lại bước 2–3.
5. Mở trang phim và tải lại trang. Trong **⋮ → Tiện ích → Tampermonkey**, kiểm tra các script RoPhim đang bật.

Đã cài cùng script thì nút có thể là **Cập nhật** hoặc **Cài lại**. Nếu đang dùng cả ba, cập nhật cả ba lên **0.2.0** rồi tải lại trang. Giữ mục Lịch sử đang có khi cập nhật để giữ dữ liệu.

## Firefox máy tính

Cài [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/), mở từng link phía trên bằng Firefox rồi bấm **Cài đặt** trên trang Tampermonkey. Mở trang phim và tải lại trang.

## Cách dùng

| Chức năng | Thao tác |
| --- | --- |
| Chặn quảng cáo | Chạy tự động khi script đang bật |
| Điều khiển | Dùng thanh custom phía dưới video; bấm **RP** ở góc để mở thêm nút |
| Hiện/ẩn nút | Chạm một lần trên video |
| Tua nhanh/lùi | Kéo thanh tua, dùng nút ±10 giây hoặc chạm đôi bên phải/trái video |
| Tăng tốc tạm thời | Giữ khoảng nửa giây trên video để phát 2×; thả để về tốc độ trước đó |
| Bỏ intro | Chỉnh khoảng tua thêm (0–600 giây, mặc định 90), rồi bấm bỏ intro |
| Khóa thao tác | Bấm **Khóa**; muốn thao tác lại thì bấm **Mở khóa** ở góc video |
| Tập sau | Bấm **Tập sau** trong RP; giữ đúng bản dịch và mùa. Thiếu tập Lồng tiếng thì báo, không chuyển sang Vietsub hoặc bỏ qua tập |
| Toàn màn hình | Dùng nút **Toàn màn hình** của RP để giữ thanh custom trong khung. Nếu vào toàn màn hình video hệ thống, thoát ra để dùng lại nút custom |
| Xem tiếp | Tại trang chủ, mở **Đang xem → Xem tiếp tại đây**; khi player sẵn sàng, bấm **Tiếp tục**. Nút **Lịch sử RP** có cả trên trang chủ và trang xem |

Lịch sử lưu trong Tampermonkey của cùng profile, dùng chung giữa các website với đúng phim/mùa/tập/bản dịch, kể cả khi dùng player khác. **Trang đã xem** mở website bạn xem trước đó. Nếu không tìm thấy tập trên website mới, mở đúng phim thủ công rồi dùng nút **Tiếp tục**; hai bản khác thời lượng sẽ có thông báo và không tự tua. Không cần tài khoản website; chưa đồng bộ sang thiết bị khác. Trình duyệt chặn tự phát thì bấm **Phát**.

## Khi chưa chạy

- **Link chỉ hiện mã:** kiểm tra Tampermonkey đã cài và bật, rồi mở lại link trong Firefox thay vì trình duyệt bên trong ứng dụng khác.
- **Không nhận tên miền RoPhim mới:** kiểm tra bản đã cài. Bản 0.1.0 chỉ có ba website ban đầu; mở link phiên bản phía trên để cập nhật, rồi tải lại trang. Bản mới dùng quy tắc tên miền chứa `rophim` và nhận diện cấu trúc nguồn riêng.
- **Không thấy RP:** kiểm tra script Thao tác đang bật, quyền website/iframe và tải lại trang; chờ player tải xong.
- **Nút bị mờ:** chờ video sẵn sàng. Nếu server trống/lỗi, thử nút server gốc của website.
- **Lịch sử chưa có:** bật script Lịch sử và phát phim một lúc để có tiến độ.
- **Vẫn có quảng cáo:** gửi [báo lỗi](https://github.com/nhattruong16062003/rophim-userscripts/issues) kèm trang xem, server/bản dịch và ảnh quảng cáo.

## Cập nhật hoặc gỡ

Tampermonkey kiểm tra bản mới từ repo này. Muốn cập nhật ngay, mở lại link cài và bấm **Cập nhật**, sau đó tải lại trang phim.

Tạm ngừng bằng công tắc trong Dashboard. Sao lưu qua Tampermonkey trước khi gỡ nếu muốn giữ lịch sử. Nếu vừa tắt Chặn quảng cáo để so sánh, có thể cần đóng các tab của website rồi mở lại để kết thúc phiên ẩn quảng cáo.
