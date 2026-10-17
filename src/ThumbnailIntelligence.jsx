import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, WandSparkles, Sparkles, Download, Upload, Trash2, AlertCircle, RefreshCw, Check, Info, Layers3, Video, Radio, Clapperboard, Palette } from 'lucide-react';
import { renderThumbnail, thumbnailDimensions, THUMBNAIL_STYLES } from './thumbnailRenderer';
import './thumbnail.css';

const layouts = [
  {name:'Hero impact',description:'Bold text + subject focus'},
  {name:'Split story',description:'Visual-first side composition'},
  {name:'Cinematic',description:'Full-bleed artwork + frame'}
];
const formats = [
  {key:'video',name:'Video',icon:Video,detail:'1280 × 720 · 16:9'},
  {key:'live',name:'Live stream',icon:Radio,detail:'1280 × 720 · 16:9'},
  {key:'short',name:'Short',icon:Clapperboard,detail:'1080 × 1920 · 9:16'}
];
function useLocalImage(file) {
  const [image,setImage]=useState(null);
  useEffect(()=>{
    if(!file){setImage(null);return;}
    let active=true;
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{if(active)setImage(img);};
    img.onerror=()=>{if(active)setImage(null);};
    img.src=url;
    return()=>{active=false;URL.revokeObjectURL(url);};
  },[file]);
  return image;
}
function handleImageFile(event,setFile,setError) {
  const file=event.target.files?.[0];
  event.target.value='';
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)) {
    setError('Choose a PNG, JPEG or WebP image.');return;
  }
  if(file.size>8*1024*1024) {setError('Images must be smaller than 8 MB.');return;}
  setError('');
  setFile(file);
}
export default function ThumbnailIntelligence({data}) {
  const [kind,setKind]=useState('video');
  const [topic,setTopic]=useState('');
  const [description,setDescription]=useState('');
  const [style,setStyle]=useState('gaming');
  const [channelName,setChannelName]=useState(data?.channel?.title||'');
  const [subjectFile,setSubjectFile]=useState(null);
  const [logoFile,setLogoFile]=useState(null);
  const [headline,setHeadline]=useState('');
  const [subline,setSubline]=useState('');
  const [layout,setLayout]=useState(0);
  const [concepts,setConcepts]=useState([]);
  const [mode,setMode]=useState(null);
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);
  const [downloading,setDownloading]=useState(false);
  const [error,setError]=useState('');
  const [builtFor,setBuiltFor]=useState('');
  const canvasRef=useRef(null);
  const subjectImage=useLocalImage(subjectFile);
  const logoImage=useLocalImage(logoFile);

  useEffect(()=>{setChannelName(data?.channel?.title||'');},[data?.channel?.id]);
  useEffect(()=>{
    if(!canvasRef.current)return;
    renderThumbnail(canvasRef.current,{kind,style,layout,topic,headline,subline,channel:channelName,subjectImage,logoImage});
  },[kind,style,layout,topic,headline,subline,channelName,subjectImage,logoImage]);

  function chooseConcept(index, array=concepts) {
    const option=array[index];
    if(!option)return;
    setLayout(index);setHeadline(option.headline);setSubline(option.subline||'');
  }
  async function generate(e) {
    e.preventDefault();
    if(busy)return;
    if(topic.trim().length<3){setError('Enter a topic with at least 3 characters.');return;}
    setBusy(true);setError('');
    try {
      const res=await fetch('/api/thumbnail',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({
          kind,style,topic,description,channelName,
          sampleTitles:(data?.videos||[]).slice(0,5).map(v=>v.title)
        })
      });
      if(!res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Thumbnail API has not been deployed. Deploy the latest GitHub code.');
      }
      const payload=await res.json();
      if(!res.ok)throw new Error(payload.error||'Thumbnail ideas could not be generated.');
      if(!Array.isArray(payload.concepts)||payload.concepts.length!==3) {
        throw new Error('Thumbnail service returned incomplete concepts.');
      }
      setConcepts(payload.concepts);setMode(payload.mode);setNote(payload.note||'');
      setBuiltFor(topic.trim());chooseConcept(0,payload.concepts);
    } catch(e){setError(e.message||'Could not create your concepts.');}
    finally{setBusy(false);}
  }
  async function download() {
    const canvas=canvasRef.current;
    if(!canvas)return;
    setError('');setDownloading(true);
    try {
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not create PNG.')),'image/png'));
      const link=document.createElement('a');
      const url=URL.createObjectURL(blob);
      const slug=(topic||'channelscope').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'thumbnail';
      link.href=url;
      link.download=slug+'-'+kind+'-'+(layout+1)+'.png';
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(e){setError('Download failed: '+e.message);}
    finally{setDownloading(false);}
  }
  const currentSize=thumbnailDimensions(kind);
  return <>
    <div className="page-heading thumb-page-heading">
      <div className="eyebrow">DESIGN STUDIO ✦ THUMBNAIL INTELLIGENCE</div>
      <h1>Create thumbnails that stand out<span className="accent">.</span></h1>
      <p>Build three custom thumbnail concepts using free layouts and optional AI copy. Edit the text, add your own images and export full-resolution PNGs.</p>
    </div>
    <section className="thumb-intro">
      <div className="thumb-intro-badge"><WandSparkles size={27}/></div>
      <div><strong>Make your next upload look unmistakable.</strong><span>Video · Live stream · Shorts artwork</span></div>
      <span className="thumb-free"><Check size={14}/> Free PNG export</span>
    </section>

    <div className="thumb-editor-grid">
      <section className="thumb-form-panel">
        <form onSubmit={generate}>
          <div className="thumb-form-header"><Layers3 size={18}/><h2>Build your thumbnail</h2></div>
          <label className="thumb-label">Content type</label>
          <div className="thumb-format-grid">
            {formats.map(option=><button key={option.key} className={'thumb-format'+(kind===option.key?' active':'')} type="button" onClick={()=>setKind(option.key)}>
              <option.icon size={19}/><strong>{option.name}</strong><small>{option.detail}</small>
            </button>)}
          </div>
          <label className="thumb-label" htmlFor="thumb-topic">Video topic / title</label>
          <input id="thumb-topic" className="thumb-input" required minLength={3} maxLength={130} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Cricket 26 — the final over challenge"/>
          <label className="thumb-label" htmlFor="thumb-description">What's the video about? <span>Optional</span></label>
          <textarea id="thumb-description" className="thumb-textarea" value={description} maxLength={280} rows={3} onChange={e=>setDescription(e.target.value)} placeholder="Add details to help AI suggest better hooks…"/>
          <label className="thumb-label" htmlFor="thumb-style">Visual style</label>
          <div className="thumb-select-wrap"><Palette size={16}/><select id="thumb-style" value={style} onChange={e=>setStyle(e.target.value)}>
            {Object.entries(THUMBNAIL_STYLES).map(([key,meta])=><option key={key} value={key}>{meta.label}</option>)}
          </select></div>
          <label className="thumb-label" htmlFor="thumb-channel">Channel name / footer</label>
          <input id="thumb-channel" className="thumb-input" value={channelName} maxLength={40} onChange={e=>setChannelName(e.target.value)} placeholder="Your channel"/>
          <div className="thumb-upload-grid">
            <div className="thumb-upload-field">
              <label htmlFor="thumb-subject"><Upload size={16}/> Background / face / gameplay</label>
              <input id="thumb-subject" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>handleImageFile(e,setSubjectFile,setError)}/>
              {subjectFile && <div className="thumb-filename">{subjectFile.name}<button type="button" onClick={()=>setSubjectFile(null)} aria-label="Remove background image"><Trash2 size={14}/></button></div>}
            </div>
            <div className="thumb-upload-field">
              <label htmlFor="thumb-logo"><ImageIcon size={16}/> Channel logo</label>
              <input id="thumb-logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>handleImageFile(e,setLogoFile,setError)}/>
              {logoFile && <div className="thumb-filename">{logoFile.name}<button type="button" onClick={()=>setLogoFile(null)} aria-label="Remove logo"><Trash2 size={14}/></button></div>}
            </div>
          </div>
          <p className="thumb-hint"><Info size={13}/> Images stay in your browser, not on an AI server. PNG/JPEG/WebP, max 8 MB each.</p>
          <button className="primary-btn thumb-generate" type="submit" disabled={busy}>
            {busy?<RefreshCw size={16} className="spin"/>:<Sparkles size={16}/>}
            {busy?'Generating concepts…':concepts.length?'Regenerate three ideas':'Generate three concepts'}
          </button>
        </form>
      </section>
      <section className="thumb-preview-panel">
        <div className="thumb-preview-head">
          <div><small>LIVE PREVIEW</small><h2>Your thumbnail</h2></div>
          <span className="thumb-resolution">{currentSize.width} × {currentSize.height} PNG</span>
        </div>
        <div className={'thumb-stage '+(kind==='short'?'thumb-vertical':'thumb-wide')}>
          <canvas ref={canvasRef} role="img" aria-label={'Thumbnail preview for '+(topic||'your next upload')}/>
        </div>
        {kind==='short' && <p className="thumb-platform-tip"><Info size={15}/> Shorts export is a vertical artwork/poster. YouTube may limit custom thumbnail uploads for Shorts; you can still use this artwork in editing or promotion.</p>}
        <div className="thumb-copy-editor">
          <div className="thumb-copy-heading"><h3>Fine-tune your text</h3><span>Instant preview</span></div>
          <label htmlFor="thumb-headline">Headline</label>
          <input id="thumb-headline" className="thumb-input" maxLength={120} value={headline} placeholder="Edit large thumbnail text…" onChange={e=>setHeadline(e.target.value)}/>
          <label htmlFor="thumb-subline">Supporting line</label>
          <input id="thumb-subline" className="thumb-input" maxLength={70} value={subline} placeholder="Optional short hook" onChange={e=>setSubline(e.target.value)}/>
          <p className="thumb-hint">Text edits and visual styles update the preview without another AI request.</p>
        </div>
        <button className="primary-btn thumb-download" type="button" disabled={downloading} onClick={download}>
          {downloading?<RefreshCw size={17} className="spin"/>:<Download size={17}/>}
          {downloading?'Preparing PNG…':'Download full-resolution PNG'}
        </button>
      </section>
    </div>
    {error && <p className="error thumb-error" role="alert"><AlertCircle size={17}/>{error}</p>}
    <section className="thumb-concept-section">
      <div className="thumb-section-head"><div><span>CHOOSE YOUR ANGLE</span><h2>Three creative directions</h2></div>
        {mode&&<span className={'thumb-mode '+(mode==='ai'?'thumb-ai-mode':'')}>{mode==='ai'?'AI-GENERATED COPY':'FREE GUIDED CONCEPTS'}</span>}</div>
      {builtFor && <p className="thumb-brief">Ideas generated for: <strong>{builtFor}</strong></p>}
      <div className="thumb-concepts">{layouts.map((option,i)=>{
        const concept=concepts[i];
        return <button key={option.name} className={'thumb-concept '+(layout===i?'active':'')} onClick={()=>concept?chooseConcept(i):setLayout(i)} type="button">
          <div className={'thumb-mini-art thumb-mini-'+i}><span>{i===0?'A':i===1?'B':'C'}</span></div>
          <strong>{option.name}</strong><small>{option.description}</small>
          {concept ? <><h3>{concept.headline}</h3><p>{concept.why}</p></> : <p>Generate ideas or select this template to preview its layout.</p>}
          <span className="thumb-concept-select">{layout===i?'Selected':'Choose layout'}</span>
        </button>;
      })}</div>
      {note&&<p className="thumb-note"><Info size={16}/>{note}</p>}
    </section>
  </>;
}
