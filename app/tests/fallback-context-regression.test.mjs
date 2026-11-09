import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler } from '../server/chatCore.mjs';
import { knowledge } from '../server/knowledge.mjs';

const ask = async message => {
  const handler = createChatHandler({ apiKey: 'fixture', knowledge, fetchImpl: async () => { throw new Error('upstream unavailable'); }, audit: () => {} });
  return (await handler({ path: '/api/chat', method: 'POST', headers: { 'content-type': 'application/json' }, body: { message, contextCourseId: 'python-basic' } })).payload;
};

test('catalog fallback lists every course from JSON', async () => {
  const reply = await ask('Có những khóa học nào?');
  assert.equal(reply.action, 'answer');
  for (const title of knowledge.courses.map(course => course.title)) assert.match(reply.message, new RegExp(title));
});

test('course practice fallback keeps Python context and states missing data', async () => {
  const reply = await ask('Python cơ bản có bài tập mẫu nào?');
  assert.equal(reply.action, 'offer_booking');
  assert.deepEqual(reply.courseIds, ['python-basic']);
  assert.match(reply.message, /chưa có bài tập mẫu cụ thể/i);
  assert.doesNotMatch(reply.message, /muốn hỏi về khóa học nào/i);
});

test('upstream error does not turn a grounded question into generic clarification', async () => {
  const reply = await ask('Python cơ bản có bài tập mẫu nào?');
  assert.equal(reply.mode, 'mock');
  assert.equal(reply.needsConsultation, true);
});
