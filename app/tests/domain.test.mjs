import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function load(entry) {
 const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const {MockChatAdapter}=await load('src/services/mockChatAdapter.ts');
const {faqs}=await load('src/data/catalog.ts');
const {validateBooking,vietnamNow}=await load('src/domain/bookingValidation.ts');
const {bookingStorage}=await load('src/services/bookingStorage.ts');
const adapter=new MockChatAdapter();

test('10 FAQ mẫu đều có phản hồi và đúng ba gợi ý',async()=>{
 for(const faq of faqs){const reply=await adapter.reply(faq.question,faq.id==='fees'||faq.id==='schedule'||faq.id==='entry'?'python-basic':undefined);assert.equal(reply.faqIds[0],faq.id,faq.question);assert.equal(reply.suggestions.length,3);assert.equal(new Set(reply.suggestions).size,3);assert.equal(reply.mode,'mock')}
});
test('ngữ cảnh Python và nêu rõ Excel trả đúng học phí',async()=>{
 assert.match((await adapter.reply('bao nhiêu tiền?','python-basic')).message,/990\.000đ/);
 assert.match((await adapter.reply('giá Excel bao nhiêu?','python-basic')).message,/750\.000đ/);
});
test('thiếu khóa, khóa ngoài dữ liệu và claim cam kết đều không bịa',async()=>{
 assert.equal((await adapter.reply('học phí bao nhiêu?')).action,'clarify');
 assert.equal((await adapter.reply('Hóa lớp 12','python-basic')).action,'offer_booking');
 assert.equal((await adapter.reply('cam kết IELTS 8.0','python-basic')).action,'offer_booking');
});
test('quy tắc đặt lịch kiểm tra ngày, giờ, tên, điện thoại và slot trùng',()=>{
 const now=new Date('2026-10-28T02:00:00.000Z');
 const valid={name:'Nguyễn Minh Anh',phone:'+84 900 000 000',date:'2026-10-29',time:'10:00',note:''};
 assert.deepEqual(validateBooking(valid,[],now),{});
 assert.ok(validateBooking({...valid,name:' '},[],now).name);
 assert.ok(validateBooking({...valid,phone:'123'},[],now).phone);
 assert.ok(validateBooking({...valid,date:'2026-10-27'},[],now).date);
 assert.ok(validateBooking({...valid,date:'2027-01-01'},[],now).date);
 assert.ok(validateBooking(valid,[{date:valid.date,time:valid.time,status:'active'}],now).time);
});
test('storage JSON hỏng không bị ghi đè và lỗi ghi không báo thành công',()=>{
 let raw='not-json';let writes=0;
 const date=new Date(`${vietnamNow().date}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+1);const tomorrow=date.toISOString().slice(0,10);
 globalThis.localStorage={getItem:()=>raw,setItem:(_key,value)=>{writes++;raw=value},removeItem:()=>{raw=null}};
 assert.ok(bookingStorage.read().error);
 assert.ok(bookingStorage.add({name:'Nguyễn Minh Anh',phone:'0900000000',date:tomorrow,time:'10:00',note:''}).error);
 assert.equal(writes,0);
 raw=null;globalThis.localStorage.setItem=()=>{throw new Error('quota')};
 assert.match(bookingStorage.add({name:'Nguyễn Minh Anh',phone:'0900000000',date:tomorrow,time:'10:00',note:''}).error||'',/không|Vui lòng/i);
});
