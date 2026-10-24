import React,{useEffect,useRef,useState} from 'react';
import {UploadCloud,Film,Sparkles,Instagram,Youtube,Copy,Check,Info,AlertCircle,RefreshCw,X,Eye,Clapperboard} from 'lucide-react';
import {captureVideoFrames,formatVideoDuration,videoOrientation} from './video-frame-utils.js';
import './video-upload-studio.css';

const MAX_VIDEO_BYTES=300*1024*1024;
const tones=[['friendly','Friendly & natural'],['energetic','Bold & energetic'],['cinematic','Cinematic'],['minimal','Simple & clean']];
function CopyButton({value,label}){
 const [copied,setCopied]=useState(false);
 async function copy(){
   try{await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),2000);}
   catch{window.prompt('Copy this text:',value);}
 }
 return <button type="button" className="vus-copy" onClick={copy}>{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':label||'Copy'}</button>;
}
function TextOptions({items,kind}){
 return <div className="vus-options">{items.map((item,i)=><div key={kind+i} className="vus-option">
   <span className="vus-option-number">{String(i+1).padStart(2,'0')}</span><span>{item}</span>
   <CopyButton value={item}/>
 </div>)}</div>;
}
function Tips({items}){return <ul className="vus-tips">{items.map((item,i)=><li key={i}>{item}</li>)}</ul>;}
function PlatformResult({data,type}){
 const instagram=type==='instagram';
 const Icon=instagram?Instagram:Youtube;
 const all=instagram?[
   data.captions[0],data.hashtags.join(' '),'','Opening hook: '+data.hook
 ]:[data.titles[0],'',data.description,'',data.hashtags.join(' '),'','Opening hook: '+data.hooks[0]];
 return <article className={'vus-result '+(instagram?'vus-instagram':'vus-youtube')}>
   <div className="vus-result-header"><div><Icon size={21}/><h2>{instagram?'Instagram Reel':'YouTube Short'}</h2></div><CopyButton value={all.join('\n')} label="Copy full pack"/></div>
   <div className="vus-result-block">
     <h3>{instagram?'Caption options':'Title options'}</h3>
     <TextOptions kind={type+'-copy'} items={instagram?data.captions:data.titles}/>
   </div>
   {!instagram&&<div className="vus-result-block"><div className="vus-row-label"><h3>Copy-ready description</h3><CopyButton value={data.description}/></div><p className="vus-body-copy">{data.description}</p></div>}
   <div className="vus-result-block"><div className="vus-row-label"><h3>Suggested hashtags</h3><CopyButton value={data.hashtags.join(' ')} label="Copy tags"/></div>
     <div className="vus-tags">{data.hashtags.map(tag=><span key={tag}>{tag}</span>)}</div>
   </div>
   <div className="vus-result-block">
     <h3>{instagram?'Opening hook':'Opening hook options'}</h3>
     {instagram?<div className="vus-hook"><span>{data.hook}</span><CopyButton value={data.hook}/></div>:<TextOptions kind="hook" items={data.hooks}/>}
   </div>
   <div className="vus-result-block vus-last"><h3>Editing tips</h3><Tips items={data.editingTips}/></div>
 </article>;
}
export default function VideoUploadStudio(){
 const inputRef=useRef(null),fileUrlRef=useRef('');
 const [file,setFile]=useState(null),[url,setUrl]=useState(''),[title,setTitle]=useState(''),[description,setDescription]=useState('');
 const [tone,setTone]=useState('friendly'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [sample,setSample]=useState(null),[report,setReport]=useState(null),[drag,setDrag]=useState(false);
 useEffect(()=>()=>{if(fileUrlRef.current)URL.revokeObjectURL(fileUrlRef.current);},[]);
 function setVideo(next){
   if(!next)return;
   if(!next.type.startsWith('video/')&&!/\.(mp4|mov|webm|m4v|ogg)$/i.test(next.name)){setError('Please select a video file (MP4, WebM, or a browser-supported video).');return;}
   if(next.size>MAX_VIDEO_BYTES){setError('Please choose a video smaller than 300 MB. The original stays on your device.');return;}
   if(next.size===0){setError('The selected video file is empty.');return;}
   if(fileUrlRef.current)URL.revokeObjectURL(fileUrlRef.current);
   const nextUrl=URL.createObjectURL(next);fileUrlRef.current=nextUrl;
   setFile(next);setUrl(nextUrl);setTitle(next.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').slice(0,120));
   setDescription('');setSample(null);setReport(null);setError('');
 }
 function clearVideo(){
   if(fileUrlRef.current)URL.revokeObjectURL(fileUrlRef.current);
   fileUrlRef.current='';if(inputRef.current)inputRef.current.value='';
   setUrl('');setFile(null);setSample(null);setReport(null);setError('');
 }
 async function analyze(){
   if(!file||busy)return;
   setBusy(true);setError('');setReport(null);
   try{
     // Every invocation samples the local video before sending only its stills.
     const frames=await captureVideoFrames(url);
     setSample(frames);
     const response=await fetch('/api/video-upload-studio',{
       method:'POST',headers:{'content-type':'application/json'},
       body:JSON.stringify({frames:frames.frames,width:frames.width,height:frames.height,duration:frames.duration,title,description,tone})
     });
     if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Video Studio API is not deployed yet.');
     const answer=await response.json();
     if(!response.ok)throw Error(answer.error||'Could not analyze this video.');
     if(!answer.instagram?.captions?.length||!answer.youtube?.titles?.length)throw Error('The generated suggestions were incomplete.');
     setReport(answer);
   }catch(e){
     setError(e?.message||'Could not read the video. Try MP4 (H.264) or WebM. You can also describe the clip in Social Publishing.');
   }finally{setBusy(false);}
 }
 function onDrop(e){e.preventDefault();setDrag(false);setVideo(e.dataTransfer?.files?.[0]);}
 return <div className="vus-page">
   <div className="page-heading"><div className="eyebrow">CREATOR TOOLS · VIDEO UPLOAD ✦</div>
     <h1>Your video. Two perspectives<span className="accent">.</span></h1>
     <p>Preview a clip, sample three visual moments, then create distinct drafts for Instagram Reels and YouTube Shorts.</p>
   </div>
   <div className="vus-banner"><div className="vus-banner-icon"><Clapperboard size={28}/></div>
     <div><small>UPLOAD & OPTIMIZE</small><h2>Make the most of a video you already have.</h2>
       <p>AI looks at a few still frames, not the audio or full sequence. You review everything before posting.</p></div>
     <span><Check size={15}/> Original stays local</span>
   </div>
   <div className="vus-layout">
     <section className="vus-editor">
       <h2><UploadCloud size={20}/> Choose your video</h2>
       <input ref={inputRef} type="file" accept="video/*,.mp4,.webm,.mov,.m4v" className="vus-hidden-input" onChange={e=>setVideo(e.target.files?.[0])}/>
       {!file?<div role="button" tabIndex={0} className={'vus-drop'+(drag?' dragging':'')}
         onClick={()=>inputRef.current?.click()} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inputRef.current?.click();}}}
         onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={onDrop}>
           <UploadCloud size={35}/><strong>Choose or drop a video</strong>
           <span>MP4, WebM or other browser-playable video · up to 300 MB</span>
           <small>No video file is uploaded to our server</small>
       </div>:<div className="vus-preview">
         <div className="vus-file-head"><Film size={17}/><span title={file.name}>{file.name}</span>
           <button type="button" onClick={clearVideo} aria-label="Remove video"><X size={17}/></button></div>
         <video src={url} controls playsInline preload="metadata" aria-label="Selected video preview"/>
         <p>{(file.size/1024/1024).toFixed(1)} MB · Stored locally until you close or change the file</p>
       </div>}
       {sample&&<div className="vus-samples"><div className="vus-samples-title"><Eye size={16}/> Three sampled frames
         <span>{formatVideoDuration(sample.duration)} · {videoOrientation(sample.width,sample.height)}</span></div>
         <div className="vus-frame-grid">{sample.frames.map((frame,i)=><img key={i} src={frame} alt={'Video sample '+(i+1)}/>)}</div>
       </div>}
       <label htmlFor="vus-title">Working title <span>Optional</span></label>
       <input id="vus-title" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Cricket 26 final over highlight"/>
       <label htmlFor="vus-description">What happens in the video? <span>Optional, recommended</span></label>
       <textarea id="vus-description" rows={4} maxLength={800} value={description} onChange={e=>setDescription(e.target.value)}
         placeholder="Explain what's happening, what game or place is featured, and anything the still frames might miss (like dialogue)."/>
       <label htmlFor="vus-tone">Writing style</label>
       <select id="vus-tone" value={tone} onChange={e=>setTone(e.target.value)}>
         {tones.map(([value,label])=><option key={value} value={value}>{label}</option>)}
       </select>
       <div className="vus-privacy"><Info size={18}/><span>Clicking <strong>Analyze my clip</strong> extracts three small JPEG frames on your device and sends them, your title, and optional description to the ChannelScope server and Groq for vision analysis. The original video and audio are never uploaded. Frames are not saved by ChannelScope. AI may be unavailable or rate-limited; the fallback uses only your text.</span></div>
       {error&&<p className="vus-error" role="alert"><AlertCircle size={17}/>{error}</p>}
       <button type="button" className="primary-btn vus-submit" disabled={busy||!file} onClick={analyze}>
         {busy?<RefreshCw size={17} className="spin"/>:<Sparkles size={17}/>}
         {busy?'Reading frames and preparing suggestions…':report?'Regenerate suggestions':'Analyze my clip'}
       </button>
     </section>
     <section className="vus-results" aria-live="polite">
       <div className="vus-results-heading"><div><small>YOUR CROSS-PLATFORM PACK</small><h2>Instagram + YouTube suggestions</h2></div>
         {report&&<span className={'vus-mode '+(report.mode==='ai'?'ai':'')}>{report.mode==='ai'?'AI FRAME ANALYSIS':'TEXT-ONLY FALLBACK'}</span>}
       </div>
       {!report?<div className="vus-empty"><div><Film size={32}/><Sparkles size={19}/></div>
           <h3>Your video suggestions start here</h3>
           <p>Choose a video and analyze it to get customized captions, Shorts titles, hashtags, hooks and editing ideas for both platforms.</p>
           <span><Check size={14}/> No social login <Check size={14}/> No auto-posting</span>
         </div>:<>
           <div className={'vus-observed '+(report.mode==='ai'?'analyzed':'fallback')}><Info size={19}/><div>
             <strong>{report.analyzedFrames?'What the sampled frames suggest':'About these suggestions'}</strong>
             <p>{report.observed}</p></div></div>
           <div className="vus-result-grid">
             <PlatformResult type="instagram" data={report.instagram}/>
             <PlatformResult type="youtube" data={report.youtube}/>
           </div>
           <p className="vus-footnote"><Info size={16}/>{report.note}</p>
         </>}
     </section>
   </div>
 </div>;
}
