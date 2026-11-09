import { useState } from 'react';
import { CalendarDays, Check, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import type { AdminPanelProps } from '../../contracts';
import './AdminPanel.css';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : dateFormatter.format(parsed);
}

export function AdminPanel({ bookings, courses, error, onRetry, onReset, onProcess, onDelete }: AdminPanelProps) {
  const [confirm, setConfirm] = useState<{kind:'delete'|'reset';id?:string}|null>(null);
  const sorted = [...bookings].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const courseName = (id?: string) => courses.find(course => course.id === id)?.title ?? 'Chưa chọn khóa';
  const confirmDelete = (id: string) => setConfirm({kind:'delete',id});
  const confirmReset = () => setConfirm({kind:'reset'});
  const finishConfirm = () => {if(confirm?.kind==='delete'&&confirm.id)onDelete(confirm.id);if(confirm?.kind==='reset')onReset();setConfirm(null)};

  return <section className="admin-panel" aria-labelledby="admin-heading">
    <div className="admin-panel__header"><div><p className="admin-panel__eyebrow">DỮ LIỆU MẪU · CHỈ TRÊN TRÌNH DUYỆT NÀY</p><h1 id="admin-heading">Quản trị lịch tư vấn</h1><p>Mô phỏng nhân viên xem tên, số điện thoại, khóa, nhu cầu và khung giờ để gọi điện tư vấn; sau đó đánh dấu đã xử lý hoặc xóa. Bản demo chưa gửi yêu cầu tới nhân viên và không có đăng nhập quản trị.</p></div><div className="admin-panel__counter"><CalendarDays size={22}/><strong>{bookings.length}</strong><span>lịch tư vấn</span></div></div>
    {error && <div className="admin-panel__alert" role="alert"><TriangleAlert size={20}/><div><strong>Không đọc được dữ liệu lịch.</strong><p>{error} Dữ liệu chưa được ghi đè.</p><div className="admin-panel__alert-actions"><button type="button" onClick={onRetry}><RotateCcw size={16}/> Thử đọc lại</button><button type="button" onClick={confirmReset}><Trash2 size={16}/> Xóa dữ liệu lỗi</button></div></div></div>}
    {!error && sorted.length === 0 && <div className="admin-panel__empty"><span><CalendarDays size={32}/></span><h2>Chưa có lịch tư vấn</h2><p>Khi khách gửi form, lịch mẫu sẽ xuất hiện tại đây trên cùng trình duyệt.</p></div>}
    {!error && sorted.length > 0 && <div className="admin-panel__list" role="list">{sorted.map(booking => <article className="admin-booking" role="listitem" key={booking.id}>
      <div className="admin-booking__date"><strong>{formatDate(booking.date)}</strong><span>{booking.time} · Giờ Việt Nam</span></div>
      <div className="admin-booking__details"><div className="admin-booking__identity"><h2>{booking.name}</h2><span className={booking.status === 'processed' ? 'admin-booking__status admin-booking__status--processed' : 'admin-booking__status'}>{booking.status === 'processed' ? 'Đã xử lý' : 'Chờ xử lý'}</span></div><p>Gọi điện: {booking.phone} <span aria-hidden="true">·</span> {courseName(booking.courseId)}</p>{booking.note && <p className="admin-booking__note">Nhu cầu: {booking.note}</p>}</div>
      <div className="admin-booking__actions">{booking.status === 'active' ? <button type="button" className="admin-booking__process" onClick={() => onProcess(booking.id)}><Check size={17}/> Đánh dấu đã xử lý</button> : <button type="button" className="admin-booking__delete" onClick={() => confirmDelete(booking.id)}><Trash2 size={17}/> Xóa lịch</button>}</div>
    </article>)}</div>}
    <p className="admin-panel__footnote">Việc xóa chỉ xóa bản ghi demo trong trình duyệt này; không hủy cuộc hẹn thực tế.</p>
    {confirm && <div className="admin-confirm-backdrop"><div className="admin-confirm" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title"><h2 id="admin-confirm-title">{confirm.kind==='reset'?'Đặt lại dữ liệu lịch?':'Xóa lịch đã xử lý?'}</h2><p>Thao tác này xóa dữ liệu mẫu khỏi trình duyệt hiện tại và không thể hoàn tác.</p><div><button type="button" onClick={()=>setConfirm(null)}>Hủy</button><button type="button" onClick={finishConfirm}>Xác nhận xóa</button></div></div></div>}
  </section>;
}
