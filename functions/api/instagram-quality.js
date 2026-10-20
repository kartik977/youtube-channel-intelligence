// Conservative semantic safety for Instagram drafts; never claims live trends.
const words=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/u).filter(Boolean);
const normalize=s=>String(s||'').replace(/^#/,'').toLowerCase().replace(/(decorations?|decorating|decor)$/,'decor').replace(/(events?|festivals?)$/,'event');
export function hashtagMeaning(tag){
  let plain=normalize(tag).replace(/decoration|decorations|decorating/g,'decor');
  const has=(word)=>plain.includes(word);
  if(has('halloween')&&has('plano'))return 'halloween-plano';
  if(has('halloween')&&has('decor'))return 'halloween-decor';
  if(has('plano')&&has('texas'))return 'plano-texas';
  return plain;
}
export function unsupportedHashtag(tag,brief){
  const key=normalize(tag),description=(brief.description+' '+brief.audience).toLowerCase();
  const has=(r)=>r.test(description);
  if(/(?:diy|handmade|homemade|crafts?|tutorial|howto)/.test(key)&&
    !has(/\bdiy\b|handmade|homemade|craft|made (?:this|these|it|them)|built (?:it|this)|tutorial|how to/i))return true;
  if(/(?:events?|festivals?|meetups?|parade|party|tickets?)/.test(key)&&
    !has(/\bevent\b|festival|meetup|parade|party|ticketed|attend(?:ed|ing)? an event/i))return true;
  if(/(?:giveaway|sponsored|adcollab|paidpartner)/.test(key)&&
    !has(/giveaway|sponsored|partnership|paid promotion|ad campaign/i))return true;
  if(key.includes('texas')&&!has(/\btexas\b|\btx\b/i))return true;
  // A location must be creator-supplied; no implicit hometown inference.
  if(key.includes('plano')&&!has(/\bplano\b/i))return true;
  return false;
}
export function contextHashtags(brief){
  const desc=(brief.description+' '+brief.audience).toLowerCase();
  const results=[];
  const add=(tag,reason)=>results.push({tag,reason});
  if(/\bhalloween\b/.test(desc)&&/decoration|decor\b|display/.test(desc)){
    add('#HalloweenDecor','Describes the Halloween decorations in your brief.');
    if(/\bplano\b/.test(desc))add('#PlanoHalloween','Combines the supplied location and holiday.');
    add('#HalloweenDisplay','Matches the type of decoration described.');
    add('#SpookySeason','Relevant seasonal Halloween theme.');
    add('#HalloweenVibes','Broad Halloween community theme.');
  }else if(/\bhalloween\b/.test(desc)){
    add('#Halloween','Matches the event or season described.');
    if(/\bplano\b/.test(desc))add('#PlanoHalloween','Connects the stated place with Halloween.');
    add('#SpookySeason','Relevant seasonal theme.');
  }
  return results;
}
const unsupportedClaims=[
  {pattern:/\b(?:diy|handmade|homemade|made (?:my|our|these) own)\b/i,evidence:/\bdiy\b|handmade|homemade|i made|we made|crafted|built/i},
  {pattern:/\b(?:official event|festival|community event|tickets|party|parade|meetup)\b/i,evidence:/\bevent\b|festival|ticket|party|parade|meetup/i},
  {pattern:/\b(?:award[- ]winning|best in town|biggest|most popular|number one|world famous|sold out)\b/i,evidence:/award[- ]winning|best in town|biggest|most popular|number one|world famous|sold out/i},
  {pattern:/\b(?:sponsored|paid partnership|giveaway)\b/i,evidence:/sponsored|paid partnership|giveaway/i}
];
export function safeCaption(text,brief){
  if(typeof text!=='string')return null;
  const clean=text.replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim();
  if(!clean||Array.from(clean).length>2200)return null;
  const evidence=(brief.description+' '+brief.audience).toLowerCase();
  for(const rule of unsupportedClaims)if(rule.pattern.test(clean)&&!rule.evidence.test(evidence))return null;
  const keyWords=words(brief.description).filter(w=>w.length>=4&&!['this','with','from','about','your','have','that','when','there','what','some','only'].includes(w));
  if(keyWords.length&&!keyWords.some(w=>clean.toLowerCase().includes(w)))return null;
  return clean;
}
