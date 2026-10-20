import React from 'react';
import {Youtube,Instagram,Layers3,ArrowRight,Sparkles,BarChart3,CalendarDays,PenLine,Check,PlayCircle} from 'lucide-react';
import './welcome-home.css';

const workspaces=[
  {
    id:'youtube',icon:Youtube,eyebrow:'YOUTUBE INTELLIGENCE',
    title:'Understand your YouTube channel',
    description:'Explore public channel statistics, discover video patterns, and develop your next ideas with context.',
    features:['Channel analytics','Creator Advisor','Video Optimizer'],
    cta:'Open YouTube workspace'
  },
  {
    id:'instagram',icon:Instagram,eyebrow:'INSTAGRAM STUDIO',
    title:'Find the right words for Instagram',
    description:'Draft profile bios, captions, and relevant hashtags from your own description. No Instagram login required.',
    features:['Profile bios','Reel captions','Hashtag suggestions'],
    cta:'Open Instagram Studio'
  },
  {
    id:'creator',icon:Layers3,eyebrow:'CROSS-PLATFORM TOOLS',
    title:'Plan once. Create for both.',
    description:'Build a realistic content calendar and prepare distinct Instagram and YouTube Shorts drafts.',
    features:['Content Calendar','Social Publishing','Copy-ready drafts'],
    cta:'Open Creator Tools'
  }
];

export default function WelcomeHome({onExplore,onDemo,onCalendar}){
  return <div className="welcome-home">
    <section className="welcome-hero" aria-labelledby="welcome-title">
      <div className="welcome-hero-copy">
        <div className="welcome-eyebrow"><Sparkles size={15}/> YOUR CREATIVE COMMAND CENTER</div>
        <h1 id="welcome-title">Better content starts<br/>with <span>a clear direction.</span></h1>
        <p>Meet ChannelScope: a free-to-start toolkit for understanding your YouTube content, crafting Instagram posts, and planning what to make next.</p>
        <div className="welcome-hero-actions">
          <button type="button" className="welcome-primary" onClick={()=>onExplore('youtube')}>
            Explore YouTube <ArrowRight size={17}/>
          </button>
          <button type="button" className="welcome-secondary" onClick={()=>onExplore('instagram')}>
            <Instagram size={17}/> Explore Instagram
          </button>
        </div>
        <div className="welcome-trust">
          <span><Check size={14}/> No login to explore</span>
          <span><Check size={14}/> Free planning tools</span>
          <span><Check size={14}/> Nothing auto-published</span>
        </div>
      </div>
      <div className="welcome-visual" aria-label="YouTube, Instagram and Creator Tools all in one place">
        <div className="welcome-visual-glow"/>
        <div className="welcome-visual-panel">
          <div className="welcome-visual-top"><span className="welcome-visual-dot"/><span className="welcome-visual-dot"/><span className="welcome-visual-dot"/><span>CHANNELSCOPE / WORKSPACE</span></div>
          <div className="welcome-visual-tile welcome-visual-youtube"><Youtube size={19}/><div><strong>YouTube</strong><small>Explore performance</small></div><BarChart3 size={18}/></div>
          <div className="welcome-visual-tile welcome-visual-instagram"><Instagram size={19}/><div><strong>Instagram</strong><small>Find your voice</small></div><PenLine size={18}/></div>
          <div className="welcome-visual-tile welcome-visual-creator"><Layers3 size={19}/><div><strong>Creator Tools</strong><small>Plan your next post</small></div><CalendarDays size={18}/></div>
          <div className="welcome-visual-bottom">One place for your next creative step <Sparkles size={14}/></div>
        </div>
      </div>
    </section>

    <section className="welcome-discover" aria-labelledby="welcome-discover-heading">
      <div className="welcome-section-title">
        <div><small>START WHERE YOU ARE</small><h2 id="welcome-discover-heading">What would you like to create?</h2></div>
        <p>Choose a workspace. You can switch at any time.</p>
      </div>
      <div className="welcome-workspaces">
        {workspaces.map(item=>{
          const Icon=item.icon;
          return <button key={item.id} type="button" className={'welcome-card welcome-card-'+item.id}
            onClick={()=>onExplore(item.id)} aria-label={item.cta}>
            <div className="welcome-card-head"><span className="welcome-card-icon"><Icon size={22}/></span><ArrowRight size={19} className="welcome-card-arrow"/></div>
            <span className="welcome-card-eyebrow">{item.eyebrow}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="welcome-card-tags">{item.features.map(feature=><span key={feature}>{feature}</span>)}</div>
            <span className="welcome-card-cta">{item.cta} <ArrowRight size={15}/></span>
          </button>;
        })}
      </div>
    </section>

    <section className="welcome-next" aria-label="Quick ways to get started">
      <div className="welcome-next-icon"><PlayCircle size={23}/></div>
      <div><strong>New here? You can explore before connecting anything.</strong>
        <p>Try fictional YouTube demo data, or plan a week of posts without an account.</p></div>
      <div className="welcome-next-actions">
        <button type="button" onClick={onDemo}>Try YouTube demo <ArrowRight size={14}/></button>
        <button type="button" onClick={onCalendar}>Plan a content week <CalendarDays size={14}/></button>
      </div>
    </section>
  </div>;
}
