import type { Course } from '../types';
export const normalize = (text:string) => text.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
const hasPhrase=(text:string, phrase:string)=>` ${text} `.includes(` ${normalize(phrase)} `);
export function findExplicitCourse(input:string,courses:Course[]):Course|undefined {
 const text=normalize(input);
 const aliases:Record<string,string[]>={
  'python-basic':['python','lap trinh python'], 'english-communication':['tieng anh giao tiep','anh giao tiep'],
  'math-12':['toan 12','toan lop 12'], 'math-10':['toan 10','toan lop 10'],
  'toeic-foundation':['toeic'], 'excel-basic':['excel']
 };
 return courses.find(course=>[course.title,...(aliases[course.id]||[])].some(alias=>hasPhrase(text,alias)));
}
export function hasUnsupportedSpecificCourse(input:string,courses:Course[]):boolean {
 const text=normalize(input);
 if (/\b(hoa|vat ly|ly|sinh|ielts)\b/.test(text)) return true;
 const grade=text.match(/\b(?:toan|lop)\s*(\d{1,2})\b/);
 return !!grade && !courses.some(c=>normalize(c.title)===`toan ${grade[1]}`);
}
