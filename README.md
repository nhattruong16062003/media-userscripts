# RoPhim userscripts

Ba script độc lập: chặn quảng cáo, thao tác trình phát và lịch sử xem. Có thể cài riêng từng script.

## Cài trên Firefox

1. Cài [Tampermonkey cho Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/).
2. Mở từng link dưới đây **bằng Firefox**. Tampermonkey hiện trang cài đặt; kiểm tra tên **RoPhim**, rồi bấm **Cài đặt**.
3. Mở trang phim và tải lại trang.

| Script | Phiên bản | Link cài |
| --- | --- | --- |
| Chặn quảng cáo | 0.3.3 | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.3.3/dist/rophim-noads.user.js) |
| Thao tác trình phát | 0.3.3 | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.3.3/dist/rophim-gestures.user.js) |
| Lịch sử xem | 0.3.3 | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/rophim-userscripts/v0.3.3/dist/rophim-history.user.js) |

Đã cài thì bấm **Cập nhật** hoặc **Cài lại**; không cần chép mã vào editor. Xem [hướng dẫn Firefox Android và máy tính](docs/FIREFOX.md).

Link cài gắn với phiên bản cụ thể. Trước khi bấm cập nhật, kiểm tra trang Tampermonkey hiện **0.3.3**. Nếu đang dùng cả ba script, cập nhật cả ba rồi tải lại trang phim. Giữ script Lịch sử hiện có khi cập nhật để giữ tiến độ.

## Sử dụng

- **Chặn quảng cáo:** chạy tự động sau khi tải lại trang; ẩn slide tài trợ, ảnh thu nhỏ của nó và hàng Nhà cái/Nhà tài trợ uy tín, giữ banner phim.
- **Thao tác trình phát:** thanh tua mỏng, nút phát/dừng ở giữa và phía dưới video. Chạm một lần để hiện/ẩn điều khiển; chạm đôi bên trái/phải để tua 10 giây; giữ khoảng nửa giây khi phim đang phát để tăng lên 2×, thả để về tốc độ cũ. Nút cài đặt chọn tốc độ.
- **Khóa:** trong toàn màn hình khung, bấm biểu tượng ổ khóa. Khi khóa, chỉ nút mở khóa hoạt động; chạm một lần lên phim để ẩn/hiện ổ khóa. Biểu tượng tự ẩn sau 2,5 giây.
- **Giới thiệu và tập tiếp theo:** nút **Bỏ qua giới thiệu** ở đầu phim đưa đến mốc 1:30, không hiện thông báo thêm. Nút tập tiếp theo có trên thanh dưới và xuất hiện gần cuối phim; bấm sẽ đổi chữ ngay trên nút. Chuyển tập ngay trong khung phát, giữ toàn màn hình khung; có thể chọn tập ở danh sách bên ngoài player. Giữ đúng bản dịch và mùa: đang Lồng tiếng sẽ tiếp tục Lồng tiếng; thiếu tập cùng bản dịch thì báo tại nút, giữ nguyên tập đang xem.
- **Lịch sử xem:** mục **Đang xem** nằm trong vùng nội dung dưới banner, có ảnh phim và thanh tiến độ. Bấm ảnh hoặc **Xem tiếp** để mở phim trên website hiện tại; khi player sẵn sàng, bấm **Tiếp tục** để tới mốc đã lưu. **Lịch sử** nằm cạnh tiêu đề Đang xem; trên trang xem, nút nằm dưới player. Biểu tượng mở liên kết trên ảnh đưa về trang đã xem trước đó.

Lịch sử dùng chung giữa các website trong cùng Tampermonkey/profile, đối chiếu đúng phim, mùa, tập và bản dịch. Nếu chưa tìm được tập ở website mới, mở phim đó thủ công để kiểm tra mốc tiếp tục. Nếu hai bản phim khác thời lượng, script báo và không tự tua sai mốc. Chưa đồng bộ giữa thiết bị.

## Website và player

Script dùng `@include` cho tên miền chứa `rophim`; không cần thêm từng domain website vào danh sách. Khi trang có cấu trúc nguồn đã hỗ trợ, script nhận diện từ HTML/dữ liệu và player thực tế. Host iframe được cấp quyền riêng; player chuyển sang host mới có thể cần cập nhật script. Điều khiển dùng ngay trong trang xem và iframe hiện tại.

Giao diện gốc được ẩn trong suốt quá trình dùng điều khiển custom. Khi tải chậm, khung phát giữ màn chờ; sau 20 giây có nút **Thử lại**. Lỗi tải hiện thông báo và nút thử lại, không tự chuyển sang bộ nút gốc. Script vẫn dùng engine của website để nạp video.

Nút toàn màn hình yêu cầu xoay ngang trên điện thoại; thoát toàn màn hình sẽ thả khóa hướng do script tạo. Trình duyệt cần cho phép toàn màn hình và khóa hướng; nếu không hỗ trợ khóa hướng, bạn có thể xoay máy bằng tay.

Khi tập mới sẵn sàng, script thử bắt đầu phát một lần. Nếu Firefox chặn tự phát có tiếng, cho phép tự phát trong quyền website hoặc bấm **Phát** ở giữa video. Việc bạn chủ động tạm dừng sẽ được giữ nguyên.

Nếu không thấy thanh điều khiển, kiểm tra script đang bật, tải lại trang và chờ player sẵn sàng. Dùng nút **Toàn màn hình** trên thanh custom để giữ điều khiển trong khung player. Nếu trình duyệt chuyển sang toàn màn hình video hệ thống, thoát chế độ đó để trở lại các nút custom.

## Cập nhật và gỡ

Tampermonkey kiểm tra cập nhật từ repo này. Có thể mở lại link cài phía trên để cập nhật thủ công; sau đó tải lại trang phim. Muốn tạm ngừng, tắt script trong Dashboard. Trước khi gỡ script Lịch sử hoặc Tampermonkey, xuất bản sao lưu nếu muốn giữ tiến độ.
