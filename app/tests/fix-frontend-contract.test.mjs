import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['src/services/hybridChatAdapter.ts'], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { HybridChatAdapter } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const question = 'Gợi ý đồ án Python về sách';
const valid = {
  message: 'Có thể làm đồ án quản lý sách.', action: 'answer', courseIds: ['python-basic'],
  knownFacts: [], missingFacts: [], mode: 'gemini',
  suggestions: ['Đồ án Python cơ bản mẫu gồm những bước nào?', 'Cần chuẩn bị gì để học Python cơ bản?', 'Đặt lịch tư vấn như thế nào?'],
};

async function replyWith(response) {
  const before = globalThis.fetch;
  globalThis.fetch = async () => response;
  try { return await new HybridChatAdapter().reply(question, 'python-basic'); }
  finally { globalThis.fetch = before; }
}

function assertThreeRelevant(reply) {
  assert.equal(reply.suggestions.length, 3);
  assert.equal(new Set(reply.suggestions.map(value => value.toLowerCase())).size, 3);
  assert.ok(reply.suggestions.every(value => typeof value === 'string' && value.trim()));
  assert.ok(reply.suggestions.some(value => /tư vấn|Python|đồ án/i.test(value)));
}

test('validated API contract preserves grounded metadata and contextual suggestions', async () => {
  const reply = await replyWith({ ok: true, json: async () => valid });
  assert.equal(reply.action, 'answer');
  assert.equal(reply.mode, 'gemini');
  assert.deepEqual(reply.courseIds, ['python-basic']);
  assert.deepEqual(reply.knownFacts, []);
  assertThreeRelevant(reply);
});

test('server decision to offer booking survives to UI reply', async () => {
  const missing = { ...valid, message: 'Chưa có tên giáo viên trong dữ liệu mẫu.', action: 'offer_booking',
    knownFacts: ['Học phí Python cơ bản: 990.000đ'], missingFacts: ['Tên giáo viên'], mode: 'mock' };
  const reply = await replyWith({ ok: true, json: async () => missing });
  assert.equal(reply.action, 'offer_booking');
  assert.equal(reply.mode, 'mock');
  assert.deepEqual(reply.missingFacts, ['Tên giáo viên']);
  assertThreeRelevant(reply);
});

test('text-only legacy and malformed contracts cannot be presented as verified AI answer', async () => {
  const invalid = [
    { message: 'Giá Python 1.990.000đ.' },
    { ...valid, action: undefined },
    { ...valid, courseIds: ['invented-course'] },
    { ...valid, missingFacts: ['Giáo viên'], action: 'answer' },
    { ...valid, suggestions: ['Học phí?', 'Học phí?', ''] },
  ];
  for (const payload of invalid) {
    const reply = await replyWith({ ok: true, json: async () => payload });
    assert.equal(reply.action, 'offer_booking');
    assert.equal(reply.mode, 'mock');
    assert.doesNotMatch(reply.message, /1\.990\.000đ/);
    assert.match(reply.notice, /định dạng xác thực/);
    assertThreeRelevant(reply);
  }
});

test('transport failures use contextual, distinct fallback suggestions', async () => {
  for (const response of [{ ok: false, status: 429 }, { ok: false, status: 502 }]) {
    const reply = await replyWith(response);
    assert.equal(reply.action, 'offer_booking');
    assert.equal(reply.mode, 'mock');
    assertThreeRelevant(reply);
    assert.ok(reply.suggestions.some(value => /Đặt lịch tư vấn/i.test(value)));
  }
});
