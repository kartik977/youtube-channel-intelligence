import assert from 'node:assert/strict';
import {test} from 'node:test';
import {videoSeconds,normalizeOpportunityInput,analyzeOpportunities,fallbackIdeas,detectTopic} from '../functions/api/opportunity-analysis.js';
import {onRequestPost,validateIdeas} from '../functions/api/opportunities.js';
import worker from '../worker/index.js';
const videos=[
 {id:'a',title:'Call of Duty Modern Warfare Part 1 Gameplay',views:100,publishedAt:'2026-10-01T12:00:00Z',duration:'PT2H12M'},
 {id:'b',title:'Modern Warfare Part 2 PS5 Gameplay',views:300,publishedAt:'2026-10-02T12:00:00Z',duration:'PT2H30M'},
 {id:'c',title:'Modern Warfare Highlights PS5',views:500,publishedAt:'2026-10-03T12:00:00Z',duration:'PT1M'},
 {id:'d',title:'Cricket 26 Part 1 Gameplay',views:250,publishedAt:'2026-10-05T12:00:00Z',duration:'PT5M'},
 {id:'e',title:'Cricket 26 Match PS5',views:150,publishedAt:'2026-10-06T12:00:00Z',duration:'PT2M50S'},
 {id:'f',title:'New Game Surprise',views:null,publishedAt:'2026-10-07T12:00:00Z',duration:null}
];
const raw={source:'youtube',fetchedAt:'2026-10-19T00:00:00Z',
 channel:{id:'UC_test_creator',title:'Daywalker_OP'},
 videos:videos.map(v=>({...v,url:'https://www.youtube.com/watch?v=abcdefghijk'}))};
