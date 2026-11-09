import { groundedReply, safeFallback } from './grounding.mjs';
import { understandRequest } from './harness/understand.mjs';
import { selectFacts } from './harness/facts.mjs';
import { runHarness } from './harness/orchestrate.mjs';

export const MAX_BODY = 32 * 1024;
const result = (status, payload, headers = {}) => ({ status, payload, headers });

// Shared request logic. HTTP stream/parsing belongs to the Vite or Vercel adapter.
export function createChatHandler({ apiKey, model = 'gemini-2.5-flash', fetchImpl = fetch, knowledge, timeBudgetMs = 27000, audit = event => console.info('studyconnect_chat', JSON.stringify(event)) }) {
  const enabled = Boolean(apiKey?.trim());
  const safeModel = model === 'gemini-2.5-flash' ? model : 'gemini-2.5-flash';
  const clients = new Map();
  return async function handle({ path, method, headers = {}, body, client = 'local' }) {
    if (headers.origin) {
      let sameOrigin = false;
      try { sameOrigin = new URL(headers.origin).host === headers.host; } catch {}
      if (!sameOrigin) return result(403, { error: 'Nguồn yêu cầu không được phép.' });
    }
    if (path === '/api/chat/status' && method === 'GET') return result(200, { enabled, model: safeModel });
    if (path !== '/api/chat' || method !== 'POST') return result(405, { error: 'Phương thức không được hỗ trợ.' });
    if (!/^application\/json(?:;|$)/i.test(headers['content-type'] || '')) return result(415, { error: 'Yêu cầu phải là JSON.' });
    const now = Date.now();
    for (const [key, value] of clients) if (now - value.start >= 60000) clients.delete(key);
    const usage = clients.get(client) || { start: now, count: 0 };
    if (usage.count >= 20 || (!clients.has(client) && clients.size >= 100))
      return result(429, { error: 'Bạn gửi hơi nhanh. Hãy thử lại sau một phút.' }, { 'Retry-After': '60' });
    usage.count++; clients.set(client, usage);
    if (!body || typeof body.message !== 'string' || !body.message.trim() || body.message.length > 2000)
      return result(400, { error: 'Câu hỏi cần có từ 1 đến 2.000 ký tự.' });
    const history = body.history ?? [];
    if (!Array.isArray(history) || history.length > 4 || history.some(item => !item || !['user','model'].includes(item.role) || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 1000))
      return result(400, { error: 'Lịch sử hội thoại không hợp lệ.' });
    const course = knowledge?.courses?.find(item => item.id === body.contextCourseId);
    if (body.contextCourseId !== undefined && (typeof body.contextCourseId !== 'string' || !course))
      return result(400, { error: 'Khóa học trong ngữ cảnh không hợp lệ.' });
    const requestId = crypto.randomUUID();
    const request = understandRequest({message:body.message,history,contextCourseId:body.contextCourseId,knowledge});
    const facts = selectFacts(request,knowledge);
    const report = event => audit({requestId,branch:request.kind,model:safeModel,...event});
    const grounded = groundedReply(body.message, request.contextCourseId || body.contextCourseId, knowledge);
    if (request.ambiguousDuration) {
      report({event:'final',route:'clarification',result:'mock',upstreamCalls:0});
      return result(200,{message:'Bạn muốn lập kế hoạch tự học trong bao nhiêu ngày? Hãy cho mình số ngày cụ thể và thời gian học mỗi ngày nếu có.',action:'clarify',courseIds:request.courseIds,knownFacts:[],missingFacts:[],needsConsultation:false,
        suggestions:['Lập kế hoạch tự học Python 5 ngày','Lập kế hoạch tự học Python 14 ngày','Python cơ bản phù hợp với ai?'],mode:'mock'});
    }
    if (request.kind === 'clarification' && !grounded) {
      report({event:'final',route:'clarification',result:'mock',upstreamCalls:0});
      return result(200,{message:'Bạn muốn hỏi về khóa học nào hoặc muốn tìm hiểu nội dung gì cụ thể? Hãy nêu tên khóa và câu hỏi để mình trả lời đúng ngữ cảnh.',action:'clarify',courseIds:[],knownFacts:[],missingFacts:[],needsConsultation:false,
        suggestions:['Có những khóa học nào?','Python cơ bản học phí bao nhiêu?','Đặt lịch tư vấn như thế nào?'],mode:'mock'});
    }
    if (request.kind === 'booking' || request.kind === 'mixed' || request.requestedFields.includes('teacher') || facts.missing.length || request.kind === 'clarification') {
      report({event:'final',route:'guard',result:'mock',upstreamCalls:0});
      return result(200, grounded || safeFallback(body.message,body.contextCourseId,knowledge));
    }
    if (!enabled) {
      report({event:'final',route:'offline',result:grounded?'mock':'unavailable',upstreamCalls:0});
      return grounded ? result(200,grounded) : result(503,{error:'Gemini chưa được cấu hình. Bạn vẫn có thể dùng câu trả lời mẫu.'});
    }
    const outcome = await runHarness({apiKey,model:safeModel,fetchImpl,request,facts,history,deadline:Date.now()+timeBudgetMs,audit:report});
    if (outcome.reply) {
      report({event:'final',route:'harness',result:'gemini',upstreamCalls:outcome.attempts,repairCount:Math.max(0,outcome.attempts-1),validationCodes:outcome.validationCodes,warnings:outcome.warnings});
      return result(200,outcome.reply);
    }
    report({event:'final',route:'harness',result:'fallback',upstreamCalls:outcome.attempts,repairCount:Math.max(0,outcome.attempts-1),validationCodes:outcome.validationCodes,failure:outcome.failure});
    if (outcome.failure === 'auth') return result(502,{error:'Gemini chưa được xác thực. Hãy kiểm tra cấu hình server.'});
    if (outcome.failure === 'quota') return result(429,{error:'Gemini đang giới hạn lượt sử dụng. Vui lòng thử lại sau.'});
    if (request.kind === 'faq' && grounded) return result(200,{...grounded,mode:'mock',notice:'Gemini chưa trả lời hợp lệ; đây là dữ liệu mẫu dự phòng.'});
    if (request.kind === 'study_plan') return result(200,{...safeFallback(body.message,body.contextCourseId,knowledge,'Mình chưa tạo đủ kế hoạch theo số ngày và thời lượng bạn yêu cầu.'),notice:'Kế hoạch chưa hoàn chỉnh. Bạn có thể thử lại câu hỏi.'});
    return result(502,{error:outcome.failure==='validation'?'Phản hồi Gemini chưa đạt kiểm tra; vui lòng thử lại.':'Gemini phản hồi quá lâu hoặc mất kết nối. Vui lòng thử lại.'});
  };
}
