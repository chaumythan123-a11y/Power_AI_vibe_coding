import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints:['src/domain/chatSuggestions.ts'], bundle:true, write:false, platform:'node', format:'esm' });
const { suggestedQuestions } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('fallback thuật toán giữ gợi ý cùng chủ đề và CTA', () => {
  const suggestions = suggestedQuestions('Giải thích thuật toán sắp xếp nổi bọt.', undefined, 'offer_booking');
  assert.equal(suggestions.length, 3);
  assert.ok(suggestions.some(text => /sắp xếp nổi bọt/.test(text)));
  assert.ok(suggestions.some(text => /đặt lịch tư vấn/.test(text.toLocaleLowerCase('vi-VN'))));
});
