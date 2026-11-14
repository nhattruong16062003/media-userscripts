# RoPhim userscripts

Ba script độc lập: chặn quảng cáo, thao tác trình phát và lịch sử xem. Có thể cài riêng từng script.

## Cài trên Firefox

1. Cài [Tampermonkey cho Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/).
2. Mở từng link dưới đây **bằng Firefox**. Tampermonkey hiện trang cài đặt; kiểm tra tên **RoPhim**, rồi bấm **Cài đặt**.
3. Mở trang phim và tải lại trang.

| Script | Phiên bản | Link cài |
| --- | --- | --- |
| Chặn quảng cáo | 0.2.0 | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.2.0/dist/rophim-noads.user.js) |
| Thao tác trình phát | 0.2.0 | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.2.0/dist/rophim-gestures.user.js) |
| Lịch sử xem | 0.2.0 | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.2.0/dist/rophim-history.user.js) |

Đã cài thì bấm **Cập nhật** hoặc **Cài lại**; không cần chép mã vào editor. Xem [hướng dẫn Firefox Android và máy tính](docs/FIREFOX.md).

Link cài gắn với phiên bản cụ thể. Trước khi bấm cập nhật, kiểm tra trang Tampermonkey hiện **0.2.0**. Nếu đang dùng cả ba script, cập nhật cả ba rồi tải lại trang phim. Giữ script Lịch sử hiện có khi cập nhật để giữ tiến độ.

## Sử dụng

- **Chặn quảng cáo:** chạy tự động sau khi tải lại trang; ẩn slide tài trợ, ảnh thu nhỏ của nó và hàng nhà cái, giữ banner phim.
- **Thao tác trình phát:** khi video sẵn sàng, dùng thanh điều khiển RP với nút phát/dừng, thanh tua, **Khóa** và **Toàn màn hình**. Chạm video để hiện/ẩn nút; chạm đôi bên trái/phải để tua 10 giây; giữ khoảng nửa giây để phát 2×, thả để về tốc độ cũ. Khi khóa, bấm **Mở khóa** ở góc video để thao tác lại.
- **Bảng RP:** mở ở góc player để chọn tốc độ, ±10 giây, bỏ intro và **Tập sau**. Ô intro là khoảng tua thêm, mặc định 90 giây. Tập sau giữ đúng bản dịch và mùa: đang Lồng tiếng sẽ tiếp tục Lồng tiếng; thiếu tập cùng bản dịch thì hiện thông báo.
- **Lịch sử xem:** trang chủ có mục **Đang xem** và nút **Lịch sử RP**. Bấm **Xem tiếp tại đây** để tìm tập trên website đang mở; khi player sẵn sàng, bấm **Tiếp tục** để tua đến mốc đã lưu. **Trang đã xem** mở lại website trước đó.

Lịch sử dùng chung giữa các website trong cùng Tampermonkey/profile, đối chiếu đúng phim, mùa, tập và bản dịch. Nếu chưa tìm được tập ở website mới, mở phim đó thủ công để kiểm tra mốc tiếp tục. Nếu hai bản phim khác thời lượng, script báo và không tự tua sai mốc. Chưa đồng bộ giữa thiết bị.

## Website và player

Script dùng `@include` cho tên miền chứa `rophim`; không cần thêm từng domain website vào danh sách. Khi trang có cấu trúc nguồn đã hỗ trợ, script nhận diện từ HTML/dữ liệu và player thực tế. Host iframe được cấp quyền riêng; player chuyển sang host mới có thể cần cập nhật script. Điều khiển dùng ngay trong trang xem và iframe hiện tại.

Nếu không thấy RP, kiểm tra script đang bật, tải lại trang và chờ player sẵn sàng. Dùng nút **Toàn màn hình** của RP để giữ điều khiển trong khung player. Nếu trình duyệt chuyển sang toàn màn hình video hệ thống, thoát chế độ đó để trở lại các nút custom.

## Cập nhật và gỡ

Tampermonkey kiểm tra cập nhật từ repo này. Có thể mở lại link cài phía trên để cập nhật thủ công; sau đó tải lại trang phim. Muốn tạm ngừng, tắt script trong Dashboard. Trước khi gỡ script Lịch sử hoặc Tampermonkey, xuất bản sao lưu nếu muốn giữ tiến độ.
