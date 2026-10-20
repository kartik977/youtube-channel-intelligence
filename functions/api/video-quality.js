// Conservative quality controls for YouTube publishing suggestions.
// These do not measure SEO, ranking, trending, or video footage.
const EDUCATIONAL=/\b(?:explained?|explaining|tutorials?|guides?|how to|tips?|strategies|strategy|walkthrough|breakdowns?|analysis|reviews?|mastering|pro[- ]?tips)\b/i;
const RISKY=[
 /\b(?:tactical|tactics|strategies|strategy|weapons?|loadouts?|gunplay|combat mechanics|gameplay mechanics)\b/i,
 /\b(?:storyline|narrative|plot twists?|boss fights?|game secrets?|hidden areas?|map control)\b/i,
 /\b(?:walkthrough|step[- ]by[- ]step|how to|tutorial|training|we (?:teach|explain|demonstrate)|breaks? down)\b/i,
 /\b(?:highlighting key moments|key moments|expert tips?|pro tips?|in[- ]depth|exclusive footage)\b/i,
 /\b(?:multiplayer|teamwork|co-op|ranked|competitive match|campaign|mission)\b/i,
 /\b(?:cinematic moments?|intense action|epic battles?|dramatic cutscenes?|stunning visuals?|amazing scenes?)\b/i
];
const fluff=new Set(['with','part','video','live','stream','watch','this','your','about','first','from','what','doing','some']);
export function tutorialIntent(brief){
  return EDUCATIONAL.test((brief.topic||'')+' '+(brief.description||'').replace(/#[\p{L}\p{N}_]+/gu,''));
}
export function titleSupported(candidate,brief){
  const title=String(candidate||'');
  if(EDUCATIONAL.test(title)&&!tutorialIntent(brief))return false;
  const tokens=(brief.topic||'').replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/u)
    .filter(x=>x.length>=4&&!fluff.has(x.toLowerCase()));
  if(tokens.length && !tokens.some(x=>title.toLowerCase().includes(x.toLowerCase())))return false;
  return true;
}
export function descriptionSupported(candidate,brief){
  const text=String(candidate||'');
  const evidence=(brief.topic||'')+' '+(brief.description||'');
  for(const pattern of RISKY){
    const match=pattern.exec(text);
    if(match&&!evidence.toLowerCase().includes(match[0].toLowerCase()))return false;
  }
  // An invented organization name and implied video-watching are not valid.
  if(/\bThe Creator Lab\b/i.test(text)&&!/\bThe Creator Lab\b/i.test(evidence+' '+(brief.channelName||'')))return false;
  if(/\b(?:we see|viewers (?:see|get a clear look)|the footage shows|we witness|you will learn)\b/i.test(text))return false;
  return true;
}
// A bare crisis/event hashtag on a game stream might look like real news.
export function hashtagSafe(value,brief){
  const name=String(value||'').replace(/^#/,'');
  const context=(brief.topic||'')+' '+(brief.description||'');
  const gaming=/call of duty|modern warfare|gaming|gameplay|playstation|ps5|xbox|fortnite|minecraft|cricket\s*26/i.test(context);
  if(gaming&&/(bombing|massacre|terror(?:ism|attack)?|shooting|invasion|attack|warcrime|tragedy)/i.test(name)&&
    !/(gaming|gameplay|cod|mw\d|modernwarfare)/i.test(name))return false;
  return true;
}
export function hashtagType(value){
  const tag=String(value||'').replace(/^#/,'').toLowerCase();
  if(['gaminglive','gamingshorts','cricketgaming','footballgaming','ps5gameplay','techreview','techtips','gamingcommunity'].includes(tag))return 'niche';
  if(['livestream','shorts'].includes(tag))return 'format';
  if(['gaming','gameplay','technology','football','cricket','gamingchannel'].includes(tag))return 'broad';
  return 'specific';
}
export function selectHashtags(candidates){
  const seen=new Set();
  const groups={specific:[],niche:[],format:[],broad:[]};
  for(const c of candidates){
    if(!c||typeof c.tag!=='string')continue;
    const key=c.tag.toLowerCase();
    if(seen.has(key))continue;
    seen.add(key);
    groups[hashtagType(c.tag)].push(c);
  }
  const chosen=[];
  function take(type,max=1){
    for(let i=0;i<max&&groups[type].length;i++)chosen.push(groups[type].shift());
  }
  take('specific',2);
  take('niche',1);
  if(chosen.length<3)take('specific',3-chosen.length);
  if(chosen.length<3)take('format',3-chosen.length);
  if(chosen.length<3)take('broad',3-chosen.length);
  for(const type of ['specific','niche','format','broad']){
    if(chosen.length>=5)break;
    take(type,5-chosen.length);
  }
  return chosen.slice(0,5).map((c,i)=>({...c,category:i<3?'primary':'alternative'}));
}
