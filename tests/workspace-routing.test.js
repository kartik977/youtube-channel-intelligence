import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {
  workspaceConfig,getWorkspaceForTab,getWorkspace,defaultTabForWorkspace,
  tabsForWorkspace,hashForTab,tabFromHash,tabIds
} from '../src/workspace-routing.js';

test('YouTube analytics and optimizer tools never appear as Instagram-only tools',()=>{
  assert.deepEqual(tabsForWorkspace('youtube'),[
    'overview','videos','compare','insights','advisor','optimizer','opportunities'
  ]);
  assert.deepEqual(tabsForWorkspace('instagram'),['instagram']);
  assert.deepEqual(tabsForWorkspace('creator'),['social','calendar','upload']);
  const seen=workspaceConfig.flatMap(workspace=>workspace.tabIds);
  assert.equal(new Set(seen).size,seen.length);
  assert.deepEqual([...seen].sort(),[...tabIds].sort());
  assert.equal(getWorkspaceForTab('optimizer'),'youtube');
  assert.equal(getWorkspaceForTab('instagram'),'instagram');
  assert.equal(getWorkspaceForTab('social'),'creator');
  assert.equal(getWorkspaceForTab('calendar'),'creator');
  assert.equal(getWorkspaceForTab('upload'),'creator');
});
test('Each workspace has a separate platform home and deep-linkable URL',()=>{
  assert.equal(defaultTabForWorkspace('youtube'),'overview');
  assert.equal(defaultTabForWorkspace('instagram'),'instagram');
  assert.equal(defaultTabForWorkspace('creator'),'social');
  assert.equal(hashForTab('overview'),'#/youtube/overview');
  assert.equal(hashForTab('instagram'),'#/instagram/studio');
  assert.equal(hashForTab('social'),'#/creator/social-publishing');
  assert.equal(hashForTab('calendar'),'#/creator/content-calendar');
  assert.equal(hashForTab('upload'),'#/creator/video-upload-studio');
  assert.equal(hashForTab('optimizer'),'#/youtube/video-optimizer');
  for(const tab of tabIds) assert.equal(tabFromHash(hashForTab(tab)),tab);
});
test('URL parser accepts old tab IDs and safely handles unknown paths',()=>{
  assert.equal(tabFromHash(''),'overview');
  assert.equal(tabFromHash('#/optimizer'),'optimizer');
  assert.equal(tabFromHash('#/calendar'),'calendar');
  assert.equal(tabFromHash('#/instagram/garbage'),'instagram');
  assert.equal(tabFromHash('#/creator/not-a-page'),'social');
  assert.equal(tabFromHash('#/youtube/not-a-page'),'overview');
  assert.equal(tabFromHash('#/unknown/overview'),'overview');
  assert.equal(tabFromHash('#/instagram/../youtube/overview'),'overview');
  assert.equal(tabFromHash('#/youtube/video-library/'),'videos');
  assert.equal(tabFromHash('#/creator/content-calendar'),'calendar');
  assert.equal(hashForTab('something-unexpected'),'#/youtube/overview');
  assert.equal(getWorkspaceForTab('unexpected'),'youtube');
  assert.equal(getWorkspace('unexpected').id,'youtube');
});
test('Navigation handles deep links and browser back/forward with platform-specific sections',()=>{
  const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
  assert.match(main,/tabFromHash\(window\.location\.hash\)/);
  assert.match(main,/window\.addEventListener\('hashchange'/);
  assert.match(main,/window\.removeEventListener\('hashchange'/);
  assert.match(main,/window\.location\.hash=target/);
  assert.match(main,/workspaceConfig\.map\(item=>/);
  assert.match(main,/tabsForWorkspace\(activeWorkspace\.id\)/);
  assert.match(main,/visibleTabs\.map\(item=>/);
  assert.match(main,/aria-label="Creator workspaces"/);
  assert.match(main,/onClick=\{\(\)=>switchTab\(defaultTabForWorkspace\(item\.id\)\)\}/);
});
test('Calendar-to-Video Optimizer navigation and Instagram independence are preserved',()=>{
  const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
  assert.match(main,/onUseIdea=\{useCalendarIdea\}/);
  assert.match(main,/switchTab\('optimizer'\)/);
  assert.match(main,/optimizerDraft\.origin==='calendar'/);
  assert.match(main,/tab==='instagram'&&<InstagramStudio\/>/);
  assert.match(main,/tab==='social'&&<SocialPublishing\/>/);
  assert.match(main,/tab==='calendar'&&<ContentCalendar/);
  assert.match(main,/tab==='optimizer'&&<VideoOptimizer/);
  assert.match(main,/!?\['instagram','social','calendar','upload'\]\.includes\(tab\)/);
  const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
  assert.match(css,/\.workspace-switcher/);
  assert.match(css,/\.workspace-choice\.active/);
});
