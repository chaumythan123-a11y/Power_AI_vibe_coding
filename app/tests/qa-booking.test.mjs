import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function load(entry) {
  const bundle = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
}

const { validateBooking, cleanPhone, vietnamNow } = await load('src/domain/bookingValidation.ts');
const { bookingStorage } = await load('src/services/bookingStorage.ts');
const now = new Date('2026-11-08T03:30:00.000Z'); // 10:30 in Asia/Ho_Chi_Minh.
const valid = { name: 'Người Kiểm Thử', phone: '+84 900-000-000', date: '2026-11-09', time: '14:00', note: '', courseId: 'python-basic' };
const plusDays = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

function fakeStorage(raw = null, { readError = false, writeError = false } = {}) {
  const state = { raw, reads: 0, writes: 0, removes: 0 };
  globalThis.localStorage = {
    getItem(key) { assert.equal(key, 'studyconnect.bookings.v1'); state.reads++; if (readError) throw new Error('blocked'); return state.raw; },
    setItem(key, value) { assert.equal(key, 'studyconnect.bookings.v1'); state.writes++; if (writeError) throw new Error('quota'); state.raw = value; },
    removeItem(key) { assert.equal(key, 'studyconnect.bookings.v1'); state.removes++; state.raw = null; },
  };
  return state;
}

test('QA booking: giờ Việt Nam và mốc 60/61 ngày', () => {
  assert.deepEqual(vietnamNow(now), { date: '2026-11-08', time: '10:30' });
  assert.deepEqual(validateBooking({ ...valid, date: plusDays('2026-11-08', 60) }, [], now), {});
  assert.ok(validateBooking({ ...valid, date: plusDays('2026-11-08', 61) }, [], now).date);
  assert.ok(validateBooking({ ...valid, date: '2026-11-07' }, [], now).date);
});

test('QA booking: slot hôm nay phải ở tương lai và thuộc cấu hình', () => {
  assert.ok(validateBooking({ ...valid, date: '2026-11-08', time: '10:00' }, [], now).time);
  assert.deepEqual(validateBooking({ ...valid, date: '2026-11-08', time: '14:00' }, [], now), {});
  assert.ok(validateBooking({ ...valid, time: '11:00' }, [], now).time);
  assert.ok(validateBooking({ ...valid, time: '' }, [], now).time);
  assert.ok(validateBooking({ ...valid, date: '' }, [], now).date);
});

test('QA booking: tên, số điện thoại và ghi chú ở biên', () => {
  assert.equal(cleanPhone('+84 900-000-000'), '0900000000');
  assert.deepEqual(validateBooking(valid, [], now), {});
  for (const name of ['', '   ', 'A', 'A'.repeat(81)]) assert.ok(validateBooking({ ...valid, name }, [], now).name, name);
  for (const phone of ['', '123456789', 'abcdefghij', '1900000000']) assert.ok(validateBooking({ ...valid, phone }, [], now).phone, phone);
  assert.deepEqual(validateBooking({ ...valid, name: 'A'.repeat(80), note: 'x'.repeat(300) }, [], now), {});
  assert.ok(validateBooking({ ...valid, note: 'x'.repeat(301) }, [], now).note);
});

test('QA booking: ngày không tồn tại phải bị từ chối', () => {
  assert.ok(validateBooking({ ...valid, date: '2026-02-30' }, [], new Date('2026-02-01T03:30:00Z')).date);
});

test('QA booking: active chặn slot trùng, processed không chặn', () => {
  const slot = { date: valid.date, time: valid.time };
  assert.ok(validateBooking(valid, [{ ...slot, status: 'active' }], now).time);
  assert.deepEqual(validateBooking(valid, [{ ...slot, status: 'processed' }], now), {});
});

test('QA booking: JSON hỏng, schema sai, storage bị chặn không bị ghi đè', () => {
  const tomorrow = plusDays(vietnamNow().date, 1);
  for (const raw of ['{bad', JSON.stringify([{ id: 'x', schemaVersion: 2 }])]) {
    const state = fakeStorage(raw);
    assert.ok(bookingStorage.read().error);
    assert.ok(bookingStorage.add({ ...valid, date: tomorrow }).error);
    assert.equal(state.writes, 0);
    assert.equal(state.raw, raw);
  }
  const state = fakeStorage(null, { readError: true });
  assert.ok(bookingStorage.read().error);
  assert.ok(bookingStorage.add({ ...valid, date: tomorrow }).error);
  assert.equal(state.writes, 0);
});

test('QA booking: lỗi setItem không được báo lưu thành công', () => {
  const state = fakeStorage(null, { writeError: true });
  const result = bookingStorage.add({ ...valid, date: plusDays(vietnamNow().date, 1) });
  assert.ok(result.error);
  assert.equal(result.booking, undefined);
  assert.equal(state.raw, null);
});

test('QA booking: lưu, đọc lại, chặn trùng, xử lý, xóa và đọc lại', () => {
  const state = fakeStorage();
  const input = { ...valid, date: plusDays(vietnamNow().date, 1) };
  const first = bookingStorage.add(input);
  assert.ok(first.booking);
  assert.equal(first.booking.phone, '0900000000');
  assert.equal(first.booking.timeZone, 'Asia/Ho_Chi_Minh');
  assert.equal(bookingStorage.read().bookings.length, 1);
  assert.ok(bookingStorage.add(input).fieldErrors?.time);
  assert.equal(bookingStorage.read().bookings.length, 1);
  assert.equal(bookingStorage.process(first.booking.id), undefined);
  assert.equal(bookingStorage.read().bookings[0].status, 'processed');
  assert.equal(bookingStorage.delete(first.booking.id), undefined);
  assert.deepEqual(bookingStorage.read().bookings, []);
  assert.ok(state.writes >= 3);
});
