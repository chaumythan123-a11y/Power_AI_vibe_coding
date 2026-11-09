import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, CalendarDays, Clock3, GraduationCap, RotateCcw, Send, UserRound } from 'lucide-react';
import type { ChatPanelProps } from '../../contracts';
import type { ChatMessage, Course } from '../../types';
import './ChatPanel.css';

const priceFormatter = new Intl.NumberFormat('vi-VN');

// Render only text nodes and code elements; model output is never treated as HTML.
function MessageText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const codeFence = /```(?:[a-zA-Z0-9_-]+)?\s*\n?([\s\S]*?)```/g;
  let from = 0;
  const plain = (part: string, key: string) => {
    if (!part) return;
    const pieces = part.split(/(`[^`\n]+`)/g);
    blocks.push(<p className="chat-message-text" key={key}>{pieces.map((piece, index) =>
      piece.startsWith('`') && piece.endsWith('`')
        ? <code key={index}>{piece.slice(1, -1)}</code>
        : piece,
    )}</p>);
  };
  for (const match of text.matchAll(codeFence)) {
    plain(text.slice(from, match.index), `text-${from}`);
    blocks.push(<pre className="chat-code-block" key={`code-${match.index}`}><code>{match[1].trim()}</code></pre>);
    from = match.index + match[0].length;
  }
  plain(text.slice(from), `text-${from}`);
  return <>{blocks}</>;
}

function courseImage(course: Course): string {
  return `/assets/${course.id}-imagegen.png`;
}

function CourseCard({ course, onCourseDetails, onBooking }: Pick<ChatPanelProps, 'onCourseDetails' | 'onBooking'> & { course: Course }) {
  return <article className="chat-course-card">
    <img className="chat-course-art" src={courseImage(course)} alt="" />
    <div className="chat-course-info">
      <div className="chat-course-title-row"><h3>{course.title}</h3><span className="chat-sample-tag">Khóa mẫu</span></div>
      <p>{course.audience}</p>
      <div className="chat-course-meta">
        <span><Clock3 aria-hidden="true" />{course.sessions} buổi</span>
        <span><BookOpen aria-hidden="true" />{course.mode === 'online' ? 'Trực tuyến' : 'Tại trung tâm'}</span>
        <span><CalendarDays aria-hidden="true" />{course.schedule}</span>
      </div>
      <div className="chat-course-bottom">
        <strong>{priceFormatter.format(course.priceVnd)}đ</strong>
        <div className="chat-course-actions">
          <button type="button" className="chat-outline-button" onClick={() => onCourseDetails(course)}>Chi tiết</button>
          <button type="button" className="chat-primary-button" onClick={() => onBooking(course)}>Đặt lịch tư vấn</button>
        </div>
      </div>
    </div>
  </article>;
}

function Message({ message, isFirst, latestBotId, courses, onSend, onCourseDetails, onBooking }: {
  message: ChatMessage; isFirst: boolean; latestBotId?: string;
} & Pick<ChatPanelProps, 'courses' | 'onSend' | 'onCourseDetails' | 'onBooking'>) {
  const course = courses.find(item => item.id === message.courseId);
  const bookingCourse = courses.find(item => item.id === message.bookingCourseId) || course;
  const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(message.createdAt));
  const isBot = message.role === 'bot';
  const suggestions = isBot && message.id === latestBotId ? message.reply?.suggestions : undefined;
  return <div className={`chat-turn ${isBot ? 'chat-turn-bot' : 'chat-turn-user'}`}>
    {isBot && <img className="chat-turn-avatar" src="/assets/bot-avatar-imagegen-v2.png" alt="" />}
    <div className="chat-turn-main">
      <div className="chat-message-bubble">
        {isFirst && isBot && <h2>Bạn đang cần hỗ trợ điều gì?</h2>}
        <MessageText text={message.text} />
        {isBot && message.reply?.notice && <p className="chat-reply-notice">{message.reply.notice}</p>}
        {course && <CourseCard course={course} onCourseDetails={onCourseDetails} onBooking={onBooking} />}
        {message.bookingPrompt && <div className="chat-booking-card">
          <div className="chat-booking-art"><CalendarDays aria-hidden="true" /></div>
          <div className="chat-booking-info"><strong>Đặt lịch tư vấn qua điện thoại</strong><span>{bookingCourse ? `Tư vấn về ${bookingCourse.title}` : 'Chọn ngày và giờ phù hợp'}</span><small>Yêu cầu demo chỉ lưu trên trình duyệt này, chưa gửi tới nhân viên.</small></div>
          <button type="button" className="chat-booking-link" onClick={() => onBooking(bookingCourse, message.reply?.missingFacts?.length ? `Cần tư vấn về ${message.reply.missingFacts.join(', ')}.` : '')}>Chọn lịch<ArrowRight aria-hidden="true" /></button>
        </div>}
      </div>
      <div className="chat-turn-meta"><time className="chat-turn-time" dateTime={message.createdAt}>{time}</time>{isBot && <span className={`chat-reply-source ${message.reply?.mode === 'gemini' ? 'chat-reply-source-ai' : ''}`}>{message.reply?.mode === 'gemini' ? 'Gemini 2.5 Flash · Tham khảo dữ liệu mẫu' : message.reply?.notice ? 'Phản hồi dự phòng · Dữ liệu mẫu' : 'Dữ liệu mẫu'}</span>}</div>
      {suggestions && <div className="chat-suggestions" aria-label="Câu hỏi gợi ý">{suggestions.map((suggestion, index) =>
        <button key={`${suggestion}-${index}`} type="button" onClick={() => onSend(suggestion)}><span className="chat-suggestion-icon">{index === 0 ? <GraduationCap /> : index === 1 ? <BookOpen /> : <CalendarDays />}</span><span>{suggestion}</span></button>
      )}</div>}
    </div>
    {!isBot && <span className="chat-user-avatar" aria-hidden="true"><UserRound /></span>}
  </div>;
}

export default function ChatPanel({ messages, courses, pending, aiEnabled = false, pendingSource = 'mock', onSend, onNewChat, onCourseDetails, onBooking }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [showNew, setShowNew] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const wasNearBottom = useRef(true);
  const previousCount = useRef(messages.length);
  const latestBotId = [...messages].reverse().find(message => message.role === 'bot')?.id;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const newMessageWasSent = messages.length > previousCount.current && messages.at(-1)?.role === 'user';
    if (messages.length > previousCount.current && (wasNearBottom.current || newMessageWasSent)) {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
      setShowNew(false);
    } else if (messages.length > previousCount.current) {
      setShowNew(true);
    }
    previousCount.current = messages.length;
  }, [messages]);

  function submit() {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft('');
    wasNearBottom.current = true;
    onSend(text);
  }

  function onScroll() {
    const list = listRef.current;
    if (!list) return;
    wasNearBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 100;
    if (wasNearBottom.current) setShowNew(false);
  }

  return <section className="chat-panel" aria-label="Hội thoại hỗ trợ">
    <header className="chat-panel-header">
      <img className="chat-header-avatar" src="/assets/bot-avatar-imagegen-v2.png" alt="" />
      <div className="chat-header-title"><h1>Trợ lý StudyConnect</h1><p><span className={`chat-status-dot ${aiEnabled ? '' : 'chat-status-offline'}`} />{aiEnabled ? 'Gemini đã cấu hình · Dữ liệu mẫu' : 'Trả lời mẫu · AI chưa cấu hình'}</p></div>
      <button className="chat-new-session" type="button" onClick={onNewChat} disabled={pending} title="Cuộc trò chuyện mới"><RotateCcw size={16}/><span>Chat mới</span></button>
      <div className="chat-header-help"><Clock3 aria-hidden="true" />Tư vấn theo giờ Việt Nam</div>
    </header>
    <div className="chat-history-wrap">
      <div className="chat-history" ref={listRef} onScroll={onScroll}>
        {messages.length === 0 && <div className="chat-empty"><img src="/assets/bot-avatar-imagegen-v2.png" alt="" /><h2>Bạn đang cần hỗ trợ điều gì?</h2><p>Hỏi về khóa học mẫu, học phí hoặc đặt lịch tư vấn.</p></div>}
        {messages.map((message, index) => <Message key={message.id} message={message} isFirst={index === 0} latestBotId={latestBotId} courses={courses} onSend={onSend} onCourseDetails={onCourseDetails} onBooking={onBooking} />)}
        {pending && <div className="chat-pending" role="status" aria-live="polite"><img src="/assets/bot-avatar-imagegen-v2.png" alt=""/><div className="chat-pending-bubble"><span className="chat-loading-dots" aria-hidden="true"><i/><i/><i/></span><span>{pendingSource === 'gemini' ? 'Gemini đang suy nghĩ…' : 'Đang chuẩn bị câu trả lời…'}</span></div></div>}
      </div>
      {showNew && <button className="chat-new-button" type="button" onClick={() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); setShowNew(false); }}>Tin nhắn mới<ArrowDown aria-hidden="true" /></button>}
    </div>
    <form className="chat-composer" onSubmit={event => { event.preventDefault(); submit(); }}>
      <label className="sr-only" htmlFor="chat-message-input">Nhập câu hỏi</label>
      <textarea id="chat-message-input" maxLength={2000} rows={1} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} placeholder="Nhập câu hỏi của bạn…" disabled={pending} />
      <button type="submit" aria-label="Gửi câu hỏi" disabled={!draft.trim() || pending}><Send aria-hidden="true" /></button>
    </form>
    <p className="chat-composer-note">{aiEnabled ? 'Câu hỏi và tối đa 4 lượt gần nhất được gửi tới Google Gemini; dữ kiện khóa lấy từ dữ liệu mẫu. Lịch lưu tại trình duyệt.' : 'Đang dùng câu trả lời mẫu; lịch lưu trên trình duyệt này.'}</p>
  </section>;
}
