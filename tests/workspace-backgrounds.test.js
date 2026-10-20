import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {getWorkspaceForTab,tabIds} from '../src/workspace-routing.js';

const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('Every page receives the current workspace and page theme automatically',()=>{
  assert.match(main,/className=\{"app theme-"\+\(isLanding\?'landing':activeWorkspace\.id\)\}\s+data-page=\{tab\}/);
  assert.match(main,/activeWorkspace=getWorkspace\(getWorkspaceForTab\(tab\)\)/);
  for(const tab of tabIds){
    const workspace=getWorkspaceForTab(tab);
    assert.ok(['youtube','instagram','creator'].includes(workspace));
    assert.ok(css.includes('.app[data-page="'+tab+'"]'),'Missing ambient glow for '+tab);
  }
});
test('YouTube, Instagram and Creator Tools have distinct atmospheric palettes',()=>{
  for(const workspace of ['youtube','instagram','creator']){
    const theme=css.match(new RegExp('\\.app\\.theme-'+workspace+'\\s*\\{([^}]*)\\}'));
    assert.ok(theme,'Missing theme '+workspace);
    assert.match(theme[1],/--theme-accent:/);
    assert.match(theme[1],/--theme-halo-a:/);
    assert.match(theme[1],/--theme-halo-b:/);
  }
  assert.match(css,/\.app \.main\s*\{[^}]*radial-gradient/s);
  assert.match(css,/\.app \.main\s*\{[^}]*linear-gradient/s);
});
test('Atmospheric texture cannot cover or intercept navigation',()=>{
  const overlay=css.match(/\.app \.main::before\s*\{([^}]*)\}/s);
  assert.ok(overlay,'No subtle background texture');
  assert.match(overlay[1],/pointer-events:none/);
  assert.match(overlay[1],/position:absolute/);
  assert.match(overlay[1],/height:760px/);
  assert.match(css,/\.app \.main>\.topbar,\.app \.main>\.content \{position:relative;z-index:1\}/);
  assert.match(css,/prefers-reduced-transparency:reduce/);
});
test('Mobile and desktop preserve original page layouts and API features',()=>{
  assert.match(css,/@media \(max-width:820px\)/);
  assert.match(css,/\.app \.main::before \{height:510px/);
  assert.match(main,/tab==='instagram'&&<InstagramStudio\/>/);
  assert.match(main,/tab==='calendar'&&<ContentCalendar onUseIdea=\{useCalendarIdea\}\/>/);
  assert.match(main,/tab==='optimizer'&&<VideoOptimizer/);
  assert.match(main,/switchTab\('optimizer'\)/);
});
