import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeInstagramBrief,freeInstagramPack,validateInstagramAI,relevantTag,safeBio,onRequestPost,fallbackCaptions} from '../functions/api/instagram.js';
import worker from '../worker/index.js';

const bio={
  kind:'bio',tone:'friendly',profile:'creator',format:'post',
  description:'I create PS5 gaming and Cricket 26 livestream content for casual gamers.',
  audience:'PS5 gamers and cricket fans',name:'Daywalker_OP'
};
const tagBrief={...bio,kind:'hashtags',format:'reel'};
function request(body){
  return new Request('https://channelscope.example/api/instagram',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
  });
}
test('Description is required; invalid generator mode and tone are rejected',()=>{
  const item=normalizeInstagramBrief(bio);
  assert.equal(item.kind,'bio');
  assert.equal(item.name,'Daywalker_OP');
  assert.throws(()=>normalizeInstagramBrief({...bio,kind:'other'}),/Choose Bio/);
  assert.throws(()=>normalizeInstagramBrief({...bio,tone:'viral'}),/supported tone/);
  assert.throws(()=>normalizeInstagramBrief({...bio,description:'wow'}),/at least 8/);
  assert.throws(()=>normalizeInstagramBrief({...bio,format:'live'}),/Post or Reel/);
  assert.equal(normalizeInstagramBrief({...bio,description:'A'.repeat(1000)}).description.length,850);
});
test('Free Instagram bio generator makes three truthful, <=150-character options',()=>{
  const report=freeInstagramPack(normalizeInstagramBrief(bio));
  assert.equal(report.mode,'free');assert.equal(report.kind,'bio');
  assert.equal(report.bios.length,3);
  for(const option of report.bios){
    assert.ok(option.characters<=150,option.text);
    assert.equal(Array.from(option.text).length,option.characters);
    assert.ok(option.text.trim());
    assert.doesNotMatch(option.text,/award.winning|certified|1 million/i);
  }
});
test('Free Instagram hashtag generator chooses specific creator niche, no bogus viral claims',()=>{
  const report=freeInstagramPack(normalizeInstagramBrief(tagBrief));
  assert.equal(report.kind,'hashtags');
  assert.equal(report.mode,'free');
  assert.ok(report.hashtags.length>=5,JSON.stringify(report.hashtags));
  assert.ok(report.hashtags.every(x=>x.tag.startsWith('#')));
  assert.ok(report.hashtags.every(x=>!/#viral|#trending|#explore/i.test(x.tag)));
  assert.equal(new Set(report.hashtags.map(x=>x.tag.toLowerCase())).size,report.hashtags.length);
  assert.ok(report.hashtags.some(x=>x.tag==='#GamingCreator'||x.tag==='#Gameplay'));
  assert.ok(report.hashtags.filter(x=>x.priority==='recommended').length<=5);
  assert.ok(relevantTag('#PS5Gaming',tagBrief));
  assert.equal(relevantTag('#Viral',tagBrief),false);
  assert.equal(relevantTag('#Baking',tagBrief),false);
});
test('Rejects invented qualifications and bios longer than 150 characters',()=>{
  assert.equal(safeBio('Award-winning gamer with 1 million subscribers',bio),null);
  assert.equal(safeBio('a'.repeat(151),bio),null);
  const text=safeBio('🎮 PS5 gaming\n🏏 Cricket 26\nCome hang out!',bio);
  assert.ok(text.includes('\n'));
  assert.equal(Array.from(text).length,40);
});
test('AI Bio suggestions are character-limited and fallback fills partial response',()=>{
  const brief=normalizeInstagramBrief(bio),backup=freeInstagramPack(brief);
  const report=validateInstagramAI({bios:[
    {label:'Gaming',text:'🎮 Gaming and Cricket 26\nJoin my community!'},
    {label:'Fraudulent',text:'Certified award-winning worldwide creator'},
    {label:'Too long',text:'X'.repeat(170)}
  ]},brief,backup);
  assert.equal(report.mode,'hybrid');
  assert.equal(report.bios.length,3);
  assert.equal(report.bios[0].label,'Gaming');
  assert.ok(report.bios.every(x=>x.characters<=150));
  assert.ok(!report.bios.some(x=>x.text.includes('Certified')));
});
test('AI hashtags cannot add irrelevant or spammy tags',()=>{
  const brief=normalizeInstagramBrief(tagBrief),backup=freeInstagramPack(brief);
  const result=validateInstagramAI({hashtags:[
    {tag:'#GamingCreator',reason:'For gaming creators'},
    {tag:'#GamingCommunity',reason:'Shared niche'},
    {tag:'#Cricket26',reason:'Named game'},
    {tag:'#Gameplay',reason:'Type of content'},
    {tag:'#PS5Gaming',reason:'Console gaming'},
    {tag:'#BakingTips',reason:'Unrelated'},
    {tag:'#FYP',reason:'Generic spam'}
  ]},brief,backup);
  assert.equal(result.kind,'hashtags');
  assert.equal(result.mode,'ai');
  assert.ok(result.hashtags.length>=5);
  assert.ok(!result.hashtags.some(x=>['#BakingTips','#FYP'].includes(x.tag)));
});
test('API works in no-key free mode and does not expose keys to browser',async()=>{
  const bioRes=await onRequestPost({request:request(bio),env:{}});
  assert.equal(bioRes.status,200);
  const bioBody=await bioRes.json();
  assert.equal(bioBody.mode,'free');assert.equal(bioBody.bios.length,3);
  const tagBody=await(await onRequestPost({request:request(tagBrief),env:{}})).json();
  assert.equal(tagBody.kind,'hashtags');
  let res=await onRequestPost({request:request({...bio,description:'hi'}),env:{}});
  assert.equal(res.status,400);
  res=await onRequestPost({request:new Request('https://x.test/api/instagram',{method:'POST',body:'x'}),env:{}});
  assert.equal(res.status,415);
  res=await onRequestPost({request:request({...bio,unexpected:'x'.repeat(8000)}),env:{}});
  assert.equal(res.status,413);
});
test('Groq AI path returns valid bios and makes one request to free-tier integration',async()=>{
  const previous=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,init)=>{
    calls++;
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(init.headers.Authorization,'Bearer private-groq');
    const body=JSON.parse(init.body);
    assert.equal(body.response_format.type,'json_object');
    return Response.json({choices:[{message:{content:JSON.stringify({
      bios:[
        {label:'Profile 1',text:'🎮 Playing Cricket 26 on PS5\nFollow for new streams'},
        {label:'Profile 2',text:'Daywalker_OP | Gaming\nLive and highlight videos'},
        {label:'Profile 3',text:'Cricket 26 and PS5 content\nGamers welcome!'}
      ]
    })}}]});
  };
  try{
    const r=await onRequestPost({request:request(bio),env:{GROQ_API_KEY:'private-groq'}});
    assert.equal(r.status,200);
    const body=await r.json();
    assert.equal(body.mode,'ai');
    assert.equal(calls,1);
    assert.equal(body.bios.length,3);
    assert.doesNotMatch(JSON.stringify(body),/private-groq/);
  }finally{globalThis.fetch=previous;}
});
test('Groq failure transparently reverts to free suggestions',async()=>{
  const previous=globalThis.fetch;
  globalThis.fetch=async()=>new Response('private provider issue',{status:429});
  try{
    const r=await onRequestPost({request:request(bio),env:{GROQ_API_KEY:'private-key'}});
    assert.equal(r.status,200);
    const result=await r.json();
    assert.equal(result.mode,'free');
    assert.equal(result.aiErrorCode,'rate-limit');
    assert.doesNotMatch(JSON.stringify(result),/private-key|private provider issue/);
  }finally{globalThis.fetch=previous;}
});
test('Worker API route supports only POST, keeps existing channel and static routes',async()=>{
  const env={ASSETS:{fetch:()=>new Response('Static site')}};
  const ctx={waitUntil(){}};
  let res=await worker.fetch(request(bio),env,ctx);
  assert.equal(res.status,200);
  assert.equal((await res.json()).mode,'free');
  res=await worker.fetch(new Request('https://channelscope.example/api/instagram'),env,ctx);
  assert.equal(res.status,405);
  res=await worker.fetch(new Request('https://channelscope.example/'),env,ctx);
  assert.equal(await res.text(),'Static site');
  res=await worker.fetch(new Request('https://channelscope.example/api/channel?input=%40YouTube'),env,ctx);
  assert.equal(res.status,503);
});


test('Caption generator creates three distinct copy-ready caption-and-hashtag options in free mode',()=>{
  const b=normalizeInstagramBrief({
    kind:'caption',tone:'friendly',profile:'creator',format:'post',
    description:'Halloween decoration in Plano',audience:'Halloween lovers',name:''
  });
  const pack=freeInstagramPack(b);
  assert.equal(pack.kind,'caption');assert.equal(pack.mode,'free');
  assert.equal(pack.captions.length,3);
  assert.equal(new Set(pack.captions.map(x=>x.text)).size,3);
  for(const caption of pack.captions){
    assert.match(caption.text,/Halloween/i);
    assert.ok(caption.hashtags.length>=3);
    assert.ok(caption.hashtags.every(t=>t.startsWith('#')));
    assert.doesNotMatch(caption.text,/handmade|diy|festival|official event|best in town/i);
  }
});
test('Contextual Halloween tags reject DIY/event claims and semantic duplicates',()=>{
  const b=normalizeInstagramBrief({
    kind:'hashtags',tone:'friendly',profile:'creator',format:'post',
    description:'Halloween decoration in Plano',audience:'Halloween fans'
  });
  for(const tag of ['#HalloweenDIY','#PlanoEvents','#HalloweenEvent','#DIYDecor','#PlanoTexas']){
    assert.equal(relevantTag(tag,b),false,tag);
  }
  assert.equal(relevantTag('#HalloweenDecor',b),true);
  assert.equal(relevantTag('#HalloweenDisplay',b),true);
  assert.equal(relevantTag('#SpookySeason',b),true);
  const out=validateInstagramAI({hashtags:[
    {tag:'#HalloweenDIY',reason:'Decorations are handmade'},
    {tag:'#PlanoEvents',reason:'An official festival'},
    {tag:'#HalloweenPlano',reason:'Location and season'},
    {tag:'#PlanoHalloween',reason:'Same location and season'},
    {tag:'#HalloweenDecor',reason:'Decoration topic'},
    {tag:'#HalloweenDecoration',reason:'Duplicate meaning'},
    {tag:'#HalloweenDisplay',reason:'Display type'},
    {tag:'#SpookySeason',reason:'Seasonal'},
    {tag:'#HalloweenVibes',reason:'Seasonal mood'}
  ]},b,freeInstagramPack(b));
  assert.equal(out.kind,'hashtags');
  assert.ok(!out.hashtags.some(x=>/#(?:.*DIY|.*Events?|PlanoTexas)/i.test(x.tag)),JSON.stringify(out));
  const all=out.hashtags.map(x=>x.tag.toLowerCase());
  assert.equal(all.filter(x=>x==='#halloweenplano'||x==='#planohalloween').length,1);
  assert.equal(all.filter(x=>x==='#halloweendecoration'||x==='#halloweendecor').length,1);
  assert.ok(all.includes('#halloweendecor'));
  assert.ok(all.includes('#halloweendisplay'));
});
test('No acceptable model hashtags forces free fallback without falsely claiming AI',()=>{
  const b=normalizeInstagramBrief({
    kind:'hashtags',tone:'friendly',profile:'creator',format:'reel',
    description:'Halloween decoration in Plano',audience:'Halloween fans'
  });
  assert.throws(()=>validateInstagramAI({hashtags:[
    {tag:'#HalloweenDIY'},{tag:'#PlanoEvents'},{tag:'#FYP'}
  ]},b,freeInstagramPack(b)),/incomplete/);
});
test('Groq caption drafts accept safe copy and replace unsupported details with templates',()=>{
  const b=normalizeInstagramBrief({
    kind:'caption',tone:'friendly',profile:'creator',format:'reel',
    description:'Halloween decoration in Plano',audience:'Halloween lovers'
  });
  const response=validateInstagramAI({captions:[
    {label:'Fresh',text:'Halloween decoration in Plano! 🎃 A little spooky magic. 👻',hashtags:['#HalloweenDecor','#PlanoHalloween','#HalloweenDIY']},
    {label:'Unverified claim',text:'The biggest handmade DIY Halloween festival in Plano!',hashtags:['#PlanoEvents']},
    {label:'Party',text:'Halloween decoration in Plano. What do you think? 🕸️',hashtags:['#HalloweenDisplay','#SpookySeason']}
  ]},b,freeInstagramPack(b));
  assert.equal(response.kind,'caption');
  assert.equal(response.mode,'hybrid');
  assert.equal(response.captions.length,3);
  assert.ok(response.captions.some(x=>/little spooky magic/.test(x.text)));
  assert.ok(response.captions.every(x=>!/(handmade|festival)/i.test(x.text)));
  assert.ok(response.captions.every(x=>!x.hashtags?.includes('#HalloweenDIY')));
  assert.ok(response.captions.every(x=>x.hashtags?.length>=3));
});
test('Groq produces AI caption mode with grounded copy and no additional credentials',async()=>{
  const previous=globalThis.fetch,brief={
    kind:'caption',tone:'friendly',profile:'creator',format:'post',
    description:'Halloween decoration in Plano',audience:'Halloween lovers'
  };
  globalThis.fetch=async(url,init)=>{
    assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');
    const body=JSON.parse(init.body);
    assert.equal(body.response_format.type,'json_object');
    return Response.json({choices:[{message:{content:JSON.stringify({captions:[
      {label:'Short',text:'Halloween decoration in Plano 🎃',hashtags:['#HalloweenDecor','#PlanoHalloween']},
      {label:'Fun',text:'Halloween vibes in Plano! What is your favorite decoration? 👻',hashtags:['#HalloweenDecor','#HalloweenDisplay']},
      {label:'Minimal',text:'Plano Halloween decoration ✨',hashtags:['#PlanoHalloween','#HalloweenDecor']}
    ]})}}]});
  };
  try{
    const r=await onRequestPost({request:request(brief),env:{GROQ_API_KEY:'not-returned'}});
    assert.equal(r.status,200);
    const data=await r.json();
    assert.equal(data.kind,'caption');assert.equal(data.mode,'ai');
    assert.equal(data.captions.length,3);
    assert.ok(data.captions.every(x=>x.hashtags.length>=3));
    assert.doesNotMatch(JSON.stringify(data),/not-returned/);
  }finally{globalThis.fetch=previous;}
});
