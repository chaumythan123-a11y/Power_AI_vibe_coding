import { selectedCourses } from '../grounding.mjs';

export const normalize = value => String(value || '').toLocaleLowerCase('vi-VN').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
const has = (text, pattern) => pattern.test(text);
const unique = values => [...new Set(values)];

function studyDuration(text) {
  if (/\b\d{1,2}\s*(?:-|den)\s*\d{1,2}\s*(ngay|tuan)\b|\b(vai|may)\s*(ngay|tuan)\b/.test(text)) return null;
  const number = text.match(/\b(\d{1,2})\s*(ngay|tuan)\b/);
  if (number) return Number(number[1]) * (number[2] === 'tuan' ? 7 : 1);
  const words = text.match(/\b(mot|hai|ba|bon)\s*(ngay|tuan)\b/);
  if (words) return ({ mot: 1, hai: 2, ba: 3, bon: 4 })[words[1]] * (words[2] === 'tuan' ? 7 : 1);
  return null;
}
function dailyMinutes(text) {
  const number = text.match(/\b(\d{1,3})\s*(phut|gio)\s*(?:moi ngay|mot ngay|ngay|per day)?\b/)
    || text.match(/\b(?:moi ngay|mot ngay|ngay)\s*(\d{1,3})\s*(phut|gio)\b/);
  return number ? Number(number[1]) * (number[2] === 'gio' ? 60 : 1) : null;
}
function previousStudyPlan(history) {
  if (!Array.isArray(history)) return null;
  for (const item of [...history].reverse()) {
    if (item?.role !== 'user' || typeof item.text !== 'string') continue;
    const text = normalize(item.text);
    if (/\b(tu hoc|ke hoach hoc|lo trinh hoc)\b/.test(text) && /\b(ngay|tuan)\b/.test(text)) return text;
  }
  return null;
}

