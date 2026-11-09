import type { Booking, BookingInput, ChatMessage, Course } from './types';
export interface ChatPanelProps { messages:ChatMessage[]; courses:Course[]; pending:boolean; aiEnabled?:boolean; pendingSource?:'mock'|'gemini'; onSend:(text:string)=>void; onNewChat:()=>void; onCourseDetails:(course:Course)=>void; onBooking:(course?:Course,need?:string)=>void }
export interface BookingFormProps { course?:Course; initialNote?:string; onClose:()=>void; onSubmit:(input:BookingInput)=>Promise<{ok:boolean;error?:string;fieldErrors?:Partial<Record<keyof BookingInput,string>>}>; onSuccess?:(booking:Booking)=>void }
export interface AdminPanelProps { bookings:Booking[]; courses:Course[]; error?:string; onRetry:()=>void; onReset:()=>void; onProcess:(id:string)=>void; onDelete:(id:string)=>void }
