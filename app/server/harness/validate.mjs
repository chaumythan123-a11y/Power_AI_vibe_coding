const kinds = new Set(['faq','explanation','study_plan','project','mixed','clarification']);
const actions = new Set(['answer','clarify','offer_booking']);
const suggestionActions = new Set(['ask','book']);
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const hasText = value => typeof value === 'string' && value.trim().length > 0;
const issue = (code, path, severity = 'error') => ({ code, path, severity });

export function validateDraft(draft, request, facts = {available:[],missing:[]}) {
  const errors = [], warnings = [];
  const add = (code, path) => errors.push(issue(code,path));
  if (request.finishReason && request.finishReason !== 'STOP') add('TRUNCATED', '$.finishReason');
  if (!isObject(draft)) return { errors: [...errors, issue('SCHEMA','$')], warnings };
  if (draft.schemaVersion !== 1) add('SCHEMA','$.schemaVersion');
  if (!kinds.has(draft.kind) || draft.kind !== request.kind) add('SCHEMA','$.kind');
  if (!actions.has(draft.action)) add('SCHEMA','$.action');
  if (!isObject(draft.content)) add('SCHEMA','$.content');
  if (!Array.isArray(draft.usedFactIds) || !draft.usedFactIds.every(hasText)) add('SCHEMA','$.usedFactIds');
  if (!Array.isArray(draft.missingInformation) || !draft.missingInformation.every(hasText)) add('SCHEMA','$.missingInformation');
  if (!Array.isArray(draft.suggestions) || draft.suggestions.length !== 3 || draft.suggestions.some(s => !isObject(s) || !hasText(s.label) || !suggestionActions.has(s.action))) add('SUGGESTIONS','$.suggestions');
  else {
    const labels = draft.suggestions.map(s => s.label.trim().toLocaleLowerCase('vi-VN'));
    if (new Set(labels).size !== 3 || labels.includes(request.message?.trim().toLocaleLowerCase('vi-VN'))) add('SUGGESTIONS','$.suggestions');
    if (!draft.suggestions.some(s => /python|khóa|học|bài|lịch|tư vấn|ví dụ|đồ án|ngày|tuần/i.test(s.label))) warnings.push(issue('SUGGESTION_RELEVANCE','$.suggestions','warning'));
  }
  if (!isObject(draft.content)) return { errors, warnings };
  const c = draft.content;
  if (['faq','explanation','mixed','clarification'].includes(request.kind) && !hasText(c.text)) add('EMPTY','$.content.text');
  if (request.needsCode && (!hasText(c.code) || !/(?:\bfor\s+\w+\s+in\s+.+:|\bprint\s*\(|\bdef\s+\w+\s*\(|\bif\s+.+:)/.test(c.code))) add('CODE_REQUIRED','$.content.code');
  if (request.kind === 'study_plan') {
    if (!Number.isInteger(c.durationDays) || c.durationDays < 1 || c.durationDays > 30 || (request.durationDays && c.durationDays !== request.durationDays)) add('DURATION','$.content.durationDays');
    if (request.minutesPerDay != null && c.minutesPerDay !== request.minutesPerDay) add('DURATION','$.content.minutesPerDay');
    if (!Array.isArray(c.days) || c.days.length !== c.durationDays) add('DAYS','$.content.days');
    if (Array.isArray(c.days)) for (let i=0;i<c.days.length;i++) {
      const d=c.days[i], path=`$.content.days[${i}]`;
      if (!isObject(d) || d.day !== i+1) add('DAY_ORDER',`${path}.day`);
      if (!isObject(d) || !hasText(d.objective) || !Array.isArray(d.tasks) || !d.tasks.length || !d.tasks.every(t=>hasText(t)&&t.trim().length>=8) || !hasText(d.exercise) || d.exercise.trim().length<8 || /^(hãy\s+)?(thực hành|làm bài tập|ôn tập)\.?$/i.test(d.exercise.trim())) add('DAY_CONTENT',path);
      if (request.minutesPerDay != null && (!Array.isArray(d?.segments) || !d.segments.length || d.segments.some(s=>!hasText(s?.label)||!Number.isInteger(s?.minutes)||s.minutes<=0) || d.segments.reduce((sum,s)=>sum+(Number.isInteger(s?.minutes)?s.minutes:0),0)!==request.minutesPerDay)) add('TIME_BUDGET',`${path}.segments`);
    }
  }
  if (request.kind === 'project' && (!hasText(c.projectName) || !hasText(c.goal) || !Array.isArray(c.features) || !c.features.length || !c.features.every(hasText) || !Array.isArray(c.firstSteps) || !c.firstSteps.length || !c.firstSteps.every(hasText) || !hasText(c.difficulty))) add('EMPTY','$.content');
  if (request.kind === 'project' && request.level === 'beginner' && hasText(c.difficulty) && /trung bình|khó|nâng cao/i.test(c.difficulty)) add('PROJECT_LEVEL','$.content.difficulty');
  const available = new Map((facts.available||[]).map(f=>[f.id,f]));
  if (Array.isArray(draft.usedFactIds)) {
    for (const [i,id] of draft.usedFactIds.entries()) {
      const fact=available.get(id);
      if (!fact) add('FACT_UNKNOWN',`$.usedFactIds[${i}]`);
      else if (fact.courseId && request.contextCourseId && fact.courseId!==request.contextCourseId && !(request.courseIds||[]).includes(fact.courseId)) add('FACT_CONTEXT',`$.usedFactIds[${i}]`);
    }
    for (const id of request.requiredFactIds||[]) if (!draft.usedFactIds.includes(id)) add('FACT_REQUIRED','$.usedFactIds');
  }
  if ((facts.missing||[]).length) {
    if (draft.action !== 'offer_booking' || !Array.isArray(draft.missingInformation) || !facts.missing.every(m=>draft.missingInformation.includes(m))) add('MISSING_REQUIRED','$.missingInformation');
  }
  const freeText=[c.text,c.goal,c.projectName,c.difficulty,...(c.features||[]),...(c.firstSteps||[])].filter(hasText).join(' ');
  const placeholders=[...freeText.matchAll(/\{\{fact:([^}]+)\}\}/g)].map(m=>m[1]);
  // Sentence facts stand alone. Value facts (such as a price) may be embedded in prose.
  for (const match of freeText.matchAll(/\{\{fact:([^}]+)\}\}/g)) {
    if (available.get(match[1])?.format === 'value') continue;
    const before = freeText.slice(Math.max(0, match.index - 15), match.index);
    const after = freeText.slice(match.index + match[0].length, match.index + match[0].length + 1);
    if (/(?:là|bằng|khoảng)\s*$/i.test(before) || /[.!?]/.test(after)) add('PLACEHOLDER','$.content.text');
  }
  if (/\{\{|\}\}/.test(freeText.replace(/\{\{fact:[^}]+\}\}/g,''))) add('PLACEHOLDER','$.content');
  for (const id of placeholders) if (!available.has(id) || !draft.usedFactIds?.includes(id)) add('PLACEHOLDER','$.content');
  if ((request.requiredFactIds||[]).length && !request.kind?.includes('plan')) for (const id of request.requiredFactIds) if (!placeholders.includes(id)) add('PLACEHOLDER','$.content.text');
  const surrounding = freeText.replace(/\{\{fact:[^}]+\}\}/g,'');
  if (((request.requiredFactIds||[]).length && /\d/.test(surrounding))
    || /\b\d{1,3}(?:[.,]\d{3})+\s*(?:đ|vnd)|\b\d+\s*(?:đồng|vnd|buổi)\b/i.test(surrounding)
    || /(?:giáo viên|giảng viên|khai giảng|chứng chỉ|ưu đãi|cam kết|đảm bảo|còn chỗ)(?:\s+[^.!?]{0,45})?\s+(?:là|vào|tên|có)(?:\s|\.|$)/i.test(surrounding)) add('UNSUPPORTED_CLAIM','$.content');
  return { errors, warnings };
}
