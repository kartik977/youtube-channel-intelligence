import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {hashForTab,tabFromHash,tabIds,defaultTabForWorkspace} from '../src/workspace-routing.js';

const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const home=readFileSync(new URL('../src/WelcomeHome.jsx',import.meta.url),'utf8');
const homeCSS=readFileSync(new URL('../src/welcome-home.css',import.meta.url),'utf8');
const appCSS=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('Landing has a dedicated shareable URL and existing workspace deep links stay unchanged',()=>{
  assert.equal(hashForTab('home'),'#/home');
  assert.equal(tabFromHash('#/home'),'home');
  assert.equal(tabFromHash(''),'overview'); // old helper semantics preserved for API callers
  assert.equal(hashForTab('overview'),'#/youtube/overview');
  assert.equal(hashForTab('instagram'),'#/instagram/studio');
  assert.equal(hashForTab('calendar'),'#/creator/content-calendar');
  for(const name of tabIds)assert.equal(tabFromHash(hashForTab(name)),name);
  assert.equal(defaultTabForWorkspace('youtube'),'overview');
});
test('Visitors at the root website see Welcome Home, existing hashes continue directly to tools',()=>{
  assert.match(main,/window\.location\.hash\?tabFromHash\(window\.location\.hash\):'home'/);
  assert.match(main,/window\.addEventListener\('hashchange'/);
  assert.match(main,/tab==='home'&&<WelcomeHome/);
  assert.match(main,/onExplore=\{id=>switchTab\(defaultTabForWorkspace\(id\)\)\}/);
  assert.match(main,/onDemo=\{showDemo\}/);
  assert.match(main,/onCalendar=\{\(\)=>switchTab\('calendar'\)\}/);
  assert.match(main,/switchTab\('home'\)/);
  assert.match(main,/aria-label="ChannelScope home"/);
});
test('Landing is a first-visit experience instead of fictional demo metrics or YouTube search',()=>{
  assert.match(main,/tab!=='home'&&!\['instagram','social','calendar'\]\.includes\(tab\)/);
  assert.match(main,/isLanding\?'FREE CREATOR TOOLS'/);
  assert.match(main,/isLanding\?'ChannelScope'/);
  assert.match(main,/isLanding\?\[\]:tabs\.filter/);
  assert.match(home,/No login to explore/);
  assert.match(home,/Nothing auto-published/);
  assert.match(home,/Try YouTube demo/);
  assert.match(home,/Plan a content week/);
});
test('Each platform card has a meaningful explanation and opens the correct workspace',()=>{
  for(const label of ['youtube','instagram','creator']){
    assert.match(home,new RegExp("id:'"+label+"'"));
    assert.match(home,new RegExp("onExplore\\(item.id\\)"));
    assert.match(home,new RegExp("workspace-"+label+"|welcome-card-"+label));
  }
  assert.match(home,/Channel analytics/);
  assert.match(home,/Profile bios/);
  assert.match(home,/Content Calendar/);
  assert.match(home,/onClick=\{onDemo\}/);
  assert.match(home,/onClick=\{onCalendar\}/);
});
test('Sidebar labels are concise; shared space does not display Creator Tools Tools',()=>{
  assert.match(main,/activeWorkspace\.id==='creator'\?'SHARED TOOLS'/);
  assert.doesNotMatch(main,/CREATOR TOOLS TOOLS/);
  assert.match(main,/sidebar-home-link/);
  assert.match(main,/!isLanding&&<><div className="side-label workspace-subhead"/);
});
test('Landing is responsive, accessible and lightweight CSS-only',()=>{
  assert.match(homeCSS,/\.welcome-workspaces\{display:grid/);
  assert.match(homeCSS,/@media\(max-width:1020px\)/);
  assert.match(homeCSS,/@media\(max-width:680px\)/);
  assert.match(homeCSS,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(homeCSS,/pointer-events:none/);
  assert.match(appCSS,/\.app\.theme-landing/);
  assert.match(appCSS,/\.sidebar \.brand-button/);
  assert.match(appCSS,/\.sidebar \.sidebar-home-link/);
  assert.match(main,/theme-"\+\(isLanding\?'landing':activeWorkspace.id\)/);
});
test('Previous features and calendar-to-optimizer handoff remain available',()=>{
  for(const id of ['overview','videos','compare','insights','advisor','optimizer','opportunities','instagram','social','calendar']){
    assert.match(main,new RegExp("tab==='"+id+"'"));
  }
  assert.match(main,/onUseIdea=\{useCalendarIdea\}/);
  assert.match(main,/switchTab\('optimizer'\)/);
  assert.match(main,/function showDemo\(\)/);
});
