import React,{useEffect,useRef,useState} from 'react';
import {Sparkles,Image as ImageIcon,Download,KeyRound,LockKeyhole,Info,RefreshCw,Upload,Trash2,CheckCircle2,AlertCircle,Layers3} from 'lucide-react';
import {THUMBNAIL_STYLES,thumbnailDimensions} from './thumbnailRenderer';
import {paintGeneratedThumbnail} from './aiImageCanvas';
import './ai-thumbnail.css';

const variants=[
  {id:'hero',name:'Hero shot',detail:'Big subject + clear headline space'},
  {id:'action',name:'Dynamic action',detail:'Movement, impact and atmosphere'},
  {id:'cinematic',name:'Cinematic scene',detail:'Movie-poster composition'}
];
const formats=[{id:'video',label:'Video (16:9)'},{id:'live',label:'Live stream (16:9)'},{id:'short',label:'Short (9:16)'}];
const limit=4*1024*1024;
const slug=str=>(str||'ai-thumbnail').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,38)||'ai-thumbnail';
export default function AIThumbnailGenerator({data}){
  const [kind,setKind]=useState('video');
  const [topic,setTopic]=useState('');
  const [description,setDescription]=useState('');
  const [style,setStyle]=useState('gaming');
  const [direction,setDirection]=useState('hero');
  const [headline,setHeadline]=useState('');
  const [subline,setSubline]=useState('');
  const [overlay,setOverlay]=useState(true);
  const [reference,setReference]=useState(null);
  const [accessCode,setAccessCode]=useState('');
  const [images,setImages]=useState([]);
  const [selected,setSelected]=useState(0);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [downloadBusy,setDownloadBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const canvasRef=useRef(null);
  const chosen=images[selected];

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!chosen||!canvas)return;
    let active=true;
    setReady(false);
    const image=new Image();
    image.onload=()=>{
      if(active){paintGeneratedThumbnail(canvas,image,{kind:chosen.kind,headline,subline,showText:overlay});setReady(true);}
    };
    image.onerror=()=>{if(active)setError('Artwork could not be loaded into the preview.');};
    image.src=chosen.src;
    return()=>{active=false;};
  },[images,selected,headline,subline,overlay]);

  function selectKind(next){
    if(next===kind)return;
    setKind(next);setImages([]);setSelected(0);setReady(false);
  }
  function acceptReference(event){
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>limit||file.size===0){
      setError('Use a PNG, JPEG or WebP reference image smaller than 4 MB.');return;
    }
    setReference(file);setError('');
  }
  async function generate(e){
    e.preventDefault();
    if(loading)return;
    if(topic.trim().length<3){setError('Add a video title first.');return;}
    if(accessCode.trim().length<12){setError('Enter your private generation access code (minimum 12 characters).');return;}
    setLoading(true);setError('');
    const params=new FormData();
    params.set('kind',kind);params.set('style',style);params.set('direction',direction);
    params.set('topic',topic.trim());params.set('description',description.trim());
    if(reference)params.set('reference',reference,reference.name);
    try{
      const res=await fetch('/api/thumbnail-image',{
        method:'POST',headers:{'x-thumbnail-access-code':accessCode},
        body:params
      });
      if(!res.headers.get('content-type')?.includes('application/json'))throw new Error('Image generator API is not deployed yet.');
      const body=await res.json();
      if(!res.ok)throw new Error(body.error||'The image service could not generate artwork.');
      if(typeof body.image!=='string'||!body.image)throw new Error('The image service returned no artwork.');
      // Preserve up to 3 actively requested images. No bulk/automatic API calls.
      const src='data:image/webp;base64,'+body.image;
      const prior=images.slice(-2);
      const next=[...prior,{src,kind,title:topic.trim(),direction}];
      setImages(next);setSelected(next.length-1);
      setHeadline(topic.trim().slice(0,60));setSubline(kind==='live'?'JOIN THE STREAM':'');
      setReady(false);
    }catch(e){setError(e.message||'Could not generate artwork.');}
    finally{setLoading(false);}
  }
  async function download(){
    if(!canvasRef.current||!chosen||!ready)return;
    setDownloadBusy(true);setError('');
    try{
      const blob=await new Promise((resolve,reject)=>canvasRef.current.toBlob(value=>value?resolve(value):reject(new Error('Export failed')),'image/png'));
      const link=document.createElement('a');
      const url=URL.createObjectURL(blob);
      link.href=url;link.download=slug(chosen.title)+'-'+chosen.kind+'-ai.png';
      document.body.appendChild(link);link.click();link.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),2000);
    }catch(e){setError(e.message);}finally{setDownloadBusy(false);}
  }
  const dims=thumbnailDimensions(chosen?.kind||kind);
  return <div className="ai-thumb">
    <div className="ai-thumb-notice"><LockKeyhole size={18}/><div><strong>Real AI artwork · Pay per generated image</strong>
      <p>Powered by OpenAI GPT Image 2.5 Flare. This is not included with ChatGPT Plus or the free ChannelScope builder. One image per click; use your own private access code.</p></div></div>
    <div className="ai-thumb-grid">
      <section className="ai-thumb-card">
        <div className="ai-thumb-heading"><Layers3 size={20}/><h2>Describe your thumbnail</h2></div>
        <form onSubmit={generate}>
          <label htmlFor="ai-kind">Content type</label>
          <div className="ai-thumb-kinds">{formats.map(o=><button key={o.id} type="button" className={kind===o.id?'chosen':''} onClick={()=>selectKind(o.id)}>{o.label}</button>)}</div>
          <label htmlFor="ai-topic">Video title / topic</label>
          <input id="ai-topic" required minLength={3} maxLength={140} placeholder="Call of Duty: Paris mission — Part 2" value={topic} onChange={e=>setTopic(e.target.value)}/>
          <label htmlFor="ai-description">Describe the scene</label>
          <textarea id="ai-description" maxLength={500} rows={5} value={description} onChange={e=>setDescription(e.target.value)}
            placeholder="A dramatic futuristic Paris combat mission at night, helicopters overhead, rain and neon reflections, intense action…"/>
          <label htmlFor="ai-style">Art direction</label>
          <select id="ai-style" value={style} onChange={e=>setStyle(e.target.value)}>
            {Object.entries(THUMBNAIL_STYLES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <label>Composition</label>
          <div className="ai-thumb-variants">{variants.map(v=><button type="button" key={v.id} className={direction===v.id?'chosen':''} onClick={()=>setDirection(v.id)}>
            <strong>{v.name}</strong><small>{v.detail}</small>
          </button>)}</div>
          <div className="ai-ref-wrap">
            <label htmlFor="ai-reference"><Upload size={15}/> Optional photo / gameplay screenshot</label>
            <input id="ai-reference" type="file" accept="image/png,image/jpeg,image/webp" onChange={acceptReference}/>
            {reference&&<div className="ai-ref-file">{reference.name}<button aria-label="Remove reference image" type="button" onClick={()=>setReference(null)}><Trash2 size={14}/></button></div>}
            <small>A reference (max 4 MB) is sent to OpenAI only when you click Generate. Leave empty for prompt-only image creation.</small>
          </div>
          <label htmlFor="ai-code"><KeyRound size={15}/> Private generation access code</label>
          <input id="ai-code" type="password" autoComplete="off" minLength={12} placeholder="Code you saved in Cloudflare" value={accessCode} onChange={e=>setAccessCode(e.target.value)}/>
          <p className="ai-thumb-hint"><Info size={14}/> Each press may incur an API charge. No automatic retries or batch requests. Use the free Builder tab when you want zero-cost exports.</p>
          <button className="primary-btn ai-thumb-generate" type="submit" disabled={loading}>
            {loading?<RefreshCw size={18} className="spin"/>:<Sparkles size={18}/>}
            {loading?'Generating image (may take up to 2 minutes)…':'Generate one AI thumbnail'}
          </button>
        </form>
      </section>
      <section className="ai-thumb-card ai-thumb-output">
        <div className="ai-thumb-headrow"><div><small>GENERATED ARTWORK</small><h2>Live preview & PNG export</h2></div>
          <span>{dims.width} × {dims.height}</span></div>
        {!chosen?<div className="ai-thumb-empty"><ImageIcon size={44}/><h3>Your custom artwork will appear here</h3>
          <p>Enter a title and description, choose a scene, then generate an AI image.</p></div>:
          <>
            <div className={'ai-thumb-stage '+(chosen.kind==='short'?'vertical':'wide')}><canvas ref={canvasRef} role="img" aria-label="Generated thumbnail preview"/></div>
            <p className="ai-thumb-caption"><CheckCircle2 size={15}/> Artwork created by {chosen.direction} composition. Text stays editable even after generation.</p>
            <div className="ai-thumb-controls">
              <label htmlFor="ai-headline">Large headline</label>
              <input id="ai-headline" maxLength={60} value={headline} onChange={e=>setHeadline(e.target.value)}/>
              <label htmlFor="ai-subline">Supporting line</label>
              <input id="ai-subline" maxLength={60} value={subline} onChange={e=>setSubline(e.target.value)}/>
              <label className="ai-thumb-check"><input type="checkbox" checked={overlay} onChange={e=>setOverlay(e.target.checked)}/> Show text overlay (turn off for original artwork)</label>
            </div>
            <button type="button" onClick={download} className="primary-btn ai-thumb-download" disabled={downloadBusy||!ready}>
              <Download size={16}/>{downloadBusy?'Preparing file…':'Download PNG'}
            </button>
          </>}
        {chosen?.kind==='short'&&<p className="ai-thumb-hint"><Info size={14}/> Shorts export is vertical artwork; custom Shorts cover upload may be restricted by YouTube.</p>}
        {images.length>1&&<div className="ai-thumb-history"><h3>Your generated variations</h3><div>{images.map((image,i)=><button key={i} type="button" className={i===selected?'active':''} onClick={()=>{setSelected(i);setReady(false);}}><img src={image.src} alt={'Variation '+(i+1)}/><span>Option {i+1}</span></button>)}</div></div>}
      </section>
    </div>
    {error&&<div className="error ai-thumb-error" role="alert"><AlertCircle size={18}/>{error}</div>}
  </div>;
}
