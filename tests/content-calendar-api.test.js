import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeCalendarBrief,createContentCalendar} from '../src/content-calendar-plan.js';
import {onRequestPost,validateAIPlan} from '../functions/api/content-calendar.js';
import worker from '../worker/index.js';

const brief={
 niche:'PS5 gaming and Cricket 26 highlights',audience:'casual cricket fans',
 goal:'engagement',platform:'both',days:7,perWeek:3,startDate:'2026-10-19'
};
const req=body=>new Request('https://channelscope.example/api/content-calendar',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
});
test('Calendar endpoint keeps deterministic free plan when no Groq key is available',async()=>{
  const r=await onRequestPost({request:req(brief),env:{}});
  assert.equal(r.status,200);
  const p=await r.json();
  assert.equal(p.mode,'free');
  assert.equal(p.slots.length,3);
  assert.equal(p.config.startDate,brief.startDate);
  assert.equal(p.slots[0].date,'2026-10-19');
  assert.equal(p.generation.aiCount,0);
  assert.equal(p.generation.templateCount,3);
  assert.match(p.generation.reason,/not configured/);
  assert.ok(p.slots.every(x=>x.source==='template'));
});
test('Server validates content calendar inputs and request methods',async()=>{
  let r=await onRequestPost({request:req({...brief,days:365}),env:{}});
  assert.equal(r.status,400);
  r=await onRequestPost({request:new Request('https://a.example/api/content-calendar',{method:'POST',body:'none'}),env:{}});
  assert.equal(r.status,415);
  r=await onRequestPost({request:req({...brief,unused:'X'.repeat(8000)}),env:{}});
  assert.equal(r.status,413);
});
test('Groq calendar idea validation admits niche specific titles and rejects viral promises',()=>{
  const plan=createContentCalendar(brief);
  const ideas=validateAIPlan({ideas:[
    {title:'Cricket 26: one gameplay moment to capture',idea:'Plan to record a verifiable moment in Cricket 26 gameplay.',
      hook:'What would you notice in this Cricket 26 clip?',callToAction:'Share your favorite part.'},
    {title:'Guaranteed viral video',idea:'Get a million views by breaking the algorithm.',
      hook:'Guaranteed viral!',callToAction:'Follow now!'},
    {title:'PS5 gaming — ask the audience',idea:'Ask fans about one gameplay detail they want to see.',
      hook:'Which PS5 moment should I show?',callToAction:'Tell me below.'},
    {title:'Unrelated baking recipe',idea:'Bake a cake with no reference to gaming.',hook:'Cook with me',callToAction:'Comment.'}
  ]},plan);
  assert.equal(ideas.mode,'hybrid');
  assert.equal(ideas.slots.length,3);
  assert.match(ideas.slots[0].title,/Cricket 26/);
  assert.match(ideas.slots[1].title,/PS5/);
  assert.doesNotMatch(JSON.stringify(ideas),/Guaranteed viral video/);
  assert.equal(ideas.slots[2].title,plan.slots[2].title);
  assert.equal(ideas.stats.scheduled,3);
  assert.equal(ideas.generation.aiCount,2);
  assert.equal(ideas.generation.templateCount,1);
  assert.deepEqual(ideas.slots.map(x=>x.source),['ai','ai','template']);
});
test('Groq can personalize all slots without changing their dates or platforms',async()=>{
  const old=globalThis.fetch;
  globalThis.fetch=async(url,opts)=>{
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(opts.headers.Authorization,'Bearer private-key');
    const payload=JSON.parse(opts.body);
    assert.equal(payload.response_format.type,'json_object');
    return Response.json({choices:[{message:{content:JSON.stringify({ideas:[
      {title:'Cricket 26 — batting spotlight',idea:'Plan a Cricket 26 batting moment to record.',hook:'Which batting moment stands out?',callToAction:'Share your choice.'},
      {title:'PS5 gaming — real moment',idea:'Highlight one honest detail from PS5 gameplay.',hook:'Notice this gameplay detail.',callToAction:'What would you try?'},
      {title:'Cricket 26 — genuine viewer question',idea:'Ask your audience which Cricket 26 aspect they prefer.',hook:'Which option would you pick?',callToAction:'Comment your answer.'}
    ]})}}]});
  };
  try{
    const r=await onRequestPost({request:req(brief),env:{GROQ_API_KEY:'private-key'}});
    const p=await r.json();
    assert.equal(p.mode,'ai');
    assert.equal(p.generation.aiCount,3);
    assert.equal(p.generation.templateCount,0);
    assert.ok(p.slots.every(x=>x.source==='ai'));
    assert.equal(p.slots.length,3);
    assert.deepEqual(p.slots.map(x=>x.date),['2026-10-19','2026-10-21','2026-10-23']);
    assert.deepEqual(p.slots.map(x=>x.platform),['Instagram Reel','YouTube Short','Instagram Reel']);
    assert.doesNotMatch(JSON.stringify(p),/private-key/);
  }finally{globalThis.fetch=old;}
});
test('Rate limits and invalid responses fall back without leaking secrets',async()=>{
  const old=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response('private provider problem',{status:429});
    let r=await onRequestPost({request:req(brief),env:{GROQ_API_KEY:'private-key'}});
    let p=await r.json();
    assert.equal(p.mode,'free');
    assert.equal(p.aiErrorCode,'rate-limit');
    assert.equal(p.generation.mode,'free');
    assert.match(p.generation.reason,/rate limit/);
    assert.doesNotMatch(JSON.stringify(p),/private-key|private provider problem/);
    globalThis.fetch=async()=>Response.json({choices:[{message:{content:'{"ideas":[]}'}}]});
    r=await onRequestPost({request:req(brief),env:{GROQ_API_KEY:'private-key'}});
    p=await r.json();
    assert.equal(p.mode,'free');
    assert.equal(p.aiErrorCode,'incomplete');
  }finally{globalThis.fetch=old;}
});
test('Worker exposes calendar POST and preserves methods and static site routes',async()=>{
  const env={ASSETS:{fetch:()=>new Response('site')}},ctx={waitUntil(){}};
  let res=await worker.fetch(req(brief),env,ctx);
  assert.equal(res.status,200);assert.equal((await res.json()).mode,'free');
  res=await worker.fetch(new Request('https://channelscope.example/api/content-calendar'),env,ctx);
  assert.equal(res.status,405);
  res=await worker.fetch(new Request('https://channelscope.example/content-calendar'),env,ctx);
  assert.equal(await res.text(),'site');
});


