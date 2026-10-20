import {getCalendarIdeas} from './calendar-ideas.js';
// Offline-friendly content planning: no trend, analytics, or posting claims.
// Dates are a user-chosen cadence, never a prediction of the best time to post.
const goals=new Set(['consistency','engagement','growth','education']);
const platforms=new Set(['both','instagram','youtube']);
const frequencies=new Set([2,3,5]);
const horizons=new Set([7,30]);
const clean=(v,max=220)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const pad=n=>String(n).padStart(2,'0');
function dateUTC(iso){
  if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))return null;
  const y=+iso.slice(0,4),m=+iso.slice(5,7),d=+iso.slice(8,10);
  if(y<2020||y>2100)return null;
  const date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
  return date;
}
const isoDay=d=>d.toISOString().slice(0,10);
const addDays=(day,amount)=>new Date(day.getTime()+amount*86400000);
export function normalizeCalendarBrief(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Describe the niche you create content about.');
  const niche=clean(raw.niche,180),audience=clean(raw.audience,120);
  const goal=clean(raw.goal,20)||'consistency';
  const platform=clean(raw.platform,20)||'both';
  const days=Number(raw.days),perWeek=Number(raw.perWeek);
  const startDate=clean(raw.startDate,10);
  if(niche.length<8)throw Error('Describe your niche in at least 8 characters.');
  if(!goals.has(goal))throw Error('Choose an available creator goal.');
  if(!platforms.has(platform))throw Error('Choose Instagram, YouTube, or both platforms.');
  if(!horizons.has(days))throw Error('Choose a 7-day or 30-day calendar.');
  if(!frequencies.has(perWeek))throw Error('Choose 2, 3, or 5 posts each week.');
  if(!dateUTC(startDate))throw Error('Choose a valid calendar start date.');
  return {niche,audience,goal,platform,days,perWeek,startDate};
}
const goalNotes={
  consistency:'Build a posting rhythm you can maintain; a schedule alone does not cause growth.',
  engagement:'Invite a genuine response without promising additional reach or views.',
  growth:'Test fresh ways to present your niche; no ideas are guaranteed to grow your account.',
  education:'Share verifiable observations and explain only what you can substantiate.'
};
const daysOfWeek={
  2:[0,3],
  3:[0,2,4],
  5:[0,1,3,4,6]
};
function platformFor(index,choice){
  if(choice==='instagram')return 'Instagram Reel';
  if(choice==='youtube')return 'YouTube Short';
  return index%2===0?'Instagram Reel':'YouTube Short';
}
export function createContentCalendar(raw,variant=0){
  const config=normalizeCalendarBrief(raw),start=dateUTC(config.startDate);
  const slots=[];
  const ideas=getCalendarIdeas(config);
  let idx=0;
  for(let offset=0;offset<config.days;offset++){
    if(!daysOfWeek[config.perWeek].includes(offset%7))continue;
    const rotation=(idx+(Number.isInteger(variant)&&variant>=0?variant:0))%ideas.length;
    const sig=ideas[rotation];
    const platform=platformFor(idx,config.platform);
    const date=isoDay(addDays(start,offset));
    const title=sig.title;
    const note=config.goal==='education'?
      'Keep the claim verifiable and make the takeaway clear.':config.goal==='engagement'?
      'Ask a genuine question and engage with responses.':config.goal==='growth'?
      'Test this angle against other content of similar age; results are uncertain.':
      'Choose a scope you can produce on schedule.';
    slots.push({
      id:'slot-'+offset,date,dayOffset:offset,week:Math.floor(offset/7)+1,
      platform,title,idea:sig.action,hook:sig.hook,
      callToAction:sig.cta,pillar:sig.pillar,
      goalNote:note,status:'planned'
    });
    idx++;
  }
  return {
    config,goalNote:goalNotes[config.goal],slots,
    stats:{scheduled:slots.length,instagram:slots.filter(x=>x.platform==='Instagram Reel').length,
      youtube:slots.filter(x=>x.platform==='YouTube Short').length,days:config.days},
    note:'This is a draft planning calendar, not an optimized posting-time recommendation. The ideas describe future content to create, not existing footage.'
  };
}
export function calendarToText(plan){
  return [
    'ChannelScope Content Calendar',plan.config.days+' days · '+plan.config.niche,
    plan.stats.scheduled+' draft content ideas', '',
    ...plan.slots.map(slot=>[
      slot.date+' | '+slot.platform+' | '+slot.title,
      'Concept: '+slot.idea,
      'Hook: '+slot.hook,
      'CTA: '+slot.callToAction,
      'Status: '+slot.status,''
    ].join('\n'))
  ].join('\n');
}
const icsEscape=value=>String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
export function calendarToICS(plan){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//ChannelScope//Creator Content Calendar//EN',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  for(const slot of plan.slots){
    const next=addDays(dateUTC(slot.date),1);
    const start=slot.date.replace(/-/g,''),end=isoDay(next).replace(/-/g,'');
    lines.push('BEGIN:VEVENT','UID:channelscope-'+start+'-'+slot.id+'@calendar.local',
      'DTSTAMP:'+start+'T120000Z','DTSTART;VALUE=DATE:'+start,'DTEND;VALUE=DATE:'+end,
      'SUMMARY:'+icsEscape(slot.platform+': '+slot.title),
      'DESCRIPTION:'+icsEscape([slot.idea,'Hook: '+slot.hook,'CTA: '+slot.callToAction,
        'Draft task only — does not publish or set a best posting time.'].join('\n')),
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n')+'\r\n';
}
export function calendarToCSV(plan){
  const fields=['date','platform','title','pillar','idea','hook','callToAction','status'];
  const q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
  return [fields.map(q).join(','),...plan.slots.map(s=>fields.map(k=>q(s[k])).join(','))].join('\r\n')+'\r\n';
}
