import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import STORY from '../app/data/history-story.json' with {type:'json'};
import SocialHistoryStory from '../app/components/SocialHistoryStory.tsx';
import {LocalizationProvider} from '../app/components/Localization.tsx';
import {
 buildHistoryPersonIndex,
 copyHistoryPersonUrl,
 historyIndexMatches,
 historyPersonFromUrl,
 historyPersonSlug,
 historyPersonUrl,
 shareHistoryPerson,
} from '../app/lib/history-person-navigation.ts';

const people=buildHistoryPersonIndex(STORY);
const slugs=new Set(people.map(person=>person.slug));

test('structured timeline people receive explicit unique round-trip destinations',()=>{
 const occurrences=STORY.flatMap(era=>era.events.flatMap(event=>event.people??[]));
 assert.equal(people.length,17);
 assert.equal(slugs.size,people.length);
 assert.equal(new Set(occurrences.map(person=>person.name)).size,people.length);
 for(const person of people){
  assert.match(person.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(historyPersonFromUrl(historyPersonUrl(person.slug),slugs),person.slug);
  assert.ok(person.roles.length);
  assert.ok(person.links.length);
  assert.ok(person.appearances.length);
 }
 assert.equal(historyPersonSlug('Nadežda Krupskaja'),'nadezda-krupskaja');
 assert.equal(historyPersonSlug('Hồ Chí Minh'),'ho-chi-minh');
});

test('a display-name correction does not change an explicit stable slug',()=>{
 const index=buildHistoryPersonIndex([{period:'1900',events:[{id:'evento',year:'1900',country:'Mondo',title:'Evento',people:[{slug:'persona-stabile',name:'Nome corretto',role:'Ruolo',url:'https://example.test'}]}]}]);
 assert.equal(index[0].slug,'persona-stabile');
});

test('invalid person URLs do not select an encyclopedia page',()=>{
 assert.equal(historyPersonFromUrl('/?view=teoria&percorso=timeline&persona=non-esiste',slugs),null);
 assert.equal(historyPersonFromUrl('/?view=teoria&percorso=timeline',slugs),null);
});

test('the lightweight index matches names, roles, periods and accents',()=>{
 assert.equal(historyIndexMatches('nadezda',['Nadežda Krupskaja','Educazione']),true);
 assert.equal(historyIndexMatches('emancipazione lavoratrici',['Clara Zetkin','Emancipazione delle lavoratrici']),true);
 assert.equal(historyIndexMatches('1978 2000',['1978–2000','Thomas Sankara']),true);
 assert.equal(historyIndexMatches('inesistente',['Karl Marx','1848']),false);
});

test('person sharing prefers Web Share and copies the stable link as fallback',async()=>{
 const payload={title:'Clara Zetkin',text:'Percorso storico',url:'https://example.test'+historyPersonUrl('clara-zetkin')};
 let shared=null,copied='';
 assert.equal(await shareHistoryPerson({share:async value=>{shared=value;}},payload),'shared');
 assert.deepEqual(shared,payload);
 assert.equal(await shareHistoryPerson({share:async()=>{throw new Error('not available');},clipboard:{writeText:async value=>{copied=value;}}},payload),'copied');
 assert.equal(copied,payload.url);
 assert.equal(await copyHistoryPersonUrl({clipboard:{writeText:async value=>{copied=value;}}},payload.url),'copied');
 assert.equal(await shareHistoryPerson({},payload),'unavailable');
});

test('the timeline exposes an accessible event and person index',()=>{
 const previous=globalThis.window;
 delete globalThis.window;
 try{
  const html=renderToStaticMarkup(h(LocalizationProvider,{language:'it'},h(SocialHistoryStory)));
  assert.match(html,/class="story-encyclopedia-index"/);
  assert.match(html,/<label for="history-encyclopedia-search">/);
  assert.match(html,/id="history-encyclopedia-search"/);
  assert.match(html,/role="status" aria-live="polite"/);
  assert.match(html,/aria-labelledby="history-events-index-title"/);
  assert.match(html,/aria-labelledby="history-people-index-title"/);
  for(const person of people)assert.ok(html.includes(historyPersonUrl(person.slug).replaceAll('&','&amp;')),person.slug);
 }finally{
  if(previous===undefined)delete globalThis.window;else globalThis.window=previous;
 }
});

test('a person destination aggregates only existing roles, events, periods and sources',()=>{
 const previous=globalThis.window;
 globalThis.window={location:{href:'https://polisrossa.example'+historyPersonUrl('clara-zetkin'),origin:'https://polisrossa.example'}};
 try{
  const html=renderToStaticMarkup(h(LocalizationProvider,{language:'it'},h(SocialHistoryStory)));
  assert.match(html,/class="social-history-story story-event-page story-person-page"/);
  assert.match(html,/id="history-person-title"/);
  assert.match(html,/Clara Zetkin/);
  assert.match(html,/Organizzazione delle lavoratrici/);
  assert.match(html,/1848–1917/);
  assert.match(html,/l’emancipazione delle donne riguarda anche salario e lavoro/);
  assert.match(html,/Clara Zetkin · Donne proletarie e socialismo/);
  assert.match(html,/>Condividi</);
  assert.match(html,/>Copia link</);
  assert.match(html,/data-knowledge-kind="person" data-knowledge-entity="clara-zetkin"/);
  assert.match(html,/Storico delle modifiche/);
  assert.match(html,/Caricamento della cronologia/);
  assert.doesNotMatch(html,/story-opening/);
 }finally{
  if(previous===undefined)delete globalThis.window;else globalThis.window=previous;
 }
});

test('an invalid person destination safely returns to the timeline overview',()=>{
 const previous=globalThis.window;
 globalThis.window={location:{href:'https://polisrossa.example/?view=teoria&percorso=timeline&persona=non-esiste',origin:'https://polisrossa.example'}};
 try{
  const html=renderToStaticMarkup(h(LocalizationProvider,{language:'it'},h(SocialHistoryStory)));
  assert.match(html,/class="story-opening"/);
  assert.doesNotMatch(html,/story-person-page/);
 }finally{
  if(previous===undefined)delete globalThis.window;else globalThis.window=previous;
 }
});
