import test from 'node:test';import assert from 'node:assert/strict';
import {internationalEdition} from '../app/lib/news-edition.ts';
const now=Date.parse('2026-10-19T22:00:00Z');
const story=(id,country,host,age)=>({id,country,sourceId:host,sourceHomepage:'https://'+host+'/',publishedAt:new Date(now-age*60000).toISOString()});
test('a prolific publisher cannot occupy the whole opening; countries and publishers alternate without dropping articles',()=>{
 const brazil=Array.from({length:30},(_,i)=>story('br'+i,'Brasil','br.example',i+1));
 const input=[...brazil,story('br-other','Brasil','other.example',40),story('it','Italia','it.example',60),story('us','USA','us.example',90),story('uk','Regno Unito','uk.example',100),story('older','Cuba','cu.example',1500)];
 const result=internationalEdition(input,now);
 assert.equal(new Set(result.slice(0,4).map(a=>a.country)).size,4);
 assert.equal(result[4].id,'br-other');assert.equal(result.at(-1).id,'older');
 assert.equal(result.length,input.length);assert.equal(new Set(result.map(a=>a.id)).size,input.length);
 assert.deepEqual(internationalEdition([...input].reverse(),now).map(a=>a.id),result.map(a=>a.id));
});

test('a prolific newest six-hour period cannot hide other countries in the same publication day',()=>{const brazil=Array.from({length:40},(_,i)=>story('brazil'+i,'Brasile','publisher.example',i+1));const input=[...brazil,story('italy','Italia','it.example',420),story('india','India','in.example',600),story('china','Cina','cn.example',1000),story('yesterday','Francia','fr.example',1500)];const result=internationalEdition(input,now);assert.deepEqual(result.slice(0,4).map(item=>item.id),['brazil0','italy','india','china']);assert.equal(result.at(-1).id,'yesterday');assert.equal(result.length,input.length);assert.deepEqual(input.slice(0,40).map(item=>item.id),brazil.map(item=>item.id));});
test('multiple feeds and country labels for the same publisher do not multiply its opening slots',()=>{const first=story('first','Brasile','same.example',1),duplicate={...story('alias','Italia','same.example',2),sourceId:'radar:alias'},other=story('other','Germania','other.example',3),missing={...story('undated','Germania','undated.example',4),publishedAt:null};const result=internationalEdition([missing,duplicate,other,first],now);assert.deepEqual(result.map(item=>item.id),['first','other','alias','undated']);});

test('a bounded cache retains less prolific publishers and preserves their opening slots after a reload',()=>{const flood=Array.from({length:1400},(_,i)=>story('flood'+i,'Brasile','br.example',i/10));const input=[...flood,story('it-cache','Italia','it.example',500),story('fr-cache','Francia','fr.example',700)];const snapshot=internationalEdition(input,now).slice(0,1200);assert.ok(snapshot.some(item=>item.id==='it-cache'));assert.ok(snapshot.some(item=>item.id==='fr-cache'));const restored=internationalEdition(JSON.parse(JSON.stringify(snapshot)),now);assert.deepEqual(restored.slice(0,3).map(item=>item.id),['flood0','it-cache','fr-cache']);});

test('all available publishers receive an opening slot before a prolific publisher repeats',()=>{const input=[...Array.from({length:30},(_,i)=>story('br'+i,'Brasile','br.example',i+1)),...Array.from({length:10},(_,i)=>story('it'+i,'Italia','it'+i+'.example',300+i)),story('indian','India','in.example',500)];const result=internationalEdition(input,now);assert.equal(new Set(result.slice(0,12).map(item=>new URL(item.sourceHomepage).hostname)).size,12);assert.deepEqual(result.slice(0,3).map(item=>item.country),['Brasile','Italia','India']);assert.equal(result.length,input.length);});
