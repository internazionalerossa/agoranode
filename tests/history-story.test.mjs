import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import STORY from '../app/data/history-story.json' with {type:'json'};
import DOSSIERS from '../app/data/history-dossiers.json' with {type:'json'};
import GROWTH from '../app/data/history-growth-comparison.json' with {type:'json'};
import {SOCIAL_ACHIEVEMENTS} from '../app/data/social-achievements.ts';

test('repression history is integrated, attributable and reachable from its dossier timeline',()=>{
 const events=STORY.flatMap(era=>era.events),attacks=events.filter(event=>event.kind);
 const dossier=DOSSIERS.dossiers.find(item=>item.id==='diritti-sotto-attacco');
 assert.ok(attacks.length>=25);assert.ok(new Set(attacks.map(event=>event.country)).size>=15);
 const anchors=events.map(event=>event.id??('tappa-'+event.title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-')));
 assert.equal(new Set(anchors).size,anchors.length,'each chronological entry needs a unique destination');
 assert.deepEqual(dossier.timeline.map(entry=>entry.eventId),attacks.map(event=>event.id));
 for(const event of attacks){
  assert.ok(event.id&&event.detail.paragraphs.length>=2,event.title);
  assert.ok(event.detail.sources.length,event.title);
  for(const ref of event.detail.sources)assert.ok(Object.values(DOSSIERS.sources).some(source=>source.url===ref.url),ref.url);
 }
 for(const entry of dossier.timeline)assert.ok(anchors.includes(entry.eventId));
 for(const id of ['italia','comune','vienna'])assert.ok(DOSSIERS.dossiers.find(item=>item.id===id).related.includes(dossier.id));
 // Laws, prosecution and armed violence remain distinguishable for readers.
 assert.notEqual(attacks.find(event=>event.id==='jobsact-2014').kind,attacks.find(event=>event.id==='cile-1973').kind);
 assert.notEqual(attacks.find(event=>event.id==='thatcher-1980').kind,attacks.find(event=>event.id==='orgreave-1984').kind);
});
test('the chronological narrative links to real documents and retains countries outside declared socialist states',()=>{
 let prior=0;const dossierIds=new Set(DOSSIERS.dossiers.map(d=>d.id)),cardIds=new Set(SOCIAL_ACHIEVEMENTS.map(c=>c.id));
 for(const era of STORY){const first=Number(era.period.match(/\d{4}/)[0]);assert.ok(first>=prior);prior=first;assert.ok(era.title&&era.intro&&era.events.length);for(const event of era.events){if(event.dossier)assert.ok(dossierIds.has(event.dossier));for(const card of event.cards)assert.ok(cardIds.has(card),card);}}
 const text=JSON.stringify(STORY);for(const country of ['Francia','Italia','Regno Unito','Austria','URSS','Cina','Vietnam','Cuba','Messico','India','Brasile','Sudafrica'])assert.ok(text.includes(country),country);
});
test('featured growth comparisons use identical years and actual total and per-capita source observations',async()=>{
 for(const [indicator,key]of [['NY.GDP.MKTP.KD','total'],['NY.GDP.PCAP.KD','perCapita']]){
  const source=JSON.parse(await readFile(new URL('../public/data/history/'+indicator+'.json',import.meta.url),'utf8'));
  for(const country of GROWTH.countries){const values=new Map(source.series[country.id]);assert.equal(country[key].start,values.get(1978));assert.equal(country[key].end,values.get(2024));assert.equal(country[key].multiple,values.get(2024)/values.get(1978));}
 }
});

test('featured static charts preserve every available annual observation and their original units',async()=>{
 const charts=JSON.parse(await readFile(new URL('../app/data/history-featured-charts.json',import.meta.url),'utf8'));
 for(const chart of charts){
  const data=JSON.parse(await readFile(new URL('../public/data/history/'+chart.indicator+'.json',import.meta.url),'utf8'));
  const code=chart.country==='Cuba'?'CUB':chart.country==='Vietnam'?'VNM':'BRA';
  assert.deepEqual(chart.values,data.series[code].filter(([year])=>year>=chart.start&&year<=chart.end));
  assert.equal(chart.values[0][0],chart.start);assert.equal(chart.values.at(-1)[0],chart.end);
 }
 const story=JSON.stringify(STORY);assert.ok(story.includes('1933'));assert.ok(story.includes('privatizzazione del 1994'));assert.ok(story.includes('ISRO'));
});

test('front-page international comparisons retain common periods, units and exact source observations',async()=>{
 const comparisons=JSON.parse(await readFile(new URL('../app/data/history-comparisons.json',import.meta.url),'utf8'));
 for(const comparison of comparisons.filter(c=>c.indicator)){
  const data=JSON.parse(await readFile(new URL('../public/data/history/'+comparison.indicator+'.json',import.meta.url),'utf8'));
  for(const [i,code]of comparison.countries.entries()){
   const observations=new Map(data.series[code]);const[start,end]=comparison.period;
   assert.ok(observations.has(start)&&observations.has(end));
   assert.equal(comparison.values[i].value,comparison.kind==='ratio'?observations.get(end)/observations.get(start):observations.get(end));
  }
 }
 const infant=comparisons.find(c=>c.id==='china-infant');assert.deepEqual(infant.period,[2024,2024]);assert.equal(infant.unit.includes('1.000 nati vivi'),true);
 const leave=comparisons.find(c=>c.id==='paid-leave');assert.deepEqual(leave.values.map(v=>v.value),[4,0]);assert.match(leave.note,/regimi speciali/);assert.match(leave.note,/non fra ferie effettivamente godute/);
 const space=comparisons.find(c=>c.id==='space-women');assert.deepEqual(space.values.map(v=>v.value),[1963,1983]);
});

test('expanded chronology is ordered, source-linked and separates historic literacy age groups from modern indicators',async()=>{
 const all=STORY.flatMap(era=>era.events);let previous=0;
 for(const event of all){
  const start=Number(event.year.match(/\d{4}/)[0]);assert.ok(start>=previous,event.title);previous=start;
  for(const source of event.detail?.sources??[]){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.name);}
  for(const person of event.people??[]){assert.ok(person.name&&person.role);assert.equal(new URL(person.url).protocol,'https:');}
 }
 const literacy=JSON.parse(await readFile(new URL('../app/data/history-soviet-literacy.json',import.meta.url),'utf8'));
 assert.equal(literacy.ageRange,'9–49 anni');assert.deepEqual(literacy.values.map(r=>r.year),[1926,1939,1959,1970]);
 assert.equal(Number((literacy.values[1].total-literacy.values[0].total).toFixed(1)),30.8);
 assert.equal(literacy.values[1].women,81.6);assert.match(literacy.note,/non è l’indicatore attuale/);
});
