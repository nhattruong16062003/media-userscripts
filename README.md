# RoPhim userscripts

Ba script độc lập: chặn quảng cáo, thao tác trình phát và lịch sử xem. Có thể cài riêng từng script.

## Cài trên Firefox

1. Cài [Tampermonkey cho Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/).
2. Mở từng link dưới đây **bằng Firefox**. Tampermonkey hiện trang cài đặt; kiểm tra tên **RoPhim**, rồi bấm **Cài đặt**.
3. Mở trang phim và tải lại trang.

| Script | Phiên bản | Link cài |
| --- | --- | --- |
| Chặn quảng cáo | 0.1.1 | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/main/dist/rophim-noads.user.js) |
| Thao tác trình phát | 0.1.1 | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/main/dist/rophim-gestures.user.js) |
| Lịch sử xem | 0.1.1 | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/main/dist/rophim-history.user.js) |

Đã cài thì bấm **Cập nhật** hoặc **Cài lại**; không cần chép mã vào editor. Xem [hướng dẫn Firefox Android và máy tính](docs/FIREFOX.md).

## Sử dụng

- **Chặn quảng cáo:** chạy tự động sau khi tải lại trang.
- **Thao tác trình phát:** bấm **RP** trong góc player để mở nút phát/dừng, ±10 giây, tốc độ, bỏ intro, tập sau và toàn màn hình. Chạm đôi bên trái/phải video để tua; giữ khoảng nửa giây để phát 2×, thả để về tốc độ cũ. Ô intro là khoảng tua thêm, mặc định 90 giây và có thể chỉnh.
- **Lịch sử xem:** phát phim để lưu tiến độ; mở **Lịch sử RP**, chọn phim rồi bấm **Tiếp tục** khi player sẵn sàng. Dữ liệu nằm trong Tampermonkey của cùng trình duyệt/profile, tách riêng từng bản dịch; chưa đồng bộ giữa thiết bị.

## Website và player

Script dùng `@include` cho tên miền chứa `rophim`; không cần thêm từng domain website vào danh sách. Khi trang có cấu trúc nguồn đã hỗ trợ, script nhận diện từ HTML/dữ liệu và player thực tế. Host iframe được cấp quyền riêng; player chuyển sang host mới có thể cần cập nhật script. Điều khiển dùng ngay trong trang xem và iframe hiện tại.

Nếu không thấy RP, kiểm tra script đang bật, tải lại trang và chờ player sẵn sàng. Khi toàn màn hình video của hệ thống che nút RP, thoát ra rồi dùng nút toàn màn hình trong bảng RP.

## Cập nhật và gỡ

Tampermonkey kiểm tra cập nhật từ repo này. Có thể mở lại link cài phía trên để cập nhật thủ công; sau đó tải lại trang phim. Muốn tạm ngừng, tắt script trong Dashboard. Trước khi gỡ script Lịch sử hoặc Tampermonkey, xuất bản sao lưu nếu muốn giữ tiến độ.
