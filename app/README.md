# StudyConnect — demo đề 04, bảng B

Mini web app tư vấn khóa học với giao diện Chat First trắng–xanh. Toàn bộ khóa, học phí, FAQ, giáo viên và chính sách là **dữ liệu mẫu**. Runtime chat là **hybrid**: khi chưa có key, FAQ rõ ràng xử lý offline từ dữ liệu mẫu. Khi đã cấu hình key, FAQ cũng đi qua Gemini 2.5 Flash để diễn đạt từ fact mẫu; câu hỏi về giáo viên được guard trả trực tiếp từ hồ sơ mẫu, kể cả khi có key. Guard cũng xử lý câu thiếu dữ kiện riêng của trung tâm. Câu trả lời Gemini được kiểm tra bằng response harness trước khi hiển thị. ZIP bàn giao không có key. Khi thiếu key, mất mạng hoặc phản hồi AI không hợp lệ, app hiện lời dự phòng và đường đặt lịch tư vấn; lời dự phòng không phải câu trả lời từ Gemini.

## Chạy tại máy

Yêu cầu Node.js 20.19+ hoặc 22.12+ và npm. Tại thư mục `app/`:

```bash
npm ci
npm run dev
```

Mở URL do Vite in ra (mặc định `http://127.0.0.1:5173/`). Kiểm tra bản đóng gói bằng `npm run typecheck`, `npm test`, `npm run build`, `npm run preview -- --port 5173`. Cả dev và preview đều phục vụ API cùng địa chỉ. Dùng cùng một hostname để giữ dữ liệu localStorage của bạn.

## Bật Gemini

Tạo `app/.env` theo `.env.example`, điền `GEMINI_API_KEY`, rồi khởi động lại server. Model cố định `gemini-2.5-flash`. Không đổi key thành biến `VITE_*`, không đưa `.env` vào ZIP hoặc Git. Key chỉ được đọc bởi Node trong Vite local hoặc Vercel Function; trình duyệt chỉ gửi câu hỏi, khóa đang chọn và tối đa 4 lượt gần nhất tới `/api/chat`. Backend chỉ chọn các fact mẫu liên quan rồi gửi chúng cùng câu hỏi/ngữ cảnh tới Google Gemini. Không gửi dữ liệu đặt lịch/localStorage. Không lưu hội thoại phía server.

Hướng dẫn model của response harness nằm trong `server/harness/orchestrate.mjs`; bộ phân loại, fact, schema và validator nằm cùng thư mục. `server/systemPrompt.mjs` là prompt của hợp đồng cũ, không còn là đường xử lý chat hiện hành. Harness coi dữ liệu mẫu là nguồn duy nhất cho giá/lịch/chính sách, không cho nội dung chat/lịch sử đổi chỉ dẫn và không nhận đã đặt lịch. AI vẫn có thể trả lời sai về kiến thức chung; cần kiểm tra lại thông tin quan trọng.

Khi có key, thử “Học phí khóa học Python bao nhiêu?” để xem nguồn **Gemini 2.5 Flash** diễn đạt fact mẫu; khi thiếu key, câu này dùng **Dữ liệu mẫu** offline. “Gợi ý đồ án Python để tự luyện tập” là yêu cầu học tập chung được gửi Gemini khi có key. Câu “Giải thích bước 2 kỹ hơn” dùng ngữ cảnh gần nhất. Hiệu ứng chờ tối thiểu 700ms cho câu mẫu, Gemini chờ theo thời gian thực; có ba chấm và hỗ trợ reduced motion.

API giới hạn 20 lượt/phút/địa chỉ theo bộ nhớ từng instance, câu hỏi 2.000 ký tự, lịch sử tối đa 4 lượt × 1.000 ký tự, ngân sách chung khoảng 27 giây gồm tối đa một lượt sửa; lỗi API không tiết lộ key. Vite local chỉ bind loopback; Vercel Function chạy theo URL triển khai. Đây là backend demo chưa có xác thực người dùng. Khi deploy Vercel, Function trong `api/` phục vụ hai endpoint; chỉ upload `dist` lên static hosting sẽ không có API Gemini. Xem `../DEPLOY_VERCEL.md`.

## Chức năng

- Chat trả lời 10 FAQ từ `src/data/faqs.json` và thông tin 6 khóa từ `src/data/courses.json`; mỗi lượt bot có 3 gợi ý. Có ngữ cảnh khóa, làm rõ khi thiếu khóa và đề xuất tư vấn khi ngoài dữ liệu. Nút **Chat mới** bắt đầu hội thoại không có khóa đang chọn. Hội thoại mở đầu là kịch bản minh họa, không phải lịch sử người dùng; chat chỉ giữ trong phiên trang hiện tại.
- Danh mục lọc môn, trình độ, hình thức; xem chi tiết, hỏi về khóa, đặt lịch tư vấn. Hồ sơ giáo viên hư cấu trong `src/data/teachers.json` là dữ liệu mẫu dùng chung cho trang chi tiết và response harness. Câu hỏi tên giáo viên theo khóa được guard trả từ dữ liệu này; bằng cấp, chứng chỉ và thâm niên chưa có trong dữ liệu thì đề xuất tư vấn, không suy ra từ giới thiệu.
- Form đủ tên, điện thoại, ngày, giờ, khóa và ghi chú tùy chọn. Hình thức hỗ trợ dự kiến là nhân viên gọi điện tư vấn theo lịch; bản demo chỉ lưu yêu cầu, chưa gửi tới nhân viên. Giờ theo `Asia/Ho_Chi_Minh`, chỉ nhận **sáu slot** 09:00, 10:00, 14:00, 15:00, 19:00, 20:00 còn ở tương lai trong 60 ngày; không nhận giờ tùy ý giữa các slot. Giá hiển thị bằng `Intl.NumberFormat('vi-VN')` từ JSON.
- Lịch được lưu bằng `localStorage` trên **trình duyệt hiện tại**. Quản trị demo xem, đánh dấu đã xử lý và xóa sau xác nhận. Không có đăng nhập bảo mật. Không đồng bộ thiết bị, không gửi yêu cầu đến trung tâm và không xác nhận cuộc hẹn thực tế.

## Cấu trúc

`src/data` chứa bản sao JSON mẫu; `src/domain` là matcher/validation; `src/services` là adapter/storage; `src/components` là giao diện. `public/fonts` chứa Be Vietnam Pro local và giấy phép OFL; nguồn/giấy phép ảnh ghi tại `public/ASSET_LICENSES.md`. Ảnh tham chiếu gốc ở `../reference/selected-ui.png` không dùng làm giao diện.

## Giới hạn và bàn giao

Một slot được chặn trùng theo dữ liệu đã đọc lại trong trình duyệt này; đây không phải khóa giao dịch tuyệt đối giữa nhiều tab. Nếu dữ liệu localStorage hỏng, app không tự ghi đè và quản trị có nút đặt lại sau xác nhận. Bản demo chưa triển khai URL công khai hay quyền chia sẻ. Xem `TEST_REPORT.md`, `VISUAL_REVIEW.md`, `AI_EVIDENCE.md`, `DEMO_SCRIPT.md` để biết kiểm thử và minh chứng thực tế.

Trang chi tiết: từ hộp thông tin chọn Hỏi về khóa này, hoặc chọn Chi tiết trong danh mục. Nội dung mẫu nằm trong src/data/courseDetails.ts; học phí/lịch vẫn lấy từ courses.json.
