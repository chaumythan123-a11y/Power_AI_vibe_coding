import { MockChatAdapter } from './mockChatAdapter';
import { courses, faqs } from '../data/catalog';
import { findExplicitCourse, normalize } from '../domain/courseMatcher';
import { findFaq } from '../domain/faqMatcher';
import { suggestedQuestions, validSuggestions } from '../domain/chatSuggestions';
import type { ChatAdapter } from './chatAdapter';
import type { ChatReply, ChatMessage, Course } from '../types';

type ApiReply = Pick<ChatReply, 'message' | 'action' | 'courseIds' | 'suggestions' | 'mode'> & {
  knownFacts: string[];
  missingFacts: string[];
  notice?: string;
};

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 12 && value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 600);
}

function parseApiReply(value: unknown, asked: string): ApiReply | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const result = value as Record<string, unknown>;
  if (typeof result.message !== 'string' || !result.message.trim() || result.message.length > 6000) return undefined;
  if (!['answer', 'clarify', 'offer_booking'].includes(String(result.action))) return undefined;
  if (!['mock', 'gemini'].includes(String(result.mode))) return undefined;
  if (!isTextList(result.knownFacts) || !isTextList(result.missingFacts)) return undefined;
  if (!Array.isArray(result.courseIds) || result.courseIds.length > courses.length ||
      !result.courseIds.every(id => typeof id === 'string' && courses.some(course => course.id === id)) ||
      new Set(result.courseIds).size !== result.courseIds.length) return undefined;
  if (!validSuggestions(result.suggestions, asked)) return undefined;
  if (result.missingFacts.length > 0 && result.action !== 'offer_booking') return undefined;
  if (result.mode === 'gemini' && result.action !== 'answer') return undefined;
  if (result.notice !== undefined && (typeof result.notice !== 'string' || result.notice.length > 300)) return undefined;
  return result as ApiReply;
}

function safeFallback(input: string, course: Course | undefined, notice?: string): ChatReply {
  return { message: 'Mình chưa xác thực được câu trả lời cho nội dung này. Bạn có thể hỏi lại hoặc đặt lịch tư vấn để chuyên viên hỗ trợ.', faqIds: [], courseIds: course ? [course.id] : [], knownFacts: [], missingFacts: ['Phản hồi chưa được xác thực'], suggestions: suggestedQuestions(input, course, 'offer_booking'), action: 'offer_booking', mode: 'mock', notice };
}
async function usefulFallback(mock: MockChatAdapter, input: string, contextCourseId: string | undefined, notice: string): Promise<ChatReply> {
  if (/\b(do an|du an|project)\b/i.test(normalize(input))) return safeFallback(input, courses.find(item => item.id === contextCourseId), notice);
  const reply = await mock.reply(input, contextCourseId);
  return { ...reply, notice };
}

// Only route questions confidently covered by a prepared answer to the local adapter.
export function usesPreparedAnswer(input: string): boolean {
  const text = normalize(input);
  const asksRefundPolicy = /\b(hoan hoc phi|hoan tien|huy khoa|lay lai tien|doi y .* khai giang)\b/.test(text);
  if (/\b(chung chi|chung nhan|bang cap|uu dai|giam gia|hai nguoi|2 nguoi|con (may|bao nhieu|cho)|cho trong|giang vien|giao vien|ai day)\b/.test(text) || (text.includes('khai giang') && !asksRefundPolicy)) return false;
  const exact = faqs.some(f => [f.question, ...f.aliases].some(q => normalize(q) === text));
  if (exact) return true;
  const course = findExplicitCourse(input, courses);
  if (course && [normalize(course.title), `cho minh biet ve ${normalize(course.title)}`].includes(text)) return true;
  if (/\b(lo trinh|do an|kiem tra|bai tap|ket qua|so sanh|nen hoc|ke hoach|giai thich|vi du|lap trinh|danh gia)\b/.test(text)) return false;
  if (courses.filter(c => findExplicitCourse(input, [c])).length > 1) return false;
  if (text.split(' ').length > 22 || /\b(gia tri|cach tu hoc|tai sao|vi sao|va|dong thoi|ngoai ra)\b/.test(text)) return false;
  if (findFaq(input, faqs)) return true;
  const intents = [
    /\b(hoc phi|bao nhieu tien|gia khoa|gia hoc|khoa .* gia|gia (python|excel|toan|toeic|tieng anh))\b/,
    /\b(lich hoc|thoi luong|may buoi|hoc bao lau)\b/,
    /\b(kien thuc dau vao|yeu cau dau vao|co can .* truoc|phu hop .* nguoi moi)\b/,
    /\b(hoc thu)\b/,
    /\b(dang ky|dat lich)\b/,
    /\b(thanh toan|chuyen khoan)\b/,
    /\b(bao luu)\b/,
    /\b(hoan tien|hoan hoc phi|huy khoa)\b/,
    /\b(gio tu van|khung gio tu van|khi nao .* tu van|mo cua)\b/,
  ];
  return intents.filter(pattern => pattern.test(text)).length === 1;
}

export class HybridChatAdapter implements ChatAdapter {
  private mock = new MockChatAdapter();
  private aiEnabled = false;
  setAiEnabled(enabled: boolean): void { this.aiEnabled = enabled; }
  async reply(input: string, contextCourseId?: string, history: ChatMessage[] = []): Promise<ChatReply> {
    if (!this.aiEnabled && usesPreparedAnswer(input)) return this.mock.reply(input, contextCourseId);
    const course = findExplicitCourse(input, courses) || courses.find(c => c.id === contextCourseId);
    try {
      const recent = history.filter(item => item.id !== 'welcome' && !item.id.startsWith('sample-')).slice(-4).map(item => ({ role: item.role === 'bot' ? 'model' : 'user', text: item.text.slice(0,1000) }));
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: input, contextCourseId: course?.id, history: recent }), signal: AbortSignal.timeout(30000) });
      if (!response.ok) return usefulFallback(this.mock, input, course?.id || contextCourseId, response.status === 429 ? 'Gemini đang giới hạn lượt gọi. Đây là phản hồi dự phòng từ dữ liệu mẫu.' : 'API chat không phản hồi thành công. Đây là phản hồi dự phòng từ dữ liệu mẫu.');
      const result = parseApiReply(await response.json(), input);
      if (!result) return usefulFallback(this.mock, input, course?.id || contextCourseId, 'Phản hồi AI chưa đúng định dạng xác thực. Đây là phản hồi dự phòng từ dữ liệu mẫu.');
      return {
        message: result.message, faqIds: [], courseIds: result.courseIds,
        knownFacts: result.knownFacts, missingFacts: result.missingFacts,
        suggestions: result.suggestions, action: result.action, mode: result.mode, notice: result.notice,
      };
    } catch {
      return usefulFallback(this.mock, input, course?.id || contextCourseId, 'Gemini chưa phản hồi hoặc kết nối bị gián đoạn. Đây là phản hồi dự phòng từ dữ liệu mẫu.');
    }
  }
}
