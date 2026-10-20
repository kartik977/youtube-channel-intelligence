import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {ideaToOptimizerDraft} from '../src/calendar-optimizer.js';
import {createContentCalendar} from '../src/content-calendar-plan.js';

test('YouTube Content Calendar idea becomes an editable planned Short brief',()=>{
  const plan=createContentCalendar({niche:'PS5 Gaming. Different Games',
    audience:'PS5 gaming fans',goal:'growth',platform:'youtube',
    days:7,perWeek:3,startDate:'2026-10-19'});
  const idea=plan.slots[0];
  const draft=ideaToOptimizerDraft(idea,plan.config);
  assert.equal(draft.kind,'short');
  assert.equal(draft.title,idea.title);
  assert.equal(draft.audience,'PS5 gaming fans');
  assert.equal(draft.origin,'calendar');
  assert.equal(draft.sourcePlatform,'YouTube Short');
  assert.match(draft.description,/PLANNED CONCEPT/);
  assert.ok(draft.description.includes(idea.idea));
  assert.ok(draft.description.includes(idea.hook));
  assert.doesNotMatch(draft.description,/footage already recorded|has already happened/i);
  assert.ok(draft.description.length<=650);
});
test('Instagram calendar idea can be adapted as a prospective YouTube Short',()=>{
  const item={title:'Short video idea',idea:'Plan a short recording of one real travel scene.',
    hook:'Which place would you like to see next?',platform:'Instagram Reel'};
  const result=ideaToOptimizerDraft(item,{audience:'Travelers'});
  assert.equal(result.sourcePlatform,'Instagram Reel');
  assert.equal(result.kind,'short');
  assert.equal(result.audience,'Travelers');
  assert.ok(result.description.includes('not recorded footage'));
});
test('Handoff trims long suggestions and rejects missing concepts',()=>{
  assert.throws(()=>ideaToOptimizerDraft({title:'A title'}),/incomplete/);
  const v=ideaToOptimizerDraft({title:'x'.repeat(600),idea:'y'.repeat(2000),hook:'z'.repeat(2000)},
    {audience:'a'.repeat(200)});
  assert.equal(v.title.length,130);
  assert.equal(v.audience.length,100);
  assert.ok(v.description.length<=650);
});
test('Calendar and optimizer retain UI wiring with a prefilled draft and no demo analytics',()=>{
  const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
  const calendar=readFileSync(new URL('../src/ContentCalendar.jsx',import.meta.url),'utf8');
  const optimizer=readFileSync(new URL('../src/VideoOptimizer.jsx',import.meta.url),'utf8');
  assert.match(main,/onUseIdea=\{useCalendarIdea\}/);
  assert.match(main,/ideaToOptimizerDraft\(slot,config\)/);
  assert.match(main,/initialDraft=\{optimizerDraft\}/);
  assert.match(main,/source:'calendar',channel:\{\},videos:\[\]/);
  assert.match(calendar,/Use in Video Optimizer/);
  assert.match(optimizer,/initialDraft\.description/);
  assert.match(optimizer,/PLANNED CONCEPT|Imported from Content Calendar/);
});
