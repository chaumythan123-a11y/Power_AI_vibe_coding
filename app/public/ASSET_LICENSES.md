# Nguồn và giấy phép asset

- **Be Vietnam Pro**: bản WOFF2 weight 400, 500, 600, 700, 800; subset Latin và Vietnamese. Tải từ [Fontsource 5.2.8](https://fontsource.org/fonts/be-vietnam-pro) ngày 28/10/2026. Tác giả: Be Vietnam Pro Project Authors. Giấy phép SIL Open Font License 1.1; toàn văn tại [fonts/OFL.txt](fonts/OFL.txt), lấy từ [Google Fonts repository](https://github.com/google/fonts/blob/main/ofl/bevietnampro/OFL.txt). File font chạy cục bộ, không có yêu cầu mạng lúc runtime.
- `assets/*.svg`: hình minh họa do nhóm triển khai vẽ bằng SVG cho bài demo này (avatar, thumbnail môn học, lịch, sidebar, núi). Không dùng ảnh tham chiếu làm thành phần UI. Tên và đồ họa minh họa; logo Python chỉ là hình biểu trưng gần gũi, không phải logo chính thức.
- Ảnh mẫu gốc `reference/selected-ui.png` là tài liệu do người dùng cung cấp và được giữ nguyên ngoài `app/`.

Các alias tên file của thumbnail cùng nội dung để phù hợp component hiện tại.

- Sáu file `<course-id>-imagegen.png`: ảnh minh họa khóa học tạo bằng ImageGen tích hợp ngày 28/10/2026, prompt nguyên văn và mapping ở `../COURSE_IMAGEGEN.md`. Ảnh Python/Excel là minh họa chủ đề, không được mô tả là logo chính thức. Các ảnh này hiện dùng trong danh mục, chi tiết, chat và khóa nổi bật.

- `assets/sidebar-study-imagegen-v2.png` và `assets/bot-avatar-imagegen-v2.png`: tạo bằng ImageGen tích hợp ngày 28/10/2026 theo yêu cầu người dùng. Đây là nội dung AI tạo cho bản demo, không phải tài nguyên thư viện bên thứ ba với giấy phép OFL. Prompt, cách tạo và nơi dùng ghi tại `../IMAGEGEN_ASSETS.md`. Các SVG cũ được giữ lại nhưng sidebar/avatar hiện dùng PNG mới.
