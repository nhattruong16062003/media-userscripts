# Motchill — hướng dẫn sử dụng

Bốn script phiên bản **6.0.11**. Mở link bằng Firefox đã cài [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/):

| Script | Link cài |
| --- | --- |
| Chặn quảng cáo | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.11/motchill/noads/motchill-noads.user.js) |
| Thao tác trình phát | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.11/motchill/gestures/motchill-gestures.user.js) |
| Lịch sử xem | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.11/motchill/history/motchill-history.user.js) |
| Mở bản trực tiếp | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.11/motchill/source/motchill-source.user.js) |

Nếu đang dùng bộ Motchill cũ, mở link mới rồi chọn **Cập nhật/Cài lại** trên chính script hiện có. Giữ script Lịch sử để giữ dữ liệu; không cần gỡ trước. Sau khi cập nhật, tải lại trang phim và chỉ bật một bản cho mỗi chức năng.

Nếu Tampermonkey báo **bị loại trừ/không chạy** trên một trang, mở Dashboard → chọn script → **Thiết đặt** → **Các loại trừ của người dùng**. Nếu có dòng chứa tên miền đó, chọn dòng → **Loại bỏ** → **Lưu**, rồi tải lại trang phim. Cập nhật script có thể giữ lại quy tắc riêng này; cài bản mới chưa đủ để bỏ loại trừ.

## Điều khiển phim

Ở nguồn Next tương thích (như trang tập trên motchilll.vip), tiện ích dùng bộ điều khiển custom trên khung phát của trang xem. Player gốc bên trong chỉ nạp phim và luôn ẩn bộ nút gốc. Chất lượng, âm lượng và phụ đề được điều khiển qua giao diện custom khi nguồn cung cấp các lựa chọn này. Dùng nút server hoặc tập trên trang để chuyển trong cùng khung; đổi server giữ tiến độ khi thời lượng phù hợp, chuyển tập giữ đúng server/bản dịch. Nếu server đó chưa có tập tương ứng, tiện ích giữ tập hiện tại.

- Chạm một lần lên vùng trống để ẩn/hiện điều khiển; chạm đôi bên trái/phải tua 10 giây.
- Giữ khi đang phát để tăng lên 2×, thả để trở về tốc độ trước đó.
- Phát/dừng bằng nút giữa màn hình hoặc thanh dưới. Bấm Phát sẽ bật tiếng cùng lúc; nếu âm lượng bằng 0, script đưa về mức nghe được. Cài đặt có tốc độ và các lựa chọn chất lượng, âm thanh, phụ đề mà nguồn JWPlayer cung cấp.
- Khi toàn màn hình, dùng ổ khóa để khóa các nút điều khiển. Vẫn chạm đôi tua tới/lùi 10 giây và giữ 2× khi khóa; thả để về tốc độ trước đó. Bỏ qua giới thiệu và Tập tiếp theo vẫn hiện và bấm được đúng thời điểm khi khóa. Chạm một lần để ẩn/hiện ổ khóa. Thoát toàn màn hình sẽ mở khóa.
- Bỏ qua giới thiệu và chuyển tập bằng nút custom. Mốc giới thiệu đã học trước đây được giữ. Chuyển bản dịch/server bằng các nút tương ứng trên trang.

Nguồn phát và trang phim phải được script nhận diện. Tên miền website có thể thay đổi; host iframe mới có thể cần cập nhật script. Nếu khung chưa sẵn sàng, chờ hoặc chọn **Thử lại**. Giao diện custom vẫn dùng engine của website để nạp phim.

## Mở bản trực tiếp

Nếu trang đang nhúng một trang Motchill gốc tương thích, script xác minh nguồn và đúng tập rồi mới hiện nút mở bản trực tiếp. Nút không xuất hiện trên mọi server hoặc đường dẫn video.

## Lịch sử và tự phát

Mục **Đang xem dở/Lịch sử xem** giúp mở lại phim và tiến độ đã lưu. Dữ liệu cũ của bộ Motchill được giữ khi cập nhật đúng script, trong cùng Tampermonkey/profile. Chưa đồng bộ giữa thiết bị hoặc tự gộp kho lịch sử Motchill với RoPhim.

Nếu Firefox chặn tự phát, bấm Phát hoặc cho phép tự động phát trong quyền website. Nếu máy không tự xoay khi toàn màn hình, xoay ngang bằng tay.

Muốn tạm ngừng, tắt script trong Tampermonkey Dashboard. Xuất bản sao lưu trước khi gỡ script Lịch sử hoặc Tampermonkey nếu muốn giữ tiến độ.
