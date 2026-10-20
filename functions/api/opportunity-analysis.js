// Reproducible public-data topic/format analysis; no private YouTube metrics.
const tidy=(v,max=130)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
const validCount=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?Math.min(x,1e12):null;
const median=xs=>{if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
const stops=new Set('the a an and or of in on at from with to for part pt episode ep video short shorts live livestream stream streaming gameplay gaming play playing watch watching highlights highlight full channel new best epic amazing my first last this that what how why when your our you i we reaction reacts gameplay reaction vlog vlogs tutorial tutorials ps5 ps4 xbox edition update 2026 2025 2024 2023 2022'.split(' '));
const anchors=[
  [/modern\s*warfare/i,'Modern Warfare'],[/call\s*of\s*duty/i,'Call of Duty'],
  [/cricket\s*26/i,'Cricket 26'],[/minecraft/i,'Minecraft'],
  [/fortnite/i,'Fortnite'],[/valorant/i,'Valorant'],
  [/grand\s*theft\s*auto|\bgta\b/i,'Grand Theft Auto'],
  [/\bfifa\b|ea\s*sports\s*fc/i,'Football games'],
  [/spring\s*boot/i,'Spring Boot'],[/javascript/i,'JavaScript'],[/python/i,'Python'],
  [/iphone/i,'iPhone'],[/android/i,'Android'],[/travel|itinerary/i,'Travel'],
  [/cooking|recipe/i,'Cooking'],[/fitness|workout/i,'Fitness']
];
export function videoSeconds(value){
  if(typeof value!=='string')return null;
  const match=/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value);
  if(!match)return null;
  const total=(Number(match[1]||0)*86400)+(Number(match[2]||0)*3600)+
    (Number(match[3]||0)*60)+Number(match[4]||0);
  return Number.isFinite(total)&&total>0?total:null;
}
function tokens(title){
  return [...new Set(tidy(title,160).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/)
    .filter(w=>w.length>=4&&!stops.has(w)&&!/^\d+$/.test(w)))];
}
export function normalizeOpportunityInput(source){
  if(!source||typeof source!=='object'||!source.channel||!Array.isArray(source.videos)||source.videos.length>30||
    !['demo','youtube'].includes(source.source))throw Error('Load a channel with up to 30 recent public uploads.');
  const channel={id:tidy(source.channel.id,100),title:tidy(source.channel.title,100)};
  if(!channel.id||!channel.title)throw Error('Missing public channel details.');
  const videos=source.videos.map(x=>{
    const time=typeof x?.publishedAt==='string'?Date.parse(x.publishedAt):NaN;
    return {
      id:tidy(x?.id,100),title:tidy(x?.title,150),views:validCount(x?.views),
      publishedAt:Number.isFinite(time)?new Date(time).toISOString():null,
      duration:typeof x?.duration==='string'?x.duration.slice(0,50):null,
      url:typeof x?.url==='string'&&/^https:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}$/.test(x.url)?x.url:null
    };
  }).filter(v=>v.id&&v.title);
  const sampledAt=typeof source.fetchedAt==='string'&&Number.isFinite(Date.parse(source.fetchedAt))?
    new Date(source.fetchedAt).toISOString():new Date().toISOString();
  return {source:source.source,channel,videos,sampledAt};
}
function aggregate(group,overall){
  const counted=group.filter(x=>x.views!==null);
  const med=median(counted.map(x=>x.views));
  const base=overall===null||overall===0?null:med/overall;
  return {count:group.length,measured:counted.length,medianViews:med,relativeMedian:base,
    examples:[...counted].sort((a,b)=>b.views-a.views).slice(0,2).map(x=>({
      id:x.id,title:x.title,views:x.views,url:x.url,publishedAt:x.publishedAt
    }))};
}
function toTopicTitle(topic){
  return topic.length>42?topic.slice(0,42):topic;
}
export function analyzeOpportunities(data){
  const rows=data.videos,viewed=rows.filter(x=>x.views!==null);
  const baseline=median(viewed.map(x=>x.views));
  const counter=new Map();
  const rowWords=rows.map(v=>tokens(v.title));
  rowWords.forEach(words=>words.forEach(w=>counter.set(w,(counter.get(w)||0)+1)));
  const dynamic=[...counter.entries()].filter(([w,count])=>count>=2&&count<rows.length&&w.length>=4)
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,7);
  const patterns=[...anchors.map(([regex,label])=>({
    name:label,matches:rows.map((v,i)=>regex.test(v.title)?i:null).filter(v=>v!==null)
  })),...dynamic.map(([word])=>({
    name:word[0].toUpperCase()+word.slice(1),
    matches:rowWords.map((set,i)=>set.includes(word)?i:null).filter(v=>v!==null)
  }))].filter(g=>g.matches.length>=2);
  // One video belongs to one topic cluster. Prefer narrower named subjects.
  patterns.sort((a,b)=>b.name.length-a.name.length||b.matches.length-a.matches.length);
  const assigned=new Set(),themes=[];
  for(const pattern of patterns){
    const indices=pattern.matches.filter(i=>!assigned.has(i));
    if(indices.length<2)continue;
    indices.forEach(i=>assigned.add(i));
    themes.push({topic:pattern.name,...aggregate(indices.map(i=>rows[i]),baseline)});
    if(themes.length===5)break;
  }
  themes.sort((a,b)=>(b.relativeMedian??-1)-(a.relativeMedian??-1)||b.count-a.count);
  const remaining=rows.filter((_,i)=>!assigned.has(i));
  if(remaining.length)themes.push({topic:'Other sampled topics',...aggregate(remaining,baseline),other:true});
  const lengthGroups=[
    {id:'short-length',label:'Short-length (up to 3 min)',items:[]},
    {id:'longer',label:'Longer than 3 min',items:[]},
    {id:'unknown',label:'Unknown duration',items:[]}
  ];
  rows.forEach(x=>{
    const sec=videoSeconds(x.duration);
    lengthGroups[sec===null?2:sec<=180?0:1].items.push(x);
  });
  const formats=lengthGroups.filter(g=>g.items.length).map(g=>({id:g.id,label:g.label,...aggregate(g.items,baseline)}));
  const top=[...viewed].sort((a,b)=>b.views-a.views).slice(0,3).map(v=>({
    id:v.id,title:v.title,views:v.views,url:v.url,publishedAt:v.publishedAt
  }));
  return {
    sampleSize:rows.length,viewCountAvailable:viewed.length,baselineMedian:baseline,
    themes,formats,top,
    warnings:[
      'Views are cumulative totals at one snapshot, not same-age comparisons. Older uploads have had longer to collect views.',
      'Video duration is not a reliable way to identify YouTube Shorts; short-length means duration only.',
      'Small topic samples are exploratory. Public data cannot reveal CTR, retention, impressions, or causes of performance.'
    ]
  };
}
export function fallbackIdeas(evidence){
  const meaningful=evidence.themes.filter(x=>!x.other&&x.count>=2);
  const topics=meaningful.length?meaningful:[{topic:evidence.top[0]?.title||'your audience topic'}];
  const first=toTopicTitle(topics[0].topic),second=toTopicTitle((topics[1]||topics[0]).topic);
  return [
    {title:first+' — a fresh angle',topic:first,hook:'Show what makes this new upload different in the opening moments.',
      why:'Tests a new angle on a recurring topic in the sampled uploads.',measure:'Compare views at the same days since upload (for example day 7).'},
    {title:second+' — a focused highlight',topic:second,hook:'Start with the most interesting real moment you can substantiate.',
      why:'Tests a focused format around a topic visible in recent titles.',measure:'Track 7-day views and audience retention in YouTube Studio if available.'},
    {title:first+' — live discussion or gameplay',topic:first,hook:'State the subject of the stream and what viewers can expect.',
      why:'Tests a different packaging format without claiming a proven advantage.',measure:'Compare early views with other uploads of a similar length and age.'}
  ];
}
