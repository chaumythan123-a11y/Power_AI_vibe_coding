function replaceFacts(text, factMap) {
  return String(text || '').replace(/\{\{fact:([^}]+)\}\}/g, (_, id) => factMap.get(id)?.text || '');
}

export function renderDraft(draft, request, facts) {
  const factMap = new Map(facts.available.map(f => [f.id, f]));
  const c = draft.content;
  let message = '';
  if (draft.kind === 'study_plan') {
    const budget = c.minutesPerDay ? `, ${c.minutesPerDay} phút/ngày` : '';
    message = `Kế hoạch tự học ${c.durationDays} ngày${budget} (gợi ý học tập chung):\n` + c.days.map(d =>
      `Ngày ${d.day}: ${d.objective}\n${d.tasks.map(t => `• ${t}`).join('\n')}\nBài tập: ${d.exercise}` +
      (d.segments?.length ? `\nThời gian: ${d.segments.map(s => `${s.label} ${s.minutes} phút`).join(' · ')}` : '')).join('\n\n');
  } else if (draft.kind === 'project') {
    message = `Gợi ý đồ án học tập chung: ${c.projectName}\nMục tiêu: ${c.goal}\nTính năng: ${c.features.join('; ')}\nBắt đầu: ${c.firstSteps.join('; ')}\nĐộ khó: ${c.difficulty}`;
  } else {
    message = replaceFacts(c.text, factMap);
    if (c.code) message += `\n\n\`\`\`python\n${c.code.trim()}\n\`\`\``;
  }
  if (draft.missingInformation.length) message += `\nMình chưa có thông tin mẫu đã xác thực về ${draft.missingInformation.join(', ')}. Bạn có thể đặt lịch tư vấn để chuyên viên kiểm tra cụ thể.`;
  if (draft.usedFactIds.length) message += '\nĐây là dữ liệu mẫu.';
  return { message, action: draft.action, courseIds: [...new Set(draft.usedFactIds.map(id => factMap.get(id)?.courseId).filter(Boolean))],
    knownFacts: draft.usedFactIds.map(id => factMap.get(id)?.text).filter(Boolean), missingFacts: draft.missingInformation,
    needsConsultation: draft.action === 'offer_booking', suggestions: draft.suggestions.map(s => s.label), mode: 'gemini' };
}
