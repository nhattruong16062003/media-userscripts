# Tiện ích xem phim — RoPhim & Motchill

Chọn bộ dành cho website bạn sử dụng. RoPhim có ba script: chặn quảng cáo, điều khiển trình phát và lịch sử xem. Motchill có thêm Mở bản trực tiếp, tổng cộng bảy script. Có thể cài cả hai bộ trong cùng Tampermonkey.

## Cài trên Firefox

1. Cài [Tampermonkey cho Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/).
2. Mở từng link cài bên dưới **bằng Firefox**, rồi chọn **Cài đặt/Cập nhật** trong Tampermonkey.
3. Quay lại trang phim và tải lại trang.

| Website | Chặn quảng cáo | Điều khiển trình phát | Lịch sử xem |
| --- | --- | --- | --- |
| **RoPhim 0.4.26** | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.26/rophim/noads/rophim-noads.user.js) | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.26/rophim/gestures/rophim-gestures.user.js) | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.26/rophim/history/rophim-history.user.js) |
| **Motchill 6.0.26** | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.26/motchill/noads/motchill-noads.user.js) | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.26/motchill/gestures/motchill-gestures.user.js) | [Cài đặt](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.26/motchill/history/motchill-history.user.js) |

Script thứ tư của Motchill: [Mở bản trực tiếp 6.0.26](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.26/motchill/source/motchill-source.user.js). Nút chỉ hiện khi xác minh được trang phim gốc đang nhúng.

Đã cài bản cũ thì mở link mới để **cập nhật tại chỗ**, giữ nguyên script Lịch sử để giữ tiến độ. Không cần gỡ Tampermonkey hoặc chép mã thủ công. Kiểm tra đúng tên script và phiên bản trước khi xác nhận. Nếu có hai bản cùng chức năng cho cùng website, chỉ bật một bản.

Với bản Motchill **6.0.26**, cập nhật cả bốn script Motchill để player, lịch sử và các chức năng đi kèm cùng nhận đúng tập sau khi chuyển tập.

## Sử dụng

Đổi Vietsub/Thuyết minh/Lồng tiếng sẽ lấy mốc đã lưu của đúng bản dịch trên tập đó nếu có và thời lượng tương thích. Nếu chưa có mốc, tiện ích giữ thời gian đang xem khi nguồn mới có thời lượng tương thích. Đổi server trong cùng bản dịch giữ tiến độ hiện tại. Cập nhật cả Điều khiển trình phát và Lịch sử xem để dùng cùng cơ chế; không cần xóa lịch sử cũ.

Đang tạm dừng thì đổi bản dịch bằng nút trên trang hoặc mục chuyển bản dịch vẫn giữ tạm dừng. Mở phim từ lịch sử sẽ khôi phục tiến độ sau khi đúng nguồn đã tải xong.

Đang khóa trong fullscreen thì chuyển tập hoặc đổi nguồn vẫn giữ khóa. Thoát fullscreen sẽ mở khóa; vào fullscreen lần sau bắt đầu ở trạng thái mở khóa.

Khi hiện bộ điều khiển, dòng nhỏ trên thanh tua cho biết tốc độ nhận dữ liệu phim và số giây đã tải trước liên tục từ vị trí đang xem. Khi phim thiếu dữ liệu sẽ có vòng chờ cùng thông số; phát tiếp được thì vòng chờ tự ẩn. Chủ động tạm dừng không làm hiện vòng chờ. Thông số ẩn cùng bộ nút để không che phim.

