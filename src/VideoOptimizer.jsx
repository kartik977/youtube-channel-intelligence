import React,{useState} from 'react';
import {Sparkles, Copy, Check, Hash, Lightbulb, FileText, Clapperboard, Radio, Video, AlertCircle, Info, RefreshCw, ListChecks, PenTool, Link2, ExternalLink} from 'lucide-react';
import './video-optimizer.css';

const formats=[
  {key:'video',name:'Video',icon:Video},
  {key:'short',name:'Short',icon:Clapperboard},
  {key:'live',name:'Live stream',icon:Radio}
];
const tones=[
  {value:'clear',label:'Clear and helpful'},
  {value:'energetic',label:'Energetic'},
  {value:'educational',label:'Educational'},
  {value:'cinematic',label:'Cinematic'}
];
const copyText=(value)=>navigator.clipboard.writeText(value);
const seemsLink=value=>/^(?:https?:\/\/|(?:www\.|m\.|music\.)?youtube\.com\/|(?:www\.)?youtu\.be\/)/i.test(value.trim());
const descriptionLacksDetails=value=>value.replace(/https?:\/\/\S+/gi,' ').replace(/#[\p{L}\p{N}_]+/gu,' ').trim().split(/\s+/).filter(w=>w.length>1).length<4;
async function findVideo(url){
  const res=await fetch('/api/video?input='+encodeURIComponent(url.trim()));
  if(!res.headers.get('content-type')?.includes('application/json'))throw new Error('YouTube video lookup is not deployed yet.');
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||'Could not load this YouTube video.');
  if(!data.id||!data.title)throw new Error('Video metadata was incomplete. Try a public link.');
  return data;
}
function CopyButton({content,label='Copy',onError}) {
  const [copied,setCopied]=useState(false);
  async function copy() {
    try{
      await copyText(content);
      setCopied(true);
    }catch {onError('Clipboard permission denied. Try again in a secure browser window.');}
  }
  return <button className="vo-copy" type="button" onClick={copy}>
    {copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copied':label}
  </button>;
}
export default function VideoOptimizer({data,initialTopic=''}) {
  const [kind,setKind]=useState('video');
  const [topic,setTopic]=useState(initialTopic);
  const [description,setDescription]=useState('');
  const [audience,setAudience]=useState('');
  const [tone,setTone]=useState('clear');
  const [videoUrl,setVideoUrl]=useState('');
  const [loadedVideo,setLoadedVideo]=useState(null);
  const [loadedLink,setLoadedLink]=useState('');
  const [fetching,setFetching]=useState(false);
  const [report,setReport]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [generatedFor,setGeneratedFor]=useState('');
  const recent=(data?.videos||[]).slice(0,10);
  function applyVideo(metadata,originalLink) {
    setTopic(metadata.title);
    setDescription(metadata.description||'');
    setKind(metadata.kind);
    setLoadedVideo(metadata);
    setLoadedLink(originalLink.trim());
    setVideoUrl(originalLink.trim());
    setReport(null);
  }
  async function loadLink() {
    if(fetching||busy)return;
    setError('');setFetching(true);
    try {
      const link=videoUrl.trim()|| (seemsLink(topic)?topic.trim():'');
      if(!link)throw new Error('Paste a public YouTube video, Shorts, or livestream link first.');
      const metadata=await findVideo(link);
      applyVideo(metadata,link);
    }catch(e){setError(e.message||'Could not load video.');}
    finally{setFetching(false);}
  }
  async function optimize(e) {
    e.preventDefault();
    if(busy||fetching)return;
    setError('');setBusy(true);
    try {
      let effectiveTopic=topic.trim(),effectiveDescription=description.trim(),effectiveKind=kind;
      let videoContext=loadedVideo;
      const linkInTopic=seemsLink(effectiveTopic);
      const requestedUrl=linkInTopic?effectiveTopic:videoUrl.trim();
      // A YouTube URL in the topic field must never be passed as a raw title.
      if(requestedUrl&&(linkInTopic||requestedUrl!==loadedLink)){
        const metadata=await findVideo(requestedUrl);
        videoContext=metadata;effectiveTopic=metadata.title;
        effectiveDescription=metadata.description||'';
        effectiveKind=metadata.kind;
        applyVideo(metadata,requestedUrl);
      }
      if(!effectiveTopic||seemsLink(effectiveTopic))throw new Error('Enter a topic or load a public YouTube video link.');
      const response=await fetch('/api/video-optimizer',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({
          topic:effectiveTopic,description:effectiveDescription,kind:effectiveKind,tone,audience:audience.trim(),
          channelName:videoContext?.channelTitle||(data?.source==='youtube'?data?.channel?.title:'')||'',
          sourceVideo:videoContext?{id:videoContext.id,channelTitle:videoContext.channelTitle,liveStatus:videoContext.liveStatus}:null,
          recentTitles:recent.slice(0,5).map(v=>v.title)
        })
      });
      if(!response.headers.get('content-type')?.includes('application/json')){
        throw new Error('Video Optimizer API has not been deployed to Cloudflare yet.');
      }
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not prepare this publishing pack.');
      if(!Array.isArray(body.hashtags)||!Array.isArray(body.titleOptions))throw new Error('Incomplete publishing pack received.');
      setReport(body);setGeneratedFor(effectiveTopic);
    }catch(e){setError(e.message||'Something went wrong.');}
    finally{setBusy(false);}
  }
  const mainTags=(report?.hashtags||[]).filter(x=>x.category==='primary');
  const optionalTags=(report?.hashtags||[]).filter(x=>x.category==='alternative');
  const primaryText=mainTags.map(x=>x.tag).join(' ');
  const allText=(report?.hashtags||[]).map(x=>x.tag).join(' ');
  const publishDescription=report?report.description+'\n\n'+primaryText:'';
  const publishPack=report?[
    'ChannelScope — '+generatedFor,
    '',
    'TITLE OPTIONS',...report.titleOptions.map((t,i)=>(i+1)+'. '+t),
    '',
    'DESCRIPTION',report.description,
    '',
    'RECOMMENDED HASHTAGS',primaryText,
    '',
    'ALTERNATIVE HASHTAGS',optionalTags.map(x=>x.tag).join(' '),
    '',
    'OPENING HOOKS',...report.hooks.map((hook,i)=>(i+1)+'. '+hook),
    '',report.note
  ].join('\n'):'';
  return <>
    <div className="page-heading vo-heading">
      <div className="eyebrow">VIDEO DISCOVERY & PUBLISHING STUDIO ✦</div>
      <h1>Give your next video a stronger start<span className="accent">.</span></h1>
      <p>Create clear titles, descriptions, opening hooks and topic-specific hashtags for YouTube videos, Shorts and livestreams.</p>
    </div>
    <section className="vo-intro">
      <div className="vo-intro-icon"><Hash size={25}/></div>
      <div>
        <strong>Hashtags that fit your content</strong>
        <p>Three recommended tags + two alternatives, each with a relevance explanation. No invented search volumes or guaranteed views.</p>
      </div>
      <span><Check size={14}/> Free to try</span>
    </section>
    <div className="vo-grid">
      <section className="vo-form-panel">
        <h2><PenTool size={20}/> Your video brief</h2>
        <form onSubmit={optimize}>
          <div className="vo-link-section">
            <label htmlFor="vo-url"><Link2 size={16}/> Analyze an existing YouTube upload</label>
            <p>Paste a watch, Shorts, livestream or youtu.be link. We'll retrieve its public title and description first.</p>
            <div className="vo-link-row">
              <input id="vo-url" type="text" inputMode="url" maxLength={600} value={videoUrl} disabled={busy||fetching}
                onChange={e=>{setVideoUrl(e.target.value);setLoadedVideo(null);setLoadedLink('');setReport(null);}}
                placeholder="https://www.youtube.com/live/..." />
              <button type="button" onClick={loadLink} disabled={busy||fetching} className="vo-load-btn">
                {fetching?<RefreshCw size={15} className="spin"/>:<Link2 size={15}/>}
                {fetching?'Loading…':'Load video'}
              </button>
            </div>
            {loadedVideo && loadedLink===videoUrl.trim() && <div className="vo-loaded-video">
              <img src={loadedVideo.thumbnail} alt="" loading="lazy"/>
              <div><strong>{loadedVideo.title}</strong>
                <span>{loadedVideo.channelTitle||'YouTube channel'} · {loadedVideo.kind==='live'?'Livestream':loadedVideo.kind==='short'?'Shorts link':'Video'}{loadedVideo.liveStatus==='live'?' · LIVE':loadedVideo.liveStatus==='upcoming'?' · UPCOMING':''}</span>
                <small>{loadedVideo.descriptionTruncated?'Long description shortened for editing. ':''}{loadedVideo.note}</small>
              </div>
              <a href={loadedVideo.url} target="_blank" rel="noopener noreferrer" aria-label="Open original video"><ExternalLink size={16}/></a>
            </div>}
          </div>
          <p className="vo-or">OR CREATE A BRIEF FOR A FUTURE UPLOAD</p>
          <label>Publishing format</label>
          <div className="vo-kinds">
            {formats.map(f=><button type="button" key={f.key} className={kind===f.key?'selected':''} onClick={()=>setKind(f.key)}>
              <f.icon size={17}/>{f.name}
            </button>)}
          </div>
          <label htmlFor="vo-topic">Video title or topic <span>Required</span></label>
          <input id="vo-topic" required={!videoUrl.trim()} minLength={3} maxLength={600} value={topic} onChange={e=>setTopic(e.target.value)}
            placeholder="e.g. Cricket 26 last over comeback on PS5 (or paste a YouTube link)"/>
          <p className="vo-topic-tip">You can also paste a YouTube URL here and select Optimize; we will load the video automatically.</p>
          {recent.length>0&&<div className="vo-recents">
            <label htmlFor="vo-recent">Or start from an existing upload</label>
            <select id="vo-recent" defaultValue="" onChange={e=>{
              const row=recent.find(v=>v.id===e.target.value);
              if(row){setTopic(row.title);setDescription((row.description||'').slice(0,650));setVideoUrl('');setLoadedVideo(null);setLoadedLink('');setReport(null);}
            }}>
              <option value="">Choose a recent video (optional)</option>
              {recent.map(v=><option key={v.id} value={v.id}>{v.title}</option>)}
            </select>
          </div>}
          <label htmlFor="vo-description">Describe what actually happens in the video <span>Optional but helpful</span></label>
          <textarea id="vo-description" rows={5} maxLength={650} value={description} onChange={e=>setDescription(e.target.value)}
            placeholder="Describe the game, mission, highlight, result, audience benefit, or anything unique. Only describe things actually in your video."/>
          {loadedVideo&&descriptionLacksDetails(description)&&<p className="vo-sparse-warning" role="status"><Info size={15}/> This video's public description contains little beyond hashtags or links. Add a few verified details about what actually happens to get more specific AI recommendations. ChannelScope cannot watch the footage.</p>}
          <label htmlFor="vo-audience">Intended audience <span>Optional</span></label>
          <input id="vo-audience" maxLength={100} value={audience} onChange={e=>setAudience(e.target.value)}
            placeholder="e.g. casual PS5 players and cricket fans"/>
          <label htmlFor="vo-tone">Writing style</label>
          <select id="vo-tone" value={tone} onChange={e=>setTone(e.target.value)}>
            {tones.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <p className="vo-hint"><Info size={14}/> Using your current channel's public upload titles can help tailor the writing. No private YouTube Studio data is used.</p>
          <button className="primary-btn vo-generate" disabled={busy||fetching}>
            {busy?<RefreshCw size={16} className="spin"/>:<Sparkles size={16}/>}
            {busy?'Loading metadata and creating suggestions…':report?'Regenerate optimization':'Optimize my video'}
          </button>
        </form>
      </section>
      <section className="vo-result-panel">
        <div className="vo-results-head">
          <div><small>YOUR NEXT UPLOAD</small><h2>Publishing pack</h2></div>
          {report&&<span className={'vo-mode '+(report.mode==='ai'?'vo-ai':report.mode==='hybrid'?'vo-hybrid':'')}>{report.mode==='ai'?'AI-GENERATED':report.mode==='hybrid'?'AI + TEMPLATES':'FREE DRAFT MODE'}</span>}
        </div>
        {error&&<p className="error" role="alert"><AlertCircle size={17}/>{error}</p>}
        {!report&&!busy&&<div className="vo-empty">
          <Sparkles size={34}/>
          <h3>Your video optimization will appear here</h3>
          <p>Add a video topic to get titles, a description, hooks and relevant hashtags you can copy before uploading.</p>
          <div><span><Hash size={14}/> Topic-specific tags</span><span><FileText size={14}/> Copy-ready description</span></div>
        </div>}
        {busy&&<div className="vo-empty" role="status"><RefreshCw size={32} className="spin"/><h3>Preparing your publishing pack</h3><p>Reviewing your topic, matching keywords and drafting hashtags.</p></div>}
        {report&&<div className="vo-results" aria-live="polite">
          <p className="vo-generated-for">Prepared for <strong>{generatedFor}</strong></p>
          {loadedVideo&&<p className="vo-metadata-note"><Info size={15}/> Based on public title and description, not footage, captions, or private analytics. Review every suggestion before publishing.</p>}
          <section className="vo-output">
            <div className="vo-section-title"><h3><Clapperboard size={17}/> Three title options</h3></div>
            {report.titleOptions.map((title,i)=><div className="vo-title-choice" key={i}>
              <span>0{i+1}</span><p>{title}</p><CopyButton content={title} onError={setError}/>
            </div>)}
          </section>
          <section className="vo-output">
            <div className="vo-section-title"><h3><FileText size={17}/> Copy-ready video description</h3>
              <CopyButton content={report.description} onError={setError}/></div>
            <p className="vo-description">{report.description}</p>
          </section>
          <section className="vo-output vo-hashtag-section">
            <div className="vo-section-title"><h3><Hash size={18}/> Hashtags matched to your video</h3>
              <CopyButton content={primaryText} label="Copy top 3" onError={setError}/></div>
            <p className="vo-output-caption">Recommended first — pick tags that accurately describe the content.</p>
            <div className="vo-tag-grid">
              {mainTags.map((h,i)=><article className="vo-tag-card" key={h.tag}>
                <div><span className="vo-tag-number">0{i+1}</span><strong>{h.tag}</strong></div>
                <p>{h.reason}</p><CopyButton content={h.tag} onError={setError}/>
              </article>)}
            </div>
            {optionalTags.length>0&&<>
              <h4>Optional alternatives</h4>
              <div className="vo-alts">
                {optionalTags.map(h=><div key={h.tag} className="vo-alt">
                  <strong>{h.tag}</strong><p>{h.reason}</p><CopyButton content={h.tag} onError={setError}/>
                </div>)}
              </div>
            </>}
            <div className="vo-tag-actions">
              <CopyButton content={allText} label="Copy all suggested tags" onError={setError}/>
              <CopyButton content={publishDescription} label="Copy description + top 3" onError={setError}/>
            </div>
            <p className="vo-discovery-note"><Info size={16}/>{report.tip} Hashtag suggestions are not live trend rankings and cannot guarantee additional views.</p>
          </section>
          <section className="vo-output">
            <div className="vo-section-title"><h3><Lightbulb size={17}/> Two opening hooks</h3></div>
            {report.hooks.map((hook,i)=><div className="vo-hook" key={i}><span>{i+1}</span><p>{hook}</p><CopyButton content={hook} onError={setError}/></div>)}
          </section>
          <button className="primary-btn vo-copy-all" type="button" onClick={async()=>{try{await copyText(publishPack);}catch{setError('Clipboard permission denied.');}}}>
            <Copy size={17}/> Copy full publishing pack
          </button>
          <p className="vo-report-note"><Info size={16}/>{report.note}</p>
        </div>}
      </section>
    </div>
    <p className="vo-policy"><ListChecks size={17}/> Hashtags help viewers find related content; clear titles, honest descriptions and engaging videos matter more than adding dozens of hashtags. Use only relevant tags.</p>
  </>;
}
