import React,{useState} from 'react';
import {Lightbulb,Target,TrendingUp,BarChart3,Clock3,Copy,Check,Info,ArrowRight,ExternalLink,RefreshCw,AlertCircle,Sparkles,Layers3} from 'lucide-react';
import './opportunity-finder.css';
const num=n=>n===null||n===undefined?'—':new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n);
const ratio=r=>r==null?'Not comparable':r.toFixed(2)+'× sampled median';
function CopyIdea({idea,onError}){
  const [done,setDone]=useState(false);
  async function copy(){
    try{await navigator.clipboard.writeText([idea.title,'',idea.hook,'','Why test: '+idea.why,'Measure: '+idea.measure].join('\n'));setDone(true);}
    catch{onError('Copy was blocked by your browser.');}
  }
  return <button className="of-copy" type="button" onClick={copy}>{done?<Check size={15}/>:<Copy size={15}/>} {done?'Copied':'Copy idea'}</button>;
}
export default function OpportunityFinder({data,onUseIdea}){
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  async function run(){
    if(loading)return;
    setLoading(true);setError('');
    try{
      const res=await fetch('/api/opportunities',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)
      });
      if(!res.headers.get('content-type')?.includes('application/json'))throw Error('Opportunity Finder API has not been deployed yet.');
      const next=await res.json();
      if(!res.ok)throw Error(next.error||'Could not analyze this channel.');
      if(!next.evidence||!Array.isArray(next.ideas))throw Error('The analysis was incomplete.');
      setResult(next);
    }catch(e){setError(e.message||'Could not analyze public videos.');}
    finally{setLoading(false);}
  }
  const e=result?.evidence,topics=e?.themes?.filter(t=>!t.other)||[];
  return <>
    <div className="page-heading of-heading">
      <div className="eyebrow">TOPIC SIGNALS · YOUR NEXT CONTENT EXPERIMENT ✦</div>
      <h1>What should you post next<span className="accent">?</span></h1>
      <p>Find recurring topics in your recent public uploads, compare their cumulative views and build new video ideas worth testing.</p>
    </div>
    <section className="of-hero">
      <div className="of-hero-orb"><Target size={28}/></div>
      <div className="of-hero-copy">
        <small>CONTENT OPPORTUNITY FINDER</small>
        <h2>Turn recent performance into new ideas.</h2>
        <p>Analyze <strong>{data.channel.title}</strong> using up to {data.videos.length} sampled public uploads. No additional keys, subscriptions or private Studio access.</p>
      </div>
      <button className="primary-btn of-generate" type="button" disabled={loading} onClick={run}>
        {loading?<RefreshCw size={17} className="spin"/>:<Sparkles size={17}/>}
        {loading?'Finding patterns…':result?'Refresh opportunities':'Find opportunities'}
      </button>
    </section>
    {error&&<p className="error" role="alert"><AlertCircle size={18}/>{error}</p>}
    {!result&&!loading&&<div className="of-preview">
      <article><TrendingUp size={22}/><strong>Recurring themes</strong><p>Group video topics using only titles in the loaded channel sample.</p></article>
      <article><BarChart3 size={22}/><strong>Performance context</strong><p>Compare public median views with clear sample sizes and age caveats.</p></article>
      <article><Lightbulb size={22}/><strong>Your next three ideas</strong><p>Get usable video experiments and open one in AI Video Optimizer.</p></article>
    </div>}
    {loading&&<div className="of-loading" role="status"><RefreshCw size={26} className="spin"/><h3>Reviewing recent content</h3><p>Grouping title themes, comparing public views and preparing new ideas.</p></div>}
    {result&&<div className="of-results" aria-live="polite">
      <header className="of-summary-head">
        <div><span className={'of-mode '+(result.mode==='ai'?'of-ai':'')}>
          <Sparkles size={13}/>{result.mode==='ai'?'AI IDEAS + REAL DATA':'FREE DATA-BASED IDEAS'}
        </span><h2>Opportunities for {result.channelTitle}</h2></div>
        <span className="of-count">Sample: {e.sampleSize} recent uploads</span>
      </header>
      <div className="of-metrics">
        <div><small>PUBLIC VIEW BASELINE</small><strong>{num(e.baselineMedian)}</strong><span>Median cumulative views</span></div>
        <div><small>VIEW COUNTS AVAILABLE</small><strong>{e.viewCountAvailable}/{e.sampleSize}</strong><span>Accessible in sample</span></div>
        <div><small>TOPIC GROUPS FOUND</small><strong>{topics.length}</strong><span>At least two uploads per group</span></div>
      </div>
      <section className="of-section">
        <div className="of-title"><div><small>01 · CONTENT PATTERNS</small><h3><Layers3 size={19}/> Your recurring topics</h3></div></div>
        {topics.length?<div className="of-themes">{topics.map((theme,i)=><article className="of-theme" key={theme.topic}>
          <div className="of-theme-head"><div><span className="of-topic-num">0{i+1}</span><h4>{theme.topic}</h4></div><span className="of-topic-count">{theme.count} videos</span></div>
          <div className="of-theme-metrics"><strong>{num(theme.medianViews)} median views</strong>
            <span>{ratio(theme.relativeMedian)} · {theme.measured}/{theme.count} public view counts</span></div>
          <div className="of-examples">{theme.examples.map(v=><div key={v.id}>
            <span>{v.title}</span><strong>{num(v.views)}</strong>
            {v.url&&<a href={v.url} target="_blank" rel="noopener noreferrer" aria-label={'Open '+v.title}><ExternalLink size={14}/></a>}
          </div>)}</div>
          <p className="of-caveat">Cumulative public totals, not age-matched performance.</p>
        </article>)}</div>:
          <div className="of-empty"><Info size={20}/> Not enough repeated title terms to identify a reliable recurring topic in this sample. Ideas below remain exploratory.</div>}
      </section>
      <section className="of-section">
        <div className="of-title"><div><small>02 · VIDEO LENGTH</small><h3><Clock3 size={19}/> Compare upload lengths</h3></div></div>
        {e.formats.length?<div className="of-formats">{e.formats.map(group=><div key={group.id} className="of-format">
          <div><strong>{group.label}</strong><span>{group.count} upload{group.count===1?'':'s'}</span></div>
          <div><strong>{num(group.medianViews)}</strong><small>Median lifetime views</small></div>
        </div>)}</div>:<p className="of-empty">No video-duration metadata was available.</p>}
        <p className="of-note"><Info size={15}/> Short-length (up to 3 minutes) is based on duration, not an official YouTube Shorts classification. View totals are not age-adjusted.</p>
      </section>
      <section className="of-section">
        <div className="of-title"><div><small>03 · CONTENT EXPERIMENTS</small><h3><Lightbulb size={20}/> Three videos worth testing next</h3></div></div>
        <div className="of-ideas">{result.ideas.map((idea,i)=><article key={idea.title+'-'+i} className="of-idea">
          <div className="of-idea-top"><span>IDEA {String(i+1).padStart(2,'0')}</span><span className="of-topic-pill">{idea.topic}</span></div>
          <h4>{idea.title}</h4>
          <p><strong>HOOK</strong> {idea.hook}</p>
          <p><strong>WHY TRY IT</strong> {idea.why}</p>
          <p><strong>HOW TO MEASURE</strong> {idea.measure}</p>
          <div className="of-actions"><CopyIdea idea={idea} onError={setError}/>
            <button type="button" className="of-apply" onClick={()=>onUseIdea(idea)}>
              Use in Video Optimizer <ArrowRight size={15}/>
            </button></div>
        </article>)}</div>
      </section>
      <p className="of-notice"><Info size={17}/>{result.note}</p>
      <p className="of-footnote">{e.warnings.join(' ')}</p>
    </div>}
  </>;
}
