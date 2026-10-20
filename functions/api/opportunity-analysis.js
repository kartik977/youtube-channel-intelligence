// Public-data opportunity analysis. Deterministic, no private metrics or implied causation.
const tidy=(v,max=150)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
const count=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?Math.min(x,1e12):null;
const median=xs=>{if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),n=a.length>>1;return a.length%2?a[n]:(a[n-1]+a[n])/2;};
const fillers=new Set('the a an and or of in on at from with to for part pt episode ep video short shorts live livestream stream streaming gameplay gaming play playing watch watching highlights highlight full channel new best epic amazing my first last this that what how why when your our you i we reaction reacts vlog tutorial tutorials ps5 ps4 xbox edition update 2026 2025 2024 2023 2022 funny try trying next clips scene official trailer'.split(' '));

// Explicit game/series names take precedence over generic words and hashtags.
// #cricketlover doesn't become its own topic; 007 First Light isn't just Light.
const namedTopics=[
  {topic:'007 First Light',pattern:/\b(?:007[\s_-]*first[\s_-]*light|first[\s_-]*light(?:[\s_-]*007)?)\b/i},
  {topic:'Modern Warfare',pattern:/\b(?:modern[\s_-]*warfare|mw[\s_-]*[234]|call[\s_-]*of[\s_-]*duty)\b/i},
  {topic:'Cricket 26',pattern:/\b(?:cricket[\s_-]*26|cricket26|ipl[\s_-]*2026)\b/i},
  {topic:'Minecraft',pattern:/\bminecraft\b/i},
  {topic:'Fortnite',pattern:/\bfortnite\b/i},
  {topic:'Valorant',pattern:/\bvalorant\b/i},
  {topic:'Grand Theft Auto',pattern:/\b(?:grand[\s_-]*theft[\s_-]*auto|gta[\s_-]*[v56]?)\b/i},
  {topic:'Football games',pattern:/\b(?:fifa|ea[\s_-]*sports[\s_-]*fc|fc[\s_-]*2[456]|ultimate[\s_-]*team)\b/i},
  {topic:'Spring Boot',pattern:/\bspring[\s_-]*boot\b/i},
  {topic:'JavaScript',pattern:/\bjavascript\b/i},
  {topic:'Python',pattern:/\bpython\b/i},
  {topic:'iPhone',pattern:/\biphone\b/i},
  {topic:'Android',pattern:/\bandroid\b/i}
];
function strippedTitle(title){
  return tidy(title,150).replace(/#[^\s#]+/g,' ').replace(/https?:\/\/\S+/gi,' ').replace(/\s+/g,' ').trim();
}
function words(title){
  return [...new Set(strippedTitle(title).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/)
    .filter(w=>w.length>=4&&!fillers.has(w)&&!(/^\d+$/.test(w))))];
}
export function detectTopic(title){
  const full=tidy(title,150);
  for(const g of namedTopics)if(g.pattern.test(full))return g.topic;
  if(/\b(?:football|soccer|world[\s_-]*cup)\b/i.test(strippedTitle(full))&&/\b(?:ps5|ps4|gaming|game|goal|fifa)\b/i.test(full))return 'Football games';
  if(/\b(?:cricket|cricketlover|ipl)\b/i.test(full)&&/\b(?:gaming|ps5|ipl|cricketlover)\b/i.test(full))return 'Cricket gaming';
  return null;
}
export function videoSeconds(v){
  if(typeof v!=='string')return null;
  const m=/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(v);
  if(!m)return null;
  const seconds=Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0);
  return Number.isFinite(seconds)&&seconds>0?seconds:null;
}
export function normalizeOpportunityInput(source){
  if(!source||typeof source!=='object'||!source.channel||!Array.isArray(source.videos)||source.videos.length>30||
    !['demo','youtube'].includes(source.source))throw Error('Load a channel with up to 30 recent public uploads.');
  const channel={id:tidy(source.channel.id,100),title:tidy(source.channel.title,100)};
  if(!channel.id||!channel.title)throw Error('Missing public channel details.');
  const videos=source.videos.map(v=>{
    const date=typeof v?.publishedAt==='string'?Date.parse(v.publishedAt):NaN;
    return {id:tidy(v?.id,100),title:tidy(v?.title,150),views:count(v?.views),
      publishedAt:Number.isFinite(date)?new Date(date).toISOString():null,
      duration:typeof v?.duration==='string'?v.duration.slice(0,50):null,
      url:typeof v?.url==='string'&&/^https:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url)?v.url:null};
  }).filter(v=>v.id&&v.title);
  const sampledAt=typeof source.fetchedAt==='string'&&Number.isFinite(Date.parse(source.fetchedAt))?
    new Date(source.fetchedAt).toISOString():new Date().toISOString();
  return {source:source.source,channel,videos,sampledAt};
}
const clipVideo=v=>({id:v.id,title:v.title,views:v.views,url:v.url,publishedAt:v.publishedAt});
function groupStats(videos,base){
  const withViews=videos.filter(v=>v.views!==null),middle=median(withViews.map(v=>v.views));
  return {count:videos.length,measured:withViews.length,medianViews:middle,
    relativeMedian:middle===null||base===null||base===0?null:middle/base,
    examples:[...videos].sort((a,b)=>(b.views??-1)-(a.views??-1)).slice(0,3).map(clipVideo)};
}
export function analyzeOpportunities(data){
  const videos=data.videos,publicViews=videos.filter(v=>v.views!==null),baseline=median(publicViews.map(v=>v.views));
  const groups=new Map(),unassigned=[];
  const labeled=videos.map(v=>({...v,topic:detectTopic(v.title)}));
  for(const v of labeled){
    if(v.topic){if(!groups.has(v.topic))groups.set(v.topic,[]);groups.get(v.topic).push(v);}
    else unassigned.push(v);
  }
  const wordCounts=new Map();
  for(const v of unassigned)for(const w of words(v.title))wordCounts.set(w,(wordCounts.get(w)||0)+1);
  const repeated=[...wordCounts].filter(([word,n])=>n>=2&&n<unassigned.length)
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,6);
  const extra=new Set();
  for(const [word] of repeated){
    const matched=unassigned.filter(v=>!extra.has(v.id)&&words(v.title).includes(word));
    if(matched.length<2)continue;
    groups.set(word[0].toUpperCase()+word.slice(1),matched);
    matched.forEach(v=>extra.add(v.id));
  }
  const other=unassigned.filter(v=>!extra.has(v.id));
  const sorted=[...groups].filter(([_,items])=>items.length>=2)
    .map(([topic,items])=>({topic,...groupStats(items,baseline)}))
    .sort((a,b)=>(b.relativeMedian??-1)-(a.relativeMedian??-1)||b.count-a.count);
  const selected=sorted.slice(0,5);
  const retained=new Set(selected.map(x=>x.topic));
  const notShown=[...other,...[...groups].filter(([name])=>!retained.has(name)).flatMap(x=>x[1])];
  const themes=[...selected];
  if(notShown.length)themes.push({topic:'Other sampled topics',other:true,...groupStats(notShown,baseline)});
  const bins=[
    {id:'short-length',label:'Short-length (up to 3 min)',items:[]},
    {id:'longer',label:'Longer than 3 min',items:[]},
    {id:'unknown',label:'Unknown duration',items:[]}
  ];
  for(const v of videos){const sec=videoSeconds(v.duration);bins[sec===null?2:sec<=180?0:1].items.push(v);}
  return {
    sampleSize:videos.length,viewCountAvailable:publicViews.length,baselineMedian:baseline,
    themes,formats:bins.filter(x=>x.items.length).map(x=>({id:x.id,label:x.label,...groupStats(x.items,baseline)})),
    top:[...publicViews].sort((a,b)=>b.views-a.views).slice(0,3).map(clipVideo),
    warnings:[
      'All view counts are cumulative at one snapshot. Comparing a future video at day 7 with these lifetime medians is invalid.',
      'Video duration is not an official Shorts classification; short-length labels describe duration only.',
      'Theme groups use public video titles and sample sizes; they do not measure retention, CTR, impressions, popularity trends or the cause of views.'
    ]
  };
}
const safeTitle=(name,max=52)=>tidy(name,max);
export function comparisonPlan(){
  return 'Record day-7 views for this upload. Compare only with other day-7 results in YouTube Studio, never with the lifetime medians above.';
}
export function evidenceForTopic(evidence,topic,preferredId){
  const group=evidence.themes.find(x=>!x.other&&x.topic.toLowerCase()===String(topic).toLowerCase());
  const options=group?.examples||evidence.top||[];
  const selected=options.find(x=>x.id===preferredId)||options[0];
  return {
    topic:group?.topic||topic,
    sampleCount:group?.count||0,
    medianLifetimeViews:group?.medianViews??null,
    sources:selected?[selected]:[],
    why:group?
      group.count+' sampled uploads share the "'+group.topic+'" topic (median '+(group.medianViews??'unknown')+' lifetime views). Try a different angle; this does not prove demand or future success.':
      'Based on a real sampled upload; the sample does not establish a topic-level performance advantage.'
  };
}
export function fallbackIdeas(evidence){
  const topics=evidence.themes.filter(t=>!t.other&&t.count>=2);
  const first=topics[0]?.topic||evidence.top[0]?.title||'your recent content';
  const second=topics[1]?.topic||first;
  const proposals=[
    {topic:first,title:safeTitle(first)+' — a fresh follow-up',hook:'Explain what is different about this new upload in the first few seconds.'},
    {topic:second,title:safeTitle(second)+' — a focused new episode',hook:'Open with the actual moment or question this upload will address.'},
    {topic:first,title:safeTitle(first)+' — a new experiment',hook:'Tell viewers what you are testing, and show only what actually happens.'}
  ];
  return proposals.map(p=>({...p,...evidenceForTopic(evidence,p.topic),measure:comparisonPlan()}));
}
