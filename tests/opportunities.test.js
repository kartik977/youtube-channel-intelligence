import assert from 'node:assert/strict';
import {test} from 'node:test';
import {videoSeconds,normalizeOpportunityInput,analyzeOpportunities,fallbackIdeas} from '../functions/api/opportunity-analysis.js';
import {onRequestPost} from '../functions/api/opportunities.js';
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
        {topic:'Modern Warfare',title:'Modern Warfare: Part 3 with a fresh angle',hook:'Here is the focus of this session.',why:'A recurring sampled topic.',measure:'Track day-7 views.'},
        {topic:'Unseen Fortnite',title:'FORTNITE GOES VIRAL',hook:'...',why:'Guaranteed viral trend.',measure:'100% growth'},
        {topic:'Cricket 26',title:'Cricket 26: Mini Highlight',hook:'Watch this interesting moment.',why:'Cricket 26 recurs in the sample.',measure:'Compare day-7 views'}
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
