import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  normalizeCalendarBrief,createContentCalendar,calendarToText,calendarToCSV,calendarToICS
} from '../src/content-calendar-plan.js';
import {normalizeSocialBrief,freeSocialPack,validateSocialAI} from '../functions/api/social-pack.js';
import {nearDuplicateCopy,freeYoutubeCopy} from '../functions/api/social-quality.js';

const config={niche:'PS5 gaming and Cricket 26 highlights',audience:'Casual cricket fans',
  goal:'consistency',platform:'both',days:7,perWeek:3,startDate:'2026-10-19'};
test('Validates goal, format, length, niche, pace and an actual ISO calendar date',()=>{
  assert.equal(normalizeCalendarBrief(config).perWeek,3);
  for(const [change,error] of [
    [{niche:'hi'},/at least 8/],[{days:14},/7-day or 30-day/],[{perWeek:7},/2, 3, or 5/],
    [{goal:'go viral'},/goal/],[{platform:'twitter'},/Instagram/],
    [{startDate:'2026-02-30'},/valid calendar/],[{startDate:'2026-13-01'},/valid calendar/]
  ]){
    assert.throws(()=>normalizeCalendarBrief({...config,...change}),error);
  }
});
test('A seven-day plan at 3 posts/week is spaced and alternates platforms',()=>{
  const plan=createContentCalendar(config);
  assert.equal(plan.slots.length,3);
  assert.deepEqual(plan.slots.map(x=>x.date),['2026-10-19','2026-10-21','2026-10-23']);
  assert.deepEqual(plan.slots.map(x=>x.platform),['Instagram Reel','YouTube Short','Instagram Reel']);
  assert.equal(plan.stats.instagram,2);
  assert.equal(plan.stats.youtube,1);
  assert.ok(plan.slots.every(x=>/PS5|Cricket 26/.test(x.title)));
  assert.ok(plan.slots.every(x=>x.hook&&x.idea&&x.callToAction&&x.goalNote));
  assert.ok(plan.slots.every(x=>x.status==='planned'));
  assert.match(plan.note,/not an optimized posting-time recommendation/);
});
test('30-day calendar carries cadence across months; no off-by-one days',()=>{
  const p=createContentCalendar({...config,days:30,startDate:'2026-10-29',perWeek:3});
  assert.equal(p.slots.length,13);
  assert.equal(p.stats.instagram+p.stats.youtube,p.stats.scheduled);
  assert.equal(p.slots[0].date,'2026-10-29');
  assert.equal(p.slots.at(-1).date,'2026-11-26');
  assert.ok(p.slots.every(x=>x.date>='2026-10-29'&&x.date<='2026-11-27'));
  assert.equal(new Set(p.slots.map(x=>x.date)).size,p.slots.length);
  assert.equal(p.slots.at(-1).week,5);
});
test('Solo-platform schedules respect creator choice and different frequencies',()=>{
  for(const [perWeek,expected] of [[2,2],[3,3],[5,5]]){
    const one=createContentCalendar({...config,platform:'youtube',perWeek});
    assert.equal(one.slots.length,expected);
    assert.equal(one.stats.instagram,0);
    assert.ok(one.slots.every(x=>x.platform==='YouTube Short'));
    const insta=createContentCalendar({...config,platform:'instagram',perWeek});
    assert.equal(insta.stats.youtube,0);
    assert.equal(insta.stats.instagram,expected);
  }
});
test('Fresh angles are distinct and remain within the same niche',()=>{
  const first=createContentCalendar(config),next=createContentCalendar(config,1);
  assert.notEqual(first.slots[0].title,next.slots[0].title);
  assert.equal(first.slots[0].date,next.slots[0].date);
  assert.ok(next.slots.every(s=>/PS5|Cricket 26/.test(s.title)));
});
test('CSV correctly quotes commas and ICS uses all-day dates without posting times',()=>{
  const plan=createContentCalendar({...config,niche:'Travel, food and local experiences'});
  const csv=calendarToCSV(plan),ics=calendarToICS(plan),plain=calendarToText(plan);
  assert.match(csv,/\"Travel, food and local experiences/);
  assert.equal(csv.split('\r\n').length,plan.slots.length+2);
  assert.match(ics,/BEGIN:VCALENDAR\r\n/);
  assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,plan.slots.length);
  assert.match(ics,/DTSTART;VALUE=DATE:20261019/);
  assert.match(ics,/DTEND;VALUE=DATE:20261020/);
  assert.doesNotMatch(ics,/DTSTART:20261019T/);
  assert.match(ics,/Draft task only/);
  assert.match(plain,/Instagram Reel/);
  assert.match(plain,/YouTube Short/);
});
test('Content calendar can plan leap-day posts',()=>{
  const p=createContentCalendar({...config,days:7,startDate:'2028-02-28',perWeek:5});
  assert.equal(p.slots[1].date,'2028-02-29');
  assert.equal(p.slots.at(-1).date,'2028-03-05');
});
test('YouTube fallback varies description and hook while retaining factual showcase',()=>{
  const brief=normalizeSocialBrief({description:'Halloween decor at a plano house.',
    goal:'engagement',tone:'friendly',profile:'creator',format:'reel'});
  const output=freeYoutubeCopy(brief);
  assert.equal(output.contentType,'showcase');
  assert.equal(output.title,'Halloween decorations at a home in Plano');
  assert.match(output.description,/Halloween decorations at a home in Plano/);
  assert.match(output.hook,/This Plano home/);
  assert.equal(nearDuplicateCopy(output.description,output.hook),false);
  assert.equal(nearDuplicateCopy(output.title,output.hook),false);
  assert.doesNotMatch(output.description,/Short video about/);
});
test('AI repeating the description as its hook is replaced by the distinct fallback',()=>{
  const brief=normalizeSocialBrief({description:'Halloween decor at a plano house.',
    tone:'friendly',profile:'creator',format:'reel'});
  const backup=freeSocialPack(brief);
  const repeated='Halloween decorations at a home in Plano. Take a look at the festive display.';
  const result=validateSocialAI({
    instagram:{caption:'Spooky Halloween decor at a Plano home! 🎃'},
    youtube:{
      title:'Halloween Decorations at a Plano Home',
      description:repeated,hook:repeated
    }
  },brief,backup);
  assert.equal(result.mode,'hybrid');
  assert.equal(result.youtube.description,repeated);
  assert.equal(result.youtube.hook,backup.youtube.hook);
  assert.ok(nearDuplicateCopy(repeated,repeated));
});


