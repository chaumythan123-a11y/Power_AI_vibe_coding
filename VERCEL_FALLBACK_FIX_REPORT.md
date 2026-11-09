# Báo cáo sửa fallback/context

## Nguyên nhân có bằng chứng

- Code client `HybridChatAdapter` trước đây dùng `safeFallback()` chung cho mọi HTTP lỗi, JSON lỗi và timeout. Fallback này không gọi matcher nội dung; vì vậy câu đã có “Python cơ bản” chỉ nhận thông báo chung/CTA và mất ngữ cảnh.
- Grounding server chưa có intent `practice` cho “bài tập mẫu”, nên câu hỏi này có thể rơi vào clarification hoặc fallback chung.
- FAQ `courses` trước đây chỉ nói số lượng/môn học, không liệt kê tên từ JSON.
- Log local với fake upstream lỗi ghi `route=harness`, `result=fallback`, `failure=network`, `upstreamCalls=1`; không có key/header. Chưa có quyền truy cập Vercel Logs trong workspace, vì vậy không kết luận log Vercel là network, env hay timeout.

## Sửa

- Fallback client dùng `MockChatAdapter` với course context cho API lỗi, lỗi JSON và timeout; nhãn vẫn là mock/fallback.
- Thêm intent `practice`; câu hỏi bài tập trả đúng khóa và nói rõ dữ liệu chưa có bài tập mẫu cụ thể, không bịa.
- Catalog lấy danh sách sáu khóa từ `courses.json`.
- Notice phân biệt mất kết nối, quota và phản hồi AI không hợp lệ.

## Kiểm thử

- `npm test`: 120/120 PASS.
- `npm run typecheck`: PASS.
- `npm run build -- --outDir ../qa/vercel-fix-build-2`: PASS.
- Commit cuối: `bfecec109b75666a270e0ef33bc23bf3ef399d3f`, branch `main`, remote đã đối chiếu cùng SHA.

## Vercel

Chưa có URL deployment hoặc quyền đọc Vercel Logs trong workspace, nên chưa xác minh deployment mới. Sau khi Vercel tạo deployment từ `main`, kiểm tra `/api/chat/status`, hai câu regression và Function Logs; không coi local result là kết quả Vercel.
