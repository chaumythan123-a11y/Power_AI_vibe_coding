import type { Booking,BookingInput,BookingSnapshot } from '../types';
import { settings } from '../data/catalog';
import { cleanPhone,validateBooking } from '../domain/bookingValidation';
const KEY='studyconnect.bookings.v1';
function read():BookingSnapshot { try { const raw=localStorage.getItem(KEY);if(!raw)return {bookings:[]};const parsed:unknown=JSON.parse(raw);if(!Array.isArray(parsed)||!parsed.every((b:any)=>b&&b.schemaVersion===1&&typeof b.id==='string'&&typeof b.name==='string'&&typeof b.phone==='string'&&typeof b.date==='string'&&typeof b.time==='string'&&typeof b.timeZone==='string'&&typeof b.note==='string'&&typeof b.createdAt==='string'&&(b.courseId===undefined||typeof b.courseId==='string')&&['active','processed'].includes(b.status)))return {bookings:[],error:'Dữ liệu lịch không đúng định dạng. Hãy thử đọc lại hoặc chủ động đặt lại dữ liệu.'};return {bookings:parsed as Booking[]}; }catch {return {bookings:[],error:'Không đọc được dữ liệu lịch trên trình duyệt. Không có thay đổi nào được lưu.'};} }
function write(bookings:Booking[]):string|undefined {try{localStorage.setItem(KEY,JSON.stringify(bookings));return undefined}catch{return 'Không lưu được lịch trên trình duyệt. Vui lòng kiểm tra dung lượng hoặc quyền lưu trữ.'}}
export const bookingStorage={
 read,
 add(input:BookingInput):{booking?:Booking;error?:string;fieldErrors?:ReturnType<typeof validateBooking>} {const current=read();if(current.error)return {error:current.error};const fieldErrors=validateBooking(input,current.bookings);if(Object.keys(fieldErrors).length)return {error:'Vui lòng kiểm tra lại thông tin.',fieldErrors};const booking:Booking={id:crypto.randomUUID(),schemaVersion:1,name:input.name.trim(),phone:cleanPhone(input.phone),date:input.date,time:input.time,timeZone:settings.timeZone,note:input.note.trim(),courseId:input.courseId,status:'active',createdAt:new Date().toISOString()};const error=write([...current.bookings,booking]);return error?{error}:{booking};},
 process(id:string):string|undefined {const current=read();if(current.error)return current.error;return write(current.bookings.map(b=>b.id===id?{...b,status:'processed'}:b));},
 delete(id:string):string|undefined {const current=read();if(current.error)return current.error;return write(current.bookings.filter(b=>b.id!==id));},
 reset():string|undefined {try{localStorage.removeItem(KEY);return undefined}catch{return 'Không thể đặt lại dữ liệu trên trình duyệt này.'}}
};
