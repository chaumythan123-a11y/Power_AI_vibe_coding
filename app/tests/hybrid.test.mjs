import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle=await build({entryPoints:['src/services/hybridChatAdapter.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {HybridChatAdapter,usesPreparedAnswer}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
test('FAQ dùng mẫu, câu hỏi lộ trình và so sánh đi Gemini',()=>{
  for(const q of ['Học phí bao nhiêu?','giá Excel bao nhiêu?','Có được học thử không?'])assert.equal(usesPreparedAnswer(q),true,q);
  for(const q of ['Lộ trình Python gồm những gì?','So sánh Python và Excel cho người mới','Gợi ý đồ án Python về sách','Giải thích vòng lặp với ví dụ','Giá trị của biến là gì?','Tư vấn cách tự học mỗi ngày','Học phí và lịch học Python là gì?'])assert.equal(usesPreparedAnswer(q),false,q);
});
test('mẫu không gọi mạng, Gemini gửi context và lỗi có nhãn dự phòng',async()=>{
  const original=globalThis.fetch;let calls=0;let body;
  globalThis.fetch=async(_url,options)=>{calls++;body=JSON.parse(options.body);return {ok:true,json:async()=>({message:'Gợi ý học tập từ AI.',action:'answer',courseIds:['python-basic'],knownFacts:[],missingFacts:[],mode:'gemini',suggestions:['Đồ án Python cơ bản mẫu gồm những bước nào?','Cần chuẩn bị gì để học Python cơ bản?','Đặt lịch tư vấn như thế nào?']})}};
  try{
    const adapter=new HybridChatAdapter();
    assert.equal((await adapter.reply('Học phí bao nhiêu?','python-basic')).mode,'mock');assert.equal(calls,0);
    assert.equal((await adapter.reply('Gợi ý đồ án về sách','python-basic',[{id:'a',role:'bot',text:'Bước 2: viết hàm.',createdAt:''}])).mode,'gemini');assert.equal(body.contextCourseId,'python-basic');assert.equal(calls,1);assert.deepEqual(body.history,[{role:'model',text:'Bước 2: viết hàm.'}]);
    globalThis.fetch=async()=>({ok:false,status:429});
    const fallback=await adapter.reply('Gợi ý đồ án');assert.equal(fallback.mode,'mock');assert.match(fallback.notice,/giới hạn/);
    globalThis.fetch=async()=>({ok:true,json:async()=>({message:'Text cũ không có hợp đồng.'})});
    const legacy=await adapter.reply('Gợi ý đồ án');assert.equal(legacy.mode,'mock');assert.equal(legacy.action,'offer_booking');assert.match(legacy.notice,/định dạng xác thực/);
  }finally{globalThis.fetch=original}
});
