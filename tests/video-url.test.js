import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {parseYouTubeVideo,summarizeVideo,onRequestGet} from '../functions/api/video.js';
import worker from '../worker/index.js';
import {normalizeBrief,freeVideoPack} from '../functions/api/video-optimizer.js';

const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
const id='inPa2Ve-vgI';
const request=(input)=>new Request('https://channelscope.example/api/video?input='+encodeURIComponent(input));
const context=(input,key='SAMPLE_KEY')=>({request:request(input),env:key?{YOUTUBE_API_KEY:key}:{},waitUntil(){}});
const publicVideo={
 id,
 snippet:{
  title:'Live MW4: Paris Drop',description:'Playing Call of Duty Modern Warfare in Paris on PS5.',
  channelTitle:'Daywalker_OP',publishedAt:'2026-10-15T10:00:00Z',
  liveBroadcastContent:'none'
 },
 liveStreamingDetails:{actualStartTime:'2026-10-15T10:00:00Z',actualEndTime:'2026-10-15T13:00:00Z'},
 contentDetails:{duration:'PT3H'}
};
test('Parses watch, live, shorts, embed, shortened, mobile, and raw ID URLs',()=>{
 const supported=[
  'https://www.youtube.com/live/inPa2Ve-vgI?si=2A85LBUmWCU7zGHc',
  'https://youtube.com/watch?v=inPa2Ve-vgI&t=123',
  'www.youtube.com/shorts/inPa2Ve-vgI',
  'https://youtu.be/inPa2Ve-vgI?t=1',
  'youtu.be/inPa2Ve-vgI',
  'https://m.youtube.com/watch?v=inPa2Ve-vgI',
  'https://www.youtube-nocookie.com/embed/inPa2Ve-vgI',
  'https://music.youtube.com/watch?v=inPa2Ve-vgI',
  'inPa2Ve-vgI'
 ];
 for(const input of supported) assert.equal(parseYouTubeVideo(input).id,id,input);
 assert.equal(parseYouTubeVideo('https://www.youtube.com/shorts/'+id).shortUrl,true);
 assert.equal(parseYouTubeVideo('https://www.youtube.com/live/'+id).shortUrl,false);
});
test('Rejects arbitrary hosts, invalid IDs, playlists, and misleading URL paths',()=>{
 const rejected=[
  '', 'https://youtube.com.evil.com/watch?v='+id,
  'https://evil.test/watch?v='+id,
  'https://www.youtube.com/playlist?list=PLtest',
  'https://www.youtube.com/@creator',
  'https://www.youtube.com/watch?v=abc',
  'https://youtu.be/'+id+'/other',
  'ftp://youtube.com/watch?v='+id,
  'https://youtube.com@evil.test/watch?v='+id,
  'https://bad.test/#youtube.com/watch?v='+id,
 ];
 for(const input of rejected)assert.throws(()=>parseYouTubeVideo(input),Error,input);
});
test('Fetches public video metadata once with a fixed Google API endpoint',async()=>{
 const calls=[];
 globalThis.fetch=async url=>{
  calls.push(new URL(url));
  return Response.json({items:[publicVideo]});
 };
 const r=await onRequestGet(context('https://youtube.com/live/'+id+'?si=example'));
 assert.equal(r.status,200);
 const data=await r.json();
 assert.equal(data.id,id);
 assert.equal(data.title,'Live MW4: Paris Drop');
 assert.equal(data.description,'Playing Call of Duty Modern Warfare in Paris on PS5.');
 assert.equal(data.channelTitle,'Daywalker_OP');
 assert.equal(data.kind,'live');
 assert.equal(data.liveStatus,'ended');
 assert.equal(data.url,'https://www.youtube.com/watch?v='+id);
 assert.equal(calls.length,1);
 assert.equal(calls[0].origin,'https://www.googleapis.com');
 assert.equal(calls[0].pathname,'/youtube/v3/videos');
 assert.equal(calls[0].searchParams.get('part'),'snippet,contentDetails,liveStreamingDetails');
 assert.equal(calls[0].searchParams.get('id'),id);
 assert.equal(calls[0].searchParams.get('key'),'SAMPLE_KEY');
 assert.doesNotMatch(JSON.stringify(data),/SAMPLE_KEY/);
});
test('Detects an ongoing or upcoming livestream from YouTube public metadata',()=>{
 const current=summarizeVideo({...publicVideo,liveStreamingDetails:{actualStartTime:'2026-10-15T10:00:00Z'},
  snippet:{...publicVideo.snippet,liveBroadcastContent:'live'}},id);
 assert.equal(current.kind,'live');assert.equal(current.liveStatus,'live');
 const upcoming=summarizeVideo({...publicVideo,liveStreamingDetails:undefined,
  snippet:{...publicVideo.snippet,liveBroadcastContent:'upcoming'}},id);
 assert.equal(upcoming.kind,'live');assert.equal(upcoming.liveStatus,'upcoming');
 const shorts=summarizeVideo({...publicVideo,liveStreamingDetails:undefined},id,true);
 assert.equal(shorts.kind,'short');
 assert.equal(shorts.shortUrl,true);
 const ordinary=summarizeVideo({...publicVideo,liveStreamingDetails:undefined},id,false);
 assert.equal(ordinary.kind,'video');
 assert.match(ordinary.note,/Shorts flag/);
});
test('Truncates overlong description and does not expose provider private fields',()=>{
 const metadata=summarizeVideo({...publicVideo,snippet:{
  ...publicVideo.snippet,description:'A'.repeat(2000),title:'B'.repeat(300),channelTitle:'C'.repeat(300)
 }},id);
 assert.equal(metadata.description.length,650);
 assert.equal(metadata.descriptionTruncated,true);
 assert.equal(metadata.title.length,120);
 assert.equal(metadata.channelTitle.length,100);
});
test('Video unavailable, absent secret, API access denied and quota errors are explained',async()=>{
 let r=await onRequestGet(context('https://youtu.be/'+id,''));
 assert.equal(r.status,503);
 globalThis.fetch=async()=>Response.json({items:[]});
 r=await onRequestGet(context(id));assert.equal(r.status,404);
 globalThis.fetch=async()=>new Response(JSON.stringify({error:{errors:[{reason:'quotaExceeded'}]}}),{status:403});
 r=await onRequestGet(context(id));assert.equal(r.status,429);
 globalThis.fetch=async()=>new Response(JSON.stringify({error:{errors:[{reason:'forbidden'}]}}),{status:403});
 r=await onRequestGet(context(id));assert.equal(r.status,502);
});
test('Worker routes video lookup GET and leaves other routes and assets untouched',async()=>{
 globalThis.fetch=async()=>Response.json({items:[publicVideo]});
 const env={YOUTUBE_API_KEY:'KEY',ASSETS:{fetch:()=>new Response('Asset works')}};
 const ctx={waitUntil(){}};
 let r=await worker.fetch(request('https://youtu.be/'+id),env,ctx);
 assert.equal(r.status,200);
 assert.equal((await r.json()).kind,'live');
 r=await worker.fetch(new Request('https://channelscope.example/api/video',{method:'POST'}),env,ctx);
 assert.equal(r.status,405);
 r=await worker.fetch(new Request('https://channelscope.example/'),env,ctx);
 assert.equal(r.status,200);
 assert.equal(await r.text(),'Asset works');
 r=await worker.fetch(new Request('https://channelscope.example/api/unknown'),env,ctx);
 assert.equal(r.status,404);
});
test('Optimizer accepts public metadata context but does not claim private footage access',()=>{
 const brief=normalizeBrief({
  kind:'live',tone:'clear',topic:publicVideo.snippet.title,
  description:publicVideo.snippet.description,channelName:publicVideo.snippet.channelTitle,
  sourceVideo:{id,channelTitle:'Daywalker_OP',liveStatus:'ended'}
 });
 assert.equal(brief.sourceVideo.id,id);
 assert.equal(brief.sourceVideo.channelTitle,'Daywalker_OP');
 assert.equal(freeVideoPack(brief).mode,'free');
 assert.match(freeVideoPack(brief).note,/public metadata/);
 const untrusted=normalizeBrief({
  kind:'video',tone:'clear',topic:'Cricket 26 highlights',
  sourceVideo:{id:'not a valid id',channelTitle:'anything'}
 });
 assert.equal(untrusted.sourceVideo,null);
});
