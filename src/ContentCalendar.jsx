import React,{useMemo,useState} from 'react';
import {CalendarDays,CalendarCheck,Instagram,Youtube,Copy,Check,FileDown,RefreshCw,Info,Target,Layers3,ArrowRight} from 'lucide-react';
import {createContentCalendar,calendarToText,calendarToCSV,calendarToICS} from './content-calendar-plan.js';
import './content-calendar.css';

const localToday=()=>{
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
const niceDate=date=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{
  weekday:'short',month:'short',day:'numeric',timeZone:'UTC'
});
function download(name,content,type){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement('a');
  link.href=url;link.download=name;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
const goals=[
 ['consistency','Post consistently'],['engagement','Start conversations'],
 ['growth','Test new angles'],['education','Share useful knowledge']
];
const frequencies=[[2,'2 posts / week'],[3,'3 posts / week'],[5,'5 posts / week']];
const channelLabels={both:'Mix both platforms',instagram:'Instagram Reels only',youtube:'YouTube Shorts only'};
export default function ContentCalendar(){
  const [niche,setNiche]=useState('');
  const [audience,setAudience]=useState('');
  const [goal,setGoal]=useState('consistency');
  const [platform,setPlatform]=useState('both');
  const [days,setDays]=useState(7);
  const [perWeek,setPerWeek]=useState(3);
  const [startDate,setStartDate]=useState(localToday);
  const [plan,setPlan]=useState(null);
  const [variation,setVariation]=useState(0);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);
  const grouped=useMemo(()=>plan?Object.entries(plan.slots.reduce((acc,item)=>{
    const key='Week '+item.week;
    (acc[key]||=[]).push(item);
    return acc;
  },{})):[],[plan]);
  const completed=plan?.slots.filter(x=>x.status==='done').length||0;
  const cfg=()=>({niche,audience,goal,platform,days,perWeek,startDate});
  async function loadCalendar(nextVariation){
    if(busy)return;
    setError('');setCopied(false);setBusy(true);
    try{
      // Validate locally before requesting optional Groq personalization.
      const baseline=createContentCalendar(cfg(),nextVariation);
      const response=await fetch('/api/content-calendar',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({...baseline.config,variant:nextVariation})
      });
      if(!response.headers.get('content-type')?.includes('application/json'))
        throw Error('Calendar generation API is not deployed yet.');
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Calendar service unavailable.');
      if(!Array.isArray(result.slots)||result.slots.length!==baseline.slots.length)
        throw Error('Incomplete calendar response.');
      setPlan(result);
    }catch(e){
      try{
        const backup=createContentCalendar(cfg(),nextVariation);
        setPlan({...backup,mode:'free',note:'Free calendar templates. AI idea generation was unavailable; the dates and prompts are still ready to use.'});
        setError('AI suggestions were unavailable; showing the free calendar instead.');
      }catch(validationError){setError(validationError.message||'Please check your settings.');}
    }finally{setBusy(false);}
  }
  function generate(e){
    e?.preventDefault?.();
    loadCalendar(variation);
  }
  function regenerate(){
    const value=variation+1;setVariation(value);
    loadCalendar(value);
  }
  async function copy(){
    try{await navigator.clipboard.writeText(calendarToText(plan));setCopied(true);}
    catch{setError('Clipboard access was blocked. Download the CSV instead.');}
  }
  function exportFile(format){
    if(!plan)return;
    const name='channelscope-content-calendar-'+plan.config.startDate;
    try{
      if(format==='ics')download(name+'.ics',calendarToICS(plan),'text/calendar;charset=utf-8');
      else download(name+'.csv',calendarToCSV(plan),'text/csv;charset=utf-8');
    }catch(e){setError('Could not download this plan. Use Copy plan instead.');}
  }
  function toggle(id){
    setPlan(prev=>({...prev,slots:prev.slots.map(item=>item.id===id?
      {...item,status:item.status==='done'?'planned':'done'}:item)}));
  }
  return <>
    <div className="page-heading cc-page-heading">
      <div className="eyebrow">CREATOR PLANNING STUDIO ✦</div>
      <h1>Plan content with purpose<span className="accent">.</span></h1>
      <p>Build a realistic 7- or 30-day schedule for Instagram Reels and YouTube Shorts around your niche, goals and availability.</p>
    </div>
    <div className="cc-hero">
      <div className="cc-hero-icon"><CalendarDays size={27}/></div>
      <div><small>CONTENT CALENDAR</small><h2>More consistency. Less guesswork.</h2>
        <p>Get themed content prompts and a cadence you choose—without assuming the algorithm's favorite posting days.</p></div>
      <span><Check size={15}/> Free · Optional AI</span>
    </div>
    <div className="cc-layout">
      <section className="cc-editor">
        <h2><Target size={19}/> Set up your plan</h2>
        <form onSubmit={generate}>
          <label htmlFor="cc-niche">Your content niche <span>Required</span></label>
          <textarea id="cc-niche" required rows={4} minLength={8} maxLength={180}
            value={niche} onChange={e=>setNiche(e.target.value)}
            placeholder="e.g. PS5 gaming, Cricket 26 highlights, and fun moments from livestreams"/>
          <label htmlFor="cc-audience">Your audience <span>Optional</span></label>
          <input id="cc-audience" value={audience} maxLength={120} onChange={e=>setAudience(e.target.value)}
            placeholder="e.g. casual cricket and console gaming fans"/>
          <label htmlFor="cc-goal">Primary goal</label>
          <select id="cc-goal" value={goal} onChange={e=>setGoal(e.target.value)}>
            {goals.map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select>
          <label htmlFor="cc-platform">Where will you post?</label>
          <select id="cc-platform" value={platform} onChange={e=>setPlatform(e.target.value)}>
            {Object.entries(channelLabels).map(([key,value])=><option value={key} key={key}>{value}</option>)}
          </select>
          <label>Planning window</label>
          <div className="cc-switch">{[7,30].map(n=><button type="button" key={n}
            className={days===n?'active':''} onClick={()=>setDays(n)}>{n} days</button>)}</div>
          <label htmlFor="cc-frequency">Posting pace</label>
          <select id="cc-frequency" value={perWeek} onChange={e=>setPerWeek(Number(e.target.value))}>
            {frequencies.map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select>
          <label htmlFor="cc-start">Start date</label>
          <input id="cc-start" type="date" min="2020-01-01" max="2100-12-31"
            required value={startDate} onChange={e=>setStartDate(e.target.value)}/>
          <p className="cc-hint"><Info size={15}/> The schedule starts on your chosen date. Suggested days are evenly spaced, not optimized or guaranteed to improve reach.</p>
          <button type="submit" disabled={busy} className="primary-btn cc-generate">
            {busy?<RefreshCw size={17} className="spin"/>:<CalendarCheck size={17}/>}
            {busy?'Creating calendar…':plan?'Update my calendar':'Generate content calendar'}
            {!busy&&<ArrowRight size={16}/>}
          </button>
        </form>
      </section>
      <section className="cc-output">
        <div className="cc-output-head">
          <div><small>YOUR NEXT CONTENT</small><h2>Publishing calendar</h2></div>
          {plan&&<span className="cc-free">{plan.mode==='ai'?'AI-GENERATED':plan.mode==='hybrid'?'AI + TEMPLATES':'FREE PLANNER'}</span>}
        </div>
        {error&&<p className="error" role="alert">{error}</p>}
        {!plan&&<div className="cc-empty">
          <CalendarDays size={38}/>
          <h3>Your next posts, planned in minutes</h3>
          <p>Enter your niche and choose a realistic pace. We'll fill a draft calendar with angles to explore, opening hooks and simple calls to action.</p>
          <div><Instagram size={21}/><Youtube size={22}/></div>
        </div>}
        {plan&&<>
          <div className="cc-stats">
            <div><strong>{plan.stats.scheduled}</strong><small>Planned posts</small></div>
            <div><strong>{plan.stats.instagram}</strong><small>Instagram Reels</small></div>
            <div><strong>{plan.stats.youtube}</strong><small>YouTube Shorts</small></div>
            <div><strong>{completed}</strong><small>Checked off</small></div>
          </div>
          <p className="cc-goal-note"><Target size={16}/>{plan.goalNote}</p>
          <div className="cc-tools">
            <button type="button" disabled={busy} className="cc-tool" onClick={regenerate}><RefreshCw size={15} className={busy?'spin':''}/> {busy?'Thinking…':'Fresh angles'}</button>
            <button type="button" className="cc-tool" onClick={copy}>{copied?<Check size={15}/>:<Copy size={15}/>} {copied?'Copied':'Copy plan'}</button>
            <button type="button" className="cc-tool" onClick={()=>exportFile('ics')}><CalendarDays size={15}/> Download .ics</button>
            <button type="button" className="cc-tool" onClick={()=>exportFile('csv')}><FileDown size={15}/> Download CSV</button>
          </div>
          <div className="cc-week-stack">
            {grouped.map(([week,items])=><section key={week} className="cc-week">
              <h3><Layers3 size={17}/>{week} <span>{items.length} content ideas</span></h3>
              <div className="cc-posts">{items.map(item=><article key={item.id} className={'cc-post'+(item.status==='done'?' cc-done':'')}>
                <div className="cc-post-top"><span className="cc-date">{niceDate(item.date)}</span>
                  <span className={'cc-platform '+(item.platform==='Instagram Reel'?'instagram':'youtube')}>
                    {item.platform==='Instagram Reel'?<Instagram size={13}/>:<Youtube size={14}/>}
                    {item.platform}</span>
                </div>
                <div className="cc-post-content">
                  <strong>{item.title}</strong>
                  <p>{item.idea}</p>
                  <p><b>OPENING HOOK</b> {item.hook}</p>
                  <p><b>CTA</b> {item.callToAction}</p>
                  <p className="cc-post-tip">{item.goalNote}</p>
                </div>
                <button type="button" className="cc-toggle" onClick={()=>toggle(item.id)}>
                  {item.status==='done'?<Check size={15}/>:<span className="cc-circle"/>}
                  {item.status==='done'?'Completed (local only)':'Mark as done'}
                </button>
              </article>)}</div>
            </section>)}
          </div>
          <p className="cc-disclaimer"><Info size={16}/>{plan.note} Marked completions are held only on this page and are not saved after refresh. When AI is available, your niche and audience are sent to Groq. Export your plan if you want to keep it.</p>
        </>}
      </section>
    </div>
  </>;
}
