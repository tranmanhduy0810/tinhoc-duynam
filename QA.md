# Báo cáo kiểm thử — 12/10/2026

## Kết quả

- Build thành công: 120 câu hỏi, 6 chủ đề, mỗi chủ đề 20 câu.
- Kiểm cú pháp JavaScript: đạt.
- **11/11 unit tests đạt.**
- **20/20 browser tests Chromium đạt.**
- Bốn độ rộng **375, 768, 1280, 1920px**: các màn ôn tập, thi thử, lịch sử, ngân hàng và làm bài không cuộn ngang.
- Các màn chính không có lỗi JavaScript hoặc tài nguyên HTTP lỗi trong kiểm thử.
- Đã mở portal trong Control UI. Chromium truy cập đường dẫn portal nhận HTTP 200, hiển thị đủ 6 chủ đề, mở bài có 4 lựa chọn, không có lỗi JavaScript. Ảnh chụp: `artifacts/portal-preview.png` (nằm ngoài gói mã nguồn).

## Các luồng đã kiểm chứng

1. Danh sách 6 chủ đề, tìm không dấu, không có kết quả và xóa tìm kiếm.
2. Chọn đáp án, đổi đáp án, đánh dấu câu, chuyển câu, tải lại giữ trạng thái.
3. Xem đáp án ngay và giải thích trong chế độ luyện tập.
4. Nộp bài có câu bỏ trống, chấm điểm từng phần và 20/20 câu đúng.
5. Xem lại bài đã nộp không sửa được câu trả lời; luyện lại đúng tập câu sai/trống.
6. Đề thi 30 câu, 5 câu mỗi chủ đề, không trùng; unit test chạy 100 lượt tạo đề.
7. Thi thử không hiện đáp án trước khi nộp; hạn chót không đổi khi tải lại.
8. Mở lại bài thi đã hết giờ và tự nộp khi đang ở màn ôn chủ đề khác.
9. Lịch sử giữ sau tải lại, tải kết quả/ngân hàng JSON.
10. Thêm câu, khôi phục mẫu, từ chối JSON lỗi; không ghi đè bộ đang dùng khi nhập lỗi.
11. Nội dung HTML nhập qua JSON chỉ hiện như chữ, không chạy mã.
12. localStorage hỏng hoặc không ghi được vẫn có giao diện và thông báo.
13. Phím tắt, hủy dialog bằng Escape, đường dẫn practice.html.
14. Hai tab cùng origin nhận cập nhật; bài đã nộp không bị tab cũ ghi đè.
15. ID trùng, đáp án không hợp lệ và ID thuộc tính đối tượng đặc biệt đều bị từ chối.

## Kiểm giao diện

Đã chạy `ui-ux/scripts/probe.mjs` ở 375, 768, 1280px và xem ảnh desktop/mobile.

- Đã sửa padding ô tìm kiếm khiến icon chồng chữ.
- Đã sửa dòng metadata bị rớt lẻ ở tablet.
- Đã tăng chữ nhỏ dưới 12px và cân lại dòng tiêu đề mobile.
- Đã nới vùng bấm đường dẫn quay về trên mobile lên tối thiểu 32px.
- Probe trang chủ sau sửa: **0 mục phân loại Hỏng**.
- Probe nhanh màn làm bài sau sửa ở 375/1280px: không đo ra lỗi.
- Hai loại gợi ý probe được giữ có chủ ý: thẻ chủ đề có nhiều dòng vì cần đủ mô tả, số câu, tiến độ và hành động theo cấu trúc mẫu; vòng focus bàn phím được giữ để người học thấy vị trí đang thao tác. Không coi đó là lỗi chức năng.

## Phạm vi chưa kiểm / chưa triển khai

- Chưa thử trên Safari/iPhone hay Firefox thực tế; kiểm responsive bằng Chromium.
- Chưa đăng GitHub Pages vì chưa có tài khoản GitHub kết nối. Workflow đã chuẩn bị theo tài liệu chính thức, nhưng chưa có lần triển khai từ xa để kiểm chứng.
- Chưa có đăng nhập, đồng bộ kết quả giữa các thiết bị, quản lý lớp hoặc thi có chống gian lận; đây là bản tự học tĩnh.
- 120 câu mẫu là nội dung tự biên soạn, không phải đề chính thức. Chủ sở hữu cần rà nội dung trước khi dùng cho một chương trình đào tạo cụ thể.
- Chế độ giao diện: sáng; chưa làm dark mode.

Xem `README.md` để chạy lại tests, thay ngân hàng và triển khai.
