// The catalog and FAQ data are the only source for center-specific facts.
// This module deliberately keeps model prose out of those factual fields.
const normalize = value => String(value).toLocaleLowerCase('vi-VN').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
const has = (text, pattern) => pattern.test(text);
const formatVnd = amount => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
const courseAliases = {
  'python-basic': ['python'], 'excel-basic': ['excel'],
  'english-communication': ['tieng anh giao tiep', 'anh giao tiep'],
  'toeic-foundation': ['toeic'], 'math-10': ['toan 10', 'toan lop 10'],
  'math-12': ['toan 12', 'toan lop 12'],
};
const includesPhrase = (text, phrase) => ` ${text} `.includes(` ${normalize(phrase)} `);
const unique = values => [...new Set(values.filter(Boolean))];

export function selectedCourses(question, contextCourseId, knowledge) {
  const text = normalize(question);
  const explicit = (knowledge.courses || []).filter(course =>
    [course.title, ...(courseAliases[course.id] || [])].some(alias => includesPhrase(text, alias)));
  if (explicit.length) return explicit;
  const context = (knowledge.courses || []).find(course => course.id === contextCourseId);
  return context ? [context] : [];
}

function isGeneralDefinition(text, hasExplicitCourse) {
  return !hasExplicitCourse && !/\b(studyconnect|trung tam|khoa hoc|lop hoc|hoc xong|duoc cap|co cap)\b/.test(text)
    && /\b(la gi|nghia la gi|duoc hieu the nao|giai thich|phan biet)\b/.test(text);
}

function missingFields(text, generalDefinition) {
  if (generalDefinition) return [];
  const patterns = [
    ['bằng cấp hoặc chứng chỉ của giáo viên', /\b(bang cap|bang dai hoc|tot nghiep truong|chung chi cua (giao vien|giang vien|thay|co)|giao vien .* chung chi)\b/],
    ['thâm niên hoặc kinh nghiệm cụ thể của giáo viên', /\b(tham nien|bao nhieu nam kinh nghiem|kinh nghiem giang day)\b/],
    ['bằng hoặc chứng chỉ được cấp', /\b(chung chi|chung nhan|giay chung nhan|cap bang|duoc cap bang|bang gi)\b/],
    ['ưu đãi hoặc giảm giá', /\b(uu dai|giam gia|re hon|hai nguoi|2 nguoi|di nhom|hoc bong|combo)\b/],
    ['ngày khai giảng', /\b(khai giang|dot gan nhat|bat dau hom nao|bat dau ngay nao|ngay mo lop|mo lop khi nao|khi nao bat dau)\b/],
    ['địa chỉ cụ thể', /\b(dia chi|co so o dau|trung tam o dau|dia diem hoc|hoc o dau)\b/],
    ['số chỗ còn lại', /\b(con cho|con may cho|con bao nhieu cho|cho trong|bao nhieu cho|het cho|si so|con slot)\b/],
    ['cam kết kết quả hoặc việc làm', /\b(cam ket|dam bao|viec lam|dam bao dau ra|muc luong|diem ielts|diem toeic)\b/],
    ['tài khoản thanh toán', /\b(so tai khoan|tai khoan ngan hang)\b/],
  ];
  return patterns.filter(([label, pattern]) => has(text, pattern)
    && !(label === 'bằng hoặc chứng chỉ được cấp' && requestedKnownFields(text).includes('teacher') && !/\b(duoc cap|cap bang|cap chung chi)\b/.test(text))).map(([label]) => label);
}

