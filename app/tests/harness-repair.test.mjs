import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler } from '../server/chatCore.mjs';
import { knowledge } from '../server/knowledge.mjs';

const suggestions = [
  { label: 'Ngày đầu học gì?', action: 'ask' },
  { label: 'Cho bài tập Python dễ?', action: 'ask' },
  { label: 'Đặt lịch tư vấn thế nào?', action: 'book' },
];
const plan = count => ({ schemaVersion: 1, kind: 'study_plan', action: 'answer',
  content: { durationDays: count, minutesPerDay: 30,
    days: Array.from({length:count},(_,i)=>({day:i+1,objective:`Học Python ngày ${i+1}`,
      tasks:['Đọc ví dụ cơ bản','Viết chương trình nhỏ'],exercise:'Viết mã in kết quả và tự kiểm tra',
      segments:[{label:'Học lý thuyết',minutes:10},{label:'Thực hành',minutes:20}]})) },
  usedFactIds: [], missingInformation: [], suggestions });
const upstream = draft => ({ ok:true, status:200, json:async()=>({ candidates:[{
  finishReason:'STOP', content:{parts:[{text:JSON.stringify(draft)}]}
}] }) });
const ask = handler => handler({ path:'/api/chat', method:'POST', headers:{host:'localhost','content-type':'application/json'},
  body:{message:'Lập kế hoạch tự học Python 5 ngày, 30 phút mỗi ngày cho người mới'}, client:'test' });

test('harness sửa đúng một lần khi draft đầu thiếu ngày', async () => {
  let calls=0; const drafts=[plan(4),plan(5)];
  const handler=createChatHandler({apiKey:'fake-test',knowledge,fetchImpl:async()=>upstream(drafts[calls++])});
  const output=await ask(handler);
  assert.equal(calls,2);
  assert.equal(output.status,200);
  assert.equal(output.payload.mode,'gemini');
  assert.match(output.payload.message,/Ngày 5|ngày 5/);
  assert.equal(output.payload.suggestions.length,3);
});

test('harness không lặp vô hạn khi bản sửa vẫn thiếu ngày', async () => {
  let calls=0;
  const handler=createChatHandler({apiKey:'fake-test',knowledge,fetchImpl:async()=>{calls++;return upstream(plan(4));}});
  const output=await ask(handler);
  assert.equal(calls,2);
  assert.notEqual(output.payload.mode,'gemini');
  assert.match(output.payload.message,/chưa|không|thử lại/i);
});

test('harness không sửa khi upstream báo auth hoặc quota', async () => {
  for (const status of [401,403,429]) {
    let calls=0;
    const handler=createChatHandler({apiKey:'fake-test',knowledge,fetchImpl:async()=>{calls++;return {ok:false,status};}});
    const output=await ask(handler);
    assert.equal(calls,1);
    assert.ok([401,403,429,502].includes(output.status));
  }
});

test('harness hết ngân sách thời gian không gửi request hay sửa', async () => {
  let calls=0;
  const handler=createChatHandler({apiKey:'fake-test',knowledge,timeBudgetMs:0,audit:()=>{},
    fetchImpl:async()=>{calls++;return upstream(plan(5));}});
  const output=await ask(handler);
  assert.equal(calls,0);
  assert.notEqual(output.payload.mode,'gemini');
});
