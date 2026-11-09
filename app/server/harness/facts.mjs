const formatVnd = amount => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
const modeText = mode => mode === 'online' ? 'trực tuyến' : 'tại trung tâm';
const unique = values => [...new Set(values)];

function courseFact(course, field, details, teachers) {
  const detail = details?.[course.id];
  if (field === 'price') return formatVnd(course.priceVnd);
  if (field === 'schedule') return `${course.title}: ${course.sessions} buổi; lịch ${course.schedule}; hình thức ${modeText(course.mode)}.`;
  if (field === 'audience') return `${course.title}: phù hợp với ${course.audience.toLocaleLowerCase('vi-VN')}.`;
  if (field === 'curriculum' && detail) return `Lộ trình mẫu ${course.title}: ${detail.modules.map(module => `${module.title} (${module.sessions} buổi)`).join('; ')}.`;
  if (field === 'project' && detail) return `Đồ án mẫu ${course.title}: ${detail.project.title}. ${detail.project.description}`;
  if (field === 'assessment' && detail) return `Đánh giá mẫu ${course.title}: ${detail.assessments.map(item => item.title).join('; ')}.`;
  if (field === 'teacher') {
    const assigned = teachers?.filter(teacher => teacher.courseIds.includes(course.id)) || [];
    return assigned.length ? `Giáo viên minh họa phụ trách ${course.title}: ${assigned.map(teacher => `${teacher.name}; chuyên môn mẫu: ${teacher.specialty}; giới thiệu: ${teacher.introduction}`).join(' ')} Đây là hồ sơ dữ liệu mẫu, không xác nhận nhân sự thực tế.` : null;
  }
  return null;
}

// Only requested facts are exposed to the model. This is a source selector,
// not proof that generated prose around a fact is true.
export function selectFacts(request, knowledge) {
  const available = [];
  const missing = [...(request.missingInformation || [])];
  const knownIds = new Set();
  for (const id of request.requiredFactIds || []) {
    if (typeof id !== 'string' || knownIds.has(id)) continue;
    knownIds.add(id);
    if (id === 'faq:courses') {
      const names = (knowledge.courses || []).map(course => course.title);
      available.push({ id, text: `Có ${names.length} khóa học mẫu: ${names.join(', ')}.` });
      continue;
    }
    if (id.startsWith('faq:')) {
      const faq = knowledge.faqs?.find(item => item.id === id.slice(4));
      if (faq?.answer) available.push({ id, text: faq.answer });
      else missing.push(`dữ liệu cho ${id}`);
      continue;
    }
    const match = /^course:([^:]+):(price|schedule|audience|curriculum|project|assessment|teacher)$/.exec(id);
    if (!match) { missing.push(`dữ liệu cho ${id}`); continue; }
    const [, courseId, field] = match;
    const course = knowledge.courses?.find(item => item.id === courseId);
    const text = course && courseFact(course, field, knowledge.courseDetails, knowledge.teachers);
    if (text) available.push({ id, courseId, text, format: field === 'price' ? 'value' : 'sentence' });
    else missing.push(`dữ liệu ${field} của khóa ${course?.title || courseId}`);
  }
  if (request.requestedFields?.length && !request.courseIds?.length)
    missing.push('tên khóa học cần hỏi');
  return { available, missing: unique(missing) };
}
