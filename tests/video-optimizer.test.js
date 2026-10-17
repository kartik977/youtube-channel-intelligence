import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeBrief,freeVideoPack,validateGenerated,meaningfulDetails,onRequestPost} from '../functions/api/video-optimizer.js';
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


test('Hashtag-only descriptions are not passed off as detailed gameplay knowledge',()=>{
  const sparse=normalizeBrief({
    kind:'live',tone:'clear',topic:'Call of Duty–Modern Warfare 4 – Part 1',
    description:'#callofduty #mw4 #ghost #price #ps5 #callofdutymodernwarfare',
    channelName:'Daywalker_OP',sourceVideo:{id:'inPa2Ve-vgI',channelTitle:'Daywalker_OP',liveStatus:'ended'}
  });
  assert.equal(meaningfulDetails(sparse.description),'');
  assert.equal(meaningfulDetails('Real footage of a Paris mission with my friend.'),'Real footage of a Paris mission with my friend.');
  const fallback=freeVideoPack(sparse);
  assert.equal(fallback.mode,'free');
  assert.doesNotMatch(fallback.description,/#ghost|#price/i);
  assert.match(fallback.description,/Add verified details before publishing/);
  assert.match(fallback.note,/public metadata/);
});

test('Partial Groq JSON preserves usable content, fills missing fields, and labels hybrid',()=>{
  const answer={
    titles:['Cricket 26: Watch the Final Over'],
    hooks:['One over left in this Cricket 26 match.'],
    hashtags:[{tag:'#Cricket26',reason:'Specific featured game'}]
    // Missing description, second hook, and other titles/tags
  };
  const result=validateGenerated(answer,freeVideoPack(brief),brief);
  assert.equal(result.mode,'hybrid');
  assert.equal(result.titleOptions[0],answer.titles[0]);
  assert.equal(result.titleOptions.length,3);
  assert.equal(result.hooks[0],answer.hooks[0]);
  assert.equal(result.hooks.length,2);
  assert.ok(result.description.length>=20);
  assert.ok(result.hashtags.some(t=>t.tag==='#Cricket26'));
  assert.match(result.note,/AI-assisted draft/);
});

test('Unknown or irrelevant AI hashtags are rejected in favor of topic-based alternatives',()=>{
  const sparse={kind:'live',tone:'clear',topic:'Call of Duty Modern Warfare 4 — Part 1',
    description:'#callofduty #mw4',channelName:'Daywalker_OP'};
  const response={
    titles:['Call of Duty: Modern Warfare 4 Part 1 — Live','Modern Warfare 4 Live Stream','Call of Duty Modern Warfare 4: Part 1'],
    description:'A Call of Duty Modern Warfare 4 livestream from Daywalker_OP. Part 1 of the series.',
    hooks:['Welcome to Modern Warfare 4 Part 1.','We are getting started with part one.'],
    hashtags:[
      {tag:'#CallOfDuty',reason:'Named franchise'},
      {tag:'#MW4',reason:'Named in public description'},
      {tag:'#GamingLive',reason:'Livestream format'},
      {tag:'#BattlefieldStrategy',reason:'Invented tactics'},
      {tag:'#GameTips',reason:'Tips not in metadata'}
    ]
  };
  const result=validateGenerated(response,freeVideoPack(sparse),sparse);
  const tags=result.hashtags.map(x=>x.tag.toLowerCase());
  assert.equal(result.mode,'ai');
  assert.ok(tags.includes('#callofduty'));
  assert.ok(tags.includes('#mw4'));
  assert.ok(tags.includes('#gaminglive'));
  assert.ok(!tags.includes('#battlefieldstrategy'));
  assert.ok(!tags.includes('#gametips'));
});

test('Length-limited but valid Groq JSON is salvaged without a complete fallback',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({choices:[{
    finish_reason:'length',
    message:{content:JSON.stringify({
      titles:['Cricket 26: Last Over on PS5'],description:'Gameplay from the final over of a Cricket 26 match on PS5.'
    })}
  }]});
  try{
    const response=await onRequestPost({request:makeReq(),env:{GROQ_API_KEY:'private-test-key'}});
    const payload=await response.json();
    assert.equal(payload.mode,'hybrid');
    assert.equal(payload.titleOptions[0],'Cricket 26: Last Over on PS5');
    assert.match(payload.note,/AI-assisted/);
    assert.doesNotMatch(JSON.stringify(payload),/private-test-key/);
  }finally{globalThis.fetch=previous;}
});

test('Unparseable Groq output still falls back safely',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({choices:[{finish_reason:'length',message:{content:'{"titles":["Incomplete"'}}]});
  try{
    const response=await onRequestPost({request:makeReq(),env:{GROQ_API_KEY:'private-test-key'}});
    const payload=await response.json();
    assert.equal(payload.mode,'free');
    assert.equal(payload.aiErrorCode,'incomplete');
    assert.match(payload.note,/truncated/);
  }finally{globalThis.fetch=previous;}
});


