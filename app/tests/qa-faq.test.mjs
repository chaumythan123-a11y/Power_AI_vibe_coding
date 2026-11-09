import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Readable } from 'node:stream';
import { createChatMiddleware } from '../server/chat.mjs';
import faqs from '../src/data/faqs.json' with { type: 'json' };
import courses from '../src/data/courses.json' with { type: 'json' };

const bundle = await build({ entryPoints: ['src/services/hybridChatAdapter.ts'], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { HybridChatAdapter } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const adapter = new HybridChatAdapter();
const originalFetch = globalThis.fetch;
const middleware = createChatMiddleware({ apiKey: 'fake-test-key', knowledge: { courses, faqs, courseDetails: {} },
  fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason:'STOP', content: { parts: [{ text: JSON.stringify({
    schemaVersion:1,kind:'project',action:'answer',content:{projectName:'Sổ sách cá nhân',goal:'Luyện xử lý dữ liệu Python',
      features:['Thêm sách','Tìm sách'],firstSteps:['Tạo danh sách mẫu','Viết hàm tìm kiếm'],difficulty:'Người mới'},
    usedFactIds:[],missingInformation:[],suggestions:[
      {label:'Bắt đầu viết mã thế nào?',action:'ask'},{label:'Có bài tập Python nào?',action:'ask'},{label:'Đặt lịch tư vấn như thế nào?',action:'book'},
    ]}) }] } }] }) }) });
globalThis.fetch = async (_url, options) => {
  const req = Readable.from([options.body]);
  req.url = '/api/chat'; req.method = 'POST';
  req.headers = { host: '127.0.0.1:5173', 'content-type': 'application/json' };
  req.socket = { remoteAddress: '127.0.0.1' };
  const res = { statusCode: 0, setHeader() {}, end(raw) { this.body = JSON.parse(raw); } };
  await middleware(req, res, () => { throw new Error('unexpected next'); });
  return { ok: res.statusCode < 400, status: res.statusCode, json: async () => res.body };
};
process.on('exit', () => { globalThis.fetch = originalFetch; });

// Expected intent is selected independently from source FAQ IDs; literal source answer is checked only for static FAQs.
const cases = [
  ['courses','gốc','Có những khóa học nào?'],
  ['courses','diễn đạt khác','Bạn có các lớp gì?'],
  ['courses','không dấu','co nhung khoa hoc nao'],
  ['fees','gốc','Học phí bao nhiêu?'],
  ['fees','diễn đạt khác','Giá khóa Python bao nhiêu?'],
  ['fees','không dấu','hoc phi bao nhieu'],
  ['schedule','gốc','Lịch học và thời lượng thế nào?'],
  ['schedule','diễn đạt khác','Học bao lâu?'],
  ['schedule','không dấu','lich hoc va thoi luong the nao'],
  ['entry','gốc','Có cần kiến thức đầu vào không?'],
  ['entry','diễn đạt khác','Trình độ đầu vào cần gì?'],
  ['entry','không dấu','co can kien thuc dau vao khong'],
  ['trial','gốc','Có được học thử không?'],
  ['trial','diễn đạt khác','Tôi có thể học thử chứ?'],
  ['trial','không dấu','co duoc hoc thu khong'],
  ['register','gốc','Đăng ký như thế nào?'],
  ['register','diễn đạt khác','Tôi đăng ký ra sao?'],
  ['register','không dấu','dang ky nhu the nao'],
  ['payment','gốc','Thanh toán như thế nào?'],
  ['payment','diễn đạt khác','Có thể chuyển khoản không?'],
  ['payment','không dấu','thanh toan nhu the nao'],
  ['reserve','gốc','Có bảo lưu không?'],
  ['reserve','diễn đạt khác','Được bảo lưu chứ?'],
  ['reserve','không dấu','co bao luu khong'],
  ['refund','gốc','Có được hoàn học phí không?'],
  ['refund','diễn đạt khác','Hủy khóa có hoàn tiền không?'],
  ['refund','không dấu','co duoc hoan hoc phi khong'],
  ['hours','gốc','Khi nào có thể tư vấn?'],
  ['hours','diễn đạt khác','Giờ tư vấn nào có thể chọn?'],
  ['hours','không dấu','khi nao co the tu van'],
];

