# Motchill — hướng dẫn sử dụng

Bốn script phiên bản **6.0.0**. Mở link bằng Firefox đã cài [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/):

| Script | Link cài |
| --- | --- |
| Chặn quảng cáo | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.4.0/motchill/noads/motchill-noads.user.js) |
| Thao tác trình phát | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.4.0/motchill/gestures/motchill-gestures.user.js) |
| Lịch sử xem | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.4.0/motchill/history/motchill-history.user.js) |
| Mở bản trực tiếp | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.4.0/motchill/source/motchill-source.user.js) |

Nếu đang dùng bộ Motchill cũ, mở link mới rồi chọn **Cập nhật/Cài lại** trên chính script hiện có. Giữ script Lịch sử để giữ dữ liệu; không cần gỡ trước. Sau khi cập nhật, tải lại trang phim và chỉ bật một bản cho mỗi chức năng.

## Điều khiển phim

- Chạm một lần lên vùng trống để ẩn/hiện điều khiển; chạm đôi bên trái/phải tua 10 giây.
- Giữ khi đang phát để tăng lên 2×, thả để trở về tốc độ trước đó.
- Phát/dừng bằng nút giữa màn hình hoặc thanh dưới. Cài đặt có tốc độ và các lựa chọn chất lượng, âm thanh, phụ đề mà nguồn JWPlayer cung cấp.
- Khi toàn màn hình, dùng ổ khóa để khóa thao tác; chạm vùng trống để ẩn/hiện ổ khóa. Thoát toàn màn hình sẽ mở khóa.
- Bỏ qua giới thiệu và chuyển tập bằng nút custom. Mốc giới thiệu đã học trước đây được giữ. Chuyển bản dịch/server bằng các nút tương ứng trên trang.

Nguồn phát và trang phim phải được script nhận diện. Tên miền website có thể thay đổi; host iframe mới có thể cần cập nhật script. Nếu khung chưa sẵn sàng, chờ hoặc chọn **Thử lại**. Giao diện custom vẫn dùng engine của website để nạp phim.

## Mở bản trực tiếp

Nếu trang đang nhúng một trang Motchill gốc tương thích, script xác minh nguồn và đúng tập rồi mới hiện nút mở bản trực tiếp. Nút không xuất hiện trên mọi server hoặc đường dẫn video.

## Lịch sử và tự phát

Mục **Đang xem dở/Lịch sử xem** giúp mở lại phim và tiến độ đã lưu. Dữ liệu cũ của bộ Motchill được giữ khi cập nhật đúng script, trong cùng Tampermonkey/profile. Chưa đồng bộ giữa thiết bị hoặc tự gộp kho lịch sử Motchill với RoPhim.

Nếu Firefox chặn tự phát, bấm Phát hoặc cho phép tự động phát trong quyền website. Nếu máy không tự xoay khi toàn màn hình, xoay ngang bằng tay.

Muốn tạm ngừng, tắt script trong Tampermonkey Dashboard. Xuất bản sao lưu trước khi gỡ script Lịch sử hoặc Tampermonkey nếu muốn giữ tiến độ.
