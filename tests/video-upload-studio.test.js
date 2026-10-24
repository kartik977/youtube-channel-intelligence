import assert from 'node:assert/strict';
import {test} from 'node:test';
import {onRequestPost,freeVideoPack,validateVideoBrief,normalizeVisionOutput} from '../functions/api/video-upload-studio.js';
import worker from '../worker/index.js';
import {sampleTimestamps,videoOrientation,formatVideoDuration} from '../src/video-frame-utils.js';

const frame='data:image/jpeg;base64,'+Buffer.from('pretend jpeg').toString('base64');
const base={title:'A PS5 gameplay highlight',description:'A real goal moment in a PS5 football game.',
 duration:22,width:1080,height:1920,tone:'friendly',frames:[frame,frame,frame]};
const req=(body)=>new Request('https://channelscope.test/api/video-upload-studio',{
 method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
});
const model={
 observed:'A gameplay scene is visible in the sampled frames, with an on-screen game interface.',
 instagram:{
  captions:['A PS5 moment worth sharing! ⚽','What a gaming highlight — which part caught your eye?'],
  hashtags:['#PS5','#Gaming','#InstagramReels','#Gameplay','#GamingClips'],
  hook:'Watch this gameplay moment.',
  editingTips:['Show the action early.','Keep the overlay visible.','Use vertical-safe framing.']
 },
 youtube:{
  titles:['PS5 Gameplay Highlight | Short','An In-Game Football Moment','This PS5 Gaming Clip'],
  description:'A moment from a PS5 football game. Watch and tell us what you noticed.',
  hashtags:['#Shorts','#PS5','#Gaming'],
  hooks:['What happens in this PS5 moment?','Look at the gameplay.'],
  editingTips:['Start with a clear action shot.','Add readable text.','Keep the pacing tight.']
 }
};
test('Samples three different timestamps with short and long videos',()=>{
 assert.deepEqual(sampleTimestamps(10),[1.3,5,8.7]);
 assert.equal(sampleTimestamps(2).length,3);
 assert.throws(()=>sampleTimestamps(0),/between 1 second and 2 hours/);
 assert.equal(videoOrientation(1080,1920),'Vertical');
 assert.equal(videoOrientation(1920,1080),'Horizontal');
 assert.equal(videoOrientation(1000,1000),'Square');
 assert.equal(formatVideoDuration(65),'01:05');
});
test('Strict frame count, small JPEG-only images, file metadata and text fallback',()=>{
 assert.equal(validateVideoBrief(base).frames.length,3);
 assert.throws(()=>validateVideoBrief({...base,frames:[frame,frame,frame,frame]}),/at most three/);
 assert.throws(()=>validateVideoBrief({...base,frames:['data:image/png;base64,AAA=']}),/small JPEG/);
 assert.throws(()=>validateVideoBrief({...base,frames:['https://example.com/a.jpg']}),/small JPEG/);
 assert.throws(()=>validateVideoBrief({...base,frames:[frame+'A'.repeat(220000)]}),/small JPEG/);
 assert.throws(()=>validateVideoBrief({...base,duration:9000}),/2 hours/);
 assert.throws(()=>validateVideoBrief({...base,width:0}),/dimensions/);
 assert.throws(()=>validateVideoBrief({...base,frames:[],description:'too short'}),/12 characters/);
 assert.equal(validateVideoBrief({...base,frames:[]}).frames.length,0);
});
test('Vision normalization keeps two distinct platform packs with useful copy',()=>{
 const result=normalizeVisionOutput(model,validateVideoBrief(base));
 assert.equal(result.mode,'ai');
 assert.equal(result.analyzedFrames,true);
 assert.equal(result.instagram.captions.length,2);
 assert.equal(result.youtube.titles.length,3);
 assert.equal(result.youtube.hooks.length,2);
 assert.equal(result.instagram.hashtags.length,5);
 assert.match(result.observed,/gameplay/);
 assert.match(result.note,/not the full video or audio/i);
 assert.equal(freeVideoPack(validateVideoBrief(base)).analyzedFrames,false);
 assert.throws(()=>normalizeVisionOutput({instagram:{captions:[]},youtube:{titles:[]}},base),/incomplete/);
});
test('No Groq key returns honest text-only fallback and never calls AI',async()=>{
 const r=await onRequestPost({request:req(base),env:{}});
 assert.equal(r.status,200);
 const response=await r.json();
 assert.equal(response.mode,'free');
 assert.equal(response.analyzedFrames,false);
 assert.equal(response.reasonCode,'no_key');
 assert.match(response.note,/written brief only/);
 assert.match(response.observed,/not video footage/);
});
test('No sampled frames never claims AI video analysis',async()=>{
 const r=await onRequestPost({request:req({...base,frames:[]}),env:{GROQ_API_KEY:'secret'}});
 const v=await r.json();
 assert.equal(v.mode,'free');assert.equal(v.reasonCode,'no_frames');
});
test('Vision API sends exactly sampled frames to correct image model and returns distinct packs',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
   assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
   assert.equal(options.headers.Authorization,'Bearer secret');
   const body=JSON.parse(options.body);
   assert.equal(body.model,'qwen/qwen3.8-27b');
   const parts=body.messages[1].content;
   assert.equal(parts.length,4);
   assert.equal(parts.filter(x=>x.type==='image_url').length,3);
   assert.ok(parts.slice(1).every(x=>x.image_url.url===frame));
   return Response.json({choices:[{message:{content:JSON.stringify(model)}}]});
 };
 try{
   const r=await onRequestPost({request:req(base),env:{GROQ_API_KEY:'secret'}});
   const data=await r.json();
   assert.equal(r.status,200);
   assert.equal(data.mode,'ai');
   assert.equal(data.analyzedFrames,true);
   assert.equal(data.youtube.titles[0],model.youtube.titles[0]);
   assert.doesNotMatch(JSON.stringify(data),/secret/);
 }finally{globalThis.fetch=previous;}
});
test('Unsupported vision access and malformed responses fail gracefully without leaking data',async()=>{
 const previous=globalThis.fetch;
 try{
   globalThis.fetch=async()=>new Response('No premium access',{status:429});
   let response=await (await onRequestPost({request:req(base),env:{GROQ_API_KEY:'secret'}})).json();
   assert.equal(response.mode,'free');assert.equal(response.reasonCode,'rate_limited');
   assert.doesNotMatch(JSON.stringify(response),/No premium access/);
   globalThis.fetch=async()=>Response.json({choices:[{message:{content:'not json'}}]});
   response=await (await onRequestPost({request:req(base),env:{GROQ_API_KEY:'secret'}})).json();
   assert.equal(response.mode,'free');assert.equal(response.reasonCode,'incomplete_response');
   globalThis.fetch=async()=>new Response('model not available',{status:404});
   response=await (await onRequestPost({request:req(base),env:{GROQ_API_KEY:'secret'}})).json();
   assert.equal(response.reasonCode,'model_unavailable');
 }finally{globalThis.fetch=previous;}
});
test('API rejects large, missing, or non-JSON uploads and preserves other Worker routes',async()=>{
 let response=await onRequestPost({request:new Request('https://a.test/api/video-upload-studio',{method:'POST',body:'not-json'}),env:{}});
 assert.equal(response.status,415);
 response=await onRequestPost({request:req({...base,frames:['data:image/jpeg;base64,'+'A'.repeat(210000)]}),env:{}});
 assert.equal(response.status,400);
 response=await onRequestPost({request:req({...base,description:'x'.repeat(750000)}),env:{}});
 // Inputs longer than allowed are truncated after transport-size checks.
 assert.equal(response.status,413);
 const env={ASSETS:{fetch:()=>new Response('static app')}},ctx={waitUntil(){}};
 response=await worker.fetch(req({...base,frames:[]}),env,ctx);
 assert.equal(response.status,200);
 response=await worker.fetch(new Request('https://channelscope.test/api/video-upload-studio'),env,ctx);
 assert.equal(response.status,405);
 response=await worker.fetch(new Request('https://channelscope.test/'),env,ctx);
 assert.equal(await response.text(),'static app');
});
test('Video Studio is reachable via Creator Tools and visible from the welcome page',async()=>{
 const {readFileSync}=await import('node:fs');
 const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
 const welcome=readFileSync(new URL('../src/WelcomeHome.jsx',import.meta.url),'utf8');
 const routing=readFileSync(new URL('../src/workspace-routing.js',import.meta.url),'utf8');
 assert.match(main,/tab==='upload'&&<VideoUploadStudio\/>/);
 assert.match(main,/onUpload=\{\(\)=>switchTab\('upload'\)\}/);
 assert.match(welcome,/Analyze my video/);
 assert.match(routing,/upload:'video-upload-studio'/);
 const editor=readFileSync(new URL('../src/VideoUploadStudio.jsx',import.meta.url),'utf8');
 assert.match(editor,/captureVideoFrames\(url\)/);
 assert.match(editor,/Original stays local/);
 assert.match(editor,/frames:frames\.frames/);
 assert.match(editor,/navigator\.clipboard\.writeText/);
});
