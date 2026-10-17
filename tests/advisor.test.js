import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequestPost, buildEvidence, buildFallback } from '../functions/api/advisor.js';
import worker from '../worker/index.js';

const channel = {
  source:'youtube',
  channel:{ id:'UC123xyz', title:'Daywalker_OP', handle:'@Daywalker_OP', subscribers:63 },
  videos:[
    {id:'a',title:'Gaming setup review',views:100,likes:10,comments:2,publishedAt:'2026-09-02T12:00:00Z'},
    {id:'b',title:'Testing new gameplay settings',views:300,likes:20,comments:1,publishedAt:'2026-09-07T12:00:00Z'},
    {id:'c',title:'One controller vs another',views:500,likes:21,comments:4,publishedAt:'2026-09-15T12:00:00Z'},
    {id:'d',title:'My favorite games',views:1000,likes:42,comments:8,publishedAt:'2026-09-22T12:00:00Z'}
  ]
};
const request = (body=channel) => new Request('https://channelscope.example/api/advisor', {
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
});
test('Fallback advisor computes a grounded public-data playbook', async()=>{
  const response = await onRequestPost({request:request(), env:{}});
  assert.equal(response.status,200);
  const report=await response.json();
  assert.equal(report.mode,'playbook');
  assert.equal(report.priorities.length,3);
  assert.equal(report.ideas.length,3);
  assert.match(report.summary,/4 accessible recent uploads/);
  assert.match(report.strengths[0],/My favorite games/);
  assert.match(report.note,/data-driven/i);
});
test('Evidence uses median rather than claiming age-normalized performance',()=>{
  const evidence=buildEvidence(channel);
  assert.equal(evidence.medianViews,400);
  assert.equal(evidence.sampleSize,4);
  assert.equal(evidence.topVideos[0].title,'My favorite games');
  assert.match(buildFallback(channel,evidence).priorities[0].reason,/not age-adjusted/);
});
test('Malformed, oversized and unsupported requests are rejected', async()=>{
  const bad=await onRequestPost({request:request({channel:{id:'id',title:'x'},videos:[]}),env:{}});
  assert.equal(bad.status,400);
  const unsupported=await onRequestPost({request:new Request('https://channelscope.example/api/advisor',{method:'POST',body:'test'}),env:{}});
  assert.equal(unsupported.status,415);
  const tooMany={...channel,videos:Array.from({length:31},(_,i)=>({...channel.videos[0],id:String(i)}))};
  const result=await onRequestPost({request:request(tooMany),env:{}});
  assert.equal(result.status,400);
  const large=await onRequestPost({request:request({...channel,extra:'z'.repeat(51000)}),env:{}});
  assert.equal(large.status,413);
});
test('Empty samples show limitations without making up video metrics',async()=>{
  const result=await onRequestPost({request:request({...channel,videos:[]}),env:{GROQ_API_KEY:'example'}});
  const report=await result.json();
  assert.equal(report.mode,'playbook');
  assert.match(report.summary,/No accessible recent videos/);
});
test('Optional Groq generation is clearly labeled and validates structured output',async()=>{
  const original=globalThis.fetch;
  let outbound;
  globalThis.fetch=async (_url,init)=>{
    outbound=JSON.parse(init.body);
    return Response.json({choices:[{message:{content:JSON.stringify({
      summary:'Two gaming-focused uploads stood out in this public sample.',
      strengths:['Video A has visible public views.','Median views: 400.','Engagement proxy varies.'],
      priorities:[
        {title:'Follow-up',reason:'Recent sample',experiment:'Make a follow-up video.',measure:'Seven-day views.'},
        {title:'Title test',reason:'Titles differ',experiment:'Test new hooks.',measure:'Seven-day views.'},
        {title:'Post regularly',reason:'Posting gaps',experiment:'Set calendar.',measure:'Upload count.'}
      ],
      ideas:[
        {title:'Controller test',hook:'Show the result first.',rationale:'Topic overlap.'},
        {title:'Setup lesson',hook:'Show mistake.',rationale:'Practical value.'},
        {title:'Favorite game breakdown',hook:'Start with highlight.',rationale:'Audience match.'}
      ]
    })}}]});
  };
  try {
    const res=await onRequestPost({request:request(),env:{GROQ_API_KEY:'fake',GROQ_MODEL:'openai/gpt-oss-20b'}});
    const report=await res.json();
    assert.equal(report.mode,'ai');
    assert.match(report.summary,/gaming-focused/);
    assert.equal(outbound.model,'openai/gpt-oss-20b');
    assert.equal(outbound.response_format.type,'json_object');
    assert.equal(outbound.reasoning_effort,'low');
    assert.ok(outbound.max_completion_tokens>=3000);
  } finally {globalThis.fetch=original;}
});
test('Unavailable or invalid AI response switches to accurately labeled free mode',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('service overloaded',{status:429});
  try {
    const res=await onRequestPost({request:request(),env:{GROQ_API_KEY:'fake'}});
    const report=await res.json();
    assert.equal(report.mode,'playbook');
    assert.match(report.note,/rate-limited/);
  } finally {globalThis.fetch=original;}
});
test('Workers entrypoint serves advisor POST and rejects GET',async()=>{
  const env={ASSETS:{fetch:()=>new Response('asset')}};
  const ctx={waitUntil(){}};
  const res=await worker.fetch(request(),env,ctx);
  assert.equal(res.status,200);
  assert.equal((await res.json()).mode,'playbook');
  const forbidden=await worker.fetch(new Request('https://channelscope.example/api/advisor'),env,ctx);
  assert.equal(forbidden.status,405);
});

test('Provider authentication errors are distinguishable from rate limits without leaking credentials',async()=>{
  const original=globalThis.fetch;
  let status=401;
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:'Should not appear in output'}}),{status});
  try {
    let res=await onRequestPost({request:request(),env:{GROQ_API_KEY:'fake-secret'}});
    let report=await res.json();
    assert.equal(report.mode,'playbook');
    assert.equal(report.aiErrorCode,'invalid-key');
    assert.match(report.note,/Groq rejected the AI key/);
    assert.doesNotMatch(JSON.stringify(report),/fake-secret|Should not appear/);
    status=400;
    res=await onRequestPost({request:request(),env:{GROQ_API_KEY:'fake-secret'}});
    report=await res.json();
    assert.equal(report.aiErrorCode,'bad-request');
    assert.match(report.note,/GROQ_MODEL/);
  } finally {globalThis.fetch=original;}
});

test('Truncated AI output shows an accurate fallback reason',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]});
  try {
    const res=await onRequestPost({request:request(),env:{GROQ_API_KEY:'fake'}});
    const report=await res.json();
    assert.equal(report.mode,'playbook');
    assert.equal(report.aiErrorCode,'invalid-output');
    assert.match(report.note,/did not return a complete/);
  } finally {globalThis.fetch=original;}
});
