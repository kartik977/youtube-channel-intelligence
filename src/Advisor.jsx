import React, { useState } from 'react';
import { Sparkles, WandSparkles, Target, Lightbulb, BarChart3, AlertCircle, Check, Copy, RefreshCw, Info, ArrowRight } from 'lucide-react';
import './advisor.css';

function planText(report, title) {
  return [
    'ChannelScope Creator Advisor — '+title, '', report.summary, '',
    'WHAT THE PUBLIC DATA SHOWS',
    ...report.strengths.map(s=>'- '+s), '',
    'YOUR NEXT EXPERIMENTS',
    ...report.priorities.map((p,i)=> (i+1)+'. '+p.title+'\nWhy: '+p.reason+'\nTry: '+p.experiment+'\nMeasure: '+p.measure), '',
    'VIDEO IDEAS',
    ...report.ideas.map((idea,i)=>(i+1)+'. '+idea.title+'\nHook: '+idea.hook+'\nWhy test it: '+idea.rationale), '',
    report.note
  ].join('\n');
}

export default function Advisor({data}) {
  const [report,setReport]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [copied,setCopied]=useState(false);
  async function run() {
    if(loading) return;
    setLoading(true);setError('');setCopied(false);
    try {
      const response=await fetch('/api/advisor', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(data)
      });
      const contentType=response.headers.get('content-type')||'';
      if(!contentType.includes('application/json')) {
        throw new Error('Advisor API not deployed yet. Deploy the latest GitHub code to Cloudflare.');
      }
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||'Could not generate your advisor report.');
      setReport(body);
    } catch(e) { setError(e.message||'Could not generate a report.'); }
    finally {setLoading(false);}
  }
  async function copyPlan() {
    if(!report) return;
    try {
      await navigator.clipboard.writeText(planText(report,data.channel.title));
      setCopied(true);
    } catch { setError('Copy is unavailable in this browser. Try again in a secure browser window.'); }
  }
  return <>
    <div className="page-heading advisor-heading">
      <div className="eyebrow">CHANNELSCOPE INTELLIGENCE STUDIO ✦</div>
      <h1>Your creator advisor<span className="accent">.</span></h1>
      <p>Turn recent public YouTube signals into testable content ideas and your next three growth experiments.</p>
    </div>

    <section className="advisor-hero">
      <div className="advisor-orb"><WandSparkles size={30}/></div>
      <div className="advisor-hero-copy">
        <span className="advisor-kicker">PERSONALIZED CONTENT PLAYBOOK</span>
        <h2>Make your next video more intentional.</h2>
        <p>Analyze <strong>{data.channel.title}</strong> using {data.videos.length} recent public upload{data.videos.length===1?'':'s'}.
          Your report includes standout content, a testing roadmap and three fresh ideas.</p>
        <div className="advisor-micro"><span><Check size={14}/> No paid subscription</span><span><Check size={14}/> No private analytics</span><span><Check size={14}/> Based on your sample</span></div>
      </div>
      <button className="primary-btn advisor-generate" type="button" onClick={run} disabled={loading}>
        {loading?<RefreshCw className="spin" size={17}/>:<Sparkles size={17}/>}
        {loading?'Preparing report…':report?'Regenerate advice':'Generate my plan'}
      </button>
    </section>

    {error && <div className="error" role="alert"><AlertCircle size={18}/>{error}</div>}

    {!report && !loading && <section className="advisor-preview">
      <div className="advisor-preview-card"><BarChart3 size={21}/><strong>What is working?</strong><p>Spot your recent standout videos and a realistic performance baseline.</p></div>
      <div className="advisor-preview-card"><Target size={21}/><strong>What to test next?</strong><p>Get three experiments with a measurable outcome for each.</p></div>
      <div className="advisor-preview-card"><Lightbulb size={21}/><strong>What should you post?</strong><p>Explore three video concepts, hooks and reasons to test them.</p></div>
    </section>}

    {loading && <div className="advisor-loading" role="status"><Sparkles size={23} className="spin"/><h3>Building your content playbook</h3><p>Reviewing public uploads and preparing tailored recommendations…</p></div>}

    {report && <div className="advisor-report" aria-live="polite">
      <div className="advisor-report-header">
        <div><span className={'advisor-mode '+(report.mode==='ai'?'ai-mode':'rule-mode')}>
          <Sparkles size={13}/>{report.mode==='ai'?'AI-GENERATED':'FREE DATA-DRIVEN MODE'}
        </span><h2>Your action plan for {data.channel.title}</h2></div>
        <button className="outline-btn" onClick={copyPlan}><Copy size={15}/>{copied?'Copied!':'Copy plan'}</button>
      </div>
      <p className="advisor-summary">{report.summary}</p>

      <div className="advisor-section-label"><BarChart3 size={17}/> SIGNALS FROM YOUR SAMPLE</div>
      <div className="advisor-strengths">
        {report.strengths.map((s,i)=><div className="advisor-strength" key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{s}</p></div>)}
      </div>

      <div className="advisor-section-label"><Target size={17}/> THREE PRIORITY EXPERIMENTS</div>
      <div className="advisor-priorities">
        {report.priorities.map((p,i)=><article className="advisor-priority" key={i}>
          <span className="advisor-priority-num">0{i+1}</span><div>
          <h3>{p.title}</h3><p className="advisor-reason">{p.reason}</p>
          <div className="advisor-action"><strong><ArrowRight size={14}/> TRY THIS</strong>{p.experiment}</div>
          <div className="advisor-measure"><strong>MEASURE</strong>{p.measure}</div>
          </div>
        </article>)}
      </div>

      <div className="advisor-section-label"><Lightbulb size={17}/> YOUR NEXT VIDEO IDEAS</div>
      <div className="advisor-ideas">{report.ideas.map((idea,i)=><article className="advisor-idea" key={i}>
        <div className="advisor-idea-head"><span>IDEA {String(i+1).padStart(2,'0')}</span><Lightbulb size={17}/></div>
        <h3>{idea.title}</h3><p><strong>OPENING HOOK</strong> {idea.hook}</p><p className="advisor-idea-why">{idea.rationale}</p>
      </article>)}</div>
      <p className="notice advisor-disclaimer"><Info size={18}/>{report.note}</p>
    </div>}
  </>;
}
