import { courses,faqs,formatVnd,modeLabel } from '../data/catalog';
import { findExplicitCourse,hasUnsupportedSpecificCourse,normalize } from '../domain/courseMatcher';
import { findFaq } from '../domain/faqMatcher';
import type { ChatReply,Course,Faq } from '../types';
import type { ChatAdapter } from './chatAdapter';
const generic:[string,string,string]=['Có những khóa học nào?','Học phí bao nhiêu?','Khi nào có thể tư vấn?'];
function suggestions(faq:Faq|undefined,asked:string):[string,string,string] {
 const pool=[...(faq?.relatedIds||[]).map(id=>faqs.find(f=>f.id===id)?.question).filter((s):s is string=>!!s),...faqs.map(f=>f.question)];
 const selected=[...new Set(pool)].filter(q=>normalize(q)!==normalize(asked)).slice(0,3);
 return (selected.length===3?selected:generic) as [string,string,string];
}
function courseAnswer(faq:Faq,course:Course):string {
 switch(faq.id){
  case 'fees':return `Học phí mẫu của ${course.title} là ${formatVnd(course.priceVnd)}. Bạn có thể đặt lịch tư vấn để hỏi thêm về khóa này.`;
  case 'schedule':return `${course.title} có ${course.sessions} buổi, lịch ${course.schedule}, hình thức ${modeLabel(course.mode).toLowerCase()}. Đây là lịch học mẫu, chưa phải lịch tư vấn còn trống.`;
  case 'entry':return `${course.title} phù hợp với ${course.audience.toLowerCase()}. Bạn có thể đặt lịch tư vấn nếu muốn trao đổi về trình độ đầu vào.`;
  default:return faq.answer;
 }
}
export class MockChatAdapter implements ChatAdapter {
 async reply(input:string,contextCourseId?:string):Promise<ChatReply> {
  const explicit=findExplicitCourse(input,courses);
  const context=courses.find(c=>c.id===contextCourseId);
  const faq=findFaq(input,faqs);
  const course=explicit||context;
  if(hasUnsupportedSpecificCourse(input,courses)||/\b(cam ket|dam bao|chac chan)\b/.test(normalize(input))) return {message:'Mình chưa có dữ liệu mẫu để xác nhận điều đó. Bạn có thể đặt lịch tư vấn để được trao đổi cụ thể.',faqIds:[],courseIds:[],suggestions:generic,action:'offer_booking',mode:'mock'};
  if(explicit&&!faq) return {message:`Mình tìm thấy khóa mẫu ${explicit.title}, phù hợp với ${explicit.audience.toLowerCase()}. Khóa có ${explicit.sessions} buổi, lịch ${explicit.schedule}, học phí ${formatVnd(explicit.priceVnd)}.`,faqIds:[],courseIds:[explicit.id],suggestions:['Học phí bao nhiêu?','Lịch học và thời lượng thế nào?','Đăng ký như thế nào?'],action:'answer',mode:'mock'};
  if(faq){
   if(['fees','schedule','entry'].includes(faq.id)&&!course) return {message:'Bạn muốn hỏi về khóa học nào? Hãy chọn một khóa trong danh mục hoặc nêu tên khóa để mình trả lời đúng dữ liệu mẫu.',faqIds:[faq.id],courseIds:[],suggestions:['Có những khóa học nào?','Python cơ bản','Excel cơ bản'],action:'clarify',mode:'mock'};
   return {message:course&&['fees','schedule','entry'].includes(faq.id)?courseAnswer(faq,course):faq.answer,faqIds:[faq.id],courseIds:explicit?[explicit.id]:[],suggestions:suggestions(faq,input),action:faq.id==='register'?'offer_booking':'answer',mode:'mock'};
  }
  return {message:'Mình chưa có dữ liệu mẫu cho câu hỏi này. Bạn có thể chọn một khóa học hoặc đặt lịch tư vấn để trao đổi thêm.',faqIds:[],courseIds:[],suggestions:generic,action:'offer_booking',mode:'mock'};
 }
}
