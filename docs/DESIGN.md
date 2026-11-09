# Thiết kế chốt: 02 — Chat First
Tham chiếu reference/selected-ui.png. Bỏ tiêu đề bảng trình bày ngoài app. Không đưa stepper, goal cards, màu coral từ thiết kế cũ vào sản phẩm.
## Typography
Be Vietnam Pro duy nhất, local WOFF2 đủ dấu tiếng Việt, kèm license; font stack Be Vietnam Pro, system-ui, sans-serif. Weight 400/500/600/700/800 hoặc variable tương đương. Không CDN lúc runtime, không faux bold. Kiểm tra font tải thật và glyph tiếng Việt không fallback. Đây là font được chọn, không khẳng định xác định đúng font gốc ảnh.
Logo 22/800; heading chat 22/700/1.35; tiêu đề khối và tên bot 18/700/1.4; tên khóa 16/700/1.4; chat 15/400/1.65; navigation/nút 14/500–600; mô tả 13/1.5; timestamp 12; học phí 22/700. Input mobile 16px. Không thu nhỏ toàn giao diện để vừa.
## Màu (dùng tokens.css)
Page #F4F8FF; surface trắng; primary #0052E0; hover #0043B8; selected/suggestion #E7F0FF; heading #101C48; body #34456B; muted #62718F; border #E3EBF7; bot #F2F5FA; user #E6EFFF; success #18794E; error #B42318.
Nút chính primary/chữ trắng; nút phụ trắng/chữ primary/viền xanh. Không trộn bảng màu cũ. Thumbnail có màu riêng. Kiểm tra contrast AA của text và điều khiển trên nền thực tế. Selected có dấu hiệu ngoài màu.
## Desktop
1440×900: lề 16px, khung hữu dụng 1408px, sidebar 220px, cột phải 300px, gaps 12px×2, chat 864px. grid-template-columns:220px minmax(0,1fr) 300px; box-sizing:border-box; không cộng padding ngoài không tính toán. Panel radius 20, card 14, button 10. Shadow nhẹ theo tokens. Height theo viewport, chat history scroll riêng, composer luôn dưới cùng. Panel khác cuộn khi cần.
Sidebar: logo sách + StudyConnect, tagline, Chat hỗ trợ / Khóa học / Lịch tư vấn / Quản trị. Mục chọn nền xanh nhạt. Card học tập nhỏ cuối sidebar. Không Tin tức, Hồ sơ, thanh toán giả.
Chat: avatar bot, Trợ lý StudyConnect, nhãn Chat mô phỏng; lời chào/heading; bot trái, user phải; card khóa inline thumbnail/tên/đối tượng/buổi/hình thức/giá/Chi tiết/Đặt lịch tư vấn. Thay Đăng ký ngay trong ảnh bằng Đặt lịch tư vấn. Card đặt lịch inline hoặc form dialog cần đủ tên/điện thoại/ngày/giờ trước xác nhận. CTA đặt lịch luôn truy cập được. Không đính kèm/emoji/menu chết.
Cột phải: 3 khóa nổi bật từ JSON, Xem tất cả hoạt động; khối Bạn có thể làm gì? nêu FAQ, học phí/lịch, đặt tư vấn; card minh họa/câu nói tùy chọn. Không quảng cáo thành tích giáo viên không có nguồn. Không hiển thị “trực tuyến” khiến tưởng có nhân viên hoặc AI thật.
## Responsive
>=1280 ba cột; 1024–1279 ẩn cột phải, danh mục vẫn mở được; 768–1023 sidebar gọn/drawer; <768 một cột chat, bottom nav Chat/Khóa học/Lịch hẹn, Quản trị trong menu có label demo. 390 và 360 không tràn ngang; form một cột, admin dạng cards; nút chạm >=44px; dvh/safe-area, bàn phím không che composer. Dialog có close/back rõ.
## Motion
Hover màu/viền 150ms ease-out. Press scale .98. Card hover shadow nhẹ + translateY(-2px) chỉ hover-capable. Message enter opacity/translateY(4px) 160ms. Dialog/drawer fade + translate6px 180ms. Focus outline 2px primary offset3px. Không transition all; không typewriter, avatar nhấp nháy, animation liên tục, delay giả dài. Reduced-motion tắt transform/animation. Auto-scroll chỉ khi gần đáy hoặc vừa gửi; đang đọc lịch sử hiện Tin nhắn mới.
## Accessibility và states
Dialog focus trap/Escape/restore focus; input label; aria-live polite không đọc lại toàn lịch sử; Enter gửi/Shift Enter newline, không gửi khi IME composing. Có empty/pending/error/success/disabled/selected/no-match/storage-error. Mỗi phản hồi có 3 suggestions, chỉ nhóm mới nhất cần hiện button.
## Assets
Ảnh tham chiếu là duy nhất đã có. Codex chuẩn bị avatar bot, thumbnail, sidebar artwork riêng theo tông xanh; dùng local assets, giữ nguồn/license. SVG tự tạo được dùng cho môn và minh họa đơn giản; không dùng screenshot làm component hoặc hứa font/assets đã có trước khi tải thành công.
