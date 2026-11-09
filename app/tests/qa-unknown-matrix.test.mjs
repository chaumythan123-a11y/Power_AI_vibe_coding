import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createChatMiddleware } from '../server/chat.mjs';
import courses from '../src/data/courses.json' with { type: 'json' };
import faqs from '../src/data/faqs.json' with { type: 'json' };

// Every upstream response is a deliberately false fixture. No network or real key.
const knowledge = { courses, faqs, courseDetails: {} };
const cases = [
  ['K01', 'Giáo viên khóa Python là ai?', null],
  ['K02', 'Ai đứng lớp Python?', null],
  ['K03', 'Người hướng dẫn lớp đó tên gì?', null],
  ['K04', 'Học xong được cấp bằng gì?', null],
  ['K05', 'Đăng ký hai người có rẻ hơn không?', null],
  ['K06', 'Đợt gần nhất bắt đầu hôm nào?', null],
  ['K07', 'Trung tâm ở địa chỉ nào?', null],
  ['K08', 'Khóa còn bao nhiêu chỗ?', null],
  ['K09', 'Có cam kết việc làm không?', null],
  ['K10', 'Python giá bao nhiêu và ai dạy?', /990\.000đ/],
  ['K11', 'Python học tối nào, có được cấp chứng chỉ không?', /T7 và CN/],
];

async function request(message) {
  let upstreamCalls = 0;
  const middleware = createChatMiddleware({
    apiKey: 'fake-test-key', knowledge,
    fetchImpl: async () => {
      upstreamCalls++;
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Giáo viên là cô A, được cấp bằng QA, khai giảng ngày 15/12/2026.' }] } }] }) };
    },
  });
  const req = Readable.from([JSON.stringify({ message, contextCourseId: 'python-basic' })]);
  req.url = '/api/chat'; req.method = 'POST';
  req.headers = { host: '127.0.0.1:5173', 'content-type': 'application/json' };
  req.socket = { remoteAddress: '127.0.0.1' };
  const res = { statusCode: 0, setHeader() {}, end(raw) { this.body = JSON.parse(raw); } };
  await middleware(req, res, () => { throw new Error('unexpected next'); });
  return { res, upstreamCalls };
}

for (const [id, question, knownPart] of cases) {
  test(`${id}: missing center fact has consultation CTA and no false fact`, async () => {
    const { res } = await request(question);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.needsConsultation, true);
    assert.doesNotMatch(res.body.message, /cô A|bằng QA|15\/12\/2026/i);
    if (knownPart) assert.match(res.body.message, knownPart);
  });
}
