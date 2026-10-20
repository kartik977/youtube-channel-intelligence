import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Youtube, LayoutDashboard, Film, GitCompareArrows, Sparkles, Search,
  Download, ExternalLink, Users, Eye, Video, CalendarDays, Info,
  RefreshCw, Menu, X, ArrowRight, BarChart3, TrendingUp,
  Activity, AlertCircle, Play, ArrowDownUp, Target, Instagram, Send, Layers3
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { demoData } from './demoData';
import Advisor from './Advisor';
import VideoOptimizer from './VideoOptimizer';
import OpportunityFinder from './OpportunityFinder';
import InstagramStudio from './InstagramStudio';
import SocialPublishing from './SocialPublishing';
import ContentCalendar from './ContentCalendar';
import {ideaToOptimizerDraft} from './calendar-optimizer.js';
import {workspaceConfig,getWorkspace,getWorkspaceForTab,defaultTabForWorkspace,tabsForWorkspace,hashForTab,tabFromHash} from './workspace-routing.js';
import './styles.css';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'videos', label: 'Video Library', icon: Film },
  { id: 'compare', label: 'Compare Channels', icon: GitCompareArrows },
  { id: 'insights', label: 'Creator Insights', icon: Sparkles },
  { id: 'advisor', label: 'AI Creator Advisor', icon: Sparkles },
  { id: 'optimizer', label: 'AI Video Optimizer', icon: BarChart3 },
  { id: 'opportunities', label: 'Content Opportunities', icon: Target },
  { id: 'instagram', label: 'Instagram Studio', icon: Instagram },
  { id: 'social', label: 'Social Publishing', icon: Send },
  { id: 'calendar', label: 'Content Calendar', icon: CalendarDays }
];
const workspaceIcons = {youtube:Youtube,instagram:Instagram,creator:Layers3};
const compact = n => n == null ? '—' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const number = n => n == null ? 'Not available' : Number(n).toLocaleString('en-US');
const day = value => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function average(nums) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null; }
function engagement(video) {
  return video.views > 0 && video.likes != null && video.comments != null
    ? 100 * (video.likes + video.comments) / video.views : null;
}
function analyze(data) {
  const videos = data.videos || [];
  const viewed = videos.filter(v => v.views != null);
  const counts = viewed.map(v => v.views).sort((a, b) => a - b);
  const median = counts.length ? (counts[Math.floor((counts.length-1)/2)] + counts[Math.floor(counts.length/2)]) / 2 : null;
  const interactions = videos.map(engagement).filter(v => v != null);
  const days = weekdays.map((label, i) => ({
    label, count: videos.filter(v => v.publishedAt && new Date(v.publishedAt).getUTCDay() === i).length
  }));
  const dates = videos.map(v => Date.parse(v.publishedAt)).filter(Number.isFinite).sort((a,b) => a-b);
  const weeks = dates.length > 1 ? Math.max((dates[dates.length-1] - dates[0])/604800000, 1) : null;
  return {
    viewed, median, average: average(counts), engagement: average(interactions),
    best: [...viewed].sort((a,b) => b.views-a.views)[0] || null,
    days, weekly: weeks == null ? null : (dates.length-1)/weeks,
    chart: [...viewed].slice(0, 12).reverse().map(v => ({
      label: new Date(v.publishedAt).toLocaleDateString('en-US', {month:'short',day:'numeric'}),
      views: v.views, title: v.title
    }))
  };
}
async function loadChannel(input) {
  const response = await fetch('/api/channel?input=' + encodeURIComponent(input));
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Live lookup requires Cloudflare Pages Functions. The demo works in Vite development mode.');
  }
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Could not load this channel.');
  return payload;
}
function saveCsv(data) {
  const columns = ['Title', 'Published', 'Views', 'Likes', 'Comments', 'Video URL'];
  const quote = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  const records = data.videos.map(v => [v.title, v.publishedAt, v.views, v.likes, v.comments, v.url].map(quote).join(','));
  const csv = [columns.join(','), ...records].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url; link.download = 'channelscope-videos.csv'; document.body.appendChild(link);
  link.click(); link.remove(); URL.revokeObjectURL(url);
}
function Thumb({ video }) {
  return <div className="thumb">
    {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy"/> : <Youtube size={28} aria-hidden="true"/>}
  </div>;
}
function Metric({ label, value, icon: Icon, note }) {
  return <div className="metric"><div className="metric-label">{label}<Icon size={18}/></div>
    <strong>{value}</strong><small>{note}</small></div>;
}
function SectionTitle({ eyebrow, title, right }) {
  return <div className="section-title"><div><small>{eyebrow}</small><h2>{title}</h2></div>{right}</div>;
}
function Empty({ title, description }) {
  return <div className="empty"><Search size={32}/><h3>{title}</h3><p>{description}</p></div>;
}
function Overview({ data, model, showVideos }) {
  const top = [...model.viewed].sort((a,b) => b.views-a.views).slice(0,3);
  return <>
    <div className="page-heading"><div className="eyebrow">WELCOME TO YOUR ANALYTICS STUDIO ✦</div>
      <h1>Know your channel<span className="accent">.</span><br/><span className="muted-title">Grow with clarity.</span></h1>
      <p>Explore public channel metrics and discover patterns in recent uploads.</p></div>
    <div className="channel-card">
      <div className="channel-picture">{data.channel.avatar ? <img src={data.channel.avatar} alt="Channel avatar"/> : <Youtube size={35}/>}</div>
      <div className="channel-info"><div className="channel-name"><h2>{data.channel.title}</h2><span className="pill">{data.source === 'demo' ? 'SAMPLE' : 'YOUTUBE DATA'}</span></div>
        <div className="handle">{data.channel.handle || data.channel.id}</div>
        <p>{data.channel.description || 'Public YouTube channel information.'}</p>
      </div>
      {data.channel.url && <a className="visit-link" href={data.channel.url} target="_blank" rel="noreferrer">Visit channel <ExternalLink size={14}/></a>}
    </div>
    <div className="stats">
      <Metric label="Subscribers" icon={Users} value={data.channel.subscribersHidden ? 'Hidden' : compact(data.channel.subscribers)} note="Current public count"/>
      <Metric label="Channel views" icon={Eye} value={compact(data.channel.views)} note="Lifetime channel total"/>
      <Metric label="Public videos" icon={Video} value={compact(data.channel.videoCount)} note="Channel-reported count"/>
      <Metric label="Avg. recent views" icon={Activity} value={compact(model.average)} note={'From ' + model.viewed.length + ' sampled videos'}/>
    </div>
    <div className="data-grid">
      <section className="panel chart-panel">
        <SectionTitle eyebrow="PERFORMANCE SNAPSHOT" title="Recent upload views" right={<span className="pill">LAST {model.chart.length} VIDEOS</span>}/>
        {model.chart.length ? <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={model.chart} margin={{top:10,right:8,left:-15,bottom:0}}>
              <CartesianGrid vertical={false} stroke="#303447" strokeDasharray="3 6"/>
              <XAxis dataKey="label" tick={{fill:'#838a9e',fontSize:10}} tickLine={false} axisLine={false}/>
              <YAxis tickFormatter={compact} tick={{fill:'#838a9e',fontSize:10}} tickLine={false} axisLine={false}/>
              <Tooltip content={({active,payload}) => active && payload && payload.length ?
                <div className="tooltip"><strong>{payload[0].payload.title}</strong><span>{number(payload[0].value)} views</span></div> : null}/>
              <Bar dataKey="views" fill="#fb5b77" radius={[6,6,0,0]} maxBarSize={40}/>
            </BarChart>
          </ResponsiveContainer>
        </div> : <Empty title="No recent video data" description="This channel has no accessible public video statistics."/>}
        <p className="caption"><Info size={14}/> Bars represent current view totals per upload, not historical growth.</p>
      </section>
      <section className="panel">
        <SectionTitle eyebrow="POSTING HABITS" title="Upload weekdays" right={<CalendarDays size={19}/>}/>
        <p className="panel-subtitle">Distribution of the most recent {data.videos.length} accessible uploads.</p>
        <div className="weekdays">{model.days.map(d => <div className="weekday" key={d.label}>
          <div className="weekday-track"><div className="weekday-bar" style={{height:(d.count/Math.max(1,...model.days.map(x=>x.count))*100)+'%'}}>{d.count || ''}</div></div>
          <span>{d.label}</span></div>)}</div>
        <div className="activity-foot"><span>Observed upload frequency</span><strong>{model.weekly == null ? '—' : model.weekly.toFixed(1) + ' / week'}</strong></div>
      </section>
    </div>
    <section className="top-section"><SectionTitle eyebrow="WHAT'S GETTING ATTENTION" title="Top videos in this recent sample"
      right={<button className="text-btn" onClick={showVideos}>View all <ArrowRight size={15}/></button>}/>
      {top.length ? <div className="top-grid">{top.map((v,i)=><article className="video-tile" key={v.id}>
        <div className="video-image"><Thumb video={v}/><span className="rank">#{i+1} IN SAMPLE</span></div>
        <div className="video-body"><h3>{v.title}</h3><div className="video-footer"><span><Eye size={13}/>{compact(v.views)} views</span><span>{day(v.publishedAt)}</span></div>
        {v.url && <a href={v.url} target="_blank" rel="noreferrer" className="tile-link" aria-label={'Watch ' + v.title}/>}</div>
      </article>)}</div> : <Empty title="No videos yet" description="The current channel has no accessible recent videos."/>}
    </section>
  </>;
}
function VideoLibrary({ data }) {
  const [sort, setSort] = useState('newest');
  const rows = [...data.videos].sort((a,b)=>sort==='views' ? (b.views||0)-(a.views||0) : new Date(b.publishedAt)-new Date(a.publishedAt));
  return <>
    <div className="page-heading"><div className="eyebrow">EXPLORE YOUR CONTENT</div><h1>Recent videos<span className="accent">.</span></h1>
    <p>Explore and export up to 30 recent public uploads.</p></div>
    <section className="panel library"><div className="library-head"><div><h2>Video performance</h2><p>{rows.length} videos in sample</p></div>
      <div className="toolbar"><button className="outline-btn" onClick={()=>setSort(v=>v==='views'?'newest':'views')}><ArrowDownUp size={15}/>{sort==='views'?'Most viewed':'Newest first'}</button>
      <button className="primary-btn" onClick={()=>saveCsv(data)}><Download size={16}/> Export CSV</button></div></div>
      <div className="table-scroll"><table className="video-table"><thead><tr><th>VIDEO</th><th>UPLOADED</th><th>VIEWS</th><th>ENGAGEMENT*</th></tr></thead>
      <tbody>{rows.map(v=><tr key={v.id}><td><div className="table-video"><Thumb video={v}/><div><strong>{v.title}</strong>
        {v.url && <a href={v.url} target="_blank" rel="noreferrer">Watch on YouTube <ExternalLink size={12}/></a>}</div></div></td>
        <td>{day(v.publishedAt)}</td><td className="strong">{compact(v.views)}</td><td>{engagement(v) == null ? '—' : engagement(v).toFixed(2)+'%'}</td>
      </tr>)}</tbody></table></div>
      <p className="caption"><Info size={14}/> * Engagement proxy uses public likes, comments and views, when available.</p></section>
  </>;
}
function Comparison({data, model}) {
  const [query,setQuery] = useState('');
  const [other,setOther] = useState(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {setOther(await loadChannel(query.trim()));} catch(e) {setError(e.message);}
    finally {setBusy(false);}
  }
  const right = other ? analyze(other) : null;
  const metrics = right ? [
    ['Subscribers',data.channel.subscribers,other.channel.subscribers],
    ['Lifetime channel views',data.channel.views,other.channel.views],
    ['Public video count',data.channel.videoCount,other.channel.videoCount],
    ['Recent average video views',model.average,right.average],
    ['Recent median video views',model.median,right.median]
  ] : [];
  return <>
    <div className="page-heading"><div className="eyebrow">SIDE-BY-SIDE INTELLIGENCE</div><h1>Compare channels<span className="accent">.</span></h1>
      <p>Compare public channel data and the latest accessible upload samples.</p></div>
    <form className="search-form compare-form" onSubmit={submit}><Search size={19}/><input value={query} required onChange={e=>setQuery(e.target.value)} placeholder="Competitor @handle or channel URL"/>
      <button className="primary-btn" disabled={busy}>{busy?'Comparing…':'Compare'} <ArrowRight size={16}/></button></form>
    {error && <p className="error"><AlertCircle size={17}/>{error}</p>}
    {other ? <section className="panel">
      <div className="compare-names"><h2>{data.channel.title}</h2><span>VS</span><h2>{other.channel.title}</h2></div>
      <div className="table-scroll"><table className="compare-table"><thead><tr><th>Metric</th><th>{data.channel.title}</th><th>{other.channel.title}</th></tr></thead>
        <tbody>{metrics.map(row=><tr key={row[0]}><td>{row[0]}</td><td>{compact(row[1])}</td><td>{compact(row[2])}</td></tr>)}</tbody></table></div>
      <p className="caption"><Info size={14}/> Recent-upload comparisons are not all-time rankings.</p>
    </section> : <Empty title="Choose a competitor" description="Enter a public YouTube channel handle above. Live lookups require a configured YouTube API key."/>}
  </>;
}
function Insights({data,model}) {
  const days = [...model.days].sort((a,b)=>b.count-a.count);
  const cards = [
    { icon: TrendingUp, label:'CONTENT STANDOUT', title:model.best?'Strongest recent video':'No top video yet',
      body:model.best ? '“'+model.best.title+'” leads this sample with '+compact(model.best.views)+' views. Its topic and framing may be worth reviewing.' : 'Analyze a channel with public videos to see its recent top performer.' },
    { icon: CalendarDays, label:'PUBLISHING RHYTHM', title:model.weekly == null ? 'Not enough uploads' : model.weekly.toFixed(1)+' uploads per week',
      body: 'Estimated from publishing dates of the '+data.videos.length+' most recent accessible uploads. '+(days[0]&&days[0].count?days[0].label+' appears most frequently in this sample. ':'')+'This does not establish the best posting day.' },
    { icon: BarChart3, label:'VIDEO PERFORMANCE', title:model.median == null?'No view baseline':compact(model.median)+' median recent views',
      body:'Recent average: '+compact(model.average)+'. The median is less affected by a few unusually popular videos. These are cumulative views, not age-adjusted.' },
    { icon: Sparkles, label:'PUBLIC ENGAGEMENT', title:model.engagement==null?'Engagement not available':model.engagement.toFixed(2)+'% engagement proxy',
      body:'Average (likes + comments) / views when public counts are available. Not official YouTube retention, reach or click-through rate.' }
  ];
  return <>
    <div className="page-heading"><div className="eyebrow">PATTERNS, NOT PREDICTIONS</div><h1>Creator insights<span className="accent">.</span></h1>
      <p>Useful observations from recent public data, without pretending to know the YouTube algorithm.</p></div>
    <div className="insight-grid">{cards.map(item=><article className="insight-card" key={item.label}>
      <div className="insight-icon"><item.icon size={20}/></div><small>{item.label}</small><h2>{item.title}</h2><p>{item.body}</p></article>)}</div>
    <p className="notice"><Info size={19}/> We cannot infer historical subscriber growth, retention, impressions, revenue, or private YouTube Studio analytics from this public data.</p>
  </>;
}
function App(){
  const [data,setData] = useState(demoData);
  const [tab,setTab] = useState(()=>tabFromHash(window.location.hash));
  const [query,setQuery] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [menu,setMenu] = useState(false);
  const [optimizerDraft,setOptimizerDraft] = useState({title:'',version:0});
  const model = useMemo(()=>analyze(data),[data]);
  const activeWorkspace=getWorkspace(getWorkspaceForTab(tab));
  const visibleTabs=tabs.filter(item=>tabsForWorkspace(activeWorkspace.id).includes(item.id));
  useEffect(()=>{
    const onHashChange=()=>{setTab(tabFromHash(window.location.hash));setMenu(false);};
    window.addEventListener('hashchange',onHashChange);
    return ()=>window.removeEventListener('hashchange',onHashChange);
  },[]);
  const switchTab = id => {
    const next=tabFromHash(hashForTab(id));
    setTab(next);
    setMenu(false);
    const target=hashForTab(next);
    if(window.location.hash!==target)window.location.hash=target;
  };
  function useOpportunity(idea) {
    setOptimizerDraft(prev=>({title:idea.title,description:'',audience:'',kind:'video',
      origin:'opportunity',version:prev.version+1}));
    switchTab('optimizer');
  }
  function useCalendarIdea(slot,config) {
    const draft=ideaToOptimizerDraft(slot,config);
    setOptimizerDraft(prev=>({...draft,version:prev.version+1}));
    switchTab('optimizer');
  }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result=await loadChannel(query.trim());setData(result);switchTab('overview'); }
    catch(e){setError(e.message);}
    finally {setBusy(false);}
  }
  function showDemo(){setData(demoData);switchTab('overview');setQuery('');setError('');}
  return <div className="app">
    <aside className={'sidebar'+(menu?' sidebar-open':'')}>
      <div className="brand"><div className="brand-icon"><Youtube size={25}/></div><div><strong>channel<span>scope</span></strong><small>CREATOR INTELLIGENCE</small></div></div>
      <div className="side-label">CHOOSE YOUR PLATFORM</div>
      <div className="workspace-switcher" role="navigation" aria-label="Creator workspaces">
        {workspaceConfig.map(item=>{
          const Icon=workspaceIcons[item.id];
          return <button type="button" key={item.id} className={'workspace-choice workspace-'+item.id+(activeWorkspace.id===item.id?' active':'')}
            aria-current={activeWorkspace.id===item.id?'page':undefined}
            onClick={()=>switchTab(defaultTabForWorkspace(item.id))}>
            <span className="workspace-icon"><Icon size={20}/></span>
            <span className="workspace-copy"><strong>{item.label}</strong><small>{item.subtitle}</small></span>
            <ArrowRight size={14} className="workspace-arrow"/>
          </button>;
        })}
      </div>
      <div className="side-label workspace-subhead">{activeWorkspace.label.toUpperCase()} TOOLS</div>
      <nav aria-label={activeWorkspace.label+' tools'}>
        {visibleTabs.map(item=><button type="button" key={item.id} onClick={()=>switchTab(item.id)}
          aria-current={tab===item.id?'page':undefined}
          className={'nav-btn'+(tab===item.id?' selected':'')}><item.icon size={19}/>{item.label}</button>)}
      </nav>
      <p className="workspace-info">{activeWorkspace.id==='youtube'
        ?'Public channel analytics, video strategy and YouTube optimization.'
        :activeWorkspace.id==='instagram'
          ?'Instagram bios, captions and hashtags. No account connection needed.'
          :'Plan content across Instagram and YouTube, or prepare a publishing pack.'}</p>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={19}/><strong>Built for curious creators</strong><p>Find better questions to ask about your content.</p></div>
      <div className="side-footer"><span className="status-dot"/> PUBLIC DATA · FREE STARTER</div></div>
    </aside>
    {menu && <button className="mobile-overlay" aria-label="Close navigation" onClick={()=>setMenu(false)}/>}
    <main className="main">
      <header className="topbar"><div className="crumb"><button className="mobile-menu" onClick={()=>setMenu(v=>!v)} aria-label="Menu">{menu?<X/>:<Menu/>}</button><span className="crumb-platform">{activeWorkspace.label}</span><span>/</span><strong>{tabs.find(t=>t.id===tab)?.label||'Overview'}</strong></div>
        <span className="source-indicator"><span className="status-dot"/>{['instagram','social','calendar'].includes(tab)?'NO LOGIN NEEDED':tab==='optimizer'&&optimizerDraft.origin==='calendar'?'PLANNED SHORT DRAFT':data.source==='demo'?'DEMO DATA':'PUBLIC YOUTUBE DATA'}</span></header>
      <div className="content">
        {!['instagram','social','calendar'].includes(tab)&&!(tab==='optimizer'&&optimizerDraft.origin==='calendar')&&<div className="search-row"><form className="search-form" onSubmit={submit}><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)}
          aria-label="Channel handle or URL" placeholder="Enter @channelhandle or YouTube channel URL" required/>
          <button className="primary-btn" disabled={busy}>{busy?<RefreshCw size={16} className="spin"/>:<ArrowRight size={16}/>} {busy?'Analyzing…':'Analyze channel'}</button></form>
          <button className="outline-btn" onClick={showDemo}><Play size={14}/>Try demo</button></div>}
        {error && <div className="error"><AlertCircle size={18}/><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss"><X size={16}/></button></div>}
        {!['instagram','social','calendar'].includes(tab)&&!(tab==='optimizer'&&optimizerDraft.origin==='calendar')&&data.source==='demo' && <p className="demo-banner"><Info size={16}/> You're viewing <strong>fictional demo data.</strong> Connect your YouTube API key to explore real public channel metrics.</p>}
        {tab==='overview'&&<Overview data={data} model={model} showVideos={()=>switchTab('videos')}/>}
        {tab==='videos'&&<VideoLibrary data={data}/>}
        {tab==='compare'&&<Comparison key={data.channel.id} data={data} model={model}/>}
        {tab==='insights'&&<Insights data={data} model={model}/>}
        {tab==='advisor'&&<Advisor key={data.channel.id + ':' + data.fetchedAt} data={data}/>}
        {tab==='optimizer'&&<VideoOptimizer key={data.channel.id + ':' + optimizerDraft.version} data={optimizerDraft.origin==='calendar'?{source:'calendar',channel:{},videos:[]}:data} initialDraft={optimizerDraft} initialTopic={optimizerDraft.title}/>}
        {tab==='opportunities'&&<OpportunityFinder key={data.channel.id + ':' + data.fetchedAt} data={data} onUseIdea={useOpportunity}/>}
        {tab==='instagram'&&<InstagramStudio/>}
        {tab==='social'&&<SocialPublishing/>}
        {tab==='calendar'&&<ContentCalendar onUseIdea={useCalendarIdea}/>}
        <footer><span>ChannelScope · Independent creator tools</span><span>{tab==='calendar'?'Draft content calendar · No scheduling, publishing or account connection':tab==='social'?'Instagram + YouTube Shorts drafts only · No account connection or posting · Independent creator tools':tab==='instagram'?'Instagram drafts only · No posting or account connection · Not affiliated with Instagram':(data.source==='demo'?'Fictional example':'Fetched '+day(data.fetchedAt))+' · Public YouTube data · Not affiliated with YouTube'}</span></footer>
      </div>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
