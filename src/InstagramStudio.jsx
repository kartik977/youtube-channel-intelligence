import React,{useState} from 'react';
import {Instagram,Hash,UserRound,Copy,Check,Sparkles,Info,RefreshCw,AlertCircle,PenLine,ArrowRight,Heart,ShieldCheck} from 'lucide-react';
import './instagram-studio.css';

const tones=[
  {value:'friendly',label:'Friendly & approachable'},
  {value:'professional',label:'Professional'},
  {value:'bold',label:'Bold & energetic'},
  {value:'minimal',label:'Clean & minimal'}
];
const profiles=[
  {value:'creator',label:'Creator'},
  {value:'personal',label:'Personal'},
  {value:'business',label:'Business'}
];
function CopyButton({value,label='Copy',onError}){
  const [copied,setCopied]=useState(false);
  async function onClick(){
    try{
      await navigator.clipboard.writeText(value);
      setCopied(true);
    }catch{onError('Clipboard access was blocked by your browser. Try copying the text manually.');}
  }
  return <button type="button" className="ig-copy" onClick={onClick}>
    {copied?<Check size={15}/>:<Copy size={15}/>} {copied?'Copied':label}
  </button>;
}
export default function InstagramStudio(){
  const [kind,setKind]=useState('bio');
  const [description,setDescription]=useState('');
  const [name,setName]=useState('');
  const [audience,setAudience]=useState('');
  const [tone,setTone]=useState('friendly');
  const [profile,setProfile]=useState('creator');
  const [format,setFormat]=useState('post');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  function changeKind(next){
    if(next===kind)return;
    setKind(next);setResult(null);setError('');
  }
  async function create(e){
    e.preventDefault();
    if(busy)return;
    setBusy(true);setError('');
    try{
      const res=await fetch('/api/instagram',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({kind,description,name,audience,tone,profile,format})
      });
      if(!res.headers.get('content-type')?.includes('application/json'))
        throw Error('Instagram Studio API has not deployed to Cloudflare yet.');
      const data=await res.json();
      if(!res.ok)throw Error(data.error||'Could not generate your suggestions.');
      if(data.kind!==kind||!(kind==='bio'?Array.isArray(data.bios):Array.isArray(data.hashtags)))
        throw Error('Generator returned an incomplete response.');
      setResult(data);
    }catch(e){setError(e.message||'Something went wrong.');}
    finally{setBusy(false);}
  }
  const tags=result?.kind==='hashtags'?result.hashtags:[];
  const selected=tags.filter(x=>x.priority==='recommended');
  const alternatives=tags.filter(x=>x.priority==='alternative');
  const copyAll=tags.map(x=>x.tag).join(' ');
  return <>
    <div className="page-heading ig-page-heading">
      <div className="eyebrow">INSTAGRAM CONTENT STUDIO ✦</div>
      <h1>Make your Instagram stand out<span className="accent">.</span></h1>
      <p>Create a profile bio or relevant post and Reel hashtags from a description you provide. No Instagram login or YouTube channel required.</p>
    </div>
    <section className="ig-intro">
      <div className="ig-intro-logo"><Instagram size={27}/></div>
      <div>
        <small>YOUR IDEAS, MADE MORE SHAREABLE</small>
        <h2>Write once. Discover the right words.</h2>
        <p>Get short bio options or hashtags that reflect your actual content, not unverified trends.</p>
      </div>
      <span><ShieldCheck size={15}/> Free-tier tools</span>
    </section>
    <div className="ig-workspace">
      <section className="ig-editor">
        <h2><PenLine size={19}/> Build your draft</h2>
        <div className="ig-kind-group" role="group" aria-label="Instagram generator type">
          <button type="button" className={kind==='bio'?'active':''} onClick={()=>changeKind('bio')}>
            <UserRound size={19}/> Instagram Bio <small>150-character profiles</small>
          </button>
          <button type="button" className={kind==='hashtags'?'active':''} onClick={()=>changeKind('hashtags')}>
            <Hash size={19}/> Hashtag Generator <small>Posts & Reels</small>
          </button>
        </div>
        <form onSubmit={create}>
          <label htmlFor="ig-description">
            {kind==='bio'?'Tell us about yourself or your brand':'Describe your post or Reel'} <span>Required</span>
          </label>
          <textarea id="ig-description" value={description} onChange={e=>setDescription(e.target.value)}
            minLength={8} maxLength={850} required rows={6}
            placeholder={kind==='bio'?
              'I create PS5 gaming content, livestreams, and Cricket 26 highlights. I love sharing fun moments and connecting with gamers.':
              'A sunset photo from my road trip through California, with ocean views, golden light and peaceful scenery.'}/>
          <div className="ig-input-meta"><span>Give a few specifics for better suggestions</span><span>{description.length}/850</span></div>
          {kind==='bio'?<>
            <label htmlFor="ig-profile">Profile type</label>
            <select id="ig-profile" value={profile} onChange={e=>setProfile(e.target.value)}>
              {profiles.map(v=><option value={v.value} key={v.value}>{v.label}</option>)}
            </select>
            <label htmlFor="ig-name">Profile or brand name <span>Optional</span></label>
            <input id="ig-name" maxLength={70} value={name} onChange={e=>setName(e.target.value)}
              placeholder="e.g. Daywalker_OP"/>
          </>:<>
            <label htmlFor="ig-format">Content format</label>
            <div className="ig-format">
              {['post','reel'].map(v=><button type="button" key={v} className={format===v?'active':''} onClick={()=>setFormat(v)}>
                {v==='post'?'Instagram Post':'Instagram Reel'}
              </button>)}
            </div>
          </>}
          <label htmlFor="ig-audience">Who is the content for? <span>Optional</span></label>
          <input id="ig-audience" maxLength={120} value={audience} onChange={e=>setAudience(e.target.value)}
            placeholder={kind==='bio'?'e.g. PS5 gamers and cricket fans':'e.g. nature and travel lovers'}/>
          <label htmlFor="ig-tone">Writing style</label>
          <select id="ig-tone" value={tone} onChange={e=>setTone(e.target.value)}>
            {tones.map(v=><option value={v.value} key={v.value}>{v.label}</option>)}
          </select>
          <p className="ig-privacy"><Info size={15}/> Your description is used to generate suggestions. If Groq is available, it's sent to Groq for drafting. This page doesn't connect to your Instagram account or publish anything.</p>
          <button className="primary-btn ig-generate" type="submit" disabled={busy}>
            {busy?<RefreshCw size={17} className="spin"/>:<Sparkles size={17}/>}
            {busy?'Writing suggestions…':result?'Regenerate suggestions':kind==='bio'?'Generate Instagram bios':'Find relevant hashtags'}
          </button>
        </form>
      </section>
      <section className="ig-output">
        <div className="ig-output-top"><div><small>{kind==='bio'?'YOUR PROFILE':'YOUR POST OR REEL'}</small>
          <h2>{kind==='bio'?'Instagram Bio Ideas':'Hashtags for Your Content'}</h2></div>
          {result&&<span className={'ig-status '+(result.mode==='ai'?'ai':'')}>
            {result.mode==='ai'?'AI-GENERATED':result.mode==='hybrid'?'AI + TEMPLATES':'FREE DRAFT MODE'}
          </span>}
        </div>
        {error&&<p className="error" role="alert"><AlertCircle size={18}/>{error}</p>}
        {!result&&!busy&&<div className="ig-empty">
          {kind==='bio'?<UserRound size={36}/>:<Hash size={38}/>}
          <h3>{kind==='bio'?'Your next bio starts here':'Make your hashtags more specific'}</h3>
          <p>{kind==='bio'?
            'Tell us who you are and what you post to get three short, copy-ready bio options.':
            'Describe your content and get a focused group of hashtags with reasons for each.'}</p>
          <div><span><Check size={14}/> No login</span><span><Check size={14}/> One-click copy</span></div>
        </div>}
        {busy&&<div className="ig-empty" role="status"><RefreshCw size={33} className="spin"/>
          <h3>Building your Instagram draft</h3><p>Matching your niche, description and preferred tone.</p></div>}
        {result?.kind==='bio'&&<div className="ig-results">
          <p className="ig-result-lead">Choose a bio that represents you. Each option is within Instagram's 150-character limit.</p>
          {result.bios.map((bio,i)=><article className="ig-bio-card" key={i}>
            <div className="ig-bio-header"><strong><span>0{i+1}</span> {bio.label}</strong>
              <span className="ig-char-count">{bio.characters}/150</span></div>
            <p>{bio.text}</p>
            <CopyButton value={bio.text} label="Copy bio" onError={setError}/>
          </article>)}
          <p className="ig-tip"><Heart size={16}/> Make it yours: double-check any claims and edit the copy before pasting into Instagram.</p>
        </div>}
        {result?.kind==='hashtags'&&<div className="ig-results">
          <div className="ig-hashtag-heading"><h3><Hash size={18}/> Suggested hashtags</h3>
            <CopyButton value={selected.map(x=>x.tag).join(' ')} label="Copy recommended" onError={setError}/></div>
          <p className="ig-result-lead">Start with the most relevant tags. Skip any that don't accurately describe your content.</p>
          <div className="ig-tags">
            {selected.map((entry,i)=><article key={entry.tag} className="ig-tag-card">
              <span className="ig-tag-index">0{i+1}</span>
              <strong>{entry.tag}</strong>
              <p>{entry.reason}</p>
              <CopyButton value={entry.tag} onError={setError}/>
            </article>)}
          </div>
          {alternatives.length>0&&<>
            <h3 className="ig-alternative-title">Additional related options</h3>
            {alternatives.map(x=><div className="ig-tag-alt" key={x.tag}>
              <strong>{x.tag}</strong><span>{x.reason}</span><CopyButton value={x.tag} onError={setError}/>
            </div>)}
          </>}
          <div className="ig-bottom-actions"><CopyButton value={copyAll} label="Copy all suggestions" onError={setError}/></div>
          <p className="ig-tip"><Info size={16}/> These are topic-matched ideas, not live popularity rankings. No hashtag can guarantee additional views or followers.</p>
        </div>}
        {result&&<div className="ig-output-note"><Info size={16}/>{result.note}</div>}
      </section>
    </div>
  </>;
}
