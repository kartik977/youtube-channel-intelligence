import assert from 'node:assert/strict';
import {test} from 'node:test';
import {safeCaption} from '../functions/api/instagram-quality.js';
import {normalizeInstagramBrief,freeInstagramPack,validateInstagramAI} from '../functions/api/instagram.js';
import {normalizeSocialBrief,freeSocialPack,validateSocialAI,onRequestPost} from '../functions/api/social-pack.js';
import worker from '../worker/index.js';

const description='A Halloween decor video in Plano, Texas with colorful lights and ghostly figures.';
const common={description,topic:'Halloween decorations in Plano',audience:'Halloween fans',tone:'friendly',profile:'creator',format:'reel'};
const req=body=>new Request('https://channelscope.example/api/social-pack',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
});
const instagramKind=kind=>normalizeInstagramBrief({...common,kind});

test('Caption grounding rejects invented creator filming or event attendance, accepts creator-stated actions',()=>{
  const b=instagramKind('caption');
  assert.equal(safeCaption('I just filmed a Halloween decor Reel in Plano 👻',b),null);
  assert.equal(safeCaption('We visited a Halloween event in Plano',b),null);
  assert.ok(safeCaption('Halloween decor in Plano, Texas with ghostly lights 👻',b));
  const specified=normalizeInstagramBrief({...common,kind:'caption',description:'I filmed a Halloween decor Reel in Plano'});
  assert.ok(safeCaption('I just filmed a Halloween decor Reel in Plano 👻',specified));
});

test('Caption Generator and Hashtag Generator share identical recommended tags for one brief',()=>{
  const c=instagramKind('caption'),h=instagramKind('hashtags');
  const caption=freeInstagramPack(c);
  const hashtags=freeInstagramPack(h);
  assert.deepEqual(caption.captions[0].hashtags,hashtags.hashtags.filter(x=>x.priority==='recommended').map(x=>x.tag));
  const response=validateInstagramAI({captions:[
    {label:'One',text:'Halloween decor in Plano! 👻',hashtags:['#PlanoSpooky','#HalloweenDIY']},
    {label:'Two',text:'Ghostly figures and Halloween lights in Plano. 🎃',hashtags:['#GhostlyNight','#PlanoHalloween']},
    {label:'Three',text:'Halloween season and spooky decor in Plano! ✨',hashtags:['#SpookySeason','#PlanoEvents']}
  ]},c,caption);
  assert.equal(response.mode,'ai');
  for(const draft of response.captions)assert.deepEqual(draft.hashtags,caption.captions[0].hashtags);
});

test('Cross-platform free pack creates distinct drafts, consistent hashtags and short titles',()=>{
  const b=normalizeSocialBrief(common);
  const result=freeSocialPack(b);
  assert.equal(result.mode,'free');
  assert.equal(result.instagram.format,'Reel');
  assert.equal(result.youtube.format,'Short');
  assert.ok(Array.from(result.youtube.title).length<=100);
  assert.ok(result.instagram.caption.length>10);
  assert.ok(result.youtube.description.length>15);
  assert.notEqual(result.instagram.caption,result.youtube.description);
  assert.deepEqual(result.instagram.hashtags,
    freeInstagramPack(instagramKind('caption')).captions[0].hashtags);
  assert.ok(result.youtube.hashtags.includes('#Shorts'));
  assert.doesNotMatch(JSON.stringify(result),/guarantee|trending now/i);
});

test('Cross-platform AI validation replaces unverified first-person claims and preserves other useful copy',()=>{
  const b=normalizeSocialBrief(common),backup=freeSocialPack(b);
  const model={
    instagram:{caption:'I just filmed a Halloween decor Reel in Plano! 🎃'},
    youtube:{
      title:'Halloween decorations in Plano Texas | Spooky lights',
      description:'A look at Halloween decor and ghostly figures in Plano, Texas.',
      hook:'Spooky Halloween decorations in Plano, Texas!'
    }
  };
  const result=validateSocialAI(model,b,backup);
  assert.equal(result.mode,'hybrid');
  assert.equal(result.instagram.caption,backup.instagram.caption);
  assert.equal(result.youtube.title,model.youtube.title);
  assert.equal(result.youtube.description,model.youtube.description);
  assert.deepEqual(result.instagram.hashtags,backup.instagram.hashtags);
  assert.ok(result.youtube.hashtags.includes('#Shorts'));
});