const norm = value => value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
function assertSuggestions(reply, asked) {
  assert.equal(reply.suggestions.length, 3, 'phải có đúng 3 gợi ý');
  assert.ok(reply.suggestions.every(s => typeof s === 'string' && s.trim()), 'gợi ý không rỗng');
  assert.equal(new Set(reply.suggestions.map(norm)).size, 3, 'gợi ý không trùng sau chuẩn hóa');
  assert.ok(!reply.suggestions.some(s => norm(s) === norm(asked)), 'không lặp nguyên câu vừa hỏi');
}

for (const [id, variant, question] of cases) {
  test(`QA FAQ ${id} / ${variant}: ${question}`, async () => {
    const reply = await adapter.reply(question, 'python-basic');
    assert.equal(reply.action, id === 'register' ? 'offer_booking' : 'answer', 'FAQ đăng ký chủ động mở đường đặt lịch; các FAQ khác trả lời');
    if (reply.faqIds.length) assert.equal(reply.faqIds[0], id, 'đúng ý định FAQ khi dùng matcher');
    const source = faqs.find(f => f.id === id);
    if (['fees','schedule','entry'].includes(id)) {
      assert.match(reply.message, id === 'fees' ? /990\.000đ/ : id === 'schedule' ? /12 buổi.*T7 và CN/ : /người mới bắt đầu/i);
    } else if (id === 'courses') {
      assert.match(reply.message, /6 khóa mẫu/);
    } else {
      assert.ok(reply.message.includes(source.answer), 'giữ nội dung chính sách mẫu từ FAQ nguồn');
    }
    assertSuggestions(reply, question);
  });
}

test('QA context A: chat mới hỏi học phí phải làm rõ khóa', async () => {
  const reply = await adapter.reply('Học phí bao nhiêu?', undefined);
  assert.equal(reply.action, 'clarify');
  assert.doesNotMatch(reply.message, /990\.000đ/);
  assertSuggestions(reply, 'Học phí bao nhiêu?');
});
test('QA context B: Python giá và lịch', async () => {
  const fee = await adapter.reply('Bao nhiêu tiền?', 'python-basic');
  const schedule = await adapter.reply('Học tối nào?', 'python-basic');
  assert.match(fee.message, /990\.000đ/);
  assert.match(schedule.message, /T7 và CN/);
});
test('QA context C: nêu Excel thay Python', async () => {
  const reply = await adapter.reply('Còn Excel giá bao nhiêu?', 'python-basic');
  assert.match(reply.message, /750\.000đ/);
  assert.doesNotMatch(reply.message, /990\.000đ/);
});
test('QA context D: Hóa 12 không lấy thông tin Python', async () => {
  const reply = await adapter.reply('Có Hóa lớp 12 không?', 'python-basic');
  assert.equal(reply.action, 'offer_booking');
  assert.doesNotMatch(reply.message, /990\.000đ/);
});
test('QA suggestions: AI và fallback đủ 3 gợi ý, nhưng đánh giá liên quan để riêng', async () => {
  const ai = await adapter.reply('Gợi ý đồ án Python về sách', 'python-basic');
  assert.equal(ai.mode, 'gemini');
  assertSuggestions(ai, 'Gợi ý đồ án Python về sách');
  const before = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: false, status: 429 });
    const fallback = await adapter.reply('Gợi ý đồ án Python về sách', 'python-basic');
    assert.equal(fallback.action, 'offer_booking');
    assertSuggestions(fallback, 'Gợi ý đồ án Python về sách');
  } finally { globalThis.fetch = before; }
});
