import test from 'node:test';
import assert from 'node:assert/strict';
import { understandRequest } from '../server/harness/understand.mjs';
import { validateDraft } from '../server/harness/validate.mjs';
import { knowledge } from '../server/knowledge.mjs';

const facts = { available: [
  { id: 'course.python-basic.price', courseId: 'python-basic', text: '990.000đ' },
  { id: 'course.excel-basic.price', courseId: 'excel-basic', text: '750.000đ' },
], missing: [] };
const suggestions = [
  { label: 'Cho ví dụ dễ hiểu?', action: 'ask' },
  { label: 'Bài tập đầu tiên là gì?', action: 'ask' },
  { label: 'Đặt lịch tư vấn như thế nào?', action: 'book' },
];
const codes = output => output.errors.map(item => item.code);
const base = (kind, content, overrides = {}) => ({ schemaVersion: 1, kind, action: 'answer', content,
  usedFactIds: [], missingInformation: [], suggestions, ...overrides });
const plan = (count, minutes = 45) => base('study_plan', {
  durationDays: count, minutesPerDay: minutes,
  days: Array.from({ length: count }, (_, index) => ({ day: index + 1,
    objective: `Hiểu chủ đề ngày ${index + 1}`, tasks: ['Đọc ví dụ', 'Tự viết một chương trình ngắn'],
    exercise: 'Viết mã và đối chiếu kết quả', segments: [{ label: 'Học', minutes: 20 }, { label: 'Luyện tập', minutes: minutes - 20 }],
  })),
});
const request = (kind, extra = {}) => ({ kind, contextCourseId: 'python-basic', requiredFactIds: [], ...extra });

test('harness hiểu lịch tự học khác lịch khóa và không tự đặt 14 ngày', () => {
  const course = understandRequest({ message: 'Lịch học khóa Python cơ bản như thế nào?', history: [], contextCourseId: 'python-basic', knowledge });
  const personal = understandRequest({ message: 'Lập lịch tự học Python 5 ngày, 30 phút mỗi ngày cho người mới', history: [], contextCourseId: 'python-basic', knowledge });
  const vague = understandRequest({ message: 'Gợi ý kế hoạch tự học Python vài ngày', history: [], contextCourseId: 'python-basic', knowledge });
  assert.notEqual(course.kind, 'study_plan');
  assert.equal(personal.kind, 'study_plan');
  assert.equal(personal.durationDays, 5);
  assert.equal(personal.minutesPerDay, 30);
  assert.notEqual(vague.durationDays, 14);
});

test('harness hiểu đồ án khóa khác đề xuất thực hành và giữ yêu cầu ví dụ mã', () => {
  const course = understandRequest({ message: 'Khóa Python cơ bản có đồ án gì?', history: [], contextCourseId: 'python-basic', knowledge });
  const practice = understandRequest({ message: 'Gợi ý đồ án Python để tôi tự luyện tập', history: [], contextCourseId: 'python-basic', knowledge });
  const explanation = understandRequest({ message: 'Giải thích for trong Python và cho ví dụ mã cụ thể', history: [], contextCourseId: 'python-basic', knowledge });
  assert.notEqual(course.kind, 'project');
  assert.equal(practice.kind, 'project');
  assert.equal(explanation.kind, 'explanation');
  assert.equal(explanation.needsCode, true);
});

test('validator nhận kế hoạch đủ 14 ngày và 5 ngày với ngân sách phút đúng', () => {
  for (const [days, minutes] of [[14, 45], [5, 30]]) {
    assert.deepEqual(validateDraft(plan(days, minutes), request('study_plan', { durationDays: days, minutesPerDay: minutes }), facts).errors, []);
  }
});

test('validator từ chối kế hoạch rút thành tuần, thiếu ngày, trùng ngày hoặc sai phút', () => {
  const fourteen = request('study_plan', { durationDays: 14, minutesPerDay: 45 });
  assert.ok(codes(validateDraft(plan(2), fourteen, facts)).some(code => ['DURATION', 'DAYS'].includes(code)));
  assert.ok(codes(validateDraft(plan(13), fourteen, facts)).some(code => ['DURATION', 'DAYS'].includes(code)));
  const duplicate = plan(14); duplicate.content.days[5].day = 5;
  assert.ok(codes(validateDraft(duplicate, fourteen, facts)).includes('DAY_ORDER'));
  const empty = plan(14); empty.content.days[0].exercise = 'Hãy thực hành';
  assert.ok(codes(validateDraft(empty, fourteen, facts)).includes('DAY_CONTENT'));
  const budget = plan(14); budget.content.days[0].segments[0].minutes = 30;
  assert.ok(codes(validateDraft(budget, fourteen, facts)).includes('TIME_BUDGET'));
});

test('validator đòi ví dụ mã cụ thể khi người hỏi yêu cầu', () => {
  const req = request('explanation', { needsCode: true });
  const missing = base('explanation', { text: 'Vòng lặp for lặp qua một dãy.' });
  assert.ok(codes(validateDraft(missing, req, facts)).includes('CODE_REQUIRED'));
  const present = base('explanation', { text: 'Vòng lặp for lặp qua một dãy.', code: 'for i in range(3):\n    print(i)' });
  assert.deepEqual(validateDraft(present, req, facts).errors, []);
});