test('Cross-platform AI accepts accurate output and rejects unrelated responses',()=>{
  const b=normalizeSocialBrief(common),backup=freeSocialPack(b);
  const result=validateSocialAI({
    instagram:{caption:'Halloween lights and ghostly figures around Plano 👻✨'},
    youtube:{
      title:'Halloween Decorations in Plano Texas | Ghostly Lights',
      description:'Halloween decorations and spooky lights in Plano, Texas.',
      hook:'Halloween lights and ghostly figures in Plano!'
    }
  },b,backup);
  assert.equal(result.mode,'ai');
  assert.throws(()=>validateSocialAI({
    instagram:{caption:'I just filmed unrelated footage'},
    youtube:{title:'Secret recipe for pizza',description:'Unrelated travel advice',hook:'Learn to bake pancakes'}
  },b,backup),/incomplete/);
});

test('No-key Social Publishing route works and validates input',async()=>{
  let result=await onRequestPost({request:req(common),env:{}});
  assert.equal(result.status,200);
  const pack=await result.json();
  assert.equal(pack.mode,'free');
  assert.ok(pack.instagram.hashtags.length>=3);
  assert.ok(pack.youtube.hashtags.length>=2);
  result=await onRequestPost({request:req({...common,description:'hi'}),env:{}});
  assert.equal(result.status,400);
  result=await onRequestPost({request:new Request('https://channelscope.example/api/social-pack',{method:'POST',body:'plain'}),env:{}});
  assert.equal(result.status,415);
  result=await onRequestPost({request:req({...common,unnecessary:'x'.repeat(9000)}),env:{}});
  assert.equal(result.status,413);
});

test('Groq returns safe cross-platform publishing pack without exposing secret',async()=>{
  const prev=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,opts)=>{
    calls++;
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(opts.headers.Authorization,'Bearer private-social');
    return Response.json({choices:[{message:{content:JSON.stringify({
      instagram:{caption:'Halloween decor lights in Plano with ghostly figures 👻'},
      youtube:{
        title:'Halloween decorations in Plano | Ghostly Lights',
        description:'Halloween lights and ghostly figures on display in Plano, Texas.',
        hook:'Look at these Halloween lights and ghostly figures in Plano!'
      }
    })}}]});
  };
  try{
    const response=await onRequestPost({request:req(common),env:{GROQ_API_KEY:'private-social'}});
    const result=await response.json();
    assert.equal(response.status,200);
    assert.equal(result.mode,'ai');
    assert.equal(calls,1);
    assert.doesNotMatch(JSON.stringify(result),/private-social/);
  }finally{globalThis.fetch=prev;}
});

test('Groq rate limit preserves free functionality',async()=>{
  const prev=globalThis.fetch;
  globalThis.fetch=async()=>new Response('sensitive provider details',{status:429});
  try{
    const response=await onRequestPost({request:req(common),env:{GROQ_API_KEY:'private-social'}});
    const data=await response.json();
    assert.equal(data.mode,'free');
    assert.equal(data.aiErrorCode,'rate-limit');
    assert.doesNotMatch(JSON.stringify(data),/private-social|sensitive provider details/);
  }finally{globalThis.fetch=prev;}
});

test('Worker routes new POST and preserves Instagram and static assets',async()=>{
  const env={ASSETS:{fetch:()=>new Response('static asset')}},ctx={waitUntil(){}};
  let response=await worker.fetch(req(common),env,ctx);
  assert.equal(response.status,200);
  assert.equal((await response.json()).mode,'free');
  response=await worker.fetch(new Request('https://channelscope.example/api/social-pack'),env,ctx);
  assert.equal(response.status,405);
  response=await worker.fetch(new Request('https://channelscope.example/home'),env,ctx);
  assert.equal(await response.text(),'static asset');
  response=await worker.fetch(new Request('https://channelscope.example/api/instagram'),env,ctx);
  assert.equal(response.status,405);
});