function requestedKnownFields(text) {
  const fields = [];
  if (has(text, /\b(hoc phi|bao nhieu tien|gia bao nhieu|gia khoa|gia hoc|khoa .{0,35} gia|gia python|gia excel|so sanh gia|so sanh hoc phi)\b/)) fields.push('price');
  if (has(text, /\b(lich hoc|hoc toi nao|hoc thu may|hoc ngay nao|lich the nao|lich va thoi luong|thoi luong|may buoi|bao nhieu buoi|so buoi|hoc bao lau)\b/)) fields.push('schedule');
  if (has(text, /\b(phu hop|doi tuong|dau vao|trinh do|nguoi moi|co can hoc truoc|chua hoc lap trinh|chua biet lap trinh)\b/)) fields.push('audience');
  if (has(text, /\b(lo trinh|chuong trinh hoc|noi dung khoa|hoc nhung gi|cac giai doan)\b/)) fields.push('curriculum');
  if (has(text, /\b(do an|san pham cuoi khoa|du an cuoi khoa)\b/) && !has(text, /\b(do an .{0,30} ve |ve sach|ve chu de|tu chon)\b/)) fields.push('project');
  if (has(text, /\b(bai kiem tra|kiem tra gi|danh gia nhu the nao|hinh thuc danh gia)\b/)) fields.push('assessment');
  if (has(text, /\b(giao vien|giang vien|ai day|ai dung lop|nguoi huong dan|nguoi day|thay co|thay nao|co nao|thay do|co do|ai phu trach|ten nguoi day)\b/)) fields.push('teacher');
  return unique(fields);
}

function policyFacts(text, knowledge) {
  const policy = [
    ['trial', /\b(hoc thu|trai nghiem buoi hoc)\b/],
    ['payment', /\b(thanh toan|chuyen khoan|dong tien)\b/],
    ['reserve', /\b(bao luu)\b/],
    ['refund', /\b(hoan hoc phi|hoan tien|huy khoa)\b/],
    ['hours', /\b(gio tu van|khung gio tu van|khi nao tu van)\b/],
    ['register', /\b(dang ky nhu the nao|dat lich tu van nhu the nao)\b/],
  ];
  return policy.filter(([, pattern]) => has(text, pattern))
    .map(([id]) => knowledge.faqs?.find(faq => faq.id === id)?.answer)
    .filter(Boolean);
}

function courseFacts(course, fields, knowledge) {
  const detail = knowledge.courseDetails?.[course.id];
  const facts = [];
  for (const field of fields) {
    if (field === 'price') facts.push(`Học phí mẫu của ${course.title} là ${formatVnd(course.priceVnd)}.`);
    if (field === 'schedule') facts.push(`${course.title} có ${course.sessions} buổi, lịch ${course.schedule}, hình thức ${course.mode === 'online' ? 'trực tuyến' : 'tại trung tâm'}.`);
    if (field === 'audience') facts.push(`${course.title} phù hợp với ${course.audience.toLocaleLowerCase('vi-VN')}.`);
    if (field === 'curriculum' && detail) facts.push(`Lộ trình mẫu của ${course.title}: ${detail.modules.map(module => `${module.title} (${module.sessions} buổi)`).join('; ')}.`);
    if (field === 'project' && detail) facts.push(`Đồ án mẫu của ${course.title}: ${detail.project.title}. ${detail.project.description}`);
    if (field === 'assessment' && detail) facts.push(`Đánh giá mẫu của ${course.title}: ${detail.assessments.map(item => item.title).join('; ')}.`);
    if (field === 'teacher') for (const teacher of knowledge.teachers?.filter(item => item.courseIds.includes(course.id)) || []) facts.push(`Giáo viên minh họa phụ trách ${course.title}: ${teacher.name}. Chuyên môn mẫu: ${teacher.specialty}. ${teacher.introduction} Hồ sơ này là dữ liệu mẫu, không xác nhận nhân sự thực tế.`);
  }
  return facts;
}

