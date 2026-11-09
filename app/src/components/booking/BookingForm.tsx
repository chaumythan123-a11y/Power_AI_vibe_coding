import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, CheckCircle2, Clock3, X } from 'lucide-react';
import settings from '../../data/settings.json';
import type { BookingFormProps } from '../../contracts';
import type { BookingInput } from '../../types';
import './BookingForm.css';

function vietnamToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

function addDays(date: string, amount: number) {
  const atUtc = new Date(`${date}T00:00:00Z`);
  atUtc.setUTCDate(atUtc.getUTCDate() + amount);
  return atUtc.toISOString().slice(0, 10);
}

export function BookingForm({ course, initialNote = '', onClose, onSubmit }: BookingFormProps) {
  const [values, setValues] = useState<BookingInput>({ name: '', phone: '', date: '', time: '', note: initialNote, courseId: course?.id });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingInput, string>>>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const savingRef = useRef(saving);
  closeRef.current = onClose;
  savingRef.current = saving;
  const today = useMemo(vietnamToday, []);
  const maxDate = useMemo(() => addDays(today.date, settings.bookingHorizonDays), [today.date]);
  const availableSlots = useMemo(() => settings.slots.filter(slot => values.date !== today.date || slot > today.time), [today, values.date]);

  useEffect(() => {
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    nameRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previousFocus.current?.focus(); };
  }, []);

  const update = (field: keyof BookingInput, value: string) => {
    setValues(current => ({ ...current, [field]: value, ...(field === 'date' ? { time: '' } : {}) }));
    setErrors(current => ({ ...current, [field]: '' }));
    setSaveError('');
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const nextErrors: typeof errors = {};
    const name = values.name.trim();
    const compactPhone = values.phone.replace(/[\s-]/g, '').replace(/^\+84/, '0');
    if (name.length < 2 || name.length > 80) nextErrors.name = 'Nhập tên từ 2 đến 80 ký tự.';
    if (!/^0[0-9]{9}$/.test(compactPhone)) nextErrors.phone = 'Số điện thoại cần 10 chữ số, bắt đầu bằng 0.';
    if (!values.date) nextErrors.date = 'Chọn ngày tư vấn.';
    else if (values.date < today.date || values.date > maxDate) nextErrors.date = 'Chọn ngày trong 60 ngày tới theo giờ Việt Nam.';
    if (!values.time) nextErrors.time = 'Chọn khung giờ tư vấn.';
    else if (!settings.slots.includes(values.time) || (values.date === today.date && values.time <= today.time)) nextErrors.time = 'Khung giờ này đã qua hoặc không hợp lệ.';
    if (values.note.length > 300) nextErrors.note = 'Ghi chú tối đa 300 ký tự.';
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSaving(true);
    setSaveError('');
    try {
      const result = await onSubmit({ ...values, name, phone: compactPhone, note: values.note.trim() });
      if (result.ok) setSaved(true);
      else { if (result.fieldErrors) setErrors(result.fieldErrors); setSaveError(result.error || 'Không lưu được lịch. Vui lòng thử lại.'); }
    } catch {
      setSaveError('Không lưu được lịch. Vui lòng thử lại.');
    } finally { setSaving(false); }
  }

  return <div className="booking-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <div className="booking-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <div className="booking-dialog__top">
        <span className="booking-dialog__icon"><CalendarDays size={25} strokeWidth={2.3} /></span>
        <button type="button" className="booking-icon-button" aria-label="Đóng form đặt lịch" onClick={onClose} disabled={saving}><X size={22} /></button>
      </div>
      {saved ? <div className="booking-success" role="status">
        <CheckCircle2 size={40} />
        <h2 id="booking-title">Đã lưu yêu cầu tư vấn</h2>
        <p>Yêu cầu mẫu chỉ được lưu trên trình duyệt này, chưa gửi tới nhân viên và chưa xác nhận cuộc hẹn. Hình thức tư vấn dự kiến là nhân viên gọi điện theo khung giờ bạn chọn.</p>
        <button type="button" className="booking-primary" onClick={onClose}>Hoàn tất</button>
      </div> : <>
        <h2 id="booking-title">Đặt lịch tư vấn 1:1</h2>
        <p className="booking-dialog__intro">{course ? `Trao đổi về khóa ${course.title}.` : 'Chọn thời gian để trao đổi về khóa học phù hợp.'} Nhân viên sẽ gọi điện tư vấn theo lịch nếu yêu cầu được tiếp nhận. Bản demo chỉ lưu yêu cầu trên trình duyệt này, chưa gửi tới nhân viên.</p>
        <form onSubmit={submit} noValidate>
          <div className="booking-fields">
            <label>Họ và tên <span aria-hidden="true">*</span><input ref={nameRef} value={values.name} onChange={event => update('name', event.target.value)} autoComplete="name" maxLength={80} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'booking-name-error' : undefined} placeholder="Nguyễn Minh Anh" /></label>
            {errors.name && <small id="booking-name-error" className="booking-error">{errors.name}</small>}
            <label>Số điện thoại <span aria-hidden="true">*</span><input type="tel" inputMode="tel" value={values.phone} onChange={event => update('phone', event.target.value)} autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'booking-phone-error' : undefined} placeholder="09xx xxx xxx" /></label>
            {errors.phone && <small id="booking-phone-error" className="booking-error">{errors.phone}</small>}
            <div className="booking-fields__row">
              <div><label htmlFor="booking-date">Ngày tư vấn <span aria-hidden="true">*</span></label><input id="booking-date" type="date" min={today.date} max={maxDate} value={values.date} onChange={event => update('date', event.target.value)} aria-invalid={!!errors.date} aria-describedby={errors.date ? 'booking-date-error' : undefined} />{errors.date && <small id="booking-date-error" className="booking-error">{errors.date}</small>}</div>
              <div><label htmlFor="booking-time">Giờ tư vấn <span aria-hidden="true">*</span></label><select id="booking-time" value={values.time} onChange={event => update('time', event.target.value)} aria-invalid={!!errors.time} aria-describedby={errors.time ? 'booking-time-error' : undefined}><option value="">Chọn giờ</option>{availableSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}</select>{errors.time && <small id="booking-time-error" className="booking-error">{errors.time}</small>}</div>
            </div>
            <label>Ghi chú nhu cầu <span className="booking-optional">(tùy chọn)</span><textarea value={values.note} onChange={event => update('note', event.target.value)} maxLength={301} rows={3} placeholder="Bạn muốn trao đổi điều gì?" aria-invalid={!!errors.note} aria-describedby={errors.note ? 'booking-note-error' : undefined} /></label>
            {errors.note && <small id="booking-note-error" className="booking-error">{errors.note}</small>}
          </div>
          <p className="booking-dialog__timezone"><Clock3 size={16} /> Các khung giờ hiển thị theo giờ Việt Nam (GMT+7).</p>
          {saveError && <p className="booking-save-error" role="alert">{saveError}</p>}
          <div className="booking-actions"><button type="button" className="booking-secondary" onClick={onClose} disabled={saving}>Hủy</button><button type="submit" className="booking-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu yêu cầu tư vấn'}</button></div>
        </form>
      </>}
    </div>
  </div>;
}
