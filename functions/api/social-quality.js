// Conservative intent classification and copy quality for creator-written briefs.
// This is a heuristic, NOT footage analysis or a claim of measured video performance.
import {safeCaption} from './instagram-quality.js';

const concise=(value,max=850)=>typeof value==='string'?
  value.replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const truncate=(s,n)=>Array.from(s).slice(0,n).join('').trim().replace(/[.,;:!?-]+$/,'');
const EVIDENCE={
  tutorial:/\b(?:how to|step[- ]by[- ]step|tutorial|explaining|walkthrough|instructions?|teaching|learn how|beginner'?s guide)\b/i,
  review:/\b(?:review(?:ing)?|honest opinion|my thoughts on|first impressions|pros and cons|hands[- ]on review)\b/i,
  gameplay:/\b(?:gameplay|playing|playthrough|gaming|livestream|ps5|xbox|fortnite|minecraft|call of duty|modern warfare|cricket\s*26|fifa|valorant)\b/i
};
export function detectContentType(brief){
  // Content description takes precedence over an optional working title.
  const description=concise(brief?.description);
  const topic=concise(brief?.topic,110);
  const combined=description+' '+topic;
  if(EVIDENCE.tutorial.test(description)||/\b(?:how to|tutorial|step[- ]by[- ]step)\b/i.test(topic))return 'tutorial';
  if(EVIDENCE.review.test(description)||/\breview\b/i.test(topic))return 'review';
  if(EVIDENCE.gameplay.test(combined))return 'gameplay';
  if(/\b(?:video|reel|photo|decor(?:ations?)?|display|scenery|sights?|collection|outfit|tour|showcas(?:e|ing)|look at|footage|highlight|clip|house|home)\b/i.test(description))return 'showcase';
  return 'other';
}
const instructional=/\b(?:how to|tutorial|step[- ]by[- ]step|learn (?:how |to )|guide to|tips? (?:for|on|to)|diy|make your own|build your own|transform your|turn your|decor(?:ating)? ideas?|ideas for|ways to)\b/i;
const inferredReview=/\b(?:review|tested|rated|rating|pros and cons|worth buying|should you buy)\b/i;
const unsupportedOutcomes=/\b(?:won the match|beat the boss|got a victory|perfect score|record[- ]breaking|world record|unbeatable|guaranteed win)\b/i;
const inflatedClaims=/\b(?:you will learn|we'?ll teach|i'?ll show you how|we'?ll show you how|master(?:ing)? the|secrets? to|guaranteed|proven to|life[- ]changing)\b/i;
function briefEvidence(brief){
  return concise(brief.description).toLowerCase();
}
function noInferredClaim(value,brief){
  const kind=detectContentType(brief),description=briefEvidence(brief);
  if(kind!=='tutorial'&&instructional.test(value)&&!instructional.test(description))return false;
  if(kind!=='review'&&inferredReview.test(value)&&!inferredReview.test(description))return false;
  if(unsupportedOutcomes.test(value)&&!unsupportedOutcomes.test(description))return false;
  if(inflatedClaims.test(value)&&!inflatedClaims.test(description))return false;
  return true;
}
export function groundedCopy(value,brief){
  return !!safeCaption(value,brief)&&noInferredClaim(value,brief);
}
const titleWords=s=>concise(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/u)
  .filter(w=>w.length>=4&&!['video','reel','post','photo','short','content','with','this','your','that','some','from','look','about','into','here','the'].includes(w));
export function groundedTitle(value,brief){
  if(typeof value!=='string'||Array.from(value).length>100||value.trim().length<8)return false;
  if(!groundedCopy(value,brief))return false;
  const words=titleWords(brief.description);
  return words.length===0||words.some(word=>value.toLowerCase().includes(word));
}
const caps=[
  [/\bplano\b/gi,'Plano'],[/\btexas\b/gi,'Texas'],[/\bhalloween\b/gi,'Halloween'],
  [/\binstagram\b/gi,'Instagram'],[/\byoutube\b/gi,'YouTube'],[/\biphone\b/gi,'iPhone'],
  [/\bcricket 26\b/gi,'Cricket 26'],[/\bmodern warfare\b/gi,'Modern Warfare'],
  [/\bcall of duty\b/gi,'Call of Duty'],[/\bps5\b/gi,'PS5'],
  [/\bxbox\b/gi,'Xbox'],[/\bminecraft\b/gi,'Minecraft']
];
function capitalized(s){
  let val=concise(s).replace(/^([a-z])/,m=>m.toUpperCase());
  for(const [pattern,name] of caps)val=val.replace(pattern,name);
  return val;
}
export function sceneFromDescription(brief){
  let s=concise(brief.description,250).replace(/[.!?]+$/,'');
  s=s.replace(/^(?:here(?:'s| is) )?(?:a|an|the) (?:short |quick )?(?:video|reel|clip|photo|post) (?:of|showing|about|featuring) /i,'');
  s=s.replace(/\bdecor at a plano house\b/i,'decorations at a home in Plano');
  s=s.replace(/\bdecorations? at a plano house\b/i,'decorations at a home in Plano');
  s=s.replace(/\bdecor\b(?=\s+(?:at|in|outside|around)\b)/ig,'decorations');
  return capitalized(s);
}
function sentence(s){
  return capitalized(s).replace(/[.!?]+$/,'')+'.';
}
export function freeYoutubeCopy(brief){
  const kind=detectContentType(brief);
  const scene=sceneFromDescription(brief);
  const subject=truncate(scene,85);
  // The creator's optional working title can help, but must never convert a
  // non-instructional display into an invented tutorial/review.
  const requested=capitalized(brief.topic||'');
  const chosen=requested&&groundedTitle(requested,brief)?requested:subject;
  const title=truncate(chosen,100);
  const opener={
    showcase:'Take a look at '+subject+'.',
    tutorial:'Here is a walkthrough of '+subject+'.',
    review:'A closer look at '+subject+'.',
    gameplay:'Here is a look at '+subject+'.',
    other:'Take a look at '+subject+'.'
  }[kind];
  const followUp={
    showcase:'Take a closer look at the details.',
    tutorial:'Follow along with the steps described in this video.',
    review:'Explore the impressions shared in this review.',
    gameplay:'Check out the gameplay.',
    other:'Take a closer look.'
  }[kind];
  const description=sentence(scene)+' '+followUp;
  return {contentType:kind,title,description,hook:opener};
}
