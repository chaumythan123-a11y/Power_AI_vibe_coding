import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Flag, Layers3 } from 'lucide-react';
import type { Course } from '../types';
import { courseDetails } from '../data/courseDetails';
import { formatVnd, modeLabel, teachers } from '../data/catalog';

export default function CourseDetailPage({ course, onBack, onAsk, onBooking }: {
  course: Course; onBack: () => void; onAsk: (course: Course) => void; onBooking: (course: Course) => void;
}) {
  const content = courseDetails[course.id];
  const assignedTeachers = teachers.filter(teacher => teacher.courseIds.includes(course.id));
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [course.id]);
  let session = 1;
  return <section className="content-page course-detail-page" aria-label={`Nội dung ${course.title}`}>
    <button className="course-back" onClick={onBack}><ArrowLeft size={16}/> Tất cả khóa học</button>
    <header className="course-hero">
      <div><span className="sample-tag">Chương trình mẫu</span><h1 ref={heading} tabIndex={-1}>{course.title}</h1><p>{content.overview}</p>
        <div className="course-facts"><span><BookOpen size={15}/>{course.sessions} buổi · {modeLabel(course.mode)}</span><span><CalendarDays size={15}/>{course.schedule}</span></div>
      </div><img src={`/assets/${course.id}-imagegen.png`} alt=""/>
    </header>
    <div className="course-enroll"><div><small>Học phí mẫu · Toàn khóa</small><strong>{formatVnd(course.priceVnd)}</strong></div><div className="course-actions"><button className="outline-button" onClick={()=>onAsk(course)}>Hỏi trợ lý về khóa học</button><button className="primary-button" onClick={()=>onBooking(course)}>Đặt lịch tư vấn <ArrowUpRight size={15}/></button></div></div>
    <div className="course-audience"><strong>Dành cho {course.audience.toLowerCase()}</strong><p>{content.prerequisites}</p></div>
    <section className="course-section" aria-label="Giáo viên minh họa"><div className="course-section-heading"><span><BookOpen size={20}/></span><div><h2>Giáo viên phụ trách</h2><p>Hồ sơ minh họa · Dữ liệu mẫu, không xác nhận nhân sự thực tế.</p></div></div>{assignedTeachers.map(teacher=><div className="course-audience" key={teacher.id}><strong>{teacher.name}</strong><p>{teacher.specialty}</p><p>{teacher.introduction}</p></div>)}</section>
    <nav className="course-section-nav" aria-label="Nội dung khóa học"><a href="#ket-qua">Kết quả</a><a href="#lo-trinh">Lộ trình</a><a href="#do-an">Đồ án / thực hành</a><a href="#danh-gia">Đánh giá</a></nav>
    <section id="ket-qua" className="course-section"><div className="course-section-heading"><span><Flag size={20}/></span><div><h2>Bạn sẽ làm được gì?</h2><p>Kết quả dự kiến sau khi hoàn thành các hoạt động học tập.</p></div></div><ul className="course-outcomes">{content.outcomes.map(outcome=><li key={outcome}><CheckCircle2 size={18}/><span>{outcome}</span></li>)}</ul></section>
    <section id="lo-trinh" className="course-section"><div className="course-section-heading"><span><Layers3 size={20}/></span><div><h2>Lộ trình học tập</h2><p>{content.modules.length} giai đoạn · {course.sessions} buổi, từ nền tảng đến thực hành.</p></div></div><div className="course-modules">{content.modules.map((module,index)=>{const start=session;session+=module.sessions;return <details key={module.title} open={index===0}><summary><span className="module-number">{String(index+1).padStart(2,'0')}</span><span><small>Buổi {start}–{session-1}</small><strong>{module.title}</strong></span><span className="module-toggle" aria-hidden="true">+</span></summary><ul>{module.topics.map(topic=><li key={topic}>{topic}</li>)}</ul></details>})}</div></section>
    <section id="do-an" className="course-section course-project"><span className="sample-tag">Sản phẩm cuối khóa</span><h2>{content.project.title}</h2><p>{content.project.description}</p><h3>Sản phẩm bạn hoàn thành</h3><ul>{content.project.deliverables.map(item=><li key={item}>{item}</li>)}</ul></section>
    <section id="danh-gia" className="course-section"><div className="course-section-heading"><span><ClipboardCheck size={20}/></span><div><h2>Kiểm tra & đánh giá</h2><p>Theo dõi tiến bộ trong từng giai đoạn.</p></div></div><div className="course-assessments">{content.assessments.map((assessment,index)=><article key={assessment.title}><span>0{index+1}</span><h3>{assessment.title}</h3><p>{assessment.description}</p></article>)}</div></section>
    <footer className="course-footer"><h2>Sẵn sàng tìm hiểu thêm?</h2><p>Trao đổi về mục tiêu và trình độ hiện tại để chọn lộ trình phù hợp.</p><button className="primary-button" onClick={()=>onBooking(course)}>Đặt lịch tư vấn về {course.title}</button><p className="source-note">Nội dung, lộ trình và học phí là dữ liệu minh họa; không cam kết điểm số, chứng chỉ hay kết quả thực tế.</p></footer>
  </section>;
}