test('đồ án cho người mới không nhận độ khó trung bình', () => {
  const draft = base('project', { projectName:'Quản lý danh bạ', goal:'Lưu liên hệ cơ bản', features:['Thêm liên hệ'], firstSteps:['Tạo danh sách liên hệ'], difficulty:'Trung bình' });
  assert.ok(codes(validateDraft(draft, request('project', { level:'beginner' }), facts)).includes('PROJECT_LEVEL'));
  draft.content.difficulty = 'Dễ';
  assert.deepEqual(validateDraft(draft, request('project', { level:'beginner' }), facts).errors, []);
});

test('validator kiểm fact ID, đúng khóa và mọi ý bắt buộc của câu hỗn hợp', () => {
  const req = request('mixed', { requiredFactIds: ['course.python-basic.price'] });
  const good = base('mixed', { text: '{{fact:course.python-basic.price}} Chưa có dữ liệu giáo viên.' }, {
    action: 'offer_booking', usedFactIds: ['course.python-basic.price'], missingInformation: ['giáo viên'],
  });
  assert.deepEqual(validateDraft(good, req, { ...facts, missing: ['giáo viên'] }).errors, []);
  const lostKnown = { ...good, content: { text: 'Chưa có dữ liệu giáo viên.' }, usedFactIds: [] };
  assert.ok(codes(validateDraft(lostKnown, req, { ...facts, missing: ['giáo viên'] })).includes('FACT_REQUIRED'));
  const otherCourse = { ...good, content: { text: 'Học phí là {{fact:course.excel-basic.price}}.' }, usedFactIds: ['course.excel-basic.price'] };
  assert.ok(codes(validateDraft(otherCourse, req, { ...facts, missing: ['giáo viên'] })).includes('FACT_CONTEXT'));
  const unknown = { ...good, content: { text: 'Học phí là {{fact:course.python-basic.teacher}}.' }, usedFactIds: ['course.python-basic.teacher'] };
  assert.ok(codes(validateDraft(unknown, req, { ...facts, missing: ['giáo viên'] })).includes('FACT_UNKNOWN'));
});

test('validator từ chối gợi ý trùng/hành động sai và placeholder lộ', () => {
  const req = request('explanation');
  const duplicate = base('explanation', { text: 'Vòng lặp lặp thao tác.' }, {
    suggestions: [{ label: 'Bài tập gì?', action: 'ask' }, { label: 'Bài tập gì?', action: 'ask' }, { label: 'Đặt lịch?', action: 'book' }],
  });
  assert.ok(codes(validateDraft(duplicate, req, facts)).includes('SUGGESTIONS'));
  const invalidAction = base('explanation', { text: 'Vòng lặp lặp thao tác.' }, {
    suggestions: [{ label: 'Bài tập gì?', action: 'ask' }, { label: 'Học ở đâu?', action: 'browse' }, { label: 'Đặt lịch?', action: 'book' }],
  });
  assert.ok(codes(validateDraft(invalidAction, req, facts)).includes('SUGGESTIONS'));
  const unknownPlaceholder = base('explanation', { text: 'Giá là {{fact:missing.price}}.' });
  assert.ok(codes(validateDraft(unknownPlaceholder, req, facts)).some(code => ['PLACEHOLDER', 'FACT_UNKNOWN'].includes(code)));
});

test('validator từ chối schema sai, rỗng, output bị cắt và claim trung tâm không nguồn', () => {
  const req = request('explanation', { finishReason: 'MAX_TOKENS' });
  assert.ok(codes(validateDraft({}, req, facts)).includes('SCHEMA'));
  assert.ok(codes(validateDraft(base('explanation', { text: '' }), request('explanation'), facts)).includes('EMPTY'));
  assert.ok(codes(validateDraft(base('explanation', { text: 'Vòng lặp lặp thao tác.' }), req, facts)).includes('TRUNCATED'));
  const invented = base('explanation', { text: 'Giáo viên của StudyConnect là cô A.' });
  assert.ok(codes(validateDraft(invented, request('explanation'), facts)).includes('UNSUPPORTED_CLAIM'));
});


test('harness không nhầm hoàn thành khóa với hoàn học phí', () => {
  const completed = understandRequest({ message: 'Hoàn thành khóa Python thì làm được gì?', history: [], contextCourseId: 'python-basic', knowledge });
  const refund = understandRequest({ message: 'Nếu hủy khóa thì hoàn học phí không?', history: [], contextCourseId: 'python-basic', knowledge });
  assert.ok(!completed.requiredFactIds.includes('faq:refund'));
  assert.ok(refund.requiredFactIds.includes('faq:refund'));
});

test('harness giữ ngữ cảnh kế hoạch 14 ngày khi hỏi tiếp', () => {
  const previous = [{ role: 'user', text: 'Lập kế hoạch tự học Python 14 ngày, 45 phút mỗi ngày' },
    { role: 'model', text: 'Đã có kế hoạch học tập.' }];
  const followup = understandRequest({ message: 'Ngày đầu tiên nên làm bài tập gì?', history: previous, contextCourseId: 'python-basic', knowledge });
  assert.equal(followup.followupPlan, true);
  assert.equal(followup.durationDays, 14);
  assert.equal(followup.minutesPerDay, 45);
});
