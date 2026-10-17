import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeBrief,freeVideoPack,validateGenerated,onRequestPost} from '../functions/api/video-optimizer.js';
import worker from '../worker/index.js';

const brief={
  kind:'short',tone:'energetic',topic:'Cricket 26 final over comeback on PS5',
  description:'Gameplay highlights of a close match on PlayStation 5',
  audience:'Cricket gamers',channelName:'Daywalker_OP',
  recentTitles:['Cricket gameplay', 'PS5 live stream']
};
const makeReq=(data=brief)=>new Request('https://channelscope.example/api/video-optimizer',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)
});

test('Brief validation handles kind, tone, topic and input limits',()=>{
  const value=normalizeBrief(brief);
  assert.equal(value.kind,'short');
  assert.equal(value.topic,'Cricket 26 final over comeback on PS5');
  assert.throws(()=>normalizeBrief({...brief,kind:'story'}),/Select Video/);
  assert.throws(()=>normalizeBrief({...brief,tone:'viral'}),/writing style/);
  assert.throws(()=>normalizeBrief({...brief,topic:'x'}),/at least 3/);
  assert.equal(normalizeBrief({...brief,recentTitles:Array(20).fill('title')}).recentTitles.length,5);
});
test('Free pack includes relevant hashtags without made-up trend metrics',()=>{
  const r=freeVideoPack(brief);
  assert.equal(r.mode,'free');
  assert.equal(r.titleOptions.length,3);
  assert.equal(r.hooks.length,2);
  assert.match(r.description,/Cricket 26/);
  const tags=r.hashtags.map(x=>x.tag);
  assert.ok(tags.includes('#Cricket26'),tags.join(' '));
  assert.ok(tags.includes('#PS5'),tags.join(' '));
  assert.ok(tags.every(x=>!/#viral|#fyp|#trending/i.test(x)));
  assert.equal(tags.length,new Set(tags.map(x=>x.toLowerCase())).size);
  assert.equal(r.hashtags.filter(x=>x.category==='primary').length,3);
});
test('Fallback does not claim any hashtag is trending',()=>{
  for(const kind of ['video','short','live']){
    const r=freeVideoPack({...brief,kind});
    assert.ok(r.hashtags.length>=3);
    assert.doesNotMatch(JSON.stringify(r.hashtags),/verified|100% more|high-volume/i);
  }
});
test('AI response validates titles, tags, unique categories and unsafe generic tags',()=>{
  const body={
    titles:['Epic Cricket 26 Comeback on PS5','Cricket 26: Final Over Madness','The Last Ball on Cricket 26'],
    description:'My honest Cricket 26 gameplay highlights on PlayStation 5, featuring a tight final over.',
    hooks:['The match comes down to the final over.','Can I pull off the comeback?'],
    hashtags:[
      {tag:'#Cricket26',reason:'Specific game'},
      {tag:'#PS5',reason:'Platform is named'},
      {tag:'#CricketGaming',reason:'Matches niche'},
      {tag:'#viral',reason:'Generic bait'},
      {tag:'#Cricket26',reason:'Duplicate'},
      {tag:'#GamingShorts',reason:'Short format'},
      {tag:'#Gaming',reason:'Relevant alternative'}
    ]
  };
  const r=validateGenerated(body,freeVideoPack(brief),brief);
  assert.equal(r.mode,'ai');
  assert.equal(r.hashtags.length,5);
  assert.equal(r.hashtags.filter(h=>h.category==='primary').length,3);
  assert.ok(r.hashtags.some(h=>h.tag==='#GamingShorts'));
  assert.ok(!r.hashtags.some(h=>h.tag==='#viral'));
  assert.equal(r.hashtags.length,new Set(r.hashtags.map(h=>h.tag.toLowerCase())).size);
});
test('API operates freely without Groq and rejects invalid requests',async()=>{
  const r=await onRequestPost({request:makeReq(),env:{}});
  assert.equal(r.status,200);
  assert.equal((await r.json()).mode,'free');
  const invalid=await onRequestPost({request:makeReq({...brief,kind:'unknown'}),env:{}});
  assert.equal(invalid.status,400);
  const wrong=await onRequestPost({request:new Request('https://channelscope.example/api/video-optimizer',{method:'POST',body:'x'}),env:{}});
  assert.equal(wrong.status,415);
  const tooLarge=await onRequestPost({request:makeReq({...brief,overflow:'x'.repeat(9000)}),env:{}});
  assert.equal(tooLarge.status,413);
});
test('Groq output produces real AI mode only for validated structured content',async()=>{
  const original=globalThis.fetch;let upstream=0;
  globalThis.fetch=async(url,opt)=>{
    upstream++;
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    const sent=JSON.parse(opt.body);
    assert.equal(sent.model,'openai/gpt-oss-20b');
    assert.equal(sent.response_format.type,'json_object');
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({
      titles:['Cricket 26: Final Over Comeback','PS5 Cricket 26 Final Over','Cricket 26 — One Ball to Win'],
      description:'Play the Cricket 26 final over on PS5 with a thrilling match.',
      hooks:['Watch this final over.','Can the chase work?'],
      hashtags:[
        {tag:'#Cricket26',reason:'Game featured'},
        {tag:'#PS5',reason:'Platform featured'},
        {tag:'#CricketGaming',reason:'Matches gaming'},
        {tag:'#GamingShorts',reason:'Short format'},
        {tag:'#Cricket',reason:'Broad niche'}
      ]
    })}}]});
  };
  try{
    const res=await onRequestPost({request:makeReq(),env:{GROQ_API_KEY:'private-key'}});
    assert.equal(res.status,200);
    const result=await res.json();
    assert.equal(result.mode,'ai');
    assert.equal(result.hashtags.length,5);
    assert.equal(upstream,1);
  }finally{globalThis.fetch=original;}
});
test('Provider rate limits fall back safely without leaking key',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('secret provider error',{status:429});
  try{
    const result=await(await onRequestPost({request:makeReq(),env:{GROQ_API_KEY:'private-key'}})).json();
    assert.equal(result.mode,'free');
    assert.equal(result.aiErrorCode,'rate-limit');
    assert.doesNotMatch(JSON.stringify(result),/private-key|secret provider error/);
  }finally{globalThis.fetch=original;}
});
test('Worker correctly routes video optimizer and keeps existing endpoints intact',async()=>{
  const env={ASSETS:{fetch:()=>new Response('asset')}};
  const ctx={waitUntil(){}};
  let res=await worker.fetch(makeReq(),env,ctx);
  assert.equal(res.status,200);
  assert.equal((await res.json()).mode,'free');
  res=await worker.fetch(new Request('https://channelscope.example/api/video-optimizer'),env,ctx);
  assert.equal(res.status,405);
  res=await worker.fetch(new Request('https://channelscope.example/'),env,ctx);
  assert.equal(res.status,200);
  res=await worker.fetch(new Request('https://channelscope.example/api/channel?input=%40YouTube'),env,ctx);
  assert.equal(res.status,503);
  res=await worker.fetch(new Request('https://channelscope.example/api/advisor',{method:'POST',headers:{'content-type':'application/json'},body:'{"source":"demo","channel":{"id":"a","title":"Demo"},"videos":[]}' }),env,ctx);
  assert.equal(res.status,200);
});
