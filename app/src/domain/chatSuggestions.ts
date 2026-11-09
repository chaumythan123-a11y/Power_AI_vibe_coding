import { courses, faqs } from '../data/catalog';
import type { ChatReply, Course } from '../types';
import { normalize } from './courseMatcher';

type Action = ChatReply['action'];
type Suggestions = ChatReply['suggestions'];

const common = ['Có những khóa học nào?', 'Khi nào có thể tư vấn?', 'Đăng ký như thế nào?', ...faqs.map(faq => faq.question)];

export function validSuggestions(value: unknown, asked: string): value is Suggestions {
  if (!Array.isArray(value) || value.length !== 3) return false;
  if (!value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 180)) return false;
  const keys = value.map(normalize);
  return keys.every(key => key.length > 0 && key !== normalize(asked)) && new Set(keys).size === 3;
}

export function suggestedQuestions(asked: string, course: Course | undefined, action: Action, missingFacts: string[] = []): Suggestions {
  const query = normalize(asked);
  const project = /\b(do an|bai tap|lo trinh|kiem tra|danh gia|ket qua)\b/.test(query);
  const unknown = action === 'offer_booking' || missingFacts.length > 0;
  const learningFallback = unknown && /\b(thuat toan|sap xep|vong lap|for|while)\b/.test(query);
  const pool = action === 'clarify'
    ? ['Có những khóa học nào?', 'Python cơ bản', 'Excel cơ bản', 'Tiếng Anh giao tiếp', 'Toán 12']
    : learningFallback
      ? query.includes('sap xep')
        ? ['Cho ví dụ sắp xếp nổi bọt trong Python?', 'Sắp xếp nổi bọt khác cách sắp xếp khác thế nào?', 'Đặt lịch tư vấn như thế nào?']
        : ['Cho ví dụ vòng lặp for trong Python?', 'Vòng lặp for khác while thế nào?', 'Đặt lịch tư vấn như thế nào?']
    : project && !unknown
      ? [
          course ? `Đồ án ${course.title} mẫu gồm những bước nào?` : 'Các khóa học mẫu có đồ án gì?',
          course ? `Cần chuẩn bị gì để học ${course.title}?` : 'Người mới nên bắt đầu với khóa nào?',
          'Đặt lịch tư vấn như thế nào?',
        ]
      : unknown
        ? [
            'Đặt lịch tư vấn như thế nào?',
            course ? `Nội dung khóa ${course.title} gồm những gì?` : 'Có những khóa học nào?',
            'Khi nào có thể tư vấn?',
          ]
        : [
            course ? `Nội dung khóa ${course.title} gồm những gì?` : 'Có những khóa học nào?',
            course ? `Học phí ${course.title} bao nhiêu?` : 'Học phí bao nhiêu?',
            'Khi nào có thể tư vấn?',
          ];
  const selected: string[] = [];
  const seen = new Set([query]);
  for (const candidate of [...pool, ...common, ...courses.map(item => item.title)]) {
    const key = normalize(candidate);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push(candidate);
    if (selected.length === 3) break;
  }
  return selected as Suggestions;
}