test('PS5 Different Games screenshot brief gets three different actionable gaming Shorts',()=>{
  const p=createContentCalendar({
    niche:'PS5 Gaming. Different Games',audience:'Gaming Audience',goal:'consistency',
    platform:'youtube',days:7,perWeek:3,startDate:'2026-10-21'
  });
  assert.deepEqual(p.slots.map(x=>x.date),['2026-10-21','2026-10-23','2026-10-25']);
  assert.deepEqual(p.slots.map(x=>x.platform),['YouTube Short','YouTube Short','YouTube Short']);
  assert.match(p.slots[0].title,/which PS5 game has the best opening/i);
  assert.match(p.slots[1].title,/one challenge, two PS5 games/i);
  assert.match(p.slots[2].title,/choose my next PS5 game/i);
  assert.equal(new Set(p.slots.map(x=>x.title)).size,3);
  for(const slot of p.slots){
    assert.ok(slot.idea.length>=85);
    assert.ok(slot.hook.length>=25);
    assert.doesNotMatch(slot.hook,/Topic:|here is one detail|worth noticing/i);
    assert.doesNotMatch(slot.title,/different games — spotlight|share one observation/i);
    assert.ok(slot.callToAction);
  }
});
test('Fallback niches get their own usable angles, not generic Spotlight templates',()=>{
  const cases=[
    ['travel photography around Japan','travel'],
    ['quick recipes and home cooking','food'],
    ['strength workouts for beginners','fitness'],
    ['software engineering with Python','tech'],
    ['skincare and fashion outfits','lifestyle'],
    ['collectible book reviews','general']
  ];
  for(const [niche] of cases){
    const p=createContentCalendar({...config,niche});
    assert.equal(p.slots.length,3);
    assert.equal(new Set(p.slots.map(x=>x.title)).size,3);
    assert.ok(p.slots.some(x=>x.title.toLowerCase().includes(niche.slice(0,12).toLowerCase())));
    assert.ok(p.slots.every(x=>!x.hook.includes('Topic:')));
  }
});