test('Rejects generic filler AI ideas even if they repeat PS5 from the niche',()=>{
  const plan=createContentCalendar({...brief,niche:'PS5 Gaming. Different Games'});
  const result=validateAIPlan({ideas:[
    {title:'PS5 Gaming — spotlight one real detail',idea:'Pick one detail you can show or explain accurately.',
      hook:'Here is one detail worth noticing. Topic: PS5 Gaming.',callToAction:'What stands out?'},
    {title:'PS5 opening comparison: two different games',
      idea:'Record the first minute of two accessible PS5 games, compare the real opening moments, and invite a preference.',
      hook:'Two PS5 games, two openings. Which one keeps you watching?',callToAction:'Vote for A or B.'}
  ]},plan);
  assert.equal(result.mode,'hybrid');
  assert.equal(result.generation.aiCount,1);
  assert.equal(result.slots[0].title,'PS5 opening comparison: two different games');
  assert.equal(result.slots[1].source,'template');
  assert.ok(result.slots.every(x=>!x.hook.includes('Topic:')));
});
test('Long 30-day calendars show AI + templates instead of falsely calling all suggestions AI',()=>{
  const plan=createContentCalendar({...brief,days:30,perWeek:5});
  const ideas=Array.from({length:12},(_,index)=>({
    title:'PS5 comparison '+(index+1)+': a different playable challenge',
    idea:'Record two real attempts in available PS5 games to compare the same achievable task with honest results.',
    hook:'What will happen when two PS5 games take on the same challenge?',
    callToAction:'Which challenge should come next?'
  }));
  const result=validateAIPlan({ideas},plan);
  assert.equal(result.mode,'hybrid');
  assert.equal(result.generation.aiCount,12);
  assert.equal(result.generation.templateCount,plan.slots.length-12);
  assert.ok(result.slots.some(x=>x.source==='template'));
  assert.ok(result.slots.every((s,i)=>s.date===plan.slots[i].date));
});
