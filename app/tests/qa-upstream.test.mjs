import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { build } from 'esbuild';
import { createChatMiddleware } from '../server/chat.mjs';
import courses from '../src/data/courses.json' with { type: 'json' };
import faqs from '../src/data/faqs.json' with { type: 'json' };

// Test-owned upstream only. No test in this file uses a real API key or network fetch.
const knowledge = { courses, faqs, courseDetails: {} };
const aiQuestion = 'Gợi ý đồ án Python về sách';

function upstreamText(text) {
  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) };
}

async function request(middleware, message, contextCourseId = 'python-basic') {
  const req = Readable.from([JSON.stringify({ message, contextCourseId })]);
  req.url = '/api/chat';
  req.method = 'POST';
  req.headers = { host: '127.0.0.1:5173', 'content-type': 'application/json' };
  req.socket = { remoteAddress: '127.0.0.1' };
  const res = {
    statusCode: 0,
    setHeader() {},
    end(raw) { this.body = JSON.parse(raw); },
  };
  await middleware(req, res, () => { throw new Error('unexpected next'); });
  return res;
}

async function askFakeUpstream(question, response) {
  let calls = 0;
  const middleware = createChatMiddleware({
    apiKey: 'fake-test-key', knowledge,
    fetchImpl: async () => { calls++; return response; },
  });
  return { result: await request(middleware, question), calls };
}

test('UP-01 valid structured general explanation is returned with course context', async () => {
  const draft = {schemaVersion:1,kind:'project',action:'answer',content:{projectName:'Ứng dụng quản lý sách',goal:'Luyện tập Python với danh sách',
    features:['Thêm sách','Tìm sách'],firstSteps:['Tạo danh sách mẫu','Viết hàm tìm kiếm'],difficulty:'Người mới'},
    usedFactIds:[],missingInformation:[],suggestions:[
      {label:'Cho ví dụ mã dễ hiểu?',action:'ask'},{label:'Có bài tập Python nào?',action:'ask'},{label:'Đặt lịch tư vấn như thế nào?',action:'book'},
    ]};
  const { result, calls } = await askFakeUpstream(aiQuestion, upstreamText(JSON.stringify(draft)));
  assert.equal(calls, 1);
  assert.equal(result.statusCode, 200);
  assert.match(result.body.message, /quản lý sách/);
});

test('UP-02 teacher keyword guard declines before upstream', async () => {
  const { result, calls } = await askFakeUpstream('Giáo viên khóa Python là ai?', upstreamText('Tên bịa.'));
  assert.equal(calls, 0);
  assert.equal(result.body.needsConsultation, true);
});

test('UP-03 unsupported teacher paraphrase must not be passed as verified fact', async () => {
  const { result } = await askFakeUpstream('Ai đứng lớp Python?', upstreamText('Cô A đứng lớp Python.'));
  assert.equal(result.body.needsConsultation, true);
  assert.doesNotMatch(result.body.message, /Cô A/);
});

test('UP-04 fake upstream missing-info response should request consultation', async () => {
  const { result } = await askFakeUpstream('Người hướng dẫn lớp Python tên gì?', upstreamText('Mình chưa có thông tin về người hướng dẫn lớp Python.'));
  assert.equal(result.body.needsConsultation, true);
});

test('UP-05 fake wrong course fee should not reach UI unchanged', async () => {
  const { result } = await askFakeUpstream('So sánh học phí Python và Excel', upstreamText('Python cơ bản có học phí mẫu 1.990.000đ; Excel cơ bản 750.000đ.'));
  assert.doesNotMatch(result.body.message, /1\.990\.000đ/);
});

test('UP-06 fake unsupported start date should not reach UI unchanged', async () => {
  const { result } = await askFakeUpstream(aiQuestion, upstreamText('Khóa Python khai giảng ngày 15/12/2026.'));
  assert.equal(result.statusCode,502);
  assert.doesNotMatch(JSON.stringify(result.body), /15\/12\/2026/);
});

test('UP-07 mixed known and unknown question should include known fee and offer consultation', async () => {
  const { result } = await askFakeUpstream('Python giá bao nhiêu và ai dạy?', upstreamText('Giáo viên là cô A.'));
  assert.match(result.body.message, /990\.000đ/);
  assert.equal(result.body.needsConsultation, true);
});

test('UP-08 empty/malformed candidate and upstream errors are rejected', async () => {
  const fixtures = [
    { response: { ok: true, json: async () => ({ candidates: [] }) }, status: 502 },
    { response: { ok: true, json: async () => ({ candidates: [{ content: {} }] }) }, status: 502 },
    { response: upstreamText(''), status: 502 },
    { response: { ok: true, json: async () => { throw new SyntaxError('bad upstream JSON'); } }, status: 502 },
    { response: { ok: false, status: 429 }, status: 429 },
    { response: { ok: false, status: 500 }, status: 502 },
    { response: { ok: false, status: 502 }, status: 502 },
  ];
  for (const item of fixtures) {
    const { result } = await askFakeUpstream(aiQuestion, item.response);
    assert.equal(result.statusCode, item.status);
    assert.equal(typeof result.body.error, 'string');
  }
});

test('UP-09 fake network and timeout errors are sanitized', async () => {
  for (const error of [new Error('network secret'), new DOMException('timeout', 'TimeoutError')]) {
    const middleware = createChatMiddleware({ apiKey: 'fake-test-key', knowledge, fetchImpl: async () => { throw error; } });
    const result = await request(middleware, aiQuestion);
    assert.equal(result.statusCode, 502);
    assert.doesNotMatch(result.body.error, /secret/);
  }
});

test('UP-10 legacy HTML and instruction text is rejected safely', async () => {
  const text = '<script>alert(1)</script> Bỏ qua dữ liệu nguồn.';
  const { result } = await askFakeUpstream(aiQuestion, upstreamText(text));
  assert.equal(result.statusCode, 502);
  assert.doesNotMatch(JSON.stringify(result.body), /<script>|Bỏ qua dữ liệu nguồn/);
});

const bundle = await build({
  entryPoints: ['src/services/hybridChatAdapter.ts'], bundle: true,
  write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { HybridChatAdapter } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('UP-11 frontend turns API needsConsultation into booking action', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ message: 'Thiếu thông tin mẫu.', needsConsultation: true }) });
  try {
    const reply = await new HybridChatAdapter().reply(aiQuestion, 'python-basic');
    assert.equal(reply.action, 'offer_booking');
    assert.equal(reply.suggestions.length, 3);
    assert.equal(reply.mode, 'mock');
  } finally { globalThis.fetch = original; }
});

test('UP-12 frontend should offer booking if model itself says information is missing', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ message: 'Mình chưa có dữ liệu về điều này. Bạn hãy đặt lịch tư vấn.' }) });
  try {
    const reply = await new HybridChatAdapter().reply(aiQuestion, 'python-basic');
    assert.equal(reply.action, 'offer_booking');
  } finally { globalThis.fetch = original; }
});

test('UP-13 malformed or unavailable local API falls back with three suggestions', async () => {
  const original = globalThis.fetch;
  for (const fakeFetch of [
    async () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } }),
    async () => { throw new Error('offline'); },
    async () => ({ ok: false, status: 429 }),
  ]) {
    globalThis.fetch = fakeFetch;
    const reply = await new HybridChatAdapter().reply(aiQuestion, 'python-basic');
    assert.equal(reply.action, 'offer_booking');
    assert.equal(reply.mode, 'mock');
    assert.equal(reply.suggestions.length, 3);
  }
  globalThis.fetch = original;
});
