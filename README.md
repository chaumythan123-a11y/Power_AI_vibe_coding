# StudyConnect

Ứng dụng demo tư vấn khóa học, gồm giao diện tiếng Việt, FAQ và khóa học mẫu, hồ sơ giáo viên minh họa, response harness cho Gemini 2.5 Flash và form lưu yêu cầu tư vấn gọi điện trên trình duyệt.

- Mã ứng dụng và hướng dẫn chạy: [app/README.md](app/README.md)
- Cấu hình triển khai Vercel: [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)
- Root Directory trên Vercel: `app`

Sau khi clone, chạy `cd app`, `npm ci`, `npm run dev`. App dùng dữ liệu mẫu khi chưa cấu hình `GEMINI_API_KEY`; sao chép `app/.env.example` thành `app/.env` chỉ trên máy local nếu muốn bật Gemini. Không commit key. Yêu cầu tư vấn chỉ lưu trong localStorage của trình duyệt hiện tại, chưa gửi cho nhân viên; quản trị là mô phỏng không có đăng nhập.
