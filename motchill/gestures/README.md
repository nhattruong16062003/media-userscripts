# Motchill — Điều khiển trình phát

Phiên bản **6.0.12**. Mở [link cài](https://raw.githubusercontent.com/nhattruong16062003/media-userscripts/v0.4.12/motchill/gestures/motchill-gestures.user.js) bằng Firefox đã cài Tampermonkey, rồi chọn Cài đặt/Cập nhật.

Xem [hướng dẫn sử dụng](../README.md). Giữ script hiện có khi cập nhật để giữ dữ liệu.

Nguồn Next tương thích như motchilll.vip dùng giao diện custom đã duyệt trên khung phát ổn định của trang xem. Các nút gốc trong iframe luôn được ẩn; engine vẫn nạp phim, giữ lớp phụ đề và nhận lệnh từ bộ custom. Play/Pause không gọi nút fullscreen của player bên trong. Chất lượng và phụ đề mà engine cung cấp xuất hiện trong cài đặt custom.

Nút vẫn hiện sau khi phim tải xong; chạm vùng trống để ẩn/hiện lại. Khi trình duyệt báo xoay dọc trong fullscreen lúc Phát/Tạm dừng hoặc chuyển tập, script yêu cầu ngang lại ngay, không chờ bộ đếm và không thoát/vào fullscreen. Việc khóa hướng vẫn phụ thuộc quyền hỗ trợ của trình duyệt. Chọn tập/server/bản dịch bằng các nút của trang xem; các nút đổi nguồn trùng trong player được ẩn.


Tải lại cùng website sẽ nhớ lựa chọn bật/tắt tiếng. Phim đang chạy chỉ được thử khôi phục âm thanh; nếu trình duyệt không cho bật tiếng thì bỏ qua, không pause hoặc bắt bấm Play lại.
