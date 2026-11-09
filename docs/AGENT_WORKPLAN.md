# Chia việc nhỏ và sử dụng subagent
## Quyết định
Có dùng subagent nếu môi trường Codex thật sự cung cấp công cụ. Người dùng đã yêu cầu bổ sung cách phân công này. Không giả lập nhiều agent bằng các đoạn hội thoại. Nếu không hỗ trợ, cùng Codex thực hiện tuần tự các vai trò và báo rõ. Không cần mua thêm model hoặc dịch vụ chỉ để hoàn thành.
Subagent ở đây là trợ lý phát triển phần mềm, KHÔNG phải multi-agent trong mini app. App vẫn ChatAdapter/MockChatAdapter đơn giản.
## Model
Mặc định cho subagent kế thừa model Codex hiện tại. Đây là lựa chọn an toàn, không phụ thuộc tên model có thể không tồn tại trong môi trường khác. Khi môi trường có vai trò built-in: chọn worker cho triển khai, explorer/read-only cho khảo sát; nếu không có, giao vai trò bằng prompt. Reviewer nên có khả năng đọc ảnh; thiếu vision thì không nhận đã review thị giác. Không tự bịa ID model hay tham số spawn.
## Nhóm nhỏ: 1 lead + tối đa 3 subagent hoạt động cùng lúc
Lead/integrator: sở hữu App, routing, global CSS, tokens, package.json/lockfile, shared types, storage contracts, cuối cùng tích hợp và chạy app. Lead quyết định thị giác, không để từng agent tự đổi palette/font.
A — Asset & typography worker: chỉ public/assets/, public/fonts/, asset manifest/license; kiểm tra glyph/weight. Không sửa layout hay package. Chuẩn bị avatar/thumbnail/sidebar artwork, báo rõ file thật và source.
B — Chat UI worker: chỉ components/chat/ và CSS module tương ứng; bám token và ChatAdapter contract. Course/booking inline, suggestions, composer, scroll/pending/error. Không chỉnh global CSS và domain.
C — Booking & admin worker: chỉ components/booking/, components/admin/, tests liên quan đã thống nhất; nối booking service contract. Form validation và lưu do service chung, không nhân bản store.
Reviewer: sau khi A hoặc B kết thúc, dùng slot đó cho reviewer read-only đọc reference và screenshot app, trả 5 sai lệch lớn nhất cùng vị trí/component. Không tự sửa file, không tự chấm PASS khi không có ảnh. Lead áp dụng sửa.
Nếu nhiều file đang phụ thuộc nhau, không spawn vội. Lead định nghĩa types và props trước; giao từng file cho một owner. Agent cần sửa ngoài phạm vi phải báo lead. Không git reset, ghi đè hoặc revert thay đổi của agent khác.
## Công việc theo thứ tự và tiêu chí xong
T00 Lead: đọc repo/ảnh, inventory và backup trạng thái git; xác định mock data; xong khi có file map và các giới hạn.
T01 Lead: khóa tokens, font contract, ChatMessage/Course/Booking interfaces, component props; xong khi agents có API chung.
T02 song song: A chuẩn bị assets; Lead dựng shell/sidebar/right rail; B dựng chat; C dựng booking/admin. Lead sở hữu dependency installation, agents không cùng sửa lockfile.
T03 Lead tích hợp: mount components, nối data/services, chạy typecheck/build; sửa mismatch ngay, không đợi cuối.
T04 Reviewer: so desktop theo VISUAL_FIDELITY.md; trả findings, không sửa. Lead sửa geometry/font/contrast trước, rồi assets.
T05 Lead + workers nếu cần: chỉnh responsive theo ownership; một người giữ global breakpoint. Reviewer kiểm tra lại ảnh cuối.
T06 Lead: nghiệp vụ đầy đủ, keyboard, storage failures, tests và báo cáo thật; đối chiếu checklist. Không giao người làm UI tự xác nhận toàn bộ tính đúng dữ liệu mà không kiểm thử.
## Mẫu giao nhiệm vụ
Bạn là [vai trò]. Đọc AGENTS.md, docs/DESIGN.md, docs/VISUAL_FIDELITY.md và reference/selected-ui.png. Mục tiêu: [đầu ra cụ thể]. Chỉ sửa [danh sách file]. Hợp đồng: [props/types/service]. Không đổi tokens, framework, dữ liệu mẫu, global CSS hay file ngoài phạm vi. Tiêu chí xong: [visual + behavior + test]. Trả về files changed, checks run, issues và hướng tích hợp. Bạn đang dùng workspace chung; không ghi đè thay đổi khác. Nếu cần đổi contract hãy báo lead trước.
## Quy tắc chống dàn trải
Không giao mỗi agent xây một app riêng. Không tách agent cho từng nút. Không spawn thêm để thay cho quyết định thiết kế. Subagent tăng tốc việc độc lập, không đảm bảo ảnh giống hơn; cổng screenshot/review mới quyết định chất lượng. Giữ cập nhật ngắn cho người dùng, không chờ duyệt lại các token đã chốt.
