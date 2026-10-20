import React,{useState} from 'react';
import {Send,Instagram,Youtube,Clapperboard,Sparkles,Copy,Check,Info,RefreshCw,AlertCircle,ArrowRight} from 'lucide-react';
import './social-publishing.css';

function CopyText({text,label,onError}){
  const [copied,setCopied]=useState(false);
  async function handle(){
    try{await navigator.clipboard.writeText(text);setCopied(true);}
    catch{onError('Browser clipboard access is unavailable. You can still select and copy the text.');}
  }
  return <button type="button" className="sp-copy" onClick={handle}>
    {copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':label}
  </button>;
}
const tags=values=>Array.isArray(values)?values.join(' '):'';
const tones=[['friendly','Friendly & approachable'],['professional','Professional'],['bold','Bold & energetic'],['minimal','Clean & minimal']];
export default function SocialPublishing(){
  const [description,setDescription]=useState('');
  const [topic,setTopic]=useState('');
  const [audience,setAudience]=useState('');
  const [tone,setTone]=useState('friendly');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [report,setReport]=useState(null);
  async function generate(e){
    e.preventDefault();
    if(busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/social-pack',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({description,topic,audience,tone,profile:'creator',format:'reel'})
      });
      if(!response.headers.get('content-type')?.includes('application/json'))
        throw Error('The Social Publishing API is not deployed yet.');
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Cannot create this publishing pack.');
      if(!data.instagram?.caption||!data.youtube?.title)throw Error('The response is incomplete.');
      setReport(data);
    }catch(e){setError(e.message||'Could not generate the pack.');}
    finally{setBusy(false);}
  }
  const instagramAll=report?[report.instagram.caption,tags(report.instagram.hashtags)].filter(Boolean).join('\n\n'):'';
  const youtubeAll=report?[
    report.youtube.title,'',report.youtube.description,'',tags(report.youtube.hashtags),
    '','Opening hook: '+report.youtube.hook].join('\n'):'';
  return <>
    <div className="page-heading sp-page-heading">
      <div className="eyebrow">CROSS-PLATFORM CREATOR STUDIO ✦</div>
      <h1>One idea. Two platforms<span className="accent">.</span></h1>
      <p>Describe what you're posting once. Get distinct, ready-to-edit drafts for Instagram Reels and YouTube Shorts—without connecting either account.</p>
    </div>
    <section className="sp-banner">
      <div className="sp-banner-icon"><Send size={28}/></div>
      <div><small>SOCIAL PUBLISHING ASSISTANT</small>
        <h2>Create once, tailor for each audience.</h2>
        <p>Instagram-friendly captions and searchable Shorts packaging. Everything remains draft-only and free to try.</p>
      </div>
      <span> <Check size={15}/> No login needed</span>
    </section>
    <div className="sp-columns">
      <section className="sp-editor">
        <h2><Clapperboard size={19}/> Tell us about your content</h2>
        <form onSubmit={generate}>
          <label htmlFor="sp-description">What's happening in your video? <span>Required</span></label>
          <textarea id="sp-description" rows={6} maxLength={850} minLength={8} required
            value={description} onChange={e=>setDescription(e.target.value)}
            placeholder="A Halloween decor video in Plano, Texas with colorful lights and ghostly figures outside a house."/>
          <p className="sp-hint">Only mention details actually present or planned. {description.length}/850</p>
          <label htmlFor="sp-topic">Working title or main topic <span>Optional</span></label>
          <input id="sp-topic" maxLength={110} value={topic} onChange={e=>setTopic(e.target.value)}
            placeholder="e.g. Spooky Halloween decorations in Plano"/>
          <label htmlFor="sp-audience">Intended audience <span>Optional</span></label>
          <input id="sp-audience" maxLength={120} value={audience} onChange={e=>setAudience(e.target.value)}
            placeholder="e.g. Halloween and decor fans"/>
          <label htmlFor="sp-tone">Writing style</label>
          <select id="sp-tone" value={tone} onChange={e=>setTone(e.target.value)}>
            {tones.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
          <p className="sp-disclosure"><Info size={16}/> Only your written brief is processed. If Groq is enabled, the brief is sent there for text drafting. Nothing is uploaded or published to Instagram or YouTube.</p>
          <button type="submit" disabled={busy} className="primary-btn sp-generate">
            {busy?<RefreshCw size={16} className="spin"/>:<Sparkles size={16}/>}
            {busy?'Preparing publishing pack…':report?'Regenerate both drafts':'Generate both drafts'}
            {!busy&&<ArrowRight size={16}/>}
          </button>
        </form>
      </section>
      <section className="sp-output">
        <div className="sp-output-heading">
          <div><small>YOUR CROSS-PLATFORM DRAFTS</small><h2>Publishing pack</h2></div>
          {report&&<span className={'sp-status '+(report.mode==='ai'?'ai':'')}>{
            report.mode==='ai'?'AI-GENERATED':report.mode==='hybrid'?'AI + TEMPLATES':'FREE DRAFT MODE'
          }</span>}
        </div>
        {error&&<div className="error" role="alert"><AlertCircle size={16}/>{error}</div>}
        {!report&&!busy&&<div className="sp-empty">
          <div><Instagram size={27}/><Youtube size={31}/></div>
          <h3>Your next post starts here</h3>
          <p>Describe one content idea and receive separately formatted Instagram and YouTube drafts you can copy.</p>
        </div>}
        {busy&&<div className="sp-empty" role="status"><RefreshCw size={29} className="spin"/>
          <h3>Writing for both platforms</h3><p>Keeping the descriptions factual and the formats distinct.</p></div>}
        {report&&<>
          <article className="sp-card">
            <div className="sp-card-header"><div><Instagram size={21}/><h3>Instagram Reel</h3></div><span>Caption + hashtags</span></div>
            <p className="sp-content">{report.instagram.caption}</p>
            <div className="sp-tags">{report.instagram.hashtags.map(t=><span key={t}>{t}</span>)}</div>
            <div className="sp-actions">
              <CopyText label="Copy caption" text={report.instagram.caption} onError={setError}/>
              <CopyText label="Copy Instagram pack" text={instagramAll} onError={setError}/>
            </div>
          </article>
          <article className="sp-card">
            <div className="sp-card-header"><div><Youtube size={22}/><h3>YouTube Short</h3></div><span>Title + description + hook</span></div>
            <p className="sp-intent">Detected content: <strong>{{showcase:'Showcase / display',tutorial:'How-to / tutorial',review:'Review',gameplay:'Gameplay',other:'General video'}[report.contentType]||'General video'}</strong> <span>· based on your description</span></p>
            <div className="sp-field"><small>TITLE ({Array.from(report.youtube.title).length}/100)</small>
              <p>{report.youtube.title}</p></div>
            <div className="sp-field"><small>DESCRIPTION</small><p>{report.youtube.description}</p></div>
            <div className="sp-field"><small>OPENING HOOK</small><p>{report.youtube.hook}</p></div>
            <div className="sp-tags">{report.youtube.hashtags.map(t=><span key={t}>{t}</span>)}</div>
            <div className="sp-actions">
              <CopyText label="Copy title" text={report.youtube.title} onError={setError}/>
              <CopyText label="Copy YouTube pack" text={youtubeAll} onError={setError}/>
            </div>
          </article>
          <div className="sp-bundle">
            <CopyText label="Copy both platform drafts"
              text={['INSTAGRAM REEL',instagramAll,'','YOUTUBE SHORT',youtubeAll].join('\n')} onError={setError}/>
          </div>
          <p className="sp-note"><Info size={17}/>{report.note} Hashtags are context-based, not trend or popularity rankings. Verify wording against your actual footage.</p>
        </>}
      </section>
    </div>
  </>;
}
