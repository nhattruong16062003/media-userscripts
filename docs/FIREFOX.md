# Cài RoPhim trên Firefox

## Firefox Android

1. Mở Firefox, vào **⋮ → Tiện ích → Quản lý tiện ích**, tìm và cài **Tampermonkey**. Có thể mở [trang Tampermonkey trên Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/) bằng Firefox.
2. Mở link script muốn dùng ngay trong Firefox:
   - [Chặn quảng cáo](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/main/dist/rophim-noads.user.js)
   - [Thao tác trình phát](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/main/dist/rophim-gestures.user.js)
   - [Lịch sử xem](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/main/dist/rophim-history.user.js)
3. Tampermonkey mở trang cài đặt. Kiểm tra tên **RoPhim**, tác giả **zic**, nguồn là repo `nhattruong16062003/rophim-userscripts`; kéo xuống và bấm **Cài đặt**.
4. Muốn dùng thêm script khác thì làm lại bước 2–3.
5. Mở trang phim và tải lại trang. Trong **⋮ → Tiện ích → Tampermonkey**, kiểm tra các script RoPhim đang bật.

Đã cài cùng script thì nút có thể là **Cập nhật** hoặc **Cài lại**. Giữ mục Lịch sử đang có khi cập nhật để giữ dữ liệu.

## Firefox máy tính

Cài [Tampermonkey](https://addons.mozilla.org/firefox/addon/tampermonkey/), mở từng link phía trên bằng Firefox rồi bấm **Cài đặt** trên trang Tampermonkey. Mở trang phim và tải lại trang.

## Cách dùng

| Chức năng | Thao tác |
| --- | --- |
| Chặn quảng cáo | Chạy tự động khi script đang bật |
| Điều khiển | Bấm **RP** ở góc player để mở bảng |
| Tua nhanh/lùi | Nút ±10 giây hoặc chạm đôi bên phải/trái video, tránh thanh điều khiển gốc |
| Tăng tốc tạm thời | Giữ khoảng nửa giây trên video để phát 2×; thả để về tốc độ trước đó |
| Bỏ intro | Chỉnh khoảng tua thêm (0–600 giây, mặc định 90), rồi bấm bỏ intro |
| Tập sau | Bấm nút tập sau để chuyển trong cùng bản dịch/mùa khi có tập kế |
| Toàn màn hình | Dùng nút trong bảng RP; toàn màn hình video hệ thống có thể che nút HTML |
| Xem tiếp | Mở **Lịch sử RP**, chọn phim, rồi bấm **Tiếp tục** khi player sẵn sàng |

Lịch sử lưu trong Tampermonkey của cùng profile, riêng từng phim/mùa/tập/bản dịch. Không cần tài khoản website; chưa đồng bộ sang thiết bị khác. Trình duyệt chặn tự phát thì bấm Play của player.

## Khi chưa chạy

- **Link chỉ hiện mã:** kiểm tra Tampermonkey đã cài và bật, rồi mở lại link trong Firefox thay vì trình duyệt bên trong ứng dụng khác.
- **Không thấy RP:** kiểm tra script Thao tác đang bật, quyền website/iframe và tải lại trang; chờ player tải xong.
- **Nút bị mờ:** chờ video sẵn sàng. Nếu server trống/lỗi, thử nút server gốc của website.
- **Lịch sử chưa có:** bật script Lịch sử và phát phim một lúc để có tiến độ.
- **Vẫn có quảng cáo:** gửi [báo lỗi](https://github.com/nhattruong16062003/rophim-userscripts/issues) kèm trang xem, server/bản dịch và ảnh quảng cáo.

## Cập nhật hoặc gỡ

Tampermonkey kiểm tra bản mới từ repo này. Muốn cập nhật ngay, mở lại link cài và bấm **Cập nhật**, sau đó tải lại trang phim.

Tạm ngừng bằng công tắc trong Dashboard. Sao lưu qua Tampermonkey trước khi gỡ nếu muốn giữ lịch sử. Nếu vừa tắt Chặn quảng cáo để so sánh, có thể cần đóng các tab của website rồi mở lại để kết thúc phiên ẩn quảng cáo.
