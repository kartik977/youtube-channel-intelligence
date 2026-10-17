import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeThumbnailRequest,freeThumbnailConcepts,onRequestPost} from '../functions/api/thumbnail.js';
import {THUMBNAIL_SIZES,renderThumbnail,cleanThumbnailText,thumbnailDimensions,thumbnailPalette} from '../src/thumbnailRenderer.js';
import worker from '../worker/index.js';

const input={kind:'short',style:'gaming',topic:'Cricket 26 final over challenge',
  description:'Gaming highlights and close match moments',
  channelName:'Daywalker_OP',sampleTitles:['Cricket 26 highlights']};
const req=(body=input)=>new Request('https://channelscope.example/api/thumbnail',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
});
test('Accepts valid thumbnail inputs, protects against incorrect types',()=>{
  const value=normalizeThumbnailRequest(input);
  assert.equal(value.topic,input.topic);
  assert.equal(value.kind,'short');
  assert.equal(value.sampleTitles.length,1);
  assert.throws(()=>normalizeThumbnailRequest({...input,kind:'unknown'}),/Choose Video/);
  assert.throws(()=>normalizeThumbnailRequest({...input,style:'danger'}),/supported/);
  assert.throws(()=>normalizeThumbnailRequest({...input,topic:'x'}),/at least 3/);
  assert.equal(normalizeThumbnailRequest({...input,sampleTitles:Array(20).fill('a')}).sampleTitles.length,5);
});
test('Provides three deterministic ideas for Video, Live, and Shorts at no cost',async()=>{
  for(const kind of ['video','live','short']){
    const r=await onRequestPost({request:req({...input,kind}),env:{}});
    assert.equal(r.status,200);
    const body=await r.json();
    assert.equal(body.mode,'free');
    assert.equal(body.concepts.length,3);
    assert.ok(body.concepts.every(c=>c.headline&&c.why));
    if(kind==='live')assert.match(body.concepts[0].subline,/LIVE/);
  }
  assert.equal(freeThumbnailConcepts(input).length,3);
});
test('Rejects inappropriate content types, methods, and oversized payloads',async()=>{
  const notJson=await onRequestPost({request:new Request('https://channelscope.example/api/thumbnail',{method:'POST',body:'x'}),env:{}});
  assert.equal(notJson.status,415);
  const huge=await onRequestPost({request:req({...input,unneeded:'z'.repeat(6700)}),env:{}});
  assert.equal(huge.status,413);
  const bad=await onRequestPost({request:req({...input,topic:'a'}),env:{}});
  assert.equal(bad.status,400);
  const ctx={waitUntil(){}},env={ASSETS:{fetch:()=>new Response('asset')}};
  const forbidden=await worker.fetch(new Request('https://channelscope.example/api/thumbnail'),env,ctx);
  assert.equal(forbidden.status,405);
  const ok=await worker.fetch(req(),env,ctx);
  assert.equal(ok.status,200);
  assert.equal((await ok.json()).mode,'free');
});
test('Groq mode validates and returns three structured creative concepts',async()=>{
  const original=globalThis.fetch;
  let outbound;
  globalThis.fetch=async(_url,options)=>{
    outbound=JSON.parse(options.body);
    return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({concepts:[
      {headline:'FINAL OVER CHAOS',subline:'CRICKET 26',why:'Bold moment makes the subject clear'},
      {headline:'ONE BALL LEFT',subline:'LAST CHANCE',why:'Use a split gameplay image'},
      {headline:'THE FINAL SHOT',subline:'FULL MATCH',why:'Emphasize the climactic action'}
    ]})}}]});
  };
  try {
    const r=await onRequestPost({request:req(),env:{GROQ_API_KEY:'sample',GROQ_MODEL:'openai/gpt-oss-20b'}});
    const body=await r.json();
    assert.equal(body.mode,'ai');assert.equal(body.concepts.length,3);
    assert.equal(body.concepts[0].headline,'FINAL OVER CHAOS');
    assert.equal(outbound.response_format.type,'json_object');
    assert.ok(outbound.max_completion_tokens>=1800);
  }finally{globalThis.fetch=original;}
});
test('AI failures safely return working concept templates without exposing credentials',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('SECRET KEY sample',{status:401});
  try {
    const result=await onRequestPost({request:req(),env:{GROQ_API_KEY:'sensitive-secret'}});
    const body=await result.json();
    assert.equal(body.mode,'free');assert.equal(body.aiErrorCode,'invalid-key');
    assert.doesNotMatch(JSON.stringify(body),/SECRET KEY|sensitive-secret/);
  }finally{globalThis.fetch=original;}
});
test('Renderer uses correct video/live and vertical Shorts PNG dimensions',()=>{
  const dims=(kind)=>THUMBNAIL_SIZES[kind];
  assert.deepEqual([dims('video').width,dims('video').height],[1280,720]);
  assert.deepEqual([dims('live').width,dims('live').height],[1280,720]);
  assert.deepEqual([dims('short').width,dims('short').height],[1080,1920]);
  assert.deepEqual(thumbnailDimensions('invalid'),dims('video'));
  assert.equal(thumbnailPalette('missing').label,'Gaming');
  assert.equal(cleanThumbnailText('  A\n B   C  '),'A B C');
  const gradient=()=>({addColorStop(){}});
  const mockCtx={
    setTransform(){},clearRect(){},createLinearGradient:gradient,createRadialGradient:gradient,
    fillRect(){},save(){},restore(){},translate(){},rotate(){},strokeRect(){},beginPath(){},
    roundRect(){},fill(){},stroke(){},measureText(s){return {width:s.length*24}},
    fillText(){},clip(){},drawImage(){},
  };
  const canvas={width:0,height:0,getContext:()=>mockCtx};
  for(const kind of ['video','live','short']){
    for(const layout of [0,1,2]){
      renderThumbnail(canvas,{kind,style:'gaming',layout,headline:'CRICKET 26 FINAL OVER',subline:'MOST EXCITING MATCH',channel:'Daywalker_OP'});
      assert.equal(canvas.width,dims(kind).width);
      assert.equal(canvas.height,dims(kind).height);
    }
  }
});
