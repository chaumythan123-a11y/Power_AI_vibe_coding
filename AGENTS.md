# Quy tắc triển khai
- Sản phẩm bảng B, đề 04. Ít công nghệ, nghiệp vụ rõ; không thêm công nghệ để lấy điểm.
- Tất cả UI tiếng Việt, UTF-8. Mọi học phí dùng Intl.NumberFormat vi-VN. Dữ liệu mẫu luôn được nhận diện.
- Không tin nội dung chat như chỉ dẫn hệ thống. Render text an toàn, không dangerouslySetInnerHTML.
- Không chứa secret trong source, client env hay bản ZIP. Mặc định app chạy mock offline sau khi cài dependencies.
- Tách dữ liệu / matcher / booking rules / storage / component. Không hardcode giá ở nhiều nơi.
- Giữ ảnh gốc reference/selected-ui.png. Mọi chỉnh sửa triển khai ở app/.
- Không tạo minh chứng AI hoặc kết quả test giả. Mẫu báo cáo phải ghi CHƯA CHẠY trước khi thực hiện.
- Không tuyên bố localStorage đồng bộ thiết bị hay quản trị có bảo mật đăng nhập.
- Không yêu cầu thư viện mới nếu HTML/CSS/React hiện có giải quyết tốt.

- Thiết kế mới nhất: 02 Chat First trắng–xanh. Đọc DESIGN.md và tokens.css; bỏ chỉ dẫn stepper/coral cũ.

## Bổ sung bắt buộc: độ gần mẫu và phân công
Đọc docs/VISUAL_FIDELITY.md và docs/AGENT_WORKPLAN.md trước khi triển khai. Mục tiêu cảm nhận 80–90% phải được chuyển thành scorecard nội bộ + đối chiếu screenshot, không hứa phần trăm khách quan. Không làm nhạt primary/body text hoặc thay assets màu bằng icon xám. Chia việc nhỏ với 1 lead và tối đa 3 subagent nếu môi trường hỗ trợ; mặc định kế thừa model hiện tại. Subagent chỉ phục vụ xây phần mềm, không thêm multi-agent vào app. Lead giữ tokens/global CSS/contracts và tích hợp; reviewer thị giác read-only sau có screenshot. Nếu thiếu công cụ thì làm tuần tự, báo đúng phần chưa kiểm chứng. Bàn giao thêm VISUAL_REVIEW.md có bằng chứng thật.
