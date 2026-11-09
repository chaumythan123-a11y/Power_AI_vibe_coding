import test from 'node:test';
import assert from 'node:assert/strict';
import { groundedReply } from '../server/grounding.mjs';
import { knowledge } from '../server/knowledge.mjs';

test('Kế hoạch tự học hai tuần không bị thay bằng lộ trình khóa mẫu', () => {
  assert.equal(groundedReply('Gợi ý lộ trình tự học Python 2 tuần cho người mới.', undefined, knowledge), null);
  const course = groundedReply('Python cơ bản có lộ trình khóa học như thế nào?', undefined, knowledge);
  assert.equal(course?.mode, 'mock');
  assert.match(course.message, /Lộ trình mẫu/);
});