function suggestionsFor(question, action, fields, missing, courses) {
  const text = normalize(question);
  const title = courses[0]?.title;
  let pool;
  if (action === 'clarify') pool = ['Có những khóa học nào?', 'Python cơ bản phù hợp với ai?', 'Excel cơ bản học mấy buổi?'];
  else if (missing.length) pool = [
    'Đặt lịch tư vấn như thế nào?',
    title ? `${title} học những gì?` : 'Có những khóa học nào?',
    title ? `${title} phù hợp với ai?` : 'Khi nào có thể tư vấn?',
  ];
  else if (/\b(vong lap|lap trinh|thuat toan|ham so|bien so|ngu phap|phat am)\b/.test(text)) pool = [
    text.includes('vong lap') ? 'Vòng lặp for khác while như thế nào?' : 'Cho một ví dụ học tập dễ hiểu hơn?',
    text.includes('vong lap') ? 'Cho ví dụ vòng lặp for trong Python?' : 'Có bài tập thực hành nào cho chủ đề này?',
    title ? `${title} có bài tập mẫu nào?` : 'Python cơ bản có bài tập mẫu nào?',
  ];
  else if (fields.includes('project') || /\b(do an|du an|san pham|lap trinh)\b/.test(text)) pool = [
    title ? `${title} có đồ án mẫu gì?` : 'Python cơ bản có đồ án mẫu gì?',
    title ? `${title} cần kiến thức đầu vào nào?` : 'Python cơ bản cần kiến thức đầu vào nào?',
    'Đặt lịch tư vấn về lộ trình như thế nào?',
  ];
  else if (fields.includes('price')) pool = ['Lịch học và thời lượng thế nào?', 'Có cần kiến thức đầu vào không?', 'Đặt lịch tư vấn như thế nào?'];
  else pool = [title ? `${title} phù hợp với ai?` : 'Có những khóa học nào?', 'Học phí bao nhiêu?', 'Đặt lịch tư vấn như thế nào?'];
  const selected = unique(pool.filter(item => normalize(item) !== text));
  for (const extra of ['Có những khóa học nào?', 'Khi nào có thể tư vấn?', 'Đăng ký như thế nào?', 'Excel cơ bản học mấy buổi?']) {
    if (selected.length === 3) break;
    if (!selected.some(item => normalize(item) === normalize(extra)) && normalize(extra) !== text) selected.push(extra);
  }
  return selected.slice(0, 3);
}

export function groundedReply(question, contextCourseId, knowledge) {
  const text = normalize(question);
  // A personal study plan asks for general advice, not the sample course syllabus.
  if (/\b(tu hoc|ke hoach hoc ca nhan)\b/.test(text)
    && /\b(lo trinh|ke hoach|tuan|ngay)\b/.test(text)) return null;
  const asksCatalog = /\b(co nhung khoa|co cac lop|cac lop gi|co lop gi|hoc mon gi|khoa hoc nao)\b/.test(text);
  const explicit = selectedCourses(question, undefined, knowledge);
  const courses = selectedCourses(question, contextCourseId, knowledge);
  const generalDefinition = isGeneralDefinition(text, explicit.length > 0);
  const missing = missingFields(text, generalDefinition);
  if (requestedKnownFields(text).includes('teacher') && /\bchung chi\b/.test(text) && !/\b(duoc cap|cap chung chi)\b/.test(text)) missing.push('bằng cấp hoặc chứng chỉ của giáo viên');
  // A learning-concept explanation may mention a course or "người mới" without
  // asking for that course's audience. Let the model explain the concept.
  if (!missing.length && /\b(giai thich|vi du|phan biet)\b/.test(text)
    && /\b(vong lap|lap trinh|thuat toan|ham so|bien so|ngu phap|phat am)\b/.test(text)) return null;
  const fields = requestedKnownFields(text);
  const policy = policyFacts(text, knowledge);
  const unsupportedCourse = /\b(hoa|vat ly|sinh hoc|ielts)\b/.test(text)
    || (/\btoan (\d{1,2})\b/.test(text) && !explicit.some(course => normalize(course.title) === text.match(/\btoan (\d{1,2})\b/)?.[0]));
  if (unsupportedCourse && !generalDefinition) missing.push('khóa học được hỏi');
  const known = [...policy];
  if (asksCatalog) known.push(`Có ${(knowledge.courses || []).length} khóa mẫu: ${(knowledge.courses || []).map(course => course.title).join(', ')}.`);
  if (fields.length && courses.length) for (const course of courses) known.push(...courseFacts(course, fields, knowledge));
  if (fields.includes('teacher') && courses.length && !courses.some(course => knowledge.teachers?.some(teacher => teacher.courseIds.includes(course.id)))) missing.push('giáo viên phụ trách khóa học');
  if (fields.length && !courses.length && !policy.length && !missing.length) {
    return response('Bạn muốn hỏi về khóa học nào? Hãy chọn khóa trong danh mục hoặc nêu tên khóa.', 'clarify', [], [], [], question, fields, []);
  }
  if (missing.length) {
    const message = `${known.join(' ')} ${known.length && !fields.includes('teacher') ? 'Đây là dữ liệu mẫu. ' : ''}Mình chưa có thông tin mẫu đã xác thực về ${unique(missing).join(', ')} nên không thể xác nhận thay trung tâm. Bạn có thể đặt lịch tư vấn để chuyên viên kiểm tra cụ thể.`.trim();
    return response(message, 'offer_booking', courses.map(course => course.id), known, unique(missing), question, fields, courses);
  }
  if (known.length) {
    return response(`${known.join(' ')}${fields.includes('teacher') ? '' : ' Đây là dữ liệu mẫu.'}`, 'answer', courses.map(course => course.id), known, [], question, fields, courses);
  }
  return null;
}

