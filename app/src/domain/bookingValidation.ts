import { settings } from '../data/catalog';
import type { BookingInput } from '../types';
export type BookingErrors=Partial<Record<keyof BookingInput,string>>;
export const cleanPhone=(phone:string)=>{let p=phone.replace(/[\s-]/g,'');if(p.startsWith('+84'))p='0'+p.slice(3);return p};
export function vietnamNow(now=new Date()) { const parts=new Intl.DateTimeFormat('en-CA',{timeZone:settings.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);const get=(type:string)=>parts.find(p=>p.type===type)?.value||'';return {date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`}; }
function isCalendarDate(value:string):boolean {
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 if(!match)return false;
 const year=Number(match[1]);const month=Number(match[2]);const day=Number(match[3]);
 if(year<1||year>9999||month<1||month>12||day<1||day>31)return false;
 const parsed=new Date(Date.UTC(year,month-1,day));
 // Date.UTC also normalizes out-of-range days and years 00–99.
 parsed.setUTCFullYear(year);
 return parsed.getUTCFullYear()===year&&parsed.getUTCMonth()===month-1&&parsed.getUTCDate()===day;
}
export function validateBooking(input:BookingInput,existing:{date:string;time:string;status:string}[],now=new Date()):BookingErrors {
 const errors:BookingErrors={};const name=input.name.trim();const phone=cleanPhone(input.phone);
 if(name.length<2||name.length>80)errors.name='Tên cần từ 2 đến 80 ký tự.';
 if(!/^0[0-9]{9}$/.test(phone))errors.phone='Số điện thoại cần 10 chữ số, bắt đầu bằng 0.';
 if(input.note.length>300)errors.note='Ghi chú tối đa 300 ký tự.';
 const today=vietnamNow(now);const validDate=isCalendarDate(input.date);
 const max=new Date(today.date+'T00:00:00Z');max.setUTCDate(max.getUTCDate()+settings.bookingHorizonDays);const maxDate=max.toISOString().slice(0,10);
 if(!validDate||input.date<today.date||input.date>maxDate)errors.date='Chọn ngày từ hôm nay đến 60 ngày tới.';
 if(!settings.slots.includes(input.time))errors.time='Chọn một khung giờ tư vấn.';
 if(!errors.date&&!errors.time&&input.date===today.date&&input.time<=today.time)errors.time='Chọn khung giờ còn ở tương lai.';
 if(!errors.date&&!errors.time&&existing.some(b=>b.status==='active'&&b.date===input.date&&b.time===input.time))errors.time='Khung giờ này đã được đặt trên trình duyệt này.';
 return errors;
}
