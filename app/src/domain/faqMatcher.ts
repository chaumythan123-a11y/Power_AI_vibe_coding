import type { Faq } from '../types';
import { normalize } from './courseMatcher';
const patterns:Record<string,RegExp>={courses:/\b(khoa hoc|hoc mon gi|co nhung khoa|danh sach khoa|lop mon nao|co lop nao)\b/,fees:/\b(hoc phi|bao nhieu tien|gia|bao nhieu dong|ton bao nhieu tien)\b/,schedule:/\b(lich hoc|thoi luong|bao lau|may buoi|buoi hoc|hoc vao buoi nao|keo dai may buoi)\b/,entry:/\b(dau vao|trinh do|nguoi moi|bat dau hoc|chua hoc .* co .* duoc)\b/,trial:/\b(hoc thu|trai nghiem)\b/,register:/\b(dang ky|dat lich|ghi danh)\b/,payment:/\b(thanh toan|chuyen khoan|dong tien|tra hoc phi)\b/,reserve:/\b(bao luu|tam dung hoc|hoc lai)\b/,refund:/\b(hoan hoc phi|hoan tien|duoc hoan|hoan lai|huy khoa|lay lai tien|doi y .* khai giang)\b/,hours:/\b(gio tu van|mo cua|lien he|khung gio|gio .* tu van vien)\b/};
const hoursSpecific=/\b(gio tu van|khung gio|gio nao co the chon|gio nao|luc nao tu van)\b/;
const registerSpecific=/\b(dang ky|dat lich)\b/;
export function findFaq(input:string,faqs:Faq[]):Faq|undefined {
 const text=normalize(input);
 const exact=faqs.find(f=>normalize(f.question)===text||f.aliases.some(alias=>normalize(alias)===text));
 if(exact)return exact;
 if(patterns.refund.test(text))return faqs.find(f=>f.id==='refund');
 if(patterns.payment.test(text))return faqs.find(f=>f.id==='payment');
 // Specific time and registration requests are separate intents. A combined
 // question needs a fuller answer than either FAQ can provide on its own.
 const asksHours=hoursSpecific.test(text);
 const asksRegister=registerSpecific.test(text);
 if(asksHours&&asksRegister)return undefined;
 if(asksHours)return faqs.find(f=>f.id==='hours');
 if(asksRegister)return faqs.find(f=>f.id==='register');
 if(patterns.trial.test(text))return faqs.find(f=>f.id==='trial');
 if(patterns.reserve.test(text))return faqs.find(f=>f.id==='reserve');
 // A question about a course's fee/schedule is more specific than "khóa học".
 const ordered=[...faqs.filter(f=>f.id!=='courses'),...faqs.filter(f=>f.id==='courses')];
 return ordered.find(f=>patterns[f.id]?.test(text)||[f.question,...f.aliases].some(alias=>` ${text} `.includes(` ${normalize(alias)} `)));
}