// This is a conservative intent parser, not a semantic proof of user intent.
export function understandRequest({ message, history = [], contextCourseId, knowledge }) {
  const text = normalize(message);
  const priorPlan = previousStudyPlan(history);
  const followupPlan = Boolean(priorPlan && /\b(ngay dau tien|ngay thu \d+|ngay \d+|bai tap ngay|tiep theo trong ke hoach)\b/.test(text));
  const explicitCourses = selectedCourses(message, undefined, knowledge);
  const priorCourse = [...history].reverse().find(item => item?.role === 'user' && selectedCourses(item.text, undefined, knowledge).length === 1);
  const historicalCourseId = priorCourse ? selectedCourses(priorCourse.text, undefined, knowledge)[0].id : undefined;
  const courseIds = explicitCourses.length ? explicitCourses.map(course => course.id)
    : contextCourseId && knowledge.courses?.some(course => course.id === contextCourseId) ? [contextCourseId]
    : historicalCourseId ? [historicalCourseId] : [];
  const selectedCourseId = courseIds.length === 1 ? courseIds[0] : null;
  const courseProject = /\b(do an|du an|san pham cuoi khoa)\b/.test(text)
    && /\b(cua khoa|khoa hoc|trong khoa|khoa .* co|mau cua khoa)\b/.test(text)
    && !/\b(tu lam|tu luyen|de toi|cho toi|goi y .* de|thuc hanh rieng)\b/.test(text);
  const personalProject = /\b(goi y|de xuat|tu lam|tu luyen|de toi|cho toi|thuc hanh rieng|y tuong)\b/.test(text)
    && /\b(do an|du an|project)\b/.test(text) && !courseProject;
  const personalPlan = /\b(tu hoc|lap lich hoc|ke hoach hoc|lo trinh tu hoc)\b/.test(text)
    && /\b(lo trinh|ke hoach|lich|ngay|tuan)\b/.test(text);
  const studyPlan = personalPlan || followupPlan;
  const durationDays = studyDuration(text) ?? (followupPlan ? studyDuration(priorPlan) : null);
  const minutesPerDay = dailyMinutes(text) ?? (followupPlan ? dailyMinutes(priorPlan) : null);
  const needsCode = /\b(code|ma nguon|doan ma|vi du ma|vi du code|viet chuong trinh|viet lenh)\b/.test(text)
    || (/\b(vi du|cho vi du)\b/.test(text) && /\b(python|lap trinh|vong lap|ham|bien|lenh)\b/.test(text));
  const level = /\b(nguoi moi|moi bat dau|co ban|chua biet)\b/.test(text) ? 'beginner' : null;
  const explanation = /\b(giai thich|vi du|phan biet|la gi|nhu the nao)\b/.test(text)
    && /\b(vong lap|for|while|lap trinh|thuat toan|ham|bien|ngu phap|phat am|toan)\b/.test(text);
  const booking = /\b(dat lich|hen tu van|muon tu van|chon lich)\b/.test(text)
    && !/\b(nhu the nao|lam sao|cach|gio|khi nao)\b/.test(text);

  const requestedFields = [];
  if (has(text, /\b(hoc phi|bao nhieu tien|gia bao nhieu|gia khoa|gia hoc|gia python|gia excel|python gia|excel gia|khoa .{0,35} gia|so sanh gia|so sanh hoc phi)\b/)) requestedFields.push('price');
  if (has(text, /\b(lich hoc khoa|khoa .* hoc thu|khoa .* hoc may buoi|thoi luong khoa|may buoi|bao nhieu buoi|hoc bao lau)\b/)
    && !studyPlan) requestedFields.push('schedule');
  if (has(text, /\b(phu hop|doi tuong|dau vao|trinh do|nguoi moi|co can hoc truoc)\b/) && !studyPlan && !explanation && !personalProject) requestedFields.push('audience');
  if (has(text, /\b(lo trinh khoa|chuong trinh hoc|noi dung khoa|khoa .* hoc nhung gi|cac giai doan khoa)\b/)
    && !studyPlan) requestedFields.push('curriculum');
  if (courseProject) requestedFields.push('project');
  if (has(text, /\b(bai kiem tra|kiem tra gi|danh gia khoa|hinh thuc danh gia)\b/)) requestedFields.push('assessment');
  if (has(text, /\b(bai tap|bai thuc hanh|bai luyen tap|bai tap mau)\b/)) requestedFields.push('practice');
  if (has(text, /\b(giao vien|giang vien|ai day|ai dung lop|nguoi huong dan|thay co|thay nao|co nao|thay do|co do|ai phu trach|ten nguoi day)\b/)) requestedFields.push('teacher');

  const faqIds = [];
  if (has(text, /\b(co nhung khoa|co cac lop|co lop gi|khoa hoc nao|hoc mon gi)\b/)) faqIds.push('courses');
  if (has(text, /\b(hoc thu|trai nghiem buoi hoc)\b/)) faqIds.push('trial');
  if (has(text, /\b(thanh toan|chuyen khoan|dong tien)\b/)) faqIds.push('payment');
  if (has(text, /\b(bao luu)\b/)) faqIds.push('reserve');
  if (has(text, /\b(hoan hoc phi|hoan tien|huy khoa|lay lai tien)\b/)) faqIds.push('refund');
  if (has(text, /\b(gio tu van|khung gio tu van|khi nao .* tu van|mo cua)\b/)) faqIds.push('hours');
  if (has(text, /\b(dang ky nhu the nao|dat lich tu van nhu the nao|lam sao .* dang ky)\b/)) faqIds.push('register');
  if (booking) faqIds.push('register');
  const exactFaq = knowledge.faqs?.find(faq => [faq.question, ...(faq.aliases || [])].some(alias => normalize(alias) === text));
  if (exactFaq && !['fees', 'schedule', 'entry'].includes(exactFaq.id)) faqIds.push(exactFaq.id);
  if (exactFaq?.id === 'fees') requestedFields.push('price');
  if (exactFaq?.id === 'schedule' && !studyPlan) requestedFields.push('schedule');
  if (exactFaq?.id === 'entry' && !studyPlan) requestedFields.push('audience');

  const missingInformation = [];
  const missingRules = [
    ['bằng cấp hoặc chứng chỉ của giáo viên', /\b(bang cap|bang dai hoc|tot nghiep truong|chung chi cua (giao vien|giang vien|thay|co)|giao vien .* chung chi)\b/],
    ['thâm niên hoặc kinh nghiệm cụ thể của giáo viên', /\b(tham nien|bao nhieu nam kinh nghiem|kinh nghiem giang day)\b/],
    ['bằng hoặc chứng chỉ được cấp', /\b(chung chi|chung nhan|giay chung nhan|cap bang|bang gi)\b/],
    ['ưu đãi hoặc giảm giá', /\b(uu dai|giam gia|hoc bong|combo)\b/],
    ['ngày khai giảng', /\b(khai giang|ngay mo lop|mo lop khi nao|khi nao bat dau khoa)\b/],
    ['địa chỉ cụ thể', /\b(dia chi|co so o dau|trung tam o dau|dia diem hoc)\b/],
    ['số chỗ còn lại', /\b(con cho|cho trong|si so|het cho)\b/],
    ['cam kết kết quả hoặc việc làm', /\b(cam ket|dam bao|viec lam|dam bao dau ra|muc luong)\b/],
    ['tài khoản thanh toán', /\b(so tai khoan|tai khoan ngan hang)\b/],
  ];
  if (!explanation && !studyPlan && !personalProject)
    for (const [label, pattern] of missingRules) if (has(text, pattern)
      && !(label === 'bằng hoặc chứng chỉ được cấp' && requestedFields.includes('teacher') && !/\b(duoc cap|cap bang|cap chung chi)\b/.test(text))) missingInformation.push(label);
  if (requestedFields.includes('teacher') && /\bchung chi\b/.test(text) && !/\b(duoc cap|cap chung chi)\b/.test(text)) missingInformation.push('bằng cấp hoặc chứng chỉ của giáo viên');
  if (/\b(hoa \d|vat ly \d|sinh hoc \d|ielts)\b/.test(text) && !courseIds.length) missingInformation.push('khóa học được hỏi');

  const requiredFactIds = [
    ...unique(faqIds).map(id => `faq:${id}`),
    ...unique(requestedFields).flatMap(field => courseIds.map(id => `course:${id}:${field}`)),
  ];
  let kind;
  if (followupPlan) kind = 'explanation';
  else if (studyPlan) kind = durationDays === null ? 'clarification' : 'study_plan';
  else if (personalProject) kind = 'project';
  else if (explanation && !requiredFactIds.length && !missingInformation.length) kind = 'explanation';
  else if (booking) kind = 'booking';
  else if (missingInformation.length && requiredFactIds.length) kind = 'mixed';
  else if (missingInformation.length) kind = 'mixed';
  else if (requiredFactIds.length) kind = requestedFields.length && !courseIds.length && !faqIds.length ? 'clarification' : 'faq';
  else if (explanation) kind = 'explanation';
  else kind = 'clarification';
  return { kind, message, normalizedMessage: text, contextCourseId: selectedCourseId,
    courseIds, durationDays, minutesPerDay, needsCode, level, followupPlan, requestedFields: unique(requestedFields),
    requiredFactIds: unique(requiredFactIds), missingInformation: unique(missingInformation),
    ambiguousDuration: kind === 'clarification' && studyPlan, isBookingRequest: booking };
}
