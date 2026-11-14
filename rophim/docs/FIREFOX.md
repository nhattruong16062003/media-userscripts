# Cài RoPhim trên Firefox

## Firefox Android

1. Mở Firefox, vào **⋮ → Tiện ích → Quản lý tiện ích**, tìm và cài **Tampermonkey**. Có thể mở [trang Tampermonkey trên Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) bằng Firefox.
2. Mở link script muốn dùng ngay trong Firefox:
   - [Chặn quảng cáo 0.4.5](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.5/rophim/noads/rophim-noads.user.js)
   - [Thao tác trình phát 0.4.5](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.5/rophim/gestures/rophim-gestures.user.js)
   - [Lịch sử xem 0.4.5](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.5/rophim/history/rophim-history.user.js)
3. Tampermonkey mở trang cài đặt. Kiểm tra tên **RoPhim**, phiên bản **0.4.5**, tác giả **zic**, nguồn là repo `nhattruong16062003/media-userscripts`; kéo xuống và bấm **Cài đặt**.
4. Muốn dùng thêm script khác thì làm lại bước 2–3.
5. Mở trang phim và tải lại trang. Trong **⋮ → Tiện ích → Tampermonkey**, kiểm tra các script RoPhim đang bật.

Đã cài cùng script thì nút có thể là **Cập nhật** hoặc **Cài lại**. Nếu đang dùng cả ba, cập nhật cả ba lên **0.4.5** rồi tải lại trang. Giữ mục Lịch sử đang có khi cập nhật để giữ dữ liệu.

## Firefox máy tính

Cài [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/), mở từng link phía trên bằng Firefox rồi bấm **Cài đặt** trên trang Tampermonkey. Mở trang phim và tải lại trang.

## Cách dùng

| Chức năng | Thao tác |
| --- | --- |
| Chặn quảng cáo | Chạy tự động khi script đang bật |
| Điều khiển | Dùng nút phát/dừng giữa video và thanh icon phía dưới; chọn tốc độ trong nút cài đặt |
| Hiện/ẩn nút | Chạm một lần trên video |
| Tua nhanh/lùi | Kéo thanh tua hoặc chạm đôi bên phải/trái video để tua 10 giây |
| Tăng tốc tạm thời | Giữ khoảng nửa giây khi phim đang phát để tăng lên 2×; thả để về tốc độ trước đó |
| Bỏ intro | Bấm **Bỏ qua giới thiệu** ở đầu phim để tới mốc 1:30; không cộng thêm vào vị trí đang xem |
| Khóa thao tác | Trong toàn màn hình khung, bấm icon ổ khóa. Khi khóa vẫn chạm đôi tua ±10 giây và giữ 2×; thả để về tốc độ trước đó. Bỏ qua giới thiệu/Tập tiếp theo vẫn hiện và bấm được đúng thời điểm. Chạm phim một lần để ẩn/hiện icon; bấm icon để mở khóa |
| Tập sau | Bấm icon tập tiếp trên thanh dưới hoặc nút gần cuối phim; chữ đổi ngay tại nút. Chuyển ngay trong khung đang dùng, giữ toàn màn hình khung. Giữ đúng bản dịch và mùa. Thiếu tập Lồng tiếng thì báo ngay tại nút, giữ nguyên tập hiện tại |
| Toàn màn hình | Dùng nút **Toàn màn hình** trên thanh custom. Trên điện thoại, script yêu cầu ngang và thả khóa hướng khi thoát; nếu trình duyệt từ chối, xoay máy bằng tay. Pause/Play và chuyển tập giữ khung toàn màn hình; nếu hướng bị trả về dọc, script yêu cầu khôi phục ngang. Nếu vào toàn màn hình video hệ thống, thoát ra để dùng lại nút custom |
| Xem tiếp | Trong **Đang xem** dưới banner, bấm ảnh phim hoặc **Xem tiếp**; khi player sẵn sàng, bấm **Tiếp tục**. Bấm **Lịch sử** cạnh tiêu đề để xem tất cả; trên trang xem, nút nằm dưới player |

Lịch sử lưu trong Tampermonkey của cùng profile, dùng chung giữa các website với đúng phim/mùa/tập/bản dịch, kể cả khi dùng player khác. Biểu tượng mở liên kết ở góc ảnh bìa mở website bạn xem trước đó. Nếu không tìm thấy tập trên website mới, mở đúng phim thủ công rồi dùng nút **Tiếp tục**; hai bản khác thời lượng sẽ có thông báo và không tự tua. Không cần tài khoản website; chưa đồng bộ sang thiết bị khác. Tập mới sẵn sàng sẽ thử bắt đầu phát một lần. Nếu Firefox chặn tự phát có tiếng, cho phép tự phát trong quyền website hoặc bấm **Phát** ở giữa video. Khi bạn bấm Phát, script bật tiếng cùng lúc; nếu âm lượng bằng 0, đưa về mức nghe được. Tạm dừng do bạn chọn sẽ được giữ nguyên.

## Khi chưa chạy

- **Link chỉ hiện mã:** kiểm tra Tampermonkey đã cài và bật, rồi mở lại link trong Firefox thay vì trình duyệt bên trong ứng dụng khác.
- **Không nhận tên miền RoPhim mới:** kiểm tra bản đã cài. Bản 0.1.0 chỉ có ba website ban đầu; mở link phiên bản phía trên để cập nhật, rồi tải lại trang. Bản mới dùng quy tắc tên miền chứa `rophim` và nhận diện cấu trúc nguồn riêng.
- **Không thấy thanh điều khiển:** kiểm tra script Thao tác đang bật, quyền website/iframe và tải lại trang; chờ player tải xong.
- **Khung phát đang chờ:** giao diện gốc luôn được ẩn. Tải chậm quá 20 giây sẽ hiện **Thử lại**; lỗi tải cũng có nút thử lại. Script vẫn cần engine và nguồn phim của website hoạt động.
- **Nút bị mờ:** chờ video sẵn sàng. Nếu server trống/lỗi, thử nút server gốc của website.
- **Lịch sử chưa có:** bật script Lịch sử và phát phim một lúc để có tiến độ.
- **Vẫn có quảng cáo:** gửi [báo lỗi](https://github.com/nhattruong16062003/media-userscripts/issues) kèm trang xem, server/bản dịch và ảnh quảng cáo.

## Cập nhật hoặc gỡ

Tampermonkey kiểm tra bản mới từ repo này. Muốn cập nhật ngay, mở lại link cài và bấm **Cập nhật**, sau đó tải lại trang phim.

Tạm ngừng bằng công tắc trong Dashboard. Sao lưu qua Tampermonkey trước khi gỡ nếu muốn giữ lịch sử. Nếu vừa tắt Chặn quảng cáo để so sánh, có thể cần đóng các tab của website rồi mở lại để kết thúc phiên ẩn quảng cáo.
