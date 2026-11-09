# Mục tiêu độ gần mẫu và quy trình sửa màu
## Không đánh tráo khái niệm
Mục tiêu người dùng: đạt cảm giác gần ảnh khoảng 80–90%. Không tự tuyên bố phần trăm pixel giống, không bảo đảm chỉ nhờ prompt. Dùng thang nghiệm thu dưới đây như chỉ số nội bộ, không phải metric khoa học hay điểm BTC. Nếu chưa có screenshot thật, ghi CHƯA ĐỐI CHIẾU.
Chỉ so phần khung ứng dụng của reference/selected-ui.png, bỏ tiêu đề trình bày bên ngoài. Giữ ảnh gốc, tạo bản crop phục vụ QA riêng nếu cần. So cùng kích thước khung và cùng trạng thái chat; không so screenshot full trang với ảnh đã crop khác tỷ lệ. Dữ liệu nghiệp vụ luôn thắng nội dung minh họa.
## Cổng G0: đo trước khi code
Mở ảnh; ghi trong VISUAL_REVIEW.md vị trí tương đối sidebar/chat/cột phải, padding, chiều cao header/composer, độ rộng bubble, thumbnail, các mốc căn hàng. Các kích thước DESIGN.md là điểm khởi đầu; được tinh chỉnh theo ảnh nếu có ghi lý do. Không thay thiết kế tổng thể.
Lấy mẫu các vùng phẳng nếu công cụ cho phép; dùng median của vùng nhỏ tránh text/antialias/shadow, ghi tọa độ và hex quan sát. Không nhận màu đề xuất là màu đo thực. Duy trì bảng reference / token hiện tại / quyết định. Text và control phải đạt tương phản; có thể khác màu ảnh để đáp ứng.
## Tránh giao diện nhạt màu
- Dùng primary đúng #0052E0 cho giá, CTA và active text; không tự chuyển sang slate, xanh xám hoặc pastel.
- Không đặt opacity <1 trên container/sidebar/chat để tạo cảm giác nhẹ. Không filter brightness/saturate lên toàn app; không overlay trắng phủ toàn bộ.
- Chỉ dùng màu muted cho metadata; body #34456B, heading #101C48. Không để nội dung chính cùng màu caption.
- White surface phải tách khỏi nền xanh nhạt; selected và user bubble dùng nền #E7F0FF/#E6EFFF rõ ràng.
- Trong ảnh nhiều màu mạnh đến từ icon, thumbnail và illustration. Tạo assets có xanh dương bão hòa, vàng Python, teal môn Toán; không thay tất cả bằng icon nét xám.
- Đừng chữa nhạt bằng cách tô tất cả nền xanh đậm. Giữ phân bố mảng trắng và xanh như ảnh.
- Nếu vẫn nhạt: xác minh font thực, weight, opacity computed, màu computed, kích thước thumbnail, độ dày icon và screenshot color appearance trước khi đổi token.
- Nút xanh/chữ trắng và hover phải rõ; shadow nhẹ, không dùng shadow để bù tương phản chữ.
## Các cổng triển khai
G1 shell: chỉ layout và typography. Screenshot 1440×900 trước khi trang trí; sửa 3 cột, spacing, font.
G2 content: chat với fixture hội thoại chuẩn, course card, booking card, cột phải, minh họa. Chụp và so side-by-side; overlay 50% chỉ là công cụ tìm lệch hình học, không phải bằng chứng tỷ lệ giống.
G3 polish: sửa lần lượt 5 sai lệch lớn nhất; ưu tiên geometry → font → assets → màu → chi tiết. Chụp lại sau thay đổi. Không kết thúc chỉ vì build pass. Thường dự trù 2–3 vòng; tiếp tục khi còn lỗi lớn và đủ công cụ.
G4 responsive: desktop đạt trước, sau đó 768×1024, 390×844 và 360px; không phá desktop khi chỉnh mobile. Xem đủ empty/error/dialog/admin.
G5 regression: đủ chức năng và kiểm thử sau chỉnh UI. Screenshot bàn giao phải từ code cuối cùng.
## Scorecard nội bộ 100 điểm
Bố cục/tỷ lệ 25; font/nhịp chữ 20; màu/tương phản 20; assets 15; spacing/radius/border 10; cấu trúc card/chat 10. Mỗi nhóm ghi nhận xét, điểm tự đánh giá và đường dẫn evidence. Mục tiêu 85/100, không gọi đây là 85% pixel giống. Một số khác biệt có chủ đích: navigation đúng scope, dữ liệu đúng JSON, nhãn mock.
Điều kiện chặn dù tổng cao: font chưa tải, thiếu ảnh lớn quan trọng, sai số cột, text quá nhạt, overflow, composer bị che, controls không hoạt động. Không tự cộng điểm cho phần chưa kiểm tra.
Báo cáo cuối gồm: viewport, state fixture, ảnh reference/capture, top differences trước/sau, scorecard, những phần chưa xác minh. Không dùng ảnh sinh bởi AI thay screenshot ứng dụng.
