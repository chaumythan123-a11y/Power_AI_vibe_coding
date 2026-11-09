import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { groundedReply } from '../server/grounding.mjs';
import courses from '../src/data/courses.json' with { type: 'json' };
import faqs from '../src/data/faqs.json' with { type: 'json' };

const bundle = await build({ entryPoints: ['src/services/hybridChatAdapter.ts'], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { HybridChatAdapter, usesPreparedAnswer } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const adapter = new HybridChatAdapter();

test('cách hỏi mới về chính sách và giờ tư vấn lấy đúng FAQ mẫu', async () => {
  const cases = [
    ['Tôi trả học phí bằng cách nào?', 'payment', /chuyển khoản|chuyen khoan/i],
    ['Tôi muốn tham gia một buổi trải nghiệm trước, được chứ?', 'trial', /học thử miễn phí/i],
    ['Có thể tạm dừng học rồi học lại không?', 'reserve', /3 tháng/i],
    ['Nếu đổi ý trước lúc khai giảng thì có lấy lại tiền không?', 'refund', /7 ngày/i],
    ['Các khung giờ có thể chọn để nói chuyện với tư vấn viên là gì?', 'hours', /09:00.*20:00/],
    ['Trung tâm hiện có lớp môn nào vậy?', 'courses', /6 khóa mẫu/i],
    ['Muốn ghi danh khóa học thì làm các bước nào?', 'register', /đặt lịch tư vấn/i],
  ];
  for (const [question, faqId, expected] of cases) {
    assert.equal(usesPreparedAnswer(question), true, question);
    const reply = await adapter.reply(question);
    assert.deepEqual(reply.faqIds, [faqId], question);
    assert.match(reply.message, expected, question);
    assert.equal(reply.mode, 'mock', question);
  }
});

test('câu nhiều ý vẫn không bị rút thành một FAQ', () => {
  assert.equal(usesPreparedAnswer('Học phí và lịch học Python là gì?'), false);
});

test('chứng nhận, ưu đãi và chỗ trống không bị trả nhầm FAQ', async () => {
  const knowledge = { courses, faqs, courseDetails: {} };
  for (const question of [
    'Hoàn thành Python cơ bản sẽ được cấp chứng nhận nào?',
    'Đăng ký hai người có ưu đãi bao nhiêu?',
    'Lớp Toán 12 còn mấy chỗ?',
  ]) {
    assert.equal(usesPreparedAnswer(question), false, question);
    const reply = groundedReply(question, undefined, knowledge);
    assert.equal(reply.action, 'offer_booking', question);
    assert.ok(reply.missingFacts.length > 0, question);
  }
  const audience = groundedReply('Người chưa học lập trình có vào Python cơ bản được chứ?', undefined, knowledge);
  assert.match(audience.message, /người mới bắt đầu/i);
});

test('giải thích khái niệm học tập không bị nhận nhầm là thông tin đầu vào khóa', () => {
  const question = 'Giải thích vòng lặp for trong Python cho người mới';
  assert.equal(usesPreparedAnswer(question), false);
  assert.equal(groundedReply(question, undefined, { courses, faqs, courseDetails: {} }), null);
});