function response(message, action, courseIds, knownFacts, missingFacts, question, fields, courses, mode = 'mock') {
  return { message, action, courseIds, knownFacts, missingFacts,
    needsConsultation: action === 'offer_booking',
    suggestions: suggestionsFor(question, action, fields, missingFacts, courses), mode };
}

export function safeFallback(question, contextCourseId, knowledge, reason = 'Mình chưa có đủ thông tin mẫu đã xác thực để trả lời chắc chắn.') {
  const courses = selectedCourses(question, contextCourseId, knowledge);
  return response(`${reason} Bạn có thể đặt lịch tư vấn để chuyên viên kiểm tra và trả lời cụ thể.`,
    'offer_booking', courses.map(course => course.id), [], ['thông tin cần tư vấn'], question, [], courses);
}

export function modelReply(question, contextCourseId, knowledge, rawText) {
  let parsed;
  try { parsed = JSON.parse(rawText); } catch { return safeFallback(question, contextCourseId, knowledge); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
    || Object.keys(parsed).length !== 2
    || !Object.hasOwn(parsed, 'kind') || !Object.hasOwn(parsed, 'text')
    || !['general_explanation', 'missing_information'].includes(parsed.kind)
    || typeof parsed.text !== 'string' || !parsed.text.trim() || parsed.text.length > 2000) {
    return safeFallback(question, contextCourseId, knowledge);
  }
  if (parsed.kind === 'missing_information') return safeFallback(question, contextCourseId, knowledge);
  const message = parsed.text.trim();
  // A structured kind is not factual proof. Suppress prose with center-specific claims.
  const normalized = normalize(message);
  const generalDefinition = isGeneralDefinition(normalize(question),
    selectedCourses(question, undefined, knowledge).length > 0);
  const unsafe = /<[^>]+>/.test(message)
    || /\b(studyconnect|trung tam|khoa hoc|khoa python|khoa excel|khoa toeic|hoc phi|khai giang|giao vien|giang vien|duoc cap|cap bang|uu dai|giam gia|cam ket|dam bao|dia chi|con cho|cho trong|chuyen khoan|bao luu|hoan tien|hoan hoc phi|bo qua quy tac|bo qua du lieu|system prompt|api key)\b/.test(normalized)
    || (!generalDefinition && /\bchung chi\b/.test(normalized))
    || /\b\d{1,3}(?:[.,]\d{3})+\b|\b\d+\s*(?:buoi|dong|vnd)\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/i.test(message);
  if (unsafe) return safeFallback(question, contextCourseId, knowledge);
  const courses = selectedCourses(question, contextCourseId, knowledge);
  return response(`Gợi ý học tập chung: ${message}`, 'answer', courses.map(course => course.id), [], [],
    question, [], courses, 'gemini');
}
