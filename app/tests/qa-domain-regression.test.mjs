import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import faqs from '../src/data/faqs.json' with { type: 'json' };

async function load(entry) {
  const bundle = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
}
const { findFaq } = await load('src/domain/faqMatcher.ts');
const { validateBooking } = await load('src/domain/bookingValidation.ts');
const booking = { name: 'Người Kiểm Thử', phone: '0900000000', date: '2026-02-02', time: '14:00', note: '' };

test('FAQ giờ tư vấn ưu tiên cụm giờ cụ thể, không nuốt intent đăng ký', () => {
  for (const question of ['Khi nào có thể tư vấn?', 'Khi nao co the tu van?', 'Giờ tư vấn nào có thể chọn?', 'Khung giờ tư vấn hôm nay?', 'Giờ nào có thể chọn?']) {
    assert.equal(findFaq(question, faqs)?.id, 'hours', question);
  }
  for (const question of ['Đăng ký như thế nào?', 'Dang ky nhu the nao?', 'Tôi muốn đặt lịch tư vấn']) {
    assert.equal(findFaq(question, faqs)?.id, 'register', question);
  }
  assert.equal(findFaq('Muốn đăng ký và hỏi khung giờ tư vấn?', faqs), undefined);
});

test('Booking từ chối ngày không tồn tại và nhận năm nhuận đúng', () => {
  const feb2026 = new Date('2026-02-01T03:30:00Z');
  for (const date of ['2026-02-29', '2026-02-30', '2026-02-31', '2026-04-31', '2026-00-10', '2026-13-10', '2026-02-00', '2026-02-32']) {
    assert.ok(validateBooking({ ...booking, date }, [], feb2026).date, date);
  }
  assert.deepEqual(validateBooking({ ...booking, date: '2028-02-29' }, [], new Date('2028-02-01T03:30:00Z')), {});
  assert.ok(validateBooking({ ...booking, date: '2028-02-30' }, [], new Date('2028-02-01T03:30:00Z')).date);
});

test('Booking vẫn giữ hôm nay theo giờ Việt Nam và biên 60 ngày', () => {
  const now = new Date('2026-11-08T03:30:00Z');
  assert.deepEqual(validateBooking({ ...booking, date: '2026-11-08' }, [], now), {});
  assert.deepEqual(validateBooking({ ...booking, date: '2027-01-07' }, [], now), {});
  assert.ok(validateBooking({ ...booking, date: '2027-01-08' }, [], now).date);
  assert.ok(validateBooking({ ...booking, date: '2026-11-07' }, [], now).date);
});
