# Tin học Duy Nấm

Website tự học tin học cơ bản, lấy cảm hứng về luồng sử dụng từ [trang tham khảo](https://tinhockp.github.io/tinhoccoban/practice.html). Mã nguồn và 120 câu hỏi mẫu được biên soạn độc lập. Không sử dụng logo, danh nghĩa trường hoặc ngân hàng câu hỏi của trang tham khảo.

## Mở ngay trên máy Windows

Nhấp đúp **MO_WEBSITE.bat**. Website mở tại **http://127.0.0.1:4173**. Bộ bàn giao có sẵn `dist/`, máy có Node.js 22 trở lên là chạy được, không cần cài gói hay kết nối Internet ở bước này.

Máy hiện tại đã có Node.js. Với máy khác chưa có, cài bản LTS từ https://nodejs.org trước. Đừng mở trực tiếp `index.html` bằng `file://`: trình duyệt cần HTTP để tải module và JSON.

Máy chủ chỉ nghe trên `127.0.0.1`; link này chỉ dùng trên máy đang chạy, **chưa phải website công khai**. Máy chủ chạy nền, không tự chạy lại khi khởi động máy; bấm `MO_WEBSITE.bat` để mở lại. Mở nhiều lần không tạo thêm máy chủ nếu bản hiện tại đang hoạt động.

## Chức năng đã có

- 6 chủ đề: nền tảng CNTT, Windows, Internet, Word, Excel, PowerPoint.
- 120 câu mẫu tự biên soạn, 20 câu/chủ đề; không phải bộ đề chính thức hay bản chép 300 câu của trang mẫu.
- Luyện từng chủ đề, chọn lại đáp án, đánh dấu câu, xem giải thích ngay tùy chọn.
- Lưu tiến độ và tiếp tục bài đang làm trên cùng trình duyệt.
- Thi thử 30 câu, phân bổ 5 câu mỗi chủ đề, thời gian 30 phút.
- Hết giờ tự nộp. Đồng hồ giữ hạn chót khi tải lại/rời trang; nếu đóng trình duyệt, bài hết hạn được chốt khi mở lại.
- Chấm theo thang 10; câu trống không có điểm. Mục tiêu thi thử mặc định 50%, chỉ dùng luyện tập.
- Xem lại từng câu và làm bộ ôn riêng từ các câu sai/chưa trả lời.
- Lịch sử 50 bài gần nhất, tải kết quả và lịch sử dạng JSON.
- Nhập/xuất ngân hàng JSON, thêm câu hỏi bằng biểu mẫu.
- Giao diện điện thoại và máy tính, tìm kiếm không dấu, phím tắt 1–4 và trái/phải.
- Font Inter và icon Lucide đóng gói cục bộ; không cần CDN, không có analytics.

## Phạm vi dữ liệu

Đây là web tĩnh tự học, **không có tài khoản, bảng điểm tập trung hoặc quản trị có phân quyền**. Không thu thập thông tin học viên. Mỗi trình duyệt lưu dữ liệu của riêng nó trong localStorage; xóa dữ liệu trình duyệt sẽ mất tiến độ. Hai máy, hai trình duyệt hoặc hai địa chỉ website khác nhau có bộ nhớ riêng. Trình duyệt chặn lưu trữ sẽ được thông báo; nên xuất kết quả trước khi đóng.

Ngân hàng chứa đáp án phía trình duyệt, phù hợp ôn tập/thi thử, không phải hệ thống thi có chống gian lận. Bài ôn bật xem đáp án ngay vẫn được chấm để phục vụ học và có nhãn riêng trong kết quả.

## Thay tên, màu sắc và câu hỏi

1. Sửa `site/config.js`: tên website, câu giới thiệu, số câu và thời gian thi, mục tiêu điểm. `examQuestions` không được vượt tổng ngân hàng; `examMinutes` là số phút dương.
2. Sửa khối **THƯƠNG HIỆU** trong `site/styles.css`: font và màu nhấn. Bản hiện tại chỉ có giao diện sáng, xanh dương.
3. Thay `site/assets/favicon.svg` nếu cần logo riêng.
4. Cập nhật câu hỏi qua giao diện **Ngân hàng câu hỏi**, sau đó **Xuất JSON**, chép đè `site/data/questions.json` trong mã nguồn.
5. Nhấp đúp **CAP_NHAT_WEBSITE.bat** (hoặc `npm run build`), tải lại trình duyệt.

**Quan trọng:** sửa/nhập ngân hàng trong giao diện chỉ áp dụng trên trình duyệt đó. Muốn học viên khác có ngân hàng mới, cần xuất JSON, cập nhật tệp nguồn và đăng lại site. Nếu trình duyệt đang dùng ngân hàng tùy chỉnh, nó ưu tiên bản này; chọn **Khôi phục bộ mẫu** để dùng bản mới do website cung cấp.

Mỗi lượt ôn lấy tối đa 50 câu đầu của chủ đề. Bộ mẫu có 20 câu/chủ đề nên hiển thị đúng 20. Thêm đủ 50 câu/chủ đề sẽ thành 300 câu và mỗi bài ôn 50 câu mà không cần sửa giao diện. Thi thử chọn từ toàn bộ ngân hàng.

### Cấu trúc JSON

`version: 1`, danh sách `topics` (đúng 6 chủ đề), danh sách `questions`. Mỗi chủ đề phải có ít nhất 5 câu. Dùng chức năng xuất để có tệp mẫu đầy đủ.

```json
{
  "id": "basics-001",
  "topicId": "basics",
  "text": "Một byte gồm bao nhiêu bit?",
  "options": ["8 bit", "2 bit", "4 bit", "16 bit"],
  "answer": 0,
  "explanation": "Một byte gồm 8 bit."
}
```

`answer` là chỉ số từ **0 đến 3**, không phải 1 đến 4. ID phải riêng biệt và chỉ chứa chữ Latin, số, gạch dưới hoặc gạch ngang. Nội dung luôn hiển thị như chữ, không chấp nhận HTML thực thi. Tệp nhập tối đa 10 MB, ngân hàng tối đa 10.000 câu. Thay ngân hàng làm mới bài chưa nộp; các bài đã nộp giữ nguyên snapshot câu hỏi.

## Đưa website lên Internet bằng GitHub Pages

Đã chuẩn bị workflow `.github/workflows/pages.yml`. Chưa tạo repository hay đăng công khai thay cho chủ sở hữu.

1. Đăng nhập GitHub, tạo một repository công khai, ví dụ `tinhoc-duynam`. Không cần thuê hosting hoặc mua tên miền để dùng địa chỉ `github.io`.
2. Đưa **nội dung của thư mục dự án này** vào gốc repository, nhánh `main`. Không đưa toàn bộ workspace lên. Không đưa `node_modules/`, `artifacts/`, `test-results/` lên.
3. Vào **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Vào **Actions → Publish website to GitHub Pages → Run workflow**, hoặc đẩy commit mới lên `main`.
5. Khi workflow thành công, mở URL được hiển thị trong môi trường `github-pages`: thường là `https://TEN-TAI-KHOAN.github.io/tinhoc-duynam/`.

Workflow chỉ đăng **dist/**, không đăng tệp hướng dẫn, kết quả kiểm thử hoặc tệp riêng của máy. Tất cả đường dẫn tài nguyên là tương đối nên chạy được dưới thư mục repository. Nền tảng hosting tĩnh khác cũng có thể dùng trực tiếp nội dung `dist/`.

Tham khảo chính thức: [tạo GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [workflow trang tĩnh](https://github.com/actions/starter-workflows/blob/main/pages/static.yml).

## Dành cho người phát triển

```sh
npm ci
npm run build
npm start
```

Máy chủ mặc định cổng 4173, chỉ localhost. Có thể đổi `PORT`. Máy chủ chỉ đọc `dist/` và hỗ trợ GET/HEAD. Nếu cổng đã có ứng dụng khác, chọn cổng khác, không tự tắt ứng dụng đó.

```sh
npx playwright install chromium
npm test
```

- `npm run test:unit`: kiểm ngân hàng, phân bổ đề, chấm điểm, thời hạn, dữ liệu lỗi.
- `npm run test:e2e`: kiểm chức năng bằng Chromium, màn 375/768/1280/1920px, nhập dữ liệu và lưu trữ.
- `npm run check`: cú pháp, build và toàn bộ tests.

`scripts/seed-questions.mjs` là nguồn bộ câu hỏi mẫu. **Không chạy lại sau khi thay ngân hàng**, trừ khi muốn ghi lại bộ mẫu vào tệp nguồn. Dữ liệu trình duyệt không nằm trong repository.

## Thư viện

Runtime HTML/CSS/JavaScript thuần. Inter (SIL OFL) và Lucide (ISC) kèm giấy phép trong `site/assets/`; Playwright chỉ phục vụ kiểm thử. `package-lock.json` khóa phiên bản tái lập build. Không có khóa API, dịch vụ trả phí hoặc backend cần cấu hình.