Tốc độ chỉ hiện khi nguồn cho phép đo dữ liệu tải; dấu **—** nghĩa là chưa đo được, không đồng nghĩa mạng ngừng. Engine có thể tạm ngừng tải khi đã đủ bộ đệm. Chi tiết nằm trong Cài đặt. Nguồn HLS 1.6.5, 1.6.8 (qua JWPlayer) và 1.7.3 tương thích có thể tải thêm sau khi phát ổn định ít nhất 15 giây, mạng đủ nhanh và thiết bị đang giải mã tốt. Tiện ích tăng từng bước tối đa 10 giây, cách nhau ít nhất 15 giây chạy ổn định. Mức tối đa là **4 lần thời gian tải trước mặc định**, đồng thời chịu giới hạn 4 phút, dữ liệu thêm ước tính 16 MiB và tổng bộ đệm ước tính 96 MiB; vì vậy không phải phim nào cũng tăng đủ 4 lần. Mức gốc vốn cao hơn các giới hạn này được giữ nguyên. Lần mở phim, tua và đổi nguồn vẫn dùng mức tải gốc, không chờ tải đầy mới phát. Thiết bị quá tải, tốc độ tải thấp kéo dài hoặc nguồn không hỗ trợ thì giữ/trả về mức gốc. Khi tạm dừng, tua, đổi tốc độ, đổi chất lượng hoặc đưa trang xuống nền, tiện ích cũng trả cấu hình về mức gốc. Giới hạn dung lượng được ước tính từ bitrate, còn trình duyệt/engine quyết định quota thực tế. Video MP4 phát trực tiếp do trình duyệt quản lý tải trước; tiện ích vẫn hiển thị thông số khi đo được. Không có cam kết loại bỏ mọi lần giật do mạng hay thiết bị.

Các nguồn tương thích dùng bộ điều khiển custom. Với nguồn Next như trang tập trên motchilll.vip, trên điện thoại bộ nút custom nằm cùng khung với video thật để giữ hướng ngang khi Phát/Tạm dừng. Chọn chất lượng và phụ đề mà nguồn cung cấp trong menu cài đặt custom. Chuyển tập hoặc server trong nguồn tương thích giữ nguyên khung video và fullscreen; tập tiếp theo giữ đúng server và bản dịch đang chọn. Nếu dữ liệu không xác định được duy nhất tập phù hợp, tiện ích giữ tập hiện tại để tránh phát nhầm.

Toàn màn hình dùng khung chứa cả phim và các nút custom. Bấm Phát/Tạm dừng không gọi nút fullscreen của player bên trong. Nếu trình duyệt từ chối khóa hướng, script không ép thoát/vào fullscreen. Chọn tập, server và bản dịch bằng các nút trên trang xem; bộ nút gốc bên trong được ẩn cả lúc tải và đổi nguồn.

- Chạm vùng trống trên phim để ẩn/hiện điều khiển. Chạm đôi hai bên để tua 10 giây; giữ khi đang phát để xem 2×, thả để trở về tốc độ cũ.
- Nút phát/dừng nằm ở giữa và thanh dưới. Bấm Phát sẽ bật tiếng cùng lúc; nếu âm lượng đang bằng 0, script đưa về mức nghe được. Trong toàn màn hình có nút khóa; khi khóa vẫn chạm đôi tua ±10 giây và giữ 2×, hai nút Bỏ qua giới thiệu/Tập tiếp theo vẫn hiện và bấm được đúng thời điểm; chạm một lần để ẩn/hiện ổ khóa.
- Chọn tốc độ trong cài đặt. Nếu nguồn phát cung cấp chất lượng, âm thanh hoặc phụ đề mà script hỗ trợ, các lựa chọn xuất hiện trong cùng menu.
- Chuyển tập bằng nút custom để giữ khung phát. Bản dịch/server được xử lý theo dữ liệu của từng website.
- Motchill nhớ lựa chọn âm thanh khi tải lại cùng website. Khi phim tiếp tục chạy, script thử khôi phục tiếng; nếu trình duyệt chặn thì bỏ qua, không bắt bấm Play lại. Đã chủ động tắt tiếng thì vẫn giữ tắt tiếng.
- Bộ chặn quảng cáo hoạt động riêng với giao diện player. Lịch sử được giữ trong Tampermonkey/profile đang dùng, chưa đồng bộ giữa thiết bị.
- Chặn quảng cáo còn có lớp hạn chế mở trang ngoài: popup do mã trang tự mở bị chặn; bấm link ngoài website sẽ được hỏi trước. Cập nhật cả script Chặn quảng cáo và tải lại trang. Userscript không chặn được tuyệt đối mọi kiểu tự đổi địa chỉ/chuyển hướng, đặc biệt trong trang cha trên Firefox.

Nếu phim không tự phát, bấm **Phát**; có thể cho phép tự động phát trong quyền website của Firefox. Khi khung đang tải, chờ hoặc dùng **Thử lại** nếu xuất hiện. Nếu trình duyệt không hỗ trợ khóa hướng, xoay máy bằng tay.

Xem hướng dẫn riêng: [RoPhim](rophim/README.md) · [Motchill](motchill/README.md).
