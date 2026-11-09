import test from 'node:test';
import assert from 'node:assert/strict';

function response() {
  return { statusCode: 0, headers: {}, setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}
function request(body, options = {}) {
  return { method: options.method || 'POST', headers: { host: 'study.example', 'content-type': 'application/json', ...options.headers }, body };
}

// Import each deployment configuration once; no live Gemini call is made.
test('Vercel Function without key keeps guarded answers and fallback', async () => {
  const before = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const { default: chat } = await import('../api/chat.js?offline');
    const { default: status } = await import('../api/chat/status.js?offline');
    const state = response(); await status(request(undefined, { method: 'GET' }), state);
    assert.deepEqual(state.body, { enabled: false, model: 'gemini-2.5-flash' });
    const guarded = response(); await chat(request({ message: 'Giáo viên của khóa Python cơ bản là ai?' }), guarded);
    assert.equal(guarded.statusCode, 200); assert.equal(guarded.body.needsConsultation, false);
    assert.match(guarded.body.message, /Minh An/);
    const absent = response(); await chat(request({ message: 'Giải thích vòng lặp for' }), absent);
    assert.equal(absent.statusCode, 503);
    const method = response(); await chat(request(undefined, { method: 'GET' }), method);
    assert.equal(method.statusCode, 405);
    const large = response(); await chat(request({ message: 'a'.repeat(33000) }), large);
    assert.equal(large.statusCode, 413);
    const invalid = response(); await chat(request('{bad'), invalid);
    assert.equal(invalid.statusCode, 400);
  } finally { if (before === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = before; }
});

test('Vercel Function uses fake upstream and sanitizes failures', async () => {
  const beforeKey = process.env.GEMINI_API_KEY;
  const beforeFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = 'fake-test-key';
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ({ candidates: [{ finishReason:'STOP', content: { parts: [{ text: JSON.stringify({
      schemaVersion:1,kind:'explanation',action:'answer',content:{text:'Vòng lặp lặp lại một thao tác theo điều kiện.'},
      usedFactIds:[],missingInformation:[],suggestions:[{label:'Cho ví dụ vòng lặp?',action:'ask'},{label:'Có bài tập Python nào?',action:'ask'},{label:'Đặt lịch tư vấn thế nào?',action:'book'}]
    }) }] } }] }) }; };
    const { default: chat } = await import('../api/chat.js?fake');
    const good = response(); await chat(request({ message: 'Giải thích vòng lặp for' }), good);
    assert.equal(good.statusCode, 200); assert.equal(good.body.mode, 'gemini'); assert.equal(calls, 1);
    globalThis.fetch = async () => ({ ok: false, status: 429 });
    const { default: quotaChat } = await import('../api/chat.js?quota');
    const limited = response(); await quotaChat(request({ message: 'Giải thích vòng lặp for' }), limited);
    assert.equal(limited.statusCode, 429);
    globalThis.fetch = async () => { throw Error('fake upstream secret'); };
    const { default: errorChat } = await import('../api/chat.js?error');
    const failed = response(); await errorChat(request({ message: 'Giải thích vòng lặp for' }), failed);
    assert.equal(failed.statusCode, 502); assert.ok(!JSON.stringify(failed.body).includes('secret'));
  } finally { globalThis.fetch = beforeFetch; if (beforeKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = beforeKey; }
});