test('Gaming livestream hashtag priorities choose franchise, series and niche before generic format tags',()=>{
  const input=normalizeBrief({
    kind:'live',tone:'clear',topic:'Call of Duty–Modern Warfare 4 – Part 1',
    description:'In part one, there is a bombing of Seoul from North Korea at the start of the game.',
    channelName:'Daywalker_OP',
    sourceVideo:{id:'inPa2Ve-vgI',channelTitle:'Daywalker_OP',liveStatus:'ended'}
  });
  const pack=freeVideoPack(input);
  assert.deepEqual(pack.hashtags.slice(0,3).map(x=>x.tag),[
    '#CallOfDuty','#ModernWarfare','#GamingLive'
  ]);
  // Don't invent #MW4 when the brief only says Modern Warfare 4.
  assert.ok(!pack.hashtags.some(x=>x.tag==='#MW4'));
  assert.equal(pack.hashtags.filter(x=>x.category==='primary').length,3);
  assert.ok(pack.titleOptions.some(x=>/Live Gameplay|LIVE:/.test(x)));
  assert.ok(pack.titleOptions.every(x=>!/Explained|Breakdown|Strategy/i.test(x)));
});

test('Unsupported gameplay tutorials, instructional titles and invented mechanics are replaced, not labeled fully AI',()=>{
  const input=normalizeBrief({
    kind:'live',tone:'clear',topic:'Call of Duty–Modern Warfare 4 – Part 1',
    description:'Part one covers the bombing of Seoul from North Korea at the start of the game.',
    channelName:'Daywalker_OP',
    sourceVideo:{id:'inPa2Ve-vgI',channelTitle:'Daywalker_OP',liveStatus:'ended'}
  });
  const suggested={
    titles:[
      'Call of Duty MW4: Seoul Bombing Explained',
      'Modern Warfare 4 Part 1 – Seoul Raid Breakdown',
      'Call of Duty Modern Warfare 4 – Part 1 | Live Gameplay'
    ],
    description:'The game starts with Seoul being bombed. Watch Daywalker_OP break down weapon loadouts, tactics and gameplay mechanics.',
    hooks:['Let me show you the best weapon loadouts and strategy.', 'Welcome to Modern Warfare 4 Part 1.'],
    hashtags:[
      {tag:'#CallOfDuty',reason:'Featured game'},
      {tag:'#Gaming',reason:'Broad niche'},
      {tag:'#LiveStream',reason:'Live format'},
      {tag:'#ModernWarfare',reason:'Game series'},
      {tag:'#GamingLive',reason:'Gaming live niche'}
    ]
  };
  const result=validateGenerated(suggested,freeVideoPack(input),input);
  assert.equal(result.mode,'hybrid');
  assert.ok(result.titleOptions.every(x=>!/Explained|Breakdown|Strategy/i.test(x)));
  assert.ok(result.titleOptions.some(x=>/Live Gameplay/i.test(x)));
  assert.doesNotMatch(result.description,/weapon loadouts|tactics|mechanics/i);
  assert.doesNotMatch(result.hooks.join(' '),/loadouts|strategy/i);
  assert.deepEqual(result.hashtags.slice(0,3).map(x=>x.tag),
    ['#CallOfDuty','#ModernWarfare','#GamingLive']);
  assert.match(result.note,/unsupported or missing AI claims/);
});

test('Explicit educational brief can retain a genuine tutorial title and explanatory description',()=>{
  const input=normalizeBrief({
    kind:'video',tone:'educational',topic:'Java Spring Boot OAuth2 Tutorial',
    description:'Teaching step-by-step how to add authorization to a Spring Boot REST API.'
  });
  const generated={
    titles:[
      'Spring Boot OAuth2 Tutorial for Beginners',
      'Spring Boot Authorization Guide',
      'How to Add OAuth2 in Spring Boot'
    ],
    description:'This Spring Boot OAuth2 tutorial teaches step-by-step authorization in a REST API.',
    hooks:['Today we will learn Spring Boot OAuth2 authorization.','Follow along with this tutorial.'],
    hashtags:[
      {tag:'#SpringBoot',reason:'Framework covered'},
      {tag:'#Java',reason:'Language mentioned'},
      {tag:'#TechTips',reason:'Educational tech format'}
    ]
  };
  const report=validateGenerated(generated,freeVideoPack(input),input);
  assert.ok(report.titleOptions.some(x=>/tutorial/i.test(x)));
  assert.match(report.description,/step-by-step/);
  assert.ok(report.hashtags.some(x=>x.tag==='#SpringBoot'));
});