const req=(body=raw)=>new Request('https://channelscope.example/api/opportunities',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
});
test('ISO YouTube durations distinguish short-length from longer, not classify Shorts',()=>{
  assert.equal(videoSeconds('PT2M50S'),170);
  assert.equal(videoSeconds('PT3M'),180);
  assert.equal(videoSeconds('PT4M1S'),241);
  assert.equal(videoSeconds('PT1H12M'),4320);
  assert.equal(videoSeconds('P1DT2H'),93600);
  assert.equal(videoSeconds('garbage'),null);
  assert.equal(videoSeconds(null),null);
});
test('Public samples are bounded, sanitized and exclude invalid uploads',()=>{
  const n=normalizeOpportunityInput(raw);
  assert.equal(n.videos.length,6);
  assert.equal(n.videos[5].views,null);
  assert.equal(n.channel.title,'Daywalker_OP');
  assert.equal(n.videos[0].id,'a');
});
test('Rejects samples over 30 videos, invalid or malformed channel data',()=>{
  assert.throws(()=>normalizeOpportunityInput({...raw,videos:Array(31).fill(videos[0])}),/up to 30/);
  assert.throws(()=>normalizeOpportunityInput({...raw,source:'not-you-tube'}),/Load a channel/);
  assert.throws(()=>normalizeOpportunityInput({...raw,channel:{}}),/Missing public/);
});
test('Topics are grouped with measured medians and no invented growth rates',()=>{
  const result=analyzeOpportunities(normalizeOpportunityInput(raw));
  assert.equal(result.sampleSize,6);
  assert.equal(result.viewCountAvailable,5);
  assert.equal(result.baselineMedian,250);
  const modern=result.themes.find(g=>g.topic==='Modern Warfare');
  assert.ok(modern,JSON.stringify(result.themes));
  assert.equal(modern.count,3);
  assert.equal(modern.medianViews,300);
  assert.ok(result.themes.find(g=>g.topic==='Cricket 26'));
  assert.equal(result.top[0].views,500);
  assert.equal(result.formats.find(x=>x.id==='short-length').count,2);
  assert.equal(result.formats.find(x=>x.id==='longer').count,3);
  assert.equal(result.formats.find(x=>x.id==='unknown').count,1);
  assert.match(result.warnings.join(' '),/age|Shorts|CTR/i);
  assert.equal(fallbackIdeas(result).length,3);
});
test('Sparse and all-missing samples still produce honest data-only ideas',async()=>{
  const one={...raw,videos:[{id:'x',title:'One sample',views:null,publishedAt:null,duration:null}]};
  const response=await onRequestPost({request:req(one),env:{}});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.mode,'data');
  assert.equal(body.evidence.baselineMedian,null);
  assert.equal(body.ideas.length,3);
  assert.ok(body.ideas.every(x=>x.title&&x.measure));
});
test('Fallback is always available without Groq, no extra provider key required',async()=>{
  const r=await onRequestPost({request:req(),env:{}});
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.mode,'data');
  assert.equal(data.ideas.length,3);
  assert.equal(data.evidence.sampleSize,6);
  assert.match(data.note,/not predictions/);
});
test('Groq ideas must use a real observed topic and are limited to 3',async()=>{
  const old=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async(url,options)=>{
    calls++;
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    const payload=JSON.parse(options.body);
    assert.equal(payload.response_format.type,'json_object');
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({
      ideas:[
        {topic:'Modern Warfare',title:'Modern Warfare: Part 3 with a fresh angle',hook:'Here is the focus of this session.',referenceId:'c',why:'Guaranteed a million views.',measure:'Compare day 7 with past lifetime views.'},
        {topic:'Unseen Fortnite',title:'FORTNITE GOES VIRAL',hook:'...',why:'Guaranteed viral trend.',measure:'100% growth'},
        {topic:'Cricket 26',title:'Cricket 26: Mini Highlight',hook:'Watch this interesting moment.',referenceId:'d',why:'Viewers will watch much longer.',measure:'Compare against 250 lifetime median views'}
      ]
    })}}]});
  };
  try{
    const response=await onRequestPost({request:req(),env:{GROQ_API_KEY:'test-private'}});
    const body=await response.json();
    assert.equal(response.status,200);
    assert.equal(body.mode,'ai');
    assert.equal(body.ideas.length,3);
    assert.equal(body.ideas[0].topic,'Modern Warfare');
    assert.equal(body.ideas[0].sources[0].id,'c');
    assert.match(body.ideas[0].why,/3 sampled uploads/);
    assert.doesNotMatch(body.ideas[0].why,/million views/);
    assert.match(body.ideas[0].measure,/never with the lifetime medians/);
    assert.ok(!body.ideas.some(x=>x.title.includes('FORTNITE')));
    assert.equal(calls,1);
    assert.doesNotMatch(JSON.stringify(body),/test-private/);
  }finally{globalThis.fetch=old;}
});
test('Invalid Groq JSON and rate limits return safe data-only suggestions',async()=>{
  const old=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response('provider_secret',{status:429});
    let r=await onRequestPost({request:req(),env:{GROQ_API_KEY:'test-private'}});
    let body=await r.json();
    assert.equal(body.mode,'data');
    assert.equal(body.aiErrorCode,'rate-limit');
    assert.doesNotMatch(JSON.stringify(body),/provider_secret|test-private/);
    globalThis.fetch=async()=>Response.json({choices:[{message:{content:'{"ideas":['}}]});
    r=await onRequestPost({request:req(),env:{GROQ_API_KEY:'test-private'}});
    body=await r.json();
    assert.equal(body.mode,'data');
    assert.equal(body.aiErrorCode,'invalid-output');
  }finally{globalThis.fetch=old;}
});
test('Worker routing validates method and preserves static assets',async()=>{
  const ctx={waitUntil(){}},env={ASSETS:{fetch:()=>new Response('asset served')}};
  let r=await worker.fetch(req(),env,ctx);
  assert.equal(r.status,200);
  assert.equal((await r.json()).mode,'data');
  r=await worker.fetch(new Request('https://channelscope.example/api/opportunities'),env,ctx);
  assert.equal(r.status,405);
  r=await worker.fetch(new Request('https://channelscope.example/home'),env,ctx);
  assert.equal(await r.text(),'asset served');
});


test('Recognizes named game titles before generic hashtag words',()=>{
  assert.equal(detectTopic('Sunil Narine mystery | Cricket26 #cricketlover #gaming'),'Cricket 26');
  assert.equal(detectTopic('Wasim Akram at its prime | Cricket 26 #cricketlover'),'Cricket 26');
  assert.equal(detectTopic('007 First Light | Part 1 #firstlight #ps5'),'007 First Light');
  assert.equal(detectTopic('First Light 007 part 2 #firstlight'),'007 First Light');
  assert.equal(detectTopic('Call of Duty Modern Warfare 4 Live'),'Modern Warfare');
  assert.equal(detectTopic('World Cup Fever crazy goal #fifa #fc26'),'Football games');
  assert.equal(detectTopic('No game name #cricketlover #gaming'),'Cricket gaming');
});

