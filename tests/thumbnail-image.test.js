import assert from 'node:assert/strict';
import {test} from 'node:test';
import worker from '../worker/index.js';
import {normalizeImageRequest,buildImagePrompt,onRequestPost} from '../functions/api/thumbnail-image.js';
import {paintGeneratedThumbnail} from '../src/aiImageCanvas.js';
const secrets={OPENAI_API_KEY:'fake-openai-private-api-key',THUMBNAIL_ACCESS_CODE:'long-private-generation-secret'};
function req(input={},pass=secrets.THUMBNAIL_ACCESS_CODE){
 const data=new FormData();
 for(const [k,v] of Object.entries({kind:'live',style:'gaming',direction:'cinematic',topic:'Modern Warfare Paris mission',description:'Night combat in rainy Paris',...input})){
   if(v!==null)data.set(k,v);
 }
 return new Request('https://channelscope.example/api/thumbnail-image',{
   method:'POST',headers:{'x-thumbnail-access-code':pass},body:data
 });
}
test('Thumbnail prompt is topic-specific and reserves readable overlay space',()=>{
 const normalized=normalizeImageRequest({kind:'live',style:'gaming',direction:'cinematic',topic:'Paris mission Part Two',description:'Rainy night scene'});
 const prompt=buildImagePrompt(normalized);
 assert.match(prompt,/Paris mission Part Two/);
 assert.match(prompt,/Rainy night scene/);
 assert.match(prompt,/Do NOT render letters/);
 assert.match(prompt,/livestream cover/);
 assert.match(buildImagePrompt(normalized,true),/reference screenshot/);
 assert.throws(()=>normalizeImageRequest({...normalized,kind:'invalid'}),/Select Video/);
 assert.throws(()=>normalizeImageRequest({...normalized,topic:'a'}),/three characters/);
});
test('Paid API refuses missing secrets and wrong access code before upstream call',async()=>{
 let calls=0;
 const original=globalThis.fetch;
 globalThis.fetch=async()=>{calls++;throw Error('should not call');};
 try{
   let res=await onRequestPost({request:req(),env:{}});
   assert.equal(res.status,503);
   assert.match((await res.json()).error,/not set up/);
   res=await onRequestPost({request:req({},'bad-passcode'),env:secrets});
   assert.equal(res.status,403);
   assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('Paid generation calls OpenAI once, uses one image, and returns safe base64 content',async()=>{
 const original=globalThis.fetch;
 let seen=[];
 globalThis.fetch=async(url,init)=>{
   seen.push({url,init});
   return Response.json({data:[{b64_json:Buffer.from('mock-artwork-bytes-for-image-service').toString('base64')}]});
 };
 try{
   const res=await onRequestPost({request:req(),env:secrets});
   assert.equal(res.status,200);
   const body=await res.json();
   assert.equal(body.mode,'openai');
   assert.equal(body.kind,'live');
   assert.equal(seen.length,1);
   assert.equal(seen[0].url,'https://api.openai.com/v1/images/generations');
   assert.equal(seen[0].init.headers.Authorization,'Bearer '+secrets.OPENAI_API_KEY);
   const payload=JSON.parse(seen[0].init.body);
   assert.equal(payload.model,'gpt-image-2.5-flare');
   assert.equal(payload.quality,'medium');
   assert.equal(payload.n,1);
   assert.equal(payload.output_format,'webp');
   assert.equal(payload.size,'1536x864');
   assert.match(payload.prompt,/Paris/);
   assert.doesNotMatch(JSON.stringify(body),/fake-openai-private-api-key|generation-secret/);
 }finally{globalThis.fetch=original;}
});
test('Reference upload switches to image editing while keeping file on server',async()=>{
 const original=globalThis.fetch;
 let call;
 globalThis.fetch=async(url,init)=>{
   call={url,init};
   return Response.json({data:[{b64_json:Buffer.from('mock-artwork-bytes-for-image-edit').toString('base64')}]});
 };
 try{
   const file=new File([new Uint8Array([137,80,78,71])],'screen.png',{type:'image/png'});
   const res=await onRequestPost({request:req({reference:file,kind:'short'}),env:secrets});
   assert.equal(res.status,200);
   assert.equal(call.url,'https://api.openai.com/v1/images/edits');
   assert.equal(call.init.body.get('size'),'1088x1920');
   assert.equal(call.init.body.get('n'),null);
   assert.equal(call.init.body.get('image').name,'screen.png');
   assert.equal(call.init.headers.Authorization,'Bearer '+secrets.OPENAI_API_KEY);
 }finally{globalThis.fetch=original;}
});
test('Provider error is sanitized and no image output is misrepresented',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({error:'private-provider-error-do-not-forward'}),{status:401});
 try{
   const res=await onRequestPost({request:req(),env:secrets});
   assert.equal(res.status,502);
   const body=await res.json();
   assert.match(body.error,/OPENAI_API_KEY/);
   assert.doesNotMatch(JSON.stringify(body),/private-provider-error|fake-openai/);
 }finally{globalThis.fetch=original;}
});
test('Worker routes only POST to guarded image generation and preserves old API routes',async()=>{
 const env={...secrets,ASSETS:{fetch:()=>new Response('UI')}};
 const ctx={waitUntil(){}};
 const fail=await worker.fetch(new Request('https://channelscope.example/api/thumbnail-image'),env,ctx);
 assert.equal(fail.status,405);
 const noAuth=await worker.fetch(req({},'wrong'),env,ctx);
 assert.equal(noAuth.status,403);
 const assets=await worker.fetch(new Request('https://channelscope.example/'),env,ctx);
 assert.equal(assets.status,200);
});
test('Generated image canvas exports at exactly Video, Live or Short dimensions',()=>{
 const gradient={addColorStop(){}};
 const ctx={
   drawImage(){},createLinearGradient(){return gradient;},fillRect(){},fillText(){},
   measureText(text){return{width:text.length*28};},save(){},restore(){},
 };
 const canvas={width:0,height:0,getContext:()=>ctx};
 const img={naturalWidth:1536,naturalHeight:864};
 paintGeneratedThumbnail(canvas,img,{kind:'video',headline:'THE FINAL MISSION',subline:'WATCH NOW'});
 assert.deepEqual([canvas.width,canvas.height],[1280,720]);
 paintGeneratedThumbnail(canvas,img,{kind:'live',headline:'LIVE FROM PARIS',showText:true});
 assert.deepEqual([canvas.width,canvas.height],[1280,720]);
 paintGeneratedThumbnail(canvas,img,{kind:'short',headline:'TOP PLAY',showText:false});
 assert.deepEqual([canvas.width,canvas.height],[1080,1920]);
});
