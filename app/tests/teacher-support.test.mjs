import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler } from '../server/chatCore.mjs';
import { knowledge } from '../server/knowledge.mjs';
import { understandRequest } from '../server/harness/understand.mjs';
import { selectFacts } from '../server/harness/facts.mjs';

const handler = createChatHandler({ knowledge, apiKey: 'fixture-only', fetchImpl: () => { throw new Error('Teacher guard must stay offline'); }, audit: () => {} });
const ask = async (message, contextCourseId, history = []) => {
  const response = await handler({ path: '/api/chat', method: 'POST', headers: { 'content-type': 'application/json' }, body: { message, contextCourseId, history }, client: crypto.randomUUID() });
  assert.equal(response.status, 200);
  assert.equal(response.payload.mode, 'mock');
  assert.equal(response.payload.suggestions.length, 3);
  return response.payload;
};

test('mỗi khóa có hồ sơ giáo viên mẫu; một giáo viên có thể phụ trách nhiều khóa', () => {
  for (const course of knowledge.courses) assert.ok(knowledge.teachers.some(teacher => teacher.isSample && teacher.courseIds.includes(course.id)), course.id);
  assert.ok(knowledge.teachers.some(teacher => teacher.courseIds.length > 1));
});

test('hỏi giáo viên đúng khóa, đổi khóa và hỏi tiếp theo ngữ cảnh', async () => {
  const python = await ask('Ai dạy Python cơ bản?');
  assert.match(python.message, /Minh An/);
  const math = await ask('Ai dạy Toán 12?');
  assert.match(math.message, /Thanh Hà/);
  assert.doesNotMatch(math.message, /Minh An/);
  const followup = await ask('Thầy/cô đó chuyên môn gì?', undefined, [{ role: 'user', text: 'Ai dạy Toán 12?' }]);
  assert.match(followup.message, /Thanh Hà/);
  assert.match(followup.message, /Toán lớp 10 và lớp 12/);
});

test('giá và giáo viên trả đủ, bằng cấp thiếu thì có CTA và ghi chú', async () => {
  const combined = await ask('Python giá bao nhiêu và ai dạy?');
  assert.match(combined.message, /990\.000đ/);
  assert.match(combined.message, /Minh An/);
  assert.equal(combined.action, 'answer');
  const unknown = await ask('Giáo viên Python cơ bản có bằng cấp gì?');
  assert.equal(unknown.action, 'offer_booking');
  assert.match(unknown.message, /Minh An/);
  assert.match(unknown.message, /chưa có thông tin.*bằng cấp/i);
  assert.ok(unknown.missingFacts.includes('bằng cấp hoặc chứng chỉ của giáo viên'));
  assert.equal(`Cần tư vấn về ${unknown.missingFacts.join(', ')}.`, 'Cần tư vấn về bằng cấp hoặc chứng chỉ của giáo viên.');
  const toeic = await ask('Thầy/cô đó có bằng cấp hoặc chứng chỉ gì?', 'toeic-foundation');
  assert.match(toeic.message, /Gia Bảo/);
  assert.deepEqual(toeic.missingFacts, ['bằng cấp hoặc chứng chỉ của giáo viên']);
});

test('harness chỉ chọn teacher fact đúng khóa, không suy diễn bằng cấp', () => {
  const request = understandRequest({ message: 'Ai dạy Excel cơ bản?', knowledge });
  const facts = selectFacts(request, knowledge);
  assert.deepEqual(request.requiredFactIds, ['course:excel-basic:teacher']);
  assert.equal(facts.available.length, 1);
  assert.match(facts.available[0].text, /Minh An/);
  assert.doesNotMatch(facts.available[0].text, /bằng cấp|thâm niên/i);
});