test('Merges overlapping Cricket26/Cricketlover videos and resolves 007 First Light',()=>{
  const cases=[
    ['v1','Sunil Narine mystery | Cricket26 #cricketlover #cricket26',1782],
    ['v2','Wasim Akram at its prime | Cricket26 #cricketlover #ps5',1700],
    ['v3','Tim David sharp catch | Cricket26 #cricketlover #gaming',1600],
    ['v4','Kuldeep vs Kohli | Cricket26 #cricketlover',1300],
    ['v5','IPL final over | Cricket26 #cricketlover',1100],
    ['v6','007 First Light Part 1 #firstlight',4],
    ['v7','A glimpse of graphics | First Light 007 #gaming',543],
    ['v8','Call of Duty Modern Warfare Part 1 gameplay',1],
    ['v9','Call of Duty MW4 Mumbai View',2],
    ['v10','World Cup Fever crazy goal #fifa #fc26',1700],
    ['v11','FIFA ultimate team quick goal #fifa',100]
  ];
  const sample=normalizeOpportunityInput({...raw,videos:cases.map(([id,title,views])=>({
    id,title,views,publishedAt:'2026-10-15T10:00:00Z',duration:'PT1M',
    url:'https://www.youtube.com/watch?v=abcdefghijk'
  }))});
  const report=analyzeOpportunities(sample);
  const cricket=report.themes.find(x=>x.topic==='Cricket 26');
  assert.equal(cricket.count,5);
  assert.equal(cricket.measured,5);
  assert.equal(report.themes.some(x=>/Cricketlover|^Light$/.test(x.topic)),false);
  assert.equal(report.themes.find(x=>x.topic==='007 First Light').count,2);
  assert.equal(report.themes.find(x=>x.topic==='Modern Warfare').count,2);
  assert.equal(report.themes.find(x=>x.topic==='Football games').count,2);
  assert.equal(report.themes.reduce((sum,x)=>sum+x.count,0),11);
});

test('Every fallback idea has real supporting video evidence and fair comparison guidance',()=>{
  const report=analyzeOpportunities(normalizeOpportunityInput(raw));
  const ideas=fallbackIdeas(report);
  for(const idea of ideas){
    assert.equal(idea.sources.length,1);
    assert.ok(videos.some(v=>v.id===idea.sources[0].id));
    assert.ok(idea.why.includes('sampled uploads'));
    assert.match(idea.measure,/other day-7 results/);
    assert.match(idea.measure,/never with the lifetime medians/);
    assert.equal(typeof idea.sampleCount,'number');
  }
});

test('Invalid reference IDs, unrelated topics and ungrounded power-hit claims are not admitted',()=>{
  const report=analyzeOpportunities(normalizeOpportunityInput(raw));
  const ideas=validateIdeas({ideas:[
    {topic:'Modern Warfare',referenceId:'invented',title:'Modern Warfare new gameplay',hook:'A new angle.'},
    {topic:'Fortnite',referenceId:'c',title:'Fortnite predictions',hook:'See the next trend.'},
    {topic:'Cricket 26',referenceId:'d',title:'Cricket 26 Prime Power-Hit Showdown',hook:'Watch a new challenge.'},
    {topic:'Modern Warfare',referenceId:'b',title:'Modern Warfare: New Focused Gameplay',hook:'Watch the new gameplay approach.'}
  ]},report);
  assert.equal(ideas[0].topic,'Modern Warfare');
  assert.equal(ideas[0].sources[0].id,'b');
  assert.ok(ideas.every(x=>!x.title.includes('Power-Hit')));
  assert.ok(ideas.every(x=>!x.why.includes('Guaranteed')));
});

test('No source age mismatch: AI cannot override server-supplied measurement guidance',()=>{
  const report=analyzeOpportunities(normalizeOpportunityInput(raw));
  const ideas=validateIdeas({ideas:[{
    topic:'Cricket 26',referenceId:'d',title:'Cricket 26 — A New Match Format',hook:'What if we try a different match?',
    why:'Fans will keep watching longer',measure:'Compare 7-day views against 250 lifetime views'
  }]},report);
  assert.doesNotMatch(ideas[0].why,/keep watching/i);
  assert.doesNotMatch(ideas[0].measure,/250 lifetime/);
  assert.match(ideas[0].measure,/other day-7 results/);
});
