# Deploy StudyConnect lên Vercel

Bản nguồn hiện tại: `studyconnect-teachers-release.zip`. Chưa triển khai URL công khai; các bước dưới đây dành cho người sở hữu repository.

## Cấu hình dự án

Sau khi import repository GitHub chứa **toàn bộ thư mục gốc** vào Vercel, chọn:

- **Root Directory:** `app` (không phải thư mục gốc repository).
- **Framework Preset:** Vite.
- **Install Command:** `npm ci`.
- **Build Command:** `npm run build`.
- **Output Directory:** `dist` (tính từ `app`).
- **Node.js:** 20.19+ hoặc 22.12+; dùng Node 22 trong Project Settings nếu có lựa chọn.

`app/api/chat.js` và `app/api/chat/status.js` là Vercel Functions. `app/vercel.json` đặt giới hạn 30 giây và 10 giây; upstream Gemini có timeout tối đa 18 giây cho lượt đầu và 10 giây cho một lượt sửa trong ngân sách chung khoảng 27 giây, frontend 30 giây. App chỉ có điều hướng state trong một trang, không có đường dẫn SPA cần rewrite. Do đó không cấu hình rewrite; `/api/chat` được Function xử lý trực tiếp, không bị chuyển về `index.html`. Dữ liệu khóa, FAQ, giáo viên mẫu và chi tiết được import tĩnh từ `app/src/data/*.json` qua `app/server/knowledge.mjs`, để trình bundle Function mang đủ dữ liệu. FAQ chuẩn chạy offline khi thiếu key; khi có key, frontend gửi FAQ tới Function để Gemini diễn đạt từ fact mẫu. Câu hỏi về giáo viên được guard trả trực tiếp từ `teachers.json`, không gọi Gemini; bằng cấp/chứng chỉ/thâm niên chưa có sẽ có CTA tư vấn.

## Biến môi trường

Trong Vercel → Project → Settings → Environment Variables, thêm **`GEMINI_API_KEY`** vào môi trường cần dùng (Production, và Preview nếu muốn thử ở Preview). Đây là biến server; không dùng `VITE_GEMINI_API_KEY`, không commit `.env`, không dán key vào hội thoại. Model cố định `gemini-2.5-flash`. Sau khi thêm hoặc đổi biến, **Redeploy** deployment trong Vercel để Function nhận giá trị mới. Không cần đặt key để dùng FAQ/dữ liệu mẫu offline; câu ngoài mẫu sẽ nhận fallback và CTA đặt lịch. Khi có key nhưng Gemini lỗi hoặc phản hồi không đạt validator, FAQ dùng dữ liệu mẫu dự phòng có nhãn rõ.

## Kiểm tra sau deploy

1. Mở URL thật mà Vercel cấp. Giao diện phải có danh mục, chat, đặt lịch và quản trị demo như local.
2. Mở `https://<ten-mien>/api/chat/status`: GET trả JSON `{ "enabled": true, "model": "gemini-2.5-flash" }` khi key đã đặt, hoặc `enabled: false` khi chưa đặt. Endpoint không trả key.
3. Gửi POST JSON tới `https://<ten-mien>/api/chat`, `Content-Type: application/json`, ví dụ `{ "message": "Giáo viên khóa Python cơ bản là ai?" }`. Phản hồi có `mode: "mock"` và hồ sơ minh họa từ `teachers.json`, không gọi Gemini. GET `/api/chat` phải trả 405. Payload sai hoặc quá 32 KiB bị từ chối.
4. Nếu muốn kiểm Gemini live trên Vercel, sau khi tự cấu hình key dùng một câu kiến thức chung như “Giải thích vòng lặp for trong Python và cho ví dụ mã ngắn”. Xem log Function để xác minh HTTP upstream, model và usage; `mode: gemini` ở client không đủ làm bằng chứng duy nhất. Kiểm thử Gemini local trong `RELEASE_READY.md` không thay cho kiểm thử Vercel.

API giới hạn 20 lượt/phút theo bộ nhớ từng instance Function, không phải giới hạn tập trung toàn hệ thống. Không có đăng nhập, chống lạm dụng cấp production hoặc lưu hội thoại server. Đặt lịch chỉ lưu **localStorage của trình duyệt và origin hiện tại**; đổi domain/trình duyệt/thiết bị sẽ không thấy lịch cũ. Quản trị demo không có đăng nhập bảo mật và không đồng bộ; không dùng để tiếp nhận lịch thật.

## Cách đưa source lên GitHub và Vercel

1. Kiểm tra repository có `app/package.json`, `app/vercel.json`, `app/api/chat.js`, `app/src/data/teachers.json`; không đưa `app/.env` lên GitHub.
2. Vercel → Add New → Project → Import Git Repository; chọn repository StudyConnect và nhập chính xác cấu hình ở trên.
3. Đặt `GEMINI_API_KEY` trong Vercel Settings, rồi Deploy hoặc Redeploy nếu đã deploy trước khi đặt biến.
4. Kiểm tra URL và hai endpoint như mục trên. Chỉ kết luận deploy thành công sau khi có URL thật và đã kiểm tra.
